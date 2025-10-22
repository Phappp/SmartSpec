import mongoose from "mongoose";
import Version from "../../../../../internal/model/version";
import User from '../../../../../internal/model/user';
import Input from "../../../../../internal/model/input";
import Output from "../../../../../internal/model/output";
import { LogService } from "../../../../command-ingress/features/log/domain/service";
import { ServiceResponse, ResponseStatus } from "../../../services/serviceResponse";

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

      // 🔢 Sinh số version mới (theo toàn project, tránh trùng)
      const { major, minor } = await this.getNextVersion(baseVersion.project_id, baseVersion, changeType);

      // 📦 Clone version cũ
      const newVersion = new Version({
        project_id: baseVersion.project_id,
        version_major: major,
        version_minor: minor,
        created_by: userId,
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
        updated_at: new Date()
      }));

      const oldOutputs = await Output.find({ version_id: baseVersionId });
      const clonedOutputs = oldOutputs.map(o => ({
        ...o.toObject(),
        _id: new mongoose.Types.ObjectId(),
        version_id: newVersion._id,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await Input.insertMany(clonedInputs);
      await Output.insertMany(clonedOutputs);

      newVersion.inputs = clonedInputs.map(i => i._id);
      newVersion.outputs = clonedOutputs.map(o => o._id);

      await newVersion.save();

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
          message: `${user.name} created a ${changeType} version ${newVersion.version_number} from ${baseVersion.version_number}`
        },
      });

      return new ServiceResponse(ResponseStatus.Success, "Version created successfully", newVersion, 201);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * ⚙️ Tự động tạo version mới khi có thay đổi lớn/nhỏ
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

      // Nếu version đã completed → không chỉnh sửa mà phải bump mới
      if (currentVersion.status === "completed") {
        return this.bumpVersion(versionId, userId, changeLevel);
      }

      // Nếu đang “processing”, chỉ cập nhật minor number
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
          message: `${user.name} auto-bumped version to ${currentVersion.version_number} (${changeLevel} change).`
        },
      });

      return new ServiceResponse(ResponseStatus.Success, "Auto bump version done", currentVersion, 200);
    } catch (error: any) {
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500);
    }
  }

  /**
   * 🧮 Xác định version kế tiếp trong toàn project
   */
 private async getNextVersion(
    projectId: any,
    baseVersion: any,
    type: "major" | "minor"
  ) {
    const allVersions = await Version.find({ project_id: projectId })
      .sort({ version_major: -1, version_minor: -1 });

    const latest = allVersions[0];
    let nextMajor = baseVersion.version_major;
    let nextMinor = baseVersion.version_minor;

    if (!latest) {
      // 🔰 Chưa có version nào trong project
      return type === "major"
        ? { major: 1, minor: 0 }
        : { major: 0, minor: 1 };
    }

    if (type === "major") {
      nextMajor = latest.version_major + 1;
      nextMinor = 0;
    } else {
      // 🔄 Nếu base version cũ hơn version mới nhất
      if (baseVersion.version_major < latest.version_major) {
        nextMajor = latest.version_major;
        nextMinor = latest.version_minor + 1;
      } else {
        nextMinor = latest.version_minor + 1;
      }

      // ⚙️ Nếu minor >= 10 ⇒ tự động tăng major, reset minor
      if (nextMinor >= 10) {
        nextMajor += 1;
        nextMinor = 0;
      }
    }

    return { major: nextMajor, minor: nextMinor };
  }

  /** * 📄 Lấy toàn bộ version của project */ 
  async getVersionsByProject(projectId: string): Promise<ServiceResponse<any>> { 
    try { 
      const versions = await Version
      .find({ project_id: projectId }) 
      .sort({ created_at: -1 }) 
      .select([ "version_major", "version_minor", 
       "version_number", "created_by", "created_at", 
       "updated_at", "stage", "status", ]) 
      .populate("created_by", "name email"); 
      return new ServiceResponse(ResponseStatus.Success, "Versions retrieved", versions, 200); } 
    catch (error: any) { 
      return new ServiceResponse(ResponseStatus.Failed, error.message, null, 500); 
    } 
  }
  /**
   * 🔬 So sánh requirement_model giữa 2 version
   */
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
}
