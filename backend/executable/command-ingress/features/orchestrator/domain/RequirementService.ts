import { Types } from "mongoose";
import Input from "../../../../../internal/model/input";
import Version from "../../../../../internal/model/version";
import Usecase from "../../../../../internal/model/usecase";
import { GeminiService } from "./GeminiService";
import { UsecaseGenerationAgent, AgentContext } from "./UsecaseGenerationAgent";

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
     * ✅ MỚI: Generate and save batches - Generate và lưu usecases theo batch 15
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
        const DEFAULT_BATCH_SIZE = 15;
        const allGeneratedUseCases: any[] = [];
        const invalidUsecasesToRegenerate: Array<{ name: string; errors: string[]; originalData?: any }> = [];
        const { inputSocketService } = await import("../../input/domain/input.socket.service");

        // Xóa usecases cũ nếu full mode
        if (mode === 'full') {
            console.log(`🗑️ [GENERATE PHASE] Deleting old use cases for full mode...`);
            await Usecase.deleteMany({ version_id: versionId });
        }

        // ✅ FIX: Tính toán batch size động dựa trên estimate
        // Nếu estimate nhỏ, không nên generate quá nhiều
        const remainingToGenerate = estimatedCount - allGeneratedUseCases.length;
        console.log(`📊 [GENERATE PHASE] Estimated ${estimatedCount} use cases, ${estimatedBatches} batches, remaining: ${remainingToGenerate}`);

        // Generate từng batch
        for (let batchNumber = 1; batchNumber <= estimatedBatches; batchNumber++) {
            const offset = allGeneratedUseCases.length;
            const remaining = estimatedCount - allGeneratedUseCases.length;

            // ✅ FIX: Tính batch size động - không generate quá số lượng estimate
            const batchSize = Math.min(DEFAULT_BATCH_SIZE, remaining);

            if (batchSize <= 0) {
                console.log(`⏩ [BATCH ${batchNumber}/${estimatedBatches}] Already generated ${allGeneratedUseCases.length} use cases (estimated: ${estimatedCount}). Stopping.`);
                break;
            }

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

                console.log(`📦 [BATCH ${batchNumber}/${estimatedBatches}] Generating use cases ${offset + 1} to ${offset + batchSize} (estimated total: ${estimatedCount})...`);

                // Generate batch với batchSize động và thông tin estimate
                const batchUseCases = await gemini.generateUseCasesBatch(
                    mergedText,
                    batchNumber,
                    estimatedBatches,
                    offset,
                    batchSize,
                    language,
                    modelName,
                    userId,
                    projectId,
                    estimatedCount // ✅ THÊM: Truyền estimatedCount để LLM biết giới hạn
                );

                if (batchUseCases.length === 0) {
                    console.log(`⏩ [BATCH ${batchNumber}/${estimatedBatches}] No more use cases to generate. Stopping.`);
                    break;
                }

                // ✅ FIX: Giới hạn số lượng use cases dựa trên estimate
                const remaining = estimatedCount - allGeneratedUseCases.length;
                if (remaining <= 0) {
                    console.log(`⏩ [BATCH ${batchNumber}/${estimatedBatches}] Already reached estimated count (${estimatedCount}). Stopping.`);
                    break;
                }

                // Chỉ lấy số lượng use cases còn lại cần generate
                const useCasesToProcess = batchUseCases.slice(0, remaining);
                if (useCasesToProcess.length < batchUseCases.length) {
                    console.warn(`⚠️ [BATCH ${batchNumber}/${estimatedBatches}] Generated ${batchUseCases.length} use cases, but only ${remaining} remaining to reach estimate (${estimatedCount}). Limiting to ${useCasesToProcess.length}.`);
                }

                // Normalize role structure (sử dụng useCasesToProcess thay vì batchUseCases)
                const normalized = this.normalizeRoleStructure(useCasesToProcess);

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

                // Map to database format (không throw error, sẽ validate sau)
                const usecasesToCreate = withRelations.map((uc: any, index: number) => {
                    const relatedIds = (uc.related_usecases || [])
                        .filter((id: any) => id && Types.ObjectId.isValid(String(id)))
                        .map((id: any) => new Types.ObjectId(String(id)));

                    // ✅ FIX: Không throw error trong map, chỉ normalize và return
                    // Validation sẽ được thực hiện sau để có thể skip những usecases không hợp lệ

                    // Normalize các field với default values
                    const normalizedTasks = Array.isArray(uc.tasks) && uc.tasks.length > 0 ? uc.tasks : ['Complete the use case'];
                    const normalizedReason = (uc.reason || uc.goal || 'No reason provided').trim();
                    const normalizedPriority = (uc.priority && ['low', 'medium', 'high'].includes(uc.priority)) ? uc.priority : 'medium';

                    return {
                        _originalIndex: index, // Lưu index gốc để map lại với withRelations
                        project_id: version.project_id,
                        version_id: new Types.ObjectId(versionId),
                        name: uc.name ? uc.name.trim() : '',
                        role: uc.role ? {
                            id: uc.role.id || `role_${uc.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`,
                            name: uc.role.name || 'Unknown',
                            description: uc.role.description || ''
                        } : null,
                        goal: uc.goal ? uc.goal.trim() : '',
                        reason: normalizedReason,
                        tasks: normalizedTasks,
                        inputs: Array.isArray(uc.inputs) ? uc.inputs : [],
                        outputs: Array.isArray(uc.outputs) ? uc.outputs : [],
                        context: (uc.context || '').trim(),
                        priority: normalizedPriority,
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

                        // ✅ VALIDATE: Filter ra những usecases hợp lệ, skip những usecases không hợp lệ
                        const validUsecases: any[] = [];
                        const invalidUsecases: Array<{ index: number; name: string; errors: string[] }> = [];

                        usecasesToCreate.forEach((uc, index) => {
                            const errors: string[] = [];

                            if (!uc.name || uc.name.trim() === '') {
                                errors.push('missing name');
                            }
                            if (!uc.role || !uc.role.id || !uc.role.name) {
                                errors.push('invalid role');
                            }
                            if (!uc.goal || uc.goal.trim() === '') {
                                errors.push('missing goal');
                            }
                            if (!uc.tasks || !Array.isArray(uc.tasks) || uc.tasks.length === 0) {
                                errors.push('missing tasks');
                            }

                            if (errors.length > 0) {
                                invalidUsecases.push({ index, name: uc.name || `Usecase ${index}`, errors });
                                console.warn(`⚠️ [BATCH ${batchNumber}/${estimatedBatches}] Skipping invalid usecase ${index + 1} ("${uc.name || 'unnamed'}"): ${errors.join(', ')}`);
                            } else {
                                validUsecases.push(uc);
                            }
                        });

                        // ✅ FIX: Nếu tất cả usecases đều fail, lưu thông tin để regenerate sau
                        if (validUsecases.length === 0) {
                            console.warn(`⚠️ [BATCH ${batchNumber}/${estimatedBatches}] All ${usecasesToCreate.length} usecases failed validation. Will attempt to regenerate.`);
                            // Lưu thông tin invalid usecases để regenerate sau
                            invalidUsecasesToRegenerate.push(...invalidUsecases.map(uc => ({
                                name: uc.name,
                                errors: uc.errors,
                                originalData: usecasesToCreate[uc.index]
                            })));
                            // Skip batch này và tiếp tục với batch tiếp theo
                            continue;
                        }

                        // Log số lượng usecases đã skip
                        if (invalidUsecases.length > 0) {
                            console.warn(`⚠️ [BATCH ${batchNumber}/${estimatedBatches}] Skipped ${invalidUsecases.length} invalid usecase(s), proceeding with ${validUsecases.length} valid usecase(s)`);
                        }

                        // Cập nhật withRelations để match với validUsecases dựa trên _originalIndex
                        const validOriginalIndices = new Set(validUsecases.map(uc => uc._originalIndex));
                        const validRelations = withRelations.filter((_, idx) => validOriginalIndices.has(idx));

                        // Remove _originalIndex trước khi save
                        validUsecases.forEach(uc => delete uc._originalIndex);

                        // Sử dụng chỉ những usecases hợp lệ
                        usecasesToCreate.length = 0;
                        usecasesToCreate.push(...validUsecases);

                        // Cập nhật withRelations
                        withRelations.length = 0;
                        withRelations.push(...validRelations);

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

                                // Log những usecases đã skip
                                if (individualErrors.length > 0) {
                                    console.warn(`⚠️ [BATCH ${batchNumber}/${estimatedBatches}] Skipped ${individualErrors.length} usecase(s) due to validation errors:`);
                                    individualErrors.forEach(err => {
                                        console.warn(`  - "${err.name}": ${err.error}`);
                                    });
                                }
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

        // ✅ FIX: Regenerate các usecases bị lỗi validation
        if (invalidUsecasesToRegenerate.length > 0) {
            console.log(`🔄 [REGENERATE] Attempting to regenerate ${invalidUsecasesToRegenerate.length} invalid usecases...`);

            try {
                const regeneratedUsecases = await this.regenerateInvalidUsecases(
                    mergedText,
                    invalidUsecasesToRegenerate,
                    gemini,
                    language,
                    versionId,
                    version,
                    modelName,
                    userId,
                    projectId
                );

                if (regeneratedUsecases.length > 0) {
                    console.log(`✅ [REGENERATE] Successfully regenerated and saved ${regeneratedUsecases.length} usecases`);
                    allGeneratedUseCases.push(...regeneratedUsecases);
                } else {
                    console.warn(`⚠️ [REGENERATE] Failed to regenerate any usecases. ${invalidUsecasesToRegenerate.length} usecases were skipped.`);
                }
            } catch (regenerateError: any) {
                console.error(`❌ [REGENERATE] Error regenerating usecases:`, regenerateError.message);
                // Không throw error, chỉ log warning vì đã có một số usecases hợp lệ được lưu
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
     * ✅ MỚI: Regenerate các usecases bị lỗi validation
     */
    private async regenerateInvalidUsecases(
        mergedText: string,
        invalidUsecases: Array<{ name: string; errors: string[]; originalData?: any }>,
        gemini: GeminiService,
        language: string,
        versionId: string,
        version: any,
        modelName?: string,
        userId?: string,
        projectId?: string
    ): Promise<any[]> {
        const { Types } = await import("mongoose");
        const Usecase = (await import("../../../../../internal/model/usecase")).default;
        const regenerated: any[] = [];

        // Tạo prompt đặc biệt để regenerate các usecases bị lỗi
        const usecaseInfo = invalidUsecases.map((uc, idx) =>
            `${idx + 1}. "${uc.name}" - Lỗi: ${uc.errors.join(', ')}`
        ).join('\n');

        const regeneratePrompt = language === 'en-US'
            ? `**REGENERATE INVALID USE CASES**

The following ${invalidUsecases.length} use case(s) failed validation and need to be regenerated:

${usecaseInfo}

**ORIGINAL TEXT**:
${mergedText.substring(0, 3000)}

**REQUIREMENTS**:
- Regenerate exactly ${invalidUsecases.length} use case(s) with COMPLETE and VALID information
- Each use case MUST have:
  * name: A clear, descriptive name (REQUIRED, cannot be empty)
  * role: An object with "id", "name", and optional "description" (REQUIRED)
  * goal: A clear goal statement (REQUIRED, cannot be empty)
  * tasks: An array with at least one task (REQUIRED, cannot be empty)
  * reason: A reason for the use case (can use goal if not provided)
  * priority: "low", "medium", or "high" (default: "medium")
- Fix all validation errors mentioned above
- Ensure all required fields are present and valid

**OUTPUT FORMAT**: Return a JSON array with ${invalidUsecases.length} use case object(s), following the same structure as the generateBatchUseCases prompt.`
            : `**REGENERATE CÁC USE CASE BỊ LỖI**

Các use case sau đây (${invalidUsecases.length} use case) bị lỗi validation và cần được regenerate:

${usecaseInfo}

**VĂN BẢN GỐC**:
${mergedText.substring(0, 3000)}

**YÊU CẦU**:
- Regenerate chính xác ${invalidUsecases.length} use case với thông tin ĐẦY ĐỦ và HỢP LỆ
- Mỗi use case PHẢI có:
  * name: Tên rõ ràng, mô tả (BẮT BUỘC, không được để trống)
  * role: Một object có "id", "name", và tùy chọn "description" (BẮT BUỘC)
  * goal: Mục tiêu rõ ràng (BẮT BUỘC, không được để trống)
  * tasks: Một mảng có ít nhất một task (BẮT BUỘC, không được để trống)
  * reason: Lý do cho use case (có thể dùng goal nếu không có)
  * priority: "low", "medium", hoặc "high" (mặc định: "medium")
- Sửa tất cả các lỗi validation đã nêu ở trên
- Đảm bảo tất cả các field bắt buộc đều có và hợp lệ

**ĐỊNH DẠNG ĐẦU RA**: Trả về một mảng JSON với ${invalidUsecases.length} object use case, theo cấu trúc giống như generateBatchUseCases prompt.`;

        try {
            // Generate lại các usecases bị lỗi với prompt đặc biệt
            // Sử dụng generateUseCasesBatch nhưng với mergedText kèm regeneratePrompt
            const textWithRegenerateInfo = `${regeneratePrompt}\n\n**VĂN BẢN GỐC ĐẦY ĐỦ**:\n${mergedText}`;

            const regeneratedBatch = await gemini.generateUseCasesBatch(
                textWithRegenerateInfo,
                999, // Batch number đặc biệt cho regenerate
                1,
                0,
                invalidUsecases.length,
                language,
                modelName,
                userId,
                projectId
            );

            // Validate và lưu các usecases đã regenerate
            for (const uc of regeneratedBatch) {
                try {
                    // Normalize role structure
                    const normalized = this.normalizeRoleStructure([uc])[0];

                    // Map to database format
                    const relatedIds = (normalized.related_usecases || [])
                        .filter((id: any) => id && Types.ObjectId.isValid(String(id)))
                        .map((id: any) => new Types.ObjectId(String(id)));

                    const usecaseToCreate = {
                        project_id: version.project_id,
                        version_id: new Types.ObjectId(versionId),
                        name: normalized.name?.trim() || 'Unnamed Use Case',
                        role: normalized.role ? {
                            id: normalized.role.id || `role_${normalized.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`,
                            name: normalized.role.name || 'Unknown',
                            description: normalized.role.description || ''
                        } : { id: 'role_unknown', name: 'Unknown', description: '' },
                        goal: normalized.goal?.trim() || 'No goal specified',
                        reason: (normalized.reason || normalized.goal || 'No reason provided').trim(),
                        tasks: Array.isArray(normalized.tasks) && normalized.tasks.length > 0 ? normalized.tasks : ['Complete the use case'],
                        inputs: Array.isArray(normalized.inputs) ? normalized.inputs : [],
                        outputs: Array.isArray(normalized.outputs) ? normalized.outputs : [],
                        context: (normalized.context || '').trim(),
                        priority: (normalized.priority && ['low', 'medium', 'high'].includes(normalized.priority)) ? normalized.priority : 'medium',
                        feedback: normalized.feedback || null,
                        rules: Array.isArray(normalized.rules) ? normalized.rules : [],
                        triggers: Array.isArray(normalized.triggers) ? normalized.triggers : [],
                        preconditions: Array.isArray(normalized.preconditions) ? normalized.preconditions : [],
                        postconditions: Array.isArray(normalized.postconditions) ? normalized.postconditions : [],
                        exceptions: Array.isArray(normalized.exceptions) ? normalized.exceptions : [],
                        stakeholders: Array.isArray(normalized.stakeholders) ? normalized.stakeholders : [],
                        constraints: Array.isArray(normalized.constraints) ? normalized.constraints : [],
                        related_usecases: relatedIds,
                        created_by: version.created_by
                    };

                    // Validate
                    const doc = new Usecase(usecaseToCreate);
                    await doc.validate();
                    const saved = await doc.save();
                    regenerated.push(saved);
                    console.log(`✅ [REGENERATE] Successfully regenerated and saved usecase: "${usecaseToCreate.name}"`);
                } catch (regenerateError: any) {
                    console.error(`❌ [REGENERATE] Failed to regenerate usecase "${uc.name}":`, regenerateError.message);
                }
            }
        } catch (error: any) {
            console.error(`❌ [REGENERATE] Error during regeneration:`, error.message);
        }

        return regenerated;
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
            // 3. Xóa usecases cũ nếu full mode
            if (mode === 'full') {
                console.log(`🗑️ [FINALIZE] Deleting old use cases for full mode...`);
                await Usecase.deleteMany({ version_id: versionId });
            }

            // 4. Sử dụng Agent để generate usecases với state machine
            // ✅ Kiểm tra xem có resumeState trong version không (nếu đã lưu từ lần trước)
            const version = await Version.findById(versionId).lean();
            let resumeState = null;
            if (version && (version as any).resumeState) {
                resumeState = (version as any).resumeState;
                console.log(`🔄 [FINALIZE] Found resume state: ${resumeState.state}, savedCount: ${resumeState.savedCount}`);
            }

            const agentContext: AgentContext = {
                versionId,
                mergedText,
                language,
                mode,
                modelName,
                userId,
                projectId,
                resumeState: resumeState || undefined
            };

            const agent = new UsecaseGenerationAgent(gemini, agentContext);
            const result = await agent.run();

            // ✅ Nếu agent có resumeState sau khi chạy (do lỗi retryable), lưu vào version
            const agentResumeState = agent.getResumeState();
            if (agentResumeState) {
                const currentAgentContext = agent.getContext();
                await Version.findByIdAndUpdate(versionId, {
                    $set: {
                        resumeState: agentResumeState,
                        status: "paused", // ✅ Status paused thay vì failed
                        stage: "paused",
                        is_processing: false
                    }
                });
                console.log(`💾 [FINALIZE] Saved resume state for later continuation`);

                // Broadcast paused status
                const { inputSocketService } = await import("../../input/domain/input.socket.service");
                if (inputSocketService && projectId && versionId && userId) {
                    inputSocketService.emitIncrementalProgress(
                        projectId,
                        versionId,
                        userId,
                        Math.floor((result.totalGenerated / (currentAgentContext.estimatedCount || 1)) * 100),
                        "paused",
                        false, // isProcessing = false vì đã pause
                        undefined,
                        [agentResumeState.errorMessage],
                        undefined,
                        `⚠️ Đã tạm dừng: ${agentResumeState.errorMessage}. Đã lưu ${result.totalGenerated} usecases. Có thể tiếp tục sau...`
                    );
                }

                // Trả về partial results với thông báo có thể continue
                return {
                    version_id: versionId,
                    usecases: result.usecases,
                    newRequirements: result.usecases.slice(previousRequirements.length),
                    canResume: true,
                    resumeState: agentResumeState
                };
            }

            // ✅ Xóa resumeState nếu đã hoàn thành thành công
            if (resumeState) {
                await Version.findByIdAndUpdate(versionId, {
                    $unset: { resumeState: "" }
                });
                console.log(`✅ [FINALIZE] Cleared resume state after successful completion`);
            }

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
