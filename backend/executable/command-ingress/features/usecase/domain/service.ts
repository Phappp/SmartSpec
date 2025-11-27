// features/usecase/domain/service.ts
import mongoose from 'mongoose';
import Version from "../../../../../internal/model/version";
import Project from "../../../../../internal/model/project";
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
   * Generate usecase ID theo format UCX
   */
  private generateUsecaseId(version: any): string {
    const currentCount = version.requirement_model.length;
    return `UC${currentCount + 1}`;
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
          version = (await this.versionService.bumpVersion(versionId,userId,"minor")).data.newVersion;
          console.log("version sau khi bump",version._id);
          if (!version) throw new Error("Version not found after bump");
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

      // Normalize role với cơ chế mapping thông minh
      const normalizedRole = this.normalizeRole(cleanedData.role, version.requirement_model || []);

      // Tạo usecase mới
      const newUsecase = {
        id: this.generateUsecaseId(version),
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
        related_usecases: cleanedData.related_usecases,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Thêm vào requirement_model
      version.requirement_model.push(newUsecase);
      version.updated_at = new Date();
      version.affects_requirement = true;

      await version.save({ session });

      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "requirement",
          entity_id: newUsecase.id,
          change_type: "added",
          before_snapshot: null,
          after_snapshot: newUsecase
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
          message: `${userId} created usecase ${newUsecase.name} in version ${version.version_number}`
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
          newUsecase
        );
      } catch (socketError) {
        console.error('Socket broadcast failed:', socketError);
      }

      return new ServiceResponse(
        ResponseStatus.Success,
        'Usecase added successfully',
        newUsecase,
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
          version = (await this.versionService.bumpVersion(versionId,userId,"minor")).data.newVersion;
          console.log("version sau khi bump",version._id);
          if (!version) throw new Error("Version not found after bump");
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
      const usecaseIndex = version.requirement_model.findIndex(
        (uc: any) => uc.id === usecaseId
      );
      if (usecaseIndex === -1) {
        throw new Error(`Usecase not found (ID=${usecaseId})`);
      }

      // Clone usecase gốc
      const originalUsecase = JSON.parse(
        JSON.stringify(version.requirement_model[usecaseIndex])
      );

      // Clean và validate data
      const cleanedData = this.cleanUsecaseData(data);

      // Normalize role với cơ chế mapping (loại trừ UC đang update)
      let normalizedRole;
      if (cleanedData.role) {
        const otherUsecases = version.requirement_model.filter((uc: any, index: number) =>
          index !== usecaseIndex
        );
        normalizedRole = this.normalizeRole(cleanedData.role, otherUsecases);
      } else {
        normalizedRole = originalUsecase.role;
      }

      // Gộp dữ liệu mới
      const updatedUsecase = {
        ...originalUsecase,
        ...cleanedData,
        role: normalizedRole,
        updated_at: new Date()
      };

      // Ghi đè vào mảng chính
      version.requirement_model[usecaseIndex] = updatedUsecase;

      // Đồng bộ related usecases nếu có thay đổi
      if (Array.isArray(cleanedData.related_usecases)) {
        this.syncRelatedUsecases(version, usecaseId, cleanedData.related_usecases);
      }

      // Cập nhật metadata
      version.updated_at = new Date();
      version.affects_requirement = true;

      await version.save({ session });

      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "requirement",
          entity_id: updatedUsecase.id,
          change_type: "updated",
          before_snapshot: originalUsecase,
          after_snapshot: updatedUsecase
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
          before: originalUsecase,
          after: updatedUsecase,
          message: `${userId} updated usecase ${originalUsecase.name} in version ${version.version_number}`
        }
      });

      await session.commitTransaction();

      // Broadcast event
      usecaseSocketService.emitUsecaseUpdated(
        project._id.toString(),
        versionId,
        userId,
        updatedUsecase,
        originalUsecase
      );

      console.log(`✅ Usecase ${usecaseId} updated successfully`);
      return new ServiceResponse(
        ResponseStatus.Success,
        "Usecase updated successfully",
        updatedUsecase,
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
      if (!version) throw new Error("Version not found");

      // ✅ Nếu version không phải temporary → bump trước
      if (version.version_temporary === false) {
          version = (await this.versionService.bumpVersion(versionId,userId,"minor")).data.newVersion;
          console.log("version sau khi bump",version._id);
          if (!version) throw new Error("Version not found after bump");
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
      const deletedUsecase = version.requirement_model.find((uc: any) => uc.id === usecaseId);
      if (!deletedUsecase) {
        throw new Error("Usecase not found");
      }

      // Xóa references trong các UC khác
      this.removeUsecaseReferences(version, usecaseId);

      // Loại bỏ UC bị xóa và normalize lại IDs
      const beforeNormalize = version.requirement_model.filter(
        (uc: any) => uc.id !== usecaseId
      );

      const normalized = beforeNormalize.map((uc, index) => ({
        ...uc,
        id: `UC${index + 1}`,
      }));

      // Cập nhật references theo ID mới
      const synced = this.updateUsecaseReferences(normalized, beforeNormalize);

      // Cập nhật version
      version.set("requirement_model", synced);
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
          before: deletedUsecase,
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
        { deleted_id: usecaseId },
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

      return new ServiceResponse(
        ResponseStatus.Success,
        'Usecases retrieved successfully',
        version.requirement_model || [],
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
  private syncRelatedUsecases(version: any, usecaseId: string, newRelatedUsecases: string[]): void {
    // Lọc self-reference và invalid IDs
    const validIds = version.requirement_model.map((uc: any) => uc.id);
    const filteredRelated = newRelatedUsecases
      .filter(id => id && id !== usecaseId && validIds.includes(id));

    // Cập nhật usecase hiện tại
    const usecaseIndex = version.requirement_model.findIndex((uc: any) => uc.id === usecaseId);
    if (usecaseIndex !== -1) {
      version.requirement_model[usecaseIndex].related_usecases = filteredRelated;
    }

    // Cập nhật two-way references
    version.requirement_model.forEach((uc: any) => {
      if (uc.id !== usecaseId) {
        if (filteredRelated.includes(uc.id)) {
          // Thêm reference nếu chưa có
          if (!Array.isArray(uc.related_usecases)) {
            uc.related_usecases = [];
          }
          if (!uc.related_usecases.includes(usecaseId)) {
            uc.related_usecases.push(usecaseId);
          }
        } else {
          // Xóa reference nếu không còn liên quan
          if (Array.isArray(uc.related_usecases)) {
            uc.related_usecases = uc.related_usecases.filter(
              (id: string) => id !== usecaseId
            );
          }
        }
      }
    });
  }

  /**
   * Xóa references đến usecase bị xóa
   */
  private removeUsecaseReferences(version: any, deletedUsecaseId: string): void {
    version.requirement_model.forEach((uc: any) => {
      if (Array.isArray(uc.related_usecases)) {
        uc.related_usecases = uc.related_usecases.filter(
          (id: string) => id !== deletedUsecaseId
        );
      }
    });
  }

  /**
   * Cập nhật references sau khi normalize IDs
   */
  private updateUsecaseReferences(normalized: any[], beforeNormalize: any[]): any[] {
    const idMap = new Map<string, string>();

    // Tạo mapping từ ID cũ sang ID mới
    for (let i = 0; i < beforeNormalize.length; i++) {
      const oldId = beforeNormalize[i].id;
      const newId = normalized[i]?.id;
      if (oldId && newId) {
        idMap.set(oldId, newId);
      }
    }

    // Cập nhật references theo mapping
    return normalized.map((uc: any) => {
      if (Array.isArray(uc.related_usecases) && uc.related_usecases.length > 0) {
        uc.related_usecases = uc.related_usecases
          .map((oldRelId: string) => idMap.get(oldRelId) || oldRelId)
          .filter((id: string) => normalized.some((x: any) => x.id === id));
      }
      return uc;
    });
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