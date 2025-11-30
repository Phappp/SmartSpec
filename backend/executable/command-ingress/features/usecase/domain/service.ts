// features/usecase/domain/service.ts
import mongoose, { Types } from 'mongoose';
import Version from "../../../../../internal/model/version";
import Project from "../../../../../internal/model/project";
import Usecase from "../../../../../internal/model/usecase";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import { CreateUsecaseDto, UpdateUsecaseDto } from '../adapter/dto';
import { usecaseSocketService } from './usecase.socket.service';
import { LogService } from "../../../../command-ingress/features/log/domain/service";
import { VersionService } from "../../../../command-ingress/features/version/domain/service";

export class UsecaseService {
  private logService = new LogService();
  private versionService = new VersionService();

  /**
   * Normalize role structure với cơ chế mapping thông minh
   * Role ID theo số thứ tự: role_1, role_2, role_3...
   * Mapping name → ID: Mỗi role name được ánh xạ cố định đến một role ID
   */
  private normalizeRole(role: any, existingUsecases: any[]): { id: string; name: string } {
    if (!role) {
      return { id: 'role_unknown', name: 'Unknown' };
    }

    const roleName = typeof role === 'string' ? role.trim() : (role.name?.trim() || 'Unknown');

    if (!roleName) {
      return { id: 'role_unknown', name: 'Unknown' };
    }

    // 🔍 Bước 1: Thu thập tất cả roles hiện có từ tất cả use cases
    const allExistingRoles: { id: string, name: string }[] = [];
    existingUsecases.forEach(uc => {
      if (uc.role && uc.role.id && uc.role.name) {
        // Chỉ lấy roles có ID hợp lệ (role_1, role_2, ...)
        if (uc.role.id.match(/^role_\d+$/)) {
          allExistingRoles.push({
            id: uc.role.id,
            name: uc.role.name.trim()
          });
        }
      }
    });

    // 🔍 Bước 2: Tìm role trùng name (exact match - phân biệt hoa thường)
    const existingRole = allExistingRoles.find(r => r.name === roleName);

    if (existingRole) {
      // ✅ Trùng name → dùng ID cũ
      console.log(`🔄 Role mapping: "${roleName}" → ${existingRole.id} (existing)`);
      return { id: existingRole.id, name: roleName };
    }

    // 🔍 Bước 3: Tạo ID mới theo số thứ tự
    const roleIds = allExistingRoles.map(r => r.id);
    const roleNumbers = roleIds
      .map(id => {
        const match = id.match(/^role_(\d+)$/);
        return match ? parseInt(match[1]) : NaN;
      })
      .filter(num => !isNaN(num));

    const maxNumber = roleNumbers.length > 0 ? Math.max(...roleNumbers) : 0;
    const newRoleId = `role_${maxNumber + 1}`;

    console.log(`🆕 New role: "${roleName}" → ${newRoleId}`);
    return { id: newRoleId, name: roleName };
  }

  /**
   * Helper function để lấy usecase ID từ _id
   */
  private getUsecaseId(uc: any): string {
    if (!uc) return '';
    return uc._id ? String(uc._id) : '';
  }

  /**
   * Kiểm tra quyền truy cập project
   */
  private hasProjectAccess(project: any, userId: string): boolean {
    const isOwner = project.owner_id.toString() === userId;
    const isMember = project.members?.some(
      (m: any) => m.user_id.toString() === userId && m.status === 'accepted'
    ) || false;

    return isOwner || isMember;
  }

  /**
   * Clean và validate form data
   */
  private cleanUsecaseData(data: any): any {
    const cleaned = { ...data };

    // Clean array fields - đảm bảo luôn là array và có ít nhất một item cho tasks
    const arrayFields = [
      'tasks', 'inputs', 'outputs', 'preconditions', 'postconditions',
      'triggers', 'rules', 'constraints', 'exceptions', 'stakeholders', 'related_usecases'
    ];

    arrayFields.forEach(field => {
      if (!Array.isArray(cleaned[field])) {
        cleaned[field] = [];
      } else {
        cleaned[field] = cleaned[field]
          .map((item: string) => typeof item === 'string' ? item.trim() : item)
          .filter((item: string) => item && item !== '');
      }
    });

    // Đảm bảo tasks có ít nhất một item
    if (cleaned.tasks.length === 0) {
      cleaned.tasks = [''];
    }

    // Đảm bảo priority hợp lệ
    if (!['low', 'medium', 'high'].includes(cleaned.priority)) {
      cleaned.priority = 'medium';
    }

    // Clean optional fields
    if (!cleaned.context || cleaned.context.trim() === '') {
      cleaned.context = '';
    }

    if (!cleaned.feedback || cleaned.feedback.trim() === '') {
      cleaned.feedback = null;
    }

    return cleaned;
  }

  /**
   * Thêm usecase mới vào version
   */
  async addUsecaseToVersion(
    versionId: string,
    userId: string,
    data: CreateUsecaseDto
  ): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Kiểm tra version tồn tại
      let version = await Version.findById(versionId);
      if (!version) throw new Error("Version not found");

      // ✅ Nếu version không phải temporary → bump trước
      if (version.version_temporary === false) {
          const bumpRes = await this.versionService.bumpVersion(versionId, userId, "minor");
          if (!bumpRes.data) throw new Error("Auto bump failed");
          version = bumpRes.data.newVersion;
          versionId = version._id.toString();
      }

      // Kiểm tra project & quyền truy cập
      const project = await Project.findById(version.project_id).session(session);
      if (!project) {
        throw new Error("Project not found");
      }
      if (!this.hasProjectAccess(project, userId)) {
        throw new Error("Access denied");
      }

      // Clean và validate data
      const cleanedData = this.cleanUsecaseData(data);

      // Lấy danh sách usecases hiện có để normalize role
      const existingUsecases = await Usecase.find({ version_id: version._id }).lean();
      const normalizedRole = this.normalizeRole(cleanedData.role, existingUsecases);

      // Map related_usecases từ string sang ObjectId
      const relatedUsecaseIds = cleanedData.related_usecases
        .filter((id: string) => id && Types.ObjectId.isValid(id))
        .map((id: string) => new Types.ObjectId(id));

      // Tạo usecase mới trong collection
      const newUsecase = await Usecase.create([{
        project_id: version.project_id,
        version_id: version._id,
        name: cleanedData.name,
        role: normalizedRole,
        goal: cleanedData.goal,
        reason: cleanedData.reason,
        priority: cleanedData.priority,
        tasks: cleanedData.tasks,
        inputs: cleanedData.inputs,
        outputs: cleanedData.outputs,
        context: cleanedData.context,
        feedback: cleanedData.feedback,
        rules: cleanedData.rules,
        triggers: cleanedData.triggers,
        preconditions: cleanedData.preconditions,
        postconditions: cleanedData.postconditions,
        exceptions: cleanedData.exceptions,
        stakeholders: cleanedData.stakeholders,
        constraints: cleanedData.constraints,
        related_usecases: relatedUsecaseIds,
        created_by: new Types.ObjectId(userId)
      }], { session });

      const savedUsecase = newUsecase[0];
      const usecaseId = String(savedUsecase._id);

      // Cập nhật version metadata
      version.updated_at = new Date();
      version.affects_requirement = true;
      await version.save({ session });

      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "requirement",
          entity_id: usecaseId,
          change_type: "added",
          before_snapshot: null,
          after_snapshot: savedUsecase.toObject()
        }
      );

      await this.logService.createLog({
        project_id: version.project_id.toString(),
        user_id: userId,
        action: "generate_data",
        target_id: versionId,
        target_type: "requirement_model",
        version_number: version.version_number,
        affects_requirement: true,
        level: "info",
        details: {
          after: newUsecase,
          message: `${userId} created usecases ${newUsecase.map(uc => uc.name).join(', ')} in version ${version.version_number}`
        },
        performed_by_ai:true
      });

      await session.commitTransaction();

      // Broadcast event
      try {
        usecaseSocketService.emitUsecaseCreated(
          String(version.project_id),
          versionId,
          userId,
          savedUsecase.toObject()
        );
      } catch (socketError) {
        console.error('Socket broadcast failed:', socketError);
      }

      return new ServiceResponse(
        ResponseStatus.Success,
        'Usecase added successfully',
        {
          usecase: savedUsecase.toObject(),
          version: version,
          newVersionId: versionId
        },
        201
      );

    } catch (error: any) {
      await session.abortTransaction();
      console.error("❌ Add usecase error:", error);
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Cập nhật usecase
   */
  async updateUsecaseInVersion(
    versionId: string,
    usecaseId: string,
    userId: string,
    data: UpdateUsecaseDto
  ): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 🔍 1. Kiểm tra version tồn tại
      let version = await Version.findById(versionId);
      if (!version) throw new Error("Version not found");

      // ✅ Nếu version không phải temporary → bump trước
      if (version.version_temporary === false) {
          const bumpRes = await this.versionService.bumpVersion(versionId, userId, "minor");
          if (!bumpRes.data) throw new Error("Auto bump failed");
          version = bumpRes.data.newVersion;
          versionId = version._id.toString();
      }

      // 🔍 2. Kiểm tra project & quyền truy cập
      const project = await Project.findById(version.project_id).session(session);
      if (!project) {
        throw new Error("Project not found");
      }
      if (!this.hasProjectAccess(project, userId)) {
        throw new Error("Access denied");
      }

      // Tìm usecase cần cập nhật
      const originalUsecase = await Usecase.findOne({ 
        _id: usecaseId, 
        version_id: version._id 
      }).session(session);
      
      if (!originalUsecase) {
        throw new Error(`Usecase not found (ID=${usecaseId})`);
      }

      // Clean và validate data
      const cleanedData = this.cleanUsecaseData(data);

      // Normalize role với cơ chế mapping (loại trừ UC đang update)
      let normalizedRole;
      if (cleanedData.role) {
        const otherUsecases = await Usecase.find({ 
          version_id: version._id,
          _id: { $ne: usecaseId }
        }).lean().session(session);
        normalizedRole = this.normalizeRole(cleanedData.role, otherUsecases);
      } else {
        normalizedRole = originalUsecase.role;
      }

      // Map related_usecases từ string sang ObjectId
      const relatedUsecaseIds = cleanedData.related_usecases
        .filter((id: string) => id && Types.ObjectId.isValid(id))
        .map((id: string) => new Types.ObjectId(id));

      // Cập nhật usecase
      const updatedUsecase = await Usecase.findByIdAndUpdate(
        usecaseId,
        {
          ...cleanedData,
          role: normalizedRole,
          related_usecases: relatedUsecaseIds,
          updated_by: new Types.ObjectId(userId)
        },
        { new: true, session }
      );

      // Đồng bộ related usecases nếu có thay đổi
      if (Array.isArray(cleanedData.related_usecases)) {
        await this.syncRelatedUsecases(version._id, usecaseId, relatedUsecaseIds, session);
      }

      // Cập nhật version metadata
      version.updated_at = new Date();
      version.affects_requirement = true;
      await version.save({ session });

      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "requirement",
          entity_id: usecaseId,
          change_type: "updated",
          before_snapshot: originalUsecase.toObject(),
          after_snapshot: updatedUsecase.toObject()
        }
      );

      await this.logService.createLog({
        project_id: project._id.toString(),
        user_id: userId,
        action: "update_data",
        target_id: versionId,
        target_type: "requirement_model",
        version_number: version.version_number,
        affects_requirement: true,
        level: "info",
        details: {
          before: originalUsecase.toObject(),
          after: updatedUsecase.toObject(),
          message: `${userId} updated usecase ${originalUsecase.name} in version ${version.version_number}`
        }
      });

      await session.commitTransaction();

      // Broadcast event
      usecaseSocketService.emitUsecaseUpdated(
        project._id.toString(),
        versionId,
        userId,
        updatedUsecase.toObject(),
        originalUsecase.toObject()
      );

      console.log(`✅ Usecase ${usecaseId} updated successfully`);
      return new ServiceResponse(
        ResponseStatus.Success,
        "Usecase updated successfully",
        {
          usecase: updatedUsecase.toObject(),
          version: version,
          newVersionId: versionId
        },
        200
      );

    } catch (error: any) {
      await session.abortTransaction();
      console.error("❌ Update usecase error:", error);
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Xóa usecase
   */
  async deleteUsecaseFromVersion(
    versionId: string,
    usecaseId: string,
    userId: string
  ): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Kiểm tra version tồn tại
      let version = await Version.findById(versionId);
      if (!version) {
        throw new Error("Version not found");
      }

      // ✅ Nếu version không phải temporary → bump trước
      if (version.version_temporary === false) {
          const bumpRes = await this.versionService.bumpVersion(versionId, userId, "minor");
          if (!bumpRes.data) throw new Error("Auto bump failed");
          version = bumpRes.data.newVersion;
          versionId = version._id.toString();
      }

      // 🔍 Bước 2: Kiểm tra project & quyền truy cập
      const project = await Project.findById(version.project_id).session(session);
      if (!project) {
        throw new Error("Project not found");
      }
      if (!this.hasProjectAccess(project, userId)) {
        throw new Error("Access denied");
      }

      // Tìm usecase cần xóa
      const deletedUsecase = await Usecase.findOne({ 
        _id: usecaseId, 
        version_id: version._id 
      }).session(session);
      
      if (!deletedUsecase) {
        throw new Error("Usecase not found");
      }

      // Xóa references trong các UC khác
      await this.removeUsecaseReferences(version._id, usecaseId, session);

      // Xóa usecase
      await Usecase.findByIdAndDelete(usecaseId, { session });

      // Cập nhật version metadata
      version.updated_at = new Date();
      version.affects_requirement = true;
      await version.save({ session });

      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "requirement",
          entity_id: usecaseId,
          change_type: "deleted",
          before_snapshot: deletedUsecase,
          after_snapshot: null
        }
      );


      await this.logService.createLog({
        project_id: project._id.toString(),
        user_id: userId,
        action: "delete_data",
        target_id: versionId,
        target_type: "requirement_model",
        version_number: version.version_number,
        affects_requirement: true,
        level: "warning",
        details: {
          before: deletedUsecase.toObject(),
          message: `${userId} deleted usecase ${deletedUsecase.name} from version ${version.version_number}`
        }
      });

      await session.commitTransaction();

      // Broadcast event
      usecaseSocketService.emitUsecaseDeleted(
        project._id.toString(),
        versionId,
        userId,
        usecaseId
      );

      return new ServiceResponse(
        ResponseStatus.Success,
        "Usecase deleted successfully",
        {
          deleted_id: usecaseId,
          version: version,
          newVersionId: versionId
        },
        200
      );

    } catch (error: any) {
      await session.abortTransaction();
      console.error("❌ Delete usecase error:", error);
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Lấy danh sách usecases của version
   */
  async getUsecasesByVersion(
    versionId: string,
    userId: string
  ): Promise<ServiceResponse<any>> {
    try {
      const version = await Version.findById(versionId);
      if (!version) {
        return new ServiceResponse(ResponseStatus.Failed, 'Version not found', null, 404);
      }

      const project = await Project.findById(version.project_id);
      if (!project) {
        return new ServiceResponse(ResponseStatus.Failed, 'Project not found', null, 404);
      }

      if (!this.hasProjectAccess(project, userId)) {
        return new ServiceResponse(ResponseStatus.Failed, 'Access denied', null, 403);
      }

      // Lấy usecases từ collection
      const usecases = await Usecase.find({ version_id: version._id })
        .populate('related_usecases', 'name goal')
        .lean();

      return new ServiceResponse(
        ResponseStatus.Success,
        'Usecases retrieved successfully',
        usecases || [],
        200
      );

    } catch (error: any) {
      console.error("❌ Get usecases error:", error);
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * Đồng bộ related usecases
   */
  private async syncRelatedUsecases(
    versionId: Types.ObjectId, 
    usecaseId: string, 
    newRelatedUsecaseIds: Types.ObjectId[],
    session?: mongoose.ClientSession
  ): Promise<void> {
    // Lấy danh sách usecases trong version
    const allUsecases = await Usecase.find({ version_id: versionId })
      .select('_id related_usecases')
      .session(session || null)
      .lean();

    const validIds = new Set(allUsecases.map(uc => String(uc._id)));
    const usecaseObjectId = new Types.ObjectId(usecaseId);

    // Lọc self-reference và invalid IDs
    const filteredRelated = newRelatedUsecaseIds
      .filter(id => id && !id.equals(usecaseObjectId) && validIds.has(String(id)));

    // Cập nhật usecase hiện tại
    await Usecase.findByIdAndUpdate(
      usecaseId,
      { related_usecases: filteredRelated },
      { session: session || undefined }
    );

    // Cập nhật two-way references
    for (const uc of allUsecases) {
      const currentId = String(uc._id);
      if (currentId !== usecaseId) {
        const currentRelated = (uc.related_usecases || []).map((id: any) => String(id));
        const isRelated = filteredRelated.some(id => String(id) === currentId);

        if (isRelated) {
          // Thêm reference nếu chưa có
          if (!currentRelated.includes(usecaseId)) {
            await Usecase.findByIdAndUpdate(
              uc._id,
              { $addToSet: { related_usecases: usecaseObjectId } },
              { session: session || undefined }
            );
          }
        } else {
          // Xóa reference nếu không còn liên quan
          if (currentRelated.includes(usecaseId)) {
            await Usecase.findByIdAndUpdate(
              uc._id,
              { $pull: { related_usecases: usecaseObjectId } },
              { session: session || undefined }
            );
          }
        }
      }
    }
  }

  /**
   * Xóa references đến usecase bị xóa
   */
  private async removeUsecaseReferences(
    versionId: Types.ObjectId, 
    deletedUsecaseId: string,
    session?: mongoose.ClientSession
  ): Promise<void> {
    const deletedUsecaseObjectId = new Types.ObjectId(deletedUsecaseId);
    
    // Xóa reference từ tất cả usecases trong version
    await Usecase.updateMany(
      { version_id: versionId },
      { $pull: { related_usecases: deletedUsecaseObjectId } },
      { session: session || undefined }
    );
  }

  /**
   * Cập nhật references sau khi normalize IDs (không cần nữa vì dùng _id)
   */
  private updateUsecaseReferences(normalized: any[], beforeNormalize: any[]): any[] {
    // Không cần normalize nữa vì dùng _id
    return normalized;
  }

  /**
   * Xóa conflicts (giữ nguyên từ code cũ)
   */
  async deleteConflicts(versionId: string, conflictId: string): Promise<void> {
    const version = await Version.findById(versionId);

    if (!version) {
      throw new Error("Version not found");
    }

    if (!version.pending_conflicts || version.pending_conflicts.length === 0) {
      throw new Error("No pending conflicts to delete");
    }

    const initialConflictCount = version.pending_conflicts.length;

    version.set('pending_conflicts', version.pending_conflicts.filter(
      conflict => conflict.conflict_id !== conflictId
    ));

    if (version.pending_conflicts.length === initialConflictCount) {
      throw new Error("Conflict not found");
    }

    await version.save();
  }
}