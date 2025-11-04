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
      const  version = await Version.findById(versionId).session(session);
      if (!version) {
        throw new Error("Version not found");
      }

      // 🔥 THÊM VALIDATION: Kiểm tra các trường bắt buộc
      const requiredFields = ['name', 'role', 'goal', 'reason', 'priority'];
      const missingFields = requiredFields.filter(field => !data[field]);

      // if (missingFields.length > 0) {
      //   throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      // }

      // 🔥 ĐẢM BẢO tasks là array và có ít nhất 1 phần tử
      // if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
      //   throw new Error("At least one task is required");
      // }

      // Tạo usecase mới với ID theo format UCX
      const newUsecase = {
        id: this.generateUsecaseId(version),
        // 🔥 ĐẢM BẢO TẤT CẢ TRƯỜNG BẮT BUỘC ĐƯỢC ĐIỀN
        name: data.name?.trim() || '',
        role: data.role?.trim() || '',
        goal: data.goal?.trim() || '',
        reason: data.reason?.trim() || '',
        priority: data.priority || 'medium',
        tasks: Array.isArray(data.tasks) ? data.tasks.filter(task => task.trim()) : [''],
        // Các trường optional với giá trị mặc định
        inputs: data.inputs || [],
        outputs: data.outputs || [],
        context: data.context || '',
        feedback: data.feedback || null,
        rules: data.rules || [],
        triggers: data.triggers || [],
        preconditions: data.preconditions || [],
        postconditions: data.postconditions || [],
        exceptions: data.exceptions || [],
        stakeholders: data.stakeholders || [],
        constraints: data.constraints || [],
        related_usecases: data.related_usecases || [],
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
        }
      });
      await session.commitTransaction();

      try {
        // Broadcast event - bọc trong try-catch riêng
        usecaseSocketService.emitUsecaseCreated(
          String(version.project_id),
          versionId,
          userId,
          newUsecase
        );
      } catch (socketError) {
        console.error('Socket broadcast failed:', socketError);
        // Tiếp tục xử lý mà không throw error
      }
      return new ServiceResponse(
        ResponseStatus.Success,
        'Usecase added successfully',
        newUsecase,
        201
      );

    } catch (error: any) {
      await session.abortTransaction();
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    } finally {
      session.endSession();
    }
  }

  private generateUsecaseId(version: any): string {
    const currentCount = version.requirement_model.length;
    return `UC${currentCount + 1}`;
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
      const version = await Version.findById(versionId).session(session);
      if (!version) throw new Error("Version not found");

      // 🔍 2. Kiểm tra project & quyền truy cập
      const project = await Project.findById(version.project_id).session(session);
      if (!project) throw new Error("Project not found");
      if (!this.hasProjectAccess(project, userId)) throw new Error("Access denied");

      // 🔍 3. Ghi log phục vụ debug
      console.log(">>> updateUsecaseInVersion called");
      console.log("versionId:", versionId);
      console.log("usecaseId (client):", usecaseId);
      console.log("existing IDs:", version.requirement_model.map((uc: any) => uc.id));

      // 🔍 4. Tìm usecase cần cập nhật
      const usecaseIndex = version.requirement_model.findIndex(
        (uc: any) => uc.id === usecaseId
      );
      if (usecaseIndex === -1) {
        throw new Error(`Usecase not found (ID=${usecaseId})`);
      }

      // ✅ 5. Clone an toàn usecase gốc
      const originalUsecase = JSON.parse(
        JSON.stringify(version.requirement_model[usecaseIndex])
      );

      // ✅ 6. Gộp dữ liệu mới
      const updatedUsecase = {
        ...originalUsecase,
        ...data,
        updated_at: new Date()
      };

      // ✅ 7. Ghi đè vào mảng chính
      version.requirement_model[usecaseIndex] = updatedUsecase;

      // ✅ 8. Nếu related_usecases thay đổi → đồng bộ hai chiều
      if (Array.isArray(data.related_usecases)) {
        // Lọc self-reference
        const validIds = version.requirement_model.map((uc: any) => uc.id);
        const filteredRelated = data.related_usecases
          .filter((id) => id && id !== usecaseId && validIds.includes(id));

        updatedUsecase.related_usecases = filteredRelated;

        // Cập nhật ngược lại (hai chiều)
        version.requirement_model.forEach((uc: any) => {
          if (uc.id !== usecaseId) {
            // Nếu UC này nằm trong danh sách liên quan mới
            if (filteredRelated.includes(uc.id)) {
              if (!Array.isArray(uc.related_usecases)) uc.related_usecases = [];
              if (!uc.related_usecases.includes(usecaseId)) {
                uc.related_usecases.push(usecaseId);
              }
            } else {
              // Nếu không còn liên quan thì loại bỏ liên kết cũ
              uc.related_usecases = (uc.related_usecases || []).filter(
                (id: string) => id !== usecaseId
              );
            }
          }
        });
      }

      // ✅ 9. Cập nhật metadata
      version.updated_at = new Date();
      version.affects_requirement = true;

      // ✅ 10. Lưu transaction
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

      // Broadcast event đến tất cả thành viên
      usecaseSocketService.emitUsecaseUpdated(
        project._id.toString(),
        versionId,
        userId,
        updatedUsecase,
        originalUsecase // previous data for comparison
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
      console.error("❌ Update error:", error);
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
      // 🔍 Bước 1: Kiểm tra version tồn tại
      let version = await Version.findById(versionId).session(session);
      if (!version) throw new Error("Version not found");

      // 🔍 Bước 2: Kiểm tra project & quyền truy cập
      const project = await Project.findById(version.project_id).session(session);
      if (!project) throw new Error("Project not found");
      if (!this.hasProjectAccess(project, userId)) throw new Error("Access denied");

      const deletedUsecase = version.requirement_model.find((uc: any) => uc.id === usecaseId);
      if (!deletedUsecase) throw new Error("Usecase not found");
      // 🔍 Bước 3: Kiểm tra usecase tồn tại
      const usecaseExists = version.requirement_model.some((uc: any) => uc.id === usecaseId);
      if (!usecaseExists) throw new Error("Usecase not found");

      // ✅ Bước 4: Dọn references trong các UC khác
      version.requirement_model.forEach((uc: any) => {
        if (Array.isArray(uc.related_usecases) && uc.related_usecases.length > 0) {
          uc.related_usecases = uc.related_usecases.filter((id: string) => id !== usecaseId);
        }
      });

      // ✅ Bước 5: Loại bỏ UC bị xóa
      const beforeNormalize = version.requirement_model.filter(
        (uc: any) => uc.id !== usecaseId
      );

      // ✅ Bước 6: Normalize lại ID (UC1, UC2, ...)
      const normalized = beforeNormalize.map((uc, index) => ({
        ...uc,
        id: `UC${index + 1}`,
      }));

      // ✅ Bước 7: Cập nhật lại references theo ID mới
      const idMap = new Map<string, string>();
      for (let i = 0; i < beforeNormalize.length; i++) {
        const oldId = beforeNormalize[i].id;
        const newId = normalized[i]?.id;
        if (oldId && newId) idMap.set(oldId, newId);
      }

      const synced = normalized.map((uc: any) => {
        if (Array.isArray(uc.related_usecases) && uc.related_usecases.length > 0) {
          uc.related_usecases = uc.related_usecases
            .map((oldRelId: string) => idMap.get(oldRelId) || oldRelId)
            .filter((id: string) => normalized.some((x: any) => x.id === id));
        }
        return uc;
      });

      // ✅ Bước 8: Cập nhật version
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

      // Broadcast event đến tất cả thành viên
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
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    } finally {
      session.endSession();
    }
  }

  async deleteConflicts(versionId: string, conflictId: string): Promise<void> {
    const version = await Version.findById(versionId);

    if (!version) {
      throw new Error("Version not found");
    }

    if (!version.pending_conflicts || version.pending_conflicts.length === 0) {
      throw new Error("No pending conflicts to delete");
    }

    const initialConflictCount = version.pending_conflicts.length;

    // Lọc và giữ lại những conflict không trùng với conflictId cần xóa
    version.set('pending_conflicts', version.pending_conflicts.filter(
      conflict => conflict.conflict_id !== conflictId
    ));

    // Nếu không có conflict nào bị xóa, nghĩa là không tìm thấy conflictId
    if (version.pending_conflicts.length === initialConflictCount) {
      throw new Error("Conflict not found");
    }

    // Lưu lại sự thay đổi
    await version.save();
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
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * Helper: Kiểm tra quyền truy cập project
   */
  private hasProjectAccess(project: any, userId: string): boolean {
    const isOwner = project.owner_id.toString() === userId;
    const isMember = project.members?.some(
      (m: any) => m.user_id.toString() === userId && m.status === 'accepted'
    ) || false;

    return isOwner || isMember;
  }

  /**
   * Helper: Đồng bộ related usecases
   */
  private syncRelatedUsecases(version: any, usecaseId: string, newRelatedUsecases: string[]): void {
    // Lọc self-reference
    const filteredRelated = newRelatedUsecases.filter(id => id !== usecaseId);

    // Kiểm tra tính hợp lệ của các related usecases
    const validUsecaseIds = version.requirement_model.map((uc: any) => uc.id);
    const validRelated = filteredRelated.filter(id => validUsecaseIds.includes(id));

    // Cập nhật related usecases
    const usecaseIndex = version.requirement_model.findIndex((uc: any) => uc.id === usecaseId);
    if (usecaseIndex !== -1) {
      version.requirement_model[usecaseIndex].related_usecases = validRelated;
    }
  }

  /**
   * Helper: Xóa references đến usecase bị xóa
   */
  private removeUsecaseReferences(version: any, deletedUsecaseId: string): void {
    version.requirement_model.forEach((uc: any) => {
      if (uc.related_usecases && uc.related_usecases.includes(deletedUsecaseId)) {
        uc.related_usecases = uc.related_usecases.filter(
          (id: string) => id !== deletedUsecaseId
        );
      }
    });
  }
}