import { Types } from "mongoose";
import Version from "../../../../../internal/model/version";
import Testcase from "../../../../../internal/model/testcase";
import { TestcaseGeminiService } from "./GeminiService";

/**
 * Agent State Machine cho Testcase Generation
 * 
 * Luồng:
 * ESTIMATE_TESTCASE_COUNT → BATCH_PLANNING → GENERATE_BATCH → VERIFY_RESULTS
 *                                                              ↓
 *                                                         HAS_MISSING_OR_BAD?
 *                                                              ↓
 *                                                         REPLAN_MISSING → GENERATE_RETRY → VERIFY_RESULTS (loop)
 */
export enum TestcaseAgentState {
    ESTIMATE_TESTCASE_COUNT = "ESTIMATE_TESTCASE_COUNT",
    BATCH_PLANNING = "BATCH_PLANNING",
    GENERATE_BATCH = "GENERATE_BATCH",
    VERIFY_RESULTS = "VERIFY_RESULTS",
    REPLAN_MISSING = "REPLAN_MISSING",
    GENERATE_RETRY = "GENERATE_RETRY",
    DONE = "DONE"
}

export interface TestcaseAgentContext {
    versionId: string;
    projectId: string;
    userId: string;
    requirements: any[];
    databaseSchema: any;
    language: string;
    testType: string;
    modelName?: string;

    // Estimate results
    estimatedCount?: number;
    estimatedBatches?: number;
    summary?: string;

    // Batch planning
    batchPlan?: TestcaseBatchPlan[];
    currentBatchIndex?: number;

    // Generation results
    generatedTestcases?: any[];
    savedTestcases?: any[];

    // Verification results
    missingCount?: number;
    invalidTestcases?: InvalidTestcase[];

    // Retry tracking
    retryAttempts?: number;
    maxRetryAttempts?: number;

    // Resume state (khi có lỗi retryable)
    resumeState?: {
        state: TestcaseAgentState;
        savedCount: number;
        currentBatchIndex: number;
        errorMessage: string;
        errorType: string;
    };
}

export interface TestcaseBatchPlan {
    batchNumber: number;
    offset: number;
    batchSize: number;
    targetCount: number;
}

export interface InvalidTestcase {
    title: string;
    errors: string[];
    originalData?: any;
    expectedIndex?: number;
}

export interface TestcaseVerificationResult {
    hasMissing: boolean;
    hasInvalid: boolean;
    missingCount: number;
    invalidTestcases: InvalidTestcase[];
    totalGenerated: number;
    totalExpected: number;
}

export class TestcaseGenerationAgent {
    private gemini: TestcaseGeminiService;
    private context: TestcaseAgentContext;
    private state: TestcaseAgentState;
    private DEFAULT_BATCH_SIZE = 20;
    private MAX_RETRY_ATTEMPTS = 3;

    // ✅ Public getter để truy cập context (đặc biệt là resumeState)
    getContext(): TestcaseAgentContext {
        return this.context;
    }

    getResumeState() {
        return this.context.resumeState;
    }

    constructor(
        gemini: TestcaseGeminiService,
        context: TestcaseAgentContext
    ) {
        this.gemini = gemini;
        this.context = context;

        // ✅ Kiểm tra resume state: nếu có resumeState, tiếp tục từ đó
        if (this.context.resumeState) {
            console.log(`🔄 [TESTCASE_AGENT] Resuming from saved state: ${this.context.resumeState.state}`);
            this.state = this.context.resumeState.state;
            this.context.currentBatchIndex = this.context.resumeState.currentBatchIndex;
            // Restore savedCount từ DB để đảm bảo chính xác
            this.context.savedTestcases = []; // Sẽ được cập nhật lại từ DB
        } else {
            this.state = TestcaseAgentState.ESTIMATE_TESTCASE_COUNT;
        }

        this.context.retryAttempts = 0;
        this.context.maxRetryAttempts = this.MAX_RETRY_ATTEMPTS;
    }

    /**
     * Chạy agent theo state machine
     */
    async run(): Promise<{
        version_id: string;
        testcases: any[];
        totalGenerated: number;
    }> {
        console.log(`🤖 [TESTCASE_AGENT] Starting TestcaseGenerationAgent in state: ${this.state}`);

        // ✅ Nếu resume từ state đã lưu, restore savedTestcases từ DB
        if (this.context.resumeState) {
            const savedCount = await Testcase.countDocuments({ version_id: this.context.versionId });
            console.log(`💾 [TESTCASE_AGENT] Resuming: ${savedCount} testcases already saved. Continuing from batch ${this.context.resumeState.currentBatchIndex + 1}`);

            // Restore savedTestcases count (không cần lấy full data, chỉ cần count)
            this.context.savedTestcases = new Array(savedCount).fill(null); // Placeholder array
        }

        while (this.state !== TestcaseAgentState.DONE) {
            try {
                switch (this.state) {
                    case TestcaseAgentState.ESTIMATE_TESTCASE_COUNT:
                        await this.estimateTestcaseCount();
                        break;

                    case TestcaseAgentState.BATCH_PLANNING:
                        await this.batchPlanning();
                        break;

                    case TestcaseAgentState.GENERATE_BATCH:
                        await this.generateBatch();
                        break;

                    case TestcaseAgentState.VERIFY_RESULTS:
                        await this.verifyResults();
                        break;

                    case TestcaseAgentState.REPLAN_MISSING:
                        await this.replanMissing();
                        break;

                    case TestcaseAgentState.GENERATE_RETRY:
                        await this.generateRetry();
                        break;

                    default:
                        throw new Error(`Unknown state: ${this.state}`);
                }
            } catch (error: any) {
                console.error(`❌ [TESTCASE_AGENT] Error in state ${this.state}:`, error.message);

                // ✅ Nếu có resumeState và lỗi không phải retryable, vẫn throw
                // Nhưng nếu lỗi là retryable và đã được xử lý trong generateBatch/generateRetry, không throw
                const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(error);

                // Nếu lỗi retryable và đã có resumeState, không throw (đã được xử lý)
                if (this.context.resumeState && (errorInfo.retryable || errorInfo.type === 'QUOTA_EXCEEDED' || errorInfo.type === 'RATE_LIMIT')) {
                    console.log(`⚠️ [TESTCASE_AGENT] Retryable error handled. State saved. Can resume later.`);
                    // Trả về partial results
                    const partialTestcases = await Testcase.find({ version_id: this.context.versionId }).lean();
                    return {
                        version_id: this.context.versionId,
                        testcases: partialTestcases,
                        totalGenerated: partialTestcases.length
                    };
                }

                throw error;
            }
        }

        // Lấy final testcases từ database
        const finalTestcases = await Testcase.find({ version_id: this.context.versionId }).lean();
        console.log(`✅ [TESTCASE_AGENT] Completed: ${finalTestcases.length} total test cases`);

        return {
            version_id: this.context.versionId,
            testcases: finalTestcases,
            totalGenerated: this.context.savedTestcases?.length || 0
        };
    }

    /**
     * State: ESTIMATE_TESTCASE_COUNT
     * Ước tính số lượng testcase từ requirements
     */
    private async estimateTestcaseCount(): Promise<void> {
        console.log(`📊 [ESTIMATE] Estimating testcase count...`);

        const { testcaseSocketService } = await import("./testcase.socket.service");
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                10,
                "estimating",
                true,
                undefined, // batchInfo
                undefined, // errors
                TestcaseAgentState.ESTIMATE_TESTCASE_COUNT,
                "Đang ước tính số lượng testcase từ requirements..."
            );
        }

        const estimate = await this.gemini.estimateTestCasesCount(
            this.context.requirements,
            this.context.testType,
            this.context.language,
            this.context.modelName,
            this.context.userId,
            this.context.projectId
        );

        this.context.estimatedCount = estimate.estimated_count;
        this.context.estimatedBatches = estimate.estimated_batches;
        this.context.summary = estimate.summary;

        console.log(`✅ [ESTIMATE] Estimated ${this.context.estimatedCount} test cases, ${this.context.estimatedBatches} batches`);

        // Broadcast estimate
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            testcaseSocketService.emitEstimateReceived(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                estimate
            );

            // Broadcast estimate completion với message
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                15,
                "estimating",
                true,
                undefined,
                undefined,
                TestcaseAgentState.ESTIMATE_TESTCASE_COUNT,
                `Đã ước tính: ${this.context.estimatedCount} testcases, ${this.context.estimatedBatches} batches`
            );
        }

        // Chuyển sang state tiếp theo
        this.state = TestcaseAgentState.BATCH_PLANNING;
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

        const batchPlan: TestcaseBatchPlan[] = [];
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
        this.context.generatedTestcases = [];
        this.context.savedTestcases = [];

        console.log(`✅ [BATCH_PLANNING] Planned ${batchPlan.length} batches`);

        // Broadcast batch planning completion
        const { testcaseSocketService } = await import("./testcase.socket.service");
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                18,
                "planning",
                true,
                undefined,
                undefined,
                TestcaseAgentState.BATCH_PLANNING,
                `Đã lập kế hoạch: ${batchPlan.length} batches`
            );
        }

        // Chuyển sang state tiếp theo
        this.state = TestcaseAgentState.GENERATE_BATCH;
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
            this.state = TestcaseAgentState.VERIFY_RESULTS;
            return;
        }

        console.log(`📦 [GENERATE_BATCH] Generating batch ${currentBatch.batchNumber}/${this.context.batchPlan.length}...`);

        const { testcaseSocketService } = await import("./testcase.socket.service");
        const progress = 20 + Math.floor((currentBatch.batchNumber / this.context.batchPlan.length) * 70);

        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            const currentSavedCount = this.context.savedTestcases?.length || 0;
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                progress,
                "generating",
                true,
                {
                    currentBatch: currentBatch.batchNumber,
                    totalBatches: this.context.batchPlan.length,
                    testcasesInBatch: 0,
                    savedCount: currentSavedCount,
                    totalCount: this.context.estimatedCount || 0
                },
                undefined, // errors
                TestcaseAgentState.GENERATE_BATCH,
                `Đang generate batch ${currentBatch.batchNumber}/${this.context.batchPlan.length} (${currentBatch.batchSize} testcases)...`
            );
        }

        try {
            // ✅ Lấy danh sách testcases đã tồn tại để tránh duplicate
            const existingTestcases = await Testcase.find({ version_id: this.context.versionId })
                .select('title description')
                .lean();
            const existingTitles = existingTestcases.map(tc => (tc.title as string)?.trim()).filter(Boolean);

            // Generate batch với existing titles để tránh duplicate
            const batchTestcases = await this.gemini.generateTestCasesBatch(
                this.context.requirements,
                this.context.databaseSchema,
                currentBatch.batchNumber,
                this.context.batchPlan.length,
                currentBatch.offset,
                currentBatch.batchSize,
                this.context.language,
                this.context.testType,
                this.context.estimatedCount,
                this.context.modelName,
                this.context.userId,
                this.context.projectId,
                existingTitles // ✅ Pass existing titles để tránh duplicate
            );

            if (batchTestcases.length === 0) {
                console.log(`⏩ [GENERATE_BATCH] No more test cases to generate. Moving to verify.`);
                this.state = TestcaseAgentState.VERIFY_RESULTS;
                return;
            }

            // Normalize và save batch
            const saved = await this.saveBatch(batchTestcases, currentBatch.batchNumber);

            if (this.context.generatedTestcases) {
                this.context.generatedTestcases.push(...batchTestcases);
            }

            // Chuyển sang batch tiếp theo hoặc verify
            this.context.currentBatchIndex++;
            if (this.context.currentBatchIndex >= this.context.batchPlan.length) {
                this.state = TestcaseAgentState.VERIFY_RESULTS;
            }
        } catch (error: any) {
            // ✅ Xử lý lỗi LLM (quota, rate limit, etc.)
            const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
            const errorInfo = analyzeApiKeyError(error);

            // Kiểm tra xem lỗi có thể retry được không
            if (errorInfo.retryable || errorInfo.type === 'QUOTA_EXCEEDED' || errorInfo.type === 'RATE_LIMIT') {
                console.warn(`⚠️ [GENERATE_BATCH] Retryable error in batch ${currentBatch.batchNumber}: ${errorInfo.message}`);

                // Lưu state để có thể resume sau
                const currentSavedCount = await Testcase.countDocuments({ version_id: this.context.versionId });
                this.context.resumeState = {
                    state: TestcaseAgentState.GENERATE_BATCH,
                    savedCount: currentSavedCount,
                    currentBatchIndex: this.context.currentBatchIndex,
                    errorMessage: errorInfo.userFriendlyMessage.vi || errorInfo.message,
                    errorType: errorInfo.type
                };

                // Broadcast lỗi với message hướng dẫn continue
                if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                    testcaseSocketService.emitProgress(
                        this.context.projectId,
                        this.context.versionId,
                        this.context.userId,
                        progress,
                        "paused",
                        true,
                        {
                            currentBatch: currentBatch.batchNumber,
                            totalBatches: this.context.batchPlan.length,
                            testcasesInBatch: 0,
                            savedCount: currentSavedCount,
                            totalCount: this.context.estimatedCount || 0
                        },
                        [errorInfo.userFriendlyMessage.vi || errorInfo.message],
                        TestcaseAgentState.GENERATE_BATCH,
                        `⚠️ ${errorInfo.userFriendlyMessage.vi || errorInfo.message}. Đã lưu ${currentSavedCount}/${this.context.estimatedCount || 0} testcases. Có thể tiếp tục sau...`
                    );
                }

                console.log(`💾 [GENERATE_BATCH] State saved. Current progress: ${currentSavedCount}/${this.context.estimatedCount || 0} testcases. Can resume from batch ${currentBatch.batchNumber}.`);
                return;
            } else {
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
        const { testcaseSocketService } = await import("./testcase.socket.service");
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                90,
                "verifying",
                true,
                undefined,
                undefined,
                TestcaseAgentState.VERIFY_RESULTS,
                "Đang kiểm tra kết quả generate..."
            );
        }

        const verification = await this.performVerification();

        console.log(`📊 [VERIFY_RESULTS] Verification complete:`, {
            totalGenerated: verification.totalGenerated,
            totalExpected: verification.totalExpected,
            missingCount: verification.missingCount,
            invalidCount: verification.invalidTestcases.length
        });

        this.context.missingCount = verification.missingCount;
        this.context.invalidTestcases = verification.invalidTestcases;

        // Nếu có missing hoặc invalid → replan và retry
        if (verification.hasMissing || verification.hasInvalid) {
            if (this.context.retryAttempts! >= this.context.maxRetryAttempts!) {
                console.warn(`⚠️ [VERIFY_RESULTS] Max retry attempts (${this.context.maxRetryAttempts}) reached. Stopping.`);

                // Broadcast max retry reached
                if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                    testcaseSocketService.emitProgress(
                        this.context.projectId,
                        this.context.versionId,
                        this.context.userId,
                        95,
                        "verifying",
                        true,
                        undefined,
                        undefined,
                        TestcaseAgentState.VERIFY_RESULTS,
                        `Đã đạt max retry (${this.context.maxRetryAttempts}). Còn thiếu ${verification.missingCount} testcases.`
                    );
                }

                this.state = TestcaseAgentState.DONE;
            } else {
                this.context.retryAttempts!++;
                console.log(`🔄 [VERIFY_RESULTS] Missing/invalid detected. Starting retry attempt ${this.context.retryAttempts}/${this.context.maxRetryAttempts}`);

                // Broadcast retry needed
                if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                    testcaseSocketService.emitProgress(
                        this.context.projectId,
                        this.context.versionId,
                        this.context.userId,
                        92,
                        "verifying",
                        true,
                        undefined,
                        undefined,
                        TestcaseAgentState.VERIFY_RESULTS,
                        `Phát hiện thiếu/invalid: ${verification.missingCount} testcases. Bắt đầu retry lần ${this.context.retryAttempts}/${this.context.maxRetryAttempts}...`
                    );
                }

                this.state = TestcaseAgentState.REPLAN_MISSING;
            }
        } else {
            // Không có missing/invalid → hoàn thành
            console.log(`✅ [VERIFY_RESULTS] All testcases generated successfully!`);

            // Broadcast verification success
            if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                testcaseSocketService.emitProgress(
                    this.context.projectId,
                    this.context.versionId,
                    this.context.userId,
                    95,
                    "verifying",
                    true,
                    undefined,
                    undefined,
                    TestcaseAgentState.VERIFY_RESULTS,
                    `✅ Đã verify thành công: ${verification.totalGenerated}/${verification.totalExpected} testcases`
                );
            }

            this.state = TestcaseAgentState.DONE;
        }
    }

    /**
     * State: REPLAN_MISSING
     * Lập kế hoạch lại cho các testcases còn thiếu
     */
    private async replanMissing(): Promise<void> {
        console.log(`📋 [REPLAN_MISSING] Replanning for missing testcases...`);

        if (!this.context.missingCount && (!this.context.invalidTestcases || this.context.invalidTestcases.length === 0)) {
            this.state = TestcaseAgentState.DONE;
            return;
        }

        const missingCount = this.context.missingCount || 0;
        const invalidCount = this.context.invalidTestcases?.length || 0;
        const totalToRegenerate = missingCount + invalidCount;

        if (totalToRegenerate === 0) {
            this.state = TestcaseAgentState.DONE;
            return;
        }

        // Tạo batch plan mới cho retry
        const retryBatches = Math.ceil(totalToRegenerate / this.DEFAULT_BATCH_SIZE);
        const retryPlan: TestcaseBatchPlan[] = [];

        for (let i = 0; i < retryBatches; i++) {
            const offset = i * this.DEFAULT_BATCH_SIZE;
            const remaining = totalToRegenerate - offset;
            const batchSize = Math.min(this.DEFAULT_BATCH_SIZE, remaining);

            if (batchSize <= 0) break;

            retryPlan.push({
                batchNumber: (this.context.batchPlan?.length || 0) + i + 1,
                offset: offset,
                batchSize,
                targetCount: batchSize
            });
        }

        // Lưu retry plan vào context
        (this.context as any).retryPlan = retryPlan;
        (this.context as any).currentRetryBatchIndex = 0;

        console.log(`✅ [REPLAN_MISSING] Planned ${retryPlan.length} retry batches for ${totalToRegenerate} testcases`);

        // Broadcast replan completion
        const { testcaseSocketService } = await import("./testcase.socket.service");
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                93,
                "replanning",
                true,
                undefined,
                undefined,
                TestcaseAgentState.REPLAN_MISSING,
                `Đã lập kế hoạch retry: ${retryPlan.length} batches cho ${totalToRegenerate} testcases còn thiếu`
            );
        }

        // Chuyển sang state tiếp theo
        this.state = TestcaseAgentState.GENERATE_RETRY;
    }

    /**
     * State: GENERATE_RETRY
     * Generate lại các testcases còn thiếu
     */
    private async generateRetry(): Promise<void> {
        const retryPlan = (this.context as any).retryPlan as TestcaseBatchPlan[];
        const currentRetryBatchIndex = (this.context as any).currentRetryBatchIndex as number;

        if (!retryPlan || currentRetryBatchIndex === undefined) {
            throw new Error("Cannot generate retry without retry plan");
        }

        const currentBatch = retryPlan[currentRetryBatchIndex];
        if (!currentBatch) {
            // Đã generate hết retry batches → verify lại
            this.state = TestcaseAgentState.VERIFY_RESULTS;
            return;
        }

        console.log(`🔄 [GENERATE_RETRY] Retry batch ${currentRetryBatchIndex + 1}/${retryPlan.length}...`);

        // Broadcast retry batch start
        const { testcaseSocketService } = await import("./testcase.socket.service");
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            const retryProgress = 93 + Math.floor(((currentRetryBatchIndex + 1) / retryPlan.length) * 5);
            const currentSavedCount = this.context.savedTestcases?.length || 0;
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                retryProgress,
                "retrying",
                true,
                {
                    currentBatch: currentBatch.batchNumber,
                    totalBatches: retryPlan.length,
                    testcasesInBatch: 0,
                    savedCount: currentSavedCount,
                    totalCount: this.context.estimatedCount || 0
                },
                undefined,
                TestcaseAgentState.GENERATE_RETRY,
                `🔄 Đang retry batch ${currentRetryBatchIndex + 1}/${retryPlan.length} (${currentBatch.batchSize} testcases)...`
            );
        }

        // ✅ FIX: Trong retry, offset bắt đầu từ 0 và estimatedTotal là số testcases cần retry
        const retryOffset = currentBatch.offset;
        const retryEstimatedTotal = this.context.missingCount! + (this.context.invalidTestcases?.length || 0);

        try {
            // ✅ Lấy danh sách testcases đã tồn tại để tránh duplicate
            const existingTestcases = await Testcase.find({ version_id: this.context.versionId })
                .select('title description')
                .lean();
            const existingTitles = existingTestcases.map(tc => (tc.title as string)?.trim()).filter(Boolean);

            // Generate với requirements và databaseSchema gốc, bao gồm existing testcases để tránh duplicate
            const batchTestcases = await this.gemini.generateTestCasesBatch(
                this.context.requirements,
                this.context.databaseSchema,
                currentBatch.batchNumber,
                retryPlan.length,
                retryOffset,
                currentBatch.batchSize,
                this.context.language,
                this.context.testType,
                retryEstimatedTotal,
                this.context.modelName,
                this.context.userId,
                this.context.projectId,
                existingTitles // ✅ Pass existing titles để tránh duplicate
            );

            if (batchTestcases.length === 0) {
                console.log(`⏩ [GENERATE_RETRY] No test cases generated. Moving to verify.`);
                this.state = TestcaseAgentState.VERIFY_RESULTS;
                return;
            }

            // Normalize và save batch
            const saved = await this.saveBatch(batchTestcases, currentBatch.batchNumber);

            if (this.context.generatedTestcases) {
                this.context.generatedTestcases.push(...batchTestcases);
            }

            // Chuyển sang retry batch tiếp theo hoặc verify
            (this.context as any).currentRetryBatchIndex++;
            if ((this.context as any).currentRetryBatchIndex >= retryPlan.length) {
                this.state = TestcaseAgentState.VERIFY_RESULTS;
            }
        } catch (error: any) {
            // ✅ Xử lý lỗi LLM (quota, rate limit, etc.) trong retry
            const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
            const errorInfo = analyzeApiKeyError(error);

            // Kiểm tra xem lỗi có thể retry được không
            if (errorInfo.retryable || errorInfo.type === 'QUOTA_EXCEEDED' || errorInfo.type === 'RATE_LIMIT') {
                console.warn(`⚠️ [GENERATE_RETRY] Retryable error in retry batch ${currentRetryBatchIndex + 1}: ${errorInfo.message}`);

                // Lưu state để có thể resume sau
                const currentSavedCount = await Testcase.countDocuments({ version_id: this.context.versionId });
                this.context.resumeState = {
                    state: TestcaseAgentState.GENERATE_RETRY,
                    savedCount: currentSavedCount,
                    currentBatchIndex: currentRetryBatchIndex,
                    errorMessage: errorInfo.userFriendlyMessage.vi || errorInfo.message,
                    errorType: errorInfo.type
                };

                // Broadcast lỗi với message hướng dẫn continue
                if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                    const retryProgress = 93 + Math.floor(((currentRetryBatchIndex + 1) / retryPlan.length) * 5);
                    testcaseSocketService.emitProgress(
                        this.context.projectId,
                        this.context.versionId,
                        this.context.userId,
                        retryProgress,
                        "paused",
                        true,
                        {
                            currentBatch: currentBatch.batchNumber,
                            totalBatches: retryPlan.length,
                            testcasesInBatch: 0,
                            savedCount: currentSavedCount,
                            totalCount: this.context.estimatedCount || 0
                        },
                        [errorInfo.userFriendlyMessage.vi || errorInfo.message],
                        TestcaseAgentState.GENERATE_RETRY,
                        `⚠️ ${errorInfo.userFriendlyMessage.vi || errorInfo.message}. Đã lưu ${currentSavedCount}/${this.context.estimatedCount || 0} testcases. Có thể tiếp tục sau...`
                    );
                }

                console.log(`💾 [GENERATE_RETRY] State saved. Current progress: ${currentSavedCount}/${this.context.estimatedCount || 0} testcases. Can resume from retry batch ${currentRetryBatchIndex + 1}.`);
                return;
            } else {
                throw error;
            }
        }
    }

    /**
     * Helper: Save batch testcases vào database
     */
    private async saveBatch(batchTestcases: any[], batchNumber: number): Promise<any[]> {
        const version = await Version.findById(this.context.versionId).lean();
        if (!version) throw new Error("Version not found");

        // Map to database format
        const testcasesToCreate = batchTestcases.map((tc: any) => {
            return {
                project_id: version.project_id,
                version_id: new Types.ObjectId(this.context.versionId),
                title: tc.title ? tc.title.trim() : '',
                description: tc.description || '',
                test_type: tc.test_type || this.context.testType,
                source_requirement_ids: Array.isArray(tc.source_requirement_ids)
                    ? tc.source_requirement_ids.map((id: any) => new Types.ObjectId(String(id)))
                    : [],
                priority: tc.priority || 'medium',
                preconditions: Array.isArray(tc.preconditions) ? tc.preconditions : [],
                database_tables: Array.isArray(tc.database_tables) ? tc.database_tables : [],
                database_operations: Array.isArray(tc.database_operations) ? tc.database_operations : [],
                steps: Array.isArray(tc.steps) ? tc.steps : [],
                expected_results: tc.expected_results || {},
                test_data: Array.isArray(tc.test_data) ? tc.test_data : [],
                created_by: version.created_by
            };
        });

        // ✅ Check duplicate với testcases đã có trong database
        const existingTestcases = await Testcase.find({ version_id: this.context.versionId })
            .select('title')
            .lean();

        const existingTitles = new Set(existingTestcases.map(tc => (tc.title as string)?.toLowerCase().trim()));

        // Validate và filter
        const validTestcases: any[] = [];
        const invalidTestcases: Array<{ index: number; title: string; errors: string[] }> = [];

        testcasesToCreate.forEach((tc, index) => {
            const errors: string[] = [];
            if (!tc.title || tc.title.trim() === '') errors.push('missing title');
            if (!tc.steps || !Array.isArray(tc.steps) || tc.steps.length === 0) errors.push('missing steps');

            // ✅ Check duplicate: title trùng
            const tcTitleLower = tc.title?.toLowerCase().trim();
            if (tcTitleLower && existingTitles.has(tcTitleLower)) {
                errors.push(`duplicate title: "${tc.title}" đã tồn tại`);
            }

            if (errors.length > 0) {
                invalidTestcases.push({ index, title: tc.title || `Testcase ${index}`, errors });
                console.warn(`⚠️ [SAVE_BATCH] Skipping testcase ${index + 1} ("${tc.title || 'unnamed'}"): ${errors.join(', ')}`);
            } else {
                validTestcases.push(tc);
                // ✅ Thêm vào set để check duplicate trong cùng batch
                if (tcTitleLower) existingTitles.add(tcTitleLower);
            }
        });

        if (validTestcases.length === 0) {
            console.warn(`⚠️ [SAVE_BATCH] All ${testcasesToCreate.length} testcases failed validation in batch ${batchNumber}`);
            return [];
        }

        // Save to database
        try {
            const result = await Testcase.insertMany(validTestcases, { ordered: false });
            console.log(`✅ [SAVE_BATCH] Saved ${result.length} testcases in batch ${batchNumber}`);

            // ✅ Cập nhật savedTestcases trước khi broadcast
            if (!this.context.savedTestcases) {
                this.context.savedTestcases = [];
            }
            this.context.savedTestcases.push(...result);

            // ✅ Query lại từ DB để đảm bảo savedCount chính xác
            const actualSavedCount = await Testcase.countDocuments({ version_id: this.context.versionId });

            // Broadcast progress với savedCount chính xác
            const { testcaseSocketService } = await import("./testcase.socket.service");
            if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                const saveProgress = 90 + Math.floor((batchNumber / (this.context.batchPlan?.length || 1)) * 10);
                testcaseSocketService.emitProgress(
                    this.context.projectId,
                    this.context.versionId,
                    this.context.userId,
                    saveProgress,
                    "saving",
                    true,
                    {
                        currentBatch: batchNumber,
                        totalBatches: this.context.batchPlan?.length || 1,
                        testcasesInBatch: result.length,
                        savedCount: actualSavedCount,
                        totalCount: this.context.estimatedCount || 0
                    },
                    undefined,
                    TestcaseAgentState.GENERATE_BATCH,
                    `Đã lưu batch ${batchNumber}: ${result.length} testcases (tổng: ${actualSavedCount}/${this.context.estimatedCount || 0})`
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
                            const doc = await Testcase.findById(err.result.insertedIds[i]);
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
    private async performVerification(): Promise<TestcaseVerificationResult> {
        const expectedCount = this.context.estimatedCount || 0;
        const actualCount = await Testcase.countDocuments({ version_id: this.context.versionId });

        const savedCount = this.context.savedTestcases?.length || 0;
        const missingCount = Math.max(0, expectedCount - actualCount);

        // Kiểm tra invalid testcases
        const allTestcases = await Testcase.find({ version_id: this.context.versionId }).lean();
        const invalidTestcases: InvalidTestcase[] = [];

        // Validate từng testcase đã lưu
        for (const tc of allTestcases) {
            const errors: string[] = [];
            if (!tc.title || (tc.title as string).trim() === '') errors.push('missing title');
            if (!tc.steps || !Array.isArray(tc.steps) || tc.steps.length === 0) errors.push('missing steps');

            if (errors.length > 0) {
                invalidTestcases.push({
                    title: (tc.title as string) || 'Unnamed',
                    errors,
                    originalData: tc
                });
            }
        }

        const effectiveMissingCount = missingCount + invalidTestcases.length;

        return {
            hasMissing: missingCount > 0,
            hasInvalid: invalidTestcases.length > 0,
            missingCount: effectiveMissingCount,
            invalidTestcases,
            totalGenerated: actualCount,
            totalExpected: expectedCount
        };
    }
}

