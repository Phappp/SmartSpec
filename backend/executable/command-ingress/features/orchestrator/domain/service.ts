import { UploadedFile } from "express-fileupload";
import Project from "../../../../../internal/model/project";
import Version from "../../../../../internal/model/version";
import Input from "../../../../../internal/model/input";

import { InputService } from "./InputService";
import { GeminiService } from "./GeminiService";
import { RequirementService } from "./RequirementService";
import { UtilService } from "./UtilService";

export class OrchestratorService {
    private inputService = new InputService();
    private gemini = new GeminiService();
    private requirementService = new RequirementService();
    private util = new UtilService();

    // THAY ĐỔI: Thêm `language` vào chữ ký hàm
    async run(
        projectId: string,
        versionId: string,
        opts: { files: UploadedFile[]; rawText?: string; mode?: "full" | "incremental" },
        language: string
    ) {
        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");
        // Không cần lấy project nữa vì language đã được truyền vào

        // 1. Xử lý input (file + raw text)
        const { newFilesCount, newTextProvided } = await this.inputService.handleInputs(
            opts.files,
            opts.rawText,
            projectId,
            versionId
        );

        // 2. Nếu incremental mà không có gì mới → return luôn
        if (opts.mode === "incremental" && newFilesCount === 0 && !newTextProvided) {
            return this.inputService.returnIncremental(versionId);
        }

        // 3. Lấy inputs cần xử lý
        let inputs: any[] = [];
        const targetIds = await this.inputService.getNewlyCreatedInputs(versionId);

        if (opts.mode === "full") {
            inputs = await Input.find({
                version_id: versionId,
                processing_status: "completed"
            }).lean();
        } else {
            if (targetIds.length > 0) {
                inputs = await this.util.waitForInputsCompletionByIds(targetIds);
            } else {
                inputs = await Input.find({
                    version_id: versionId,
                    processing_status: "completed",
                    is_processed: { $ne: true }
                }).lean();
            }
        }
        if (!inputs || inputs.length === 0) {
            // Sửa lại để không ném lỗi mà trả về model hiện tại
            console.warn("Không có input hợp lệ để xử lý. Trả về trạng thái hiện tại.");
            return {
                version_id: versionId,
                inputs_count: 0,
                requirement_model: version.requirement_model || [],
                mode: opts.mode,
            };
        }

        // Debug log
        console.log("Mode:", opts.mode || "full");
        console.log("Language:", language); // Log ngôn ngữ
        console.log(
            "Inputs to process:",
            inputs.map((i) => ({
                id: i._id,
                processed: i.is_processed,
                status: i.processing_status,
                textLength: (i.cleaned_text || i.raw_text || "").length
            }))
        );

        // 4. Gọi finalize để phân tích requirement
        // THAY ĐỔI: Truyền `language` vào RequirementService
        return this.requirementService.finalize(
            versionId,
            opts.mode || "full",
            inputs,
            this.gemini,
            language
        );
    }

    async resolveDuplicate(versionId: string, conflictId: string, keep: "old" | "new") {
        return this.requirementService.resolveDuplicate(versionId, conflictId, keep);
    }
}