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

export class InputHandleService {
  private logService: LogService;

  constructor(
    private orchestratorService: OrchestratorService,
    private inputService: InputService
  ) {
    this.logService = new LogService();
  }

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

    // THÊM RÀNG BUỘC: Kiểm tra user có status accepted trong project
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

      // THÊM RÀNG BUỘC: Kiểm tra user có status accepted và là owner
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

      return new ServiceResponse(
        ResponseStatus.Success,
        "Input deleted successfully.",
        { deleted_id: inputId },
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