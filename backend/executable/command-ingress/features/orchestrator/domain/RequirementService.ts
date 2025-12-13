import { Types } from "mongoose";
import Input from "../../../../../internal/model/input";
import Version from "../../../../../internal/model/version";
import Usecase from "../../../../../internal/model/usecase";
import { GeminiService } from "./GeminiService";

export class RequirementService {
    /**
     * ✅ MỚI: Normalize role structure
     */
    private normalizeRoleStructure(useCases: any[]): any[] {
        return useCases.map((uc: any) => {
            if (!uc.role) {
                uc.role = { id: 'role_unknown', name: 'Unknown' };
            } else if (typeof uc.role === 'string') {
                uc.role = {
                    id: `role_${uc.role.toLowerCase().replace(/\s+/g, '_')}`,
                    name: uc.role
                };
            } else if (uc.role && typeof uc.role === 'object' && !uc.role.id) {
                uc.role.id = `role_${uc.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`;
            }
            return uc;
        });
    }

    /**
     * ✅ MỚI: Estimate phase - LLM đọc toàn bộ text và estimate số usecases
     */
    private async estimatePhase(
        mergedText: string,
        gemini: GeminiService,
        language: string,
        modelName?: string,
        userId?: string,
        projectId?: string,
        versionId?: string
    ): Promise<{
        estimated_count: number;
        summary: string;
        estimated_batches: number;
        reasoning?: string;
    }> {
        console.log(`📊 [ESTIMATE PHASE] Starting estimate for ${mergedText.length} chars`);

        // Broadcast estimating stage
        const { inputSocketService } = await import("../../input/domain/input.socket.service");
        if (inputSocketService && projectId && versionId && userId) {
            inputSocketService.emitIncrementalProgress(
                projectId,
                versionId,
                userId,
                10,
                "estimating",
                true
            );
        }

        try {
            const estimate = await gemini.estimateUseCasesCount(
                mergedText,
                language,
                modelName,
                userId,
                projectId
            );

            console.log(`✅ [ESTIMATE PHASE] Estimated ${estimate.estimated_count} use cases, ${estimate.estimated_batches} batches`);

            // Broadcast estimate received
            if (inputSocketService && projectId && versionId && userId) {
                inputSocketService.emitEstimateReceived(projectId, versionId, userId, estimate);
            }

            return estimate;
        } catch (error: any) {
            console.error(`❌ [ESTIMATE PHASE] Error:`, error.message);
            throw error;
        }
    }

    /**
     * ✅ MỚI: Generate and save batches - Generate và lưu usecases theo batch 50
     */
    private async generateAndSaveBatches(
        versionId: string,
        mergedText: string,
        estimatedCount: number,
        estimatedBatches: number,
        gemini: GeminiService,
        language: string,
        mode: "full" | "incremental",
        modelName?: string,
        userId?: string,
        projectId?: string
    ): Promise<{
        version_id: string;
        usecases: any[];
        totalGenerated: number;
    }> {
        console.log(`📦 [GENERATE PHASE] Starting generation: ${estimatedCount} use cases in ${estimatedBatches} batches`);

        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        const previousRequirements = await Usecase.find({ version_id: versionId }).lean();
        const BATCH_SIZE = 50;
        const allGeneratedUseCases: any[] = [];
        const { inputSocketService } = await import("../../input/domain/input.socket.service");

        // Xóa usecases cũ nếu full mode
        if (mode === 'full') {
            console.log(`🗑️ [GENERATE PHASE] Deleting old use cases for full mode...`);
            await Usecase.deleteMany({ version_id: versionId });
        }

        // Generate từng batch
        for (let batchNumber = 1; batchNumber <= estimatedBatches; batchNumber++) {
            const offset = (batchNumber - 1) * BATCH_SIZE;
            const progress = 20 + Math.floor((batchNumber / estimatedBatches) * 70); // 20-90%

            try {
                // Broadcast generating stage
                if (inputSocketService && projectId && versionId && userId) {
                    inputSocketService.emitIncrementalProgress(
                        projectId,
                        versionId,
                        userId,
                        progress,
                        "generating",
                        true,
                        {
                            currentBatch: batchNumber,
                            totalBatches: estimatedBatches,
                            usecasesInBatch: 0
                        }
                    );
                }

                console.log(`📦 [BATCH ${batchNumber}/${estimatedBatches}] Generating use cases ${offset + 1} to ${offset + BATCH_SIZE}...`);

                // Generate batch
                const batchUseCases = await gemini.generateUseCasesBatch(
                    mergedText,
                    batchNumber,
                    estimatedBatches,
                    offset,
                    BATCH_SIZE,
                    language,
                    modelName,
                    userId,
                    projectId
                );

                if (batchUseCases.length === 0) {
                    console.log(`⏩ [BATCH ${batchNumber}/${estimatedBatches}] No more use cases to generate. Stopping.`);
                    break;
                }

                // Normalize role structure
                const normalized = this.normalizeRoleStructure(batchUseCases);

                // Add related use cases
                let withRelations = normalized;
                if (normalized.length > 1 || (mode === 'incremental' && previousRequirements.length > 0)) {
                    try {
                        const allForRelations = mode === 'incremental'
                            ? [...previousRequirements, ...allGeneratedUseCases, ...normalized]
                            : [...allGeneratedUseCases, ...normalized];
                        withRelations = await gemini.addRelatedUseCases(
                            allForRelations,
                            { incremental: mode === "incremental" },
                            language
                        );
                        // Chỉ lấy phần mới nếu incremental
                        if (mode === 'incremental') {
                            withRelations = withRelations.slice(previousRequirements.length + allGeneratedUseCases.length);
                        } else {
                            withRelations = withRelations.slice(allGeneratedUseCases.length);
                        }
                    } catch (err: any) {
                        console.error("⚠️ Error adding related use cases:", err.message);
                    }
                }

                // ✅ FIX: Normalize lại role structure sau khi addRelatedUseCases (có thể LLM đã thay đổi format)
                withRelations = this.normalizeRoleStructure(withRelations);

                // Map to database format
                const usecasesToCreate = withRelations.map((uc: any) => {
                    const relatedIds = (uc.related_usecases || [])
                        .filter((id: any) => id && Types.ObjectId.isValid(String(id)))
                        .map((id: any) => new Types.ObjectId(String(id)));

                    // ✅ VALIDATE: Đảm bảo các field required có giá trị
                    if (!uc.name || typeof uc.name !== 'string' || uc.name.trim() === '') {
                        throw new Error(`Invalid usecase name: ${JSON.stringify(uc.name)}`);
                    }
                    if (!uc.role || typeof uc.role !== 'object' || !uc.role.id || !uc.role.name) {
                        throw new Error(`Invalid usecase role: ${JSON.stringify(uc.role)}`);
                    }
                    if (!uc.goal || typeof uc.goal !== 'string' || uc.goal.trim() === '') {
                        throw new Error(`Invalid usecase goal: ${JSON.stringify(uc.goal)}`);
                    }
                    if (!uc.tasks || !Array.isArray(uc.tasks) || uc.tasks.length === 0) {
                        console.warn(`⚠️ Usecase "${uc.name}" has no tasks, adding default task`);
                        uc.tasks = ['Complete the use case'];
                    }
                    if (!uc.reason || typeof uc.reason !== 'string' || uc.reason.trim() === '') {
                        console.warn(`⚠️ Usecase "${uc.name}" has no reason, using goal as reason`);
                        uc.reason = uc.goal || 'No reason provided';
                    }
                    if (!uc.priority || !['low', 'medium', 'high'].includes(uc.priority)) {
                        uc.priority = 'medium';
                    }

                    return {
                        project_id: version.project_id,
                        version_id: new Types.ObjectId(versionId),
                        name: uc.name.trim(),
                        role: {
                            id: uc.role.id || `role_${uc.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`,
                            name: uc.role.name || 'Unknown',
                            description: uc.role.description || ''
                        },
                        goal: uc.goal.trim(),
                        reason: (uc.reason || uc.goal || 'No reason provided').trim(),
                        tasks: Array.isArray(uc.tasks) && uc.tasks.length > 0 ? uc.tasks : ['Complete the use case'],
                        inputs: Array.isArray(uc.inputs) ? uc.inputs : [],
                        outputs: Array.isArray(uc.outputs) ? uc.outputs : [],
                        context: (uc.context || '').trim(),
                        priority: uc.priority || 'medium',
                        feedback: uc.feedback || null,
                        rules: Array.isArray(uc.rules) ? uc.rules : [],
                        triggers: Array.isArray(uc.triggers) ? uc.triggers : [],
                        preconditions: Array.isArray(uc.preconditions) ? uc.preconditions : [],
                        postconditions: Array.isArray(uc.postconditions) ? uc.postconditions : [],
                        exceptions: Array.isArray(uc.exceptions) ? uc.exceptions : [],
                        stakeholders: Array.isArray(uc.stakeholders) ? uc.stakeholders : [],
                        constraints: Array.isArray(uc.constraints) ? uc.constraints : [],
                        related_usecases: relatedIds,
                        created_by: version.created_by
                    };
                });

                // Save batch
                if (usecasesToCreate.length > 0) {
                    try {
                        console.log(`💾 [BATCH ${batchNumber}/${estimatedBatches}] Attempting to save ${usecasesToCreate.length} use cases...`);
                        console.log(`💾 [BATCH ${batchNumber}/${estimatedBatches}] Sample usecase:`, JSON.stringify(usecasesToCreate[0], null, 2).substring(0, 500));

                        // ✅ VALIDATE: Kiểm tra tất cả usecases trước khi save
                        const validationErrors: string[] = [];
                        usecasesToCreate.forEach((uc, index) => {
                            if (!uc.name || uc.name.trim() === '') {
                                validationErrors.push(`Usecase ${index}: missing name`);
                            }
                            if (!uc.role || !uc.role.id || !uc.role.name) {
                                validationErrors.push(`Usecase ${index} (${uc.name}): invalid role`);
                            }
                            if (!uc.goal || uc.goal.trim() === '') {
                                validationErrors.push(`Usecase ${index} (${uc.name}): missing goal`);
                            }
                            if (!uc.tasks || !Array.isArray(uc.tasks) || uc.tasks.length === 0) {
                                validationErrors.push(`Usecase ${index} (${uc.name}): missing tasks`);
                            }
                        });

                        if (validationErrors.length > 0) {
                            console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Validation errors before save:`, validationErrors);
                            throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
                        }

                        let result: any[];
                        let insertedCount = 0;

                        try {
                            result = await Usecase.insertMany(usecasesToCreate, { ordered: false });
                            insertedCount = result.length;
                        } catch (bulkError: any) {
                            // Nếu có BulkWriteError, có thể một số documents đã được insert
                            if (bulkError.name === 'BulkWriteError' && bulkError.result) {
                                insertedCount = bulkError.result.insertedCount || 0;
                                const writeErrors = bulkError.result.writeErrors || [];
                                console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] BulkWriteError: ${insertedCount}/${usecasesToCreate.length} inserted`);
                                console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Write errors:`, writeErrors.map((e: any) => ({
                                    index: e.index,
                                    code: e.code,
                                    errmsg: e.errmsg,
                                    op: e.op?.name
                                })));

                                // Nếu không có document nào được insert, throw error
                                if (insertedCount === 0) {
                                    throw new Error(`All ${usecasesToCreate.length} usecases failed to insert. First error: ${writeErrors[0]?.errmsg || bulkError.message}`);
                                }

                                // Nếu có một số được insert, tiếp tục với số đã insert
                                result = [];
                                for (let i = 0; i < insertedCount; i++) {
                                    if (bulkError.result.insertedIds && bulkError.result.insertedIds[i]) {
                                        const insertedDoc = await Usecase.findById(bulkError.result.insertedIds[i]);
                                        if (insertedDoc) result.push(insertedDoc);
                                    }
                                }
                            } else {
                                throw bulkError;
                            }
                        }

                        // ✅ VERIFY: Kiểm tra số lượng đã insert
                        if (insertedCount === 0) {
                            console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] CRITICAL: insertMany returned 0 documents!`);
                            console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Attempted to insert ${usecasesToCreate.length} usecases`);
                            console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Sample usecase data:`, JSON.stringify(usecasesToCreate[0], null, 2));

                            // Thử insert từng document để xem document nào fail
                            console.log(`🔍 [BATCH ${batchNumber}/${estimatedBatches}] Attempting to insert documents one by one to identify failures...`);
                            const individualResults: any[] = [];
                            const individualErrors: any[] = [];

                            for (let i = 0; i < usecasesToCreate.length; i++) {
                                try {
                                    const doc = new Usecase(usecasesToCreate[i]);
                                    await doc.validate();
                                    const saved = await doc.save();
                                    individualResults.push(saved);
                                    console.log(`✅ [BATCH ${batchNumber}/${estimatedBatches}] Document ${i + 1} ("${usecasesToCreate[i].name}") inserted successfully`);
                                } catch (individualError: any) {
                                    individualErrors.push({ index: i, name: usecasesToCreate[i].name, error: individualError.message });
                                    console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Document ${i + 1} ("${usecasesToCreate[i].name}") failed:`, individualError.message);
                                }
                            }

                            if (individualResults.length > 0) {
                                insertedCount = individualResults.length;
                                result = individualResults;
                                console.log(`✅ [BATCH ${batchNumber}/${estimatedBatches}] Successfully inserted ${insertedCount} usecases individually (${individualErrors.length} failed)`);
                            } else {
                                throw new Error(`All ${usecasesToCreate.length} usecases failed validation. Errors: ${individualErrors.map(e => `${e.name}: ${e.error}`).join('; ')}`);
                            }
                        }

                        console.log(`✅ [BATCH ${batchNumber}/${estimatedBatches}] Successfully inserted ${insertedCount} use cases into database`);

                        // ✅ VERIFY: Query lại để xác nhận
                        const verifyCount = await Usecase.countDocuments({ version_id: versionId });
                        console.log(`✅ [BATCH ${batchNumber}/${estimatedBatches}] Total usecases in database for version ${versionId}: ${verifyCount}`);

                        if (insertedCount < usecasesToCreate.length) {
                            console.warn(`⚠️ [BATCH ${batchNumber}/${estimatedBatches}] Only inserted ${insertedCount}/${usecasesToCreate.length} usecases. Some may have been skipped.`);
                        }

                        allGeneratedUseCases.push(...withRelations);
                        console.log(`✅ [BATCH ${batchNumber}/${estimatedBatches}] Saved ${insertedCount} use cases (total: ${allGeneratedUseCases.length})`);

                        // Broadcast saving progress
                        if (inputSocketService && projectId && versionId && userId) {
                            const saveProgress = 90 + Math.floor((batchNumber / estimatedBatches) * 10);
                            inputSocketService.emitIncrementalProgress(
                                projectId,
                                versionId,
                                userId,
                                saveProgress,
                                "saving",
                                true,
                                {
                                    currentBatch: batchNumber,
                                    totalBatches: estimatedBatches,
                                    usecasesInBatch: usecasesToCreate.length
                                }
                            );
                        }
                    } catch (err: any) {
                        console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Error saving usecases:`, err.message);
                        console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Error details:`, {
                            name: err.name,
                            code: err.code,
                            keyPattern: err.keyPattern,
                            keyValue: err.keyValue,
                            errors: err.errors,
                            result: err.result
                        });

                        if (err.code === 11000 || err.name === 'BulkWriteError') {
                            const inserted = err.result?.insertedCount || (Array.isArray(err.result?.insertedIds) ? err.result.insertedIds.length : 0);
                            console.warn(`⚠️ [BATCH ${batchNumber}/${estimatedBatches}] Some duplicates, inserted ${inserted}/${usecasesToCreate.length}`);
                            if (inserted > 0) {
                                allGeneratedUseCases.push(...withRelations.slice(0, inserted));
                            }
                        } else if (err.name === 'ValidationError') {
                            // Log validation errors chi tiết
                            console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Validation errors:`, JSON.stringify(err.errors, null, 2));
                            // Log sample usecase để debug
                            if (usecasesToCreate.length > 0) {
                                console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Sample usecase that failed:`, JSON.stringify(usecasesToCreate[0], null, 2));
                            }
                            throw err;
                        } else {
                            console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Unexpected error saving:`, err);
                            throw err;
                        }
                    }
                }

                // Delay giữa các batch
                if (batchNumber < estimatedBatches) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } catch (error: any) {
                console.error(`❌ [BATCH ${batchNumber}/${estimatedBatches}] Error:`, error.message);
                throw error;
            }
        }

        // Get final usecases
        const finalUsecases = await Usecase.find({ version_id: versionId }).lean();
        console.log(`✅ [GENERATE PHASE] Completed: ${finalUsecases.length} total use cases (${allGeneratedUseCases.length} new)`);

        return {
            version_id: versionId,
            usecases: finalUsecases,
            totalGenerated: allGeneratedUseCases.length
        };
    }

    /**
     * ✅ REFACTORED: Phân tích requirements với flow mới: Estimate → Generate → Save
     */
    async finalize(
        versionId: string,
        mode: "full" | "incremental",
        inputs: any[],
        gemini: GeminiService,
        language: string,
        modelName?: string,
        userId?: string,
        projectId?: string
    ) {
        // 1. Lấy dữ liệu ban đầu
        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        const previousRequirements = await Usecase.find({ version_id: versionId }).lean();
        const markAsProcessed = inputs.map((i: any) => String(i._id));

        // 2. Chuẩn bị text đầu vào
        const inputInfo = inputs.map((i: any) => ({
            id: i._id?.toString() || i.id,
            type: i.type,
            filename: i.original_filename || 'text',
            length: (i.cleaned_text || i.raw_text || "").length
        }));

        console.log(`📥 Processing ${inputs.length} input(s):`, inputInfo.map(i => `${i.type}:${i.filename}(${i.length} chars)`).join(', '));

        let mergedText = inputs
            .map((i: any) => (i.cleaned_text || i.raw_text || ""))
            .filter(Boolean)
            .join("\n\n");

        if (!mergedText || mergedText.trim().length === 0) {
            console.log("⏩ No text to process");
            return { version_id: versionId, usecases: previousRequirements };
        }

        // Validate và clean text
        const { validateTextForLLM } = await import("../../../shared/textPreprocessor");
        const validation = validateTextForLLM(mergedText);
        mergedText = validation.cleanedText;
        console.log(`📝 Processing text: ${validation.originalLength} -> ${validation.cleanedLength} characters`);

        try {
            // 3. ESTIMATE PHASE
            const estimate = await this.estimatePhase(
                mergedText,
                gemini,
                language,
                modelName,
                userId,
                projectId,
                versionId
            );

            // 4. GENERATE & SAVE PHASE
            const result = await this.generateAndSaveBatches(
                versionId,
                mergedText,
                estimate.estimated_count,
                estimate.estimated_batches,
                gemini,
                language,
                mode,
                modelName,
                userId,
                projectId
            );

            // 5. Mark inputs as processed
            if (markAsProcessed.length > 0) {
                await Input.updateMany({ _id: { $in: markAsProcessed } }, { $set: { is_processed: true } });
            }

            // 6. Update version status
            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    affects_requirement: true,
                    status: "completed",
                    stage: "completed",
                    progress: 100,
                    is_processing: false
                }
            });

            // 7. Broadcast completion
            const { inputSocketService } = await import("../../input/domain/input.socket.service");
            if (inputSocketService && projectId && versionId && userId) {
                inputSocketService.emitIncrementalProgress(
                    projectId,
                    versionId,
                    userId,
                    100,
                    "completed",
                    false
                );
            }

            console.log(`✅ [FINALIZE] Successfully processed ${result.totalGenerated} new use cases`);

            return {
                version_id: versionId,
                usecases: result.usecases,
                newRequirements: result.usecases.slice(previousRequirements.length)
            };

        } catch (error: any) {
            console.error("❌ [FINALIZE] Error:", error);

            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    status: "failed",
                    stage: "failed",
                    progress: 100,
                    is_processing: false,
                    processing_errors: [error.message || "Unknown error"]
                }
            });

            // Broadcast failure
            const { inputSocketService } = await import("../../input/domain/input.socket.service");
            if (inputSocketService && projectId && versionId && userId) {
                inputSocketService.emitIncrementalProgress(
                    projectId,
                    versionId,
                    userId,
                    100,
                    "failed",
                    false
                );
            }

            return {
                version_id: versionId,
                usecases: previousRequirements,
                errors: [error.message || "Unknown error"]
            };
        }
    }

    /**
     * Tìm conflicts (duplicate usecases) trong version
     */
    async findConflicts(versionId: string, gemini: GeminiService, language: string) {
        console.log(`🔍 [FIND CONFLICTS] Finding conflicts for version ${versionId}`);

        // Lấy tất cả usecases
        const usecases = await Usecase.find({ version_id: versionId }).lean();
        if (usecases.length < 2) {
            console.log(`⏩ [FIND CONFLICTS] Not enough usecases (${usecases.length}) to find conflicts`);
            await Version.findByIdAndUpdate(versionId, {
                $set: { pending_conflicts: [] }
            });
            return { conflicts: [] };
        }

        // Gọi GeminiService để tìm conflict groups
        const conflictGroups = await gemini.findConflictGroups(usecases, language);

        // Format conflicts
        const conflicts = conflictGroups.map((group, index) => ({
            conflict_id: `conflict_${versionId}_${index}`,
            items: group
        }));

        // Lưu vào version
        await Version.findByIdAndUpdate(versionId, {
            $set: { pending_conflicts: conflicts }
        });

        console.log(`✅ [FIND CONFLICTS] Found ${conflicts.length} conflict groups`);

        return { conflicts };
    }

    /**
     * Giải quyết conflict bằng cách giữ lại một usecase và xóa các usecase khác
     */
    async resolveConflict(versionId: string, conflictId: string, keepUseCaseId: string) {
        console.log(`🔧 [RESOLVE CONFLICT] Resolving conflict ${conflictId}, keeping usecase ${keepUseCaseId}`);

        // Lấy version để tìm conflict
        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        const pendingConflicts = (version as any).pending_conflicts || [];
        const conflict = pendingConflicts.find((c: any) => c.conflict_id === conflictId);

        if (!conflict) {
            throw new Error(`Conflict ${conflictId} not found`);
        }

        // Xóa các usecases khác (không phải keepUseCaseId)
        const usecasesToDelete = conflict.items.filter((id: string) => id !== keepUseCaseId);

        if (usecasesToDelete.length > 0) {
            await Usecase.deleteMany({
                version_id: versionId,
                _id: { $in: usecasesToDelete.map((id: string) => new Types.ObjectId(id)) }
            });
            console.log(`🗑️ [RESOLVE CONFLICT] Deleted ${usecasesToDelete.length} duplicate usecases`);
        }

        // Xóa conflict khỏi pending_conflicts
        const updatedConflicts = pendingConflicts.filter((c: any) => c.conflict_id !== conflictId);
        await Version.findByIdAndUpdate(versionId, {
            $set: { pending_conflicts: updatedConflicts }
        });

        console.log(`✅ [RESOLVE CONFLICT] Conflict resolved successfully`);

        return { success: true, deletedCount: usecasesToDelete.length };
    }
}
