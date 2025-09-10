import Project from '../../../../../internal/model/project';
import Input from '../../../../../internal/model/input';
import Output from '../../../../../internal/model/output';
import Version from '../../../../../internal/model/Version';
// import ProjectLog from '../../../../../internal/model/projectLog';
import { Types } from 'mongoose';


export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: {
    is_trashed?: boolean;
    trashed_at?: Date | null;
    delete_after_days?: number;
  };
  current_version?: string;
  members?: {
    user_id: string;
    role?: 'owner' | 'editor' | 'viewer';
    status?: 'active' | 'inactive';
  }[];
}

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

  async createProject(userId: string, data: CreateProjectRequest) {
    const project = new Project({
      name: data.name,
      description: data.description,
      owner_id: new Types.ObjectId(userId),
      members: [{
        user_id: new Types.ObjectId(userId),
        role: 'owner',
        status: 'active',
        invited_at: new Date(),
        accepted_at: new Date()
      }],
      last_accessed_at: new Date()
    });

    const savedProject = await project.save();

    // Tạo version đầu tiên
    const firstVersion = await Version.create({
      project_id: savedProject._id,
      name: 'Version 1',
      description: 'Initial version',
      created_by: new Types.ObjectId(userId),
      created_at: new Date(),
      data: {}
    });

    // Gán version này làm current_version
    savedProject.current_version = firstVersion._id;
    
    await savedProject.save();

    return await Project.findById(savedProject._id)
      .populate('owner_id', 'full_name email avatar_url')
      .populate('members.user_id', 'full_name email avatar_url')
      .lean();
  }


  async updateProject(projectId: string, userId: string, data: UpdateProjectRequest) {
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      $or: [
        { owner_id: new Types.ObjectId(userId) },
        { 'members.user_id': new Types.ObjectId(userId), 'members.role': { $in: ['owner', 'editor'] } }
      ],
      'status.is_trashed': { $ne: true }
    });

    if (!project) {
      return null;
    }

    Object.assign(project, data);
    if (data.current_version && data.current_version !== project.current_version?.toString()) {
        project.current_version = new Types.ObjectId(data.current_version);
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
    const project = await Project.findById(projectId);

    if (!project) {
      return false;
    }
    // Nếu user là owner
    if (project.owner_id.toString() === userId) {
      // Nếu chưa trashed → chuyển sang trashed
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
      // Nếu đã trashed → xóa hẳn project và dữ liệu liên quan
      await Promise.all([
        Input.deleteMany({ project_id: project._id }),
        Output.deleteMany({ project_id: project._id }),
        Version.deleteMany({ project_id: project._id }),
        // ProjectLog.deleteMany({ project_id: project._id }),
        Project.deleteOne({ _id: project._id }),
      ]);
      return true;
    }
    // Nếu user là member (được share dự án)
   await Project.updateOne(
      { _id: projectId },
      { $pull: { members: { user_id: new Types.ObjectId(userId) } } }
    );
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
        { 'members.user_id': new Types.ObjectId(userId),'members.status': 'active' }
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
      'members.status': 'active',
      'status.is_trashed': { $ne: true },
    })
      .populate('owner_id', 'full_name email avatar_url')
      .populate('members.user_id', 'full_name email avatar_url')
      .sort({ last_accessed_at: -1, updated_at: -1 })
      .lean();

    return projects;
  }
}