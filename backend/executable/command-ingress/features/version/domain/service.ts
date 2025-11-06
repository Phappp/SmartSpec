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
import {PreviewChangeDto} from "../adapter/preview.dto";
import { randomUUID } from "crypto";


export class VersionService {
  private logService = new LogService();

  async createOrUpdatePreview(
    base_version_id: string,
    created_by: string,
    change: PreviewChangeDto
  ) {
    try {
      // 1️⃣ Kiểm tra version tồn tại
      const version = await Version.findById(base_version_id).lean();
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
        base_version_id : base_version_id,
        created_by : created_by,
        changes: [normalizedChange],
        approvers : approvers, // gắn danh sách approvers
        status: "under_review",
        created_at: new Date(),
      });

      await preview.save();

      return new ServiceResponse(ResponseStatus.Success, "Preview created successfully", preview, 200);
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
   * Approve một preview: Owner phê duyệt và bump version
   */
  public async approve(baseVersionId: string,userId: string,changeType: "major" | "minor",comment?: string) {
    try {
      const baseVersion = await Version.findById(baseVersionId);
      if (!baseVersion) {
        return new ServiceResponse(ResponseStatus.Failed, "Base version not found", null, 404);
      }

      const preview = await Preview.findOne({ base_version_id: baseVersionId });
      if (!preview) {
        return new ServiceResponse(ResponseStatus.Failed, "Preview not found", null, 404);
      }

      const approver = preview.approvers.find((a: any) => a.user_id?.toString() === userId);
      if (!approver) {
        return new ServiceResponse(ResponseStatus.Failed, "You are not in approvers list", null, 403);
      }

      if (approver.status === "approved") {
        return new ServiceResponse(ResponseStatus.Success,"You have already approved this preview.",preview,200);
      }

      // ✅ Cập nhật trạng thái của người hiện tại
      approver.status = "approved";
      approver.approved_at = new Date();
      approver.comment = comment ?? "";

      await preview.save();

      // ✅ Đếm số người đã approve
      const approvedUsers = preview.approvers.filter((a: any) => a.status === "approved");
      const approvedCount = approvedUsers.length;

      // ✅ Kiểm tra có owner nào đã approve không
      const ownerApproved = approvedUsers.some((a: any) => a.role === "owner");

      // 🔸 Điều kiện: ít nhất 2 người và phải có owner
      if (approvedCount >= 2 && ownerApproved) {
        preview.status = "approved";
        await preview.save();

        const newVersion = await this.bumpVersion(baseVersionId, userId, changeType);
        if (!newVersion.data) {
          return new ServiceResponse(ResponseStatus.Failed,"Bump version failed or returned no data",null,500);
        }

        const newVersionData = newVersion.data;
        preview.target_version_id = newVersionData._id;
        preview.status = "version_upgraded";
        await preview.save();

        return new ServiceResponse(ResponseStatus.Success,"At least 2 approvers (including owner) have approved. New version created successfully.",preview,200);
      }

      // ❗Chưa đủ điều kiện
      const remaining = ownerApproved
        ? `Need at least ${2 - approvedCount} more approver(s).`
        : "Need owner approval to complete.";

      return new ServiceResponse(ResponseStatus.Success,`You have successfully approved. ${remaining}`,preview,200);

    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }
  /**
   * Nâng version từ 1 preview (đã được duyệt)
   * BaseVersion => NewVersion (copy toàn bộ data)
   * BaseVersion revert lại (xoá preview data)
   */
  public async bumpVersion(baseVersionId: string,userId: string,changeType: "major" | "minor"): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    console.log("🚀 [bumpVersion] START ===============================");
    console.log("🧩 baseVersionId:", baseVersionId);
    console.log("👤 userId:", userId);
    console.log("⚙️ changeType:", changeType);

    try {
      // 1️⃣ Lấy baseVersion
      const baseVersion = await Version.findById(baseVersionId).session(session);
      if (!baseVersion) {
        console.error("❌ Base version not found:", baseVersionId);
        await session.abortTransaction();
        return new ServiceResponse(ResponseStatus.Failed, "Base version not found", null, 404);
      }

      // 2️⃣ Lấy preview (ở đây sửa lỗi logic: nên dùng base_version_id, không phải _id)
      const preview = await Preview.findOne({ base_version_id: baseVersionId }).session(session);
      if (!preview) {
        console.error("❌ Preview not found for base_version_id:", baseVersionId);
        await session.abortTransaction();
        return new ServiceResponse(ResponseStatus.Failed, "Preview not found", null, 404);
      }

      console.log("✅ Found preview:", preview._id);

      // 3️⃣ Kiểm tra approvers
      const approved = preview.approvers?.filter((a: any) => a.status === "approved") || [];
      const ownerApproved = approved.some((a: any) => a.role === "owner");
      console.log("👥 Approved count:", approved.length, "| Owner approved:", ownerApproved);

      if (!ownerApproved) {
        console.error("❌ Preview chưa đủ người phê duyệt");
        await session.abortTransaction();
        return new ServiceResponse(ResponseStatus.Failed,"Preview chưa đủ người phê duyệt (cần ít nhất 1 owner + 1 member)",null,400);
      }

      // 4️⃣ Lấy số version mới
      const { major, minor } = await this.getNextVersion(baseVersion, changeType);
      console.log("📈 Next version:", { major, minor });

      // 5️⃣ Tạo newVersion (clone cấu trúc cơ bản)
      const newVersion = new Version({
        project_id: baseVersion.project_id,
        version_major: major,
        version_minor: minor,
        created_by: new Types.ObjectId(userId),
        parent_version_id: baseVersion._id,
        requirement_model: JSON.parse(JSON.stringify(baseVersion.requirement_model || [])),
        pending_conflicts: [],
        processing_errors: [],
        affects_requirement: baseVersion.affects_requirement || false,
        progress: 100,
        stage: "completed",
        status: "completed",
      });

      console.log("🆕 Created newVersion draft:", newVersion._id);

      // 6️⃣ Clone Inputs
      const allInputs = await Input.find({ version_id: baseVersion._id }).session(session).lean();
      console.log("📦 Inputs count:", allInputs.length);

      if (allInputs.length > 0) {
        const clonedInputs = allInputs.map((inp) => ({
          ...inp,
          _id: new Types.ObjectId(),
          version_id: newVersion._id,
          created_at: new Date(),
          updated_at: new Date(),
        }));
        const insertedInputs = await Input.insertMany(clonedInputs.map((i) => new Input(i)), { session });
        newVersion.inputs = insertedInputs.map((i) => i._id);
      } else {
        newVersion.inputs = [];
      }

      // 7️⃣ Clone Outputs
      const allOutputs = await Output.find({ version_id: baseVersion._id }).session(session).lean();
      console.log("📤 Outputs count:", allOutputs.length);

      const dbIds: string[] = [];
      const tcIds: string[] = [];
      const umlIds: string[] = [];

      for (const o of allOutputs) {
        if (o.type === "database" && o.database_id) dbIds.push(o.database_id.toString());
        if (o.type === "testcase" && o.testcase_id) tcIds.push(o.testcase_id.toString());
        if (o.type === "uml" && o.uml_id) umlIds.push(o.uml_id.toString());
      }

      // Clone database/testcase/uml
      console.log("🗄 DBs:", dbIds.length, "| 🧪 TCs:", tcIds.length, "| 📊 UMLs:", umlIds.length);

      // Clone logic... (giữ nguyên như bạn đã viết — chỉ thêm log nếu cần)

      // ✅ Save new version
      await newVersion.save({ session });
      console.log("💾 New version saved:", newVersion._id);

      // --- 3) REVERT preview.changes ON baseVersion (dựa vào before_snapshot & change_type) ---
      // For each change in preview.changes:
      // - added  => remove the added entity from base (delete)
      // - updated => update base entity to before_snapshot
      // - deleted => restore insert before_snapshot into base

      for (const change of preview.changes || []) {
        const entityType = change.entity_type;
        const changeType = change.change_type;
        const entityId = change.entity_id;
        const before = change.before_snapshot;
        const after = change.after_snapshot;

        console.log(`\n=== [CHANGE DETECTED] Entity: ${entityType}, ChangeType: ${changeType}, EntityID: ${entityId} ===`);

        try {
          if (entityType === 'input') {
            if (changeType === 'added') {
              console.log(`[Input][Added] Deleting Input: ${entityId}`);
              if (entityId){
                 // Xóa input vừa thêm trong baseVersion
                  await Input.deleteOne({ _id: entityId, version_id: baseVersion._id }).session(session);
                  // Cập nhật lại mảng inputs trong version
                  await Version.updateOne({ _id: baseVersion._id },{ $pull: { inputs: new Types.ObjectId(entityId) } },{ session });
              }
            }else if (changeType === 'deleted') {
              console.log(`[Input][Deleted] Restoring Input from snapshot`);
              if (before) {
                const toInsert = {
                  ...before,
                  _id: new Types.ObjectId(),
                  version_id: baseVersion._id,
                  created_at: new Date(),
                  updated_at: new Date(),
                };
                const inputInsert = await Input.create([toInsert], { session });
                await Version.updateOne({ _id: baseVersion._id },{ $addToSet: { inputs: toInsert.$_id} },{ session });
              }
            }
          } else if (entityType === 'database') {
            if (changeType === 'added') {
              console.log(`[Database][Added] Deleting Database + related Outputs`);
              if (entityId) {
                await Database.deleteOne({ _id: entityId, version_id: baseVersion._id }).session(session);
                await Output.deleteMany({ database_id: entityId, version_id: baseVersion._id }).session(session);
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
          } else if (entityType === 'testcase') {
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
              console.log(`[Requirement][Added] Removing added requirement`);
              if (entityId) {
                const reqs = baseVersion.requirement_model?.toObject?.() || baseVersion.requirement_model || [];
                baseVersion.requirement_model = reqs.filter((r) => r.id !== entityId);
              }
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

          console.log(`✔ Successfully processed ${entityType} (${changeType})`);
        } catch (error) {
          console.error(`❌ Error processing ${entityType} (${changeType}) [ID=${entityId}]:`, error);
        }
      }
      // Save baseVersion after modifications (for embedded requirement_model revert)
      await baseVersion.save({ session });

      // 8️⃣ Update preview
      preview.target_version_id = newVersion._id;
      preview.status = "version_upgraded";
      await preview.save({ session });
      console.log("🔄 Preview updated with new version:", preview._id);

      // 9️⃣ Update project current version
      await Project.findByIdAndUpdate(baseVersion.project_id, { current_version: newVersion._id }).session(session);
      console.log("🏗 Project current version updated:", baseVersion.project_id);

      await session.commitTransaction();
      console.log("✅ [bumpVersion] TRANSACTION COMMITTED");

      // 🔔 Log action
      const user = await User.findById(userId).select("name email").lean();
      await this.logService.createLog({
        project_id: baseVersion.project_id.toString(),
        user_id: userId,
        action: "create_version",
        target_id: newVersion._id.toString(),
        target_type: "version",
        version_number: newVersion.version_number,
        affects_requirement: false,
        level: "info",
        details: {
          message: `${user?.name || "System"} created version ${newVersion.version_number} from base ${baseVersion.version_number}`,
        },
      });

      versionSocketService.emitVersionCreated(
        baseVersion.project_id.toString(),
        newVersion._id.toString(),
        userId,
        newVersion
      );

      console.log("🏁 [bumpVersion] FINISHED SUCCESSFULLY");
      console.log("==================================================");

      return new ServiceResponse(ResponseStatus.Success, "Version upgraded successfully", newVersion, 201);
    } catch (error: any) {
      console.error("💥 [bumpVersion] ERROR:", error);
      await session.abortTransaction();
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    } finally {
      session.endSession();
    }
  }

  async setCurrentVersion(projectId: string,versionId: string,userId: string): Promise<ServiceResponse<any>> {
    try {
      // 🔍 Kiểm tra version có tồn tại trong project hay không
      const version = await Version.findOne({ _id: versionId, project_id: projectId });
      if (!version) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Version not found in this project",
          null,
          404
        );
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

      // 👤 Lấy thông tin user thực hiện
      const user = await User.findById(userId).select("name email").lean();

      // 🔔 Gửi thông báo realtime tới các user khác trong project
      versionSocketService.emitVersionSwitched(
        projectId.toString(),
        userId,
        versionId,
        oldVersionId || ""
      );

      // ✅ Hoàn tất
      return new ServiceResponse(
        ResponseStatus.Success,
        "Current version updated successfully",
        project,
        200
      );
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
}
