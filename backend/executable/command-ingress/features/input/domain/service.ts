import Project from '../../../../../internal/model/project';
import Input from '../../../../../internal/model/input';
import Version from '../../../../../internal/model/version';
import ProjectLog from '../../../../../internal/model/log';
import { OrchestratorService } from "../../orchestrator/domain/service";
import { UploadedFile } from "express-fileupload";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import mongoose, { Types } from 'mongoose';
import { InputService } from '../../orchestrator/domain/InputService';
import { LogService } from '../../log/domain/service';
import User from '../../../../../internal/model/user'
import { inputSocketService } from '../../input/domain/input.socket.service';
import { io } from '../../../socket';
import { VersionService } from "../../version/domain/service";
import {PreviewChangeDto} from "../../version/adapter/preview.dto";

export class InputHandleService {
  private logService: LogService;
  private versionService: VersionService; 

  constructor(
    private orchestratorService: OrchestratorService,
    private inputService: InputService
  ) {
    this.logService = new LogService();
    this.versionService = new VersionService();
  }

  async addInputsToVersion(
    versionId: string,
    userId: string,
    files: UploadedFile[] | undefined,
    rawText: string | undefined
  ): Promise<ServiceResponse<any>> {
    try {
      console.log('📥 [addInputsToVersion] Started:', { versionId, userId, filesCount: files?.length || 0, hasRawText: !!rawText });
      
      let version = await Version.findById(versionId);
      if (!version) {
        console.error('❌ [addInputsToVersion] Version not found:', versionId);
        return new ServiceResponse(ResponseStatus.Failed, 'Version not found', null, 404);
      }
      
      console.log('✅ [addInputsToVersion] Version found:', { 
        versionId: version._id.toString(), 
        version_temporary: version.version_temporary,
        status: version.status 
      });
      
      if(version.version_temporary == false){
        console.log('🔄 [addInputsToVersion] Bumping version...');
        const bumpRes = await this.versionService.bumpVersion(versionId,userId,"minor");
        if (!bumpRes || !bumpRes.data || !bumpRes.data.newVersion) {
          console.error('❌ [addInputsToVersion] Bump version failed:', bumpRes);
          return new ServiceResponse(ResponseStatus.Failed, 'Failed to bump version: ' + (bumpRes?.message || 'Unknown error'), null, 500);
        }
        version = bumpRes.data.newVersion;
        versionId = version._id.toString();
        console.log('✅ [addInputsToVersion] Version bumped:', { newVersionId: versionId });
      }
      const project = await Project.findOne({
        _id: version.project_id,
        'members': {
          $elemMatch: {
            user_id: new Types.ObjectId(userId),
            status: 'accepted'
          }
        }
      });

      if (!project) {
        return new ServiceResponse(ResponseStatus.Failed, 'Access denied to project', null, 403);
      }

      if (version.status === 'processing') {
        return new ServiceResponse(ResponseStatus.Failed, 'Cannot add inputs while the version is being processed', null, 409);
      }

      const projectId = version.project_id.toString();
      
      console.log('📤 [addInputsToVersion] Calling handleInputs...');
      
      const { newFilesCount, newTextProvided, newInputs} = await this.inputService.handleInputs(
        files,
        rawText,
        projectId,
        versionId 
      );
      
      console.log('✅ [addInputsToVersion] handleInputs completed:', { 
        newFilesCount, 
        newTextProvided, 
        newInputsCount: newInputs?.length || 0 
      });
      
      const user = await User.findById(userId).lean();
      const username = user?.name || "Unknown User";
      if (newFilesCount === 0 && !newTextProvided) {
        await this.logService.createLog({
          project_id: projectId,
          user_id: userId,
          action: "create_input",
          target_id: versionId,
          target_type: "input",
          version_number: version.version_number,
          affects_requirement: false,
          level: "info",
          details: {
            message: `${username} tried to add inputs but all were duplicates`
          }
        });
        return new ServiceResponse(ResponseStatus.Success, 'No new inputs were added. All provided inputs were duplicates.', {
          added_files: 0,
          added_text: false
        }, 200);
      }

      version.affects_requirement = true;
      version.updated_at = new Date();
      await version.save();

      // 🔥 REALTIME: Lấy dữ liệu mới nhất
      // Lấy số lượng inputs trước khi thêm để xác định inputs mới
      const inputsBeforeAdd = await Input.countDocuments({ version_id: versionId });
      
      const updatedInputs = await Input.find({ version_id: versionId }).sort({ created_at: 1 }).lean();
      const unprocessedInputs = await Input.find({
        version_id: versionId,
        is_processed: false
      }).lean();

      // Trong addInputsToVersion method
      if (updatedInputs.length > 0) {
        // 1. Broadcast reload all inputs
        inputSocketService.emitInputsReload(
          projectId,
          versionId,
          userId,
          updatedInputs
        );

        // 2. Broadcast unprocessed count for incremental analysis
        inputSocketService.emitInputsUpdated(
          projectId,
          versionId,
          userId,
          unprocessedInputs.length
        );

        // 3. 🚀 FIX: Tính toán đúng số inputs mới thực sự
        // Lấy tổng số inputs trước khi thêm
        const previousInputsCount = updatedInputs.length - newFilesCount - (newTextProvided ? 1 : 0);

        // Chỉ emit summary nếu có inputs mới
        if (newFilesCount > 0 || newTextProvided) {
          // ✅ Xử lý preview cho các inputs mới
          // Lấy các inputs mới nhất từ updatedInputs (đã query từ DB, có _id)
          const expectedNewCount = newFilesCount + (newTextProvided ? 1 : 0);
          
          // Lấy N inputs cuối cùng từ updatedInputs (các inputs mới nhất vì đã sort created_at: 1)
          const newInputsFromDb = updatedInputs.slice(-expectedNewCount);

          // Xử lý preview cho các inputs mới được tạo (chỉ những inputs có _id)
          for (const input of newInputsFromDb) {
            if (!input || !input._id) {
              console.warn('⚠️ Skipping input without _id:', input);
              continue;
            }
            
            try {
              const changePayload : PreviewChangeDto  = {
                entity_type: "input",
                change_type: "added",
                entity_id: input._id.toString(),
                before_snapshot: null,
                after_snapshot: input,
              };

              await this.versionService.createOrUpdatePreview(
                versionId,
                userId,
                changePayload
              );
            } catch (previewError: any) {
              console.error(`❌ Failed to create preview for input ${input._id}:`, previewError.message);
              // Tiếp tục xử lý các inputs khác, không dừng lại
            }
          }
          const summaryEvent = {
            type: 'INPUTS_ADDED_SUMMARY',
            projectId,
            versionId,
            userId,
            newInputsCount: newFilesCount + (newTextProvided ? 1 : 0), // Chính xác số inputs mới
            totalInputs: updatedInputs.length,
            unprocessedCount: unprocessedInputs.length,
            timestamp: new Date()
          };

          io.to(`project_${projectId}`).emit('input_event', summaryEvent);

          console.log(`📢 Broadcast inputs summary: ${summaryEvent.newInputsCount} new inputs added`);
        }

        console.log(`📢 Broadcast completed: ${newFilesCount} new files, ${newTextProvided ? '1 new text' : 'no new text'} and ${unprocessedInputs.length} unprocessed inputs`);
      }
      await this.logService.createLog({
        project_id: projectId,
        user_id: userId,
        action: "create_input",
        target_id: versionId,
        target_type: "input",
        version_number: version.version_number,
        affects_requirement: true,
        level: "info",
        details: {
          message: `${username} added ${newFilesCount} new file(s) and ${newTextProvided ? 'some text' : 'no text'} to version ${version.version_number}`,
        }
      });
      const response = new ServiceResponse(ResponseStatus.Success, 'New inputs added successfully. Ready for processing.', {
        added_files: newFilesCount,
        added_text: newTextProvided,
        version: version,
        newVersionId: versionId
      }, 201);
      
      console.log('✅ [addInputsToVersion] Successfully completed:', { 
        added_files: newFilesCount, 
        added_text: newTextProvided,
        newVersionId: versionId
      });
      
      return response;
    } catch (error: any) {
      console.error('❌ [addInputsToVersion] Error occurred:', {
        message: error.message,
        stack: error.stack,
        versionId,
        userId
      });
      return new ServiceResponse(ResponseStatus.Failed, error.message || 'Failed to add inputs', null, 500);
    }
  }

  public async deleteSpecificInput(versionId: string, inputId: string, userId: string): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const input = await Input.findById(inputId).session(session);
      if (!input) {
        throw new Error("Input not found");
      }

      if (input.version_id.toString() !== versionId) {
        throw new Error("Input does not belong to the specified version");
      }

      let version = await Version.findById(versionId).session(session);
      if (!version) {
        await session.abortTransaction();
        return new ServiceResponse(ResponseStatus.Failed, 'Version not found', null, 404);
      }
      if (version.version_temporary === false) {
        const bumpRes = await this.versionService.bumpVersion(
          versionId,
          userId,
          "minor"
        );

        if (!bumpRes.data) throw new Error("Auto bump failed");

        version = bumpRes.data.newVersion;
        versionId = version._id.toString();

        const inputMap = bumpRes.data.idMaps.inputMap;

        // ✅ Chuyển inputId cũ sang inputId mới
        if (!inputMap.has(inputId)) {
          throw new Error("Input not found in new version after bump");
        }
        inputId = inputMap.get(inputId)!.toString();
      }
      const project = await Project.findOne({
        _id: version.project_id,
        'members': {
          $elemMatch: {
            user_id: new Types.ObjectId(userId),
            status: 'accepted',
            role: { $in: ['owner', 'editor'] }
          }
        }
      }).session(session);

      if (!project) {
        await session.abortTransaction();
        return new ServiceResponse(ResponseStatus.Failed, "Access denied", null, 403);
      }

      const beforeDelete = await Input.findById(inputId).lean();
      // 🧩 Ghi preview change cho xóa input
      if (beforeDelete) {
        const changePayload : PreviewChangeDto = {
          entity_type: "input",
          change_type: "deleted",
          entity_id: beforeDelete._id.toString(),
          before_snapshot: beforeDelete,
          after_snapshot: null,
        };

        const previewRes = await this.versionService.createOrUpdatePreview(
          versionId,
          userId,
          changePayload
        );
        console.log(`🗑️ Preview updated for deleted input ${inputId}:`, previewRes.data);
      }

      await Input.findByIdAndDelete(inputId);

      await Version.findByIdAndUpdate(
        versionId,
        { $pull: { inputs: inputId }},
        { session }
      );

      await session.commitTransaction();

      // 🔥 REALTIME: Lấy dữ liệu mới nhất sau khi xóa
      const updatedInputs = await Input.find({ version_id: versionId }).sort({ created_at: 1 }).lean();
      const unprocessedInputs = await Input.find({
        version_id: versionId,
        is_processed: false
      }).lean();

      const projectId = version.project_id.toString();

      // 🚀 THAY ĐỔI QUAN TRỌNG: Chỉ emit 1 event tổng hợp thay vì 3 events
      const deleteSummaryEvent = {
        type: 'INPUT_DELETED_SUMMARY',
        projectId,
        versionId,
        userId,
        deletedInputId: inputId,
        totalInputs: updatedInputs.length,
        unprocessedCount: unprocessedInputs.length,
        timestamp: new Date()
      };

      io.to(`project_${projectId}`).emit('input_event', deleteSummaryEvent);

      console.log(`🗑️ Broadcast input deletion summary: ${inputId} deleted, ${unprocessedInputs.length} unprocessed inputs remaining`);
      
      const user = await User.findById(userId).lean();
      const username = user?.name || "Unknown User";

      await this.logService.createLog({
        project_id: version.project_id.toString(),
        user_id: userId,
        action: "delete_input",
        target_id: versionId,
        target_type: "input",
        version_number: version.version_number,
        affects_requirement: true,
        level: "warning",
        details: {
          before: beforeDelete,
          message: `${username} deleted input ${inputId} from version ${version.version_number}`
        }
      });

      return new ServiceResponse(
        ResponseStatus.Success,
        "Input deleted successfully.",
        {
          deleted_id: inputId,
          total_inputs: updatedInputs.length,
          unprocessed_inputs: unprocessedInputs.length,
          version: version,
          newVersionId: versionId
        },
        200
      );

    } catch (error: any) {
      await session.abortTransaction();
      const version = await Version.findById(versionId).session(session);
      const user = await User.findById(userId).lean();
      const username = user?.name || "Unknown User";
      await this.logService.createLog({
        project_id: version.project_id.toString(),
        user_id: userId,
        action: "delete_input",
        target_id: versionId,
        target_type: "input",
        version_number: null,
        affects_requirement: false,
        level: "error",
        details: { message: `${username} Failed to delete input: ${error.message}` }
      });
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    } finally {
      session.endSession();
    }
  }
}