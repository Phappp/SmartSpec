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
   * Normalize actor structure với cơ chế mapping thông minh (schema mới)
   * Actor ID theo số thứ tự: actor_1, actor_2, actor_3...
   * Mapping name → ID: Mỗi actor name được ánh xạ cố định đến một actor ID
   * Hỗ trợ cả actor (mới) và role (cũ - backward compatibility)
   */
  private normalizeActor(actor: any, existingUsecases: any[]): { id: string; name: string; description: string } {
    if (!actor) {
      return { id: 'actor_user', name: 'Người dùng hệ thống', description: 'Người dùng sử dụng hệ thống' };
    }

    const actorName = typeof actor === 'string' ? actor.trim() : (actor.name?.trim() || 'Người dùng hệ thống');
    const actorDescription = typeof actor === 'string' ? '' : (actor.description?.trim() || '');

    if (!actorName) {
      return { id: 'actor_user', name: 'Người dùng hệ thống', description: 'Người dùng sử dụng hệ thống' };
    }

    // 🔍 Bước 1: Thu thập tất cả actors hiện có từ tất cả use cases (hỗ trợ cả actor và role)
    const allExistingActors: { id: string, name: string }[] = [];
    existingUsecases.forEach(uc => {
      const actorOrRole = (uc as any).actor || uc.role;
      if (actorOrRole && actorOrRole.id && actorOrRole.name) {
        // Chỉ lấy actors có ID hợp lệ (actor_1, actor_2, ... hoặc role_1, role_2, ...)
        if (actorOrRole.id.match(/^(actor|role)_\d+$/)) {
          allExistingActors.push({
            id: actorOrRole.id,
            name: actorOrRole.name.trim()
          });
        }
      }
    });

    // 🔍 Bước 2: Tìm actor trùng name (exact match - phân biệt hoa thường)
    const existingActor = allExistingActors.find(r => r.name === actorName);

    if (existingActor) {
      // ✅ Trùng name → dùng ID cũ
      console.log(`🔄 Actor mapping: "${actorName}" → ${existingActor.id} (existing)`);
      return { id: existingActor.id, name: actorName, description: actorDescription };
    }

    // 🔍 Bước 3: Tạo ID mới theo số thứ tự
    const actorIds = allExistingActors.map(r => r.id);
    const actorNumbers = actorIds
      .map(id => {
        const match = id.match(/^(actor|role)_(\d+)$/);
        return match ? parseInt(match[2]) : NaN;
      })
      .filter(num => !isNaN(num));

    const maxNumber = actorNumbers.length > 0 ? Math.max(...actorNumbers) : 0;
    const newActorId = `actor_${maxNumber + 1}`;

    console.log(`🆕 New actor: "${actorName}" → ${newActorId}`);
    return { id: newActorId, name: actorName, description: actorDescription };
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
   * Clean và validate form data (schema mới)
   */
  private cleanUsecaseData(data: any): any {
    const cleaned = { ...data };

    // Đảm bảo type, level, status hợp lệ
    if (!cleaned.type || !['use_case', 'epic', 'feature'].includes(cleaned.type)) {
      cleaned.type = 'use_case';
    }
    if (!cleaned.level || !['system', 'module', 'component'].includes(cleaned.level)) {
      cleaned.level = 'system';
    }
    if (!cleaned.status || !['active', 'inactive', 'deprecated'].includes(cleaned.status)) {
      cleaned.status = 'active';
    }

    // Đảm bảo priority và frequency hợp lệ
    if (!['low', 'medium', 'high'].includes(cleaned.priority)) {
      cleaned.priority = 'medium';
    }
    if (!cleaned.frequency || !['low', 'medium', 'high'].includes(cleaned.frequency)) {
      cleaned.frequency = 'medium';
    }

    // Clean context (object)
    if (!cleaned.context || typeof cleaned.context !== 'object') {
      cleaned.context = { module: '', scope: '', system: '' };
    }

    // Clean trigger (object)
    if (!cleaned.trigger || typeof cleaned.trigger !== 'object' || !cleaned.trigger.event) {
      cleaned.trigger = { event: 'User initiates action', source: 'UI' };
    }

    // Clean main_flow (array of objects) - REQUIRED
    if (!Array.isArray(cleaned.main_flow) || cleaned.main_flow.length === 0) {
      // Fallback: nếu có tasks (schema cũ), convert sang main_flow
      if (Array.isArray(cleaned.tasks) && cleaned.tasks.length > 0) {
        cleaned.main_flow = cleaned.tasks.map((task: string, index: number) => ({
          step: index + 1,
          actor: cleaned.actor?.name || 'User',
          action: task,
          expected_result: `Task ${index + 1} completed`
        }));
      } else {
        cleaned.main_flow = [{
          step: 1,
          actor: cleaned.actor?.name || 'User',
          action: 'Complete the use case',
          expected_result: 'Use case completed'
        }];
      }
    }

    // Clean alternative_flows (array of objects)
    if (!Array.isArray(cleaned.alternative_flows)) {
      cleaned.alternative_flows = [];
    }

    // Clean exceptions (array of objects)
    if (!Array.isArray(cleaned.exceptions)) {
      cleaned.exceptions = [];
    } else if (cleaned.exceptions.length > 0 && typeof cleaned.exceptions[0] === 'string') {
      // Convert string array to exception objects
      cleaned.exceptions = cleaned.exceptions.map((exc: string, index: number) => ({
        id: `E${index + 1}`,
        at_step: cleaned.main_flow.length,
        type: 'System',
        description: exc,
        system_response: `Handle exception: ${exc}`
      }));
    }

    // Clean rules (array of objects)
    if (!Array.isArray(cleaned.rules)) {
      cleaned.rules = [];
    } else if (cleaned.rules.length > 0 && typeof cleaned.rules[0] === 'string') {
      // Convert string array to rule objects
      cleaned.rules = cleaned.rules.map((rule: string, index: number) => ({
        id: `R${index + 1}`,
        description: rule
      }));
    }

    // Clean inputs (array of objects)
    if (!Array.isArray(cleaned.inputs)) {
      cleaned.inputs = [];
    } else if (cleaned.inputs.length > 0 && typeof cleaned.inputs[0] === 'string') {
      // Convert string array to input objects
      cleaned.inputs = cleaned.inputs.map((input: string) => ({
        name: input,
        type: 'string',
        required: true
      }));
    }

    // Clean outputs (array of objects)
    if (!Array.isArray(cleaned.outputs)) {
      cleaned.outputs = [];
    } else if (cleaned.outputs.length > 0 && typeof cleaned.outputs[0] === 'string') {
      // Convert string array to output objects
      cleaned.outputs = cleaned.outputs.map((output: string) => ({
        name: output,
        type: 'string',
        optional: false
      }));
    }

    // Clean array fields (string arrays)
    const stringArrayFields = [
      'preconditions', 'postconditions', 'non_functional_constraints', 'stakeholders'
    ];

    stringArrayFields.forEach(field => {
      if (!Array.isArray(cleaned[field])) {
        cleaned[field] = [];
      } else {
        cleaned[field] = cleaned[field]
          .map((item: string) => typeof item === 'string' ? item.trim() : item)
          .filter((item: string) => item && item !== '');
      }
    });

    // Clean constraints (backward compatibility - map to non_functional_constraints)
    if (cleaned.constraints && !cleaned.non_functional_constraints) {
      cleaned.non_functional_constraints = Array.isArray(cleaned.constraints) ? cleaned.constraints : [];
    }
    if (!cleaned.non_functional_constraints) {
      cleaned.non_functional_constraints = [];
    }

    // Đảm bảo description có giá trị
    if (!cleaned.description || cleaned.description.trim() === '') {
      cleaned.description = cleaned.name || '';
    }

    // Đảm bảo business_reason có giá trị (backward compatibility với reason)
    if (!cleaned.business_reason) {
      cleaned.business_reason = cleaned.reason || cleaned.goal || '';
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

      // Lấy danh sách usecases hiện có để normalize actor
      const existingUsecases = await Usecase.find({ version_id: version._id }).lean();
      const normalizedActor = this.normalizeActor(cleanedData.actor, existingUsecases);

      // Tạo usecase mới trong collection (schema mới)
      const newUsecase = await Usecase.create([{
        project_id: version.project_id,
        version_id: version._id,
        type: cleanedData.type || 'use_case',
        level: cleanedData.level || 'system',
        status: cleanedData.status || 'active',
        name: cleanedData.name,
        description: cleanedData.description || cleanedData.name,
        actor: normalizedActor,
        goal: cleanedData.goal,
        business_reason: cleanedData.business_reason,
        context: cleanedData.context || { module: '', scope: '', system: '' },
        priority: cleanedData.priority,
        frequency: cleanedData.frequency || 'medium',
        trigger: cleanedData.trigger || { event: 'User initiates action', source: 'UI' },
        preconditions: cleanedData.preconditions || [],
        main_flow: cleanedData.main_flow,
        alternative_flows: cleanedData.alternative_flows || [],
        exceptions: cleanedData.exceptions || [],
        postconditions: cleanedData.postconditions || [],
        rules: cleanedData.rules || [],
        inputs: cleanedData.inputs || [],
        outputs: cleanedData.outputs || [],
        non_functional_constraints: cleanedData.non_functional_constraints || [],
        stakeholders: cleanedData.stakeholders || [],
        audit: {
          created_by: new Types.ObjectId(userId),
          created_at: new Date(),
          updated_by: new Types.ObjectId(userId),
          updated_at: new Date()
        }
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
        performed_by_ai: true
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

      // Normalize actor với cơ chế mapping (loại trừ UC đang update)
      let normalizedActor;
      if (cleanedData.actor) {
        const otherUsecases = await Usecase.find({
          version_id: version._id,
          _id: { $ne: usecaseId }
        }).lean().session(session);
        normalizedActor = this.normalizeActor(cleanedData.actor, otherUsecases);
      } else {
        // Hỗ trợ cả actor (mới) và role (cũ)
        const originalUsecaseAny = originalUsecase as any;
        const actorOrRole = originalUsecaseAny.actor || originalUsecaseAny.role;
        if (actorOrRole) {
          normalizedActor = {
            id: actorOrRole.id || 'actor_user',
            name: actorOrRole.name || 'Người dùng hệ thống',
            description: actorOrRole.description || ''
          };
        } else {
          normalizedActor = { id: 'actor_user', name: 'Người dùng hệ thống', description: 'Người dùng sử dụng hệ thống' };
        }
      }

      // Cập nhật usecase (schema mới)
      const updateData: any = {
        ...cleanedData,
        actor: normalizedActor
      };

      // Cập nhật audit
      if (originalUsecase.audit) {
        updateData.audit = {
          ...originalUsecase.audit,
          updated_by: new Types.ObjectId(userId),
          updated_at: new Date()
        };
      } else {
        // Fallback: tạo audit mới nếu chưa có (hỗ trợ cả audit object và các field cũ)
        const originalUsecaseAny = originalUsecase as any;
        updateData.audit = {
          created_by: originalUsecase.audit?.created_by || originalUsecaseAny.created_by || new Types.ObjectId(userId),
          created_at: originalUsecase.audit?.created_at || originalUsecaseAny.created_at || new Date(),
          updated_by: new Types.ObjectId(userId),
          updated_at: new Date()
        };
      }

      const updatedUsecase = await Usecase.findByIdAndUpdate(
        usecaseId,
        updateData,
        { new: true, session }
      );

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