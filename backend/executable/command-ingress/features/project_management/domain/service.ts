import { UploadedFile } from "express-fileupload";
import Project from "../../../../../internal/model/project";
import Version from "../../../../../internal/model/version";
import { OrchestratorService } from "../../orchestrator/domain/service";
import mongoose from "mongoose";

export class ProjectManagementService {
    private orchestratorService = new OrchestratorService();

    async createProject(
        name: string,
        description: string,
        ownerId: string,
        files: UploadedFile[],
        rawText?: string
    ) {
        console.log(`[SERVICE] Bắt đầu createProject cho '${name}' của owner '${ownerId}'`);

        try {
            // --- BƯỚC 1: TẠO PROJECT ---
            const newProjectData = {
                name,
                description,
                owner_id: ownerId,
                members: [{
                    user_id: ownerId,
                    role: 'owner',
                    status: 'accepted',
                    invited_by: ownerId,
                    invited_at: new Date(),
                    responded_at: new Date(),
                    history: [{ action: 'accepted', by: ownerId, at: new Date() }]
                }]
            };
            console.log("[SERVICE]   1a. Chuẩn bị lưu document Project...");
            const newProject = new Project(newProjectData);
            await newProject.save(); // Bỏ { session }
            console.log(`[SERVICE]   1b. Tạo Project thành công. ID: ${newProject._id}`);

            // --- BƯỚC 2: TẠO VERSION ---
            const newVersionData = {
                project_id: newProject._id,
                version_number: 1,
                created_by: ownerId,
            };
            console.log("[SERVICE]   2a. Chuẩn bị lưu document Version...");
            const newVersion = new Version(newVersionData);
            await newVersion.save(); // Bỏ { session }
            console.log(`[SERVICE]   2b. Tạo Version thành công. ID: ${newVersion._id}`);

            // --- BƯỚC 3: CẬP NHẬT PROJECT ---
            console.log(`[SERVICE]   3a. Cập nhật current_version cho Project...`);
            newProject.current_version = newVersion._id;
            await newProject.save(); // Bỏ { session }
            console.log("[SERVICE]   3b. Cập nhật Project thành công.");

            console.log("[SERVICE] Kích hoạt OrchestratorService chạy nền...");
            this.orchestratorService.run(
                newProject._id.toString(),
                newVersion._id.toString(),
                { files, rawText, mode: "full" }
            ).catch(err => {
                console.error(`[SERVICE] Lỗi xử lý nền cho version ${newVersion._id}:`, err);
            });

            console.log("[SERVICE] Hoàn tất createProject, trả về kết quả.");
            return newProject;

        } catch (error: any) {
            console.error("[SERVICE] GẶP LỖI!", error);
            // (Xử lý lỗi chi tiết như phiên bản trước)
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map((e: any) => ({
                    field: e.path, message: e.message, value_provided: e.value
                }));
                console.error("================ LỖI VALIDATION MONGOOSE ================\n", JSON.stringify(validationErrors, null, 2));
            }
            throw error; // Ném lỗi để controller xử lý
        }
    }
}