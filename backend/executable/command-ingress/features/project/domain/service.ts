import Project from '../../../../../internal/model/project';
import Input from '../../../../../internal/model/input';
import Output from '../../../../../internal/model/output';
import Version from '../../../../../internal/model/version';
import ProjectLog from '../../../../../internal/model/log';
import { OrchestratorService } from "../../orchestrator/domain/service";
import { UploadedFile } from "express-fileupload";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import mongoose, { Types } from 'mongoose';
import { CreateProjectDto, UpdateProjectDto } from '../adapter/dto';
import { InputService } from '../../orchestrator/domain/InputService';
import { LogService } from '../../log/domain/service';
import User from '../../../../../internal/model/user'

export class ProjectService {
  private logService: LogService;

  constructor(
    private orchestratorService: OrchestratorService,
    private inputService: InputService
  ) {
    this.logService = new LogService();
  }

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
        name,
        description,
        owner_id: ownerId,
        language: language || 'vi-VN',
        members: [{
          user_id: ownerId,
          role: 'owner',
          status: 'accepted',
          invited_by: ownerId,
          invited_at: new Date(),
          responded_at: new Date(),
          history: [{ action: 'accepted', by: ownerId, at: new Date() }]
        }]
      };

      const createdProjects = await Project.create([newProjectData], { session });
      const newProject = createdProjects[0];

      const newVersionData = {
        project_id: newProject._id,
        version_number: 1,
        version_temporary: true,
        status:"completed",
        stage:"completed",
        created_by: ownerId
      };
      const createdVersions = await Version.create([newVersionData], { session });
      const newVersion = createdVersions[0];

      newProject.current_version = newVersion._id;
      await newProject.save({ session });

      await session.commitTransaction();

      // // Xử lý nền
      // this.orchestratorService.run(
      //   newProject._id.toString(),
      //   newVersion._id.toString(),
      //   { files, rawText, mode: "full" },
      //   newProject.language,
      //   ownerId
      // ).catch(async (err) => {
      //   const errorMessage = `Lỗi xử lý nền: ${err.message || 'Lỗi không xác định'}`;
      //   console.error(`[SERVICE] ${errorMessage} cho version ${newVersion._id}`);
      //   await Version.findByIdAndUpdate(newVersion._id, { $push: { processing_errors: errorMessage } });
      // });

      // Log action
      const owner = await User.findById(ownerId).select("name email").lean();

      await this.logService.createLog({
        user_id: ownerId,
        project_id: newProject._id.toString(),
        action: "create_project",
        target_id: newProject._id.toString(),
        target_type: "project",
        details: {
          after: {
            name: newProject.name,
            description: newProject.description,
            language: newProject.language,
          },
          message: `Project "${newProject.name}" created by user ${owner.name}`,
        },
        level: "info",
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
      'status.is_trashed': { $ne: true },
      // RÀNG BUỘC MỚI: Chỉ lấy projects mà user có status accepted
      'members': {
        $elemMatch: {
          user_id: new Types.ObjectId(userId),
          status: 'accepted'
        }
      }
    })
      .populate('owner_id', 'full_name email avatar_url')
      .populate('members.user_id', 'full_name email avatar_url')
      .sort({ last_accessed_at: -1, updated_at: -1 })
      .lean();

    return new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200);
  }

  async updateProject(projectId: string, userId: string, data: UpdateProjectDto): Promise<ServiceResponse<any>> {
    // THÊM RÀNG BUỘC: Kiểm tra user có status accepted trong project
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      'status.is_trashed': { $ne: true },
      'members': {
        $elemMatch: {
          user_id: new Types.ObjectId(userId),
          status: 'accepted'
        }
      }
    });

    if (!project) {
      return new ServiceResponse(ResponseStatus.Failed, 'Project not found or access denied', null, 404);
    }

    const before = {
      name: project.name,
      description: project.description,
      language: project.language,
    };

    const { members, ...otherData } = data;
    Object.assign(project, otherData);

    const updatedProject = await project.save();
    const after = {
      name: updatedProject.name,
      description: updatedProject.description,
      language: updatedProject.language,
    };

    const user = await User.findById(userId).select("name email").lean();

    await this.logService.createLog({
      user_id: userId,
      project_id: projectId,
      action: "update_project",
      target_id: projectId,
      target_type: "project",
      details: { before, after, message: `${user.name} updated project ${project.name}` },
      level: "info",
    });

    return new ServiceResponse(ResponseStatus.Success, 'Project updated successfully', updatedProject, 200);
  }

  async deleteProject(projectId: string, userId: string) {
    // THÊM RÀNG BUỘC: Chỉ owner có status accepted mới được xóa
    const project = await Project.findOne({
      _id: projectId,
      owner_id: new Types.ObjectId(userId),
      'members': {
        $elemMatch: {
          user_id: new Types.ObjectId(userId),
          status: 'accepted'
        }
      }
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

      const user = await User.findById(userId).select("name email").lean();

      await this.logService.createLog({
        user_id: userId,
        project_id: projectId,
        action: "delete_project",
        target_id: projectId,
        target_type: "project",
        details: { message: `${user.name} deleted project ${project.name}` },
        level: "info",
      });

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
    // THÊM RÀNG BUỘC: Chỉ owner có status accepted mới được restore
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      owner_id: new Types.ObjectId(userId),
      'status.is_trashed': true,
      'members': {
        $elemMatch: {
          user_id: new Types.ObjectId(userId),
          status: 'accepted'
        }
      }
    });

    if (!project) {
      return new ServiceResponse(ResponseStatus.Failed, 'Project not found, not trashed, or access denied', null, 404);
    }

    if (project.status) {
      project.status.is_trashed = false;
      project.status.trashed_at = null;
    }

    await project.save();

    const user = await User.findById(userId).select("name email").lean();

    await this.logService.createLog({
      user_id: userId,
      project_id: projectId,
      action: "restore_project",
      target_id: projectId,
      target_type: "project",
      details: { message: `${user.name} restored project ${project.name}` },
      level: "info",
    });

    return new ServiceResponse(ResponseStatus.Success, 'Project restored successfully', null, 200);
  }

  async getRecentProjects(userId: string): Promise<ServiceResponse<any>> {
    const projects = await Project.find({
      'status.is_trashed': { $ne: true },
      // RÀNG BUỘC MỚI: Chỉ lấy projects mà user có status accepted
      'members': {
        $elemMatch: {
          user_id: new Types.ObjectId(userId),
          status: 'accepted'
        }
      }
    })
      .sort({ last_accessed_at: -1 })
      .limit(5)
      .lean();

    return new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200);
  }

  async getSharedProjects(userId: string): Promise<ServiceResponse<any>> {
    const projects = await Project.find({
      owner_id: { $ne: new Types.ObjectId(userId) },
      'status.is_trashed': { $ne: true },
      // RÀNG BUỘC MỚI: Chỉ lấy projects mà user có status accepted
      'members': {
        $elemMatch: {
          user_id: new Types.ObjectId(userId),
          status: 'accepted'
        }
      }
    })
      .populate('owner_id', 'full_name email avatar_url')
      .populate('members.user_id', 'full_name email avatar_url')
      .sort({ last_accessed_at: -1 })
      .lean();

    return new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200);
  }

  async getVersionStatus(versionId: string): Promise<ServiceResponse<any>> {
    const version = await Version.findById(versionId).lean();
    const project = await Project.findById(version?.project_id).lean();

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

    // THÊM RÀNG BUỘC: Kiểm tra user có status accepted trong project
    const userMember = project.members.find((m: any) =>
      (m.user_id._id.toString() === userId || m.user_id.toString() === userId) &&
      m.status === "accepted"
    );

    if (!userMember) {
      throw { status: 403, message: "You do not have access to this project." };
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
      .sort({ version_number: -1 })
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
        'status.is_trashed': true,
        // RÀNG BUỘC MỚI: Chỉ lấy projects mà user có status accepted
        'members': {
          $elemMatch: {
            user_id: new Types.ObjectId(userId),
            status: 'accepted'
          }
        }
      })
        .populate('owner_id', 'full_name email avatar_url')
        .populate('members.user_id', 'full_name email avatar_url')
        .sort({ 'status.trashed_at': -1 })
        .lean();

      return new ServiceResponse(ResponseStatus.Success, 'Fetched trashed projects successfully', projects, 200);
    } catch (error) {
      throw error;
    }
  }

  async getAllProjectsForAdmin(): Promise<ServiceResponse<any>> {
    try {
      const projects = await Project.find()
        .populate('owner_id', 'full_name email avatar_url')
        .populate('members.user_id', 'full_name email avatar_url')
        .sort({ updated_at: -1 })
        .lean();

      const formattedProjects = projects.map((project: any) => ({
        id: project._id,
        name: project.name,
        description: project.description,
        language: project.language,
        owner: project.owner_id ? {
          id: project.owner_id._id,
          name: project.owner_id.full_name,
          email: project.owner_id.email,
          avatar: project.owner_id.avatar_url
        } : null,
        memberCount: project.members?.length || 0,
        acceptedMembers: project.members?.filter((m: any) => m.status === 'accepted').length || 0,
        pendingMembers: project.members?.filter((m: any) => m.status === 'pending').length || 0,
        isTrashed: project.status?.is_trashed || false,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        lastAccessedAt: project.last_accessed_at,
      }));

      return new ServiceResponse(
        ResponseStatus.Success,
        "Fetched all projects for admin successfully",
        formattedProjects,
        200
      );
    } catch (error) {
      console.error("[SERVICE] Error fetching all projects for admin:", error);
      return new ServiceResponse(
        ResponseStatus.Failed,
        "Failed to retrieve all projects",
        null,
        500
      );
    }
  }
}