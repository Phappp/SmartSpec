import { UploadedFile } from "express-fileupload";
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

    async run(
        projectId: string,
        versionId: string,
        opts: { files: UploadedFile[]; rawText?: string; mode?: "full" | "incremental" },
        language: string
    ) {
        // THÊM MỚI: Xóa các lỗi cũ để chuẩn bị cho lần chạy lại (retry).
        // Thao tác này đảm bảo rằng nếu lần chạy lại thành công, người dùng sẽ không thấy lỗi cũ nữa.
        console.log(`[SERVICE] Clearing previous errors for version ${versionId} before running...`);
        await Version.findByIdAndUpdate(versionId, { $set: { processing_errors: [] } });

        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        // 1. Xử lý input (file + raw text)
        const { newFilesCount, newTextProvided } = await this.inputService.handleInputs(
            opts.files,
            opts.rawText,
            projectId,
            versionId
        );

        // 2. Nếu incremental mà không có gì mới → return luôn (áp dụng cho cả retry)
        if (opts.mode === "incremental" && newFilesCount === 0 && !newTextProvided) {
            // Nếu là retry (không có input mới), logic sẽ đi tiếp xuống dưới
            // Nếu là update (có input mới), nhưng input bị trùng -> return sớm
            const isRetry = (!opts.files || opts.files.length === 0) && !opts.rawText;
            if (!isRetry) {
                return this.inputService.returnIncremental(versionId);
            }
        }

        // 3. Lấy inputs cần xử lý
        let inputs: any[] = [];
        // Đối với retry, targetIds sẽ rỗng, logic sẽ fallback xuống nhánh else bên dưới
        const targetIds = await this.inputService.getNewlyCreatedInputs(versionId);

        if (opts.mode === "full") {
            inputs = await Input.find({
                version_id: versionId,
                processing_status: "completed"
            }).lean();
        } else { // Incremental hoặc Retry
            if (targetIds.length > 0) {
                // Có input mới -> chờ xử lý
                inputs = await this.util.waitForInputsCompletionByIds(targetIds);
            } else {
                // Không có input mới (trường hợp retry) -> lấy tất cả input đã hoàn tất nhưng chưa được xử lý trong requirement
                inputs = await Input.find({
                    version_id: versionId,
                    processing_status: "completed",
                }).lean();
            }
        }

        if (!inputs || inputs.length === 0) {
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
        console.log("Language:", language);
        console.log(
            "Inputs to process:",
            inputs.map((i) => ({ id: i._id, status: i.processing_status }))
        );

        // 4. Gọi finalize để phân tích requirement
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