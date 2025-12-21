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
    FINAL_VALIDATION = "FINAL_VALIDATION",
    ATOMIC_SAVE = "ATOMIC_SAVE",
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
    initialTestcaseCount?: number; // ✅ Số lượng testcases đã có sẵn trong DB khi bắt đầu generate
    committedTestcases?: Array<{ // ✅ Danh sách testcases đã cam kết sẽ generate
        index: number;
        title: string; // Placeholder title hoặc title thực tế
        requirementId?: string; // ID của requirement liên quan
        status: 'pending' | 'generating' | 'completed' | 'error'; // Trạng thái
        error?: string; // Lỗi nếu có
    }>;

    // Batch planning
    batchPlan?: TestcaseBatchPlan[];
    currentBatchIndex?: number;

    // Generation results - temp storage (orchestrator-style)
    tempStorage?: Map<string, TempTestcaseEntry>;
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

export interface TempTestcaseEntry {
    status: "generated" | "missing" | "invalid" | "saved"; // ✅ Thêm "saved" để đánh dấu đã lưu vào DB
    data?: any; // Testcase data nếu status = "generated" | "saved"
    error?: string; // Error message nếu status = "missing" | "invalid"
    index?: number; // Index trong batch
}

export interface TestcaseSaveResult {
    totalExpected: number;
    saved: number;
    repairedByLLM: number;
    skipped: number;
    failed: string[];
    savedTestcases?: any[]; // Optional: array of saved testcases
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

                    case TestcaseAgentState.FINAL_VALIDATION:
                        await this.finalValidation();
                        break;

                    case TestcaseAgentState.ATOMIC_SAVE:
                        await this.atomicSave();
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
        const totalGenerated = this.context.savedTestcases?.length || finalTestcases.length;
        console.log(`✅ [TESTCASE_AGENT] Completed: ${totalGenerated} total test cases saved to database`);

        return {
            version_id: this.context.versionId,
            testcases: finalTestcases,
            totalGenerated
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

        // ✅ QUAN TRỌNG: Lưu số lượng testcases đã có sẵn trong DB khi bắt đầu generate
        // Để sau này chỉ tính số lượng testcases mới được thêm vào trong session này
        // Lưu ý: Mỗi lần generate mới (tạo agent mới), initialTestcaseCount sẽ được set lại
        // - Nếu generate thêm: initialTestcaseCount = số testcases hiện tại (bao gồm cả testcases cũ)
        // - Nếu generate lại từ đầu (đã xóa testcases cũ): initialTestcaseCount = 0
        const existingCount = await Testcase.countDocuments({ version_id: this.context.versionId });
        this.context.initialTestcaseCount = existingCount;
        console.log(`📊 [ESTIMATE] Initial testcase count in DB: ${existingCount} (sẽ chỉ tính testcases mới được thêm vào sau thời điểm này)`);

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

        // ✅ Tạo danh sách committed_testcases từ LLM response hoặc fallback về placeholder
        const committedTestcases: Array<{ index: number; title: string; requirementId?: string; status: 'pending' | 'generating' | 'completed' | 'error'; error?: string }> = [];

        if (estimate.committed_testcases && estimate.committed_testcases.length > 0) {
            // ✅ Sử dụng danh sách testcases chi tiết từ LLM
            console.log(`✅ [ESTIMATE] Using ${estimate.committed_testcases.length} committed testcases from LLM (expected ${estimate.estimated_count})`);

            estimate.committed_testcases.forEach((tc, idx) => {
                // Tìm requirement tương ứng nếu có requirement_id
                let requirementId: string | undefined = undefined;
                if (tc.requirement_id) {
                    const req = this.context.requirements.find(r =>
                        String(r._id || r.id) === String(tc.requirement_id)
                    );
                    requirementId = req ? (req._id?.toString() || req.id?.toString()) : undefined;
                }

                // Nếu không có requirement_id, gán cho requirement đầu tiên (fallback)
                if (!requirementId && this.context.requirements.length > 0) {
                    requirementId = this.context.requirements[0]._id?.toString() || this.context.requirements[0].id?.toString();
                }

                committedTestcases.push({
                    index: idx,
                    title: tc.title, // ✅ Title chi tiết từ LLM
                    requirementId,
                    status: 'pending'
                });
            });

            // ✅ QUAN TRỌNG: Điều chỉnh estimated_count để KHỚP CHÍNH XÁC với số lượng từ LLM
            // Đảm bảo không có placeholder nào được tạo thêm
            if (committedTestcases.length !== estimate.estimated_count) {
                console.warn(`⚠️ [ESTIMATE] committed_testcases count (${committedTestcases.length}) doesn't match estimated_count (${estimate.estimated_count}). Adjusting estimated_count to match LLM output.`);
                this.context.estimatedCount = committedTestcases.length;
                this.context.estimatedBatches = Math.ceil(committedTestcases.length / 20);
                console.log(`✅ [ESTIMATE] Adjusted estimated_count to ${committedTestcases.length} to match LLM committed_testcases`);
            }
        } else {
            // ✅ Fallback: Nếu LLM không trả về committed_testcases, KHÔNG tạo placeholder
            // Thay vào đó, để empty list và để LLM generate testcases trong quá trình generate batch
            console.warn(`⚠️ [ESTIMATE] LLM did not return committed_testcases. Will generate testcases during batch generation. Estimated count: ${estimate.estimated_count}`);

            // ✅ KHÔNG tạo placeholder để tránh format không đồng nhất
            // committedTestcases sẽ là empty array []
            this.context.estimatedCount = estimate.estimated_count;
            this.context.estimatedBatches = estimate.estimated_batches;
        }

        // ✅ QUAN TRỌNG: Chỉ set committedTestcases nếu có từ LLM
        // Nếu không có, để empty array để frontend không hiển thị danh sách placeholder
        if (committedTestcases.length > 0) {
            this.context.committedTestcases = committedTestcases;
            console.log(`✅ [ESTIMATE] Created ${committedTestcases.length} committed testcases from LLM`);
        } else {
            this.context.committedTestcases = undefined; // ✅ Không set nếu không có từ LLM
            console.log(`⚠️ [ESTIMATE] No committed testcases from LLM. Frontend will not show testcase list.`);
        }

        console.log(`✅ [ESTIMATE] Estimated ${this.context.estimatedCount} test cases, ${this.context.estimatedBatches} batches`);

        // Broadcast estimate với committedTestcases
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            testcaseSocketService.emitEstimateReceived(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                estimate,
                this.context.committedTestcases // ✅ Emit committedTestcases
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

        // ✅ QUAN TRỌNG: Cập nhật status "generating" TRƯỚC khi emit event
        // Để frontend nhận được status đúng ngay từ đầu
        this.updateCommittedTestcasesStatus(
            currentBatch.offset,
            currentBatch.offset + currentBatch.batchSize - 1,
            'generating'
        );

        const { testcaseSocketService } = await import("./testcase.socket.service");
        const progress = 20 + Math.floor((currentBatch.batchNumber / this.context.batchPlan.length) * 70);

        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            // ✅ QUAN TRỌNG: Chỉ tính số testcases mới được thêm vào trong session này
            const actualSavedCount = await Testcase.countDocuments({ version_id: this.context.versionId });
            const initialCount = this.context.initialTestcaseCount || 0;
            const savedInSession = actualSavedCount - initialCount;

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
                    savedCount: savedInSession, // ✅ Chỉ tính testcases mới trong session này
                    totalCount: this.context.estimatedCount || 0
                },
                undefined, // errors
                TestcaseAgentState.GENERATE_BATCH,
                `Đang generate batch ${currentBatch.batchNumber}/${this.context.batchPlan.length} (${currentBatch.batchSize} testcases)... Đã lưu: ${savedInSession}/${this.context.estimatedCount || 0}`,
                undefined, // shouldRefresh
                this.context.committedTestcases // ✅ Emit committedTestcases với status "generating" đã được cập nhật
            );
        }

        try {
            // ✅ Lấy danh sách testcases đã tồn tại để tránh duplicate
            const existingTestcases = await Testcase.find({ version_id: this.context.versionId })
                .select('title description')
                .lean();
            const existingTitles = existingTestcases.map(tc => (tc.title as string)?.trim()).filter(Boolean);

            // ✅ QUAN TRỌNG: Lấy danh sách committedTestcases cho batch này để đảm bảo order
            const batchCommittedTestcases = this.context.committedTestcases?.slice(
                currentBatch.offset,
                currentBatch.offset + currentBatch.batchSize
            ) || [];
            const batchCommittedTitles = batchCommittedTestcases.map(tc => tc.title);

            // Generate batch với existing titles và committed titles để đảm bảo order
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
                existingTitles, // ✅ Pass existing titles để tránh duplicate
                batchCommittedTitles // ✅ Pass committed titles để đảm bảo order
            );

            if (batchTestcases.length === 0) {
                console.log(`⏩ [GENERATE_BATCH] No more test cases to generate. Moving to verify.`);
                // ✅ Cập nhật status: error (không generate được)
                this.updateCommittedTestcasesStatus(
                    currentBatch.offset,
                    currentBatch.offset + currentBatch.batchSize - 1,
                    'error',
                    undefined,
                    ['No testcases generated']
                );
                this.state = TestcaseAgentState.VERIFY_RESULTS;
                return;
            }

            // ✅ SAVE TO TEMP STORAGE (orchestrator-style)
            await this.saveToTempStorage(batchTestcases, currentBatch.offset, currentBatch.batchNumber);

            // ✅ MỚI: Verify/Refine/Retry batch này ngay dựa vào committed_requirements
            // Theo Flow.md Phase 1: đã có committed_requirements, nên refine/retry từng batch ngay
            await this.verifyAndRetryBatch(currentBatch);

            // ✅ Lưu vào DB sau khi batch đã được verify/refine/retry
            const batchValidTestcases: any[] = [];
            for (let i = 0; i < batchTestcases.length; i++) {
                const globalIndex = currentBatch.offset + i;
                const entry = this.context.tempStorage?.get(String(globalIndex));
                if (entry && entry.status === "generated" && entry.data) {
                    batchValidTestcases.push(entry.data);
                }
            }

            // Lưu vào DB nếu có testcases hợp lệ
            if (batchValidTestcases.length > 0) {
                try {
                    const savedBatch = await this.saveBatch(batchValidTestcases, currentBatch.batchNumber);
                    console.log(`✅ [GENERATE_BATCH] Saved ${savedBatch.length} testcases to DB after batch ${currentBatch.batchNumber}`);

                    // ✅ QUAN TRỌNG: Đánh dấu các testcases đã lưu vào DB trong tempStorage
                    const savedTitles = new Set(savedBatch.map(tc => (tc.title as string)?.toLowerCase().trim()));
                    for (let i = 0; i < batchTestcases.length; i++) {
                        const globalIndex = currentBatch.offset + i;
                        const entry = this.context.tempStorage?.get(String(globalIndex));
                        if (entry && entry.data) {
                            const tcTitle = entry.data.title?.toLowerCase().trim();
                            if (tcTitle && savedTitles.has(tcTitle)) {
                                this.context.tempStorage.set(String(globalIndex), {
                                    ...entry,
                                    status: "saved" as any
                                });
                            }
                        }
                    }

                    // ✅ Cập nhật status: completed cho các testcases đã lưu
                    this.updateCommittedTestcasesStatus(
                        currentBatch.offset,
                        currentBatch.offset + savedBatch.length - 1,
                        'completed',
                        savedBatch
                    );

                    // ✅ Emit event để frontend refresh data với committedTestcases
                    const { testcaseSocketService } = await import("./testcase.socket.service");
                    if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                        // ✅ QUAN TRỌNG: Chỉ tính số testcases mới được thêm vào trong session này
                        const actualSavedCount = await Testcase.countDocuments({ version_id: this.context.versionId });
                        const initialCount = this.context.initialTestcaseCount || 0;
                        const savedInSession = actualSavedCount - initialCount;

                        testcaseSocketService.emitProgress(
                            this.context.projectId,
                            this.context.versionId,
                            this.context.userId,
                            20 + Math.floor((currentBatch.batchNumber / (this.context.batchPlan?.length || 1)) * 70),
                            "saving",
                            true,
                            {
                                currentBatch: currentBatch.batchNumber,
                                totalBatches: this.context.batchPlan?.length || 1,
                                testcasesInBatch: savedBatch.length,
                                savedCount: savedInSession, // ✅ Chỉ tính testcases mới trong session này
                                totalCount: this.context.estimatedCount || 0
                            },
                            undefined,
                            TestcaseAgentState.GENERATE_BATCH,
                            `✅ Đã lưu batch ${currentBatch.batchNumber}: ${savedBatch.length} testcases (tổng: ${savedInSession}/${this.context.estimatedCount || 0})`,
                            true, // ✅ shouldRefresh: true để frontend refresh data
                            this.context.committedTestcases // ✅ Emit committedTestcases với status đã cập nhật
                        );
                    }
                } catch (saveError: any) {
                    console.warn(`⚠️ [GENERATE_BATCH] Failed to save batch ${currentBatch.batchNumber} to DB: ${saveError.message}. Will retry in ATOMIC_SAVE.`);
                }
            }

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
                console.warn(`⚠️ [VERIFY_RESULTS] Max retry attempts (${this.context.maxRetryAttempts}) reached. Saving generated testcases and stopping.`);

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
                        `Đã đạt max retry (${this.context.maxRetryAttempts}). Còn thiếu ${verification.missingCount} testcases. Đang lưu ${verification.totalGenerated} testcases đã generate...`
                    );
                }

                // ✅ FIX: Vẫn save những testcases đã generate được, sau đó mới DONE
                // Chuyển sang FINAL_VALIDATION để validate và save testcases đã có
                this.state = TestcaseAgentState.FINAL_VALIDATION;
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
            // Không có missing/invalid → chuyển sang final validation
            console.log(`✅ [VERIFY_RESULTS] All testcases generated. Moving to final validation.`);

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
                    `✅ Đã verify thành công: ${verification.totalGenerated}/${verification.totalExpected} testcases. Chuyển sang final validation...`
                );
            }

            this.state = TestcaseAgentState.FINAL_VALIDATION;
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
            // ✅ QUAN TRỌNG: Chỉ tính số testcases mới được thêm vào trong session này
            const actualSavedCount = await Testcase.countDocuments({ version_id: this.context.versionId });
            const initialCount = this.context.initialTestcaseCount || 0;
            const savedInSession = actualSavedCount - initialCount;

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
                    savedCount: savedInSession, // ✅ Chỉ tính testcases mới trong session này
                    totalCount: this.context.estimatedCount || 0
                },
                undefined,
                TestcaseAgentState.GENERATE_RETRY,
                `🔄 Đang retry batch ${currentRetryBatchIndex + 1}/${retryPlan.length} (${currentBatch.batchSize} testcases)... Đã lưu: ${savedInSession}/${this.context.estimatedCount || 0}`
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

            // ✅ SAVE TO TEMP STORAGE (orchestrator-style)
            // Tính offset cho retry (cộng với offset ban đầu của batch plan)
            const baseOffset = (this.context.batchPlan?.length || 0) * this.DEFAULT_BATCH_SIZE;
            const retryBatchOffset = baseOffset + currentBatch.offset;
            await this.saveToTempStorage(batchTestcases, retryBatchOffset, currentBatch.batchNumber);

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
     * ✅ NEW: Save batch testcases vào TEMP STORAGE (orchestrator-style)
     */
    private async saveToTempStorage(batchTestcases: any[], offset: number, batchNumber: number): Promise<void> {
        if (!this.context.tempStorage) {
            this.context.tempStorage = new Map();
        }

        const version = await Version.findById(this.context.versionId).lean();
        if (!version) throw new Error("Version not found");

        // Validate và lưu vào temp storage với status
        batchTestcases.forEach((tc: any, index: number) => {
            const globalIndex = offset + index;
            const errors: string[] = [];

            // Validate required fields
            if (!tc.title || (typeof tc.title === 'string' && tc.title.trim() === '')) {
                errors.push('missing title');
            }
            if (!tc.steps || !Array.isArray(tc.steps) || tc.steps.length === 0) {
                errors.push('missing steps');
            }
            if (!tc.test_type || !['integration', 'api', 'ui', 'performance', 'security'].includes(tc.test_type)) {
                errors.push('missing or invalid test_type');
            }

            // Map to database format
            const testcaseData = {
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

            if (errors.length > 0) {
                // Status: invalid
                this.context.tempStorage.set(String(globalIndex), {
                    status: "invalid",
                    error: errors.join(', '),
                    index: globalIndex,
                    data: testcaseData
                });
                console.warn(`⚠️ [TEMP_STORAGE] Batch ${batchNumber}, index ${globalIndex}: invalid - ${errors.join(', ')}`);
            } else {
                // Status: generated
                this.context.tempStorage.set(String(globalIndex), {
                    status: "generated",
                    data: testcaseData,
                    index: globalIndex
                });
            }
        });

        console.log(`✅ [TEMP_STORAGE] Batch ${batchNumber}: Saved ${batchTestcases.length} testcases to temp storage`);

        // Broadcast progress
        const { testcaseSocketService } = await import("./testcase.socket.service");
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            const generatedCount = Array.from(this.context.tempStorage.values()).filter(e => e.status === "generated").length;

            // ✅ QUAN TRỌNG: Query lại từ DB để lấy số testcase đã lưu thực sự (từ các batch trước hoặc lần chạy trước)
            const actualSavedCount = await Testcase.countDocuments({ version_id: this.context.versionId });

            const progress = 20 + Math.floor((batchNumber / (this.context.batchPlan?.length || 1)) * 70);
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                progress,
                "generating",
                true,
                {
                    currentBatch: batchNumber,
                    totalBatches: this.context.batchPlan?.length || 1,
                    testcasesInBatch: batchTestcases.length,
                    savedCount: actualSavedCount, // ✅ Sửa: Dùng số đã lưu thực sự từ DB thay vì số trong temp storage
                    totalCount: this.context.estimatedCount || 0
                },
                undefined,
                TestcaseAgentState.GENERATE_BATCH,
                `Đã generate batch ${batchNumber}: ${batchTestcases.length} testcases (đã lưu: ${actualSavedCount}/${this.context.estimatedCount || 0}, temp storage: ${generatedCount})`,
                undefined, // shouldRefresh
                this.context.committedTestcases // ✅ Emit committedTestcases
            );
        }
    }

    /**
     * State: FINAL_VALIDATION
     * Validate tất cả testcases từ temp storage
     */
    private async finalValidation(): Promise<void> {
        console.log(`🔍 [FINAL_VALIDATION] Validating all testcases from temp storage...`);

        const { testcaseSocketService } = await import("./testcase.socket.service");
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                92,
                "validating",
                true,
                undefined,
                undefined,
                TestcaseAgentState.FINAL_VALIDATION,
                "Đang validate tất cả testcases từ temp storage..."
            );
        }

        if (!this.context.tempStorage) {
            throw new Error("Temp storage not initialized");
        }

        // Validate và check duplicates
        const existingTitles = new Set<string>();
        const validTestcases: any[] = [];
        const invalidEntries: Array<{ index: string; entry: TempTestcaseEntry }> = [];

        // Lấy tất cả testcases đã có trong DB để check duplicate
        const existingTestcases = await Testcase.find({ version_id: this.context.versionId })
            .select('title')
            .lean();
        existingTestcases.forEach(tc => {
            if (tc.title) existingTitles.add((tc.title as string).toLowerCase().trim());
        });

        // Validate từng entry trong temp storage
        for (const [index, entry] of Array.from(this.context.tempStorage.entries())) {
            // ✅ QUAN TRỌNG: Skip những testcases đã lưu vào DB (status = "saved")
            // Chỉ validate những testcases chưa lưu (status = "generated")
            if (entry.status === "generated" && entry.data) {
                const tc = entry.data;
                const errors: string[] = [];

                // Check duplicate title với DB
                const titleLower = (tc.title as string)?.toLowerCase().trim();
                if (titleLower && existingTitles.has(titleLower)) {
                    errors.push(`duplicate title: "${tc.title}"`);
                }

                // Re-validate required fields
                if (!tc.title || (tc.title as string).trim() === '') {
                    errors.push('missing title');
                }
                if (!tc.steps || !Array.isArray(tc.steps) || tc.steps.length === 0) {
                    errors.push('missing steps');
                }

                if (errors.length > 0) {
                    // Mark as invalid
                    entry.status = "invalid";
                    entry.error = errors.join(', ');
                    invalidEntries.push({ index, entry });
                    console.warn(`⚠️ [FINAL_VALIDATION] Testcase at index ${index}: ${errors.join(', ')}`);
                } else {
                    validTestcases.push(tc);
                    if (titleLower) existingTitles.add(titleLower);
                }
            } else if (entry.status === "invalid" || entry.status === "missing") {
                invalidEntries.push({ index, entry });
            }
        }

        console.log(`📊 [FINAL_VALIDATION] Validation complete: ${validTestcases.length} valid, ${invalidEntries.length} invalid/missing`);

        // Update context
        this.context.invalidTestcases = invalidEntries.map(({ entry }) => ({
            title: entry.data?.title || 'Unnamed',
            errors: entry.error ? [entry.error] : ['Unknown error'],
            originalData: entry.data
        }));

        // Broadcast validation result
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                94,
                "validating",
                true,
                undefined,
                undefined,
                TestcaseAgentState.FINAL_VALIDATION,
                `✅ Validate xong: ${validTestcases.length} valid, ${invalidEntries.length} invalid/missing. Chuyển sang atomic save...`
            );
        }

        // Chuyển sang atomic save
        this.state = TestcaseAgentState.ATOMIC_SAVE;
    }

    /**
     * State: ATOMIC_SAVE
     * Insert tất cả testcases hợp lệ vào database một lần (atomic)
     */
    private async atomicSave(): Promise<void> {
        console.log(`💾 [ATOMIC_SAVE] Starting atomic save to database...`);

        const { testcaseSocketService } = await import("./testcase.socket.service");
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                95,
                "saving",
                true,
                undefined,
                undefined,
                TestcaseAgentState.ATOMIC_SAVE,
                "Đang lưu tất cả testcases vào database (atomic insert)..."
            );
        }

        if (!this.context.tempStorage) {
            throw new Error("Temp storage not initialized");
        }

        // ✅ Lấy tất cả testcases có status = "generated" và đã pass validation
        // ✅ QUAN TRỌNG: Chỉ lấy những testcases CHƯA lưu vào DB (để tránh duplicate)
        const existingTestcases = await Testcase.find({ version_id: this.context.versionId })
            .select('title')
            .lean();
        const existingTitles = new Set(existingTestcases.map(tc => (tc.title as string)?.toLowerCase().trim()));

        const validTestcases: any[] = [];
        for (const entry of Array.from(this.context.tempStorage.values())) {
            // ✅ QUAN TRỌNG: Chỉ lấy những testcases chưa lưu vào DB
            // - status = "generated": chưa lưu, cần lưu
            // - status = "saved": đã lưu trong incremental save, skip
            if (entry.status === "generated" && entry.data) {
                // ✅ Check xem đã lưu vào DB chưa (check duplicate title)
                const tcTitle = entry.data.title?.toLowerCase().trim();
                if (!tcTitle || !existingTitles.has(tcTitle)) {
                    validTestcases.push(entry.data);
                } else {
                    console.log(`⏩ [ATOMIC_SAVE] Skipping testcase "${entry.data.title}" - already saved in incremental save`);
                }
            } else if (entry.status === "saved") {
                // Đã lưu trong incremental save, skip
                console.log(`⏩ [ATOMIC_SAVE] Skipping testcase "${entry.data?.title || 'unknown'}" - already saved in incremental save (status: saved)`);
            }
        }

        if (validTestcases.length === 0) {
            console.warn(`⚠️ [ATOMIC_SAVE] No valid testcases to save.`);
            this.state = TestcaseAgentState.DONE;
            return;
        }

        // ✅ QUAN TRỌNG: Query số testcases đã lưu SAU KHI lưu batch mới để tính chính xác
        // Lưu ý: performAtomicSave đã lưu testcases vào DB, nên cần query lại sau khi save
        const saveResult = await this.performAtomicSave(validTestcases);

        // Cập nhật savedTestcases
        this.context.savedTestcases = saveResult.savedTestcases || [];

        // ✅ QUAN TRỌNG: Query lại từ DB sau khi save để lấy số chính xác
        const finalCountAfterSave = await Testcase.countDocuments({ version_id: this.context.versionId });
        const initialCount = this.context.initialTestcaseCount || 0;

        // ✅ Tính tổng số đã lưu trong session này = số testcases hiện tại trong DB - số testcases ban đầu
        const totalSavedCount = finalCountAfterSave - initialCount;

        console.log(`✅ [ATOMIC_SAVE] Save complete:`, {
            totalExpected: saveResult.totalExpected,
            initialCount: initialCount,
            finalCountAfterSave: finalCountAfterSave,
            newlySaved: saveResult.saved,
            totalSavedInSession: totalSavedCount,
            repairedByLLM: saveResult.repairedByLLM,
            skipped: saveResult.skipped,
            failed: saveResult.failed.length
        });

        // ✅ Broadcast completion với flag refresh data
        if (testcaseSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
            // Emit progress trước
            testcaseSocketService.emitProgress(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                98,
                "saving",
                false, // ✅ Đã xong processing
                {
                    currentBatch: this.context.batchPlan?.length || 0,
                    totalBatches: this.context.batchPlan?.length || 0,
                    testcasesInBatch: 0,
                    savedCount: totalSavedCount, // ✅ Sử dụng TỔNG số đã lưu (bao gồm cả trước đó)
                    totalCount: saveResult.totalExpected
                },
                undefined,
                TestcaseAgentState.ATOMIC_SAVE,
                `✅ Đã lưu ${totalSavedCount}/${saveResult.totalExpected} testcases vào database`
            );

            // ✅ Emit completion event với flag refresh
            testcaseSocketService.emitCompletion(
                this.context.projectId,
                this.context.versionId,
                this.context.userId,
                {
                    totalExpected: saveResult.totalExpected,
                    saved: totalSavedCount, // ✅ Sử dụng TỔNG số đã lưu
                    repairedByLLM: saveResult.repairedByLLM,
                    skipped: saveResult.skipped,
                    failed: saveResult.failed.length
                },
                `✅ Đã hoàn thành: ${totalSavedCount}/${saveResult.totalExpected} testcases đã lưu vào database`
            );
        }

        this.state = TestcaseAgentState.DONE;
    }

    /**
     * Helper: Perform atomic save với retry và self-repair
     */
    private async performAtomicSave(validTestcases: any[]): Promise<TestcaseSaveResult> {
        const totalExpected = this.context.estimatedCount || validTestcases.length;
        let savedTestcases: any[] = [];
        let repairedByLLM = 0;
        let skipped = 0;
        const failed: string[] = [];

        try {
            // STEP 1: BATCH INSERT (attempt 1-3)
            let attempt = 1;
            const maxAttempts = 3;
            let insertSuccess = false;

            while (attempt <= maxAttempts && !insertSuccess) {
                try {
                    console.log(`💾 [ATOMIC_SAVE] Attempt ${attempt}/${maxAttempts}: Inserting ${validTestcases.length} testcases...`);
                    const result = await Testcase.insertMany(validTestcases, { ordered: false });
                    savedTestcases = result;
                    insertSuccess = true;
                    console.log(`✅ [ATOMIC_SAVE] Successfully inserted ${result.length} testcases on attempt ${attempt}`);
                } catch (error: any) {
                    console.error(`❌ [ATOMIC_SAVE] Attempt ${attempt} failed:`, error.message);

                    if (attempt === maxAttempts) {
                        // STEP 2: ANALYZE ERRORS
                        if (error.name === 'BulkWriteError' && error.result) {
                            const insertedCount = error.result.insertedCount || 0;
                            const writeErrors = error.result.writeErrors || [];

                            console.log(`📊 [ATOMIC_SAVE] BulkWriteError analysis: ${insertedCount}/${validTestcases.length} inserted, ${writeErrors.length} errors`);

                            // Lấy các testcases đã insert thành công
                            if (insertedCount > 0) {
                                for (let i = 0; i < insertedCount; i++) {
                                    if (error.result.insertedIds && error.result.insertedIds[i]) {
                                        const doc = await Testcase.findById(error.result.insertedIds[i]);
                                        if (doc) savedTestcases.push(doc);
                                    }
                                }
                            }

                            // STEP 3: LLM SELF-REPAIR cho validation errors
                            const validationErrors = writeErrors.filter((e: any) =>
                                e.code === 121 || // Schema validation error
                                e.errmsg?.includes('validation') ||
                                e.errmsg?.includes('required')
                            );

                            if (validationErrors.length > 0 && validationErrors.length <= 10) {
                                console.log(`🔧 [ATOMIC_SAVE] Attempting LLM self-repair for ${validationErrors.length} testcases...`);
                                // TODO: Implement LLM self-repair nếu cần
                                // Hiện tại skip để không làm phức tạp quá
                            }

                            // STEP 4: RETRY INSERT từng cái cho các testcase còn lại
                            const failedIndices = writeErrors.map((e: any) => e.index).filter((i: number) => i != null);
                            const remainingTestcases = validTestcases.filter((_, idx) => !failedIndices.includes(idx));

                            if (remainingTestcases.length > 0) {
                                console.log(`🔄 [ATOMIC_SAVE] Retrying insert for ${remainingTestcases.length} remaining testcases...`);
                                for (const tc of remainingTestcases) {
                                    try {
                                        const doc = new Testcase(tc);
                                        await doc.validate();
                                        const saved = await doc.save();
                                        savedTestcases.push(saved);
                                    } catch (individualError: any) {
                                        console.error(`❌ [ATOMIC_SAVE] Failed to insert testcase "${tc.title}":`, individualError.message);
                                        failed.push(tc.title || 'Unnamed');
                                        skipped++;
                                    }
                                }
                            }

                            // Thêm các testcase failed từ writeErrors
                            writeErrors.forEach((e: any) => {
                                if (e.op && e.op.title) {
                                    failed.push(e.op.title);
                                }
                            });
                        } else {
                            // Nếu không phải BulkWriteError, thử insert từng cái
                            console.log(`🔄 [ATOMIC_SAVE] Non-BulkWriteError, attempting individual inserts...`);
                            for (const tc of validTestcases) {
                                try {
                                    const doc = new Testcase(tc);
                                    await doc.validate();
                                    const saved = await doc.save();
                                    savedTestcases.push(saved);
                                } catch (individualError: any) {
                                    console.error(`❌ [ATOMIC_SAVE] Failed to insert testcase "${tc.title}":`, individualError.message);
                                    failed.push(tc.title || 'Unnamed');
                                    skipped++;
                                }
                            }
                        }
                    }

                    attempt++;
                    if (attempt <= maxAttempts && !insertSuccess) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay giữa các attempt
                    }
                }
            }
        } catch (error: any) {
            console.error(`❌ [ATOMIC_SAVE] Fatal error:`, error.message);
            throw error;
        }

        return {
            totalExpected,
            saved: savedTestcases.length,
            repairedByLLM,
            skipped,
            failed,
            savedTestcases
        };
    }

    /**
     * Helper: Save batch testcases vào database (DEPRECATED - dùng temp storage thay thế)
     * @deprecated Use saveToTempStorage instead
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

            // ✅ QUAN TRỌNG: Chỉ tính số testcases mới được thêm vào trong session này
            const actualSavedCount = await Testcase.countDocuments({ version_id: this.context.versionId });
            const initialCount = this.context.initialTestcaseCount || 0;
            const savedInSession = actualSavedCount - initialCount;

            // Broadcast progress với savedCount chính xác và flag refresh
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
                        savedCount: savedInSession, // ✅ Chỉ tính testcases mới trong session này
                        totalCount: this.context.estimatedCount || 0
                    },
                    undefined,
                    TestcaseAgentState.GENERATE_BATCH,
                    `Đã lưu batch ${batchNumber}: ${result.length} testcases (tổng: ${savedInSession}/${this.context.estimatedCount || 0})`,
                    true, // ✅ shouldRefresh: true để frontend refresh data sau mỗi batch
                    this.context.committedTestcases // ✅ Emit committedTestcases với status đã cập nhật
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
     * ✅ Helper: Cập nhật status của committedTestcases
     */
    private updateCommittedTestcasesStatus(
        startIndex: number,
        endIndex: number,
        status: 'pending' | 'generating' | 'completed' | 'error',
        testcases?: any[], // Testcases đã generate để cập nhật title
        errors?: string[]
    ): void {
        if (!this.context.committedTestcases) return;

        for (let i = startIndex; i <= endIndex && i < this.context.committedTestcases.length; i++) {
            const tc = this.context.committedTestcases[i];
            tc.status = status;

            // Cập nhật title nếu có testcase thực tế
            if (testcases && testcases[i - startIndex]) {
                const actualTc = testcases[i - startIndex];
                if (actualTc.title) {
                    tc.title = actualTc.title;
                }
            }

            // Cập nhật error nếu có
            if (status === 'error' && errors && errors[i - startIndex]) {
                tc.error = errors[i - startIndex];
            } else if (status !== 'error') {
                tc.error = undefined;
            }
        }
    }

    /**
     * ✅ MỚI: Verify và retry một batch cụ thể ngay sau khi generate
     * Theo Flow.md Phase 1: đã có committed_requirements, nên refine/retry từng batch ngay
     */
    private async verifyAndRetryBatch(batch: TestcaseBatchPlan): Promise<void> {
        console.log(`🔍 [VERIFY_BATCH] Verifying batch ${batch.batchNumber}...`);

        const maxRetries = 1; // ✅ Tối đa 1 lần retry cho mỗi batch (theo yêu cầu)
        let retryCount = 0;

        while (retryCount < maxRetries) {
            // Verify batch này
            const batchEntries: Array<[string, TempTestcaseEntry]> = [];
            for (let i = 0; i < batch.batchSize; i++) {
                const globalIndex = batch.offset + i;
                const entry = this.context.tempStorage?.get(String(globalIndex));
                if (entry) {
                    batchEntries.push([String(globalIndex), entry]);
                }
            }

            const missingInBatch: string[] = [];
            const invalidInBatch: Array<{ index: string; entry: TempTestcaseEntry }> = [];

            for (const [index, entry] of batchEntries) {
                if (entry.status === "missing") {
                    missingInBatch.push(index);
                } else if (entry.status === "invalid") {
                    invalidInBatch.push({ index, entry });
                }
            }

            // Nếu batch đã đầy đủ (không có missing/invalid) → xong
            if (missingInBatch.length === 0 && invalidInBatch.length === 0) {
                console.log(`✅ [VERIFY_BATCH] Batch ${batch.batchNumber} is complete. No retry needed.`);
                return;
            }

            // Nếu có missing/invalid và chưa đạt max retries → retry
            if (retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`🔄 [VERIFY_BATCH] Batch ${batch.batchNumber} has ${missingInBatch.length} missing and ${invalidInBatch.length} invalid. Retrying (${retryCount}/${maxRetries})...`);

                // Retry generate cho batch này
                try {
                    const existingTestcases = await Testcase.find({ version_id: this.context.versionId })
                        .select('title description')
                        .lean();
                    const existingTitles = existingTestcases.map(tc => (tc.title as string)?.trim()).filter(Boolean);

                    // Generate lại batch này
                    const retryTestcases = await this.gemini.generateTestCasesBatch(
                        this.context.requirements,
                        this.context.databaseSchema,
                        batch.batchNumber,
                        this.context.batchPlan?.length || 1,
                        batch.offset,
                        batch.batchSize,
                        this.context.language,
                        this.context.testType,
                        this.context.estimatedCount,
                        this.context.modelName,
                        this.context.userId,
                        this.context.projectId,
                        existingTitles
                    );

                    // Lưu lại vào temp storage
                    await this.saveToTempStorage(retryTestcases, batch.offset, batch.batchNumber);
                } catch (retryError: any) {
                    console.warn(`⚠️ [VERIFY_BATCH] Retry ${retryCount} failed for batch ${batch.batchNumber}: ${retryError.message}`);
                    // Cập nhật status: error cho các testcases trong batch
                    const errorMessages = Array(batch.batchSize).fill(retryError.message);
                    this.updateCommittedTestcasesStatus(
                        batch.offset,
                        batch.offset + batch.batchSize - 1,
                        'error',
                        undefined,
                        errorMessages
                    );
                    // Tiếp tục loop để retry lần sau hoặc bỏ qua nếu đã đạt max
                }
            } else {
                // Đã đạt max retries → đánh dấu error và tiếp tục
                console.warn(`⚠️ [VERIFY_BATCH] Batch ${batch.batchNumber} still has ${missingInBatch.length} missing and ${invalidInBatch.length} invalid after ${maxRetries} retries. Continuing...`);
                // Cập nhật status: error cho các testcases còn thiếu/invalid
                const errorMessages: string[] = [];
                for (const index of missingInBatch) {
                    errorMessages.push('Missing testcase');
                }
                for (const { index } of invalidInBatch) {
                    errorMessages.push('Invalid testcase');
                }
                this.updateCommittedTestcasesStatus(
                    batch.offset,
                    batch.offset + batch.batchSize - 1,
                    'error',
                    undefined,
                    errorMessages
                );
                return;
            }
        }
    }

    /**
     * Helper: Perform verification (đọc từ temp storage thay vì DB)
     */
    private async performVerification(): Promise<TestcaseVerificationResult> {
        const expectedCount = this.context.estimatedCount || 0;

        if (!this.context.tempStorage) {
            // Nếu chưa có temp storage, fallback về cách cũ (từ DB)
            const actualCount = await Testcase.countDocuments({ version_id: this.context.versionId });
            const missingCount = Math.max(0, expectedCount - actualCount);

            return {
                hasMissing: missingCount > 0,
                hasInvalid: false,
                missingCount,
                invalidTestcases: [],
                totalGenerated: actualCount,
                totalExpected: expectedCount
            };
        }

        // ✅ QUAN TRỌNG: Đếm từ DB thực tế thay vì chỉ từ temp storage
        // Vì sau khi save batch, các entry đã được đánh dấu là "saved" nên không còn status "generated"
        const actualSavedCount = await Testcase.countDocuments({ version_id: this.context.versionId });

        // ✅ QUAN TRỌNG: Chỉ tính số testcases đã lưu trong session này (không tính testcases cũ)
        const initialCount = this.context.initialTestcaseCount || 0;
        const savedInSession = actualSavedCount - initialCount;

        // Đếm từ temp storage (bao gồm cả "generated" và "saved")
        const generatedCount = Array.from(this.context.tempStorage.values()).filter(e =>
            e.status === "generated" || e.status === "saved"
        ).length;
        const invalidCount = Array.from(this.context.tempStorage.values()).filter(e => e.status === "invalid").length;

        // ✅ Sử dụng savedInSession (chỉ tính testcases trong session này) thay vì actualSavedCount
        const missingCount = Math.max(0, expectedCount - savedInSession);

        const invalidTestcases: InvalidTestcase[] = [];
        for (const entry of Array.from(this.context.tempStorage.values())) {
            if (entry.status === "invalid") {
                invalidTestcases.push({
                    title: entry.data?.title || 'Unnamed',
                    errors: entry.error ? [entry.error] : ['Unknown error'],
                    originalData: entry.data
                });
            }
        }

        const effectiveMissingCount = missingCount + invalidCount;

        return {
            hasMissing: missingCount > 0,
            hasInvalid: invalidCount > 0,
            missingCount: effectiveMissingCount,
            invalidTestcases,
            totalGenerated: savedInSession, // ✅ Chỉ tính số testcases mới được thêm vào trong session này
            totalExpected: expectedCount
        };
    }
}

