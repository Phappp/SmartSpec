import { UploadedFile } from "express-fileupload";
import { PdfService } from "../../handle_pdf/domain/service";
import { ReadDocxService } from "../../handle_docx/domain/service";
import { SpeechToTextService } from "../../handle_audio/domain/service";
import { OcrService } from "../../handle_image/domain/service";
import { TextService } from "../../handle_text/domain/service";
import { ExtractionResult } from "./ExtractionResult";
import { HashUtil } from '../../../utils/hash.util';


export class ExtractorService {
  private pdfService = new PdfService();
  private docxService = new ReadDocxService();
  private audioService = new SpeechToTextService();
  private imageService = new OcrService();
  private textService = new TextService();

  async extractFiles(
    files: UploadedFile[],
    projectId: string,
    versionId: string
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const mime = (file as any).mimetype || "";
      const fileHash = HashUtil.calculateFileHash(file);
      try {
        if (ext === "pdf" || mime === 'application/pdf') {
          // PdfService đã trả về ExtractionResult[]
          const pdfResults = await this.pdfService.handlePdfFiles(
            [file],
            projectId,
            versionId
          );
          const pdfResultsWithHash = pdfResults.map(result => ({
            ...result,
            file_hash: fileHash,
            is_processed: false
          }));
          results.push(...pdfResultsWithHash);
          // results.push(...pdfResults);
        } else if (ext === "docx" || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // DocxService cũng trả về ExtractionResult[]
          const docxResults = await this.docxService.handleDocxFiles(
            [file],
            projectId,
            versionId
          );
          const docxResultsWithHash = docxResults.map(result => ({
            ...result,
            file_hash: fileHash,
            is_processed: false
          }));
          results.push(...docxResultsWithHash);
          // results.push(...docxResults);
        } else if (mime.startsWith('audio/') || ["mp3", "m4a", "wav", "flac", "ogg", "webm", "aac"].includes(ext || "")) {
          const audioResults = await this.audioService.handleAudio([file as any], projectId, versionId);
          const audioMapped: ExtractionResult[] = audioResults.map(r => ({
            project_id: projectId,
            version_id: versionId,
            type: 'audio',
            original_filename: file.name,
            mime_type: file.mimetype,
            raw_text: r.text || '',
            confidence_score: r.confidence || 0,
            processing_status: (r.error ? 'failed' : 'extracted') as ExtractionResult['processing_status'],
            segments: r.segments || [],
            metadata: { language: r.language },
            file_hash: fileHash,
            is_processed: false
          })) as ExtractionResult[];
          results.push(...audioMapped);
        } else if (mime.startsWith('image/') || ["jpg", "jpeg", "png", "webp", "bmp", "tiff", "gif"].includes(ext || "")) {
          const imageResults = await this.imageService.handleImages([file as any], projectId, versionId);
          const imageMapped: ExtractionResult[] = imageResults.map((doc: any) => ({
            project_id: projectId,
            version_id: versionId,
            type: 'image',
            original_filename: doc.original_filename || file.name,
            mime_type: doc.mime_type || file.mimetype,
            raw_text: doc.raw_text || '',
            confidence_score: doc.confidence_score || 0,
            processing_status: (doc.processing_status || 'extracted') as ExtractionResult['processing_status'],
            segments: doc.segments || [],
            metadata: doc.metadata || {},
            file_hash: fileHash,
            is_processed: false
          })) as ExtractionResult[];
          results.push(...imageMapped);
        } else if (mime.startsWith('text/') || ["txt"].includes(ext || "")) {
          const content = (file as any).data ? (file as any).data.toString('utf8') : '';
          const saved = await this.textService.saveText(content, projectId, versionId);
          results.push({
            project_id: projectId,
            version_id: versionId,
            type: 'text',
            original_filename: file.name,
            mime_type: file.mimetype,
            raw_text: content,
            confidence_score: 1.0,
            processing_status: 'completed',
            metadata: { language: (saved as any)?.language || null },
            file_hash: fileHash,
            is_processed: false
          });
        } else {
          // Unsupported file type
          results.push({
            project_id: projectId,
            version_id: versionId,
            type: (ext as any) || "unknown",
            original_filename: file.name,
            mime_type: file.mimetype,
            raw_text: "",
            confidence_score: 0,
            processing_status: "failed",
            metadata: {
              error: `Unsupported file type: ${ext}`,
            },
            file_hash: fileHash,
            is_processed: false
          });
        }
      } catch (err: any) {
        results.push({
          project_id: projectId,
          version_id: versionId,
          type: (ext as any) || "unknown",
          original_filename: file.name,
          mime_type: file.mimetype,
          raw_text: "",
          confidence_score: 0,
          processing_status: "failed",
          metadata: {
            error: err.message || "Extraction failed",
          },
          file_hash: fileHash,
          is_processed: false
        });
      }
    }

    return results;
  }
}
