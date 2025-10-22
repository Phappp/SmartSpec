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
            }
        }
        return results;
    }

    /**
    * Finalize: Phân tích input và cập nhật requirement model.
    * Phiên bản này đã được dọn dẹp và tối ưu, chỉ thực hiện một nhiệm vụ duy nhất.
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

        const previousRequirements = (version as any).requirement_model || [];
        const markAsProcessed = inputs.map((i: any) => String(i._id));

        // 2. Xử lý trường hợp không có text đầu vào
        const mergedText = inputs
            .map((i: any) => (i.cleaned_text || i.raw_text || ""))
            .filter(Boolean)
            .join("\n\n");

        if (!mergedText || mergedText.trim().length === 0) {
            // KHÔNG đánh dấu is_processed nếu không có text để xử lý
            return { version_id: versionId, requirement_model: previousRequirements };
        }

        // 3. Phân tích văn bản với Gemini
        let newRequirements: any[] = [];
        let processingErrors: string[] = [];
        try {
            const results = await this.processWithRateLimit(
                inputs,
                async (input) => {
                    const text = input.cleaned_text || input.raw_text;
                    if (!text || text.trim().length === 0) return [];

                    const chunks = this.splitTextIntoChunks(text, 12000);
                    let inputResults: any[] = [];
                    for (const chunk of chunks) {
                        try {
                            const part = await gemini.analyzeRequirements(chunk, language);
                            if (Array.isArray(part)) inputResults.push(...part);
                        } catch (err: any) {
                            processingErrors.push(`Error in chunk for input ${input._id}: ${err.message}`);
                        }
                    }
                    return inputResults;
                },
                500
            );
            newRequirements = results.flat();
        } catch (error: any) {
            processingErrors.push(`Process error: ${error.message}`);
        }

        // 4. KIỂM TRA LỖI: Nếu có lỗi thì KHÔNG đánh dấu is_processed và KHÔNG cập nhật version
        if (processingErrors.length > 0) {
            console.error("❌ Có lỗi trong quá trình xử lý, giữ nguyên trạng thái:");
            console.error(processingErrors);

            // KHÔNG gọi: Input.updateMany({ is_processed: true })
            // KHÔNG cập nhật version status
            await Version.findByIdAndUpdate(versionId, {
                $set: {
                    status: "failed",
                    stage: "failed",
                    progress: 100, // Đảm bảo progress là 100%
                    processing_errors: processingErrors
                }
            });
            return {
                version_id: versionId,
                requirement_model: previousRequirements,
                errors: processingErrors
            };
        }

        // 5. Nếu KHÔNG có lỗi: tiếp tục xử lý bình thường
        // Dọn dẹp và gộp kết quả
        newRequirements = this.mergeUseCasesDedup(newRequirements);
        newRequirements = newRequirements.filter(uc =>
            uc && typeof uc === 'object' &&
            ((uc.name && uc.name.trim() !== "") || (uc.goal && uc.goal.trim() !== ""))
        );

        const finalRequirements = mode === 'full'
            ? newRequirements
            : [...previousRequirements, ...newRequirements];

        const normalizedRequirements = this.normalizeUseCaseIds(finalRequirements, "UC");

        // 6. Làm giàu dữ liệu: Bổ sung "related_usecases"
        let requirementsWithRelations = normalizedRequirements;
        if (requirementsWithRelations.length > 1) {
            try {
                requirementsWithRelations = await gemini.addRelatedUseCases(
                    requirementsWithRelations,
                    { incremental: mode === "incremental" },
                    language
                );
            } catch (err: any) {
                console.error("⚠️ Lỗi khi bổ sung related_usecases:", err.message);
                // Vẫn tiếp tục với dữ liệu hiện có
            }
        }

        // 7. CHỈ KHI THÀNH CÔNG: đánh dấu input đã xử lý và cập nhật version
        if (markAsProcessed.length > 0) {
            await Input.updateMany({ _id: { $in: markAsProcessed } }, { $set: { is_processed: true } });
        }

        await Version.findByIdAndUpdate(versionId, {
            $set: {
                requirement_model: requirementsWithRelations,
                affects_requirement: true,
                status: "completed", // Luôn là completed khi thành công
                stage: "completed",
            }
        });

        return {
            version_id: versionId,
            requirement_model: requirementsWithRelations,
        };
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
    // Check conflict giữa 2 use case
    private async isConflict(
        reqA: any,
        reqB: any,
        gemini: GeminiService,
        language: string
    ): Promise<boolean> {
        const a = (reqA.name || reqA.goal || "").trim();
        const b = (reqB.name || reqB.goal || "").trim();
        if (!a || !b) return false;

        try {
            // Luôn gọi Gemini để xác định
            const result: boolean = await gemini.checkConflictWithGemini(a, b, language);
            return result;
        } catch (err: any) {
            console.error("❌ Lỗi khi gọi Gemini checkConflict:", err.message);
            return false; // fallback: coi như không conflict nếu lỗi
        }
    }

    /**
     * HÀM MỚI: Kích hoạt quét toàn bộ use case để tìm các nhóm xung đột.
     */
    async findConflicts(versionId: string, gemini: GeminiService, language: string) {
        const version = await Version.findById(versionId);
        if (!version || !version.requirement_model) throw new Error("Version or requirement model not found.");

        const useCases = version.requirement_model;
        if (useCases.length < 2) {
            return { message: "Not enough use cases to compare.", conflicts_found: 0 };
        }

        // Gọi Gemini để lấy về các nhóm ID bị trùng
        const conflictIdGroups = await gemini.findConflictGroups(useCases, language);

        if (conflictIdGroups.length === 0) {
            version.set('pending_conflicts', []);
            version.status = "completed";
            await version.save();
            return { version_id: versionId, conflicts_found: 0, conflicts: [] };
        }

        // Ánh xạ các ID trả về thành các đối tượng use case đầy đủ
        const useCaseMap = new Map(useCases.map(uc => [uc.id, uc]));
        const pending_conflicts = conflictIdGroups.map(idGroup => {
            return {
                items: idGroup.map(id => useCaseMap.get(id)).filter(Boolean)
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
    /**
     * HÀM MỚI: Giải quyết một nhóm xung đột bằng cách giữ lại một UC.
     */
    async resolveConflict(versionId: string, conflictId: string, keepUseCaseId: string) {
        const version = await Version.findById(versionId);
        if (!version) throw new Error("Version not found");

        // 🔍 Bước 1: Tìm conflict theo ID
        const conflictIndex = version.pending_conflicts.findIndex(
            (c: any) => c.conflict_id === conflictId
        );
        if (conflictIndex === -1) throw new Error("Conflict not found");

        const conflict = version.pending_conflicts[conflictIndex];
        const idsToRemove = new Set(
            conflict.items
                .map((uc: any) => uc.id)
                .filter((id: string) => id !== keepUseCaseId)
        );

        if (idsToRemove.size !== conflict.items.length - 1) {
            throw new Error(
                `Invalid keepUseCaseId '${keepUseCaseId}' for this conflict group.`
            );
        }

        // ✅ Bước 2: Xóa các use case bị loại khỏi requirement_model
        const beforeNormalize = version.requirement_model.filter(
            (uc: any) => !idsToRemove.has(uc.id)
        );

        // ✅ Bước 3: Dọn sạch references đến các use case bị loại
        beforeNormalize.forEach((uc: any) => {
            if (Array.isArray(uc.related_usecases) && uc.related_usecases.length > 0) {
                uc.related_usecases = uc.related_usecases.filter(
                    (relId: string) => !idsToRemove.has(relId)
                );
            }
        });

        // ✅ Bước 4: Normalize lại ID (UC1, UC2, UC3, ...)
        const normalized = this.normalizeUseCaseIds(beforeNormalize, "UC");

        // ✅ Bước 5: Đồng bộ lại references theo ID mới (map từ ID cũ → ID mới)
        const idMap = new Map<string, string>();
        for (let i = 0; i < beforeNormalize.length; i++) {
            const oldId = beforeNormalize[i].id;
            const newId = normalized[i]?.id;
            if (oldId && newId) idMap.set(oldId, newId);
        }

        const synced = normalized.map((uc: any) => {
            if (Array.isArray(uc.related_usecases) && uc.related_usecases.length > 0) {
                uc.related_usecases = uc.related_usecases
                    .map((oldId: string) => idMap.get(oldId) || oldId)
                    .filter((id: string) => normalized.some((x: any) => x.id === id));
            }
            return uc;
        });

        // ✅ Bước 6: Cập nhật lại version
        version.pending_conflicts.splice(conflictIndex, 1);
        if (version.pending_conflicts.length === 0) {
            version.status = "completed";
        }

        version.set("requirement_model", synced);
        version.updated_at = new Date();

        await version.save();

        return {
            version_id: versionId,
            requirement_model: version.requirement_model,
            resolved: { conflict_id: conflictId, kept_id: keepUseCaseId },
        };
    }
}