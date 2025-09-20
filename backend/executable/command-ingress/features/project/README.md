## 1. Chức năng Tạo Dự án (Create Project)
Đây là bước khởi đầu.

Form: Người dùng điền vào form tạo dự án (name, description, language, đính kèm files, và rawText).

Gửi API: Khi nhấn "Tạo", FE sẽ gửi một request POST đến /api/projects với Content-Type là multipart/form-data.

Xử lý Phản hồi: Backend sẽ ngay lập tức trả về 201 Created cùng với dữ liệu của project và version vừa được tạo. FE cần lưu lại projectId và versionId.

Cập nhật Giao diện:

Ngay lập tức thêm dự án mới vào danh sách trên UI.

Hiển thị trạng thái của phiên bản mới này là "Đang xử lý..." kèm theo một biểu tượng loading (spinner).

Ngay sau đó, bắt đầu quy trình Thăm dò Trạng thái.

## 2. Thăm dò Trạng thái (Polling) - Trái tim của xử lý
Đây là cơ chế để FE biết được khi nào quá trình xử lý nền ở backend đã hoàn tất.

Phía Backend: Tạo một Endpoint Status mới
Trước tiên, bạn cần tạo một API endpoint đơn giản ở backend để FE có thể gọi.

Endpoint: GET /api/versions/:versionId/status

Logic:

Tìm Version theo versionId.

Kiểm tra các trường của Version và trả về một trạng thái:

Nếu processing_errors có nội dung -> { status: 'failed', data: version }

Nếu pending_conflicts có nội dung -> { status: 'has_conflicts', data: version }

Nếu requirement_model có nội dung và không có lỗi/conflict -> { status: 'completed', data: version }

Nếu không thuộc các trường hợp trên -> { status: 'processing', data: version }

Phía Frontend: Logic Polling
Bắt đầu: Ngay sau khi UI hiển thị "Đang xử lý...", hãy gọi một hàm, ví dụ startPolling(versionId).

Cơ chế:

Bên trong startPolling, sử dụng setInterval để gọi đến API GET /api/versions/:versionId/status mỗi 3-5 giây.

Mỗi lần nhận được phản hồi, kiểm tra response.status.

Nếu status vẫn là 'processing', không làm gì cả và chờ lần gọi tiếp theo.

Nếu status khác 'processing' (ví dụ: completed, failed), hãy dừng polling bằng cách gọi clearInterval và chuyển sang bước 3.

## 3. Cập nhật Giao diện dựa trên Trạng thái
Khi polling dừng lại, bạn sẽ cập nhật UI dựa trên trạng thái cuối cùng nhận được.

Nếu status === 'completed':

Ẩn biểu tượng loading.

Hiển thị thông báo thành công.

Hiển thị danh sách các use case đã được tạo ra từ response.data.requirement_model.

Nếu status === 'failed': * Ẩn biểu tượng loading.

Hiển thị một biểu tượng lỗi ⚠️.

Hiển thị thông báo lỗi từ response.data.processing_errors.

Hiển thị nút "Thử lại" (Retry).

Nếu status === 'has_conflicts':

Ẩn biểu tượng loading.

Hiển thị một biểu tượng cảnh báo.

Hiển thị danh sách các conflict từ response.data.pending_conflicts và cho phép người dùng giải quyết chúng.

## 4. Logic cho nút "Thử lại" (Retry)
Gửi API: Khi người dùng nhấn nút "Thử lại" trên một phiên bản bị lỗi, FE sẽ gửi một request POST đến endpoint run của orchestrator.

Endpoint: /api/orchestrator/:projectId/:versionId/run

Body: Gửi một body rỗng ({}).

Xử lý Phản hồi: Backend sẽ trả về 202 Accepted.

Cập nhật Giao diện: Ngay khi nhận được phản hồi 202, FE sẽ:

Chuyển trạng thái của phiên bản đó trên UI quay trở lại "Đang xử lý..." với biểu tượng loading.

Bắt đầu lại quy trình polling ở Bước 2.

Tóm tắt luồng hoạt động FE
Form Submit → POST /api/projects → [UI: "Processing..."] → startPolling() → GET /api/versions/.../status → (Lặp lại mỗi 5s) → [Trạng thái thay đổi] → stopPolling() → [UI: Hiển thị kết quả hoặc Lỗi/Nút Thử lại]