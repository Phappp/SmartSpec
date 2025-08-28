


[ FE Upload File ]
      ↓
[ /allinone/upload ]
      ↓
[ AllInOneService ]
 → OCR      → Insight
 → STT      → Insight
 → DOCX     → Insight
      ↓
 [ Kết quả Use Case ]
      ↓                     ↘
[ FE chọn UC ]         [ Gọi API sơ đồ ]
      ↓                      ↓
[ /generate-doc/json ]  [ /diagram/usecase ]
      ↓                      ↓
[ Markdown tài liệu ]   [ Mermaid sơ đồ ]





🧭 1. Luồng xử lý chính
🖼️ Bước 1: Người dùng upload file
URL: POST /api/allinone/upload

Component FE: GenerateDocView.vue (form upload)

Controller backend: features/allinone/adapter/controller.ts

Gọi tới: AllInOneService.handle(...)

🧠 Bước 2: Phân loại và xử lý file
Trong AllInOneService:

File loại	Xử lý bởi	Gọi tiếp
Ảnh (.png, .jpg,...)	OcrService	→ InsightService.extractWithSuggestion()
Âm thanh (.mp3, .wav,...)	SpeechToTextService	→ InsightService.extractWithSuggestion()
DOCX (.docx)	ReadDocxService	→ InsightService.extractWithSuggestion()

🧠 Bước 3: Trích xuất Use Case
Gọi: InsightService.extractWithSuggestion(text)

Trả về:

accepted_use_cases: các UC chắc chắn

suggested_use_cases: các UC đề xuất thêm

🧮 Bước 4: Lưu phiên làm việc (nếu có sessionId)
Redis key: usecase_session:{id}

File mới → hash SHA256

Nếu file đã phân tích trước đó thì không xử lý lại (⏩ skip)

📄 2. Tạo tài liệu Use Case/User Story
Bước 5: Người dùng chọn UC → Tạo tài liệu
FE gọi: POST /api/generate-doc/json

Payload: { use_cases: [...], options: { useCaseSpec: true, userStory: false } }

Bước 6: Xử lý tài liệu
Trong features/docgen/domain/service.ts (DocumentGeneratorService)

Trả về mảng DocumentSection[] với nội dung Markdown

🧩 3. Sinh sơ đồ (Diagram)
Bước 7: FE gọi API sơ đồ
POST /api/diagram/usecase

Payload: { use_cases: [...] }

Bước 8: Sinh sơ đồ Mermaid
Trong features/diagram/domain/service.ts

Hàm: generateUseCaseMermaid(...)

Trả về chuỗi mermaid dạng:

graph TD
    UC1["Xác minh thông tin"] 
    User --> UC1
🧰


