import { UploadedFile } from "express-fileupload";
import Version from "../../../../../internal/model/version";
import Input from "../../../../../internal/model/input";
import { InputService } from "./InputService";
import { GeminiService } from "./GeminiService";
import { RequirementService } from "./RequirementService";
import { UtilService } from "./UtilService";
import { inputSocketService } from '../../input/domain/input.socket.service';
import { VersionService } from "../../../features/version/domain/service";
import {PreviewChangeDto} from "../../../features/version/adapter/preview.dto";

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
        userId: string // ✅ THÊM: userId để broadcast
    ) {
        // Hàm để tạo độ trễ ngẫu nhiên
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const randomDelay = 2000;

        // 🟢 Bắt đầu: clear lỗi cũ nhưng giữ checkpoint
        console.log(`[SERVICE] Clearing previous errors for version ${versionId} before running...`);
        // Độ trễ ngẫu nhiên từ 2000ms (2 giây) đến 3000ms (3 giây)
        let version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        // Kiểm tra checkpoint để xác định có thể resume không
        const checkpoint = (version as any).processing_checkpoint;
        const hasCheckpoint = checkpoint && typeof checkpoint === 'object' && Array.isArray(checkpoint.processed_chunks) && checkpoint.processed_chunks.length > 0;
        
        if (hasCheckpoint) {
            console.log(`🔄 Checkpoint detected: ${checkpoint.processed_chunks.length} chunks already processed. Will resume from checkpoint.`);
        }

        // ✅ Nếu version không phải temporary → bump trước
        if (version.version_temporary === false) {
            const bumpRes = await this.versionService.bumpVersion(versionId, userId, "minor");
            if (!bumpRes.data) throw new Error("Auto bump failed");
            version = bumpRes.data.newVersion;
            console.log("version Id after bump",version._id);
            versionId = version._id.toString();
            
            // Lấy lại checkpoint sau khi bump
            const newVersion = await Version.findById(versionId).lean();
            if (newVersion && (newVersion as any).processing_checkpoint) {
                console.log(`🔄 Checkpoint preserved after version bump`);
            }
        }
        
        // Clear errors nhưng giữ checkpoint
        await Version.findByIdAndUpdate(versionId, {
            $set: {
                status: "processing",
                processing_errors: [],
                stage: hasCheckpoint ? "analyzing" : "initializing",
                progress: hasCheckpoint ? 40 : 15,
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
            // Lấy usecases từ collection
            const Usecase = (await import("../../../../../internal/model/usecase")).default;
            const usecases = await Usecase.find({ version_id: versionId }).lean();
            
            return {
                version_id: versionId,
                inputs_count: 0,
                requirement_model: usecases || [],
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

        try {
            const result = await this.requirementService.finalize(
                versionId,
                opts.mode || "full",
                inputs,
                this.gemini,
                language
            );

            // Xử lý partial success
            if (result.partialSuccess && result.warnings) {
                console.warn(`⚠️ Partial success detected: ${result.warnings.length} warnings`);
                // Status đã được cập nhật trong finalize, chỉ cần broadcast
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

            // Kiểm tra nếu có errors trong result
            if (result.errors && result.errors.length > 0) {
                console.error("❌ Errors detected in finalize result:", result.errors);
                
                // Cập nhật version status thành failed (checkpoint đã được lưu trong finalize)
                await Version.findByIdAndUpdate(versionId, {
                    $set: {
                        status: "failed",
                        stage: "failed",
                        progress: 100,
                        processing_errors: result.errors
                    }
                });

                // ✅ BROADCAST: Failed status với thông tin có thể resume
                inputSocketService.emitIncrementalProgress(
                    projectId,
                    versionId,
                    userId,
                    100,
                    "failed",
                    false
                );

                // Nếu có thể resume, log thông tin
                if (result.canResume && result.checkpoint?.processed_chunks?.length > 0) {
                    const maxChunk = Math.max(...result.checkpoint.processed_chunks);
                    console.log(`💾 Checkpoint saved. Can resume from chunk ${maxChunk + 1}`);
                } else if (result.canResume) {
                    console.log(`💾 Checkpoint saved but no processed chunks found. Will start from beginning.`);
                }

                // Throw error để được catch bên ngoài
                throw new Error(`Processing failed: ${result.errors.join('; ')}`);
            }

            // Chỉ xử lý preview nếu không có lỗi
            const newUsecase = result.newRequirements || [];
            for(const usecase of newUsecase){
                const changePayload : PreviewChangeDto  = {
                    entity_type: "requirement",
                    change_type: "added",
                    entity_id: usecase._id,
                    before_snapshot: null,
                    after_snapshot: usecase,
                };
                const previewRes = await this.versionService.createOrUpdatePreview(
                    versionId,
                    userId,
                    changePayload
                );
            }

            // 6️⃣ Hoàn tất - CHỈ khi không có lỗi
            await Version.findByIdAndUpdate(versionId, {
                $set: { 
                    stage: "completed", 
                    progress: 100,
                    status: "completed"
                }
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

        } catch (error: any) {
            // Xử lý lỗi từ finalize hoặc các bước khác
            console.error("❌ Error during finalize processing:", error);

            const errorMessage = error.message || "Unknown error during processing";
            const processingErrors = Array.isArray(error.errors) 
                ? error.errors 
                : [errorMessage];

            // Cập nhật version status thành failed
            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    status: "failed",
                    stage: "failed",
                    progress: 100,
                    processing_errors: processingErrors,
                    is_processing: false
                }
            });

            // ✅ BROADCAST: Failed status
            inputSocketService.emitIncrementalProgress(
                projectId,
                versionId,
                userId,
                100,
                "failed",
                false
            );

            // Re-throw để có thể log ở controller nếu cần
            throw error;
        }
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