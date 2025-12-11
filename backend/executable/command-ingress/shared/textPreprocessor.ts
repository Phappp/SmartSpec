/**
 * Utility để xử lý và validate text trước khi gửi cho LLM
 * Đảm bảo text được đọc trọn vẹn, không bị mất dữ liệu
 */

export interface TextValidationResult {
    isValid: boolean;
    warnings: string[];
    cleanedText: string;
    originalLength: number;
    cleanedLength: number;
    estimatedTokens: number;
}

/**
 * Ước tính số tokens từ số ký tự (approximate)
 * @deprecated Use estimateTokens from tokenManager.ts instead
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    // Tiếng Việt: ~2-3 chars/token, tiếng Anh: ~4 chars/token
    // Dùng ước tính an toàn: 3 chars/token
    return Math.ceil(text.length / 3);
}

/**
 * Giới hạn token của Gemini API (conservative estimate)
 * @deprecated Use tokenManager.ts for model-specific limits
 */
const MAX_INPUT_TOKENS = 500000; // Conservative limit
const MAX_CHUNK_TOKENS = 100000; // Max tokens per chunk để đảm bảo chất lượng

/**
 * Clean và normalize text để đảm bảo LLM đọc được trọn vẹn
 */
export function cleanTextForLLM(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 1. Normalize line endings (Windows \r\n -> \n)
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\r/g, '\n');

    // 2. Normalize multiple spaces (giữ lại single space)
    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    // 3. Normalize multiple newlines (giữ lại max 2 newlines cho paragraph break)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 4. Xử lý ký tự đặc biệt có thể gây vấn đề
    // Giữ lại các ký tự Unicode hợp lệ, loại bỏ control characters (trừ \n, \t)
    cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    // 5. Normalize whitespace ở đầu/cuối dòng (giữ lại structure)
    cleaned = cleaned.split('\n')
        .map(line => line.trimEnd()) // Giữ lại leading spaces (có thể là indentation)
        .join('\n');

    // 6. Loại bỏ các ký tự zero-width
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // 7. Normalize quotes (optional - có thể giữ nguyên)
    // cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'");

    return cleaned.trim();
}

/**
 * Validate text trước khi gửi cho LLM
 */
export function validateTextForLLM(text: string): TextValidationResult {
    const warnings: string[] = [];
    const originalLength = text?.length || 0;

    if (!text || text.trim().length === 0) {
        return {
            isValid: false,
            warnings: ['Text is empty'],
            cleanedText: '',
            originalLength: 0,
            cleanedLength: 0,
            estimatedTokens: 0
        };
    }

    // Clean text
    const cleanedText = cleanTextForLLM(text);
    const cleanedLength = cleanedText.length;
    const estimatedTokens = estimateTokens(cleanedText);

    // Kiểm tra độ dài
    if (estimatedTokens > MAX_INPUT_TOKENS) {
        warnings.push(`Text quá dài (ước tính ${estimatedTokens} tokens, giới hạn: ${MAX_INPUT_TOKENS}). Có thể bị cắt bớt.`);
    }

    if (estimatedTokens > MAX_CHUNK_TOKENS) {
        warnings.push(`Chunk quá lớn (ước tính ${estimatedTokens} tokens, khuyến nghị: ${MAX_CHUNK_TOKENS}). Nên chia nhỏ hơn.`);
    }

    // Kiểm tra ký tự đặc biệt có thể gây vấn đề
    const specialCharPattern = /[^\x20-\x7E\n\t\u00A0-\uFFFF]/g;
    const specialChars = text.match(specialCharPattern);
    if (specialChars && specialChars.length > 0) {
        // Sử dụng Array.from() thay vì spread operator để tương thích với TypeScript target thấp
        const uniqueSpecialChars = Array.from(new Set(specialChars)).slice(0, 5);
        warnings.push(`Phát hiện ${specialChars.length} ký tự đặc biệt có thể gây vấn đề: ${uniqueSpecialChars.map(c => `U+${c.charCodeAt(0).toString(16)}`).join(', ')}`);
    }

    // Kiểm tra encoding issues
    try {
        // Thử encode/decode để kiểm tra encoding
        const encoded = new TextEncoder().encode(cleanedText);
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(encoded);
        if (decoded !== cleanedText) {
            warnings.push('Có thể có vấn đề về encoding UTF-8');
        }
    } catch (e) {
        warnings.push('Lỗi encoding UTF-8: ' + (e as Error).message);
    }

    // Kiểm tra nếu text bị cắt giữa chừng (có thể do extraction lỗi)
    const hasIncompleteSentences = /[.!?]\s*$/.test(cleanedText) === false && cleanedText.length > 100;
    if (hasIncompleteSentences) {
        warnings.push('Text có thể bị cắt giữa chừng (không kết thúc bằng dấu câu)');
    }

    // Kiểm tra nếu có quá nhiều newlines liên tiếp (có thể là formatting issue)
    const excessiveNewlines = (cleanedText.match(/\n{5,}/g) || []).length;
    if (excessiveNewlines > 0) {
        warnings.push(`Phát hiện ${excessiveNewlines} đoạn có quá nhiều dòng trống liên tiếp`);
    }

    // Kiểm tra nếu text quá ngắn so với original (có thể đã mất dữ liệu)
    const lengthLoss = originalLength - cleanedLength;
    const lossPercentage = (lengthLoss / originalLength) * 100;
    if (lossPercentage > 10) {
        warnings.push(`Text đã bị giảm ${lossPercentage.toFixed(1)}% độ dài sau khi clean (${originalLength} -> ${cleanedLength} chars). Có thể đã mất dữ liệu.`);
    }

    return {
        isValid: true,
        warnings,
        cleanedText,
        originalLength,
        cleanedLength,
        estimatedTokens
    };
}

/**
 * Chia text thành chunks an toàn, đảm bảo không mất dữ liệu
 */
export function splitTextIntoSafeChunks(
    text: string,
    maxChunkSize: number = 8000,
    overlapSize: number = 500
): string[] {
    if (!text || text.length <= maxChunkSize) {
        return [text];
    }

    const chunks: string[] = [];
    let currentPos = 0;

    while (currentPos < text.length) {
        const remaining = text.length - currentPos;
        
        if (remaining <= maxChunkSize) {
            // Phần còn lại vừa với một chunk
            chunks.push(text.slice(currentPos));
            break;
        }

        // Tìm điểm cắt tốt nhất (ưu tiên paragraph, sau đó sentence)
        const chunkEnd = currentPos + maxChunkSize;
        let cutPoint = chunkEnd;

        // Tìm paragraph break gần nhất (trong phạm vi overlap)
        const searchStart = Math.max(currentPos, chunkEnd - overlapSize);
        const paragraphBreak = text.lastIndexOf('\n\n', chunkEnd);
        if (paragraphBreak > searchStart) {
            cutPoint = paragraphBreak + 2; // +2 để bao gồm \n\n
        } else {
            // Tìm sentence break gần nhất (trong phạm vi overlap)
            const searchText = text.slice(searchStart, chunkEnd + 100);
            const sentenceMatch = searchText.match(/[.!?]\s+/);
            if (sentenceMatch && sentenceMatch.index !== undefined) {
                const sentenceBreak = searchStart + sentenceMatch.index + sentenceMatch[0].length;
                if (sentenceBreak > searchStart && sentenceBreak <= chunkEnd + 100) {
                    cutPoint = sentenceBreak;
                }
            }
        }

        // Nếu không tìm thấy điểm cắt tốt, cắt ở vị trí hiện tại
        if (cutPoint <= currentPos) {
            cutPoint = chunkEnd;
        }

        // Lấy chunk với overlap
        const chunk = text.slice(currentPos, cutPoint);
        chunks.push(chunk);

        // Di chuyển vị trí (có overlap để không mất context)
        currentPos = Math.max(currentPos + 1, cutPoint - overlapSize);
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Kiểm tra xem text có bị truncate không (so sánh với original)
 */
export function detectTruncation(originalText: string, processedText: string): {
    isTruncated: boolean;
    lossPercentage: number;
    missingChars: number;
} {
    const originalLength = originalText?.length || 0;
    const processedLength = processedText?.length || 0;
    const missingChars = originalLength - processedLength;
    const lossPercentage = originalLength > 0 ? (missingChars / originalLength) * 100 : 0;

    // Coi là truncate nếu mất > 5% độ dài
    const isTruncated = lossPercentage > 5 && missingChars > 100;

    return {
        isTruncated,
        lossPercentage,
        missingChars
    };
}

