import { Types } from "mongoose";
import Input from "../../../../../internal/model/input";
import Version from "../../../../../internal/model/version";
import Usecase from "../../../../../internal/model/usecase";
import { GeminiService } from "./GeminiService";

interface ProcessingContext {
    globalSummary?: string;
    identifiedRoles: Set<string>;
    keyDomains: Set<string>;
    previousChunkKeyPoints: string[];
}

interface ChunkProcessingResult {
    useCases: any[];
    keyContext: string;
    chunkIndex: number;
    processedLength: number;
}

export class RequirementService {
    private readonly MAX_CHUNK_SIZE = 8000; // Giảm để đảm bảo context
    private readonly OVERLAP_SIZE = 500; // Chồng lấn giữa các chunk
    private readonly MAX_GLOBAL_CONTEXT = 1000; // Context toàn cục tối đa

    /**
     * Helper function để lấy usecase ID từ _id
     */
    private getUsecaseId(uc: any): string {
        if (!uc) return '';
        return uc._id ? String(uc._id) : '';
    }

    /**
     * Chuẩn hóa ID cho use case (không cần nữa vì dùng _id)
     */
    private normalizeUseCaseIds<T extends Record<string, any>>(
        items: T[],
        style: "UC" | "number" = "UC"
    ): T[] {
        // Không cần normalize nữa vì dùng _id
        return items;
    }

    /**
     * Chunking thông minh - cắt theo ngữ nghĩa
     */
    private splitIntelligentChunks(text: string): string[] {
        if (!text || text.length <= this.MAX_CHUNK_SIZE) {
            return [text];
        }

        const chunks: string[] = [];

        // Ưu tiên cắt theo paragraph trước
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

        let currentChunk = "";
        let currentSize = 0;

        for (const paragraph of paragraphs) {
            const paragraphSize = paragraph.length;

            // Nếu paragraph quá lớn, cắt theo câu
            if (paragraphSize > this.MAX_CHUNK_SIZE * 0.8) {
                // Flush chunk hiện tại nếu có
                if (currentChunk) {
                    chunks.push(currentChunk);
                    currentChunk = "";
                    currentSize = 0;
                }

                // Xử lý paragraph lớn bằng cách cắt theo câu
                const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
                let sentenceChunk = "";

                for (const sentence of sentences) {
                    const sentenceSize = sentence.length;

                    if (sentenceChunk.length + sentenceSize > this.MAX_CHUNK_SIZE) {
                        if (sentenceChunk) {
                            chunks.push(sentenceChunk);
                            sentenceChunk = "";
                        }
                    }

                    sentenceChunk += (sentenceChunk ? ". " : "") + sentence.trim() + ".";
                }

                if (sentenceChunk) {
                    chunks.push(sentenceChunk);
                }
            } else {
                // Paragraph bình thường
                if (currentSize + paragraphSize > this.MAX_CHUNK_SIZE) {
                    if (currentChunk) {
                        chunks.push(currentChunk);
                    }
                    currentChunk = paragraph;
                    currentSize = paragraphSize;
                } else {
                    currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
                    currentSize += paragraphSize + 2; // +2 cho newlines
                }
            }
        }

        // Thêm chunk cuối cùng
        if (currentChunk) {
            chunks.push(currentChunk);
        }

        console.log(`📊 Split ${text.length} chars into ${chunks.length} intelligent chunks`);
        return chunks;
    }

    /**
     * Tạo context cho chunk tiếp theo
     */
    private createChunkContext(
        chunkIndex: number,
        totalChunks: number,
        globalContext: ProcessingContext,
        previousResults: ChunkProcessingResult[]
    ): string {
        const contextParts: string[] = [];

        // Global context từ toàn bộ văn bản
        if (globalContext.globalSummary) {
            contextParts.push(`TỔNG QUAN HỆ THỐNG: ${globalContext.globalSummary}`);
        }

        // Context từ các chunk trước (giới hạn để tránh quá dài)
        const recentContexts = previousResults
            .slice(-3) // Chỉ lấy 3 chunk gần nhất
            .map(result => result.keyContext)
            .filter(ctx => ctx && ctx.length < 200);

        if (recentContexts.length > 0) {
            contextParts.push(`CONTEXT TỪ PHẦN TRƯỚC: ${recentContexts.join(" | ")}`);
        }

        // Thông tin về roles và domains đã xác định
        if (globalContext.identifiedRoles.size > 0) {
            contextParts.push(`ROLES ĐÃ XÁC ĐỊNH: ${Array.from(globalContext.identifiedRoles).join(", ")}`);
        }

        if (globalContext.keyDomains.size > 0) {
            contextParts.push(`LĨNH VỰC CHÍNH: ${Array.from(globalContext.keyDomains).join(", ")}`);
        }

        // Thông tin vị trí chunk
        contextParts.push(`VỊ TRÍ: Đang xử lý phần ${chunkIndex + 1}/${totalChunks} của văn bản`);

        return contextParts.join("\n");
    }

    /**
     * Trích xuất key context từ kết quả xử lý
     */
    private extractKeyContext(useCases: any[], chunkText: string): string {
        if (!useCases || useCases.length === 0) {
            return "Chưa xác định được use case quan trọng";
        }

        const keyPoints: string[] = [];

        // Lấy 3 use case quan trọng nhất (priority high hoặc core functionality)
        const importantUseCases = useCases
            .filter(uc => uc.priority === 'high' ||
                uc.name?.toLowerCase().includes('quản lý') ||
                uc.name?.toLowerCase().includes('core') ||
                uc.goal?.toLowerCase().includes('quan trọng'))
            .slice(0, 3);

        for (const uc of importantUseCases) {
            if (uc.name) {
                keyPoints.push(uc.name);
            }
        }

        // Fallback: lấy use case đầu tiên nếu không có important
        if (keyPoints.length === 0 && useCases[0]?.name) {
            keyPoints.push(useCases[0].name);
        }

        return keyPoints.length > 0 ? keyPoints.join(", ") : "Đang phân tích tính năng hệ thống";
    }

    /**
     * Cập nhật global context từ kết quả xử lý
     */
    private updateGlobalContext(
        context: ProcessingContext,
        result: ChunkProcessingResult
    ): void {
        // Cập nhật roles
        result.useCases.forEach(uc => {
            if (uc.role?.name) {
                context.identifiedRoles.add(uc.role.name);
            }
        });

        // Cập nhật key domains từ use cases
        result.useCases.forEach(uc => {
            if (uc.context) {
                context.keyDomains.add(uc.context);
            }
            if (uc.name) {
                // Extract domain từ tên use case
                const domainKeywords = ['quản lý', 'hệ thống', 'module', 'tính năng'];
                domainKeywords.forEach(keyword => {
                    if (uc.name.toLowerCase().includes(keyword)) {
                        context.keyDomains.add(keyword);
                    }
                });
            }
        });

        // Giữ context từ chunk trước
        context.previousChunkKeyPoints.push(result.keyContext);
        if (context.previousChunkKeyPoints.length > 5) {
            context.previousChunkKeyPoints.shift(); // Giới hạn lịch sử
        }
    }

    /**
     * Hợp nhất use cases từ nhiều chunk một cách thông minh
     */
    private mergeUseCasesIntelligently(allResults: ChunkProcessingResult[]): any[] {
        const allUseCases = allResults.flatMap(result => result.useCases);

        console.log(`🔍 Processing ${allUseCases.length} use cases for intelligent merge`);

        const merged: any[] = [];
        const usedNames = new Set<string>();
        const usedGoals = new Set<string>();

        for (const uc of allUseCases) {
            const nameKey = (uc.name || '').toLowerCase().trim();
            const goalKey = (uc.goal || '').toLowerCase().trim();

            // Check for duplicates by name OR goal
            if (!usedNames.has(nameKey) && !usedGoals.has(goalKey)) {
                merged.push(uc);
                usedNames.add(nameKey);
                if (goalKey) usedGoals.add(goalKey);
            } else {
                console.log(`🔄 Skipping duplicate: "${uc.name}"`);
            }
        }

        console.log(`🎯 Merged ${allUseCases.length} → ${merged.length} unique use cases`);
        return merged;
    }

    /**
     * So sánh semantic similarity giữa 2 use case
     */
    /**
 * So sánh semantic similarity giữa 2 use case (FIXED VERSION)
 */
    private areUseCasesSimilar(uc1: any, uc2: any): boolean {
        // So sánh name và goal
        const name1 = (uc1.name || '').toLowerCase().trim();
        const name2 = (uc2.name || '').toLowerCase().trim();
        const goal1 = (uc1.goal || '').toLowerCase().trim();
        const goal2 = (uc2.goal || '').toLowerCase().trim();

        // Exact match
        if (name1 === name2 && name1 !== '') return true;
        if (goal1 === goal2 && goal1 !== '') return true;

        // Contains match
        if (name1 && name2 && (name1.includes(name2) || name2.includes(name1))) return true;
        if (goal1 && goal2 && (goal1.includes(goal2) || goal2.includes(goal1))) return true;

        // Keyword overlap (FIXED: không dùng spread operator với Set)
        const keywords1 = this.stringToKeywords(name1 + ' ' + goal1);
        const keywords2 = this.stringToKeywords(name2 + ' ' + goal2);

        const overlap = keywords1.filter(k =>
            keywords2.includes(k) && k.length > 3
        );

        return overlap.length >= 2; // Có ít nhất 2 keyword trùng
    }

    /**
     * Helper: Chuyển string thành array keywords (thay thế cho Set)
     */
    private stringToKeywords(text: string): string[] {
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const uniqueWords: string[] = [];
        const seen = new Set<string>();

        for (const word of words) {
            if (!seen.has(word)) {
                seen.add(word);
                uniqueWords.push(word);
            }
        }

        return uniqueWords;
    }

    /**
     * Hợp nhất chi tiết từ 2 use case tương tự
     */
    /**
 * Hợp nhất chi tiết từ 2 use case tương tự (FIXED VERSION)
 */
    private mergeUseCaseDetails(primary: any, secondary: any): any {
        const merged = { ...primary };

        // Merge tasks (loại bỏ trùng lặp - FIXED)
        if (secondary.tasks && Array.isArray(secondary.tasks)) {
            const existingTasks = primary.tasks || [];
            const newTasks = secondary.tasks.filter((task: string) =>
                !existingTasks.includes(task)
            );
            if (newTasks.length > 0) {
                merged.tasks = [...existingTasks, ...newTasks];
            }
        }

        // Merge inputs/outputs (FIXED)
        if (secondary.inputs && Array.isArray(secondary.inputs)) {
            const existingInputs = primary.inputs || [];
            const newInputs = secondary.inputs.filter((input: string) =>
                !existingInputs.includes(input)
            );
            if (newInputs.length > 0) {
                merged.inputs = [...existingInputs, ...newInputs];
            }
        }

        if (secondary.outputs && Array.isArray(secondary.outputs)) {
            const existingOutputs = primary.outputs || [];
            const newOutputs = secondary.outputs.filter((output: string) =>
                !existingOutputs.includes(output)
            );
            if (newOutputs.length > 0) {
                merged.outputs = [...existingOutputs, ...newOutputs];
            }
        }

        // Ưu tiên mô tả dài hơn
        if (secondary.description && secondary.description.length > (primary.description?.length || 0)) {
            merged.description = secondary.description;
        }

        return merged;
    }

    /**
     * Xử lý recovery khi chunk processing fail
     */
    private async processChunkWithRetry(
        chunk: string,
        context: string,
        gemini: GeminiService,
        language: string,
        retryCount = 2
    ): Promise<ChunkProcessingResult> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                console.log(`🔄 Processing chunk (attempt ${attempt + 1}/${retryCount + 1})`);

                // Giảm kích thước chunk nếu retry
                let processedChunk = chunk;
                if (attempt > 0 && chunk.length > 4000) {
                    processedChunk = chunk.slice(0, 4000);
                    console.log(`📉 Reduced chunk size to ${processedChunk.length} for retry`);
                }

                const useCases = await gemini.analyzeRequirements(
                    `CONTEXT CHO PHẦN NÀY:\n${context}\n\nNỘI DUNG CẦN PHÂN TÍCH:\n${processedChunk}`,
                    language
                );

                const keyContext = this.extractKeyContext(useCases, processedChunk);

                return {
                    useCases: useCases || [],
                    keyContext,
                    chunkIndex: 0, // sẽ được cập nhật sau
                    processedLength: processedChunk.length
                };

            } catch (error: any) {
                lastError = error;
                console.error(`❌ Chunk processing attempt ${attempt + 1} failed:`, error.message);

                if (attempt < retryCount) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        // Nếu tất cả retry đều fail, trả về kết quả rỗng
        console.error(`💥 All retries failed for chunk, returning empty result`);
        return {
            useCases: [],
            keyContext: "Xử lý thất bại, bỏ qua phần này",
            chunkIndex: 0,
            processedLength: chunk.length
        };
    }

    /**
     * PHIÊN BẢN MỚI: Phân tích requirements với xử lý chunk thông minh
     */
    async finalize(
        versionId: string,
        mode: "full" | "incremental",
        inputs: any[],
        gemini: GeminiService,
        language: string
    ) {
        // 1. Lấy dữ liệu ban đầu
        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        // Lấy usecases hiện có từ collection
        const previousRequirements = await Usecase.find({ version_id: versionId }).lean();
        const markAsProcessed = inputs.map((i: any) => String(i._id));

        // 2. Chuẩn bị text đầu vào
        const mergedText = inputs
            .map((i: any) => (i.cleaned_text || i.raw_text || ""))
            .filter(Boolean)
            .join("\n\n");

        if (!mergedText || mergedText.trim().length === 0) {
            console.log("⏩ No text to process");
            return { version_id: versionId, usecases: previousRequirements };
        }

        console.log(`📝 Processing text: ${mergedText.length} characters`);

        // 3. Chunking thông minh
        const chunks = this.splitIntelligentChunks(mergedText);
        console.log(`📊 Split into ${chunks.length} chunks`);

        // 4. Khởi tạo context toàn cục
        const globalContext: ProcessingContext = {
            identifiedRoles: new Set(),
            keyDomains: new Set(),
            previousChunkKeyPoints: []
        };

        const chunkResults: ChunkProcessingResult[] = [];
        const processingErrors: string[] = [];

        // 5. Xử lý tuần tự từng chunk với context
        for (let i = 0; i < chunks.length; i++) {
            try {
                console.log(`🔍 Processing chunk ${i + 1}/${chunks.length}`);

                const chunkContext = this.createChunkContext(i, chunks.length, globalContext, chunkResults);

                const result = await this.processChunkWithRetry(
                    chunks[i],
                    chunkContext,
                    gemini,
                    language
                );

                result.chunkIndex = i;
                chunkResults.push(result);

                // Cập nhật global context
                this.updateGlobalContext(globalContext, result);

                console.log(`✅ Chunk ${i + 1} processed: ${result.useCases.length} use cases found`);

                // Delay giữa các chunk để tránh rate limit
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } catch (error: any) {
                const errorMsg = `Chunk ${i + 1} processing failed: ${error.message}`;
                console.error(`❌ ${errorMsg}`);
                processingErrors.push(errorMsg);

                // Thêm kết quả rỗng để tiếp tục xử lý
                chunkResults.push({
                    useCases: [],
                    keyContext: `ERROR: ${error.message}`,
                    chunkIndex: i,
                    processedLength: chunks[i].length
                });
            }
        }

        // 6. Xử lý lỗi tổng thể
        if (processingErrors.length > 0) {
            console.error("❌ Errors during processing, marking as failed");

            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    status: "failed",
                    stage: "failed",
                    progress: 100,
                    processing_errors: processingErrors
                }
            });

            return {
                version_id: versionId,
                usecases: previousRequirements,
                errors: processingErrors
            };
        }

        // 7. Hợp nhất kết quả từ tất cả chunks
        let newRequirements = this.mergeUseCasesIntelligently(chunkResults);

        // Lọc use case hợp lệ
        newRequirements = newRequirements.filter(uc =>
            uc && typeof uc === 'object' &&
            ((uc.name && uc.name.trim() !== "") || (uc.goal && uc.goal.trim() !== ""))
        );

        console.log(`🎯 Final new requirements: ${newRequirements.length} use cases`);

        // 8. Normalize role structure
        newRequirements = this.normalizeRoleStructure(newRequirements);

        // 8. Xử lý mode full: xóa usecases cũ nếu cần
        if (mode === 'full') {
            await Usecase.deleteMany({ version_id: versionId });
        }

        // 9. Bổ sung related use cases (trước khi tạo)
        let requirementsWithRelations = newRequirements;
        if (newRequirements.length > 1 || (mode === 'incremental' && previousRequirements.length > 0)) {
            try {
                const allForRelations = mode === 'incremental' 
                    ? [...previousRequirements, ...newRequirements]
                    : newRequirements;
                requirementsWithRelations = await gemini.addRelatedUseCases(
                    allForRelations,
                    { incremental: mode === "incremental" },
                    language
                );
                // Chỉ lấy phần mới nếu là incremental
                if (mode === 'incremental') {
                    requirementsWithRelations = requirementsWithRelations.slice(previousRequirements.length);
                }
            } catch (err: any) {
                console.error("⚠️ Error adding related use cases:", err.message);
            }
        }

        // 10. Map related_usecases từ string sang ObjectId và tạo usecases
        const usecasesToCreate = requirementsWithRelations.map((uc: any) => {
            const relatedIds = (uc.related_usecases || [])
                .filter((id: any) => id && Types.ObjectId.isValid(String(id)))
                .map((id: any) => new Types.ObjectId(String(id)));

            return {
                project_id: version.project_id,
                version_id: new Types.ObjectId(versionId),
                name: uc.name,
                role: uc.role,
                goal: uc.goal,
                reason: uc.reason || '',
                tasks: uc.tasks || [],
                inputs: uc.inputs || [],
                outputs: uc.outputs || [],
                context: uc.context || '',
                priority: uc.priority || 'medium',
                feedback: uc.feedback || null,
                rules: uc.rules || [],
                triggers: uc.triggers || [],
                preconditions: uc.preconditions || [],
                postconditions: uc.postconditions || [],
                exceptions: uc.exceptions || [],
                stakeholders: uc.stakeholders || [],
                constraints: uc.constraints || [],
                related_usecases: relatedIds,
                created_by: version.created_by
            };
        });

        // Tạo usecases mới
        if (usecasesToCreate.length > 0) {
            await Usecase.insertMany(usecasesToCreate);
        }

        // 11. Đánh dấu đã xử lý và cập nhật version
        if (markAsProcessed.length > 0) {
            await Input.updateMany({ _id: { $in: markAsProcessed } }, { $set: { is_processed: true } });
        }

        await Version.findByIdAndUpdate(versionId, {
            $set: {
                affects_requirement: true,
                status: "completed",
                stage: "completed",
            }
        });

        // Lấy lại danh sách usecases sau khi tạo
        const finalUsecases = await Usecase.find({ version_id: versionId }).lean();

        console.log(`✅ Successfully processed ${usecasesToCreate.length} new use cases`);

        return {
            version_id: versionId,
            usecases: finalUsecases,
            newRequirements: newRequirements,
        };
    }

    /**
     * Normalize role structure (giữ nguyên từ version cũ)
     */
    private normalizeRoleStructure(requirements: any[]): any[] {
        return requirements.map(uc => {
            if (!uc.role) return uc;

            if (typeof uc.role === 'string') {
                uc.role = {
                    id: `role_${uc.role.toLowerCase().replace(/\s+/g, '_')}`,
                    name: uc.role
                };
            } else if (typeof uc.role === 'object' && !uc.role.id) {
                uc.role.id = `role_${uc.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`;
            }

            return uc;
        });
    }

    // Các method khác giữ nguyên từ version cũ...
    // (resolveDuplicate, isConflict, findConflicts, resolveConflict)

    async resolveDuplicate(versionId: string, conflictId: string, keep: "old" | "new") {
        const version = await Version.findById(versionId);
        if (!version) throw new Error("Version not found");

        const pendingConflicts = version.pending_conflicts || [];
        const conflictIndex = pendingConflicts.findIndex((c: any) => c.conflict_id === conflictId);
        if (conflictIndex === -1) throw new Error("Conflict not found");

        const conflict = pendingConflicts[conflictIndex];
        
        // Conflict items giờ là array of ObjectId
        const conflictItemIds = conflict.items.map((id: any) => String(id));
        
        if (keep === "new") {
            // Xóa tất cả items trong conflict
            await Usecase.deleteMany({ 
                _id: { $in: conflictItemIds },
                version_id: versionId 
            });
        } else {
            // Xóa tất cả trừ item đầu tiên (old)
            const keepId = conflictItemIds[0];
            const idsToDelete = conflictItemIds.slice(1);
            if (idsToDelete.length > 0) {
                await Usecase.deleteMany({ 
                    _id: { $in: idsToDelete.map(id => new Types.ObjectId(id)) },
                    version_id: versionId 
                });
            }
        }

        // Xóa conflict
        version.pending_conflicts.splice(conflictIndex, 1);
        version.updated_at = new Date();
        await version.save();

        // Lấy lại danh sách usecases
        const finalUsecases = await Usecase.find({ version_id: versionId }).lean();

        return {
            version_id: versionId,
            usecases: finalUsecases,
            resolved: { conflict_id: conflictId, kept: keep },
        };
    }

    private async isConflict(reqA: any, reqB: any, gemini: GeminiService, language: string): Promise<boolean> {
        const a = (reqA.name || reqA.goal || "").trim();
        const b = (reqB.name || reqB.goal || "").trim();
        if (!a || !b) return false;

        try {
            const result: boolean = await gemini.checkConflictWithGemini(a, b, language);
            return result;
        } catch (err: any) {
            console.error("❌ Gemini conflict check error:", err.message);
            return false;
        }
    }

    async findConflicts(versionId: string, gemini: GeminiService, language: string) {
        const version = await Version.findById(versionId);
        if (!version) throw new Error("Version not found.");

        // Lấy usecases từ collection
        const useCases = await Usecase.find({ version_id: versionId }).lean();
        if (useCases.length < 2) {
            return { message: "Not enough use cases to compare.", conflicts_found: 0 };
        }

        const conflictIdGroups = await gemini.findConflictGroups(useCases, language);

        if (conflictIdGroups.length === 0) {
            version.set('pending_conflicts', []);
            version.status = "completed";
            await version.save();
            return { version_id: versionId, conflicts_found: 0, conflicts: [] };
        }

        // Map conflict groups: chuyển từ id (string) sang ObjectId
        const pending_conflicts = conflictIdGroups.map(idGroup => {
            const itemIds = idGroup
                .filter(id => Types.ObjectId.isValid(id))
                .map(id => new Types.ObjectId(id));
            
            return {
                conflict_id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                items: itemIds
            };
        });

        version.pending_conflicts = pending_conflicts as any;
        version.status = "has_conflicts";
        await version.save();

        return {
            version_id: versionId,
            conflicts_found: pending_conflicts.length,
            conflicts: version.pending_conflicts,
        };
    }

    async resolveConflict(versionId: string, conflictId: string, keepUseCaseId: string) {
        const version = await Version.findById(versionId);
        if (!version) throw new Error("Version not found");

        const conflictIndex = version.pending_conflicts.findIndex(
            (c: any) => c.conflict_id === conflictId
        );
        if (conflictIndex === -1) throw new Error("Conflict not found");

        const conflict = version.pending_conflicts[conflictIndex];
        
        // Conflict items giờ là array of ObjectId
        const conflictItemIds = conflict.items.map((id: any) => String(id));
        const keepUseCaseObjectId = new Types.ObjectId(keepUseCaseId);
        
        // Kiểm tra keepUseCaseId có trong conflict không
        if (!conflictItemIds.includes(keepUseCaseId)) {
            throw new Error(
                `Invalid keepUseCaseId '${keepUseCaseId}' for this conflict group.`
            );
        }

        // Xóa các usecases không được giữ lại
        const idsToRemove = conflictItemIds
            .filter(id => id !== keepUseCaseId)
            .map(id => new Types.ObjectId(id));

        if (idsToRemove.length > 0) {
            // Xóa usecases
            await Usecase.deleteMany({ 
                _id: { $in: idsToRemove },
                version_id: versionId 
            });

            // Xóa references từ các usecases còn lại
            await Usecase.updateMany(
                { version_id: versionId },
                { $pull: { related_usecases: { $in: idsToRemove } } }
            );
        }

        // Xóa conflict
        version.pending_conflicts.splice(conflictIndex, 1);
        if (version.pending_conflicts.length === 0) {
            version.status = "completed";
        }
        version.updated_at = new Date();
        await version.save();

        // Lấy lại danh sách usecases
        const finalUsecases = await Usecase.find({ version_id: versionId }).lean();

        return {
            version_id: versionId,
            usecases: finalUsecases,
            resolved: { conflict_id: conflictId, kept_id: keepUseCaseId },
        };
    }
}