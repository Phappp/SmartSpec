import { UploadedFile } from "express-fileupload";
import Project from "../../../../../internal/model/project";
import Version from "../../../../../internal/model/version";
import Input from "../../../../../internal/model/input";

import { InputService } from "./InputService";
import { GeminiService } from "./GeminiService";
import { RequirementService } from "./RequirementService";
import { UtilService } from "./UtilService";

export class OrchestratorService {
    private inputService = new InputService();
    private gemini = new GeminiService();
    private requirementService = new RequirementService();
    private util = new UtilService();

    async run(
        projectId: string,
        versionId: string,
        opts: { files: UploadedFile[]; rawText?: string; mode?: "full" | "incremental" }
    ) {
        const [project, version] = await Promise.all([
            Project.findById(projectId).lean(),
            Version.findById(versionId).lean(),
        ]);
        if (!project) throw new Error("Project not found");
        if (!version) throw new Error("Version not found");

        // 1. Xử lý input (file + raw text)
        const { newFilesCount, newTextProvided } = await this.inputService.handleInputs(
            opts.files,
            opts.rawText,
            projectId,
            versionId
        );

        // 2. Nếu incremental mà không có gì mới → return luôn
        if (opts.mode === "incremental" && newFilesCount === 0 && !newTextProvided) {
            return this.inputService.returnIncremental(versionId);
        }

        // 3. Lấy inputs cần xử lý
        let inputs: any[] = [];
        const targetIds = await this.inputService.getNewlyCreatedInputs(versionId);

        if (opts.mode === "full") {
            inputs = await Input.find({
                version_id: versionId,
                processing_status: "completed"
            }).lean();
        } else {
            if (targetIds.length > 0) {
                inputs = await this.util.waitForInputsCompletionByIds(targetIds);
            } else {
                inputs = await Input.find({
                    version_id: versionId,
                    processing_status: "completed",
                    is_processed: { $ne: true }
                }).lean();
            }
        }
        if (!inputs || inputs.length === 0) {
            throw new Error("Không có input hợp lệ để xử lý.");
        }

        // Debug log
        console.log("Mode:", opts.mode || "full");
        console.log(
            "Inputs to process:",
            inputs.map((i) => ({
                id: i._id,
                processed: i.is_processed,
                completed: i.is_completed,
                textLength: (i.cleaned_text || i.raw_text || "").length
            }))
        );

        // 4. Gọi finalize để phân tích requirement
        return this.requirementService.finalize(versionId, opts.mode || "full", inputs, this.gemini);
    }

    async resolveDuplicate(versionId: string, conflictId: string, keep: "old" | "new") {
        return this.requirementService.resolveDuplicate(versionId, conflictId, keep);
    }
}
