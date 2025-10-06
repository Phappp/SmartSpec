// features/usecase/domain/service.ts
import mongoose from 'mongoose';
import Version from "../../../../../internal/model/version";
import Project from "../../../../../internal/model/project";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import { CreateUsecaseDto, UpdateUsecaseDto } from '../adapter/dto';

export class UsecaseService {

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
      const version = await Version.findById(versionId).session(session);
      if (!version) {
        throw new Error("Version not found");
      }

      // Kiểm tra project và quyền truy cập
      const project = await Project.findById(version.project_id).session(session);
      if (!project) {
        throw new Error("Project not found");
      }

      if (!this.hasProjectAccess(project, userId)) {
        throw new Error("Access denied");
      }

      // Tạo usecase mới
      const newUsecase = {
        id: this.generateUsecaseId(),
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Thêm vào requirement_model
      version.requirement_model.push(newUsecase);
      version.updated_at = new Date();
      version.affects_requirement = true;

      await version.save({ session });
      await session.commitTransaction();

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
      await session.commitTransaction();

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
      const version = await Version.findById(versionId).session(session);
      if (!version) throw new Error("Version not found");

      // 🔍 Bước 2: Kiểm tra project & quyền truy cập
      const project = await Project.findById(version.project_id).session(session);
      if (!project) throw new Error("Project not found");
      if (!this.hasProjectAccess(project, userId)) throw new Error("Access denied");

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
      await session.commitTransaction();

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
   * Helper: Tạo ID unique cho usecase
   */
  private generateUsecaseId(): string {
    return `uc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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