import mongoose, { Types } from 'mongoose';
import Version from "../../../../../internal/model/version";
import User from '../../../../../internal/model/user';
import Input from "../../../../../internal/model/input";
import Output from "../../../../../internal/model/output";
import Project from "../../../../../internal/model/project";
import { LogService } from "../../../../command-ingress/features/log/domain/service";
import { ServiceResponse, ResponseStatus } from "../../../services/serviceResponse";
import { versionSocketService } from "./version.socket.service";

export class VersionService {
  private logService = new LogService();

  /**
   * 📘 Tạo version mới dựa trên version hiện tại
   */
  async bumpVersion(
    baseVersionId: string,
    userId: string,
    changeType: "major" | "minor" = "minor"
  ): Promise<ServiceResponse<any>> {
    try {
      const baseVersion = await Version.findById(baseVersionId);
      if (!baseVersion)
        return new ServiceResponse(ResponseStatus.Failed, "Base version not found", null, 404);

      // 🔢 Sinh số version mới
      const { major, minor,patch,overwrite} = await this.getNextVersion(baseVersion.project_id, baseVersion, changeType);

      // ⚠️ Nếu version đó đã tồn tại và cần ghi đè
      if (overwrite) {
        const existing = await Version.findOne({
          project_id: baseVersion.project_id,
          version_major: major,
          version_minor: minor,
          version_patch: patch,
        });

        if (existing) {
          const oldVersionSnapshot = JSON.parse(JSON.stringify(existing));
          // 🔄 Xóa dữ liệu Input/Output cũ
          await Input.deleteMany({ version_id: existing._id });
          await Output.deleteMany({ version_id: existing._id });

          // 📦 Clone lại từ baseVersion
          const oldInputs = await Input.find({ version_id: baseVersionId });
          const clonedInputs = oldInputs.map(i => ({
            ...i.toObject(),
            _id: new mongoose.Types.ObjectId(),
            version_id: existing._id,
            created_at: new Date(),
            updated_at: new Date(),
          }));

          const oldOutputs = await Output.find({ version_id: baseVersionId });
          const clonedOutputs = oldOutputs.map(o => ({
            ...o.toObject(),
            _id: new mongoose.Types.ObjectId(),
            version_id: existing._id,
            created_at: new Date(),
            updated_at: new Date(),
          }));

          await Input.insertMany(clonedInputs);
          await Output.insertMany(clonedOutputs);

          // 🧩 Cập nhật dữ liệu version
          existing.requirement_model = JSON.parse(JSON.stringify(baseVersion.requirement_model || []));
          existing.pending_conflicts = JSON.parse(JSON.stringify(baseVersion.pending_conflicts || []));
          existing.processing_errors = JSON.parse(JSON.stringify(baseVersion.processing_errors || []));
          existing.updated_at = new Date();
          existing.created_by = new mongoose.Types.ObjectId(userId);
          existing.stage = "completed";
          existing.status = "completed";
          await existing.save();

          // 🟩 Update current version
          await Project.findByIdAndUpdate(baseVersion.project_id, {
            current_version: existing._id,
          });

          const user = await User.findById(userId).select("name email").lean();
          const userName = user?.name || "System";

          // 🧾 Log hành động
          await this.logService.createLog({
            project_id: baseVersion.project_id.toString(),
            user_id: userId,
            action: "update_version",
            target_id: existing._id.toString(),
            target_type: "version",
            version_number: existing.version_number,
            level: "warning",
            details: {
              before: {
                requirement_count: oldVersionSnapshot.requirement_model?.length || 0,
                pending_conflicts: oldVersionSnapshot.pending_conflicts || [],
              },
              after: {
                requirement_count: baseVersion.requirement_model?.length || 0,
                pending_conflicts: baseVersion.pending_conflicts || [],
              },
              message: `${userName} overwrote version ${existing.version_number} with new data from ${baseVersion.version_number}`,
            },
          });

          // 🔔 Emit realtime
          versionSocketService.emitVersionUpdated(
            baseVersion.project_id.toString(),
            existing._id.toString(),
            userId,
            existing
          );

          return new ServiceResponse(ResponseStatus.Success, "Existing version overwritten", existing, 200);
        }
      }
      // 📦 Clone version cũ
      const newVersion = new Version({
        project_id: baseVersion.project_id,
        version_major: major,
        version_minor: minor,
        version_patch:patch,
        created_by: userId,
        parent_version_id: baseVersionId,
        requirement_model: JSON.parse(JSON.stringify(baseVersion.requirement_model || [])),
        pending_conflicts: JSON.parse(JSON.stringify(baseVersion.pending_conflicts || [])),
        processing_errors: JSON.parse(JSON.stringify(baseVersion.processing_errors || [])),
        affects_requirement: baseVersion.affects_requirement || false,
        progress: baseVersion.progress || 0,
        stage: "completed",
        status: "completed",
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 🔁 Clone Input và Output
      const oldInputs = await Input.find({ version_id: baseVersionId });
      const clonedInputs = oldInputs.map(i => ({
        ...i.toObject(),
        _id: new mongoose.Types.ObjectId(),
        version_id: newVersion._id,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const oldOutputs = await Output.find({ version_id: baseVersionId });
      const clonedOutputs = oldOutputs.map(o => ({
        ...o.toObject(),
        _id: new mongoose.Types.ObjectId(),
        version_id: newVersion._id,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await Input.insertMany(clonedInputs);
      await Output.insertMany(clonedOutputs);

      newVersion.inputs = clonedInputs.map(i => i._id);
      newVersion.outputs = clonedOutputs.map(o => o._id);

      await newVersion.save();

      // 🟩 Cập nhật current version trong Project
      await Project.findByIdAndUpdate(baseVersion.project_id, {
        current_version: newVersion._id,
      });

      const user = await User.findById(userId).select("name email").lean();
      const userName = user?.name || "System";

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
          message: `${userName} created a ${changeType} version ${newVersion.version_number} from ${baseVersion.version_number}`,
        },
      });

      // 🔔 Gửi realtime thông báo đến các client khác trong project
      versionSocketService.emitVersionCreated(
        baseVersion.project_id.toString(),
        newVersion._id.toString(),
        userId,
        newVersion
      );

      return new ServiceResponse(ResponseStatus.Success, "Version created successfully", newVersion, 201);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * ⚙️ Đổi current version của Project (người khác thấy ngay)
   */
  async setCurrentVersion(
    projectId: string,
    versionId: string,
    userId: string
  ): Promise<ServiceResponse<any>> {
    try {
      const version = await Version.findOne({ _id: versionId, project_id: projectId });
      if (!version)
        return new ServiceResponse(ResponseStatus.Failed, "Version not found in this project", null, 404);
      const project = await Project.findById(projectId);
      if (!project) {
        return new ServiceResponse(ResponseStatus.Failed, "Project not found", null, 404);
      }

      const oldVersionId = project.current_version?.toString();

      // 👉 Cập nhật current version mới
      project.current_version = new mongoose.Types.ObjectId(versionId);

      await project.save();

      const user = await User.findById(userId).select("name email").lean();

      // 🔔 Gửi realtime đến các user khác đang ở cùng project
      versionSocketService.emitVersionSwitched(
        projectId.toString(),
        userId,
        versionId,
        oldVersionId || ""
      );

      return new ServiceResponse(ResponseStatus.Success, "Current version updated", project, 200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * ⚙️ Tự động tạo version mới khi có thay đổi
   */
  async autoBumpVersionOnChange(
    versionId: string,
    userId: string,
    changeLevel: "major" | "minor"
  ): Promise<ServiceResponse<any>> {
    try {
      const currentVersion = await Version.findById(versionId);
      if (!currentVersion)
        return new ServiceResponse(ResponseStatus.Failed, "Version not found", null, 404);

      if (currentVersion.status === "completed") {
        return this.bumpVersion(versionId, userId, changeLevel);
      }

      const { major, minor } = await this.getNextVersion(currentVersion.project_id, currentVersion, changeLevel);
      currentVersion.version_major = major;
      currentVersion.version_minor = minor;
      currentVersion.updated_at = new Date();
      await currentVersion.save();

      const user = await User.findById(userId).select("name email").lean();

      await this.logService.createLog({
        project_id: currentVersion.project_id.toString(),
        user_id: userId,
        action: "update_version",
        target_id: currentVersion._id.toString(),
        target_type: "version",
        version_number: currentVersion.version_number,
        level: "info",
        details: {
          message: `${user.name} auto-bumped version to ${currentVersion.version_number} (${changeLevel} change).`,
        },
      });

      // 🔔 Realtime update khi có thay đổi
      

      return new ServiceResponse(ResponseStatus.Success, "Auto bump version done", currentVersion, 200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

 /** 🧮 Xác định version kế tiếp */
  private async getNextVersion(
    projectId: any,
    baseVersion: any,
    type: "major" | "minor"
  ) {
    if (
      !baseVersion ||
      typeof baseVersion.version_major !== "number" ||
      typeof baseVersion.version_minor !== "number"
    ) {
      throw new Error("Invalid baseVersion");
    }

    // 1️⃣ Nếu là major → tăng major, reset minor & patch
    if (type === "major") {
      return {
        major: baseVersion.version_major + 1,
        minor: 0,
        patch: "",
        overwrite: false,
      };
    }

    // 2️⃣ Nếu baseVersion là patch (vd 1.2.b) → lên minor kế tiếp cùng patch letter
    if (baseVersion.version_patch) {
      const nextMinor = baseVersion.version_minor + 1;

      const existing = await Version.findOne({
        project_id: projectId,
        version_major: baseVersion.version_major,
        version_minor: nextMinor,
        version_patch: baseVersion.version_patch,
      }).lean();

      return {
        major: baseVersion.version_major,
        minor: nextMinor,
        patch: baseVersion.version_patch,
        overwrite: !!existing, // nếu bản đó đã tồn tại → ghi đè
      };
    }

    // 3️⃣ BaseVersion chưa có patch (vd 1.2)
    const targetMinor = baseVersion.version_minor + 1;

    // Kiểm tra xem minor tiếp theo (vd 1.3) đã tồn tại chưa
    const existingMinor = await Version.findOne({
      project_id: projectId,
      version_major: baseVersion.version_major,
      version_minor: targetMinor,
    }).lean();

    // Nếu chưa có → tạo mới
    if (!existingMinor) {
      return {
        major: baseVersion.version_major,
        minor: targetMinor,
        patch: "",
        overwrite: false,
      };
    }

    // 4️⃣ Nếu bản 1.3 đã tồn tại → xử lý patch
    const sameBranch = await Version.find({
      project_id: projectId,
      version_major: existingMinor.version_major,
      version_minor: existingMinor.version_minor,
    }).sort({ version_patch: 1 });

    const patched = sameBranch.filter(
      (v) => typeof v.version_patch === "string" && v.version_patch.length > 0
    );

    if (patched.length === 0) {
      // chưa có patch nào → biến bản hiện tại thành "a", tạo bản kế là "b"
      try {
        const doc = await Version.findById(existingMinor._id);
        if (doc && !doc.version_patch) {
          doc.version_patch = "a";
          await doc.save();
          await this.propagatePatch(projectId, doc, "a");
        }
      } catch (err) {
        console.error("Failed to convert existing minor to 'a':", err);
      }

      // patch kế tiếp là "b"
      const existingB = await Version.findOne({
        project_id: projectId,
        version_major: existingMinor.version_major,
        version_minor: existingMinor.version_minor,
        version_patch: "b",
      }).lean();

      return {
        major: existingMinor.version_major,
        minor: existingMinor.version_minor,
        patch: "b",
        overwrite: !!existingB,
      };
    }

    // 5️⃣ Nếu đã có patch rồi → tăng chữ cái tiếp theo
    const lastPatch = patched[patched.length - 1].version_patch;
    const nextChar = String.fromCharCode(lastPatch.charCodeAt(0) + 1);

    const already = await Version.findOne({
      project_id: projectId,
      version_major: existingMinor.version_major,
      version_minor: existingMinor.version_minor,
      version_patch: nextChar,
    }).lean();

    return {
      major: existingMinor.version_major,
      minor: existingMinor.version_minor,
      patch: nextChar,
      overwrite: !!already, // nếu tồn tại patch đó thì ghi đè
    };
  }

  /** 🔁 Lan truyền patch xuống các version con */
  private async propagatePatch(
    projectId: any,
    parentVersion: any,
    patchLetter: string
  ) {
    // tìm tất cả version có major giống cha, minor > cha
    const descendants = await Version.find({
      project_id: projectId,
      version_major: parentVersion.version_major,
      version_minor: { $gt: parentVersion.version_minor },
    });

    for (const v of descendants) {
      // chỉ patch nếu bản đó chưa có patch (để tránh đè)
      if (!v.version_patch) {
        v.version_patch = patchLetter;
        await v.save();
      }
    }
  }
  
  /** 📄 Lấy toàn bộ version của project */
  async getVersionsByProject(projectId: string): Promise<ServiceResponse<any>> {
    try {
      const versions = await Version.find({ project_id: projectId })
        .sort({ created_at: -1 })
        .select([
          "version_major",
          "version_minor",
          "version_number",
          "version_patch",
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

  /** 🔬 So sánh requirement_model */
  private diffRequirementModels(modelA: any[], modelB: any[]) {
    const added = modelB.filter(b => !modelA.some(a => a.id === b.id));
    const removed = modelA.filter(a => !modelB.some(b => b.id === a.id));
    const modified = modelA
      .filter(a => modelB.some(b => b.id === a.id))
      .map(a => {
        const b = modelB.find(x => x.id === a.id);
        const changes: Record<string, { old: any; new: any }> = {};
        for (const key of Object.keys(a)) {
          if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
            changes[key] = { old: a[key], new: b[key] };
          }
        }
        return { id: a.id, name: a.name, changes };
      })
      .filter(x => Object.keys(x.changes).length > 0);

    return { added, removed, modified };
  }

  /** 🗑️ Xóa version và các version con của nó */
  async deleteVersion(versionId: string, userId: string): Promise<ServiceResponse<any>> {
    try {
      const targetVersion = await Version.findById(versionId);
      if (!targetVersion)
        return new ServiceResponse(ResponseStatus.Failed, "Version not found", null, 404);

      const projectId = targetVersion.project_id;

      // 🧬 Đệ quy lấy toàn bộ version con (cháu, chắt...)
      const allVersionIdsToDelete: string[] = [];
      const collectChildren = async (parentId: any) => {
        const children = await Version.find({ parent_version_id: parentId });
        for (const child of children) {
          allVersionIdsToDelete.push(child._id.toString());
          await collectChildren(child._id); // đệ quy
        }
      };
      await collectChildren(versionId);

      // Thêm bản gốc vào danh sách xóa
      allVersionIdsToDelete.push(versionId);

      // 🧹 Xóa Input & Output liên quan
      await Input.deleteMany({ version_id: { $in: allVersionIdsToDelete } });
      await Output.deleteMany({ version_id: { $in: allVersionIdsToDelete } });

      // 🗑️ Xóa các version
      await Version.deleteMany({ _id: { $in: allVersionIdsToDelete } });

      // 🔁 Nếu current_version của project nằm trong số đó → cập nhật lại
      const project = await Project.findById(projectId);
      if (project && project.current_version && allVersionIdsToDelete.includes(project.current_version.toString())) {
        const latestVersion = await Version.findOne({ project_id: projectId })
          .sort({ created_at: -1 });
        project.current_version = latestVersion ? latestVersion._id : null;
        await project.save();
      }

      // 🧾 Ghi log
      const user = await User.findById(userId).select("name email").lean();
      await this.logService.createLog({
        project_id: projectId.toString(),
        user_id: userId,
        action: "delete_version",
        target_id: versionId,
        target_type: "version",
        version_number: targetVersion.version_number,
        level: "warning",
        details: {
          message: `${user?.name || "System"} deleted version ${targetVersion.version_number} and its descendants.`,
        },
      });

      // 🔔 Realtime thông báo
      versionSocketService.emitVersionDeleted(
        projectId.toString(),
        versionId,
        userId
      );

      return new ServiceResponse(ResponseStatus.Success, "Version and its descendants deleted", {
        deleted_versions: allVersionIdsToDelete.length,
      }, 200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

}
