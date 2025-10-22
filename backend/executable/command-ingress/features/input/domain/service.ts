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
import { VersionService } from "../../version/domain/service";

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
    const bumpResult = await this.versionService.bumpVersion(version._id.toString(), userId, "minor");

    if (!bumpResult || !bumpResult.data) {
      console.error("[addInputsToVersion] bumpVersion failed:", bumpResult);
      return new ServiceResponse(ResponseStatus.Failed, "Failed to bump version", null, 500);
    }
    const newVersion = bumpResult.data;
    versionId = newVersion._id;
    const { newFilesCount, newTextProvided } = await this.inputService.handleInputs(
      files,
      rawText,
      projectId,
      versionId
    );
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

    // 🔥 REALTIME: Broadcast input creation - Lấy inputs mới nhất
    const updatedInputs = await Input.find({ version_id: versionId }).sort({ created_at: 1 }).lean();

    if (updatedInputs.length > 0) {
      inputSocketService.emitInputsReload(
        projectId,
        versionId,
        userId,
        updatedInputs
      );
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
      // ⚙️ Tạo version mới trước khi xóa input
      const bumpResult = await this.versionService.bumpVersion(versionId, userId, "minor");

      if (!bumpResult || !bumpResult.data) {
        console.error("[deleteSpecificInput] bumpVersion failed:", bumpResult);
        await session.abortTransaction();
        return new ServiceResponse(ResponseStatus.Failed, "Failed to bump version before deleting input", null, 500);
      }

      const newVersion = bumpResult.data;
      versionId = newVersion._id.toString(); // cập nhật versionId để xóa trên version mới

      const beforeDelete = await Input.findById(inputId).lean();
      await Input.findByIdAndDelete(inputId).session(session);

      await Version.findByIdAndUpdate(
        versionId,
        { $pull: { inputs: inputId } },
        { session }
      );

      await session.commitTransaction();

      // 🔥 REALTIME: Broadcast input deletion
      inputSocketService.emitInputDeleted(
        version.project_id.toString(),
        versionId,
        userId,
        inputId
      );
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
        { deleted_id: inputId },
        200
      );

    } catch (error: any) {
      await session.abortTransaction();
      const user = await User.findById(userId).lean();
      const username = user?.name || "Unknown User";
      await this.logService.createLog({
        project_id: "unknown",
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