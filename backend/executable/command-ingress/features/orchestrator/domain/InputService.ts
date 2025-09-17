import { UploadedFile } from "express-fileupload";
import Input from "../../../../../internal/model/input";
import Version from "../../../../../internal/model/version";
import { ExtractorService } from "../../handle_extraction/domain/ExtractorService";
import { TextService } from "../../handle_text/domain/service";
import { HashUtil } from "../../../utils/hash.util";

export class InputService {
    private extractor = new ExtractorService();
    private text = new TextService();

    /**
     * Xử lý files + raw text (check duplicate bằng hash)
     */
    async handleInputs(
        files: UploadedFile[] | undefined,
        rawText: string | undefined,
        projectId: string,
        versionId: string
    ): Promise<{ newFilesCount: number; newTextProvided: boolean }> {
        const existingInputs = await Input.find(
            { version_id: versionId },
            { file_hash: 1, text_hash: 1, is_processed: 1 }
        ).lean();

        const existingFileHashes = existingInputs.map((i: any) => i.file_hash).filter(Boolean);
        const existingTextHashes = existingInputs.map((i: any) => i.text_hash).filter(Boolean);

        let newFilesCount = 0;
        let newTextProvided = false;

        // --- xử lý files ---
        if (files && files.length > 0) {
            const nonDuplicateFiles = files.filter((file) => {
                const fileHash = HashUtil.calculateFileHash(file);
                return !existingFileHashes.includes(fileHash);
            });

            if (nonDuplicateFiles.length > 0) {
                console.log(`Starting file extraction for ${nonDuplicateFiles.length} new files...`);
                await this.extractor.extractFiles(nonDuplicateFiles, projectId, versionId);
                newFilesCount = nonDuplicateFiles.length;
            } else {
                console.log("All files are duplicates, skipping extraction");
            }
        }

        // --- xử lý raw text ---
        if (rawText && rawText.trim().length > 0) {
            const textHash = HashUtil.calculateTextHash(rawText);

            if (!existingTextHashes.includes(textHash)) {
                console.log("Saving new raw text...");
                await this.text.saveText(rawText, projectId, versionId);
                newTextProvided = true;
            } else {
                console.log("Raw text is duplicate, skipping save");
            }
        }

        return { newFilesCount, newTextProvided };
    }

    /**
     * Lấy danh sách input mới được tạo trong run này
     */
    async getNewlyCreatedInputs(versionId: string): Promise<string[]> {
        const since = new Date(Date.now() - 2000); // từ 2s trước
        const createdNow = await Input.find(
            { version_id: versionId, createdAt: { $gte: since } },
            { _id: 1 }
        ).lean();

        return createdNow.map((d: any) => String(d._id));
    }

    /**
     * Trả về dữ liệu khi incremental mà không có input mới
     */
    async returnIncremental(versionId: string) {
        console.log("No new inputs provided in incremental mode, returning existing data");

        // Đảm bảo tất cả inputs được đánh dấu processed
        const unprocessedInputs = await Input.find({
            version_id: versionId,
            is_processed: { $ne: true },
        }).lean();

        if (unprocessedInputs.length > 0) {
            await Input.updateMany(
                { _id: { $in: unprocessedInputs.map((i) => String(i._id)) } },
                { $set: { is_processed: true } }
            );
            console.log(`✅ Marked ${unprocessedInputs.length} unprocessed inputs as processed`);
        }

        const version = await Version.findById(versionId).lean();
        const previousRequirements = version ? (version as any).requirement_model || [] : [];

        return {
            version_id: versionId,
            inputs_count: 0,
            requirement_model: previousRequirements,
            mode: "incremental",
            processed_count: unprocessedInputs.length,
            new_usecases: [],
            duplicate_usecases: [],
        };
    }
}
