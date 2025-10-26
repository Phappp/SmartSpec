import { UploadedFile } from "express-fileupload";
import Version from "../../../../../internal/model/version";
import Input from "../../../../../internal/model/input";

import { InputService } from "./InputService";
import { GeminiService } from "./GeminiService";
import { RequirementService } from "./RequirementService";
import { UtilService } from "./UtilService";
import { VersionService } from "../../../features/version/domain/service";

export class OrchestratorService {
    private inputService = new InputService();
    private gemini = new GeminiService();
    private requirementService = new RequirementService();
    private util = new UtilService();
    private versionService = new VersionService();

    async run(
        projectId: string,
        versionId: string,
        opts: { files: UploadedFile[]; rawText?: string; mode?: "full" | "incremental" },
        language: string,
        userId: string
    ) {
        // Hàm để tạo độ trễ ngẫu nhiên
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Độ trễ ngẫu nhiên từ 2000ms (2 giây) đến 3000ms (3 giây)
        const randomDelay = Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000;
        let versiontmp = await Version.findById(versionId).lean();
        if (!versiontmp) throw new Error("Version not found");

        console.log(`[SERVICE] Clearing previous errors for version ${versionId} before running...`);

        // 🧠 CHỈ bump version nếu version hiện tại ĐÃ HOÀN TẤT
        if (versiontmp.stage === "completed") {
            console.log(`[SERVICE] Current version ${versiontmp.version_number} is completed → bumping new version...`);
            const bumpResult = await this.versionService.bumpVersion(
                versionId,
                userId,
                "minor"
            );

            if (!bumpResult.data) {
                throw new Error("Failed to bump version: " + bumpResult.message);
            }

            const newVersion = bumpResult.data;
            versionId = newVersion._id.toString();

            console.log(`[SERVICE] ✅ Bumped new version: ${newVersion.version_number}`);
        } else {
            console.log(`⏩ Skip bump version — current version (${versiontmp.version_number}) not completed.`);
        }

        await Version.findByIdAndUpdate(versionId, {
            $set: {
                status: "processing", // QUAN TRỌNG: Set status thành processing
                processing_errors: [],
                stage: "initializing",
                progress: 15,
                is_processing: true // Nếu có field này
            }
        });

        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        // 🧠 AUTO SWITCH MODE
        if (opts.mode === "full") {
            const hasUnprocessed = await Input.exists({
                version_id: versionId,
                is_processed: { $ne: true }
            });

            if (hasUnprocessed) {
                console.log("⚙️ Detected unprocessed inputs → forcing incremental mode");
                opts.mode = "incremental";
            }
        }

        // 1️⃣ Xử lý input (file + raw text)
        const { newFilesCount, newTextProvided } = await this.inputService.handleInputs(
            opts.files,
            opts.rawText,
            projectId,
            versionId
        );
        await delay(randomDelay);

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
                // Có input mới -> chỉ lấy những input mới
                inputs = await this.util.waitForInputsCompletionByIds(targetIds);
            } else {
                // Retry hoặc incremental không có input mới
                // ❗ Chỉ lấy input chưa được processed
                inputs = await Input.find({
                    version_id: versionId,
                    processing_status: "completed",
                    is_processed: { $ne: true }
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
        console.log(`[RUN MODE] Final mode resolved: ${opts.mode}`);
        console.log("Language:", language);
        console.log(
            "Inputs to process:",
            inputs.map((i) => ({ id: i._id, status: i.processing_status, is_processed: i.is_processed }))
        );

        await delay(randomDelay);

        // 4️⃣ Phân tích requirement
        await Version.findByIdAndUpdate(versionId, { $set: { stage: "analyzing", progress: 40 } });
        await delay(randomDelay);

        await Version.findByIdAndUpdate(versionId, { $set: { stage: "normalization", progress: 70 } });
        await delay(randomDelay);

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


    // async resolveDuplicate(versionId: string, conflictId: string, keep: "old" | "new") {
    //     return this.requirementService.resolveDuplicate(versionId, conflictId, keep);
    // }

    /**
     * HÀM MỚI: Cung cấp tính năng tìm xung đột.
     */
    async findConflicts(versionId: string, language: string) {
        return this.requirementService.findConflicts(versionId, this.gemini, language);
    }

    /**
     * HÀM MỚI: Cung cấp tính năng giải quyết xung đột.
     */
    async resolveConflict(versionId: string, conflictId: string, keepUseCaseId: string) {
        return this.requirementService.resolveConflict(versionId, conflictId, keepUseCaseId);
    }
}