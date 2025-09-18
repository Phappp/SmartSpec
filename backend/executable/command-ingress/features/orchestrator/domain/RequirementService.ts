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
     * Finalize: gom text từ inputs, phân tích Gemini, merge kết quả
     */
    async finalize(
        versionId: string,
        mode: "full" | "incremental",
        inputs: any[],
        gemini: GeminiService
    ) {
        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        const previousRequirements = (version as any).requirement_model || [];
        let markAsProcessed: string[] = [];

        if (mode === "full") {
            markAsProcessed = inputs.map((i: any) => String(i._id));
            console.log(`FULL mode: processing all ${inputs.length} inputs`);
        } else {
            markAsProcessed = inputs
                .filter((i: any) => i.is_processed !== true)
                .map((i: any) => String(i._id));
            console.log(`INCREMENTAL mode: processing ${markAsProcessed.length} new inputs`);
        }

        const mergedText = inputs
            .map((i: any) => (i.cleaned_text || i.raw_text || ""))
            .filter(Boolean)
            .join("\n\n");

        await Version.findByIdAndUpdate(versionId, {
            $set: { merged_text: mergedText, updated_at: new Date() },
        });

        if (!mergedText || mergedText.trim().length === 0) {
            if (markAsProcessed.length > 0) {
                await Input.updateMany(
                    { _id: { $in: markAsProcessed } },
                    { $set: { is_processed: true } }
                );
            }
            return {
                version_id: versionId,
                inputs_count: inputs.length,
                requirement_model: previousRequirements,
                mode,
                new_usecases: [],
                duplicate_usecases: [],
            };
        }

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

                    for (let index = 0; index < chunks.length; index++) {
                        const chunk = chunks[index];
                        try {
                            console.log(
                                `Processing chunk ${index + 1}/${chunks.length} for input ${input._id}`
                            );
                            const part = await gemini.analyzeRequirements(chunk);
                            if (Array.isArray(part) && part.length > 0) {
                                inputResults = inputResults.concat(part);
                            }
                        } catch (err: any) {
                            const errorMsg = `Error processing chunk ${index + 1} for input ${input._id}: ${err.message}`;
                            console.error(errorMsg);
                            processingErrors.push(errorMsg);
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

        newRequirements = this.mergeUseCasesDedup(newRequirements);
        newRequirements = this.normalizeUseCaseIds(newRequirements, "UC");

        let finalRequirements: any[] = [];
        let conflicts: any[] = [];

        if (mode === "full") {
            finalRequirements = newRequirements;
        } else {
            finalRequirements = [...previousRequirements];
            for (const newReq of newRequirements) {
                let existingReq: any = null;

                for (const oldReq of previousRequirements) {
                    if (await this.isConflict(oldReq, newReq, gemini)) {
                        existingReq = oldReq;
                        break;
                    }
                }

                if (existingReq) {
                    // ⚡ Không cần tự sinh conflict_id nữa
                    conflicts.push({
                        existing: existingReq,
                        new: newReq,
                    });
                } else {
                    finalRequirements.push(newReq);
                }
            }
            finalRequirements = this.normalizeUseCaseIds(finalRequirements, "UC");
        }
        // Sau khi đã merge xong finalRequirements
        // Sau khi đã merge xong finalRequirements
        if (finalRequirements.length > 10) {   // ✅ chỉ gọi khi có nhiều hơn 1 use case
            try {
                finalRequirements = await gemini.addRelatedUseCases(
                    finalRequirements,
                    { incremental: mode === "incremental" }
                );
            } catch (err: any) {
                console.error("⚠️ Lỗi khi bổ sung related_usecases:", err.message);
            }
        }

        if (markAsProcessed.length > 0) {
            await Input.updateMany(
                { _id: { $in: markAsProcessed } },
                { $set: { is_processed: true } }
            );
        }

        await Version.findByIdAndUpdate(versionId, {
            $set: {
                requirement_model: finalRequirements,
                affects_requirement: true,
                updated_at: new Date(),
                ...(conflicts.length > 0 && { pending_conflicts: conflicts }),
                ...(processingErrors.length > 0 && { processing_errors: processingErrors }),
            },
        });

        return {
            version_id: versionId,
            inputs_count: inputs.length,
            requirement_model: finalRequirements,
            mode,
            processed_count: markAsProcessed.length,
            new_usecases: mode === "incremental" ? newRequirements : [],
            duplicate_usecases: conflicts,
            ...(processingErrors.length > 0 && {
                has_errors: true,
                errors: processingErrors,
            }),
            ...(conflicts.length > 0 && {
                has_conflicts: true,
                conflicts: conflicts.map((c) => ({
                    conflict_id: c.conflict_id, // ✅ UUID do schema tự sinh
                    existing: c.existing,
                    new: c.new,
                })),
            }),
        };
    }


    /**
     * Giải quyết conflict khi user chọn giữ use case cũ hoặc mới
     */
    async resolveDuplicate(versionId: string, conflictId: string, keep: "old" | "new") {
        const version = await Version.findById(versionId).lean();
        if (!version) throw new Error("Version not found");

        const currentRequirements = (version as any).requirement_model || [];
        const pendingConflicts = (version as any).pending_conflicts || [];

        // Tìm đúng conflict theo UUID
        const conflict = pendingConflicts.find((c: any) => c.conflict_id === conflictId);
        if (!conflict) throw new Error("Conflict not found");

        // Helper: so sánh requirement dựa trên name + goal + role + reason (ignore case/space)
        const normalizeStr = (s: string) => (s || "").trim().toLowerCase();
        const isSameRequirement = (req: any, target: any) => {
            return (
                normalizeStr(req.name) === normalizeStr(target.name) &&
                normalizeStr(req.goal) === normalizeStr(target.goal) &&
                normalizeStr(req.role) === normalizeStr(target.role) &&
                normalizeStr(req.reason) === normalizeStr(target.reason)
            );
        };

        let filtered: any[];
        if (keep === "old") {
            // Giữ requirement cũ → loại requirement mới
            filtered = currentRequirements.filter((req: any) => !isSameRequirement(req, conflict.new));
        } else {
            // Giữ requirement mới → loại requirement cũ
            filtered = currentRequirements.filter((req: any) => !isSameRequirement(req, conflict.existing));

            // ✅ Đảm bảo thêm conflict.new vào model nếu nó chưa có
            const alreadyExists = filtered.some((req: any) => isSameRequirement(req, conflict.new));
            if (!alreadyExists) {
                filtered.push(conflict.new);
            }
        }

        // Normalize lại ID sau khi merge
        const normalized = this.normalizeUseCaseIds(filtered, "UC");

        // Xóa conflict đã giải quyết
        const updatedConflicts = pendingConflicts.filter((c: any) => c.conflict_id !== conflictId);

        await Version.findByIdAndUpdate(versionId, {
            $set: {
                requirement_model: normalized,
                pending_conflicts: updatedConflicts,
                updated_at: new Date(),
            },
        });

        return {
            version_id: versionId,
            requirement_model: normalized,
            resolved: { conflict_id: conflictId, kept: keep },
        };
    }


    // Check conflict giữa 2 use case
    private async isConflict(reqA: any, reqB: any, gemini: GeminiService): Promise<boolean> {
        const a = (reqA.name || reqA.goal || "").toLowerCase();
        const b = (reqB.name || reqB.goal || "").toLowerCase();
        if (!a || !b) return false;

        // 1. Check exact match
        if (a === b) return true;

        // 2. Check string similarity
        const score = stringSimilarity.compareTwoStrings(a, b);
        if (score >= 0.95) return true; // chỉ khi cực kỳ giống nhau mới coi là conflict
        if (score >= 0.75) {
            return await gemini.checkConflictWithGemini(a, b);
        }
        return false;

    }

}
