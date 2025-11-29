import mongoose, { Types } from 'mongoose';
import Version from "../../../../../internal/model/version";
import User from '../../../../../internal/model/user';
import Input from "../../../../../internal/model/input";
import Project from "../../../../../internal/model/project";
import Preview from "../../../../../internal/model/preview";
import Database from "../../../../../internal/model/database";
import Testcase from "../../../../../internal/model/testcase";
import Uml from "../../../../../internal/model/uml";
import UsecaseDiagram from "../../../../../internal/model/usecase_diagram";
import ActivityDiagram from "../../../../../internal/model/activity_diagram";
import SequenceDiagram from "../../../../../internal/model/sequence_diagram";
import { LogService } from "../../../../command-ingress/features/log/domain/service";
import { ServiceResponse, ResponseStatus } from "../../../services/serviceResponse";
import { versionSocketService } from "./version.socket.service";
import {PreviewChangeDto} from "../adapter/preview.dto";
import { randomUUID } from "crypto";
import version from '../../../../../internal/model/version';
import project from '../../../../../internal/model/project';
import preview from '../../../../../internal/model/preview';

export class VersionService {
  private logService = new LogService();

  async createOrUpdatePreview(base_version_id: string,created_by: string,change: PreviewChangeDto) {
    try {
      let version = await Version.findById(base_version_id);
      if (!version) {
        return new ServiceResponse(ResponseStatus.Failed,"Version not found",null,404);
      }

      // 2️⃣ Chuẩn hoá 1 thay đổi
      const normalizedChange = {
        change_id: change.change_id ?? randomUUID(),
        entity_type: change.entity_type,
        entity_id: change.entity_id ?? null,
        change_type: change.change_type,
        before_snapshot: change.before_snapshot ?? null,
        after_snapshot: change.after_snapshot ?? null,
        add_at:new Date(),
      };

      // 3️⃣ Tìm preview đang under_review
      let preview = await Preview.findOne({ base_version_id : base_version_id});

      if (preview) {
        // ✅ Preview đã tồn tại → append thay đổi mới
        preview.changes.push(normalizedChange);
        await preview.save();

        return new ServiceResponse(ResponseStatus.Success, "Preview updated successfully", preview, 200);
      }
      const project = await Project.findById(version.project_id).lean();
      // 4️⃣ Lấy danh sách approvers từ project (chỉ owner và editor)
      const approvers = (project.members ?? [])
        .filter((m: any) => ["owner", "editor"].includes(m.role))
        .map((m: any) => ({
          user_id: m.user_id,
          role: m.role,
          status: "pending",
          comment: null,
          approved_at: null,
        }));

      // 5️⃣ Nếu chưa có preview → tạo mới
      preview = new Preview({
        project_id : version.project_id,
        base_version_id :  version._id,
        created_by : created_by,
        changes: [normalizedChange],
        approvers : approvers, // gắn danh sách approvers
        status: "under_review",
        created_at: new Date(),
      });

      await preview.save();

      return new ServiceResponse(ResponseStatus.Success, "Preview created successfully", {preview,versionId: version._id.toString()}, 200);
    } catch (error: any) {
      console.error("Error creating/updating preview:", error);
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }
  /**
   * Lấy preview chi tiết theo id
   */
  public async getPreview(versionId: string) {
    try {
      const preview = await Preview.findOne({ base_version_id: versionId })
        .populate("project_id", "name")
        .populate("base_version_id", "version_number version_major version_minor")
        .populate("created_by", "name email")
        .populate("approvers.user_id", "name email");

      // Nếu không tìm thấy preview, trả về null nhưng vẫn success
      return new ServiceResponse(ResponseStatus.Success,"Preview retrieved",preview ?? null,200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * Approve preview (OWNER ONLY)
   * - If minor → finalize temporary version
   * - If major → finalize temporary version and bump major (+1.0)
   */
  public async approve(baseVersionId: string,userId: string,changeType: "major" | "minor",comment?: string) {
    try {
      // ✅ Lấy baseVersion (bây giờ chính là version tạm)
      const baseVersion = await Version.findById(baseVersionId);
      if (!baseVersion) {
        return new ServiceResponse(ResponseStatus.Failed,"Base version not found",null,404);
      }

      const preview = await Preview.findOne({ base_version_id: baseVersionId });
      if (!preview) {
        return new ServiceResponse(ResponseStatus.Failed,"Preview not found",null,404);
      }

      // ✅ Check owner
      const project = await Project.findById(baseVersion.project_id).lean();
      if (!project) {
        return new ServiceResponse(ResponseStatus.Failed, "Project not found", null, 404);
      }

      const isOwner = (project.members ?? []).some(
        (m: any) => m.user_id?.toString() === userId && m.role === "owner"
      );

      if (!isOwner) {
        return new ServiceResponse(ResponseStatus.Failed,"Only project owner can approve this preview",null,403);
      }

      // ✅ update approver log
      const approver = preview.approvers.find(
        (a: any) => a.user_id?.toString() === userId
      );
      if (approver) {
        approver.status = "approved";
        approver.approved_at = new Date();
        approver.comment = comment ?? "";
      }

      // ✅ CHỈNH VERSION DỰA TRÊN changeType
      if (changeType === "major") {
        // tăng major
        baseVersion.version_major += 1;
        baseVersion.version_minor = 0;
      }else{
        baseVersion.version_minor += 1;
      }

      // ✅ Chuyển version tạm thành version chính thức
      baseVersion.version_temporary = false;
      await baseVersion.save();

      // ✅ update preview
      preview.status = "version_upgraded";
      await preview.save();

      // ✅ Kết thúc
      return new ServiceResponse(ResponseStatus.Success,"Owner approved and version finalized.",{preview,version: baseVersion},200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed,error.message,null,500);
    }
  }

  /**
   * Nâng version từ 1 preview (đã được duyệt)
   * BaseVersion => NewVersion (copy toàn bộ data)
   */
  public async bumpVersion(baseVersionId: string,userId: string,changeType: "major" | "minor"): Promise<ServiceResponse<any>> {
    try {
      // 1️⃣ Lấy base version
      const baseVersion = await Version.findById(baseVersionId);
      if (!baseVersion) {
        return new ServiceResponse(ResponseStatus.Failed, "Base version not found", null, 404);
      }

      // 2️⃣ Tính version mới
      // const { major, minor } = await this.getNextVersion(baseVersion, changeType);

      // 3️⃣ Tạo version mới
      const newVersion = new Version({
        project_id: baseVersion.project_id,
        version_major: baseVersion.version_major,
        version_minor: baseVersion.version_minor,
        created_by: new Types.ObjectId(userId),
        parent_version_id: baseVersion._id,
        version_temporary: true,
        stage: "completed",
        status: "completed",
        progress: 100,
        requirement_model: baseVersion.requirement_model.map(r => r.toObject()),
        pending_conflicts: baseVersion.pending_conflicts.map(r => r.toObject()),
        processing_errors: JSON.parse(JSON.stringify(baseVersion.processing_errors || [])),
        affects_requirement: baseVersion.affects_requirement || false,
      });
      
      await newVersion.save();
      
      // ================================
      // 🔥 MAP LIST
      // ================================
      const inputMap = new Map<string, string>();
      const dbMap = new Map<string, string>();
      const tcMap = new Map<string, string>();

      const usecaseUMLmap = new Map<string, string>();
      const activityUMLmap = new Map<string, string>();
      const sequenceUMLmap = new Map<string, string>();

      const inputIds: Types.ObjectId[] = [];

      // ================================
      // 4️⃣ Clone Inputs
      // ================================
      const baseInputs = await Input.find({ version_id: baseVersion._id }).lean();
      for (const inp of baseInputs) {
        const newId = new Types.ObjectId();
        inputMap.set(inp._id.toString(), newId.toString());

        await Input.create(
          [{
            ...inp,
            _id: newId,
            version_id: newVersion._id,
            created_at: new Date(),
            updated_at: new Date(),
          }]
        );

        inputIds.push(newId);
      }

      // ================================
      // 5️⃣ Clone Databases
      // ================================
      const baseDatabases = await Database.find({ version_id: baseVersion._id }).lean();
      for (const db of baseDatabases) {
        const newId = new Types.ObjectId();
        dbMap.set(db._id.toString(), newId.toString());

        await Database.create(
          [{
            ...db,
            _id: newId,
            version_id: newVersion._id,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        );
      }

      // ================================
      // 6️⃣ Clone Testcases
      // ================================
      const baseTestcases = await Testcase.find({ version_id: baseVersion._id }).lean();
      for (const tc of baseTestcases) {
        const newId = new Types.ObjectId();
        tcMap.set(tc._id.toString(), newId.toString());

        await Testcase.create(
          [{
            ...tc,
            _id: newId,
            version_id: newVersion._id,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        );
      }

      // ================================
      // 7️⃣ Clone Usecase Diagrams
      // ================================
      const usecaseDiagramMap = new Map<string, string>();
      const baseUsecaseDiagrams = await UsecaseDiagram.find({
        version_id: baseVersion._id
      }).lean();

      for (const d of baseUsecaseDiagrams) {
        const newId = new Types.ObjectId();
        usecaseDiagramMap.set(d._id.toString(), newId.toString());

        await UsecaseDiagram.create([{
          ...d,
          _id: newId,
          version_id: newVersion._id,
          created_at: new Date(),
          updated_at: new Date()
        }]);
      }

      // ================================
      // 8️⃣ Clone Activity Diagrams
      // ================================
      const activityDiagramMap = new Map<string, string>();
      const baseActivityDiagrams = await ActivityDiagram.find({
        version_id: baseVersion._id
      }).lean();

      for (const d of baseActivityDiagrams) {
        const newId = new Types.ObjectId();
        activityDiagramMap.set(d._id.toString(), newId.toString());

        await ActivityDiagram.create([{
          ...d,
          _id: newId,
          version_id: newVersion._id,
          created_at: new Date(),
          updated_at: new Date()
        }]);
      }

      // ================================
      // 9️⃣ Clone Sequence Diagrams
      // ================================
      const sequenceDiagramMap = new Map<string, string>();
      const baseSequenceDiagrams = await SequenceDiagram.find({
        version_id: baseVersion._id
      }).lean();

      for (const d of baseSequenceDiagrams) {
        const newId = new Types.ObjectId();
        sequenceDiagramMap.set(d._id.toString(), newId.toString());

        await SequenceDiagram.create([{
          ...d,
          _id: newId,
          version_id: newVersion._id,
          created_at: new Date(),
          updated_at: new Date()
        }]);
      }


      // ================================
      // 9️⃣ Update version inputs
      // ================================
      newVersion.inputs = inputIds;
      await newVersion.save();

      await this.setCurrentVersion(newVersion.project_id.toString(),newVersion._id.toString(),userId);
      versionSocketService.emitVersionBumped(
        newVersion.project_id.toString(),
        baseVersionId,
        userId,
        newVersion
      );
      return new ServiceResponse(
        ResponseStatus.Success,
        "New version created with cloned entities",
        {
          newVersion,
          idMaps: {
            inputMap,
            dbMap,
            tcMap,
            usecaseUMLmap,
            activityUMLmap,
            sequenceUMLmap,
          },
        },
        201
      );
    } catch (e: any) {
      return new ServiceResponse(ResponseStatus.Failed, e.message, null, 500);
    }
  }
   async setCurrentVersion(projectId: string,versionId: string,userId: string): Promise<ServiceResponse<any>> {
    try {
      // 🔍 Kiểm tra version có tồn tại trong project hay không
      const version = await Version.findOne({ _id: versionId, project_id: projectId });
      if (!version) {
        return new ServiceResponse(ResponseStatus.Failed,"Version not found in this project",null,404);
      }

      // 🔍 Kiểm tra project tồn tại
      const project = await Project.findById(projectId);
      if (!project) {
        return new ServiceResponse(ResponseStatus.Failed, "Project not found", null, 404);
      }

      // 🕓 Lưu version cũ (nếu có)
      const oldVersionId = project.current_version?.toString();

      // ⚙️ Cập nhật version hiện tại
      project.current_version = new mongoose.Types.ObjectId(versionId);
      await project.save();

      // 🔔 Gửi thông báo realtime tới các user khác trong project
      versionSocketService.emitVersionSwitched(
        projectId.toString(),
        userId,
        versionId,
        oldVersionId || ""
      );

      // ✅ Hoàn tất
      return new ServiceResponse(ResponseStatus.Success,"Current version updated successfully",project,200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }
  // /**
  //  * Lấy version tiếp theo (major/minor)
  //  */
  // private async getNextVersion(baseVersion: any, type: "major" | "minor" = "minor") {
  //   if (!baseVersion) throw new Error("Invalid base version");

  //   if (type === "major") {
  //     const nextMajor = baseVersion.version_major + 1;
  //     return { major: nextMajor, minor: 0 };
  //   }

  //   const nextMinor = baseVersion.version_minor + 1;
  //   return { major: baseVersion.version_major, minor: nextMinor };
  // }

  /**
   * Lấy danh sách version theo project
   */
  async getVersionsByProject(projectId: string): Promise<ServiceResponse<any>> {
    try {
      const versions = await Version.find({ project_id: projectId })
        .sort({ created_at: -1 })
        .select([
          "version_major",
          "version_minor",
          "version_number",
          "created_by",
          "created_at",
          "updated_at",
          "stage",
          "status",
        ])
        .populate("created_by", "name email");

      return new ServiceResponse(ResponseStatus.Success, "Versions retrieved", versions, 200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * Xóa version
   */
  async deleteVersion(versionId: string, userId: string): Promise<ServiceResponse<any>> {
    try {
      const version = await Version.findById(versionId);
      if (!version)
        return new ServiceResponse(ResponseStatus.Failed, "Version not found", null, 404);

      await Input.deleteMany({ version_id: versionId });
      await Preview.deleteOne({ base_version_id: versionId });
      await Version.deleteOne({ _id: versionId });

      const project = await Project.findById(version.project_id);
      if (project && project.current_version?.toString() === versionId.toString()) {
        const latestVersion = await Version.findOne({ project_id: project._id }).sort({ created_at: -1 });
        project.current_version = latestVersion?._id || null;
        await project.save();
      }

      versionSocketService.emitVersionDeleted(project._id.toString(), versionId, userId);

      return new ServiceResponse(ResponseStatus.Success, "Version deleted successfully", { deleted: versionId }, 200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  public async revertChange(versionId: string, userId: string, changeId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const baseVersion = await Version.findById(versionId).session(session);
      if (!baseVersion) throw new Error("Base version not found");

      const preview = await Preview.findOne({ base_version_id: versionId }).session(session);
      if (!preview) throw new Error("Preview not found");

      const change = preview.changes.find((c: any) => c.change_id === changeId);
      if (!change) throw new Error(`Change with id ${changeId} not found`);

      const { entity_type, change_type, entity_id, before_snapshot, after_snapshot } = change;

      console.log(`\n=== [REVERT] ${entity_type} | ${change_type} | ${entity_id} ===`);

      // ======================================================
      // 1️⃣ Helpers
      // ======================================================
      const now = new Date();

      const revertDiagram = async (Model: any) => {
        if (change_type === "added") {
          if (entity_id) await Model.deleteOne({ _id: entity_id }).session(session);
        }

        else if (change_type === "updated") {
          if (entity_id && before_snapshot)
            await Model.updateOne({ _id: entity_id }, { $set: before_snapshot }).session(session);
        }

        else if (change_type === "deleted") {
          if (before_snapshot) {
            const newItem = {
              ...before_snapshot,
              _id: new Types.ObjectId(),
              created_at: now,
              updated_at: now,
            };
            await Model.create([newItem], { session });
          }
        }
      };

      // ======================================================
      // 2️⃣ Xử lý entity
      // ======================================================

      // ------------------------------------------------------
      // INPUT
      // ------------------------------------------------------
      if (entity_type === "input") {
        if (change_type === "added") {
          await Input.deleteOne({ _id: entity_id, version_id: baseVersion._id }).session(session);
          await Version.updateOne({ _id: baseVersion._id }, { $pull: { inputs: entity_id } }, { session });
        }
        else if (change_type === "updated" && before_snapshot) {
          await Input.updateOne({ _id: entity_id }, { $set: before_snapshot }).session(session);
        }
        else if (change_type === "deleted" && before_snapshot) {
          const newId = new Types.ObjectId();
          await Input.create([{ ...before_snapshot, _id: newId, version_id: baseVersion._id, created_at: now, updated_at: now }], { session });
          await Version.updateOne({ _id: baseVersion._id }, { $addToSet: { inputs: newId } }, { session });
        }
      }

      // ------------------------------------------------------
      // DATABASE (không xử lý table ở đây)
      // ------------------------------------------------------
      else if (entity_type === "database") {
        if (change_type === "added") {
          await Database.deleteOne({ _id: entity_id }).session(session);
        }
        else if (change_type === "updated") {
          await Database.updateOne({ _id: entity_id }, { $set: before_snapshot }).session(session);
        }
        else if (change_type === "deleted" && before_snapshot) {
          const newItem = { ...before_snapshot, _id: new Types.ObjectId(), created_at: now, updated_at: now };
          await Database.create([newItem], { session });
        }
      }

      // ------------------------------------------------------
      // TABLE INSIDE DATABASE
      // ------------------------------------------------------
      else if (entity_type === "table") {
        const db = await Database.findOne({ _id: entity_id, version_id: baseVersion._id }).session(session);
        if (!db) throw new Error("Database not found for table revert");

        if (change_type === "added") {
          await Database.updateOne({ _id: db._id }, { $pull: { tables: { name: after_snapshot?.name } } }).session(session);
        }
        else if (change_type === "updated") {
          await Database.updateOne(
            { _id: db._id, "tables.name": before_snapshot?.name },
            { $set: { "tables.$": before_snapshot } }
          ).session(session);
        }
        else if (change_type === "deleted") {
          await Database.updateOne(
            { _id: db._id },
            { $push: { tables: before_snapshot } }
          ).session(session);
        }
      }

      // ------------------------------------------------------
      // TESTCASE
      // ------------------------------------------------------
      else if (entity_type === "testcase") {
        if (change_type === "added") {
          await Testcase.deleteOne({ _id: entity_id }).session(session);
        }
        else if (change_type === "updated") {
          await Testcase.updateOne({ _id: entity_id }, { $set: before_snapshot }).session(session);
        }
        else if (change_type === "deleted") {
          const newTc = {
            ...before_snapshot,
            _id: new Types.ObjectId(),
            version_id: baseVersion._id,
            created_at: now,
            updated_at: now,
          };
          await Testcase.create([newTc], { session });
        }
      }

      // ------------------------------------------------------
      // DIAGRAMS (Usecase / Activity / Sequence)
      // ------------------------------------------------------
      else if (entity_type === "usecase_diagram") {
        await revertDiagram(UsecaseDiagram);
      }
      else if (entity_type === "activity_diagram") {
        await revertDiagram(ActivityDiagram);
      }
      else if (entity_type === "sequence_diagram") {
        await revertDiagram(SequenceDiagram);
      }
      // ------------------------------------------------------
      // REQUIREMENT
      // ------------------------------------------------------
      else if (entity_type === "requirement") {
        const reqs = baseVersion.requirement_model || [];

        if (change_type === "added") {
          const idx = parseInt(before_snapshot.id.replace("UC", "")) - 1;
          reqs.splice(idx, 0, before_snapshot);
          reqs.forEach((r, i) => (r.id = `UC${i + 1}`));
          baseVersion.set('requirement_model',reqs);
        }
        else if (change_type === "updated") {
          const updated = reqs.map(r => r.id === entity_id ? before_snapshot : r);
          baseVersion.set('requirement_model',updated);
        }
        else if (change_type === "deleted") {
          reqs.push(before_snapshot);
          baseVersion.set('requirement_model',reqs);
        }

        baseVersion.affects_requirement = true;
        baseVersion.updated_at = now;
      }
      // ======================================================
      // 3️⃣ Commit changes
      // ======================================================
      preview.changes.pull({ change_id: changeId });
      await preview.save({ session });
      await baseVersion.save({ session });

      await session.commitTransaction();

      return new ServiceResponse(
        ResponseStatus.Success,
        "Reverted successfully",
        null,
        200
      );
    } catch (err) {
      await session.abortTransaction();
      console.error("❌ revertChange error:", err);
      throw err;
    } finally {
    session.endSession();
    }
  }


  /**
   * Đánh dấu version là đang chỉnh sửa (editing)
   * Chỉ cho phép 1 version editing cùng lúc trong project
   */
  public async markEditing(versionId: string, userId: string): Promise<ServiceResponse<any>> {
    try {
      const version = await Version.findById(versionId);
      if (!version) return new ServiceResponse(ResponseStatus.Failed, "Version not found", null, 404);

      // Nếu đang là "editing" → toggle về "none"
      if (version.edit_flag === "editing") {
        version.edit_flag = "none";
      } else {
        // Xoá cờ "editing" ở các version khác cùng project
        await Version.updateMany(
          { project_id: version.project_id, edit_flag: "editing", _id: { $ne: versionId } },
          { $set: { edit_flag: "none" } }
        );
        // Đánh dấu version hiện tại là editing
        version.edit_flag = "editing";
      }

      await version.save();

      return new ServiceResponse(
        ResponseStatus.Success,
        version.edit_flag === "editing" ? "Version marked as editing" : "Version flag cleared",
        version,
        200
      );
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * Đánh dấu version là khóa (locked) hoặc gỡ cờ nếu đang locked
   */
  public async markLocked(versionId: string, userId: string): Promise<ServiceResponse<any>> {
    try {
      const version = await Version.findById(versionId);
      if (!version) return new ServiceResponse(ResponseStatus.Failed, "Version not found", null, 404);

      // Nếu đang là "locked" → toggle về "none"
      if (version.edit_flag === "locked") {
        version.edit_flag = "none";
      } else {
        // Đặt cờ locked
        version.edit_flag = "locked";
        // Nếu muốn, có thể tự động gỡ "editing" của version này
        // version.edit_flag = "locked" sẽ ghi đè trực tiếp
      }

      await version.save();

      return new ServiceResponse(
        ResponseStatus.Success,
        version.edit_flag === "locked" ? "Version marked as locked" : "Version flag cleared",
        version,
        200
      );
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  public async rollbackVersion(versionId: string, userId: string) {
    try {
      const version = await Version.findById(versionId);
      if (!version) {
        return new ServiceResponse(ResponseStatus.Failed, "Version not found", null, 404);
      }
      const parentVersionId = version.parent_version_id;
      const parentVersion = await Version.findById(parentVersionId);
      if (!parentVersion) {
        return new ServiceResponse(ResponseStatus.Failed,"Parent version not found", null,404);
      }
      // 🔍 2. Tìm preview gắn với version này
      const preview = await Preview.findOne({ target_version_id: versionId });
      if (!preview) {
        return new ServiceResponse(ResponseStatus.Failed,"Preview not found",null,404);
      }
      // 🔍 3. Tìm approver của user này
      const approver = preview.approvers.find(a => a.user_id.toString() === userId);
      if (!approver) {
        return new ServiceResponse(ResponseStatus.Failed,"You are not an approver of this preview",null,403);
      }
      // 4️⃣ Đánh dấu user này rollback
      approver.status = "rollback";
      approver.approved_at = new Date();
      await preview.save();
      // 5️⃣ Kiểm tra TẤT CẢ đã rollback chưa?
      const allRollback = preview.approvers.every(a => a.status === "rollback");
      if (!allRollback) {
        // Một số người rollback → chờ người khác
        return new ServiceResponse(ResponseStatus.Success,"Rollback submitted, waiting for other approvers",{ preview_status: "partial_rollback" },200);
      }
      // ================================
      // 🎯 6️⃣ TẤT CẢ APPROVERS ĐÃ ROLLBACK → THỰC HIỆN ROLLBACK VERSION
      // ================================
      const project = await Project.findById(version.project_id);
      if (!project) {
        return new ServiceResponse(ResponseStatus.Failed, "Project not found", null, 404);
      }
      const oldVersionId = project.current_version?.toString() || "";
      // Set current version về parent
      project.current_version = new mongoose.Types.ObjectId(parentVersionId);
      await project.save();
      await Input.deleteMany({ version_id: versionId });
      await Preview.deleteOne({ base_version_id: versionId });
      await Version.deleteOne({ _id: versionId });
      // Xoá preview
      await preview.deleteOne();
      // Emit
      versionSocketService.emitVersionSwitched(
        project._id.toString(),
        userId,
        parentVersionId.toString(),
        oldVersionId
      );
      return new ServiceResponse(ResponseStatus.Success,"Rollback completed by all approvers",null,200);
    } catch (err) {
      throw err;
    }
  }
}