import { Types } from "mongoose";
import Version from "../../../../../internal/model/version";
import Usecase from "../../../../../internal/model/usecase";
import { GeminiService } from "./GeminiService";

/**
 * Usecase Generation Agent V2
 * 
 * Luồng mới:
 * PHASE 1: ESTIMATE_WITH_COMMITMENT - LLM cam kết danh sách usecase sẽ gen
 * PHASE 2: BATCH_PLANNING - Chia committed_usecases thành batches
 * PHASE 3: GENERATE_BATCHES - Gen chi tiết từng batch, lưu vào temp storage
 * PHASE 4: RETRY_MISSING - Retry các usecase bị missing/invalid
 * PHASE 5: FINAL_VALIDATION - Validate toàn bộ trước khi save
 * PHASE 6: ATOMIC_SAVE - Save 1 lần vào DB với retry + LLM repair
 */

export enum AgentStateV2 {
    ESTIMATE_WITH_COMMITMENT = "ESTIMATE_WITH_COMMITMENT",
    BATCH_PLANNING = "BATCH_PLANNING",
    GENERATE_BATCH = "GENERATE_BATCH",
    RETRY_MISSING = "RETRY_MISSING",
    FINAL_VALIDATION = "FINAL_VALIDATION",
    ATOMIC_SAVE = "ATOMIC_SAVE",
    DONE = "DONE"
}

// Committed usecase từ estimate
export interface CommittedUsecase {
    key: string;        // UC001, UC002, ...
    name: string;       // Tên usecase
    desc: string;       // Mô tả ngắn
    module?: string;    // Module thuộc về
}

// Temp storage entry
export interface TempStorageEntry {
    status: 'pending' | 'generated' | 'missing' | 'invalid' | 'repaired';
    committed: CommittedUsecase;
    generated?: any;    // Full usecase data
    error?: string;
    retryCount: number;
}

// Estimate result với commitment
export interface EstimateWithCommitment {
    estimated_count: number;
    summary: string;
    committed_usecases: CommittedUsecase[];
}

// Batch plan V2
export interface BatchPlanV2 {
    batchNumber: number;
    keys: string[];     // ["UC001", "UC002", ...]
    usecases: CommittedUsecase[];
}

// Save result
export interface SaveResult {
    success: boolean;
    total_expected: number;
    saved: number;
    repaired_by_llm: number;
    skipped: number;
    failed: Array<{ key: string; error: string; data: any }>;
}

// Agent context V2
export interface AgentContextV2 {
    versionId: string;
    mergedText: string;
    language: string;
    mode: "full" | "incremental";
    modelName?: string;
    userId?: string;
    projectId?: string;

    // Phase 1: Estimate with commitment
    estimateResult?: EstimateWithCommitment;

    // Phase 2: Batch planning
    batchPlan?: BatchPlanV2[];
    currentBatchIndex?: number;

    // Phase 3-4: Temp storage
    tempStorage: Map<string, TempStorageEntry>;

    // Phase 4: Retry tracking
    retryAttempts: number;
    maxRetryAttempts: number;

    // Phase 6: Save result
    saveResult?: SaveResult;

    // Resume state
    resumeState?: {
        state: AgentStateV2;
        currentBatchIndex: number;
        errorMessage: string;
        errorType: string;
    };
}

export class UsecaseGenerationAgentV2 {
    private gemini: GeminiService;
    private context: AgentContextV2;
    private state: AgentStateV2;
    private DEFAULT_BATCH_SIZE = 15;
    private MAX_RETRY_ATTEMPTS = 10; // ✅ Tăng lên 10 để đảm bảo retry đủ
    private MAX_REPAIR_ATTEMPTS = 2;

    constructor(gemini: GeminiService, initialContext: Partial<AgentContextV2>) {
        this.gemini = gemini;
        this.context = {
            versionId: initialContext.versionId || '',
            mergedText: initialContext.mergedText || '',
            language: initialContext.language || 'vi-VN',
            mode: initialContext.mode || 'full',
            modelName: initialContext.modelName,
            userId: initialContext.userId,
            projectId: initialContext.projectId,
            tempStorage: new Map(),
            retryAttempts: 0,
            maxRetryAttempts: this.MAX_RETRY_ATTEMPTS,
            ...initialContext
        };

        // Resume từ state đã lưu nếu có
        if (this.context.resumeState) {
            console.log(`🔄 [AGENT_V2] Resuming from: ${this.context.resumeState.state}`);
            this.state = this.context.resumeState.state;
            this.context.currentBatchIndex = this.context.resumeState.currentBatchIndex;
        } else {
            this.state = AgentStateV2.ESTIMATE_WITH_COMMITMENT;
        }
    }

    // Public getters
    getContext(): AgentContextV2 {
        return this.context;
    }

    getResumeState() {
        return this.context.resumeState;
    }

    getTempStorage(): Map<string, TempStorageEntry> {
        return this.context.tempStorage;
    }

    /**
     * Main run loop
     */
    async run(): Promise<{
        version_id: string;
        usecases: any[];
        totalGenerated: number;
        saveResult: SaveResult;
    }> {
        console.log(`🤖 [AGENT_V2] Starting in state: ${this.state}`);

        while (this.state !== AgentStateV2.DONE) {
            try {
                switch (this.state) {
                    case AgentStateV2.ESTIMATE_WITH_COMMITMENT:
                        await this.phase1_estimateWithCommitment();
                        break;

                    case AgentStateV2.BATCH_PLANNING:
                        await this.phase2_batchPlanning();
                        break;

                    case AgentStateV2.GENERATE_BATCH:
                        await this.phase3_generateBatch();
                        break;

                    case AgentStateV2.RETRY_MISSING:
                        await this.phase4_retryMissing();
                        break;

                    case AgentStateV2.FINAL_VALIDATION:
                        await this.phase5_finalValidation();
                        break;

                    case AgentStateV2.ATOMIC_SAVE:
                        await this.phase6_atomicSave();
                        break;

                    default:
                        throw new Error(`Unknown state: ${this.state}`);
                }
            } catch (error: any) {
                console.error(`❌ [AGENT_V2] Error in ${this.state}:`, error.message);
                await this.handleError(error);
            }
        }

        // Get final usecases from DB
        const finalUsecases = await Usecase.find({ version_id: this.context.versionId }).lean();

        return {
            version_id: this.context.versionId,
            usecases: finalUsecases,
            totalGenerated: finalUsecases.length,
            saveResult: this.context.saveResult || {
                success: true,
                total_expected: this.context.estimateResult?.estimated_count || 0,
                saved: finalUsecases.length,
                repaired_by_llm: 0,
                skipped: 0,
                failed: []
            }
        };
    }

    /**
     * PHASE 1: Estimate với commitment - LLM cam kết danh sách usecase
     */
    private async phase1_estimateWithCommitment(): Promise<void> {
        console.log(`📊 [PHASE 1] Estimating with commitment...`);
        await this.broadcastProgress(10, "estimating", "Đang ước tính usecases...");

        const result = await this.gemini.estimateWithCommitment(
            this.context.mergedText,
            this.context.language,
            this.context.modelName,
            this.context.userId,
            this.context.projectId
        );

        this.context.estimateResult = result;

        // Initialize temp storage với committed usecases
        result.committed_usecases.forEach(uc => {
            this.context.tempStorage.set(uc.key, {
                status: 'pending',
                committed: uc,
                retryCount: 0
            });
        });

        console.log(`✅ [PHASE 1] Committed ${result.committed_usecases.length} usecases`);
        await this.broadcastProgress(15, "estimating",
            `Đã cam kết ${result.committed_usecases.length} usecases: ${result.summary}`);

        // Broadcast estimate
        await this.broadcastEstimate(result);

        this.state = AgentStateV2.BATCH_PLANNING;
    }

    /**
     * PHASE 2: Batch planning - Chia committed usecases thành batches
     */
    private async phase2_batchPlanning(): Promise<void> {
        console.log(`📋 [PHASE 2] Planning batches...`);

        if (!this.context.estimateResult) {
            throw new Error("No estimate result for batch planning");
        }

        const committed = this.context.estimateResult.committed_usecases;
        const batchPlan: BatchPlanV2[] = [];

        for (let i = 0; i < committed.length; i += this.DEFAULT_BATCH_SIZE) {
            const batchUsecases = committed.slice(i, i + this.DEFAULT_BATCH_SIZE);
            batchPlan.push({
                batchNumber: batchPlan.length + 1,
                keys: batchUsecases.map(uc => uc.key),
                usecases: batchUsecases
            });
        }

        this.context.batchPlan = batchPlan;
        this.context.currentBatchIndex = 0;

        console.log(`✅ [PHASE 2] Planned ${batchPlan.length} batches`);
        await this.broadcastProgress(18, "planning", `Đã lập kế hoạch ${batchPlan.length} batches`);

        this.state = AgentStateV2.GENERATE_BATCH;
    }

    /**
     * PHASE 3: Generate batches - Gen chi tiết từng batch
     */
    private async phase3_generateBatch(): Promise<void> {
        if (!this.context.batchPlan || this.context.currentBatchIndex === undefined) {
            throw new Error("No batch plan");
        }

        const currentBatch = this.context.batchPlan[this.context.currentBatchIndex];
        if (!currentBatch) {
            // Đã gen hết batches
            this.state = AgentStateV2.RETRY_MISSING;
            return;
        }

        console.log(`📦 [PHASE 3] Generating batch ${currentBatch.batchNumber}/${this.context.batchPlan.length}...`);
        const progress = 20 + Math.floor((currentBatch.batchNumber / this.context.batchPlan.length) * 50);
        await this.broadcastProgress(progress, "generating",
            `Đang generate batch ${currentBatch.batchNumber}/${this.context.batchPlan.length} (${currentBatch.keys.length} usecases)...`);

        try {
            // Gen chi tiết cho batch này
            const generatedUsecases = await this.gemini.generateBatchFromCommitment(
                this.context.mergedText,
                currentBatch.usecases,
                currentBatch.batchNumber,
                this.context.batchPlan.length,
                this.context.language,
                this.context.modelName,
                this.context.userId,
                this.context.projectId
            );

            // Update temp storage
            let generatedCount = 0;
            let missingCount = 0;

            for (const committed of currentBatch.usecases) {
                // ✅ Cải thiện matching: ưu tiên key, sau đó name, cuối cùng là fuzzy match
                let generated = generatedUsecases.find((uc: any) => uc.key === committed.key);

                if (!generated) {
                    // Match by name (exact hoặc contains)
                    generated = generatedUsecases.find((uc: any) => {
                        const ucName = uc.name?.toLowerCase() || '';
                        const committedName = committed.name.toLowerCase();
                        return ucName === committedName ||
                            ucName.includes(committedName.substring(0, 20)) ||
                            committedName.includes(ucName.substring(0, 20));
                    });
                }

                if (!generated && generatedUsecases.length > 0) {
                    // ✅ Fallback: lấy usecase đầu tiên chưa được match (nếu số lượng khớp)
                    const matchedKeys = new Set();
                    currentBatch.usecases.forEach(c => {
                        const matched = generatedUsecases.find(uc => uc.key === c.key);
                        if (matched) matchedKeys.add(matched.key || matched.name);
                    });
                    generated = generatedUsecases.find(uc => !matchedKeys.has(uc.key || uc.name));
                }

                const entry = this.context.tempStorage.get(committed.key);
                if (entry) {
                    if (generated) {
                        entry.status = 'generated';
                        entry.generated = this.normalizeUsecase(generated, committed);
                        generatedCount++;
                    } else {
                        entry.status = 'missing';
                        entry.error = 'Not found in LLM response';
                        missingCount++;
                    }
                }
            }

            console.log(`✅ [PHASE 3] Batch ${currentBatch.batchNumber}: ${generatedCount} generated, ${missingCount} missing`);
            await this.broadcastProgress(progress + 5, "saving",
                `Batch ${currentBatch.batchNumber}: ${generatedCount} generated, ${missingCount} missing`);

            // Next batch
            this.context.currentBatchIndex++;

        } catch (error: any) {
            await this.handleBatchError(error, currentBatch);
        }
    }

    /**
     * PHASE 4: Retry missing - Retry các usecase bị missing/invalid
     */
    private async phase4_retryMissing(): Promise<void> {
        console.log(`🔄 [PHASE 4] Checking for missing usecases...`);

        // Collect missing/invalid
        const missingEntries: TempStorageEntry[] = [];
        this.context.tempStorage.forEach((entry, key) => {
            if (entry.status === 'missing' || entry.status === 'invalid') {
                missingEntries.push(entry);
            }
        });

        if (missingEntries.length === 0) {
            console.log(`✅ [PHASE 4] No missing usecases`);
            this.state = AgentStateV2.FINAL_VALIDATION;
            return;
        }

        // ✅ Kiểm tra: nếu đã retry nhiều lần nhưng vẫn thiếu, cảnh báo và tiếp tục retry với LLM (không dùng mock data)
        if (this.context.retryAttempts >= this.context.maxRetryAttempts) {
            console.warn(`⚠️ [PHASE 4] Max retry attempts (${this.context.maxRetryAttempts}) reached. ${missingEntries.length} still missing.`);
            console.warn(`⚠️ [PHASE 4] Attempting final LLM retry with enhanced prompt...`);

            // ✅ Final retry: Gọi LLM một lần nữa với prompt đặc biệt (KHÔNG dùng mock data)
            try {
                const missingCommitted = missingEntries.map(e => e.committed);

                // Lấy danh sách usecases đã có để blacklist
                const existingUsecases = Array.from(this.context.tempStorage.values())
                    .filter(e => e.status === 'generated' || e.status === 'repaired')
                    .map(e => ({ key: e.committed.key, name: e.committed.name }));

                const finalRetriedUsecases = await this.gemini.retryGenerateMissingWithBlacklist(
                    this.context.mergedText,
                    missingCommitted,
                    existingUsecases, // ✅ Blacklist để tránh trùng lặp
                    this.context.language,
                    this.context.modelName,
                    this.context.userId,
                    this.context.projectId
                );

                // Update temp storage
                let finalRecoveredCount = 0;
                for (const committed of missingCommitted) {
                    const retried = finalRetriedUsecases.find((uc: any) =>
                        uc.key === committed.key ||
                        uc.name?.toLowerCase() === committed.name.toLowerCase()
                    );

                    const entry = this.context.tempStorage.get(committed.key);
                    if (entry && retried) {
                        entry.status = 'generated';
                        entry.generated = this.normalizeUsecase(retried, committed);
                        entry.retryCount++;
                        finalRecoveredCount++;
                    }
                }

                console.log(`✅ [PHASE 4] Final retry recovered ${finalRecoveredCount}/${missingCommitted.length} usecases`);
            } catch (error: any) {
                console.error(`❌ [PHASE 4] Final retry failed:`, error.message);
            }

            // Check lại sau final retry
            const stillMissingAfterFinalRetry = Array.from(this.context.tempStorage.values())
                .filter(e => e.status === 'missing' || e.status === 'invalid').length;

            if (stillMissingAfterFinalRetry > 0) {
                console.error(`❌ [PHASE 4] After ${this.context.maxRetryAttempts} retries + final LLM retry, ${stillMissingAfterFinalRetry} usecases still missing. Proceeding with validation.`);
            }

            this.state = AgentStateV2.FINAL_VALIDATION;
            return;
        }

        this.context.retryAttempts++;
        console.log(`🔄 [PHASE 4] Retry attempt ${this.context.retryAttempts}/${this.context.maxRetryAttempts} for ${missingEntries.length} usecases`);
        await this.broadcastProgress(75, "retrying",
            `Retry lần ${this.context.retryAttempts}: ${missingEntries.length} usecases còn thiếu`);

        // Retry generate cho missing usecases
        const missingCommitted = missingEntries.map(e => e.committed);

        try {
            const retriedUsecases = await this.gemini.retryGenerateMissing(
                this.context.mergedText,
                missingCommitted,
                this.context.language,
                this.context.modelName,
                this.context.userId,
                this.context.projectId
            );

            // Update temp storage
            let recoveredCount = 0;
            console.log(`🔍 [PHASE 4] Retry returned ${retriedUsecases.length} usecases, looking for ${missingCommitted.length} missing...`);

            for (const committed of missingCommitted) {
                const retried = retriedUsecases.find((uc: any) =>
                    uc.key === committed.key ||
                    uc.name?.toLowerCase().includes(committed.name.toLowerCase().substring(0, 20))
                );

                if (!retried) {
                    console.warn(`⚠️ [PHASE 4] Not found retried usecase for committed: ${committed.key} - "${committed.name}"`);
                    // Log available keys/names from retried
                    if (retriedUsecases.length > 0) {
                        console.log(`   Available retried keys: ${retriedUsecases.map((uc: any) => uc.key || 'NO_KEY').join(', ')}`);
                        console.log(`   Available retried names: ${retriedUsecases.map((uc: any) => uc.name || 'NO_NAME').slice(0, 3).join(', ')}...`);
                    }
                    continue;
                }

                const entry = this.context.tempStorage.get(committed.key);
                if (entry && retried) {
                    entry.status = 'generated';
                    entry.generated = this.normalizeUsecase(retried, committed);
                    entry.retryCount++;
                    recoveredCount++;
                    console.log(`✅ [PHASE 4] Recovered usecase: ${committed.key} - "${committed.name}"`);
                } else if (!entry) {
                    console.warn(`⚠️ [PHASE 4] Entry not found in tempStorage for key: ${committed.key}`);
                }
            }

            console.log(`✅ [PHASE 4] Recovered ${recoveredCount}/${missingEntries.length} usecases`);

        } catch (error: any) {
            console.error(`❌ [PHASE 4] Retry failed:`, error.message);
        }

        // Check lại xem còn missing không
        const stillMissing = Array.from(this.context.tempStorage.values())
            .filter(e => e.status === 'missing' || e.status === 'invalid').length;

        if (stillMissing > 0 && this.context.retryAttempts < this.context.maxRetryAttempts) {
            // Tiếp tục retry
            return;
        }

        this.state = AgentStateV2.FINAL_VALIDATION;
    }

    /**
     * ❌ REMOVED: Fallback generation với mock data - không còn sử dụng
     * Thay vào đó, luôn gọi LLM với blacklist để đảm bảo không trùng lặp và dùng thông tin từ LLM
     */

    /**
     * PHASE 5: Final validation - Validate toàn bộ trước khi save
     */
    private async phase5_finalValidation(): Promise<void> {
        console.log(`🔍 [PHASE 5] Final validation...`);
        await this.broadcastProgress(85, "validating", "Đang validate toàn bộ usecases...");

        const version = await Version.findById(this.context.versionId).lean();
        if (!version) throw new Error("Version not found");

        let validCount = 0;
        let invalidCount = 0;

        // Validate từng usecase
        this.context.tempStorage.forEach((entry, key) => {
            if (entry.status !== 'generated' && entry.status !== 'repaired') {
                return;
            }

            const errors = this.validateUsecase(entry.generated);
            if (errors.length > 0) {
                entry.status = 'invalid';
                entry.error = errors.join(', ');
                invalidCount++;
            } else {
                // Add project_id, version_id
                entry.generated.project_id = version.project_id;
                entry.generated.version_id = new Types.ObjectId(this.context.versionId);
                validCount++;
            }
        });

        console.log(`✅ [PHASE 5] Validation complete: ${validCount} valid, ${invalidCount} invalid`);
        await this.broadcastProgress(88, "validating",
            `Validation: ${validCount} valid, ${invalidCount} invalid`);

        this.state = AgentStateV2.ATOMIC_SAVE;
    }

    /**
     * PHASE 6: Atomic save - Save với retry + LLM repair
     */
    private async phase6_atomicSave(): Promise<void> {
        console.log(`💾 [PHASE 6] Atomic save to database...`);
        await this.broadcastProgress(90, "saving", "Đang lưu vào database...");

        // Collect valid usecases
        const validUsecases: any[] = [];
        this.context.tempStorage.forEach((entry, key) => {
            if (entry.status === 'generated' || entry.status === 'repaired') {
                if (entry.generated) {
                    validUsecases.push({ ...entry.generated, _tempKey: key });
                }
            }
        });

        if (validUsecases.length === 0) {
            console.warn(`⚠️ [PHASE 6] No valid usecases to save`);
            this.context.saveResult = {
                success: false,
                total_expected: this.context.estimateResult?.estimated_count || 0,
                saved: 0,
                repaired_by_llm: 0,
                skipped: 0,
                failed: []
            };
            this.state = AgentStateV2.DONE;
            return;
        }

        // Atomic save with retry + LLM repair
        const saveResult = await this.atomicSaveWithRepair(validUsecases);
        this.context.saveResult = saveResult;

        console.log(`✅ [PHASE 6] Save complete:`, saveResult);
        await this.broadcastProgress(100, "completed",
            `Hoàn thành: ${saveResult.saved}/${saveResult.total_expected} usecases (${saveResult.repaired_by_llm} repaired by LLM)`,
            saveResult.saved // ✅ Truyền savedCount thực tế từ database
        );

        this.state = AgentStateV2.DONE;
    }

    /**
     * Atomic save với retry + LLM repair
     */
    private async atomicSaveWithRepair(usecases: any[]): Promise<SaveResult> {
        const MAX_INSERT_RETRIES = 3;

        // ✅ Lưu số lượng usecases trước khi insert (để tính số lượng mới insert)
        const countBeforeInsert = await Usecase.countDocuments({ version_id: this.context.versionId });
        console.log(`📊 [SAVE] Usecases in database before insert: ${countBeforeInsert}`);

        let saved: any[] = [];
        let repaired = 0;
        let skipped = 0;
        let failed: Array<{ key: string; error: string; data: any }> = [];

        // Remove _tempKey before insert
        const toInsert = usecases.map(uc => {
            const { _tempKey, ...rest } = uc;
            return rest;
        });

        // Step 1: Try batch insert
        for (let attempt = 1; attempt <= MAX_INSERT_RETRIES; attempt++) {
            try {
                console.log(`💾 [SAVE] Attempt ${attempt}: inserting ${toInsert.length} usecases...`);
                const result = await Usecase.insertMany(toInsert, { ordered: false });

                // ✅ Kiểm tra nếu số lượng insert khác với số lượng yêu cầu
                if (result.length !== toInsert.length) {
                    console.warn(`⚠️ [SAVE] Insert mismatch: requested ${toInsert.length}, inserted ${result.length} (${toInsert.length - result.length} missing)`);
                    // Có thể do duplicate index - cần query lại để xác nhận
                    const actualCount = await Usecase.countDocuments({ version_id: this.context.versionId });
                    console.log(`📊 [SAVE] Actual usecases in database: ${actualCount}`);
                }

                saved = result;
                console.log(`✅ [SAVE] Successfully inserted ${result.length} usecases`);
                break;

            } catch (error: any) {
                if (error.name === 'BulkWriteError' || error.writeErrors) {
                    const writeErrors = error.writeErrors || [];
                    const insertedCount = toInsert.length - writeErrors.length;

                    console.log(`⚠️ [SAVE] Partial insert: ${insertedCount} succeeded, ${writeErrors.length} failed`);

                    // Get succeeded documents
                    const failedIndices = new Set(writeErrors.map((e: any) => e.index));
                    const succeededDocs = toInsert.filter((_, i) => !failedIndices.has(i));

                    // Query to get actual saved documents
                    const savedDocs = await Usecase.find({
                        version_id: this.context.versionId,
                        name: { $in: succeededDocs.map(d => d.name) }
                    }).lean();
                    saved.push(...savedDocs);

                    // Handle failed ones
                    for (const err of writeErrors) {
                        const failedUC = usecases[err.index];
                        const tempKey = failedUC._tempKey;

                        // Check if it's a validation error (can be repaired by LLM)
                        if (err.code === 121 || err.errmsg?.includes('validation')) {
                            // Try LLM repair
                            const repairResult = await this.tryLLMRepair(failedUC, err.errmsg);
                            if (repairResult.success) {
                                saved.push(repairResult.doc);
                                repaired++;

                                // Update temp storage
                                const entry = this.context.tempStorage.get(tempKey);
                                if (entry) entry.status = 'repaired';
                            } else {
                                failed.push({ key: tempKey, error: err.errmsg, data: failedUC });
                            }
                        } else if (err.code === 11000) {
                            // Duplicate - skip
                            skipped++;
                            console.warn(`⚠️ [SAVE] Skipping duplicate usecase: ${tempKey} - "${failedUC.name}" (error: ${err.errmsg})`);
                        } else {
                            failed.push({ key: tempKey, error: err.errmsg, data: failedUC });
                            console.error(`❌ [SAVE] Failed usecase: ${tempKey} - "${failedUC.name}" (code: ${err.code}, error: ${err.errmsg})`);
                        }
                    }
                    break;

                } else if (attempt < MAX_INSERT_RETRIES) {
                    // Connection error - retry
                    console.warn(`⚠️ [SAVE] Attempt ${attempt} failed, retrying...`);
                    await this.delay(1000 * attempt);
                    continue;
                } else {
                    // Final attempt failed - try one by one
                    console.warn(`⚠️ [SAVE] Batch insert failed, trying one by one...`);
                    const oneByOneResult = await this.insertOneByOne(usecases);
                    saved = oneByOneResult.saved;
                    failed = oneByOneResult.failed;
                    break;
                }
            }
        }

        // ✅ Query lại database để xác nhận số lượng thực tế đã lưu (chỉ những usecases mới insert)
        const countAfterInsert = await Usecase.countDocuments({ version_id: this.context.versionId });
        const actualNewlyInserted = countAfterInsert - countBeforeInsert;
        console.log(`📊 [SAVE] Database: ${countAfterInsert} total (${countBeforeInsert} before, ${actualNewlyInserted} newly inserted)`);
        console.log(`📊 [SAVE] insertMany returned: ${saved.length}, expected: ${toInsert.length}`);

        // ✅ Nếu số lượng mới insert khác với số lượng insertMany trả về, có thể do duplicate index im lặng
        if (actualNewlyInserted !== saved.length) {
            const missingCount = saved.length - actualNewlyInserted;
            console.warn(`⚠️ [SAVE] Mismatch: insertMany returned ${saved.length} but only ${actualNewlyInserted} were actually inserted (${missingCount} may be duplicates)`);
            // Cập nhật skipped count
            skipped += missingCount;
        }

        // ✅ Nếu số lượng insertMany trả về khác với số lượng yêu cầu, có thể do duplicate trong batch
        if (saved.length !== toInsert.length) {
            const missingCount = toInsert.length - saved.length;
            console.warn(`⚠️ [SAVE] insertMany mismatch: requested ${toInsert.length}, returned ${saved.length} (${missingCount} missing - may be duplicates)`);
            skipped += missingCount;
        }

        const result = {
            success: failed.length === 0,
            total_expected: this.context.estimateResult?.estimated_count || usecases.length,
            saved: actualNewlyInserted, // ✅ Dùng số lượng thực tế mới insert từ database
            repaired_by_llm: repaired,
            skipped,
            failed
        };

        console.log(`📊 [SAVE] Final result: ${result.saved} saved, ${result.repaired_by_llm} repaired, ${result.skipped} skipped, ${result.failed.length} failed`);
        if (result.skipped > 0) {
            console.warn(`⚠️ [SAVE] ${result.skipped} usecases were skipped (likely duplicates)`);
        }
        if (result.failed.length > 0) {
            console.error(`❌ [SAVE] ${result.failed.length} usecases failed:`, result.failed.map(f => `${f.key}: ${f.error}`).join(', '));
        }

        return result;
    }

    /**
     * Try LLM repair for failed usecase
     */
    private async tryLLMRepair(brokenUC: any, errorMsg: string): Promise<{ success: boolean; doc?: any }> {
        for (let attempt = 1; attempt <= this.MAX_REPAIR_ATTEMPTS; attempt++) {
            try {
                console.log(`🔧 [LLM REPAIR] Attempt ${attempt} for: ${brokenUC.name}`);

                const fixedUC = await this.gemini.repairUsecase(brokenUC, errorMsg);
                if (fixedUC) {
                    // Add required fields
                    fixedUC.project_id = brokenUC.project_id;
                    fixedUC.version_id = brokenUC.version_id;

                    const doc = await Usecase.create(fixedUC);
                    console.log(`✅ [LLM REPAIR] Fixed: ${brokenUC.name}`);
                    return { success: true, doc };
                }
            } catch (err: any) {
                console.error(`❌ [LLM REPAIR] Attempt ${attempt} failed:`, err.message);
            }
        }
        return { success: false };
    }

    /**
     * Fallback: Insert one by one
     */
    private async insertOneByOne(usecases: any[]): Promise<{ saved: any[]; failed: Array<{ key: string; error: string; data: any }> }> {
        const saved: any[] = [];
        const failed: Array<{ key: string; error: string; data: any }> = [];

        for (const uc of usecases) {
            try {
                const { _tempKey, ...rest } = uc;
                const doc = await Usecase.create(rest);
                saved.push(doc);
            } catch (err: any) {
                failed.push({ key: uc._tempKey || uc.name, error: err.message, data: uc });
            }
        }

        return { saved, failed };
    }

    /**
     * Normalize usecase from LLM response
     */
    private normalizeUsecase(generated: any, committed: CommittedUsecase): any {
        // Normalize actor
        const actor = generated.actor || generated.role;
        const normalizedActor = actor ? {
            id: actor.id || `actor_${(actor.name || 'user').toLowerCase().replace(/\s+/g, '_')}`,
            name: actor.name || 'Người dùng hệ thống',
            description: actor.description || ''
        } : {
            id: 'actor_user',
            name: 'Người dùng hệ thống',
            description: 'Người dùng sử dụng hệ thống'
        };

        // Normalize main_flow
        let mainFlow = Array.isArray(generated.main_flow) ? generated.main_flow : [];
        if (mainFlow.length === 0 && Array.isArray(generated.tasks)) {
            mainFlow = generated.tasks.map((task: string, i: number) => ({
                step: i + 1,
                actor: normalizedActor.name,
                action: task,
                expected_result: `Task ${i + 1} completed`
            }));
        }

        // Normalize arrays
        const normalizeArray = (arr: any[], mapFn?: (item: any, i: number) => any) => {
            if (!Array.isArray(arr)) return [];
            if (arr.length === 0) return [];
            if (typeof arr[0] === 'string' && mapFn) {
                return arr.map(mapFn);
            }
            return arr;
        };

        return {
            key: committed.key,
            type: generated.type || 'use_case',
            level: generated.level || 'system',
            status: generated.status || 'active',
            name: generated.name || committed.name,
            description: generated.description || committed.desc || committed.name,
            actor: normalizedActor,
            goal: generated.goal || committed.desc,
            business_reason: generated.business_reason || generated.reason || committed.desc,
            context: typeof generated.context === 'object' ? generated.context : {
                module: committed.module || '',
                scope: '',
                system: ''
            },
            priority: generated.priority || 'medium',
            frequency: generated.frequency || 'medium',
            trigger: typeof generated.trigger === 'object' ? generated.trigger : {
                event: Array.isArray(generated.triggers) ? generated.triggers[0] : 'User action',
                source: 'UI'
            },
            preconditions: normalizeArray(generated.preconditions),
            main_flow: mainFlow,
            alternative_flows: normalizeArray(generated.alternative_flows, (af, i) => ({
                id: `AF${i + 1}`,
                at_step: 1,
                condition: af,
                system_response: af,
                end_state: 'Alternative completed'
            })),
            exceptions: normalizeArray(generated.exceptions, (ex, i) => ({
                id: `E${i + 1}`,
                at_step: 1,
                type: 'System',
                description: ex,
                system_response: `Handle: ${ex}`
            })),
            postconditions: normalizeArray(generated.postconditions),
            rules: normalizeArray(generated.rules, (r, i) => ({
                id: `R${i + 1}`,
                description: r
            })),
            inputs: normalizeArray(generated.inputs, (inp) => ({
                name: inp,
                type: 'string',
                required: true
            })),
            outputs: normalizeArray(generated.outputs, (out) => ({
                name: out,
                type: 'string',
                optional: false
            })),
            non_functional_constraints: normalizeArray(generated.non_functional_constraints || generated.constraints),
            stakeholders: normalizeArray(generated.stakeholders),
            related_usecases: [],
            audit: {
                created_by: new Types.ObjectId(this.context.userId || ''),
                created_at: new Date(),
                updated_by: new Types.ObjectId(this.context.userId || ''),
                updated_at: new Date()
            }
        };
    }

    /**
     * Validate usecase
     */
    private validateUsecase(uc: any): string[] {
        const errors: string[] = [];
        if (!uc.name || uc.name.trim() === '') errors.push('missing name');
        if (!uc.actor || !uc.actor.id || !uc.actor.name) errors.push('invalid actor');
        if (!uc.goal || uc.goal.trim() === '') errors.push('missing goal');
        if (!uc.main_flow || !Array.isArray(uc.main_flow) || uc.main_flow.length === 0) {
            errors.push('missing main_flow');
        }
        return errors;
    }

    /**
     * Handle errors
     */
    private async handleError(error: any): Promise<void> {
        const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
        const errorInfo = analyzeApiKeyError(error);

        if (errorInfo.retryable || errorInfo.type === 'QUOTA_EXCEEDED' || errorInfo.type === 'RATE_LIMIT') {
            // Save resume state
            this.context.resumeState = {
                state: this.state,
                currentBatchIndex: this.context.currentBatchIndex || 0,
                errorMessage: errorInfo.userFriendlyMessage.vi || errorInfo.message,
                errorType: errorInfo.type
            };

            await this.broadcastProgress(0, "paused",
                `⚠️ ${errorInfo.userFriendlyMessage.vi}. Có thể tiếp tục sau...`);

            // Don't throw, just stop
            this.state = AgentStateV2.DONE;
        } else {
            throw error;
        }
    }

    /**
     * Handle batch error
     */
    private async handleBatchError(error: any, batch: BatchPlanV2): Promise<void> {
        console.error(`❌ [PHASE 3] Batch ${batch.batchNumber} error:`, error.message);

        // Mark all usecases in batch as missing
        for (const key of batch.keys) {
            const entry = this.context.tempStorage.get(key);
            if (entry && entry.status === 'pending') {
                entry.status = 'missing';
                entry.error = error.message;
            }
        }

        // Continue to next batch
        this.context.currentBatchIndex!++;
    }

    /**
     * Broadcast progress
     */
    private async broadcastProgress(progress: number, stage: string, message: string, savedCount?: number): Promise<void> {
        try {
            const { inputSocketService } = await import("../../input/domain/input.socket.service");
            if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                // ✅ Ưu tiên savedCount từ parameter (từ database), fallback về generatedCount (từ temp storage)
                let finalSavedCount = savedCount;
                if (finalSavedCount === undefined || finalSavedCount === null) {
                    finalSavedCount = Array.from(this.context.tempStorage.values())
                        .filter(e => e.status === 'generated' || e.status === 'repaired').length;
                }

                inputSocketService.emitIncrementalProgress(
                    this.context.projectId,
                    this.context.versionId,
                    this.context.userId,
                    progress,
                    stage,
                    stage !== 'completed' && stage !== 'failed',
                    {
                        currentBatch: this.context.currentBatchIndex || 0,
                        totalBatches: this.context.batchPlan?.length || 0,
                        usecasesInBatch: 0,
                        savedCount: finalSavedCount, // ✅ Dùng savedCount thực tế
                        totalCount: this.context.estimateResult?.estimated_count || 0
                    },
                    undefined,
                    this.state,
                    message
                );
            }
        } catch (err) {
            // Ignore broadcast errors
        }
    }

    /**
     * Broadcast estimate
     */
    private async broadcastEstimate(estimate: EstimateWithCommitment): Promise<void> {
        try {
            const { inputSocketService } = await import("../../input/domain/input.socket.service");
            if (inputSocketService && this.context.projectId && this.context.versionId && this.context.userId) {
                inputSocketService.emitEstimateReceived(
                    this.context.projectId,
                    this.context.versionId,
                    this.context.userId,
                    {
                        estimated_count: estimate.estimated_count,
                        estimated_batches: Math.ceil(estimate.estimated_count / this.DEFAULT_BATCH_SIZE),
                        summary: estimate.summary
                    }
                );
            }
        } catch (err) {
            // Ignore
        }
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}


