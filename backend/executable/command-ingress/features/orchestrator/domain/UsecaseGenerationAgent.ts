import { Types } from "mongoose";
import Version from "../../../../../internal/model/version";
import Usecase from "../../../../../internal/model/usecase";
import { GeminiService } from "./GeminiService";

/**
 * Agent State Machine cho Usecase Generation
 * 
 * Luồng:
 * ESTIMATE_USECASE_COUNT → BATCH_PLANNING → GENERATE_BATCH → VERIFY_RESULTS
 *                                                              ↓
 *                                                         HAS_MISSING_OR_BAD?
 *                                                              ↓
 *                                                         REPLAN_MISSING → GENERATE_RETRY → VERIFY_RESULTS (loop)
 */
export enum AgentState {
    ESTIMATE_USECASE_COUNT = "ESTIMATE_USECASE_COUNT",
    BATCH_PLANNING = "BATCH_PLANNING",
    GENERATE_BATCH = "GENERATE_BATCH",
    VERIFY_RESULTS = "VERIFY_RESULTS",
    REPLAN_MISSING = "REPLAN_MISSING",
    GENERATE_RETRY = "GENERATE_RETRY",
    DONE = "DONE"
}

export interface AgentContext {
    versionId: string;
    mergedText: string;
    language: string;
    mode: "full" | "incremental";
    modelName?: string;
    userId?: string;
    projectId?: string;

    // Estimate results
    estimatedCount?: number;
    estimatedBatches?: number;
    summary?: string;

    // Batch planning
    batchPlan?: BatchPlan[];
    currentBatchIndex?: number;

    // Generation results
    generatedUsecases?: any[];
    savedUsecases?: any[];

    // Verification results
    missingCount?: number;
    invalidUsecases?: InvalidUsecase[];

    // Retry tracking
    retryAttempts?: number;
    maxRetryAttempts?: number;

    // Resume state (khi có lỗi retryable)
    resumeState?: {
        state: AgentState;
        savedCount: number;
        currentBatchIndex: number;
        errorMessage: string;
        errorType: string;
    };
}

export interface BatchPlan {
    batchNumber: number;
    offset: number;
    batchSize: number;
    targetCount: number;
}

export interface InvalidUsecase {
    name: string;
    errors: string[];
    originalData?: any;
    expectedIndex?: number;
}

export interface VerificationResult {
    hasMissing: boolean;
    hasInvalid: boolean;
    missingCount: number;
    invalidUsecases: InvalidUsecase[];
    totalGenerated: number;
    totalExpected: number;
}

export class UsecaseGenerationAgent {
    private gemini: GeminiService;
    private context: AgentContext;
    private state: AgentState;
    private DEFAULT_BATCH_SIZE = 15;
    private MAX_RETRY_ATTEMPTS = 3;

    // ✅ Public getter để truy cập context (đặc biệt là resumeState)
    getContext(): AgentContext {
        return this.context;
    }

    getResumeState() {
        return this.context.resumeState;
    }

    constructor(
        gemini: GeminiService,
        context: AgentContext
    ) {
        this.gemini = gemini;
        this.context = context;

        // ✅ Kiểm tra resume state: nếu có resumeState, tiếp tục từ đó
        if (this.context.resumeState) {
            console.log(`🔄 [AGENT] Resuming from saved state: ${this.context.resumeState.state}`);
            this.state = this.context.resumeState.state;
            this.context.currentBatchIndex = this.context.resumeState.currentBatchIndex;
            // Restore savedCount từ DB để đảm bảo chính xác
            this.context.savedUsecases = []; // Sẽ được cập nhật lại từ DB
        } else {
            this.state = AgentState.ESTIMATE_USECASE_COUNT;
        }

        this.context.retryAttempts = 0;
        this.context.maxRetryAttempts = this.MAX_RETRY_ATTEMPTS;
    }

    /**
     * Chạy agent theo state machine
     */
    async run(): Promise<{
        version_id: string;
        usecases: any[];
        totalGenerated: number;
    }> {
        console.log(`🤖 [AGENT] Starting UsecaseGenerationAgent in state: ${this.state}`);

        // ✅ Nếu resume từ state đã lưu, restore savedUsecases từ DB
        if (this.context.resumeState) {
            const savedCount = await Usecase.countDocuments({ version_id: this.context.versionId });
            console.log(`💾 [AGENT] Resuming: ${savedCount} usecases already saved. Continuing from batch ${this.context.resumeState.currentBatchIndex + 1}`);

            // Restore savedUsecases count (không cần lấy full data, chỉ cần count)
            this.context.savedUsecases = new Array(savedCount).fill(null); // Placeholder array
        }

        while (this.state !== AgentState.DONE) {
            try {
                switch (this.state) {
                    case AgentState.ESTIMATE_USECASE_COUNT:
                        await this.estimateUsecaseCount();
                        break;

                    case AgentState.BATCH_PLANNING:
                        await this.batchPlanning();
                        break;

                    case AgentState.GENERATE_BATCH:
                        await this.generateBatch();
                        break;

                    case AgentState.VERIFY_RESULTS:
                        await this.verifyResults();
                        break;

                    case AgentState.REPLAN_MISSING:
                        await this.replanMissing();
                        break;

                    case AgentState.GENERATE_RETRY:
                        await this.generateRetry();
                        break;

                    default:
                        throw new Error(`Unknown state: ${this.state}`);
                }
            } catch (error: any) {
                console.error(`❌ [AGENT] Error in state ${this.state}:`, error.message);

                // ✅ Nếu có resumeState và lỗi không phải retryable, vẫn throw
                // Nhưng nếu lỗi là retryable và đã được xử lý trong generateBatch/generateRetry, không throw
                const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(error);

                // Nếu lỗi retryable và đã có resumeState, không throw (đã được xử lý)
                if (this.context.resumeState && (errorInfo.retryable || errorInfo.type === 'QUOTA_EXCEEDED' || errorInfo.type === 'RATE_LIMIT')) {
                    console.log(`⚠️ [AGENT] Retryable error handled. State saved. Can resume later.`);
                    // Trả về partial results
                    const partialUsecases = await Usecase.find({ version_id: this.context.versionId }).lean();
                    return {
                        version_id: this.context.versionId,
                        usecases: partialUsecases,
                        totalGenerated: partialUsecases.length
                    };
                }

                throw error;
            }
        }

        // Lấy final usecases từ database
        const finalUsecases = await Usecase.find({ version_id: this.context.versionId }).lean();
        console.log(`✅ [AGENT] Completed: ${finalUsecases.length} total use cases`);

        return {
            version_id: this.context.versionId,
            usecases: finalUsecases,
            totalGenerated: this.context.savedUsecases?.length || 0
        };
    }

    /**
     * State: ESTIMATE_USECASE_COUNT
     * Ước tính số lượng usecase từ text
     */
    private async estimateUsecaseCount(): Promise<void> {
        console.log(`📊 [ESTIMATE] Estimating usecase count...`);

        const { inputSocketService } = await import("../../input/domain/input.socket.service");
        if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            inputSocketService.emitIncrementalProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                10,
                "estimating",
                true,
                undefined, // batchInfo
                undefined, // errors
                AgentState.ESTIMATE_USECASE_COUNT,
                "Đang ước tính số lượng usecase từ văn bản..."
            );
        }

        const estimate = await this.gemini.estimateUseCasesCount(
            this.context.mergedText,
            this.context.language,
            this.context.modelName,
            this.context.userId,
            this.context.projectId
        );

        this.context.estimatedCount = estimate.estimated_count;
        this.context.estimatedBatches = estimate.estimated_batches;
        this.context.summary = estimate.summary;

        console.log(`✅ [ESTIMATE] Estimated ${this.context.estimatedCount} use cases, ${this.context.estimatedBatches} batches`);

        // Broadcast estimate
        if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            inputSocketService.emitEstimateReceived(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                estimate
            );

            // Broadcast estimate completion với message
            inputSocketService.emitIncrementalProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                15,
                "estimating",
                true,
                undefined,
                undefined,
                AgentState.ESTIMATE_USECASE_COUNT,
                `Đã ước tính: ${this.context.estimatedCount} usecases, ${this.context.estimatedBatches} batches`
            );
        }

        // Chuyển sang state tiếp theo
        this.state = AgentState.BATCH_PLANNING;
    }

    /**
     * State: BATCH_PLANNING
     * Lập kế hoạch chia batch dựa trên estimate
     */
    private async batchPlanning(): Promise<void> {
        console.log(`📋 [BATCH_PLANNING] Planning batches...`);

        if (!this.context.estimatedCount || !this.context.estimatedBatches) {
            throw new Error("Cannot plan batches without estimate");
        }

        const batchPlan: BatchPlan[] = [];
        const totalBatches = this.context.estimatedBatches;
        const estimatedCount = this.context.estimatedCount;

        for (let i = 0; i < totalBatches; i++) {
            const offset = i * this.DEFAULT_BATCH_SIZE;
            const remaining = estimatedCount - offset;
            const batchSize = Math.min(this.DEFAULT_BATCH_SIZE, remaining);

            if (batchSize <= 0) break;

            batchPlan.push({
                batchNumber: i + 1,
                offset,
                batchSize,
                targetCount: batchSize
            });
        }

        this.context.batchPlan = batchPlan;
        this.context.currentBatchIndex = 0;
        this.context.generatedUsecases = [];
        this.context.savedUsecases = [];

        console.log(`✅ [BATCH_PLANNING] Planned ${batchPlan.length} batches`);

        // Broadcast batch planning completion
        const { inputSocketService } = await import("../../input/domain/input.socket.service");
        if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            inputSocketService.emitIncrementalProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                18,
                "planning",
                true,
                undefined,
                undefined,
                AgentState.BATCH_PLANNING,
                `Đã lập kế hoạch: ${batchPlan.length} batches`
            );
        }

        // Chuyển sang state tiếp theo
        this.state = AgentState.GENERATE_BATCH;
    }

    /**
     * State: GENERATE_BATCH
     * Generate batch hiện tại
     */
    private async generateBatch(): Promise<void> {
        if (!this.context.batchPlan || this.context.currentBatchIndex === undefined) {
            throw new Error("Cannot generate batch without plan");
        }

        const currentBatch = this.context.batchPlan[this.context.currentBatchIndex];
        if (!currentBatch) {
            // Đã generate hết batches → chuyển sang verify
            this.state = AgentState.VERIFY_RESULTS;
            return;
        }

        console.log(`📦 [GENERATE_BATCH] Generating batch ${currentBatch.batchNumber}/${this.context.batchPlan.length}...`);

        const { inputSocketService } = await import("../../input/domain/input.socket.service");
        const progress = 20 + Math.floor((currentBatch.batchNumber / this.context.batchPlan.length) * 70);

        if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            const currentSavedCount = this.context.savedUsecases?.length || 0;
            inputSocketService.emitIncrementalProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                progress,
                "generating",
                true,
                {
                    currentBatch: currentBatch.batchNumber,
                    totalBatches: this.context.batchPlan.length,
                    usecasesInBatch: 0,
                    savedCount: currentSavedCount, // ✅ Thêm savedCount
                    totalCount: this.context.estimatedCount || 0
                },
                undefined, // errors
                AgentState.GENERATE_BATCH,
                `Đang generate batch ${currentBatch.batchNumber}/${this.context.batchPlan.length} (${currentBatch.batchSize} usecases)...`
            );
        }

        try {
            // Generate batch
            const batchUseCases = await this.gemini.generateUseCasesBatch(
                this.context.mergedText,
                currentBatch.batchNumber,
                this.context.batchPlan.length,
                currentBatch.offset,
                currentBatch.batchSize,
                this.context.language,
                this.context.modelName,
                this.context.userId,
                this.context.projectId,
                this.context.estimatedCount
            );

            if (batchUseCases.length === 0) {
                console.log(`⏩ [GENERATE_BATCH] No more use cases to generate. Moving to verify.`);
                this.state = AgentState.VERIFY_RESULTS;
                return;
            }

            // Normalize và save batch
            const saved = await this.saveBatch(batchUseCases, currentBatch.batchNumber);

            if (this.context.generatedUsecases) {
                this.context.generatedUsecases.push(...batchUseCases);
            }
            // ✅ savedUsecases đã được cập nhật trong saveBatch, không cần push lại

            // Broadcast batch completion (đã được broadcast trong saveBatch, nhưng có thể thêm broadcast riêng nếu cần)
            // Broadcast đã được thực hiện trong saveBatch với savedCount chính xác

            // Chuyển sang batch tiếp theo hoặc verify
            this.context.currentBatchIndex++;
            if (this.context.currentBatchIndex >= this.context.batchPlan.length) {
                this.state = AgentState.VERIFY_RESULTS;
            }
            // Nếu không, tiếp tục generate batch tiếp theo (state giữ nguyên)
        } catch (error: any) {
            // ✅ Xử lý lỗi LLM (quota, rate limit, etc.)
            const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
            const errorInfo = analyzeApiKeyError(error);

            // Kiểm tra xem lỗi có thể retry được không
            if (errorInfo.retryable || errorInfo.type === 'QUOTA_EXCEEDED' || errorInfo.type === 'RATE_LIMIT') {
                console.warn(`⚠️ [GENERATE_BATCH] Retryable error in batch ${currentBatch.batchNumber}: ${errorInfo.message}`);

                // Lưu state để có thể resume sau
                const currentSavedCount = await Usecase.countDocuments({ version_id: this.context.versionId });
                this.context.resumeState = {
                    state: AgentState.GENERATE_BATCH,
                    savedCount: currentSavedCount,
                    currentBatchIndex: this.context.currentBatchIndex,
                    errorMessage: errorInfo.userFriendlyMessage.vi || errorInfo.message,
                    errorType: errorInfo.type
                };

                // Broadcast lỗi với message hướng dẫn continue
                if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                    inputSocketService.emitIncrementalProgress(
                        this.context.projectId,
                        this.context.versionId,
                        this.context.userId,
                        progress,
                        "paused", // ✅ Status paused thay vì failed
                        true, // isProcessing = true để có thể continue
                        {
                            currentBatch: currentBatch.batchNumber,
                            totalBatches: this.context.batchPlan.length,
                            usecasesInBatch: 0,
                            savedCount: currentSavedCount,
                            totalCount: this.context.estimatedCount || 0
                        },
                        [errorInfo.userFriendlyMessage.vi || errorInfo.message], // errors
                        AgentState.GENERATE_BATCH,
                        `⚠️ ${errorInfo.userFriendlyMessage.vi || errorInfo.message}. Đã lưu ${currentSavedCount}/${this.context.estimatedCount || 0} usecases. Có thể tiếp tục sau...`
                    );
                }

                // Không throw error, để có thể continue sau
                // State giữ nguyên GENERATE_BATCH để có thể retry batch này
                console.log(`💾 [GENERATE_BATCH] State saved. Current progress: ${currentSavedCount}/${this.context.estimatedCount || 0} usecases. Can resume from batch ${currentBatch.batchNumber}.`);
                return; // Dừng lại, không throw error
            } else {
                // Lỗi không retry được → throw
                throw error;
            }
        }
    }

    /**
     * State: VERIFY_RESULTS
     * Kiểm tra kết quả sau khi generate tất cả batches
     */
    private async verifyResults(): Promise<void> {
        console.log(`🔍 [VERIFY_RESULTS] Verifying results...`);

        // Broadcast verification start
        const { inputSocketService } = await import("../../input/domain/input.socket.service");
        if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            inputSocketService.emitIncrementalProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                90,
                "verifying",
                true,
                undefined,
                undefined,
                AgentState.VERIFY_RESULTS,
                "Đang kiểm tra kết quả generate..."
            );
        }

        const verification = await this.performVerification();

        console.log(`📊 [VERIFY_RESULTS] Verification complete:`, {
            totalGenerated: verification.totalGenerated,
            totalExpected: verification.totalExpected,
            missingCount: verification.missingCount,
            invalidCount: verification.invalidUsecases.length
        });

        this.context.missingCount = verification.missingCount;
        this.context.invalidUsecases = verification.invalidUsecases;

        // Nếu có missing hoặc invalid → replan và retry
        if (verification.hasMissing || verification.hasInvalid) {
            if (this.context.retryAttempts! >= this.context.maxRetryAttempts!) {
                console.warn(`⚠️ [VERIFY_RESULTS] Max retry attempts (${this.context.maxRetryAttempts}) reached. Stopping.`);

                // Broadcast max retry reached
                if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                    inputSocketService.emitIncrementalProgress(
                        this.context.projectId,
                        this.context.versionId,
                        this.context.userId,
                        95,
                        "verifying",
                        true,
                        undefined,
                        undefined,
                        AgentState.VERIFY_RESULTS,
                        `Đã đạt max retry (${this.context.maxRetryAttempts}). Còn thiếu ${verification.missingCount} usecases.`
                    );
                }

                this.state = AgentState.DONE;
            } else {
                this.context.retryAttempts!++;
                console.log(`🔄 [VERIFY_RESULTS] Missing/invalid detected. Starting retry attempt ${this.context.retryAttempts}/${this.context.maxRetryAttempts}`);

                // Broadcast retry needed
                if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                    inputSocketService.emitIncrementalProgress(
                        this.context.projectId,
                        this.context.versionId,
                        this.context.userId,
                        92,
                        "verifying",
                        true,
                        undefined,
                        undefined,
                        AgentState.VERIFY_RESULTS,
                        `Phát hiện thiếu/invalid: ${verification.missingCount} usecases. Bắt đầu retry lần ${this.context.retryAttempts}/${this.context.maxRetryAttempts}...`
                    );
                }

                this.state = AgentState.REPLAN_MISSING;
            }
        } else {
            // Không có missing/invalid → hoàn thành
            console.log(`✅ [VERIFY_RESULTS] All usecases generated successfully!`);

            // Broadcast verification success
            if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                inputSocketService.emitIncrementalProgress(
                    this.context.projectId,
                    this.context.versionId,
                    this.context.userId,
                    95,
                    "verifying",
                    true,
                    undefined,
                    undefined,
                    AgentState.VERIFY_RESULTS,
                    `✅ Đã verify thành công: ${verification.totalGenerated}/${verification.totalExpected} usecases`
                );
            }

            this.state = AgentState.DONE;
        }
    }

    /**
     * State: REPLAN_MISSING
     * Lập kế hoạch lại cho các usecases còn thiếu
     */
    private async replanMissing(): Promise<void> {
        console.log(`📋 [REPLAN_MISSING] Replanning for missing usecases...`);

        if (!this.context.missingCount && (!this.context.invalidUsecases || this.context.invalidUsecases.length === 0)) {
            this.state = AgentState.DONE;
            return;
        }

        const missingCount = this.context.missingCount || 0;
        const invalidCount = this.context.invalidUsecases?.length || 0;
        const totalToRegenerate = missingCount + invalidCount;

        if (totalToRegenerate === 0) {
            this.state = AgentState.DONE;
            return;
        }

        // Tạo batch plan mới cho retry
        const retryBatches = Math.ceil(totalToRegenerate / this.DEFAULT_BATCH_SIZE);
        const retryPlan: BatchPlan[] = [];

        for (let i = 0; i < retryBatches; i++) {
            const offset = i * this.DEFAULT_BATCH_SIZE;
            const remaining = totalToRegenerate - offset;
            const batchSize = Math.min(this.DEFAULT_BATCH_SIZE, remaining);

            if (batchSize <= 0) break;

            retryPlan.push({
                batchNumber: (this.context.batchPlan?.length || 0) + i + 1,
                offset: offset, // ✅ FIX: Offset trong retry bắt đầu từ 0, không cộng với savedUsecases
                batchSize,
                targetCount: batchSize
            });
        }

        // Lưu retry plan vào context (tạm thời, sẽ được sử dụng trong GENERATE_RETRY)
        (this.context as any).retryPlan = retryPlan;
        (this.context as any).currentRetryBatchIndex = 0;

        console.log(`✅ [REPLAN_MISSING] Planned ${retryPlan.length} retry batches for ${totalToRegenerate} usecases`);

        // Broadcast replan completion
        const { inputSocketService } = await import("../../input/domain/input.socket.service");
        if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            inputSocketService.emitIncrementalProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                93,
                "replanning",
                true,
                undefined,
                undefined,
                AgentState.REPLAN_MISSING,
                `Đã lập kế hoạch retry: ${retryPlan.length} batches cho ${totalToRegenerate} usecases còn thiếu`
            );
        }

        // Chuyển sang state tiếp theo
        this.state = AgentState.GENERATE_RETRY;
    }

    /**
     * State: GENERATE_RETRY
     * Generate lại các usecases còn thiếu
     */
    private async generateRetry(): Promise<void> {
        const retryPlan = (this.context as any).retryPlan as BatchPlan[];
        const currentRetryBatchIndex = (this.context as any).currentRetryBatchIndex as number;

        if (!retryPlan || currentRetryBatchIndex === undefined) {
            throw new Error("Cannot generate retry without retry plan");
        }

        const currentBatch = retryPlan[currentRetryBatchIndex];
        if (!currentBatch) {
            // Đã generate hết retry batches → verify lại
            this.state = AgentState.VERIFY_RESULTS;
            return;
        }

        console.log(`🔄 [GENERATE_RETRY] Retry batch ${currentRetryBatchIndex + 1}/${retryPlan.length}...`);

        // Broadcast retry batch start
        const { inputSocketService } = await import("../../input/domain/input.socket.service");
        if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            const retryProgress = 93 + Math.floor(((currentRetryBatchIndex + 1) / retryPlan.length) * 5);
            const currentSavedCount = this.context.savedUsecases?.length || 0;
            inputSocketService.emitIncrementalProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                retryProgress,
                "retrying",
                true,
                {
                    currentBatch: currentBatch.batchNumber,
                    totalBatches: retryPlan.length,
                    usecasesInBatch: 0,
                    savedCount: currentSavedCount, // ✅ Thêm savedCount
                    totalCount: this.context.estimatedCount || 0
                },
                undefined,
                AgentState.GENERATE_RETRY,
                `🔄 Đang retry batch ${currentRetryBatchIndex + 1}/${retryPlan.length} (${currentBatch.batchSize} usecases)...`
            );
        }

        // Tạo prompt đặc biệt cho retry với thông tin về missing/invalid usecases
        const retryPrompt = await this.buildRetryPrompt(currentBatch.batchSize);

        // ✅ FIX: Trong retry, offset bắt đầu từ 0 và estimatedTotal là số usecases cần retry
        const retryOffset = currentBatch.offset; // Đã là 0-based từ replanMissing
        const retryEstimatedTotal = this.context.missingCount! + (this.context.invalidUsecases?.length || 0);

        try {
            // Generate với prompt đặc biệt
            const batchUseCases = await this.gemini.generateUseCasesBatch(
                retryPrompt,
                currentBatch.batchNumber,
                retryPlan.length,
                retryOffset, // ✅ Offset trong retry: 0, 15, 30, ...
                currentBatch.batchSize,
                this.context.language,
                this.context.modelName,
                this.context.userId,
                this.context.projectId,
                retryEstimatedTotal // ✅ Số usecases cần retry (11), không phải tổng số usecases
            );

            if (batchUseCases.length === 0) {
                console.log(`⏩ [GENERATE_RETRY] No use cases generated. Moving to verify.`);
                this.state = AgentState.VERIFY_RESULTS;
                return;
            }

            // Normalize và save batch
            const saved = await this.saveBatch(batchUseCases, currentBatch.batchNumber);

            if (this.context.generatedUsecases) {
                this.context.generatedUsecases.push(...batchUseCases);
            }
            // ✅ savedUsecases đã được cập nhật trong saveBatch, không cần push lại

            // Broadcast retry batch completion (đã được broadcast trong saveBatch với savedCount chính xác)

            // Chuyển sang retry batch tiếp theo hoặc verify
            (this.context as any).currentRetryBatchIndex++;
            if ((this.context as any).currentRetryBatchIndex >= retryPlan.length) {
                this.state = AgentState.VERIFY_RESULTS;
            }
            // Nếu không, tiếp tục generate retry batch tiếp theo (state giữ nguyên)
        } catch (error: any) {
            // ✅ Xử lý lỗi LLM (quota, rate limit, etc.) trong retry
            const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
            const errorInfo = analyzeApiKeyError(error);

            // Kiểm tra xem lỗi có thể retry được không
            if (errorInfo.retryable || errorInfo.type === 'QUOTA_EXCEEDED' || errorInfo.type === 'RATE_LIMIT') {
                console.warn(`⚠️ [GENERATE_RETRY] Retryable error in retry batch ${currentRetryBatchIndex + 1}: ${errorInfo.message}`);

                // Lưu state để có thể resume sau
                const currentSavedCount = await Usecase.countDocuments({ version_id: this.context.versionId });
                this.context.resumeState = {
                    state: AgentState.GENERATE_RETRY,
                    savedCount: currentSavedCount,
                    currentBatchIndex: currentRetryBatchIndex,
                    errorMessage: errorInfo.userFriendlyMessage.vi || errorInfo.message,
                    errorType: errorInfo.type
                };

                // Broadcast lỗi với message hướng dẫn continue
                if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                    const retryProgress = 93 + Math.floor(((currentRetryBatchIndex + 1) / retryPlan.length) * 5);
                    inputSocketService.emitIncrementalProgress(
                        this.context.projectId,
                        this.context.versionId,
                        this.context.userId,
                        retryProgress,
                        "paused", // ✅ Status paused thay vì failed
                        true, // isProcessing = true để có thể continue
                        {
                            currentBatch: currentBatch.batchNumber,
                            totalBatches: retryPlan.length,
                            usecasesInBatch: 0,
                            savedCount: currentSavedCount,
                            totalCount: this.context.estimatedCount || 0
                        },
                        [errorInfo.userFriendlyMessage.vi || errorInfo.message], // errors
                        AgentState.GENERATE_RETRY,
                        `⚠️ ${errorInfo.userFriendlyMessage.vi || errorInfo.message}. Đã lưu ${currentSavedCount}/${this.context.estimatedCount || 0} usecases. Có thể tiếp tục sau...`
                    );
                }

                // Không throw error, để có thể continue sau
                // State giữ nguyên GENERATE_RETRY để có thể retry batch này
                console.log(`💾 [GENERATE_RETRY] State saved. Current progress: ${currentSavedCount}/${this.context.estimatedCount || 0} usecases. Can resume from retry batch ${currentRetryBatchIndex + 1}.`);
                return; // Dừng lại, không throw error
            } else {
                // Lỗi không retry được → throw
                throw error;
            }
        }
    }

    /**
     * Helper: Save batch usecases vào database
     */
    private async saveBatch(batchUseCases: any[], batchNumber: number): Promise<any[]> {
        const version = await Version.findById(this.context.versionId).lean();
        if (!version) throw new Error("Version not found");

        // Normalize actor structure (hỗ trợ cả actor và role - backward compatibility)
        const normalized = this.normalizeActorStructure(batchUseCases);

        // Add related usecases (nếu cần)
        let withRelations = normalized;
        if (normalized.length > 1 || (this.context.mode === 'incremental')) {
            try {
                const previousRequirements = await Usecase.find({ version_id: this.context.versionId }).lean();
                const allForRelations = this.context.mode === 'incremental'
                    ? [...previousRequirements, ...(this.context.savedUsecases || []), ...normalized]
                    : [...(this.context.savedUsecases || []), ...normalized];

                withRelations = await this.gemini.addRelatedUseCases(
                    allForRelations,
                    { incremental: this.context.mode === "incremental" },
                    this.context.language
                );

                if (this.context.mode === 'incremental') {
                    withRelations = withRelations.slice(previousRequirements.length + (this.context.savedUsecases?.length || 0));
                } else {
                    withRelations = withRelations.slice(this.context.savedUsecases?.length || 0);
                }
            } catch (err: any) {
                console.error("⚠️ Error adding related use cases:", err.message);
            }
        }

        // Normalize lại sau khi addRelatedUseCases
        withRelations = this.normalizeActorStructure(withRelations);

        // Map to database format (schema mới)
        const usecasesToCreate = withRelations.map((uc: any) => {
            const relatedIds = (uc.related_usecases || [])
                .filter((id: any) => id && Types.ObjectId.isValid(String(id)))
                .map((id: any) => new Types.ObjectId(String(id)));

            // Normalize actor (thay vì role)
            const actor = uc.actor || uc.role; // Support cả actor và role (backward compatibility)
            const normalizedActor = actor ? {
                id: actor.id || `actor_${(actor.name || 'unknown').toLowerCase().replace(/\s+/g, '_')}`,
                name: actor.name || 'Unknown',
                description: actor.description || ''
            } : {
                id: 'actor_user',
                name: 'Người dùng hệ thống',
                description: 'Người dùng sử dụng hệ thống'
            };

            // Normalize context (object thay vì string)
            const contextObj = typeof uc.context === 'object' ? uc.context : {
                module: uc.context || '',
                scope: '',
                system: ''
            };

            // Normalize trigger (object thay vì array)
            const triggerObj = typeof uc.trigger === 'object' && uc.trigger.event ? uc.trigger : {
                event: Array.isArray(uc.triggers) && uc.triggers.length > 0 ? uc.triggers[0] : 'User initiates action',
                source: 'UI'
            };

            // Normalize main_flow (array of objects)
            let mainFlow = Array.isArray(uc.main_flow) ? uc.main_flow : [];
            if (mainFlow.length === 0 && Array.isArray(uc.tasks) && uc.tasks.length > 0) {
                // Fallback: convert tasks to main_flow steps
                mainFlow = uc.tasks.map((task: string, index: number) => ({
                    step: index + 1,
                    actor: normalizedActor.name,
                    action: task,
                    expected_result: `Task ${index + 1} completed`
                }));
            }

            // Normalize alternative_flows (array of objects)
            const alternativeFlows = Array.isArray(uc.alternative_flows) ? uc.alternative_flows : [];

            // Normalize exceptions (array of objects)
            let exceptions = Array.isArray(uc.exceptions) ? uc.exceptions : [];
            if (exceptions.length === 0 && Array.isArray(uc.exceptions) && typeof uc.exceptions[0] === 'string') {
                // Fallback: convert string array to exception objects
                exceptions = uc.exceptions.map((exc: string, index: number) => ({
                    id: `E${index + 1}`,
                    at_step: mainFlow.length,
                    type: 'System',
                    description: exc,
                    system_response: `Handle exception: ${exc}`
                }));
            }

            // Normalize rules (array of objects)
            let rules = Array.isArray(uc.rules) ? uc.rules : [];
            if (rules.length > 0 && typeof rules[0] === 'string') {
                // Fallback: convert string array to rule objects
                rules = rules.map((rule: string, index: number) => ({
                    id: `R${index + 1}`,
                    description: rule
                }));
            }

            // Normalize inputs (array of objects)
            let inputs = Array.isArray(uc.inputs) ? uc.inputs : [];
            if (inputs.length > 0 && typeof inputs[0] === 'string') {
                // Fallback: convert string array to input objects
                inputs = inputs.map((input: string) => ({
                    name: input,
                    type: 'string',
                    required: true
                }));
            }

            // Normalize outputs (array of objects)
            let outputs = Array.isArray(uc.outputs) ? uc.outputs : [];
            if (outputs.length > 0 && typeof outputs[0] === 'string') {
                // Fallback: convert string array to output objects
                outputs = outputs.map((output: string) => ({
                    name: output,
                    type: 'string',
                    optional: false
                }));
            }

            // Normalize priority và frequency
            const normalizedPriority = (uc.priority && ['low', 'medium', 'high'].includes(uc.priority)) ? uc.priority : 'medium';
            const normalizedFrequency = (uc.frequency && ['low', 'medium', 'high'].includes(uc.frequency)) ? uc.frequency : 'medium';

            // Normalize business_reason (thay vì reason)
            const businessReason = uc.business_reason || uc.reason || uc.goal || 'No reason provided';

            return {
                project_id: version.project_id,
                version_id: new Types.ObjectId(this.context.versionId),
                type: uc.type || 'use_case',
                level: uc.level || 'system',
                status: uc.status || 'active',
                name: uc.name ? uc.name.trim() : '',
                description: uc.description || uc.name || '',
                actor: normalizedActor,
                goal: uc.goal ? uc.goal.trim() : '',
                business_reason: businessReason.trim(),
                context: contextObj,
                priority: normalizedPriority,
                frequency: normalizedFrequency,
                trigger: triggerObj,
                preconditions: Array.isArray(uc.preconditions) ? uc.preconditions : [],
                main_flow: mainFlow,
                alternative_flows: alternativeFlows,
                exceptions: exceptions,
                postconditions: Array.isArray(uc.postconditions) ? uc.postconditions : [],
                rules: rules,
                inputs: inputs,
                outputs: outputs,
                non_functional_constraints: Array.isArray(uc.non_functional_constraints) ? uc.non_functional_constraints : (Array.isArray(uc.constraints) ? uc.constraints : []),
                stakeholders: Array.isArray(uc.stakeholders) ? uc.stakeholders : [],
                related_usecases: relatedIds,
                audit: {
                    created_by: version.created_by || new Types.ObjectId(this.context.userId || ''),
                    created_at: new Date(),
                    updated_by: version.created_by || new Types.ObjectId(this.context.userId || ''),
                    updated_at: new Date()
                }
            };
        });

        // ✅ Check duplicate với usecases đã có trong database
        const existingUsecases = await Usecase.find({ version_id: this.context.versionId })
            .select('name goal')
            .lean();

        // ✅ Normalize tên để so sánh chính xác hơn (loại bỏ multiple spaces, normalize)
        const normalizeName = (name: string): string => {
            if (!name) return '';
            return name
                .toLowerCase()
                .trim()
                .replace(/\s+/g, ' ') // Normalize multiple spaces thành single space
                .replace(/[^\w\s]/g, '') // Loại bỏ ký tự đặc biệt để so sánh
                .trim();
        };

        const existingNames = new Set(existingUsecases.map(uc => normalizeName(uc.name as string)));
        const existingGoals = new Set(existingUsecases.map(uc => normalizeName(uc.goal as string)));

        // ✅ Lưu mapping từ normalized name → original name để hiển thị trong error message
        const existingNamesMap = new Map<string, string>();
        existingUsecases.forEach(uc => {
            const normalized = normalizeName(uc.name as string);
            if (normalized && !existingNamesMap.has(normalized)) {
                existingNamesMap.set(normalized, uc.name as string);
            }
        });

        // Validate và filter
        const validUsecases: any[] = [];
        const invalidUsecases: Array<{ index: number; name: string; errors: string[] }> = [];

        usecasesToCreate.forEach((uc, index) => {
            const errors: string[] = [];
            if (!uc.name || uc.name.trim() === '') errors.push('missing name');
            if (!uc.actor || !uc.actor.id || !uc.actor.name) errors.push('invalid actor');
            if (!uc.goal || uc.goal.trim() === '') errors.push('missing goal');
            if (!uc.main_flow || !Array.isArray(uc.main_flow) || uc.main_flow.length === 0) errors.push('missing main_flow');

            // ✅ Check duplicate: tên hoặc mục đích trùng (sử dụng normalized name)
            const ucNameNormalized = normalizeName(uc.name || '');
            const ucGoalNormalized = normalizeName(uc.goal || '');

            if (ucNameNormalized && existingNames.has(ucNameNormalized)) {
                const existingName = existingNamesMap.get(ucNameNormalized) || ucNameNormalized;
                errors.push(`duplicate name: "${uc.name}" đã tồn tại (trùng với "${existingName}")`);
            }

            if (ucGoalNormalized && existingGoals.has(ucGoalNormalized)) {
                errors.push(`duplicate goal: mục đích "${uc.goal.substring(0, 50)}..." đã tồn tại`);
            }

            if (errors.length > 0) {
                invalidUsecases.push({ index, name: uc.name || `Usecase ${index}`, errors });
                console.warn(`⚠️ [SAVE_BATCH] Skipping usecase ${index + 1} ("${uc.name || 'unnamed'}"): ${errors.join(', ')}`);
            } else {
                validUsecases.push(uc);
                // ✅ Thêm vào set để check duplicate trong cùng batch (sử dụng normalized)
                if (ucNameNormalized) {
                    existingNames.add(ucNameNormalized);
                    if (!existingNamesMap.has(ucNameNormalized)) {
                        existingNamesMap.set(ucNameNormalized, uc.name || '');
                    }
                }
                if (ucGoalNormalized) existingGoals.add(ucGoalNormalized);
            }
        });

        if (validUsecases.length === 0) {
            console.warn(`⚠️ [SAVE_BATCH] All ${usecasesToCreate.length} usecases failed validation in batch ${batchNumber}`);
            return [];
        }

        // Save to database
        try {
            const result = await Usecase.insertMany(validUsecases, { ordered: false });
            console.log(`✅ [SAVE_BATCH] Saved ${result.length} usecases in batch ${batchNumber}`);

            // ✅ Cập nhật savedUsecases trước khi broadcast
            if (!this.context.savedUsecases) {
                this.context.savedUsecases = [];
            }
            this.context.savedUsecases.push(...result);

            // ✅ Query lại từ DB để đảm bảo savedCount chính xác
            const actualSavedCount = await Usecase.countDocuments({ version_id: this.context.versionId });

            // Broadcast progress với savedCount chính xác
            const { inputSocketService } = await import("../../input/domain/input.socket.service");
            if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                const saveProgress = 90 + Math.floor((batchNumber / (this.context.batchPlan?.length || 1)) * 10);
                inputSocketService.emitIncrementalProgress(
                    this.context.projectId,
                    this.context.versionId,
                    this.context.userId,
                    saveProgress,
                    "saving",
                    true,
                    {
                        currentBatch: batchNumber,
                        totalBatches: this.context.batchPlan?.length || 1,
                        usecasesInBatch: result.length,
                        savedCount: actualSavedCount, // ✅ Sử dụng actualSavedCount từ DB
                        totalCount: this.context.estimatedCount || 0
                    },
                    undefined, // errors
                    AgentState.GENERATE_BATCH, // ✅ Thêm agentState
                    `Đã lưu batch ${batchNumber}: ${result.length} usecases (tổng: ${actualSavedCount}/${this.context.estimatedCount || 0})` // ✅ Thêm message
                );
            }

            return result;
        } catch (err: any) {
            console.error(`❌ [SAVE_BATCH] Error saving batch ${batchNumber}:`, err.message);
            if (err.name === 'BulkWriteError' && err.result) {
                const insertedCount = err.result.insertedCount || 0;
                if (insertedCount > 0) {
                    // Lấy các documents đã insert
                    const inserted: any[] = [];
                    for (let i = 0; i < insertedCount; i++) {
                        if (err.result.insertedIds && err.result.insertedIds[i]) {
                            const doc = await Usecase.findById(err.result.insertedIds[i]);
                            if (doc) inserted.push(doc);
                        }
                    }
                    return inserted;
                }
            }
            throw err;
        }
    }

    /**
     * Helper: Perform verification
     */
    private async performVerification(): Promise<VerificationResult> {
        const expectedCount = this.context.estimatedCount || 0;
        const actualCount = await Usecase.countDocuments({ version_id: this.context.versionId });

        // Tính missing count: nếu actual < expected thì có missing
        // Nhưng cũng cần xem xét rằng có thể đã generate đủ nhưng một số bị invalid
        const savedCount = this.context.savedUsecases?.length || 0;
        const missingCount = Math.max(0, expectedCount - actualCount);

        // Kiểm tra invalid usecases (có thể được lưu từ các batch trước)
        const allUsecases = await Usecase.find({ version_id: this.context.versionId }).lean();
        const invalidUsecases: InvalidUsecase[] = [];

        // Validate từng usecase đã lưu
        for (const uc of allUsecases) {
            const errors: string[] = [];
            if (!uc.name || (uc.name as string).trim() === '') errors.push('missing name');
            // Hỗ trợ cả actor (mới) và role (cũ - backward compatibility)
            const actor = (uc as any).actor || (uc as any).role;
            if (!actor || !(actor as any).id || !(actor as any).name) errors.push('invalid actor');
            if (!uc.goal || (uc.goal as string).trim() === '') errors.push('missing goal');
            // Hỗ trợ cả main_flow (mới) và tasks (cũ - backward compatibility)
            const mainFlow = (uc as any).main_flow || (uc as any).tasks;
            if (!mainFlow || !Array.isArray(mainFlow) || mainFlow.length === 0) errors.push('missing main_flow');

            if (errors.length > 0) {
                invalidUsecases.push({
                    name: (uc.name as string) || 'Unnamed',
                    errors,
                    originalData: uc
                });
            }
        }

        // Nếu có invalid usecases, cần regenerate chúng
        // Missing count = expected - (actual - invalid) = expected - actual + invalid
        const effectiveMissingCount = missingCount + invalidUsecases.length;

        return {
            hasMissing: missingCount > 0,
            hasInvalid: invalidUsecases.length > 0,
            missingCount: effectiveMissingCount, // Bao gồm cả invalid cần regenerate
            invalidUsecases,
            totalGenerated: actualCount,
            totalExpected: expectedCount
        };
    }

    /**
     * Helper: Build retry prompt với thông tin về missing/invalid usecases
     */
    private async buildRetryPrompt(batchSize?: number): Promise<string> {
        const missingCount = this.context.missingCount || 0;
        const invalidUsecases = this.context.invalidUsecases || [];
        const totalToRegenerate = missingCount + invalidUsecases.length;

        // ✅ Lấy danh sách usecases đã có để LLM tránh trùng lặp
        const existingUsecases = await Usecase.find({ version_id: this.context.versionId })
            .select('name goal')
            .lean()
            .limit(100); // Giới hạn để không quá dài

        let retryInfo = `**RETRY GENERATION - CẦN GENERATE LẠI CÁC USE CASES CÒN THIẾU/HỢP LỆ**\n\n`;

        retryInfo += `**QUAN TRỌNG**: Đây là batch RETRY để generate lại các usecases còn thiếu. KHÔNG phải tiếp tục từ batch trước.\n\n`;

        if (missingCount > 0) {
            retryInfo += `- Còn thiếu ${missingCount} use case(s) so với estimate ban đầu (${this.context.estimatedCount} use cases)\n`;
            retryInfo += `- Cần generate ${missingCount} use case(s) MỚI để bù vào số lượng còn thiếu\n`;
        }

        if (invalidUsecases.length > 0) {
            retryInfo += `- Có ${invalidUsecases.length} use case(s) bị lỗi validation:\n`;
            invalidUsecases.forEach((uc, idx) => {
                retryInfo += `  ${idx + 1}. "${uc.name}" - Lỗi: ${uc.errors.join(', ')}\n`;
            });
        }

        // ✅ Hiển thị danh sách usecases đã có để LLM tránh trùng lặp
        if (existingUsecases.length > 0) {
            retryInfo += `\n**CÁC USE CASES ĐÃ CÓ (${existingUsecases.length} usecases) - KHÔNG được generate lại:**\n`;
            existingUsecases.slice(0, 50).forEach((uc, idx) => {
                retryInfo += `  ${idx + 1}. "${(uc.name as string) || 'Unnamed'}" - ${((uc.goal as string) || '').substring(0, 60)}...\n`;
            });
            if (existingUsecases.length > 50) {
                retryInfo += `  ... và ${existingUsecases.length - 50} usecases khác\n`;
            }
            retryInfo += `\n**QUAN TRỌNG**: Các usecases bạn generate PHẢI KHÁC với danh sách trên. KHÔNG được trùng lặp về mục đích/chức năng.\n`;
        }

        if (batchSize) {
            retryInfo += `\n**YÊU CẦU CỤ THỂ**:\n`;
            retryInfo += `- Generate CHÍNH XÁC ${batchSize} use case(s) MỚI trong batch retry này\n`;
            retryInfo += `- Tổng cần retry: ${totalToRegenerate} usecases (đã chia thành ${Math.ceil(totalToRegenerate / this.DEFAULT_BATCH_SIZE)} batch(es))\n`;
            retryInfo += `- Mỗi usecase phải có mục đích/chức năng KHÁC với các usecases đã có ở trên\n`;
            retryInfo += `- Đảm bảo các usecases mới bù vào số lượng còn thiếu (${missingCount} usecases)\n`;
            retryInfo += `- KHÔNG generate lại các usecases đã có, dù tên gọi khác nhưng mục đích giống\n`;
        }

        retryInfo += `\n**VĂN BẢN GỐC**:\n${this.context.mergedText}`;

        return retryInfo;
    }

    /**
     * Helper: Normalize actor structure (hỗ trợ cả actor và role - backward compatibility)
     */
    private normalizeActorStructure(useCases: any[]): any[] {
        return useCases.map((uc: any) => {
            // Hỗ trợ cả actor (mới) và role (cũ)
            const actorOrRole = uc.actor || uc.role;
            
            if (!actorOrRole) {
                uc.actor = { id: 'actor_user', name: 'Người dùng hệ thống', description: 'Người dùng sử dụng hệ thống' };
            } else if (typeof actorOrRole === 'string') {
                uc.actor = {
                    id: `actor_${actorOrRole.toLowerCase().replace(/\s+/g, '_')}`,
                    name: actorOrRole,
                    description: ''
                };
            } else if (actorOrRole && typeof actorOrRole === 'object') {
                uc.actor = {
                    id: actorOrRole.id || `actor_${(actorOrRole.name || 'unknown').toLowerCase().replace(/\s+/g, '_')}`,
                    name: actorOrRole.name || 'Unknown',
                    description: actorOrRole.description || ''
                };
            }
            
            // Xóa role cũ nếu có (đã chuyển sang actor)
            if (uc.role && uc.actor) {
                delete uc.role;
            }
            
            return uc;
        });
    }
}

