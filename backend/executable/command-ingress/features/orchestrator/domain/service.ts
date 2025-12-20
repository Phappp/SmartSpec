import { UploadedFile } from "express-fileupload";
import Version from "../../../../../internal/model/version";
import Input from "../../../../../internal/model/input";
import Usecase from "../../../../../internal/model/usecase";
import { InputService } from "./InputService";
import { GeminiService } from "./GeminiService";
import { RequirementService } from "./RequirementService";
import { UtilService } from "./UtilService";
import { inputSocketService } from '../../input/domain/input.socket.service';
import { VersionService } from "../../../features/version/domain/service";
import { PreviewChangeDto } from "../../../features/version/adapter/preview.dto";
import { LLMService } from "../../../shared/LLMService";

export class OrchestratorService {
    private inputService = new InputService();
    private gemini = new GeminiService();
    private requirementService = new RequirementService();
    private util = new UtilService();
    private versionService = new VersionService();
    private llmService = new LLMService(); // ✅ Thêm LLMService để lấy recommended model

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

        // ✅ QUAN TRỌNG: Atomic check và set is_processing để tránh race condition
        // Sử dụng findOneAndUpdate với condition để đảm bảo chỉ một process có thể chạy
        const versionUpdate = await Version.findOneAndUpdate(
            {
                _id: versionId,
                $or: [
                    { is_processing: { $ne: true } }, // Chưa processing
                    { is_processing: { $exists: false } } // Hoặc field không tồn tại
                ]
            },
            {
                $set: {
                    is_processing: true,
                    status: "processing",
                    processing_errors: [],
                    stage: "initializing",
                    progress: 15
                }
            },
            { new: true, lean: true }
        );

        if (!versionUpdate) {
            // Version đang được xử lý bởi process khác
            const currentVersion = await Version.findById(versionId).lean();
            if (currentVersion && (currentVersion as any).is_processing === true) {
                throw new Error("Version is already being processed by another request. Please wait for the current process to complete.");
            }
            throw new Error("Version not found or cannot start processing");
        }

        let version = versionUpdate;

        // Kiểm tra checkpoint để xác định có thể resume không
        const checkpoint = (version as any).processing_checkpoint;
        const hasCheckpoint = checkpoint && typeof checkpoint === 'object' && Array.isArray(checkpoint.processed_chunks) && checkpoint.processed_chunks.length > 0;

        if (hasCheckpoint) {
            console.log(`🔄 Checkpoint detected: ${checkpoint.processed_chunks.length} chunks already processed. Will resume from checkpoint.`);
            // Cập nhật stage và progress dựa trên checkpoint
            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    stage: "analyzing",
                    progress: 40
                }
            });
        }

        // ✅ Nếu version không phải temporary → bump trước
        if (version.version_temporary === false) {
            const bumpRes = await this.versionService.bumpVersion(versionId, userId, "minor");
            if (!bumpRes.data) {
                // Rollback is_processing nếu bump failed
                await Version.findByIdAndUpdate(versionId, { $set: { is_processing: false } });
                throw new Error("Auto bump failed");
            }
            version = bumpRes.data.newVersion;
            console.log("version Id after bump", version._id);
            versionId = version._id.toString();

            // ✅ QUAN TRỌNG: Set is_processing cho version mới sau khi bump
            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    is_processing: true,
                    status: "processing",
                    processing_errors: [],
                    stage: hasCheckpoint ? "analyzing" : "initializing",
                    progress: hasCheckpoint ? 40 : 15
                }
            });

            // Lấy lại checkpoint sau khi bump
            const newVersion = await Version.findById(versionId).lean();
            if (newVersion && (newVersion as any).processing_checkpoint) {
                console.log(`🔄 Checkpoint preserved after version bump`);
            }
        }

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
            versionId,
            userId // ✅ THÊM: Truyền userId xuống để refine sử dụng model user chọn
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
                // Đợi inputs mới được tạo hoàn thành (bao gồm cả refine cho audio)
                inputs = await this.util.waitForInputsCompletionByIds(targetIds);
            } else {
                // Fallback: Tìm tất cả unprocessed inputs
                // Đợi một chút để refine process (cho audio/images) có thời gian chạy
                await this.util.delay(2000); // Đợi 2 giây để refine process bắt đầu

                // Tìm inputs chưa được processed, bao gồm cả "extracted" và "completed"
                // Vì audio/images có status "extracted" và cần được refine thành "completed"
                const allUnprocessedInputs = await Input.find({
                    version_id: versionId,
                    processing_status: { $in: ["completed", "extracted"] },
                    is_processed: { $ne: true }
                }).lean();

                // Tách inputs thành "completed" và "extracted"
                const completedInputs = allUnprocessedInputs.filter((i: any) => i.processing_status === "completed");
                const extractedInputs = allUnprocessedInputs.filter((i: any) => i.processing_status === "extracted");

                if (extractedInputs.length > 0) {
                    console.log(`⏳ Đợi ${extractedInputs.length} input(s) với status "extracted" hoàn thành refine...`);
                    const extractedIds = extractedInputs.map((i: any) => String(i._id));
                    // Đợi refine hoàn thành (timeout 90s cho audio/images)
                    const refinedInputs = await this.util.waitForInputsCompletionByIds(extractedIds, 90000);
                    // Lọc chỉ những inputs đã hoàn thành (completed), bỏ qua failed
                    const successfullyRefined = refinedInputs.filter((i: any) => i.processing_status === "completed");
                    const failedRefined = refinedInputs.filter((i: any) => i.processing_status === "failed");
                    if (failedRefined.length > 0) {
                        console.warn(`⚠️ ${failedRefined.length} input(s) refine failed, sẽ bỏ qua`);
                    }
                    console.log(`✅ ${successfullyRefined.length} input(s) refine thành công`);
                    // Kết hợp với completed inputs ban đầu
                    inputs = [...completedInputs, ...successfullyRefined];
                } else {
                    // Không có extracted inputs, dùng completed inputs
                    inputs = completedInputs;
                }

                console.log(`📊 Tổng số inputs sẽ xử lý: ${inputs.length} (${completedInputs.length} completed + ${extractedInputs.length > 0 ? extractedInputs.length : 0} refined)`);
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
            // ✅ Sử dụng LLMService để lấy model (ưu tiên model user đã chọn)
            const modelName = await this.llmService.getRecommendedModel(undefined, userId);
            console.log(`🔑 [ORCHESTRATOR] Using model: ${modelName}${userId ? ` (for user: ${userId})` : ''}`);

            const result = await this.requirementService.finalize(
                versionId,
                opts.mode || "full",
                inputs, // ✅ Sửa: dùng biến inputs thay vì inputsToProcess
                this.gemini,
                language,
                modelName, // modelName (có thể là model user đã chọn)
                userId, // ✅ MỚI: userId để broadcast realtime
                projectId // ✅ MỚI: projectId để broadcast realtime
            );

            // Kiểm tra nếu có errors trong result
            if (result.errors && result.errors.length > 0) {
                console.error("❌ Errors detected in finalize result:", result.errors);

                // Cập nhật version status thành failed
                await Version.findByIdAndUpdate(versionId, {
                    $set: {
                        status: "failed",
                        stage: "failed",
                        progress: 100,
                        processing_errors: result.errors,
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

                // Throw error để được catch bên ngoài
                throw new Error(`Processing failed: ${result.errors.join('; ')}`);
            }

            // Chỉ xử lý preview nếu không có lỗi
            const newUsecase = result.newRequirements || [];
            for (const usecase of newUsecase) {
                const changePayload: PreviewChangeDto = {
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
                    status: "completed",
                    is_processing: false // ✅ QUAN TRỌNG: Reset flag khi hoàn thành
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

            // ✅ QUAN TRỌNG: Kiểm tra xem có use cases đã được lưu không (partial results)
            const existingUseCases = await Usecase.find({ version_id: versionId }).countDocuments();

            if (existingUseCases > 0) {
                // Có partial results → đánh dấu completed với warnings
                console.warn(`⚠️ Processing failed but ${existingUseCases} use cases were saved. Marking as completed with warnings.`);

                await Version.findByIdAndUpdate(versionId, {
                    $set: {
                        status: "completed",
                        stage: "completed",
                        progress: 100,
                        processing_errors: processingErrors,
                        is_processing: false, // ✅ QUAN TRỌNG: Reset flag khi có partial success
                        affects_requirement: true
                    }
                });

                // ✅ BROADCAST: Completed với warnings (partial success) - gửi kèm errors
                inputSocketService.emitIncrementalProgress(
                    projectId,
                    versionId,
                    userId,
                    100,
                    "completed",
                    false,
                    undefined, // batchInfo
                    processingErrors // ✅ Gửi errors để frontend biết có lỗi
                );

                // Return partial success result
                const finalUsecases = await Usecase.find({ version_id: versionId }).lean();
                return {
                    version_id: versionId,
                    usecases: finalUsecases,
                    newRequirements: finalUsecases,
                    warnings: processingErrors,
                    partialSuccess: true
                };
            } else {
                // Không có partial results → đánh dấu failed
                await Version.findByIdAndUpdate(versionId, {
                    $set: {
                        status: "failed",
                        stage: "failed",
                        progress: 100,
                        processing_errors: processingErrors,
                        is_processing: false // ✅ QUAN TRỌNG: Reset flag khi failed
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