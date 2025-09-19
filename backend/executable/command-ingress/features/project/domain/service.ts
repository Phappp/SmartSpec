import Project from '../../../../../internal/model/project';
import Input from '../../../../../internal/model/input';
import Output from '../../../../../internal/model/output';
import Version from '../../../../../internal/model/version';
import ProjectLog from '../../../../../internal/model/projectLog';
import { OrchestratorService } from "../../orchestrator/domain/service";
// import { OrchestratorService } from "../../orchestrator/domain/service";
import { UploadedFile } from "express-fileupload";

import { Types } from 'mongoose';

import { CreateProjectRequest, UpdateProjectRequest } from '../adapter/dto'

export class ProjectService {
  async getMyProjects(userId: string) {
    return await Project.find({
      owner_id: new Types.ObjectId(userId),
      'status.is_trashed': { $ne: true }
    })
      .populate('owner_id', 'full_name email avatar_url')
      .populate('members.user_id', 'full_name email avatar_url')
      .sort({ last_accessed_at: -1, updated_at: -1 })
      .lean();
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext || '')) return 'docx';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image';
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
    return 'text';
  }
  private orchestratorService = new OrchestratorService();

  async createProject(
    name: string,
    description: string,
    ownerId: string,
    files: UploadedFile[],
    language: string,
    rawText?: string,
  ) {
    console.log(`[SERVICE] Bắt đầu createProject cho '${name}' của owner '${ownerId}'`);

    try {
      // --- BƯỚC 1: TẠO PROJECT ---
      const newProjectData = {
        name,
        description,
        owner_id: ownerId,
        language,
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
      console.log("[SERVICE]   1a. Chuẩn bị lưu document Project...");
      const newProject = new Project(newProjectData);
      await newProject.save(); // Bỏ { session }
      console.log(`[SERVICE]   1b. Tạo Project thành công. ID: ${newProject._id}`);

      // --- BƯỚC 2: TẠO VERSION ---
      const newVersionData = {
        project_id: newProject._id,
        version_number: 1,
        created_by: ownerId,
      };
      console.log("[SERVICE]   2a. Chuẩn bị lưu document Version...");
      const newVersion = new Version(newVersionData);
      await newVersion.save(); // Bỏ { session }
      console.log(`[SERVICE]   2b. Tạo Version thành công. ID: ${newVersion._id}`);

      // --- BƯỚC 3: CẬP NHẬT PROJECT ---
      console.log(`[SERVICE]   3a. Cập nhật current_version cho Project...`);
      newProject.current_version = newVersion._id;
      await newProject.save(); // Bỏ { session }
      console.log("[SERVICE]   3b. Cập nhật Project thành công.");

      console.log("[SERVICE] Kích hoạt OrchestratorService chạy nền...");
      this.orchestratorService.run(
        newProject._id.toString(),
        newVersion._id.toString(),
        { files, rawText, mode: "full" },
        language
      ).catch(err => {
        console.error(`[SERVICE] Lỗi xử lý nền cho version ${newVersion._id}:`, err);
      });

      console.log("[SERVICE] Hoàn tất createProject, trả về kết quả.");
      return newProject;

    } catch (error: any) {
      console.error("[SERVICE] GẶP LỖI!", error);
      // (Xử lý lỗi chi tiết như phiên bản trước)
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((e: any) => ({
          field: e.path, message: e.message, value_provided: e.value
        }));
        console.error("================ LỖI VALIDATION MONGOOSE ================\n", JSON.stringify(validationErrors, null, 2));
      }
      throw error; // Ném lỗi để controller xử lý
    }
  }

  async updateProject(projectId: string, userId: string, data: UpdateProjectRequest) {
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      owner_id: new Types.ObjectId(userId),
      'status.is_trashed': { $ne: true }
    });

    if (!project) return null;

    const { members, ...otherData } = data;

    const disallowedFields = ['_id', 'owner_id', 'created_at', 'updated_at'];
    Object.keys(otherData).forEach((key) => {
      if (!disallowedFields.includes(key)) {
        (project as any)[key] = (otherData as any)[key];
      }
    });
    if (data.current_version && data.current_version !== project.current_version?.toString()) {
      project.current_version = new Types.ObjectId(data.current_version);
    }
    if (members && members.length > 0) {
      for (const m of members) {
        const member = project.members.find(mem => mem.user_id.toString() === m.user_id);
        if (member) {
          if (member.role === 'owner') continue;
          if (m.role && member.role !== m.role) {
            member.history.push({
              action: 'role_changed',
              by: new Types.ObjectId(userId),
              at: new Date(),
              details: { old_role: member.role, new_role: m.role }
            });
            member.role = m.role;
          }
        }
      }
    }
    project.updated_at = new Date();
    project.last_accessed_at = new Date();

    const updatedProject = await project.save();

    return await Project.findById(updatedProject._id)
      .populate('owner_id', 'full_name email avatar_url')
      .populate('members.user_id', 'full_name email avatar_url')
      .lean();
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

  async restoreProject(projectId: string, userId: string) {
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      owner_id: new Types.ObjectId(userId),
      'status.is_trashed': true,
    });

    if (!project) return null;

    if (!project.status || project.status.is_trashed === true) {
      if (!project.status) {
        project.status = {
          is_trashed: false,
          trashed_at: null,
          delete_after_days: 30,
        };
      } else {
        project.status.is_trashed = false;
        project.status.trashed_at = null;
      }
    }
    await project.save();
    return true;
  }

  async getRecentProjects(userId: string) {
    return await Project.find({
      $or: [
        { owner_id: new Types.ObjectId(userId) },
        { 'members.user_id': new Types.ObjectId(userId), 'members.status': 'accepted' }
      ],
      'status.is_trashed': { $ne: true }
    })
      .populate('owner_id', 'full_name email avatar_url')
      .populate('members.user_id', 'full_name email avatar_url')
      .sort({ last_accessed_at: -1, updated_at: -1 })
      .limit(5)
      .lean();
  }

  async getSharedProjects(userId: string) {
    const projects = await Project.find({
      owner_id: { $ne: new Types.ObjectId(userId) },
      'members.user_id': new Types.ObjectId(userId),
      'members.status': 'accepted',
      'status.is_trashed': { $ne: true },
    })
      .populate('owner_id', 'full_name email avatar_url')
      .populate('members.user_id', 'full_name email avatar_url')
      .sort({ last_accessed_at: -1, updated_at: -1 })
      .lean();

    return projects;
  }

  async getProjectDetail(projectId: string, userId: string) {
    const project = await Project.findById(projectId)
      .populate("owner_id", "full_name email avatar_url")
      .populate("members.user_id", "full_name email avatar_url");

    if (!project) return null;

    const isOwner = project.owner_id._id.toString() === userId;
    const isMember = project.members.some(
      (m: any) => m.user_id._id.toString() === userId && m.status === "accepted"
    );
    if (!isOwner && !isMember)
      throw { status: 403, message: "Bạn không có quyền truy cập project này" };

    if (!project.current_version) {
      const newVersion = await Version.create({
        project_id: project._id,
        version_number: 1,
        name: "Version 1",
        description: "Initial version when project is first opened",
        created_by: userId,
        trigger_action: "init",
        inputs: [],
        outputs: [],
        affects_requirement: false,
        requirement_model: null,
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

    const versions = await Version.find({ project_id: project._id })
      .select("_id name version_number")
      .sort({ version_number: 1 })
      .lean();

    const currentVersion = await Version.findById(project.current_version)
      .select("_id name version_number")
      .lean();

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

    return {
      project: project.toObject(),
      current_version: currentVersion,
      versions,
      inputs,
      outputs,
      chatLogs,
    };
  }
}