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
    private readonly BATCH_INSERT_SIZE = 50; // Số use case insert mỗi lần để tránh memory issue
    private readonly MAX_CHUNKS = 1000; // Giới hạn số chunks tối đa để tránh xử lý quá lâu

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
        retryCount = 2,
        chunkIndex?: number,
        totalChunks?: number
    ): Promise<ChunkProcessingResult> {
        let lastError: Error | null = null;
        let hasNonRetryableError = false;
        // ✅ TĂNG TIMEOUT: 2 phút → 5 phút để đủ cho response lớn (48 usecases có thể mất thời gian parse)
        const LLM_TIMEOUT = 300000; // 5 phút timeout cho mỗi LLM call
        const chunkLabel = chunkIndex ? `[Chunk ${chunkIndex}${totalChunks ? `/${totalChunks}` : ''}]` : '[Chunk]';

        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                console.log(`🔄 ${chunkLabel} Processing attempt ${attempt + 1}/${retryCount + 1} (chunk size: ${chunk.length} chars)`);

                // Giảm kích thước chunk nếu retry
                let processedChunk = chunk;
                if (attempt > 0 && chunk.length > 4000) {
                    processedChunk = chunk.slice(0, 4000);
                    console.log(`📉 ${chunkLabel} Reduced chunk size to ${processedChunk.length} chars for retry`);
                }

                // ✅ CẢI THIỆN: Tăng timeout cho single call (response có thể lớn)
                // Nếu text nhỏ, dùng timeout dài hơn (5 phút)
                // Nếu text lớn, dùng timeout ngắn hơn (3 phút)
                const estimatedTokens = Math.ceil(processedChunk.length / 3);
                const dynamicTimeout = estimatedTokens < 1000 ? 300000 : 180000; // 5 phút cho text nhỏ, 3 phút cho text lớn
                
                console.log(`${chunkLabel} ⏱️ Using timeout: ${Math.floor(dynamicTimeout / 1000)}s for ${estimatedTokens} tokens`);

                // Thêm timeout cho LLM call
                const useCases = await Promise.race([
                    gemini.analyzeRequirements(
                        `CONTEXT CHO PHẦN NÀY:\n${context}\n\nNỘI DUNG CẦN PHÂN TÍCH:\n${processedChunk}`,
                        language,
                        undefined, // userId
                        undefined, // projectId
                        chunkIndex, // chunkIndex for logging
                        totalChunks // totalChunks for logging
                    ),
                    new Promise<any[]>((_, reject) =>
                        setTimeout(() => reject(new Error(`LLM call timeout after ${Math.floor(dynamicTimeout / 1000)} seconds`)), dynamicTimeout)
                    )
                ]);

                // ✅ QUAN TRỌNG: Nếu có partial results, luôn return chúng thay vì throw error
                // analyzeRequirements() đã xử lý việc return partial results khi có lỗi
                if (useCases && useCases.length > 0) {
                    const keyContext = this.extractKeyContext(useCases, processedChunk);
                    console.log(`✅ ${chunkLabel} Received ${useCases.length} use cases from analyzeRequirements (attempt ${attempt + 1})`);
                    
                    return {
                        useCases: useCases || [],
                        keyContext,
                        chunkIndex: 0, // sẽ được cập nhật sau
                        processedLength: processedChunk.length
                    };
                }

                // Nếu không có use cases nào, throw error
                throw new Error("No use cases returned from analyzeRequirements");

            } catch (error: any) {
                lastError = error;
                console.error(`❌ ${chunkLabel} Processing attempt ${attempt + 1}/${retryCount + 1} failed:`, error.message);

                // Kiểm tra nếu là lỗi không retryable (API key sai, quota hết, etc.)
                const { analyzeApiKeyError, ApiKeyErrorType } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(error);

                if (!errorInfo.retryable) {
                    hasNonRetryableError = true;
                    console.error(`💥 Non-retryable error detected: ${errorInfo.type}. Stopping retries and throwing error.`);
                    // Throw ngay lập tức với lỗi không retryable
                    throw error;
                }

                // Chỉ retry nếu lỗi có thể retry được
                if (attempt < retryCount && errorInfo.retryable) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                } else if (attempt === retryCount) {
                    // Đã hết số lần retry, break để throw error
                    break;
                }
            }
        }

        // Nếu có lỗi không retryable hoặc tất cả retry đều fail, throw error
        if (hasNonRetryableError || lastError) {
            console.error(`💥 All retries failed for chunk. Throwing error to stop processing.`);
            throw lastError || new Error("Chunk processing failed after all retries");
        }

        // Fallback: trả về kết quả rỗng (không nên đến đây)
        console.warn(`⚠️ Unexpected: returning empty result without error`);
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
        language: string,
        modelName?: string // ✅ MỚI: Model name để tính toán token limits
    ) {
        // 1. Lấy dữ liệu ban đầu
        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        // Lấy usecases hiện có từ collection
        const previousRequirements = await Usecase.find({ version_id: versionId }).lean();
        const markAsProcessed = inputs.map((i: any) => String(i._id));

        // 2. Chuẩn bị text đầu vào và validate
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

        // ✅ Validate và clean text trước khi xử lý
        const { validateTextForLLM, cleanTextForLLM, splitTextIntoSafeChunks, detectTruncation } = await import("../../../shared/textPreprocessor");
        const validation = validateTextForLLM(mergedText);
        
        if (validation.warnings.length > 0) {
            console.warn(`⚠️ Text validation warnings:`, validation.warnings);
        }

        // Sử dụng cleaned text
        mergedText = validation.cleanedText;
        console.log(`📝 Processing text: ${validation.originalLength} -> ${validation.cleanedLength} characters (estimated ${validation.estimatedTokens} tokens)`);
        
        // Cảnh báo nếu text quá dài
        if (validation.estimatedTokens > 100000) {
            console.warn(`⚠️ Text rất dài (${validation.estimatedTokens} tokens). Có thể mất nhiều thời gian xử lý.`);
        }
        
        // Kiểm tra xem có bị truncate không (so với original inputs)
        const originalText = inputs.map((i: any) => (i.cleaned_text || i.raw_text || "")).join("\n\n");
        const truncationCheck = detectTruncation(originalText, mergedText);
        if (truncationCheck.isTruncated) {
            console.warn(`⚠️ Phát hiện text có thể bị truncate: mất ${truncationCheck.missingChars} ký tự (${truncationCheck.lossPercentage.toFixed(1)}%)`);
        }

        // 3. Chunking thông minh với validation dựa trên model capabilities
        // ✅ MỚI: Lấy model config để tính toán chunk size phù hợp
        const { getModelConfig, determineStrategy, logTokenInfo } = await import("../../../shared/tokenManager");
        
        // Lấy model name từ parameter hoặc dùng default
        const effectiveModelName = modelName || 'gemini-2.0-flash';
        const modelConfig = getModelConfig(effectiveModelName, 'gemini');
        const strategy = determineStrategy(mergedText, modelConfig);
        
        // Log token analysis
        logTokenInfo(mergedText, modelConfig, 'RequirementService');
        
        // Tính toán chunk size dựa trên model config
        let chunkSize = this.MAX_CHUNK_SIZE;
        if (strategy.needsChunking && strategy.recommendedChunkSize > 0) {
            // Sử dụng recommended chunk size từ model config
            // Nhưng không vượt quá MAX_CHUNK_SIZE để đảm bảo chất lượng
            chunkSize = Math.min(strategy.recommendedChunkSize, this.MAX_CHUNK_SIZE);
            console.log(`📊 Using model-aware chunk size: ${chunkSize.toLocaleString()} chars (model: ${modelConfig.modelName}, strategy: ${strategy.strategy})`);
        } else if (!strategy.needsChunking) {
            // Text vừa với context window → có thể dùng chunk lớn hơn
            const safeSize = Math.min(strategy.recommendedChunkSize, modelConfig.contextWindow * modelConfig.tokenEstimationRatio * 0.8);
            if (safeSize > chunkSize) {
                chunkSize = safeSize;
                console.log(`📊 Text fits context window. Using larger chunk size: ${chunkSize.toLocaleString()} chars`);
            }
        }
        
        // Sử dụng utility mới để đảm bảo không mất dữ liệu
        const chunks = splitTextIntoSafeChunks(mergedText, chunkSize, this.OVERLAP_SIZE);
        console.log(`📊 Split into ${chunks.length} safe chunks (max ${chunkSize.toLocaleString()} chars, overlap ${this.OVERLAP_SIZE} chars)`);
        console.log(`📊 Chunk sizes:`, chunks.map((c, idx) => `Chunk ${idx + 1}: ${c.length.toLocaleString()} chars`).join(', '));
        
        // Validate từng chunk (chỉ log warnings, không block)
        for (let i = 0; i < chunks.length; i++) {
            const chunkValidation = validateTextForLLM(chunks[i]);
            if (chunkValidation.warnings.length > 0) {
                console.warn(`⚠️ Chunk ${i + 1}/${chunks.length} warnings:`, chunkValidation.warnings.slice(0, 2)); // Chỉ log 2 warnings đầu
            }
        }

        // Kiểm tra giới hạn số chunks
        if (chunks.length > this.MAX_CHUNKS) {
            console.warn(`⚠️ Số chunks (${chunks.length}) vượt quá giới hạn (${this.MAX_CHUNKS}). Chỉ xử lý ${this.MAX_CHUNKS} chunks đầu tiên.`);
            chunks.splice(this.MAX_CHUNKS);
        }

        // 3.1. Kiểm tra checkpoint để resume
        const checkpoint = (version as any).processing_checkpoint;
        let startChunkIndex = 0;
        let processedChunkIndices: Set<number> = new Set();
        let isResuming = false;

        if (checkpoint && typeof checkpoint === 'object') {
            const checkpointTextHash = checkpoint.text_hash;
            const checkpointChunks = checkpoint.processed_chunks || [];
            const currentTextHash = this.calculateTextHash(mergedText);

            // Chỉ resume nếu text hash giống nhau (cùng input)
            if (checkpointTextHash === currentTextHash && checkpointChunks.length > 0) {
                isResuming = true;
                processedChunkIndices = new Set(checkpointChunks);
                const maxChunk = Math.max(...checkpointChunks);
                startChunkIndex = maxChunk >= 0 ? maxChunk + 1 : 0; // Đảm bảo không bị -Infinity
                const totalUseCasesFromCheckpoint = checkpoint.total_use_cases || 0;
                console.log(`🔄 [RESUME] Resuming from checkpoint:`);
                console.log(`   📍 Processed chunks: ${checkpointChunks.length}/${chunks.length} (indices: ${checkpointChunks.map(c => c + 1).join(', ')})`);
                console.log(`   📍 Starting from chunk: ${startChunkIndex + 1}/${chunks.length}`);
                console.log(`   📍 Use cases already saved: ${totalUseCasesFromCheckpoint}`);
            } else {
                // Text đã thay đổi, clear checkpoint
                console.log(`🔄 Checkpoint found but text hash mismatch. Clearing checkpoint and starting fresh.`);
                await Version.findByIdAndUpdate(versionId, {
                    $unset: { processing_checkpoint: "" }
                });
            }
        }

        // 4. Khởi tạo context toàn cục
        const globalContext: ProcessingContext = {
            identifiedRoles: new Set(),
            keyDomains: new Set(),
            previousChunkKeyPoints: []
        };

        const chunkResults: ChunkProcessingResult[] = [];
        const processingErrors: string[] = [];
        let totalProcessedChunks = 0;
        let totalUseCasesCreated = 0;

        // 5. Xử lý tuần tự từng chunk với context và lưu partial results
        for (let i = startChunkIndex; i < chunks.length; i++) {
            // Skip chunk đã xử lý nếu đang resume
            if (isResuming && processedChunkIndices.has(i)) {
                console.log(`⏩ Skipping chunk ${i + 1} (already processed in checkpoint)`);
                continue;
            }

            try {
                const chunkSize = chunks[i].length;
                const chunkStartPos = chunks.slice(0, i).reduce((sum, c) => sum + c.length, 0);
                const chunkEndPos = chunkStartPos + chunkSize;
                const totalTextLength = mergedText.length;
                const chunkProgressPercent = Math.round((chunkEndPos / totalTextLength) * 100);
                
                console.log(`🔍 [Chunk ${i + 1}/${chunks.length}] Processing chunk ${i + 1}${isResuming ? ' (resuming)' : ''}`);
                console.log(`   📏 Chunk size: ${chunkSize} chars | Position: ${chunkStartPos}-${chunkEndPos}/${totalTextLength} (${chunkProgressPercent}% of text)`);
                console.log(`   📝 Chunk preview: ${chunks[i].substring(0, 100).replace(/\n/g, ' ')}...`);

                // Cập nhật progress chi tiết
                const chunkProgress = 40 + Math.floor((i / chunks.length) * 50); // 40-90%
                await Version.findByIdAndUpdate(versionId, {
                    $set: {
                        progress: chunkProgress,
                        stage: "analyzing"
                    }
                });

                const chunkContext = this.createChunkContext(i, chunks.length, globalContext, chunkResults);

                const result = await this.processChunkWithRetry(
                    chunks[i],
                    chunkContext,
                    gemini,
                    language,
                    2, // retryCount
                    i + 1, // chunkIndex for logging
                    chunks.length // totalChunks for logging
                );

                result.chunkIndex = i;
                chunkResults.push(result);

                // Cập nhật global context
                this.updateGlobalContext(globalContext, result);

                console.log(`✅ [Chunk ${i + 1}/${chunks.length}] Processed successfully: ${result.useCases.length} use cases found`);
                console.log(`   📊 Progress: ${i + 1}/${chunks.length} chunks (${Math.round(((i + 1) / chunks.length) * 100)}%) | Total use cases so far: ${totalUseCasesCreated + result.useCases.length}`);

                // Lưu partial results sau mỗi chunk thành công (batch insert)
                if (result.useCases.length > 0) {
                    try {
                        const partialUseCases = await this.savePartialUseCases(
                            version,
                            result.useCases,
                            mode === 'full' && i === 0 // Chỉ xóa use cases cũ ở chunk đầu tiên nếu full mode
                        );
                        totalUseCasesCreated += partialUseCases;
                        console.log(`💾 [Chunk ${i + 1}/${chunks.length}] Saved ${partialUseCases} use cases to database (total: ${totalUseCasesCreated})`);
                    } catch (saveError: any) {
                        console.error(`⚠️ [Chunk ${i + 1}/${chunks.length}] Failed to save partial use cases:`, saveError.message);
                        processingErrors.push(`Chunk ${i + 1} save failed: ${saveError.message}`);
                        // Không throw, tiếp tục xử lý chunk tiếp theo
                    }
                }

                totalProcessedChunks++;
                processedChunkIndices.add(i);

                // Lưu checkpoint sau mỗi chunk thành công
                await this.saveCheckpoint(versionId, mergedText, Array.from(processedChunkIndices), totalUseCasesCreated);
                console.log(`💾 [Chunk ${i + 1}/${chunks.length}] Checkpoint saved: ${processedChunkIndices.size}/${chunks.length} chunks processed`);

                // Cleanup memory: xóa chunk đã xử lý khỏi memory
                chunks[i] = null as any;

                // Delay giữa các chunk để tránh rate limit
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } catch (error: any) {
                const errorMsg = `Chunk ${i + 1} processing failed: ${error.message}`;
                console.error(`❌ ${errorMsg}`);
                processingErrors.push(errorMsg);

                // Kiểm tra nếu là lỗi không retryable (API key sai, quota hết, etc.)
                const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(error);

                // ✅ QUAN TRỌNG: Nếu đã có partial results được lưu (totalUseCasesCreated > 0),
                // không throw error ngay mà tiếp tục xử lý để return partial success
                const hasPartialResults = totalUseCasesCreated > 0;

                if (!errorInfo.retryable) {
                    if (hasPartialResults) {
                        // Có partial results → không throw error, tiếp tục để return partial success
                        console.warn(`⚠️ Non-retryable error (${errorInfo.type}) detected, but ${totalUseCasesCreated} use cases already saved. Continuing to return partial success.`);
                        chunkResults.push({
                            useCases: [],
                            keyContext: `ERROR: ${error.message}`,
                            chunkIndex: i,
                            processedLength: chunks[i].length
                        });
                        // Không throw, tiếp tục xử lý để return partial success ở cuối
                    } else {
                        // Không có partial results → throw error để dừng ngay
                        console.error(`💥 Critical non-retryable error detected: ${errorInfo.type}. No partial results. Stopping all processing.`);
                        const enhancedError = error;
                        if (!enhancedError.errors) {
                            enhancedError.errors = processingErrors;
                        }
                        throw enhancedError;
                    }
                } else {
                    // Lỗi retryable → thêm kết quả rỗng và tiếp tục
                    chunkResults.push({
                        useCases: [],
                        keyContext: `ERROR: ${error.message}`,
                        chunkIndex: i,
                        processedLength: chunks[i].length
                    });
                }
            }
        }

        // 6. Xử lý lỗi tổng thể - cho phép partial success
        const hasPartialResults = totalUseCasesCreated > 0;
        const errorRate = processingErrors.length / chunks.length;
        const isPartialSuccess = hasPartialResults && errorRate < 0.5; // Cho phép partial success nếu < 50% chunks fail

        if (processingErrors.length > 0) {
            if (isPartialSuccess) {
                console.warn(`⚠️ Partial success: ${totalUseCasesCreated} use cases created from ${totalProcessedChunks} chunks, but ${processingErrors.length} chunks failed`);

                // Cập nhật status thành completed với warning
                await Version.findByIdAndUpdate(versionId, {
                    $set: {
                        status: "completed",
                        stage: "completed",
                        progress: 100,
                        processing_errors: processingErrors,
                        affects_requirement: true,
                        is_processing: false // ✅ QUAN TRỌNG: Reset flag để UI dừng loading
                    }
                });

                // Đánh dấu inputs đã xử lý (partial success)
                if (markAsProcessed.length > 0) {
                    await Input.updateMany({ _id: { $in: markAsProcessed } }, { $set: { is_processed: true } });
                }

                const finalUsecases = await Usecase.find({ version_id: versionId }).lean();
                return {
                    version_id: versionId,
                    usecases: finalUsecases,
                    newRequirements: finalUsecases.slice(previousRequirements.length),
                    warnings: processingErrors,
                    partialSuccess: true
                };
            } else {
                console.error("❌ Too many errors during processing, marking as failed");

                // Giữ lại checkpoint để có thể resume sau (chỉ nếu có chunks đã xử lý)
                let checkpoint = null;
                if (processedChunkIndices.size > 0) {
                    checkpoint = {
                        text_hash: this.calculateTextHash(mergedText),
                        processed_chunks: Array.from(processedChunkIndices).sort((a, b) => a - b), // Sort để đảm bảo thứ tự
                        total_use_cases: totalUseCasesCreated,
                        last_updated: new Date()
                    };
                }

                await Version.findByIdAndUpdate(versionId, {
                    $set: {
                        status: "failed",
                        stage: "failed",
                        progress: 100,
                        processing_errors: processingErrors,
                        ...(checkpoint ? { processing_checkpoint: checkpoint } : {}) // Chỉ set checkpoint nếu có
                    }
                });

                // KHÔNG đánh dấu is_processed = true khi có quá nhiều lỗi
                return {
                    version_id: versionId,
                    usecases: previousRequirements,
                    errors: processingErrors,
                    canResume: checkpoint !== null, // Chỉ có thể resume nếu có checkpoint hợp lệ
                    checkpoint: checkpoint
                };
            }
        }

        // 7. Bọc toàn bộ logic xử lý trong try-catch để đảm bảo chỉ đánh dấu is_processed khi thành công
        try {
            // 7. Hợp nhất kết quả từ tất cả chunks (nếu chưa lưu hết)
            // Lấy use cases đã lưu từ DB để merge với các chunk chưa lưu
            const savedUseCases = await Usecase.find({ version_id: versionId }).lean();

            // Nếu đã lưu partial results, chỉ cần xử lý related use cases
            if (totalUseCasesCreated > 0) {
                console.log(`📊 Đã lưu ${totalUseCasesCreated} use cases từ ${totalProcessedChunks} chunks. Xử lý related use cases...`);

                // Bổ sung related use cases cho các use cases đã lưu
                if (savedUseCases.length > 1 || (mode === 'incremental' && previousRequirements.length > 0)) {
                    try {
                        const allForRelations = mode === 'incremental'
                            ? [...previousRequirements, ...savedUseCases]
                            : savedUseCases;
                        const requirementsWithRelations = await gemini.addRelatedUseCases(
                            allForRelations,
                            { incremental: mode === "incremental" },
                            language
                        );

                        // Cập nhật related_usecases cho các use cases đã lưu
                        await this.updateRelatedUseCases(requirementsWithRelations, versionId, mode === 'incremental' ? previousRequirements.length : 0);
                    } catch (err: any) {
                        console.error("⚠️ Error adding related use cases:", err.message);
                        // Lỗi này không critical, tiếp tục
                    }
                }

                // Lấy lại danh sách usecases sau khi cập nhật
                const finalUsecases = await Usecase.find({ version_id: versionId }).lean();

                // 11. CHỈ đánh dấu đã xử lý khi TẤT CẢ các bước trên đều thành công
                if (markAsProcessed.length > 0 && processingErrors.length === 0) {
                    await Input.updateMany({ _id: { $in: markAsProcessed } }, { $set: { is_processed: true } });
                }

                await Version.findByIdAndUpdate(versionId, {
                    $set: {
                        affects_requirement: true,
                        status: "completed",
                        stage: "completed",
                        is_processing: false // ✅ QUAN TRỌNG: Reset flag để UI dừng loading
                    }
                });

                console.log(`✅ Successfully processed ${totalUseCasesCreated} use cases from ${totalProcessedChunks} chunks`);

                return {
                    version_id: versionId,
                    usecases: finalUsecases,
                    newRequirements: savedUseCases.slice(previousRequirements.length),
                };
            }

            // Fallback: Nếu chưa lưu partial results, xử lý như cũ
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
                    // Lỗi này không critical, tiếp tục với requirements gốc
                }
            }

            // 10. Map related_usecases từ string sang ObjectId và tạo usecases theo batch
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

            // Tạo usecases mới theo batch để tránh memory issue
            if (usecasesToCreate.length > 0) {
                for (let i = 0; i < usecasesToCreate.length; i += this.BATCH_INSERT_SIZE) {
                    const batch = usecasesToCreate.slice(i, i + this.BATCH_INSERT_SIZE);
                    await Usecase.insertMany(batch);
                    console.log(`💾 Inserted batch ${Math.floor(i / this.BATCH_INSERT_SIZE) + 1}: ${batch.length} use cases`);
                }
            }

            // 11. CHỈ đánh dấu đã xử lý khi TẤT CẢ các bước trên đều thành công
            if (markAsProcessed.length > 0) {
                await Input.updateMany({ _id: { $in: markAsProcessed } }, { $set: { is_processed: true } });
            }

            // Clear checkpoint khi hoàn thành
            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    affects_requirement: true,
                    status: "completed",
                    stage: "completed",
                    is_processing: false // ✅ QUAN TRỌNG: Reset flag để UI dừng loading
                },
                $unset: { processing_checkpoint: "" }
            });

            // Lấy lại danh sách usecases sau khi tạo
            const finalUsecases = await Usecase.find({ version_id: versionId }).lean();

            console.log(`✅ Successfully processed ${usecasesToCreate.length} new use cases`);

            return {
                version_id: versionId,
                usecases: finalUsecases,
                newRequirements: newRequirements,
            };

        } catch (error: any) {
            // Nếu có lỗi xảy ra trong quá trình xử lý, KHÔNG đánh dấu is_processed = true
            console.error("❌ Error during finalize processing:", error);

            const errorMessage = error.message || "Unknown error during processing";
            processingErrors.push(`Final processing failed: ${errorMessage}`);

            // Giữ lại checkpoint để có thể resume sau (nếu đã xử lý được một số chunks)
            let checkpoint = null;
            if (processedChunkIndices.size > 0) {
                try {
                    const mergedText = inputs
                        .map((i: any) => (i.cleaned_text || i.raw_text || ""))
                        .filter(Boolean)
                        .join("\n\n");
                    checkpoint = {
                        text_hash: this.calculateTextHash(mergedText),
                        processed_chunks: Array.from(processedChunkIndices),
                        total_use_cases: totalUseCasesCreated || 0,
                        last_updated: new Date()
                    };
                } catch (e) {
                    console.error("⚠️ Failed to create checkpoint:", e);
                }
            }

            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    status: "failed",
                    stage: "failed",
                    progress: 100,
                    processing_errors: processingErrors,
                    ...(checkpoint ? { processing_checkpoint: checkpoint } : {})
                }
            });

            // KHÔNG đánh dấu is_processed = true khi có lỗi
            return {
                version_id: versionId,
                usecases: previousRequirements,
                errors: processingErrors,
                canResume: checkpoint !== null,
                checkpoint: checkpoint
            };
        }
    }

    /**
     * Lưu partial use cases vào DB ngay sau mỗi chunk (checkpoint mechanism)
     */
    private async savePartialUseCases(
        version: any,
        useCases: any[],
        shouldDeleteOld: boolean
    ): Promise<number> {
        if (!useCases || useCases.length === 0) return 0;

        // Xóa use cases cũ nếu cần (chỉ ở lần đầu tiên của full mode)
        if (shouldDeleteOld) {
            await Usecase.deleteMany({ version_id: version._id });
        }

        // Normalize và filter use cases hợp lệ
        const normalized = this.normalizeRoleStructure(
            useCases.filter(uc =>
                uc && typeof uc === 'object' &&
                ((uc.name && uc.name.trim() !== "") || (uc.goal && uc.goal.trim() !== ""))
            )
        );

        if (normalized.length === 0) return 0;

        // Kiểm tra duplicate với use cases đã có (để tránh insert trùng)
        const existingUseCases = await Usecase.find({
            version_id: version._id
        }).lean();

        const existingNames = new Set(existingUseCases.map((uc: any) => (uc.name || '').toLowerCase().trim()));
        const existingGoals = new Set(existingUseCases.map((uc: any) => (uc.goal || '').toLowerCase().trim()));

        // Lọc bỏ các use case trùng lặp
        const uniqueUseCases = normalized.filter(uc => {
            const nameKey = (uc.name || '').toLowerCase().trim();
            const goalKey = (uc.goal || '').toLowerCase().trim();
            return !existingNames.has(nameKey) && !existingGoals.has(goalKey);
        });

        if (uniqueUseCases.length === 0) {
            console.log(`⏩ All use cases from this chunk are duplicates, skipping insert`);
            return 0;
        }

        // Map và tạo use cases theo batch
        const usecasesToCreate = uniqueUseCases.map((uc: any) => {
            const relatedIds = (uc.related_usecases || [])
                .filter((id: any) => id && Types.ObjectId.isValid(String(id)))
                .map((id: any) => new Types.ObjectId(String(id)));

            return {
                project_id: version.project_id,
                version_id: new Types.ObjectId(version._id),
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

        // Insert theo batch để tránh memory issue
        let totalInserted = 0;
        for (let i = 0; i < usecasesToCreate.length; i += this.BATCH_INSERT_SIZE) {
            const batch = usecasesToCreate.slice(i, i + this.BATCH_INSERT_SIZE);
            try {
                await Usecase.insertMany(batch, { ordered: false }); // ordered: false để tiếp tục nếu có duplicate
                totalInserted += batch.length;
            } catch (err: any) {
                // Nếu có lỗi duplicate, đếm số insert thành công
                if (err.code === 11000 || err.name === 'BulkWriteError') {
                    const inserted = err.result?.insertedCount || 0;
                    totalInserted += inserted;
                    console.warn(`⚠️ Some use cases in batch were duplicates, inserted ${inserted}/${batch.length}`);
                } else {
                    throw err;
                }
            }
        }

        return totalInserted;
    }

    /**
     * Cập nhật related use cases cho các use cases đã lưu
     */
    private async updateRelatedUseCases(
        allUseCases: any[],
        versionId: string,
        skipCount: number
    ): Promise<void> {
        // Chỉ cập nhật các use cases mới (bỏ qua các use cases cũ nếu incremental)
        const newUseCases = allUseCases.slice(skipCount);

        for (const uc of newUseCases) {
            if (!uc._id) continue;

            const relatedIds = (uc.related_usecases || [])
                .filter((id: any) => id && Types.ObjectId.isValid(String(id)))
                .map((id: any) => new Types.ObjectId(String(id)));

            await Usecase.findByIdAndUpdate(uc._id, {
                $set: { related_usecases: relatedIds }
            });
        }
    }

    /**
     * Tính hash của text để kiểm tra checkpoint có hợp lệ không
     */
    private calculateTextHash(text: string): string {
        // Sử dụng crypto để tạo hash đơn giản
        const crypto = require('crypto');
        return crypto.createHash('md5').update(text).digest('hex');
    }

    /**
     * Lưu checkpoint sau mỗi chunk thành công
     */
    private async saveCheckpoint(
        versionId: string,
        text: string,
        processedChunks: number[],
        totalUseCasesCreated: number
    ): Promise<void> {
        try {
            const textHash = this.calculateTextHash(text);
            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    processing_checkpoint: {
                        text_hash: textHash,
                        processed_chunks: processedChunks,
                        total_use_cases: totalUseCasesCreated,
                        last_updated: new Date()
                    }
                }
            });
        } catch (error: any) {
            console.error("⚠️ Failed to save checkpoint:", error.message);
            // Không throw, checkpoint là optional
        }
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
