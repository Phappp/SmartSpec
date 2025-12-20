# Phân tích Flow xử lý Audio Input đến Generate Usecase

## 🔍 Flow từ đầu đến cuối

### 1. Frontend - Upload File (AddInputModal.vue / InputSidebar.vue)
- ✅ User chọn file m4a
- ✅ File được validate (MIME type: audio/mp4, audio/x-m4a, audio/m4a)
- ✅ FormData được tạo với files
- ✅ Emit event `add-inputs` với FormData

### 2. Frontend - Handle Add Inputs (UsecaseManagement.vue)
- ✅ `handleAddInputs()` nhận FormData
- ✅ Gọi API `addInputsToVersion(versionId, formData)`

### 3. Backend API - addInputsToVersion (InputHandleController)
- ✅ Nhận files từ req.files.files
- ✅ Gọi `InputHandleService.addInputsToVersion()`

### 4. Backend Service - addInputsToVersion (InputHandleService)
- ✅ Kiểm tra version.status !== 'processing' (nếu processing → 409 error)
- ✅ Nếu version không temporary → bump version
- ✅ Gọi `InputService.handleInputs(files, rawText, projectId, versionId)`

### 5. Backend - Handle Inputs (InputService.handleInputs)
- ✅ Check duplicate bằng file_hash
- ✅ Với files không duplicate → gọi `ExtractorService.extractFiles()`

### 6. Backend - Extract Files (ExtractorService.extractFiles)
- ✅ Phát hiện audio file: `mime.startsWith('audio/') || ["mp3", "m4a", "wav", ...].includes(ext)`
- ✅ Gọi `SpeechToTextService.handleAudio([file], projectId, versionId)`

### 7. Backend - Handle Audio (SpeechToTextService.handleAudio)
- ✅ Lưu file tạm vào temp directory
- ✅ Gọi Python script: `process_STT.py` với audio paths
- ✅ Python xử lý và trả về JSON với text, language, segments, confidence
- ✅ Với mỗi result → gọi `saveResultsToDatabase()`

### 8. Backend - Save Audio Results (SpeechToTextService.saveResultsToDatabase)
- ✅ Gọi `saveDocumentToDB()` để tạo Input document:
  - `processing_status: 'extracted'` ⚠️ QUAN TRỌNG
  - `type: 'audio'`
  - `raw_text: result.text`
  - `cleaned_text: result.text` (tạm thời)
  - `is_processed: false`
- ✅ Link vào `Version.inputs`
- ✅ Enqueue refine job: `enqueueRefineJob(saved._id, 'gemini')`

### 9. Backend - Enqueue Refine Job (SpeechToTextService.enqueueRefineJob)
- ✅ Dynamic import `handle_extraction/index`
- ✅ Gọi `refineInputById(inputId, 'gemini')` - **ASYNCHRONOUS**

### 10. Backend - Refine Input (refineInputById in handle_extraction/index.ts)
- ✅ Tìm Input theo inputId
- ✅ Kiểm tra: `shouldRefine = input.type === 'audio'` → TRUE
- ✅ Lấy API key active
- ✅ Gọi Gemini API để refine text
- ✅ Update Input:
  - `processing_status: 'completed'` ⚠️ QUAN TRỌNG
  - `cleaned_text: finalCleaned`
  - `quality_score: 0.9`

### 11. Backend - Orchestrator Run (OrchestratorService.run)
**Được gọi sau khi addInputsToVersion hoàn thành (qua incremental analysis)**

- ✅ Set version status = "processing"
- ✅ Gọi `InputService.handleInputs()` - LẦN NỮA (nhưng files đã được xử lý rồi)
- ✅ Gọi `InputService.getNewlyCreatedInputs(versionId)`:
  - Tìm inputs với `createdAt >= Date.now() - 2000` (2 giây gần đây)
  - ⚠️ VẤN ĐỀ: Nếu orchestrator được gọi > 2 giây sau khi audio được lưu, sẽ không tìm thấy!

### 12. Backend - Get Inputs to Process (OrchestratorService)
**Có 2 paths:**

#### Path A: Có targetIds (inputs mới trong 2s)
- ✅ `waitForInputsCompletionByIds(targetIds)` 
- ✅ Đợi đến khi status = "completed" hoặc "failed"
- ✅ Return inputs

#### Path B: Không có targetIds (fallback)
- ✅ Đợi 2 giây (để refine bắt đầu)
- ✅ Tìm inputs với `processing_status IN ["completed", "extracted"]` và `is_processed = false`
- ✅ Tách thành completed và extracted
- ✅ Nếu có extracted → đợi refine hoàn thành (timeout 90s)
- ✅ Kết hợp completed + refined inputs

### 13. Backend - Generate Usecases (RequirementService.finalize)
- ✅ Nhận inputs (đã có status "completed")
- ✅ Generate usecases từ inputs
- ✅ Lưu usecases vào database

## ⚠️ CÁC VẤN ĐỀ TIỀM ẨN

### Vấn đề 1: Timing của getNewlyCreatedInputs
- `getNewlyCreatedInputs` chỉ tìm inputs trong 2 giây gần đây
- Nhưng audio processing có thể mất > 2 giây:
  - Python STT: 5-30 giây (tùy file size)
  - Refine: 2-10 giây
- **Giải pháp đã áp dụng**: Fallback case xử lý extracted inputs

### Vấn đề 2: Refine Job là Asynchronous
- `enqueueRefineJob` chạy async, không đợi kết quả
- Orchestrator có thể được gọi trước khi refine xong
- **Giải pháp đã áp dụng**: `waitForInputsCompletionByIds` đợi refine hoàn thành

### Vấn đề 3: getNewlyCreatedInputs dùng createdAt
- Audio input được tạo NGAY sau khi Python xong
- Nhưng nếu orchestrator được gọi > 2 giây sau, sẽ rơi vào fallback
- **Giải pháp đã áp dụng**: Fallback case xử lý tốt

## ✅ KẾT LUẬN

Flow hiện tại **ĐÃ ĐƯỢC SỬA** để xử lý audio inputs đúng cách:
1. ✅ Fallback case tìm cả "extracted" và "completed" inputs
2. ✅ Đợi refine hoàn thành nếu có extracted inputs
3. ✅ Chỉ xử lý inputs đã hoàn thành (completed)

**NHƯNG** có thể cải thiện thêm:
- Tăng window time của `getNewlyCreatedInputs` từ 2s lên 5-10s
- Hoặc sử dụng timestamp từ khi addInputsToVersion được gọi thay vì createdAt
