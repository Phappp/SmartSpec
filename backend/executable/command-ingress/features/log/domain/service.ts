import { Types } from "mongoose";
import { Parser as Json2CsvParser } from "json2csv";
import PDFDocument from "pdfkit";
import LogModel from "../../../../../internal/model/log";
import { CreateLogDTO } from "../adapter/dto";
import { ServiceResponse, ResponseStatus } from "../../../services/serviceResponse";
import ProjectModel from "../../../../../internal/model/project";
import UserModel from "../../../../../internal/model/user";
import { logSocketService } from "./log.socket.service";

export class LogService {
  async createLog(dto: CreateLogDTO) {
    try {
      console.log("🟢 [createLog] DTO:", dto);

      const docData: any = {
        action: dto.action,
        target_type: dto.target_type,
        details: dto.details,
        version_number: dto.version_number,
        affects_requirement: dto.affects_requirement,
        level: dto.level || "info",
        ip: dto.ip || null,
        user_agent: dto.user_agent || null,
        created_at: new Date(),
      };

      // ✅ Chỉ convert sang ObjectId nếu có giá trị
      if (dto.user_id) docData.user_id = new Types.ObjectId(dto.user_id);
      if (dto.target_id) docData.target_id = new Types.ObjectId(dto.target_id);
      if (dto.project_id) docData.project_id = new Types.ObjectId(dto.project_id);

      console.log("🟡 [createLog] Final docData:", docData);

      const doc = await LogModel.create(docData);
      console.log("✅ [createLog] Created log:", doc._id);

      // 🔔 Emit socket event cho project & user
      if (dto.project_id) {
        logSocketService.emitLogCreated(
          String(dto.project_id),
          String(dto.user_id),
          doc
        );
      } else {
        // ✅ Emit cho toàn hệ thống nếu không thuộc project cụ thể
        logSocketService.emitGlobalLog(doc);
      }

      // 🚨 Gửi cảnh báo bảo mật nếu là lỗi đăng nhập
      if (["failed_login"].includes(dto.action)) {
        console.warn("🚨 [Security Alert Triggered]", dto.action, dto.target_type);
        this.sendSecurityAlert(doc);
      }

      return new ServiceResponse(ResponseStatus.Success, "Log created", doc, 201);
    } catch (err: any) {
      console.error("❌ [createLog] Error:", err);
      return new ServiceResponse(ResponseStatus.Failed, err.message, null, 500);
    }
  }

  async queryLogs(filters: any = {}, options: { page?: number; limit?: number; sort?: any } = {}) {
    try {
      console.log("🟢 [queryLogs] filters:", filters);
      console.log("🟢 [queryLogs] options:", options);

      const result = await this._query(filters, options);
      console.log(`✅ [queryLogs] Got ${result.total} logs`);

      return new ServiceResponse(ResponseStatus.Success, "Fetched logs", result, 200);
    } catch (err: any) {
      console.error("❌ [queryLogs] Error:", err);
      return new ServiceResponse(ResponseStatus.Failed, err.message, null, 500);
    }
  }

  async exportLogs(filters: any = {}, format: "csv" | "json" | "pdf" = "csv", res?: any) {
    try {
      console.log("🟡 [exportLogs] Input filters:", filters, "format:", format);
      const mongoFilters: any = { ...filters };
      delete mongoFilters.format;
      const { items } = await this._query(mongoFilters, { page: 1, limit: 100000 });
      if (!items.length) {
        return new ServiceResponse(ResponseStatus.Success, "No logs found to export", "", 204);
      }
      const cleanItems = items.map((log: any) => {
        const obj = {
          created_at: log.created_at,
          project_id: log.project_id ? String(log.project_id) : "",
          user_id: log.user_id ? String(log.user_id) : "",
          action: log.action,
          target_type: log.target_type,
          target_id: log.target_id ? String(log.target_id) : "",
          level: log.level,
          ip: log.ip ?? "",
          user_agent: log.user_agent ?? "",
          performed_by_ai: log.performed_by_ai ?? false,
        };
        Object.keys(obj).forEach((key) => {
          if (obj[key] === "" || obj[key] === null || obj[key] === undefined) delete obj[key];
        });
        return obj;
      });
      if (format === "json") {
        const result = JSON.stringify(cleanItems, null, 2);
        return new ServiceResponse(ResponseStatus.Success, "Export successful", result, 200);
      }
      if (format === "csv") {
        const dynamicFields = Array.from(
          new Set(cleanItems.flatMap((item) => Object.keys(item)))
        );
        const json2csv = new Json2CsvParser({ fields: dynamicFields });
        const result = json2csv.parse(cleanItems);
        return new ServiceResponse(ResponseStatus.Success, "Export successful", result, 200);
      }

      const truncateText = (doc: InstanceType<typeof PDFDocument>, text: string, maxWidth: number): string => {
        let t = String(text ?? "");
        while (doc.widthOfString(t) > maxWidth && t.length > 0) {
          t = t.slice(0, -1);
        }
        if (t !== String(text ?? "")) t += "...";
        return t;
      };
      if (format === "pdf") {
        if (!res) throw new Error("Response object is required for PDF export");

        const doc = new PDFDocument({ margin: 40, size: "A4" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="logs_${Date.now()}.pdf"`
        );
        doc.pipe(res);
        doc.fontSize(20).font("Helvetica-Bold").text("System Logs Report", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(10).font("Helvetica-Oblique").text(
          `Generated at: ${new Date().toLocaleString()}`,
          { align: "center" }
        );
        doc.moveDown(1.5);
        const startX = 40;
        const colWidths = [30, 120, 50, 50, 160, 80];
        const headers = ["#", "Date", "Action", "Level", "User", "Target"];
        let y = doc.y;

        const drawLine = (yPos: number) => {
          doc.moveTo(startX, yPos)
            .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), yPos)
            .strokeColor("#ccc")
            .stroke();
        };
        doc.fontSize(11).font("Helvetica-Bold");
        headers.forEach((header, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.text(header, x + 2, y, { width: colWidths[i] - 4, align: "left" });
        });
        y += 16;
        drawLine(y);
        y += 6;
        doc.fontSize(9).font("Helvetica");
        cleanItems.forEach((log: any, index: number) => {
          if (y > 750) {
            doc.addPage();
            y = 50;
          }
          const row = [
            index + 1,
            new Date(log.created_at).toLocaleString(),
            log.action || "",
            log.level || "",
            log.user_id || "",
            log.target_type || "",
          ];
          let rowHeight = 0;
          row.forEach((text, i) => {
            const displayText =
              headers[i] === "Action" || headers[i] === "User"
                ? truncateText(doc, text, colWidths[i] - 4)
                : String(text ?? "");
            const textHeight = doc.heightOfString(displayText, {
              width: colWidths[i] - 4,
              align: "left",
            });
            rowHeight = Math.max(rowHeight, textHeight);
          });
          row.forEach((text, i) => {
            const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            const displayText =
              headers[i] === "Action" || headers[i] === "User"
                ? truncateText(doc, text, colWidths[i] - 4)
                : String(text ?? "");
            doc.text(displayText, x + 2, y, {
              width: colWidths[i] - 4,
              align: "left",
            });
          });

          y += rowHeight + 4;
          const details: string[] = [];
          if (log.ip) details.push(`IP: ${log.ip}`);
          if (log.user_agent) details.push(`Agent: ${log.user_agent}`);
          if (log.performed_by_ai) details.push(`AI: true`);

          if (details.length) {
            const detailsText = details.join(" | ");
            const detailsHeight = doc.heightOfString(detailsText, { width: colWidths.reduce((a, b) => a + b, 0) - 40 });
            doc.font("Helvetica-Oblique").fontSize(8)
              .text(detailsText, startX + 2, y, { width: colWidths.reduce((a, b) => a + b, 0) - 4 });
            doc.font("Helvetica").fontSize(9);
            y += detailsHeight + 4;
          }

          drawLine(y);
          y += 2;
        });

        doc.end();
        console.log("✅ [exportLogs] PDF table aligned, truncated Action/User columns, full width");
        return new ServiceResponse(ResponseStatus.Success, "PDF generated", null, 200);
      }
      return new ServiceResponse(ResponseStatus.Failed, "Invalid export format", null, 400);
    } catch (err: any) {
      console.error("❌ [exportLogs] Error:", err);
      return new ServiceResponse(ResponseStatus.Failed, err.message, null, 500);
    }
  }

  // cảnh báo
  private sendSecurityAlert(log: any) {
    console.warn(`🚨 [Security Alert] User ${log.user_id} performed ${log.action} on ${log.target_type}`);
  }

  // Lọc các log về hoạt động người dùng
  async getUserActivityLogs(userId: string, projectId?: string) {
    console.log("🟡 [getUserActivityLogs] Params:", { userId, projectId });
    const user = await UserModel.findById(userId);
    if (!user)
      return new ServiceResponse(ResponseStatus.Failed, "User not found", null, 404);

    const isAdmin = user.system_role === "ADMIN";
    const filter: any = {};
    if (isAdmin) {
      filter.target_type = "system";
    } else {
      filter.user_id = new Types.ObjectId(userId);
    }

    if (projectId) {
      const project = await ProjectModel.findById(projectId);
      if (!project)
        return new ServiceResponse(ResponseStatus.Failed, "Project not found", null, 404);

      if (!isAdmin) {
        const isMember = project.members.some(
          (m) => m.user_id.equals(userId) && m.status === "accepted"
        );
        if (!isMember)
          return new ServiceResponse(ResponseStatus.Failed, "User is not a project member", null, 403);
      }

      filter.project_id = new Types.ObjectId(projectId);
    } else if (!isAdmin) {
      filter.action = { $in: ["login", "logout", "failed_login"] };
    }

    console.log("🟢 [getUserActivityLogs] Final filter:", filter);
    return this.queryLogs(filter);
  }
  // Lọc các log liên quan đến dự án
  async getProjectLogs(userId: string, projectId: string, target_type?: string) {
    console.log("🟡 [getProjectLogs] Params:", { userId, projectId, target_type });
    const project = await ProjectModel.findById(projectId);
    if (!project)
      return new ServiceResponse(ResponseStatus.Failed, "Project not found", null, 404);
    const member = project.members.find(
      (m) => m.user_id.equals(userId) && m.status === "accepted"
    );

    if (!member)
      return new ServiceResponse(ResponseStatus.Failed, "User is not a project member", null, 403);
    const role = member.role?.toLowerCase(); // "viewer" | "editor" | "owner"
    console.log(`🟢 [getProjectLogs] User role in project: ${role}`);
    const filter: any = { project_id: new Types.ObjectId(projectId) };
    if (target_type) {
      filter.target_type = target_type;
    }
    if (role === "viewer") {
      filter.action = {
        $in: [
          "create_project", "update_project",
          "generate_output",
          "generate_data",
          "export_data",
          "create_version", "update_version", "rollback"
        ],
      };
    } else if (role === "editor") {
      filter.action = {
        $in: [
          "create_project", "update_project",
          "create_input", "update_input", "delete_input",
          "generate_output", "update_output", "delete_output",
          "create_version", "update_version", "rollback",
          "invite_member", "accept_invite", "reject_invite", "leave_project",
          "generate_data", "update_data", "delete_data", "resolve_conflict",
        ],
      };
    } else if (role === "owner") {
      // Chủ dự án xem được tất cả log của project (không giới hạn action của project)
    } else {
      return new ServiceResponse(ResponseStatus.Failed, "Invalid member role", null, 400);
    }
    console.log("🟢 [getProjectLogs] Final filter:", JSON.stringify(filter, null, 2));
    return this.queryLogs(filter);
  }

  async getOutputLogs(userId: string, targetType: string, projectId?: string) {
    console.log("🟡 [getLogs] Params:", { userId, targetType, projectId });
    const allowedTargets = ["databases", "testcases", "activity_diagrams", "usecase_diagrams", "sequence_diagrams"];
    if (!allowedTargets.includes(targetType)) {
      return new ServiceResponse(ResponseStatus.Failed, "Invalid target_type", null, 400);
    }
    const filter: any = { target_type: targetType };
    if (projectId) {
      const isMember = await ProjectModel.exists({
        _id: projectId,
        members: { $elemMatch: { user_id: new Types.ObjectId(userId), status: "accepted" } },
      });
      if (!isMember) {
        return new ServiceResponse(ResponseStatus.Failed, "User is not a project member", null, 403);
      }
      filter.project_id = new Types.ObjectId(projectId);
    }

    const actions = ["generate_output", "update_output", "delete_output", "export_data"];
    filter.action = { $in: actions };

    console.log("🟢 [getLogs] Final filter:", filter);

    const logs = await LogModel.find(filter).populate("user_id", "name email");
    return new ServiceResponse(ResponseStatus.Success, `${targetType} logs retrieved`, logs, 200);
  }

  async getSystemLogs(userId: string, level?: string) {
    console.log("🟡 [getSystemLogs] Params:", { userId, level });
    const user = await UserModel.findById(userId).lean();
    if (!user)
      return new ServiceResponse(ResponseStatus.Failed, "User not found", null, 404);

    if (user.system_role !== "ADMIN")
      return new ServiceResponse(ResponseStatus.Failed, "Access denied: Admin only", null, 403);
    const systemActions = [
      "create_user", "failed_login", "login", "logout", "update_user",
      "performance", "deploy", "startup"
    ];
    const filter: any = {
      $or: [
        { target_type: "system" },
        { action: { $in: systemActions } },
      ],
    };
    if (level) filter.level = level;
    console.log("🟢 [getSystemLogs] Final filter:", filter);
    const result = await this._query(filter, { sort: { created_at: -1 }, limit: 500 });
    console.log(`✅ [getSystemLogs] Retrieved ${result.total} system logs`);

    return new ServiceResponse(ResponseStatus.Success, "Fetched system & user system logs successfully", result, 200);
  }
  // Hàm lọc chính
  private async _query(filters: any, options: any) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? Math.min(1000, options.limit) : 50;
    const skip = (page - 1) * limit;
    console.log("🟡 [LogService._query] RAW filters:", filters);
    const mongoFilter: any = { ...filters };
    if (filters.project_id) mongoFilter.project_id = new Types.ObjectId(filters.project_id);
    if (filters.user_id) mongoFilter.user_id = new Types.ObjectId(filters.user_id);
    if (filters.target_id) mongoFilter.target_id = new Types.ObjectId(filters.target_id);
    if (filters.at) {
      const atStr = String(filters.at);
      const date = atStr.length === 10 ? new Date(`${atStr}T00:00:00.000Z`) : new Date(atStr);
      const nextDay = new Date(date);
      nextDay.setUTCDate(date.getUTCDate() + 1);
      mongoFilter.created_at = {
        $gte: date,
        $lt: nextDay,
      };
      delete mongoFilter.at;
      console.log("🟢 [UTC Filter - at]", mongoFilter.created_at);
    } else if (filters.from || filters.to) {
      mongoFilter.created_at = {};
      if (filters.from) {
        const fromStr = String(filters.from);
        const fromDate = fromStr.length === 10
          ? new Date(`${fromStr}T00:00:00.000Z`)
          : new Date(fromStr);
        mongoFilter.created_at.$gte = fromDate;
      }
      if (filters.to) {
        const toStr = String(filters.to);
        const toDate = toStr.length === 10
          ? new Date(`${toStr}T23:59:59.999Z`)
          : new Date(toStr);
        mongoFilter.created_at.$lte = toDate;
      }
      delete mongoFilter.from;
      delete mongoFilter.to;
      console.log("🟢 [UTC Filter - from/to]", mongoFilter.created_at);
    }
    console.log("🔵 [LogService._query] Final mongoFilter:", mongoFilter);
    const sort = options.sort ?? { created_at: -1 };
    const [items, total] = await Promise.all([
      LogModel.find(mongoFilter)
        .populate('user_id', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      LogModel.countDocuments(mongoFilter),
    ]);
    console.log(`✅ [LogService._query] Found ${total} logs`);
    return { items, total, page, limit };
  }
  // ------------------ RETENTION ------------------
  async runLogRetention(days: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      console.log("🟡 [LogRetention] Deleting logs older than:", cutoffDate);

      // Lấy danh sách project có log
      const projectIds = await LogModel.distinct("projectId");

      for (const projectId of projectIds) {
        const result = await LogModel.deleteMany({
          projectId,
          created_at: { $lt: cutoffDate },
        });

        console.log(`✅ [LogRetention] Deleted ${result.deletedCount} logs for project ${projectId}`);

        if (result.deletedCount && result.deletedCount > 0) {
          logSocketService.emitLogsPurged(projectId.toString(), result.deletedCount, cutoffDate);
        }
      }
    } catch (err: any) {
      console.error("❌ [LogRetention] Error:", err);
    }
  }
}
