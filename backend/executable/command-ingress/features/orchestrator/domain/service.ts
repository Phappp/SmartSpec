import { UploadedFile } from "express-fileupload";
import Version from "../../../../../internal/model/version";
import Input from "../../../../../internal/model/input";

import { InputService } from "./InputService";
import { GeminiService } from "./GeminiService";
import { RequirementService } from "./RequirementService";
import { UtilService } from "./UtilService";
import { inputSocketService } from '../../input/domain/input.socket.service';
import { VersionService } from "../../../features/version/domain/service";
import { LogService } from "../../log/domain/service";

export class OrchestratorService {
    private inputService = new InputService();
    private gemini = new GeminiService();
    private requirementService = new RequirementService();
    private util = new UtilService();
    private versionService = new VersionService();
    private logService = new LogService();
    async run(
        projectId: string,
        versionId: string,
        opts: { files: UploadedFile[]; rawText?: string; mode?: "full" | "incremental" },
        language: string,
        userId: string // ✅ THÊM: userId để broadcast
    ) {
        let version = await Version.findById(versionId);
        if (!version) throw new Error("Version not found");

        // ✅ Nếu version không phải temporary → bump trước
        if (version.version_temporary === false) {
            const bumpRes = await this.versionService.bumpVersion(versionId, userId, "minor");
            if (!bumpRes.data) throw new Error("Auto bump failed");
            version = bumpRes.data.newVersion;
            versionId = version._id.toString();
        }

        // Hàm để tạo độ trễ ngẫu nhiên
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const randomDelay = 2000;

        // 🟢 Bắt đầu: clear lỗi cũ
        console.log(`[SERVICE] Clearing previous errors for version ${versionId} before running...`);
        // Độ trễ ngẫu nhiên từ 2000ms (2 giây) đến 3000ms (3 giây)

        await Version.findByIdAndUpdate(versionId, {
            $set: {
                status: "processing",
                processing_errors: [],
                stage: "initializing",
                progress: 15,
                is_processing: true
            }
        });

        // ✅ BROADCAST: Initializing stage
        inputSocketService.emitIncrementalProgress(
            projectId,
            versionId,
            userId,
            15,
            "initializing",
            true
        );

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

        // ✅ BROADCAST: Input processing stage
        inputSocketService.emitIncrementalProgress(
            projectId,
            versionId,
            userId,
            25,
            "input",
            true
        );

        // 2️⃣ Nếu incremental mà không có gì mới → return luôn (trừ khi retry)
        if (opts.mode === "incremental" && newFilesCount === 0 && !newTextProvided) {
            const isRetry = (!opts.files || opts.files.length === 0) && !opts.rawText;
            if (!isRetry) {
                // ✅ BROADCAST: Analysis completed (no new inputs)
                inputSocketService.emitIncrementalProgress(
                    projectId,
                    versionId,
                    userId,
                    100,
                    "completed",
                    false
                );
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
            console.warn("Không có input hợp lệ để xử lý. Trả về trạng thái hiện tại.");
            // ✅ BROADCAST: No inputs to process
            inputSocketService.emitIncrementalProgress(
                projectId,
                versionId,
                userId,
                100,
                "completed",
                false
            );
            return {
                version_id: versionId,
                inputs_count: 0,
                requirement_model: version.requirement_model || [],
                mode: opts.mode,
            };
        }

        // 4️⃣ Phân tích requirement
        await Version.findByIdAndUpdate(versionId, { $set: { stage: "analyzing", progress: 40 } });

        // ✅ BROADCAST: Analyzing stage
        inputSocketService.emitIncrementalProgress(
            projectId,
            versionId,
            userId,
            40,
            "analyzing",
            true
        );
        await delay(randomDelay);

        await Version.findByIdAndUpdate(versionId, { $set: { stage: "normalization", progress: 70 } });

        // ✅ BROADCAST: Normalization stage
        inputSocketService.emitIncrementalProgress(
            projectId,
            versionId,
            userId,
            70,
            "normalization",
            true
        );
        await delay(randomDelay);

        // 5️⃣ Finalizing
        await Version.findByIdAndUpdate(versionId, { $set: { stage: "finalizing", progress: 90 } });

        // ✅ BROADCAST: Finalizing stage
        inputSocketService.emitIncrementalProgress(
            projectId,
            versionId,
            userId,
            90,
            "finalizing",
            true
        );

        const result = await this.requirementService.finalize(
            versionId,
            opts.mode || "full",
            inputs,
            this.gemini,
            language
        );

        try {
            if (result) {
                for (const req of result.newRequirements) {
                    await this.versionService.createOrUpdatePreview(
                        versionId,
                        userId,
                        {
                        entity_type: "requirement",
                        entity_id: req.id,
                        change_type: "added",
                        before_snapshot: null,
                        after_snapshot: req,
                        }
                    );
                }
                await this.logService.createLog({
                    project_id: version.project_id.toString(),
                    user_id: userId,
                    action: "generate_data",
                    target_id: versionId,
                    target_type: "requirement_model",
                    version_number: version.version_number,
                    affects_requirement: true,
                    level: "info",
                    details: {
                        after: result.newRequirements,
                        message: `${userId} generate usecase by AI in version ${version.version_number}`
                    }
                    
                });
                console.log(`✅ Preview logged for ${result.newRequirements.length} generated requirements.`);
            }
        } catch (previewErr: any) {
            console.error("⚠️ Error logging preview:", previewErr);
        }
            
        // 6️⃣ Hoàn tất
        await Version.findByIdAndUpdate(versionId, {
            $set: { stage: "completed", progress: 100 }
        });

        // ✅ BROADCAST: Completed
        inputSocketService.emitIncrementalProgress(
            projectId,
            versionId,
            userId,
            100,
            "completed",
            false
        );
        return result;
    }

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