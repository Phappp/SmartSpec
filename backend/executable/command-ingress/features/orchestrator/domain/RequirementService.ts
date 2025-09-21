import Input from "../../../../../internal/model/input";
import Version from "../../../../../internal/model/version";
import { GeminiService } from "./GeminiService";
import stringSimilarity from "string-similarity";

export class RequirementService {
    /**
     * Chuẩn hóa ID cho use case
     */
    private normalizeUseCaseIds<T extends Record<string, any>>(
        items: T[],
        style: "UC" | "number" = "UC"
    ): T[] {
        return items.map((item, index) => {
            const newId = style === "UC" ? `UC${index + 1}` : String(index + 1);
            return { ...item, id: newId } as T;
        });
    }

    /**
     * Xóa duplicate use case (theo name/goal)
     */
    private mergeUseCasesDedup(items: any[]): any[] {
        const seen = new Map<string, any>();
        for (const it of items) {
            const key = (it?.name || it?.goal || JSON.stringify(it || {}))
                .toString()
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");
            if (!seen.has(key)) seen.set(key, it);
        }
        return Array.from(seen.values());
    }

    /**
     * Chia text thành chunks nhỏ
     */
    private splitTextIntoChunks(text: string, maxChars = 12000): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += maxChars) {
            chunks.push(text.slice(i, i + maxChars));
        }
        return chunks;
    }

    /**
     * Xử lý nhiều input tuần tự có delay để tránh rate limit
     */
    private async processWithRateLimit<T>(
        items: T[],
        processor: (item: T) => Promise<any[]>,
        delayMs = 1000
    ): Promise<any[]> {
        const results: any[] = [];
        for (let i = 0; i < items.length; i++) {
            try {
                const result = await processor(items[i]);
                results.push(result);
                if (i < items.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            } catch (error) {
                console.error(`Error processing item ${i}:`, error);
                results.push([]);
                // THÊM MỚI: Ném lại lỗi để các tầng cao hơn có thể bắt được
                throw error;
            }
        }
        return results;
    }

    /**
     * Finalize: gom text từ inputs, phân tích Gemini, merge kết quả
     */
    async finalize(
        versionId: string,
        mode: "full" | "incremental",
        inputs: any[],
        gemini: GeminiService,
        language: string
    ) {
        // Lấy Mongoose document đầy đủ (không có .lean()) để có thể dùng .save()
        const version = await Version.findById(versionId);
        if (!version) throw new Error("Version not found");

        const previousRequirements = version.requirement_model || [];

        // Khởi tạo các biến chứa kết quả
        let finalRequirements: any[] = mode === 'full' ? [] : [...previousRequirements];
        let conflicts: any[] = [];
        let processingErrors: string[] = [];

        try {
            // Cập nhật trạng thái bắt đầu xử lý ngay lập tức để UI phản hồi
            version.status = 'processing';
            await version.save();

            const mergedText = inputs.map((i: any) => (i.cleaned_text || i.raw_text || "")).filter(Boolean).join("\n\n");

            // Nếu không có text để xử lý, coi như hoàn thành và thoát sớm
            if (!mergedText || mergedText.trim().length === 0) {
                console.log("No new text to process. Finalizing as completed.");
                // Ghi nhận trạng thái cuối cùng và thoát
                version.status = 'completed';
                await version.save();
                return; // Dừng thực thi tại đây
            }

            // --- BẮT ĐẦU QUÁ TRÌNH PHÂN TÍCH ---
            let newRequirements: any[] = [];
            for (const input of inputs) {
                const text = input.cleaned_text || input.raw_text;
                if (!text || text.trim().length === 0) continue;

                const chunks = this.splitTextIntoChunks(text, 12000);
                for (let index = 0; index < chunks.length; index++) {
                    const chunk = chunks[index];
                    try {
                        console.log(`Processing chunk ${index + 1}/${chunks.length} for input ${input._id}`);
                        const part = await gemini.analyzeRequirements(chunk, language);
                        if (Array.isArray(part) && part.length > 0) {
                            newRequirements = newRequirements.concat(part);
                        }
                    } catch (err: any) {
                        const errorMsg = `Error processing chunk for input ${input._id}: ${err.message}`;
                        console.error(errorMsg);
                        processingErrors.push(errorMsg);
                    }
                }
            }

            // --- XỬ LÝ KẾT QUẢ THÔ ---
            newRequirements = this.mergeUseCasesDedup(newRequirements);
            newRequirements = this.normalizeUseCaseIds(newRequirements, "UC");

            // --- XỬ LÝ CONFLICT (NẾU LÀ INCREMENTAL) ---
            if (mode === "full") {
                finalRequirements = newRequirements;
            } else { // mode === "incremental"
                for (const newReq of newRequirements) {
                    let isConflicting = false;
                    for (const oldReq of previousRequirements) {
                        if (await this.isConflict(oldReq, newReq, gemini, language)) {
                            conflicts.push({ existing: oldReq, new: newReq });
                            isConflicting = true;
                            break;
                        }
                    }
                    if (!isConflicting) {
                        finalRequirements.push(newReq);
                    }
                }
            }
            finalRequirements = this.normalizeUseCaseIds(finalRequirements, "UC");

            // --- LÀM GIÀU DỮ LIỆU (ADD RELATED USE CASES) ---
            if (finalRequirements.length > 1) { // Nên là > 1 thay vì > 10
                try {
                    finalRequirements = await gemini.addRelatedUseCases(
                        finalRequirements, { incremental: mode === "incremental" }, language
                    );
                } catch (err: any) {
                    console.error("⚠️ Lỗi khi bổ sung related_usecases:", err.message);
                    processingErrors.push(`Error adding related use cases: ${err.message}`);
                }
            }

        } catch (error: any) {
            // Bắt các lỗi nghiêm trọng không lường trước được trong toàn bộ quá trình
            console.error("A critical error occurred during finalization:", error);
            processingErrors.push(error.message || "An unknown critical error occurred.");
        } finally {
            // KHỐI LỆNH NÀY SẼ LUÔN LUÔN ĐƯỢC THỰC THI, DÙ CÓ LỖI HAY KHÔNG

            console.log(`Finalizing update for version ${versionId}. Errors found: ${processingErrors.length}`);

            // 1. Cập nhật các mảng kết quả vào document
            version.set('requirement_model', finalRequirements);
            version.set('pending_conflicts', conflicts);
            version.processing_errors = processingErrors;

            // 2. Quyết định trạng thái cuối cùng
            if (processingErrors.length > 0) {
                version.status = 'failed';
            } else if (conflicts.length > 0) {
                version.status = 'has_conflicts';
            } else {
                version.status = 'completed';
            }

            // 3. Đánh dấu các input đã được xử lý
            const processedInputIds = inputs.map(i => i._id);
            if (processedInputIds.length > 0) {
                await Input.updateMany({ _id: { $in: processedInputIds } }, { $set: { is_processed: true } });
            }

            // 4. Lưu lại toàn bộ thay đổi vào DB một lần duy nhất
            await version.save();
            console.log(`✅ Version ${versionId} updated with final status: ${version.status}`);
        }
    }


    /**
     * Giải quyết conflict khi user chọn giữ use case cũ hoặc mới
     */
    async resolveDuplicate(versionId: string, conflictId: string, keep: "old" | "new") {
        const version = await Version.findById(versionId); // Lấy Mongoose document để có thể save()
        if (!version) throw new Error("Version not found");

        const currentRequirements = version.requirement_model || [];
        const pendingConflicts = version.pending_conflicts || [];

        // Tìm đúng conflict theo UUID
        const conflictIndex = pendingConflicts.findIndex((c: any) => c.conflict_id === conflictId);
        if (conflictIndex === -1) throw new Error("Conflict not found");

        const conflict = pendingConflicts[conflictIndex];

        let finalRequirements = [...currentRequirements]; // Tạo bản sao để làm việc

        // Helper: so sánh requirement dựa trên ID
        const isSameRequirementById = (req: any, targetId: string) => {
            return req.id === targetId;
        };

        // ---- LOGIC ĐÃ ĐƯỢC THAY ĐỔI ----
        if (keep === "new") {
            // DÙNG MAP ĐỂ THAY THẾ "TẠI CHỖ"
            // Duyệt qua mảng, nếu tìm thấy use case cũ thì thay nó bằng use case mới
            finalRequirements = currentRequirements.map(req => {
                if (isSameRequirementById(req, conflict.existing.id)) {
                    // Trả về use case mới để thay thế
                    return conflict.new;
                }
                // Giữ nguyên use case hiện tại
                return req;
            });
        }
        // Nếu keep === "old", chúng ta không cần làm gì với mảng `requirement_model` cả,
        // vì use case mới chưa bao giờ được thêm vào.

        // Xóa conflict đã giải quyết
        version.pending_conflicts.splice(conflictIndex, 1);

        // Gán lại model đã được xử lý và normalize lại ID
        version.set('requirement_model', this.normalizeUseCaseIds(finalRequirements, "UC"));
        version.updated_at = new Date();

        await version.save(); // Lưu lại toàn bộ thay đổi

        return {
            version_id: versionId,
            requirement_model: version.requirement_model,
            resolved: { conflict_id: conflictId, kept: keep },
        };
    }


    // Check conflict giữa 2 use case
    private async isConflict(reqA: any, reqB: any, gemini: GeminiService, language: string): Promise<boolean> {
        const a = (reqA.name || reqA.goal || "").toLowerCase();
        const b = (reqB.name || reqB.goal || "").toLowerCase();
        if (!a || !b) return false;

        // 1. Check exact match
        if (a === b) return true;

        // 2. Check string similarity
        const score = stringSimilarity.compareTwoStrings(a, b, language);
        if (score >= 0.95) return true; // chỉ khi cực kỳ giống nhau mới coi là conflict
        if (score >= 0.75) {
            return await gemini.checkConflictWithGemini(a, b, language);
        }
        return false;

    }

}
