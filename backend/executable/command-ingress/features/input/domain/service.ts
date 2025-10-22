import Project from '../../../../../internal/model/project';
import Input from '../../../../../internal/model/input';
import Output from '../../../../../internal/model/output';
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

export class InputHandleService {
  private logService: LogService;

  constructor(
    private orchestratorService: OrchestratorService,
    private inputService: InputService
  ) {
    this.logService = new LogService();
  }

  // trong ProjectService - sửa addInputsToVersion
  async addInputsToVersion(
    versionId: string,
    userId: string,
    files: UploadedFile[] | undefined,
    rawText: string | undefined
  ): Promise<ServiceResponse<any>> {
    const version = await Version.findById(versionId);
    if (!version) {
      return new ServiceResponse(ResponseStatus.Failed, 'Version not found', null, 404);
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

    const { newFilesCount, newTextProvided } = await this.inputService.handleInputs(
      files,
      rawText,
      projectId,
      versionId
    );

    if (newFilesCount === 0 && !newTextProvided) {
      return new ServiceResponse(ResponseStatus.Success, 'No new inputs were added. All provided inputs were duplicates.', {
        added_files: 0,
        added_text: false
      }, 200);
    }

    version.affects_requirement = true;
    version.updated_at = new Date();
    await version.save();

    // 🔥 REALTIME: Broadcast input creation - Lấy inputs mới nhất
    const updatedInputs = await Input.find({ version_id: versionId }).sort({ created_at: 1 }).lean();
    const unprocessedInputs = await Input.find({
      version_id: versionId,
      is_processed: false
    }).lean();

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

      // 3. Broadcast individual created events for new inputs
      const newInputs = updatedInputs.slice(-newFilesCount); // Get the newly added inputs
      for (const input of newInputs) {
        inputSocketService.emitInputCreated(
          projectId,
          versionId,
          userId,
          input
        );
      }

      console.log(`📢 Broadcast ${newInputs.length} new inputs and ${unprocessedInputs.length} unprocessed inputs`);
    }
    // 🔥 REALTIME: Broadcast multiple events



    return new ServiceResponse(ResponseStatus.Success, 'New inputs added successfully. Ready for processing.', {
      added_files: newFilesCount,
      added_text: newTextProvided
    }, 201);
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

      const version = await Version.findById(versionId).session(session);
      if (!version) {
        await session.abortTransaction();
        return new ServiceResponse(ResponseStatus.Failed, "Version not found", null, 404);
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

      await Input.findByIdAndDelete(inputId).session(session);

      await Version.findByIdAndUpdate(
        versionId,
        { $pull: { inputs: inputId } },
        { session }
      );

      await session.commitTransaction();

      // 🔥 REALTIME: Broadcast multiple events
      const updatedInputs = await Input.find({ version_id: versionId }).sort({ created_at: 1 }).lean();
      const unprocessedInputs = await Input.find({
        version_id: versionId,
        is_processed: false
      }).lean();

      // 1. Broadcast input deletion
      inputSocketService.emitInputDeleted(
        version.project_id.toString(),
        versionId,
        userId,
        inputId
      );

      // 2. Broadcast updated inputs list
      inputSocketService.emitInputsReload(
        version.project_id.toString(),
        versionId,
        userId,
        updatedInputs
      );

      // 3. Broadcast unprocessed count update (QUAN TRỌNG!)
      inputSocketService.emitInputsUpdated(
        version.project_id.toString(),
        versionId,
        userId,
        unprocessedInputs.length
      );

      console.log(`🗑️ Broadcast input deletion and ${unprocessedInputs.length} unprocessed inputs remaining`);

      return new ServiceResponse(
        ResponseStatus.Success,
        "Input deleted successfully.",
        {
          deleted_id: inputId,
          total_inputs: updatedInputs.length,
          unprocessed_inputs: unprocessedInputs.length
        },
        200
      );

    } catch (error: any) {
      await session.abortTransaction();
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    } finally {
      session.endSession();
    }
  }
}