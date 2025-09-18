import { NextFunction, Response } from "express";
import { HttpRequest } from "../../../types"; // Giả định đường dẫn
import { ProjectManagementService } from "../domain/service";
import { UploadedFile } from "express-fileupload";

export class ProjectController {
    private projectService = new ProjectManagementService();

    create = async (req: HttpRequest, res: Response, next: NextFunction) => {
        console.log("[CONTROLLER] Bắt đầu xử lý trong ProjectController.create...");
        try {
            const { name, description, rawText } = req.body;
            const ownerId = req.getSubject();

            // DEBUG: Ghi log tất cả các thông tin đầu vào
            console.log(`[CONTROLLER]   - Dữ liệu nhận được:`);
            console.log(`[CONTROLLER]     - name: ${name}`);
            console.log(`[CONTROLLER]     - description: ${description}`);
            console.log(`[CONTROLLER]     - ownerId (từ token): ${ownerId}`);
            
            let files: UploadedFile[] = [];
            if (req.files && req.files.files) {
                files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
            }
            console.log(`[CONTROLLER]     - Số lượng file đính kèm: ${files.length}`);

            if (!name || !description) {
                console.error("[CONTROLLER] Lỗi: Thiếu name hoặc description.");
                return res.status(400).json({ message: "Project name and description are required." });
            }

            console.log("[CONTROLLER] Dữ liệu đầu vào hợp lệ. Đang gọi ProjectManagementService...");
            const newProject = await this.projectService.createProject(
                name,
                description,
                ownerId,
                files,
                rawText
            );

            console.log(`[CONTROLLER] Service đã thực thi thành công. Project ID: ${newProject._id}`);
            res.status(201).json(newProject);

        } catch (error: any) {
            console.error(`[CONTROLLER] Xảy ra lỗi! Bắt lỗi và chuyển cho middleware xử lý.`);
            
            // DEBUG: Xử lý lỗi Mongoose Validation một cách tường minh
            // Nếu lỗi là do validation, trả về 400 (Bad Request) thay vì 500
            if (error.name === 'ValidationError') {
                // Lấy thông điệp lỗi đầu tiên cho người dùng
                const firstErrorMessage = Object.values(error.errors).map((e: any) => e.message)[0];
                return res.status(400).json({
                    message: "Dữ liệu không hợp lệ.",
                    error: firstErrorMessage,
                    details: error.errors
                });
            }

            // Đối với các lỗi khác, chuyển tiếp để trả về lỗi 500
            next(error);
        }
    }
}