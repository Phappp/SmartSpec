import Project from '../../../../../internal/model/project';
import Input from '../../../../../internal/model/input';
import Output from '../../../../../internal/model/output';
import Version from '../../../../../internal/model/version';
import ProjectLog from '../../../../../internal/model/projectLog';
import { OrchestratorService } from "../../orchestrator/domain/service";
import { UploadedFile } from "express-fileupload";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import mongoose, { Types } from 'mongoose';
import { CreateProjectDto, UpdateProjectDto } from '../adapter/dto';
// import { GeminiService } from "../../../features/orchestrator/domain/GeminiService";

export class ProjectService {
  // THAY ĐỔI: Sử dụng Dependency Injection cho OrchestratorService
  constructor(private orchestratorService: OrchestratorService) { }

  async createProject(
    data: CreateProjectDto,
    ownerId: string,
    files: UploadedFile[]
  ): Promise<ServiceResponse<any>> {
    const { name, description, language, rawText } = data;
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const newProjectData = {
        name, description, owner_id: ownerId, language: language || 'vi-VN',
        members: [{
          user_id: ownerId, role: 'owner', status: 'accepted',
          invited_by: ownerId, invited_at: new Date(), responded_at: new Date(),
          history: [{ action: 'accepted', by: ownerId, at: new Date() }]
        }]
      };

      const createdProjects = await Project.create([newProjectData], { session });
      const newProject = createdProjects[0];

      const newVersionData = { project_id: newProject._id, version_number: 1, created_by: ownerId };
      const createdVersions = await Version.create([newVersionData], { session });
      const newVersion = createdVersions[0];

      newProject.current_version = newVersion._id;
      await newProject.save({ session });

      await session.commitTransaction();

      this.orchestratorService.run(
        newProject._id.toString(), newVersion._id.toString(),
        { files, rawText, mode: "full" }, newProject.language
      ).catch(async (err) => {
        const errorMessage = `Lỗi xử lý nền: ${err.message || 'Lỗi không xác định'}`;
        console.error(`[SERVICE] ${errorMessage} cho version ${newVersion._id}`);
        await Version.findByIdAndUpdate(newVersion._id, { $push: { processing_errors: errorMessage } });
      });

      return new ServiceResponse(ResponseStatus.Success, 'Project created successfully', newProject, 201);
    } catch (error: any) {
      await session.abortTransaction();
      console.error("[SERVICE] ❌ Transaction đã được rollback.");
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getMyProjects(userId: string): Promise<ServiceResponse<any>> {
    const projects = await Project.find({
      owner_id: new Types.ObjectId(userId),
      'status.is_trashed': { $ne: true }
    }).populate('owner_id', 'full_name email avatar_url')
      .populate('members.user_id', 'full_name email avatar_url')
      .sort({ last_accessed_at: -1, updated_at: -1 })
      .lean();
    return new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200);
  }

  async updateProject(projectId: string, userId: string, data: UpdateProjectDto): Promise<ServiceResponse<any>> {
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      owner_id: new Types.ObjectId(userId),
      'status.is_trashed': { $ne: true }
    });

    if (!project) {
      return new ServiceResponse(ResponseStatus.Failed, 'Project not found or access denied', null, 404);
    }

    // ... (logic update project không đổi)
    const { members, ...otherData } = data;
    Object.assign(project, otherData); // Cách gán an toàn hơn

    const updatedProject = await project.save();
    return new ServiceResponse(ResponseStatus.Success, 'Project updated successfully', updatedProject, 200);
  }

  async deleteProject(projectId: string, userId: string) {
    const project = await Project.findOne({
      _id: projectId,
      owner_id: new Types.ObjectId(userId)
    });

    if (!project) return null;

    if (!project.status || project.status.is_trashed === false) {
      if (!project.status) {
        project.status = {
          is_trashed: true,
          trashed_at: new Date(),
          delete_after_days: 30,
        };
      } else {
        project.status.is_trashed = true;
        project.status.trashed_at = new Date();
      }

      await project.save();
      return true;
    }
    await Promise.all([
      Input.deleteMany({ project_id: project._id }),
      Output.deleteMany({ project_id: project._id }),
      Version.deleteMany({ project_id: project._id }),
      ProjectLog.deleteMany({ project_id: project._id }),
      Project.deleteOne({ _id: project._id }),
    ]);
    return true;
  }

  async restoreProject(projectId: string, userId: string): Promise<ServiceResponse<null>> {
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      owner_id: new Types.ObjectId(userId),
      'status.is_trashed': true,
    });

    if (!project) {
      return new ServiceResponse(ResponseStatus.Failed, 'Project not found, not trashed, or access denied', null, 404);
    }

    // THAY ĐỔI Ở ĐÂY: Sửa trực tiếp các thuộc tính của sub-document
    // Truy vấn `findOne` đã đảm bảo `project.status` tồn tại và `is_trashed` là true
    if (project.status) {
      project.status.is_trashed = false;
      project.status.trashed_at = null;
    }

    await project.save();

    return new ServiceResponse(ResponseStatus.Success, 'Project restored successfully', null, 200);
  }

  async getRecentProjects(userId: string): Promise<ServiceResponse<any>> {
    const projects = await Project.find({
      $or: [
        { owner_id: new Types.ObjectId(userId) },
        { 'members.user_id': new Types.ObjectId(userId), 'members.status': 'accepted' }
      ],
      'status.is_trashed': { $ne: true }
    }).sort({ last_accessed_at: -1 }).limit(5).lean();
    return new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200);
  }

  async getSharedProjects(userId: string): Promise<ServiceResponse<any>> {
    const projects = await Project.find({
      owner_id: { $ne: new Types.ObjectId(userId) }, // Người dùng không phải là chủ sở hữu
      'status.is_trashed': { $ne: true },            // Dự án không ở trong thùng rác

      // ✨ THAY ĐỔI QUAN TRỌNG Ở ĐÂY ✨
      // Tìm các dự án mà trong mảng `members` có một phần tử
      // khớp với CẢ hai điều kiện dưới đây.
      members: {
        $elemMatch: {
          user_id: new Types.ObjectId(userId),
          status: 'accepted'
        }
      }
    })
      .populate('owner_id', 'full_name email avatar_url') // Thêm populate để lấy đủ thông tin
      .populate('members.user_id', 'full_name email avatar_url')
      .sort({ last_accessed_at: -1 })
      .lean();

    return new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200);
  }

  async getVersionStatus(versionId: string): Promise<ServiceResponse<any>> {
    const version = await Version.findById(versionId).lean();
    const project = await Project.findById(version.project_id).lean();
    if (!version) {
      return new ServiceResponse(ResponseStatus.Failed, 'Version not found', null, 404);
    }

    return new ServiceResponse(ResponseStatus.Success, 'OK', {
      status: version.status,
      stage: version.stage,
      progress: version.progress,
      version,
      project
    }, 200);
  }

  async getProjectDetail(projectId: string, userId: string): Promise<ServiceResponse<any>> {
    const project = await Project.findById(projectId)
      .populate("owner_id", "full_name email avatar_url")
      .populate("members.user_id", "full_name email avatar_url");

    if (!project) {
      return new ServiceResponse(ResponseStatus.Failed, 'Project not found', null, 404);
    }

    const isOwner = project.owner_id._id.toString() === userId;
    const isMember = project.members.some(
      (m: any) => m.user_id._id.toString() === userId && m.status === "accepted"
    );
    if (!isOwner && !isMember) {
      throw { status: 403, message: "Bạn không có quyền truy cập project này" };
    }

    // Nếu chưa có version => tạo Version 1
    if (!project.current_version) {
      const newVersion = await Version.create({
        project_id: project._id,
        version_number: 1,
        created_by: userId,
        status: "completed",
        affects_requirement: false,
        requirement_model: [],
        pending_conflicts: [],
        processing_errors: [],
      });
      project.current_version = newVersion._id;
      await project.save();

      await ProjectLog.create({
        project_id: project._id,
        version_id: newVersion._id,
        user_id: userId,
        action: "create_version",
        target_id: newVersion._id,
        target_type: "version",
        affects_requirement: false,
        details: { message: "Initial version created automatically" },
      });
    }

    // Lấy danh sách versions (metadata)
    const versions = await Version.find({ project_id: project._id })
      .select("_id version_number status created_at updated_at")
      .sort({ version_number: 1 })
      .lean();

    // Lấy current version (đầy đủ tất cả field)
    const currentVersion = await Version.findById(project.current_version).lean();

    let inputs: any[] = [];
    let outputs: any[] = [];
    if (currentVersion) {
      [inputs, outputs] = await Promise.all([
        Input.find({ version_id: currentVersion._id }).sort({ created_at: 1 }).lean(),
        Output.find({ version_id: currentVersion._id }).sort({ created_at: 1 }).lean(),
      ]);
    }

    // Lấy logs của current version
    const logs = await ProjectLog.find({
      project_id: project._id,
      version_id: currentVersion?._id,
    })
      .populate("user_id", "full_name email avatar_url")
      .sort({ created_at: 1 })
      .lean();

    // Enrich logs với input/output metadata
    const chatLogs = logs.map((log: any) => {
      const input = log.input_id
        ? inputs.find((i: any) => i._id.toString() === log.input_id.toString())
        : null;
      const output = log.output_id
        ? outputs.find((o: any) => o._id.toString() === log.output_id.toString())
        : null;

      return {
        ...log,
        input_meta: input
          ? { id: input._id, name: input.name, type: input.type }
          : null,
        output_meta: output
          ? { id: output._id, name: output.name, type: output.type }
          : null,
      };
    });

    const resultData = {
      project: project.toObject(),
      current_version: currentVersion,
      versions,
      inputs,
      outputs,
      chatLogs,
    };

    return new ServiceResponse(ResponseStatus.Success, 'OK', resultData, 200);
  }


  async getDeleteProjects(userId: string): Promise<ServiceResponse<any>> {
    try {
      const projects = await Project.find({
        owner_id: new Types.ObjectId(userId),
        'status.is_trashed': true // Lấy các project có is_trashed = true
      })
        .populate('owner_id', 'full_name email avatar_url')
        .populate('members.user_id', 'full_name email avatar_url')
        .sort({ 'status.trashed_at': -1 }) // Sắp xếp theo ngày xóa gần nhất
        .lean();

      return new ServiceResponse(ResponseStatus.Success, 'Fetched trashed projects successfully', projects, 200);
    } catch (error) {
      // Ném lỗi để controller có thể bắt và xử lý
      throw error;
    }
  }

  // async suggestRelations(versionId: string): Promise<ServiceResponse<null>> {
  //   // Chạy tác vụ nặng trong nền và trả về response ngay
  //   this._backgroundSuggestRelations(versionId).catch(err => {
  //     console.error(`[SUGGEST_RELATIONS] Failed for version ${versionId}:`, err);
  //     Version.findByIdAndUpdate(versionId, {
  //       $set: { status: 'failed' },
  //       $push: { processing_errors: `Relation suggestion failed: ${err.message}` }
  //     });
  //   });

  //   // Trả về 202 Accepted để báo cho FE biết yêu cầu đã được chấp nhận
  //   return new ServiceResponse(ResponseStatus.Success, "Relation suggestion process started.", null, 202);
  // }

  // private async _backgroundSuggestRelations(versionId: string): Promise<void> {
  //   const version = await Version.findById(versionId);
  //   const project = await Project.findById(version?.project_id);
  //   if (!version || !version.requirement_model || version.requirement_model.length <= 1) {
  //     console.log("Not enough requirements to suggest relations. Marking as complete.");
  //     await Version.findByIdAndUpdate(versionId, { $set: { status: 'completed' } });
  //     return;
  //   }

  //   // Cập nhật trạng thái 'processing'
  //   version.status = 'processing';
  //   await version.save();

  //   try {
  //     const gemini = new GeminiService(); // Giả định bạn có thể tạo instance mới
  //     const requirementsWithRelations = await gemini.addRelatedUseCases(
  //       version.requirement_model,
  //       { incremental: false },
  //       project.language
  //     );

  //     version.set('requirement_model', requirementsWithRelations);
  //     version.status = 'completed'; 

  //     await version.save();
  //     console.log(`✅ Successfully suggested relations for version ${versionId}`);

  //   } catch (error: any) {
  //     console.error("Error during relation suggestion:", error);
  //     version.status = 'failed';
  //     version.processing_errors.push(`Relation suggestion failed: ${error.message}`);
  //     await version.save();
  //   }
  // }

}