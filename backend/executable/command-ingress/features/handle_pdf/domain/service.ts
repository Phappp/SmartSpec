import { UploadedFile } from 'express-fileupload';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import Input from '../../../../../internal/model/input';
import Version from '../../../../../internal/model/version';

export class PdfService {
  async handlePdfFiles(pdfFiles: UploadedFile[], projectId: string, versionId: string): Promise<any[]> {
    const uploadDir = path.join(__dirname, '../../../uploads_pdf');
    await fs.mkdir(uploadDir, { recursive: true });

    const results: any[] = [];
    const inputIds: string[] = [];

    for (const file of pdfFiles) {
      const savePath = path.join(uploadDir, file.name);
      await file.mv(savePath);
      try {
        const result = await this.runPdfToText(savePath);

        // Lưu vào database (save raw trước)
        const savedInput = await this.saveDocumentToDB({
          projectId,
          versionId,
          type: 'pdf',
          fileUrl: `/uploads_pdf/${file.name}`,
          originalFilename: file.name,
          mimeType: file.mimetype || 'application/pdf',
          rawText: result.text || result.error || 'No text extracted from PDF',
          metadata: result.metadata || {},
          confidenceScore: (result.confidence ?? (result.text ? 0.6 : 0.0))
        });

        inputIds.push(savedInput._id.toString());

        results.push({
          ...result,
          documentId: savedInput._id,
        });

        // Quyết định refine: chỉ với pdf scan/image/audio; ở đây pdf: dựa theo is_scanned
        const isScanned = !!(result?.metadata?.is_scanned);
        console.log(`[refine] decide | type=pdf isScanned=${isScanned} inputId=${savedInput._id}`);
        if (isScanned) {
          console.log(`[refine] enqueue | inputId=${savedInput._id} provider=gemini`);
          this.enqueueRefineJob(savedInput._id.toString(), 'gemini');
        } else {
          console.log(`[refine] skip | not scanned pdf inputId=${savedInput._id}`);
        }
      } catch (error: any) {
        results.push({ text: null, confidence: 0, error: error.message || 'Internal error' });
      }
    }

    // Cập nhật version với danh sách input_ids
    if (inputIds.length > 0) {
      await Version.findByIdAndUpdate(versionId, {
        $push: { inputs: { $each: inputIds } },
        updated_at: new Date()
      });
    }

    return results;
  }

  // enqueue refine job (placeholder - to be implemented with BullMQ or simple in-process)
  private enqueueRefineJob(inputId: string, provider: 'gemini' | 'openai' | 'claude') {
    // Tạm thời chạy inline (đồng bộ) để demo. Sản xuất: dùng queue BullMQ.
    import('../../handle_extraction/index')
      .then((m) => {
        console.log(`[refine] start worker | inputId=${inputId} provider=${provider}`);
        return m.refineInputById(inputId, provider);
      })
      .then(() => {
        console.log(`[refine] done worker | inputId=${inputId}`);
      })
      .catch((err) => {
        console.error(`[refine] error worker | inputId=${inputId}`, err?.message || err);
      });
  }

  async saveDocumentToDB(data: {
    projectId: string;
    versionId: string;
    type: string;
    fileUrl: string;
    originalFilename: string;
    mimeType: string;
    rawText: string;
    metadata: any;
    confidenceScore: number;
  }) {
    const isScanned = data.type === 'pdf' && (data.metadata?.is_scanned === true);
    const input = new Input({
      project_id: data.projectId,
      version_id: data.versionId,
      type: data.type,
      file_url: data.fileUrl,
      original_filename: data.originalFilename,
      mime_type: data.mimeType,
      raw_text: data.rawText,
      cleaned_text: data.rawText,
      metadata: data.metadata,
      confidence_score: data.confidenceScore,
      quality_score: data.confidenceScore,
      // mark extracted nếu sẽ refine; completed nếu không
      processing_status: isScanned ? 'extracted' : 'completed',
      pipeline_steps: isScanned
        ? { extraction: true, ocr: true }
        : { extraction: true }
    });

    return await input.save();
  }

  async runPdfToText(pdfPath: string): Promise<any> {
    const scriptPath = path.join(__dirname, '../pythonScript/process_pdf.py');
    const args = [scriptPath, pdfPath];

    return new Promise((resolve, reject) => {
      const python = spawn('python', args);
      let result = '';
      let error = '';

      python.stdout.on('data', (data) => result += data.toString());
      python.stderr.on('data', (data) => error += data.toString());

      python.on('close', (code) => {
        if (code !== 0) return reject(new Error(error));
        try {
          const parsed = JSON.parse(result);
          // Python script trả về array, lấy phần tử đầu tiên
          const firstResult = Array.isArray(parsed) && parsed.length > 0 ? parsed[0].result : parsed;
          resolve(firstResult);
        } catch (e) {
          reject(new Error('Invalid JSON from PDF script'));
        }
      });

      python.on('error', (err) => reject(err));
    });
  }
}
