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
        // Hàm để tạo độ trễ ngẫu nhiên
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Độ trễ ngẫu nhiên từ 2000ms (2 giây) đến 3000ms (3 giây)
        const randomDelay = Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000;


        // 🟢 Bắt đầu: clear lỗi cũ
        console.log(`[SERVICE] Clearing previous errors for version ${versionId} before running...`);
        await Version.findByIdAndUpdate(versionId, {
            $set: { processing_errors: [], stage: "initializing", progress: 15 }
        });

        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        // 1️⃣ Xử lý input (file + raw text)
        const { newFilesCount, newTextProvided } = await this.inputService.handleInputs(
            opts.files,
            opts.rawText,
            projectId,
            versionId
        );
        await delay(randomDelay); // Chờ độ trễ ngẫu nhiên

        await Version.findByIdAndUpdate(versionId, { $set: { stage: "input", progress: 25 } });

        // 2️⃣ Nếu incremental mà không có gì mới → return luôn (trừ khi retry)
        if (opts.mode === "incremental" && newFilesCount === 0 && !newTextProvided) {
            const isRetry = (!opts.files || opts.files.length === 0) && !opts.rawText;
            if (!isRetry) {
                return this.inputService.returnIncremental(versionId);
            }
        }

        // 3️⃣ Lấy inputs cần xử lý
        let inputs: any[] = [];
        const targetIds = await this.inputService.getNewlyCreatedInputs(versionId);

        if (opts.mode === "full") {
            inputs = await Input.find({
                version_id: versionId,
                processing_status: "completed"
            }).lean();
        } else {
            if (targetIds.length > 0) {
                // Có input mới -> chờ xử lý
                inputs = await this.util.waitForInputsCompletionByIds(targetIds);
            } else {
                // Retry -> lấy tất cả input đã hoàn tất
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



        await delay(randomDelay); // Chờ độ trễ ngẫu nhiên


        // 4️⃣ Phân tích requirement
        await Version.findByIdAndUpdate(versionId, { $set: { stage: "analyzing", progress: 40 } });

        await delay(randomDelay); // Chờ độ trễ ngẫu nhiên

        await Version.findByIdAndUpdate(versionId, { $set: { stage: "normalization", progress: 70 } });



        await delay(randomDelay); // Chờ độ trễ ngẫu nhiên

        // 5️⃣ Finalizing
        await Version.findByIdAndUpdate(versionId, { $set: { stage: "finalizing", progress: 90 } });

        const result = await this.requirementService.finalize(
            versionId,
            opts.mode || "full",
            inputs,
            this.gemini,
            language
        );



        // 6️⃣ Hoàn tất
        await Version.findByIdAndUpdate(versionId, {
            $set: { stage: "completed", progress: 100 }
        });

        return result;
    }


    async resolveDuplicate(versionId: string, conflictId: string, keep: "old" | "new") {
        return this.requirementService.resolveDuplicate(versionId, conflictId, keep);
    }
}