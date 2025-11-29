import mongoose, { Types } from 'mongoose';
import Version from "../../../../../internal/model/version";
import User from '../../../../../internal/model/user';
import Input from "../../../../../internal/model/input";
import Output from "../../../../../internal/model/output";
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
import { PreviewChangeDto } from "../adapter/preview.dto";
import { randomUUID } from "crypto";
import version from '../../../../../internal/model/version';
import project from '../../../../../internal/model/project';
import preview from '../../../../../internal/model/preview';


export class VersionService {
  private logService = new LogService();

  async createOrUpdatePreview(base_version_id: string, created_by: string, change: PreviewChangeDto) {
    try {
      let version = await Version.findById(base_version_id);
      if (!version) {
        return new ServiceResponse(ResponseStatus.Failed, "Version not found", null, 404);
      }

      // 2️⃣ Chuẩn hoá 1 thay đổi
      const normalizedChange = {
        change_id: change.change_id ?? randomUUID(),
        entity_type: change.entity_type,
        entity_id: change.entity_id ?? null,
        change_type: change.change_type,
        before_snapshot: change.before_snapshot ?? null,
        after_snapshot: change.after_snapshot ?? null,
        add_at: new Date(),
      };

      // 3️⃣ Tìm preview đang under_review (THÊM ĐIỀU KIỆN status)
      let preview = await Preview.findOne({
        base_version_id: base_version_id,
        status: "under_review" // QUAN TRỌNG: chỉ tìm preview đang trong trạng thái review
      });

      if (preview) {
        // ✅ Preview đã tồn tại → append thay đổi mới
        preview.changes.push(normalizedChange);
        await preview.save();

        return new ServiceResponse(ResponseStatus.Success, "Preview updated successfully", preview, 200);
      }

      const project = await Project.findById(version.project_id).lean();
      if (!project) {
        return new ServiceResponse(ResponseStatus.Failed, "Project not found", null, 404);
      }

      // 4️⃣ Lấy danh sách approvers từ project (chỉ owner và editor)
      // FIX: Kiểm tra cấu trúc dữ liệu members thực tế
      // Trong hàm createOrUpdatePreview, sửa filter thành:
      const approvers = (project.members ?? [])
        .filter((m: any) => {
          const hasValidRole = ["owner", "editor"].includes(m.role);
          const hasUserId = m.user_id && m.user_id.toString();
          const isAccepted = m.status === "accepted"; // ← QUAN TRỌNG: chỉ lấy member đã accepted
          return hasValidRole && hasUserId && isAccepted;
        })
        .map((m: any) => ({
          user_id: m.user_id,
          role: m.role === "editor" ? "member" : m.role, // ← Map "editor" thành "member"
          status: "pending",
          comment: null,
          approved_at: null,
        }));

      // DEBUG: Log để kiểm tra
      console.log(`Project members: ${project.members?.length || 0}`);
      console.log(`Approvers found: ${approvers.length}`);

      // 5️⃣ Nếu chưa có preview → tạo mới
      preview = new Preview({
        project_id: version.project_id,
        base_version_id: base_version_id,
        target_version_id: version._id,
        created_by: created_by,
        changes: [normalizedChange],
        approvers: approvers, // gắn danh sách approvers
        status: "under_review",
        created_at: new Date(),
      });

      await preview.save();

      return new ServiceResponse(ResponseStatus.Success, "Preview created successfully", { preview, versionId: version._id.toString() }, 200);
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
      return new ServiceResponse(ResponseStatus.Success, "Preview retrieved", preview ?? null, 200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * Approve preview (OWNER ONLY)
   * - If minor → finalize temporary version
   * - If major → finalize temporary version and bump major (+1.0)
   */
  public async approve(baseVersionId: string, userId: string, changeType: "major" | "minor", comment?: string) {
    try {
      // ✅ Lấy baseVersion (bây giờ chính là version tạm)
      const baseVersion = await Version.findById(baseVersionId);
      if (!baseVersion) {
        return new ServiceResponse(ResponseStatus.Failed, "Base version not found", null, 404);
      }

      const preview = await Preview.findOne({ base_version_id: baseVersionId });
      if (!preview) {
        return new ServiceResponse(ResponseStatus.Failed, "Preview not found", null, 404);
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
        return new ServiceResponse(ResponseStatus.Failed, "Only project owner can approve this preview", null, 403);
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
      }

      // ✅ Chuyển version tạm thành version chính thức
      baseVersion.version_temporary = false;

      // ✅ Xóa preview sau khi approve thành công
      await Preview.deleteOne({ base_version_id: baseVersionId });

      // ✅ Emit event
      versionSocketService.emitVersionCreated(
        baseVersion.project_id.toString(),
        userId,
        baseVersionId,
        baseVersion
      );

      await baseVersion.save();

      // ✅ Kết thúc
      return new ServiceResponse(
        ResponseStatus.Success,
        "Owner approved and version finalized. Preview has been deleted.",
        { version: baseVersion },
        200
      );
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * Nâng version từ 1 preview (đã được duyệt)
   * BaseVersion => NewVersion (copy toàn bộ data)
   */
  public async bumpVersion(baseVersionId: string, userId: string, changeType: "major" | "minor"): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1️⃣ Lấy base version
      const baseVersion = await Version.findById(baseVersionId).session(session);
      if (!baseVersion) {
        await session.abortTransaction();
        return new ServiceResponse(ResponseStatus.Failed, "Base version not found", null, 404);
      }

      // 2️⃣ Tính version mới
      const { major, minor } = await this.getNextVersion(baseVersion, changeType);

      // 3️⃣ Tạo version mới
      const newVersion = new Version({
        project_id: baseVersion.project_id,
        version_major: major,
        version_minor: minor,
        created_by: new Types.ObjectId(userId),
        parent_version_id: baseVersion._id,
        version_temporary: true,
        stage: "completed",
        status: "completed",
        progress: 100,
        requirement_model: JSON.parse(JSON.stringify(baseVersion.requirement_model || [])),
        pending_conflicts: JSON.parse(JSON.stringify(baseVersion.pending_conflicts || [])),
        processing_errors: JSON.parse(JSON.stringify(baseVersion.processing_errors || [])),
        affects_requirement: baseVersion.affects_requirement || false,
      });

      await newVersion.save({ session });

      // ✅ 4️⃣ Maps
      const inputMap = new Map<string, string>();
      const dbMap = new Map<string, string>();
      const tcMap = new Map<string, string>();
      const umlMap = new Map<string, string>();

      const usecaseUMLmap = new Map<string, string>();
      const activityUMLmap = new Map<string, string>();
      const sequenceUMLmap = new Map<string, string>();

      const inputIds: Types.ObjectId[] = [];
      const outputIds: Types.ObjectId[] = [];

      // ✅ 5️⃣ Clone Inputs → NHỚ LƯU MAP
      const baseInputs = await Input.find({ version_id: baseVersion._id }).lean();
      for (const inp of baseInputs) {
        const newId = new Types.ObjectId();
        inputMap.set(inp._id.toString(), newId.toString());

        await Input.create([{
          ...inp,
          _id: newId,
          version_id: newVersion._id,
          created_at: new Date(),
          updated_at: new Date()
        }], { session });

        inputIds.push(newId);
      }

      // ✅ 6️⃣ Clone Databases → map
      const baseDatabases = await Database.find({ version_id: baseVersion._id }).lean();
      for (const db of baseDatabases) {
        const newId = new Types.ObjectId();
        dbMap.set(db._id.toString(), newId.toString());

        await Database.create([{
          ...db,
          _id: newId,
          version_id: newVersion._id,
          created_at: new Date(),
          updated_at: new Date()
        }], { session });
      }

      // ✅ 7️⃣ Clone Testcases → map
      const baseTestcases = await Testcase.find({ version_id: baseVersion._id }).lean();
      for (const tc of baseTestcases) {
        const newId = new Types.ObjectId();
        tcMap.set(tc._id.toString(), newId.toString());

        await Testcase.create([{
          ...tc,
          _id: newId,
          version_id: newVersion._id,
          created_at: new Date(),
          updated_at: new Date()
        }], { session });
      }

      // ✅ 8️⃣ Clone UML → map
      const baseUmls = await Uml.find({ version_id: baseVersion._id }).lean();
      for (const uml of baseUmls) {
        const newId = new Types.ObjectId();
        umlMap.set(uml._id.toString(), newId.toString());

        await Uml.create([{
          ...uml,
          _id: newId,
          version_id: newVersion._id,
          created_at: new Date(),
          updated_at: new Date()
        }], { session });
      }

      // ✅ 9️⃣ Clone diagrams theo từng loại + tạo MAP riêng
      const cloneDiagram = async (Model: any, targetMap: Map<string, string>) => {
        const baseItems = await Model.find({ uml_id: { $in: Array.from(umlMap.keys()) } }).lean();
        for (const item of baseItems) {
          const newId = new Types.ObjectId();
          targetMap.set(item._id.toString(), newId.toString());

          await Model.create([{
            ...item,
            _id: newId,
            uml_id: new Types.ObjectId(umlMap.get(item.uml_id.toString())),
            created_at: new Date(),
            updated_at: new Date()
          }], { session });
        }
      };

      await cloneDiagram(UsecaseDiagram, usecaseUMLmap);
      await cloneDiagram(ActivityDiagram, activityUMLmap);
      await cloneDiagram(SequenceDiagram, sequenceUMLmap);

      // ✅ 10️⃣ Clone Outputs với map
      const baseOutputs = await Output.find({ version_id: baseVersion._id }).lean();
      for (const out of baseOutputs) {
        const newOutId = new Types.ObjectId();

        const copy: any = {
          ...out,
          _id: newOutId,
          version_id: newVersion._id,
          created_at: new Date(),
          updated_at: new Date()
        };

        if (out.type === "database") copy.database_id = new Types.ObjectId(dbMap.get(out.database_id.toString()));
        if (out.type === "testcase") copy.testcase_id = new Types.ObjectId(tcMap.get(out.testcase_id.toString()));
        if (out.type === "uml") copy.uml_id = new Types.ObjectId(umlMap.get(out.uml_id.toString()));

        await Output.create([copy], { session });
        outputIds.push(newOutId);
      }

      // ✅ 11️⃣ Update version
      newVersion.inputs = inputIds;
      newVersion.outputs = outputIds;
      await newVersion.save({ session });

      // ✅ 12️⃣ Project update current_version
      await Project.findByIdAndUpdate(baseVersion.project_id, { current_version: newVersion._id }, { session });

      await session.commitTransaction();

      return new ServiceResponse(ResponseStatus.Success, "New version created with cloned entities", { newVersion, idMaps: { inputMap, dbMap, tcMap, umlMap, usecaseUMLmap, activityUMLmap, sequenceUMLmap } }, 201);
    } catch (e: any) {
      await session.abortTransaction();
      return new ServiceResponse(ResponseStatus.Failed, e.message, null, 500);
    } finally {
      session.endSession();
    }
  }


  async setCurrentVersion(projectId: string, versionId: string, userId: string): Promise<ServiceResponse<any>> {
    try {
      // 🔍 Kiểm tra version có tồn tại trong project hay không
      const version = await Version.findOne({ _id: versionId, project_id: projectId });
      if (!version) {
        return new ServiceResponse(ResponseStatus.Failed, "Version not found in this project", null, 404);
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
      return new ServiceResponse(ResponseStatus.Success, "Current version updated successfully", project, 200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * Lấy version tiếp theo (major/minor)
   */
  private async getNextVersion(baseVersion: any, type: "major" | "minor" = "minor") {
    if (!baseVersion) throw new Error("Invalid base version");

    if (type === "major") {
      const nextMajor = baseVersion.version_major + 1;
      return { major: nextMajor, minor: 0 };
    }

    const nextMinor = baseVersion.version_minor + 1;
    return { major: baseVersion.version_major, minor: nextMinor };
  }

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
      await Output.deleteMany({ version_id: versionId });
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

      const entityType = change.entity_type;
      const changeType = change.change_type;
      const entityId = change.entity_id;
      const before = change.before_snapshot;
      const after = change.after_snapshot;

      console.log(`\n=== [REVERT] Entity: ${entityType}, ChangeType: ${changeType}, EntityID: ${entityId} ===`);

      // Logic revert giống như trong for-loop của bạn
      if (entityType === 'input') {
        if (changeType === 'added') {
          if (entityId) {
            await Input.deleteOne({ _id: entityId, version_id: baseVersion._id }).session(session);
            await Version.updateOne({ _id: baseVersion._id }, { $pull: { inputs: new Types.ObjectId(entityId) } }, { session });
          }
        } else if (changeType === 'deleted' && before) {
          const newId = new Types.ObjectId();
          const toInsert = {
            ...before,
            _id: newId,
            version_id: baseVersion._id,
            created_at: new Date(),
            updated_at: new Date()
          };
          await Input.create([toInsert], { session });
          await Version.updateOne({ _id: baseVersion._id }, { $addToSet: { inputs: newId } }, { session });
        } else if (changeType === 'updated' && before) {
          await Input.updateOne({ _id: entityId, version_id: baseVersion._id }, { $set: before }).session(session);
        }
      } else if (entityType === 'database') {
        if (changeType === 'added') {
          console.log(`[Database][Added] Deleting Database + related Outputs`);
          if (entityId) {
            await Database.deleteOne({ _id: entityId, version_id: baseVersion._id }).session(session);
            await Output.deleteMany({ database_id: entityId, version_id: baseVersion._id }).session(session);
            await Version.updateOne({ _id: baseVersion._id }, { $pull: { outputs: new Types.ObjectId(entityId) } }, { session });
          }
        } else if (changeType === 'updated') {
          console.log(`[Database][Updated] Reverting Database: ${entityId}`);
          if (entityId && before) {
            await Database.updateOne({ _id: entityId, version_id: baseVersion._id }, { $set: before }).session(session);
          }
        } else if (changeType === 'deleted') {
          console.log(`[Database][Deleted] Restoring Database and linked Output`);
          if (before) {
            const toInsert = {
              ...before,
              _id: new Types.ObjectId(),
              version_id: baseVersion._id,
              created_at: new Date(),
              updated_at: new Date(),
            };
            await Database.create([toInsert], { session });
            await Output.create([{
              project_id: baseVersion.project_id,
              version_id: baseVersion._id,
              type: 'database',
              database_id: toInsert._id,
              generated_by: new Types.ObjectId(userId),
              status: 'completed',
              created_at: new Date(),
              updated_at: new Date()
            }], { session });
          }
        }
      } else if (entityType === "table") {
        const db = await Database.findOne({
          _id: entityId,
          version_id: baseVersion._id,
        }).session(session);
        // 1️⃣ TABLE ADDED → Rollback = xóa table đã thêm
        if (changeType === "added") {
          console.log(`[Table][Added] Removing newly added table: ${after?.name}`);

          if (after?.name) {
            await Database.updateOne(
              { _id: db._id, version_id: baseVersion._id },
              { $pull: { tables: { name: after.name } } }
            ).session(session);
          }
        }

        // 2️⃣ TABLE UPDATED → Rollback = khôi phục bảng trước khi update
        else if (changeType === "updated") {
          console.log(`[Table][Updated] Restoring table state: ${before?.name}`);

          if (before?.name) {
            await Database.updateOne(
              {
                _id: db._id,
                version_id: baseVersion._id,
                "tables.name": before.name,
              },
              { $set: { "tables.$": before } }
            ).session(session);
          }
        }

        // 3️⃣ TABLE DELETED → Rollback = chèn lại bảng đã bị xóa
        else if (changeType === "deleted") {
          console.log(`[Table][Deleted] Re-inserting deleted table: ${before?.name}`);

          if (before) {
            await Database.updateOne(
              { _id: db._id, version_id: baseVersion._id },
              { $push: { tables: before } }
            ).session(session);
          }
        }
      }
      else if (entityType === 'testcase') {
        if (changeType === 'added') {
          console.log(`[Testcase][Added] Deleting Testcase + related Outputs`);
          if (entityId) {
            await Testcase.deleteOne({ _id: entityId, version_id: baseVersion._id }).session(session);
            await Output.deleteMany({ testcase_id: entityId, version_id: baseVersion._id }).session(session);
          }
        } else if (changeType === 'updated') {
          console.log(`[Testcase][Updated] Reverting Testcase: ${entityId}`);
          if (entityId && before) {
            await Testcase.updateOne({ _id: entityId, version_id: baseVersion._id }, { $set: before }).session(session);
          }
        } else if (changeType === 'deleted') {
          console.log(`[Testcase][Deleted] Restoring Testcase and Output`);
          if (before) {
            const toInsert = {
              ...before,
              _id: new Types.ObjectId(),
              version_id: baseVersion._id,
              created_at: new Date(),
              updated_at: new Date(),
            };
            await Testcase.create([toInsert], { session });
            await Output.create([{
              project_id: baseVersion.project_id,
              version_id: baseVersion._id,
              type: 'testcase',
              testcase_id: toInsert._id,
              generated_by: new Types.ObjectId(userId),
              status: 'completed',
              created_at: new Date(),
              updated_at: new Date()
            }], { session });
          }
        }
      } else if (entityType === 'uml') {
        if (changeType === 'added') {
          console.log(`[UML][Added] Deleting UML + related diagrams + outputs`);
          if (entityId) {
            await Uml.deleteOne({ _id: entityId, version_id: baseVersion._id }).session(session);
            await Output.deleteMany({ uml_id: entityId, version_id: baseVersion._id }).session(session);
            await UsecaseDiagram.deleteMany({ uml_id: entityId }).session(session);
            await ActivityDiagram.deleteMany({ uml_id: entityId }).session(session);
            await SequenceDiagram.deleteMany({ uml_id: entityId }).session(session);
          }
        } else if (changeType === 'updated') {
          console.log(`[UML][Updated] Reverting UML: ${entityId}`);
          if (entityId && before) {
            await Uml.updateOne({ _id: entityId, version_id: baseVersion._id }, { $set: before }).session(session);
          }
        } else if (changeType === 'deleted') {
          console.log(`[UML][Deleted] Restoring UML and Output`);
          if (before) {
            const toInsert = {
              ...before,
              _id: new Types.ObjectId(),
              version_id: baseVersion._id,
              created_at: new Date(),
              updated_at: new Date(),
            };
            await Uml.create([toInsert], { session });
            await Output.create([{
              project_id: baseVersion.project_id,
              version_id: baseVersion._id,
              type: 'uml',
              uml_id: toInsert._id,
              generated_by: new Types.ObjectId(userId),
              status: 'completed',
              created_at: new Date(),
              updated_at: new Date()
            }], { session });
          }
        }
      } else if (entityType === 'usecase_diagram') {
        if (changeType === 'added') {
          console.log(`[UsecaseDiagram][Added] Deleting diagram`);
          if (entityId) await UsecaseDiagram.deleteOne({ _id: entityId }).session(session);
        } else if (changeType === 'updated') {
          console.log(`[UsecaseDiagram][Updated] Reverting diagram`);
          if (entityId && before) await UsecaseDiagram.updateOne({ _id: entityId }, { $set: before }).session(session);
        } else if (changeType === 'deleted') {
          console.log(`[UsecaseDiagram][Deleted] Restoring diagram`);
          if (before) {
            const toInsert = { ...before, _id: new Types.ObjectId(), created_at: new Date(), updated_at: new Date() };
            await UsecaseDiagram.create([toInsert], { session });
          }
        }
      } else if (entityType === 'activity_diagram') {
        if (changeType === 'added') {
          console.log(`[ActivityDiagram][Added] Deleting diagram`);
          if (entityId) await ActivityDiagram.deleteOne({ _id: entityId }).session(session);
        } else if (changeType === 'updated') {
          console.log(`[ActivityDiagram][Updated] Reverting diagram`);
          if (entityId && before) await ActivityDiagram.updateOne({ _id: entityId }, { $set: before }).session(session);
        } else if (changeType === 'deleted') {
          console.log(`[ActivityDiagram][Deleted] Restoring diagram`);
          if (before) {
            const toInsert = { ...before, _id: new Types.ObjectId(), created_at: new Date(), updated_at: new Date() };
            await ActivityDiagram.create([toInsert], { session });
          }
        }
      } else if (entityType === 'sequence_diagram') {
        if (changeType === 'added') {
          console.log(`[SequenceDiagram][Added] Deleting diagram`);
          if (entityId) await SequenceDiagram.deleteOne({ _id: entityId }).session(session);
        } else if (changeType === 'updated') {
          console.log(`[SequenceDiagram][Updated] Reverting diagram`);
          if (entityId && before) await SequenceDiagram.updateOne({ _id: entityId }, { $set: before }).session(session);
        } else if (changeType === 'deleted') {
          console.log(`[SequenceDiagram][Deleted] Restoring diagram`);
          if (before) {
            const toInsert = { ...before, _id: new Types.ObjectId(), created_at: new Date(), updated_at: new Date() };
            await SequenceDiagram.create([toInsert], { session });
          }
        }
      } else if (entityType === 'output') {
        if (changeType === 'added') {
          console.log(`[Output][Added] Deleting Output`);
          if (entityId) await Output.deleteOne({ _id: entityId, version_id: baseVersion._id }).session(session);
        } else if (changeType === 'updated') {
          console.log(`[Output][Updated] Reverting Output`);
          if (entityId && before) await Output.updateOne({ _id: entityId, version_id: baseVersion._id }, { $set: before }).session(session);
        } else if (changeType === 'deleted') {
          console.log(`[Output][Deleted] Restoring Output`);
          if (before) {
            const toInsert = { ...before, _id: new Types.ObjectId(), version_id: baseVersion._id, created_at: new Date(), updated_at: new Date() };
            await Output.create([toInsert], { session });
          }
        }
      } else if (entityType === 'requirement') {
        if (changeType === 'added') {
          const reqs = baseVersion.requirement_model?.toObject?.() || baseVersion.requirement_model || [];
          const oldId = before.id;
          const oldIndex = parseInt(oldId.replace(/^UC/, "")) - 1;
          reqs.splice(oldIndex, 0, before);
          const normalized = reqs.map((uc: any, index: number) => ({
            ...uc,
            id: `UC${index + 1}`
          }));
          const idMap = new Map<string, string>();
          for (let i = 0; i < reqs.length; i++) {
            const oldId = reqs[i].id;
            const newId = normalized[i].id;
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
          baseVersion.set("requirement_model", synced);
          baseVersion.updated_at = new Date();
          baseVersion.affects_requirement = true;
        } else if (changeType === 'updated') {
          console.log(`[Requirement][Updated] Reverting requirement`);
          if (entityId && before) {
            const reqs = baseVersion.requirement_model?.toObject?.() || baseVersion.requirement_model || [];
            baseVersion.requirement_model = reqs.map((r) => (r.id === entityId ? before : r));
          }
        } else if (changeType === 'deleted') {
          console.log(`[Requirement][Deleted] Restoring deleted requirement`);
          if (before) {
            baseVersion.requirement_model.push(before);
          }
        }
      }
      preview.changes.pull({ change_id: changeId });
      await preview.save({ session });
      await baseVersion.save({ session });
      await session.commitTransaction();

      console.log(`✔ Successfully reverted change ${change._id || entityId}`);
      return new ServiceResponse(ResponseStatus.Success, "New version created with cloned entities", null, 201);
    } catch (error) {
      await session.abortTransaction();
      console.error(`❌ Failed to revert change:`, error);
      throw error;
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
        return new ServiceResponse(ResponseStatus.Failed, "Parent version not found", null, 404);
      }
      // 🔍 2. Tìm preview gắn với version này
      const preview = await Preview.findOne({ target_version_id: versionId });
      if (!preview) {
        return new ServiceResponse(ResponseStatus.Failed, "Preview not found", null, 404);
      }
      // 🔍 3. Tìm approver của user này
      const approver = preview.approvers.find(a => a.user_id.toString() === userId);
      if (!approver) {
        return new ServiceResponse(ResponseStatus.Failed, "You are not an approver of this preview", null, 403);
      }
      // 4️⃣ Đánh dấu user này rollback
      approver.status = "rollback";
      approver.approved_at = new Date();
      await preview.save();
      // 5️⃣ Kiểm tra TẤT CẢ đã rollback chưa?
      const allRollback = preview.approvers.every(a => a.status === "rollback");
      if (!allRollback) {
        // Một số người rollback → chờ người khác
        return new ServiceResponse(ResponseStatus.Success, "Rollback submitted, waiting for other approvers", { preview_status: "partial_rollback" }, 200);
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
      await Output.deleteMany({ version_id: versionId });
      await Preview.deleteOne({ base_version_id: versionId });
      await Version.deleteOne({ _id: versionId });
      // Xoá version con
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
      return new ServiceResponse(ResponseStatus.Success, "Rollback completed by all approvers", null, 200);
    } catch (err) {
      throw err;
    }
  }
}
