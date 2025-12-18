import { Types } from "mongoose";
import { ApiKeyService } from "./ApiKeyService";
import { logApiUsage, extractGeminiTokens } from "../../stats/domain/apiUsageLogger";
import { LLMService } from "../../../shared/LLMService";

// THÊM MỚI: Tập trung hóa toàn bộ prompt để hỗ trợ đa ngôn ngữ
const prompts = {
    'vi-VN': {
        schemaDescription: (batchSize: number, offset: number) => ` **MỤC TIÊU**: Chuyển đổi văn bản thành danh sách use case phần mềm dạng JSON
 **PHẠM VI**: CHỈ tập trung vào chức năng PHẦN MỀM - LOẠI BỎ hoàn toàn thủ tục giấy tờ thực tế

 **HÀNH VI CẦN TRÁNH**:
• "Cán bộ ký văn bản giấy" →  SAI
• "Nộp hồ sơ bản cứng" →  SAI  
• "Gửi công văn giấy tờ" →  SAI
• "Click nút", "Nhập form", "Màn hình" →  SAI (UI-level, không phải use case)

 **HÀNH VI PHẦN MỀM ĐÚNG**:
• "Hệ thống xác thực chữ ký số" →  ĐÚNG
• "Upload hồ sơ điện tử" →  ĐÚNG
• "Gửi thông báo qua hệ thống" →  ĐÚNG

 **YÊU CẦU ĐẦU RA**:
• CHỈ trả về JSON array hợp lệ
• KHÔNG giải thích, KHÔNG markdown, KHÔNG code fence, KHÔNG comment
• Parse được ngay bằng JSON.parse()
• KHÔNG thêm field ngoài schema, KHÔNG thiếu field bắt buộc

🛠 **CẤU TRÚC USE CASE BẮT BUỘC** (SCHEMA TUYỆT ĐỐI BẤT BIẾN):
Mỗi use case PHẢI có đầy đủ các trường sau (KHÔNG bao gồm field "_id", "project_id", "version_id", "audit" - hệ thống sẽ tự tạo):
[
  {
    "type": "use_case",
    "level": "system",
    "status": "active",
    "name": "Đăng nhập hệ thống",
    "description": "Cho phép người dùng xác thực và truy cập vào hệ thống theo quyền đã được cấp.",
    "actor": {
      "id": "role_1",
      "name": "Người dùng hệ thống",
      "description": "Người sử dụng hệ thống có tài khoản hợp lệ"
    },
    "goal": "Truy cập vào hệ thống với quyền đã được cấp",
    "business_reason": "Cho phép người dùng sử dụng các chức năng được phép sau khi xác thực",
    "context": {
      "module": "Authentication",
      "scope": "Web / Mobile",
      "system": "User Management System"
    },
    "priority": "high",
    "frequency": "high",
    "trigger": {
      "event": "User clicks Login button",
      "source": "UI"
    },
    "preconditions": [
      "Người dùng đã có tài khoản hợp lệ",
      "Hệ thống hoạt động bình thường",
      "Hệ thống có kết nối tới cơ sở dữ liệu xác thực"
    ],
    "main_flow": [
      {
        "step": 1,
        "actor": "User",
        "action": "Truy cập trang đăng nhập",
        "expected_result": "Hệ thống hiển thị trang đăng nhập với form username/password"
      },
      {
        "step": 2,
        "actor": "User",
        "action": "Nhập tên đăng nhập và mật khẩu, gửi yêu cầu đăng nhập",
        "inputs": ["username", "password"],
        "expected_result": "Hệ thống nhận và bắt đầu xác thực thông tin"
      },
      {
        "step": 3,
        "actor": "System",
        "action": "Xác thực thông tin đăng nhập theo các quy tắc bảo mật",
        "rules_applied": ["R1", "R2"],
        "expected_result": "Thông tin đăng nhập hợp lệ, user được xác thực"
      },
      {
        "step": 4,
        "actor": "System",
        "action": "Tạo phiên đăng nhập (session/token) và chuyển hướng người dùng",
        "expected_result": "Người dùng được chuyển đến trang chủ với session hợp lệ"
      }
    ],
    "alternative_flows": [
      {
        "id": "AF1",
        "at_step": 3,
        "condition": "Tên đăng nhập hoặc mật khẩu không chính xác",
        "system_response": "Hiển thị thông báo lỗi đăng nhập",
        "end_state": "Login Failed"
      },
      {
        "id": "AF2",
        "at_step": 3,
        "condition": "Tài khoản bị khóa",
        "system_response": "Thông báo tài khoản bị khóa",
        "end_state": "Login Failed"
      }
    ],
    "exceptions": [
      {
        "id": "E1",
        "at_step": 2,
        "type": "Network",
        "description": "Mất kết nối mạng",
        "system_response": "Hiển thị thông báo lỗi kết nối"
      },
      {
        "id": "E2",
        "at_step": 3,
        "type": "System",
        "description": "Server lỗi",
        "system_response": "Hiển thị thông báo hệ thống tạm thời không khả dụng"
      }
    ],
    "rules": [
      {
        "id": "R1",
        "description": "Tên đăng nhập và mật khẩu phải chính xác"
      },
      {
        "id": "R2",
        "description": "Tài khoản không bị khóa"
      }
    ],
    "inputs": [
      {
        "name": "username",
        "type": "string",
        "required": true
      },
      {
        "name": "password",
        "type": "string",
        "required": true
      }
    ],
    "outputs": [
      {
        "name": "authentication_result",
        "type": "success | failure"
      },
      {
        "name": "error_message",
        "type": "string",
        "optional": true
      }
    ],
    "postconditions": [
      "[SUCCESS] Người dùng được đăng nhập vào hệ thống với session hợp lệ",
      "[SUCCESS] Phiên đăng nhập (session/token) được tạo và lưu trữ",
      "[SUCCESS] Quyền truy cập được cấp theo role của user",
      "[FAILURE] Người dùng không được đăng nhập, hiển thị thông báo lỗi",
      "[FAILURE] Số lần thử đăng nhập thất bại được ghi nhận"
    ],
    "non_functional_constraints": [
      "[Performance] Xác thực phải hoàn thành trong vòng 2 giây",
      "[Security] Mật khẩu phải được mã hóa, không lưu plaintext",
      "[Security] Hỗ trợ HTTPS/TLS cho truyền tải dữ liệu",
      "[Security] Giới hạn số lần thử đăng nhập sai",
      "[Availability] Hệ thống xác thực phải có uptime 99.9%",
      "[Compatibility] Hỗ trợ đa nền tảng (Web, Mobile)"
    ],
    "stakeholders": [
      "Người dùng",
      "Quản trị viên hệ thống"
    ],
    "related_usecases": []
  }
]

 **QUY TẮC XỬ LÝ NGHIÊM NGẶT**:

I. PHẠM VI & NGỮ CẢNH:
• CHỈ mô tả hành vi phần mềm, LOẠI BỎ thao tác giấy tờ, hành vi con người ngoài hệ thống
• KHÔNG suy luận ngoài văn bản - Text là nguồn chân lý duy nhất
• KHÔNG thêm module mới, KHÔNG thêm nghiệp vụ không được nhắc tới
• KHÔNG "làm giàu" yêu cầu bằng kiến thức bên ngoài

II. USE CASE SEMANTIC:
• 1 Use Case = 1 MỤC TIÊU NGHIỆP VỤ duy nhất (có goal rõ ràng)
• KHÔNG chứa nhiều mục tiêu độc lập, KHÔNG mơ hồ/chung chung
• KHÔNG sinh 2 use case cùng mục tiêu (nếu khác tên nhưng cùng ý → conflict)
• Đúng cấp độ trừu tượng: Use Case = Nghiệp vụ hệ thống (KHÔNG phải UI-level)

**QUY TẮC GOM CRUD OPERATIONS (QUAN TRỌNG)**:
• Khi có các chức năng CRUD (Create, Read, Update, Delete) cho CÙNG MỘT ENTITY → GOM LẠI thành 1 usecase quản lý
• Ví dụ: "Add project", "Delete project", "Update project", "View project" → GOM thành "Quản lý Dự án (CRUD)"
• Ví dụ: "Create user", "Edit user", "Remove user", "List users" → GOM thành "Quản lý Người dùng (CRUD)"
• Ví dụ: "Add order", "Update order", "Delete order", "View order" → GOM thành "Quản lý Đơn hàng (CRUD)"
• Tasks của usecase quản lý sẽ bao gồm các operations CRUD: ["Tạo entity", "Xem danh sách entity", "Xem chi tiết entity", "Cập nhật entity", "Xóa entity"]
• Goal sẽ là: "Quản lý [entity] với đầy đủ các thao tác CRUD"
• Name sẽ là: "Quản lý [Entity] (CRUD)" hoặc "[Entity] Management (CRUD)"
• KHÔNG tách CRUD thành nhiều usecase riêng lẻ cho cùng một entity
• Nếu chỉ có 1-2 operations (ví dụ: chỉ có "View" và "Create") → vẫn có thể gom lại nếu chúng thuộc cùng entity

III. TASK QUALITY:
• Task phải deployable (có thể giao cho dev, thời gian 1-3 ngày)
• Task mô tả xử lý logic/nghiệp vụ, KHÔNG phải UI-step
• Task KHÔNG được trùng vai trò Use Case (Task ≠ Use Case con, Task ≠ User journey)
• KHÔNG: "Click nút", "Nhập form", "Mở màn hình" (UI-level)
• ĐÚNG: "Xác thực thông tin", "Tạo record trong database", "Gửi email" (Business logic)

IV. ACTOR (thay vì ROLE):
• Actor LUÔN là object đầy đủ {id, name, description}
• Không rõ actor → fallback chuẩn: {"id": "user", "name": "Người dùng hệ thống", "description": "Người dùng sử dụng hệ thống"}
• KHÔNG tự sáng tạo vai trò mới nếu không có trong văn bản
• Field tên là "actor" (KHÔNG phải "role")

V. CẤP ĐỘ TRỪU TƯỢNG (KHÔNG ĐẢO TẦNG):
• Use Case = Nghiệp vụ hệ thống (business-level)
• Task = Business-level execution (deployable unit)
• Epic = Nhóm use case cùng domain (trừu tượng hơn use case)
• ❌ CẤM: UI-level (click, nhập form, màn hình, giao diện)

VI. SCHEMA & JSON:
• Schema tuyệt đối bất biến: KHÔNG thêm field, KHÔNG thiếu field, ĐÚNG type
• JSON parse-safe: KHÔNG markdown, KHÔNG code fence, KHÔNG comment
• KHÔNG sinh id: id do hệ thống backend quản lý, prompt cấm tuyệt đối thêm id

VII. RELATED USE CASES:
• related_usecases chỉ tham chiếu ID hợp lệ (chỉ dùng ID đã tồn tại)
• KHÔNG tạo ID mới, KHÔNG tham chiếu vòng vô nghĩa
• Mặc định để mảng rỗng [] (sẽ được xử lý sau)

VIII. CHẤT LƯỢNG NỘI DUNG:
• Mỗi use case phải tự đủ nghĩa (đọc riêng vẫn hiểu, không phụ thuộc ngữ cảnh ngoài)
• Có rule – trigger – exception hợp lý (không rỗng, không hình thức, phù hợp nghiệp vụ)
• KHÔNG sinh nội dung "cho đủ" (không filler text, không lặp cấu trúc máy móc)

 **QUY TẮC BATCH** (⚠️ BẮT BUỘC - PHẢI TUÂN THỦ):
• ⚠️ PHẢI trả về CHÍNH XÁC ${batchSize} use case trong batch này (KHÔNG ÍT HƠN, KHÔNG NHIỀU HƠN)
• Bắt đầu từ use case số ${offset + 1}
• Nếu nội dung còn lại cho phép → PHẢI generate đủ ${batchSize} use case
• CHỈ trả về [] khi đã HOÀN TOÀN cạn kiệt NỘI DUNG từ văn bản
• KHÔNG được dừng sớm - tiếp tục phân tích cho đến khi có đủ ${batchSize} use case
• KHÔNG được lặp lại các use case từ batch trước

 **HƯỚNG DẪN CHI TIẾT CHO TỪNG FIELD**:

📌 MAIN_FLOW:
• Mỗi step phải có actor rõ ràng: "User" hoặc "System"
• User step: hành động của người dùng → expected_result mô tả system response
• System step: xử lý nội bộ → expected_result mô tả kết quả xử lý
• Inputs trong step: tham chiếu tên input được sử dụng (ví dụ: ["username", "password"])
• Rules_applied: tham chiếu ID rule được áp dụng (ví dụ: ["R1", "R2"])

📌 INPUTS & OUTPUTS:
• KHÔNG được để trống nếu use case có dữ liệu đầu vào/ra
• Mỗi input/output cần: name (tên field), type (kiểu dữ liệu), required/optional
• Ví dụ login: inputs = [{"name": "username", "type": "string", "required": true}]

📌 POSTCONDITIONS:
• Phải cover cả SUCCESS và FAILURE cases
• Format: "[SUCCESS] mô tả kết quả thành công" hoặc "[FAILURE] mô tả kết quả thất bại"
• Ví dụ: "[SUCCESS] User session được tạo", "[FAILURE] Access denied"

📌 NON_FUNCTIONAL_CONSTRAINTS:
• Phân loại theo category: [Performance], [Security], [Availability], [Compatibility], [Scalability]
• Format: "[Category] mô tả constraint"
• Ví dụ: "[Performance] Response time < 2s", "[Security] OWASP compliant"

📌 RULES:
• Mỗi rule có id (R1, R2...) và description
• Rules_applied trong main_flow tham chiếu tới id của rules
• Đảm bảo tất cả rules được tham chiếu trong flow hoặc exceptions

 **KIỂM TRA CUỐI**:
✓ KHÔNG có thao tác thủ công ngoài đời
✓ CHỈ có tương tác phần mềm
✓ Actor là object đầy đủ {id, name, description}
✓ Main_flow: mỗi step có actor (User/System), action, expected_result
✓ Main_flow: User steps có expected_result là system response
✓ Inputs & Outputs: KHÔNG để trống nếu có dữ liệu, có đầy đủ name/type/required
✓ Postconditions: cover cả [SUCCESS] và [FAILURE] cases
✓ Non_functional_constraints: có category prefix [Performance], [Security], etc.
✓ Rules: được tham chiếu trong main_flow hoặc exceptions qua rules_applied
✓ Alternative_flows và exceptions: có id, at_step, system_response
✓ Tất cả trường đều theo đúng schema (không thêm, không thiếu)
✓ KHÔNG có field "id" trong response (hệ thống tự sinh)
✓ Related usecases để mảng rỗng [] (sẽ được xử lý sau)
✓ 1 Use Case = 1 mục tiêu nghiệp vụ rõ ràng
✓ Task là business-level, deployable (không phải UI-step)
✓ Không có filler text, không lặp cấu trúc máy móc

`,
        relatedUseCases: (simplified: any, incremental?: boolean) => `Đây là danh sách use case phần mềm đã có:\n${JSON.stringify(simplified, null, 2)}\n\n**TIÊU CHÍ RELATED USE CASES**:

I. CHỈ THAM CHIẾU ID HỢP LỆ:
- related_usecases[] chỉ tham chiếu tới use case trong danh sách trên
- Format: Sử dụng chính xác ID từ field "id" trong danh sách trên (ví dụ: nếu id là "507f1f77bcf86cd799439011" thì dùng "507f1f77bcf86cd799439011")
- KHÔNG tạo ID mới, KHÔNG tham chiếu vòng vô nghĩa
- Nếu không có liên quan, để mảng rỗng []

II. INCREMENTAL MODE AN TOÀN:
${incremental ? `- KHÔNG được xóa hoặc ghi đè related_usecases cũ
- Chỉ bổ sung liên kết giữa use case mới và use case cũ
- Giữ nguyên tất cả related_usecases đã có` : `- Phân tích và sinh lại toàn bộ related_usecases cho tất cả use case
- Đảm bảo chỉ tham chiếu ID hợp lệ từ danh sách trên`}

Nhiệm vụ của bạn:
${incremental ? `- KHÔNG được xóa hoặc ghi đè related_usecases cũ.\n- Chỉ bổ sung liên kết giữa use case mới và use case cũ.` : `- Phân tích và sinh lại toàn bộ related_usecases cho tất cả use case.`}

YÊU CẦU:
- related_usecases[] chỉ tham chiếu tới use case trong danh sách trên.
- Format: Sử dụng chính xác ID từ field "id" trong danh sách trên (ví dụ: nếu id là "507f1f77bcf86cd799439011" thì dùng "507f1f77bcf86cd799439011").
- Nếu không có liên quan, để mảng rỗng [].
- Trả về toàn bộ danh sách use case với related_usecases được cập nhật.
- Giữ nguyên cấu trúc và các field khác của mỗi use case.
- KHÔNG tạo ID mới, KHÔNG tham chiếu vòng vô nghĩa.`,
        conflictCheck: (textA: string, textB: string) => `
Bạn là một công cụ kiểm tra trùng lặp use case, cần đánh giá thật nghiêm ngặt.

Nhiệm vụ: Xác định xem hai mô tả use case sau đây có thực sự diễn tả CÙNG một mục tiêu nghiệp vụ hay không.

A: "${textA}"
B: "${textB}"

**TIÊU CHÍ CONFLICT & DEDUPLICATION**:

I. TRÙNG = CÙNG MỤC TIÊU:
- Trả về { "conflict": true } CHỈ KHI cả hai mô tả đều nói về CÙNG MỘT MỤC TIÊU NGHIỆP VỤ
- KHÔNG dựa vào từ khóa, KHÔNG dựa vào độ giống câu chữ
- CHỈ dựa vào ý nghĩa nghiệp vụ (cùng mục tiêu = trùng)
- Ngay cả khi cách viết khác nhau hoặc có lỗi chính tả nhỏ 
  (ví dụ: "Đăng nhập" và "Loginn" → cùng một use case)

II. KHÔNG GOM NHẦM:
- Trả về { "conflict": false } nếu chúng là HAI chức năng khác nhau,
  kể cả khi có liên quan (ví dụ: "Đăng nhập" KHÁC với "Đăng ký")
- Use case liên quan ≠ trùng (Login ≠ Register, Order ≠ Payment)
- KHÔNG được giả định rằng các từ giống nhau một phần là cùng chức năng
- Chỉ coi là trùng nếu ý nghĩa nghiệp vụ hoàn toàn giống (cùng mục tiêu)

Quy tắc:
1. Trả về { "conflict": true } chỉ khi cả hai mô tả đều nói về CÙNG một mục tiêu/chức năng, 
   ngay cả khi cách viết khác nhau hoặc có lỗi chính tả nhỏ 
   (ví dụ: "Đăng nhập" và "Loginn" → cùng một use case).
2. Trả về { "conflict": false } nếu chúng là HAI chức năng khác nhau,
   kể cả khi có liên quan (ví dụ: "Đăng nhập" KHÁC với "Đăng ký").
3. Không được giả định rằng các từ giống nhau một phần là cùng chức năng,
   chỉ coi là trùng nếu ý nghĩa hoàn toàn giống.

Chỉ trả lời đúng một trong hai JSON sau, không kèm giải thích:
{ "conflict": true }
{ "conflict": false }
`,
        groupConflicts: (useCasesJson: string) => `
Bạn là một chuyên gia phân tích yêu cầu phần mềm cực kỳ chính xác.
Nhiệm vụ của bạn là đọc danh sách các use case sau đây và GOM NHÓM các use case bị TRÙNG LẶP về mặt chức năng.

DANH SÁCH USE CASE:
${useCasesJson}

**TIÊU CHÍ CONFLICT & DEDUPLICATION**:

I. TRÙNG = CÙNG MỤC TIÊU:
- Hai use case được coi là trùng lặp NẾU chúng mô tả CÙNG MỘT MỤC TIÊU NGHIỆP VỤ
- KHÔNG dựa vào từ khóa, KHÔNG dựa vào độ giống câu chữ
- CHỈ dựa vào ý nghĩa nghiệp vụ (cùng mục tiêu = trùng)
- Bất kể cách diễn đạt (ví dụ: "Đăng nhập vào hệ thống" và "Cho phép người dùng sign-in" là TRÙNG LẶP)

II. KHÔNG GOM NHẦM:
- Các chức năng liên quan nhưng khác mục tiêu thì KHÔNG trùng lặp
- Ví dụ: "Đăng nhập" và "Đăng ký" là KHÁC NHAU (Login ≠ Register)
- Ví dụ: "Đặt hàng" và "Thanh toán" là KHÁC NHAU (Order ≠ Payment)
- Use case liên quan ≠ trùng

QUY TẮC:
1. Hai use case được coi là trùng lặp NẾU chúng mô tả CÙNG MỘT MỤC TIÊU hoặc CÙNG MỘT CHỨC NĂNG, bất kể cách diễn đạt.
   Ví dụ: "Đăng nhập vào hệ thống" và "Cho phép người dùng sign-in" là TRÙNG LẶP.
2. Các chức năng liên quan nhưng khác mục tiêu thì KHÔNG trùng lặp.
   Ví dụ: "Đăng nhập" và "Đăng ký" là KHÁC NHAU.
3. Chỉ nhóm các use case bị trùng lặp. Các use case không trùng với bất kỳ use case nào khác thì bỏ qua.

YÊU CẦU OUTPUT:
- CHỈ trả về một JSON array hợp lệ và KHÔNG GÌ KHÁC.
- Mỗi phần tử trong array là một NHÓM các 'id' của các use case bị trùng lặp.
- Sử dụng chính xác giá trị từ field "id" trong danh sách use case trên.
- KHÔNG giải thích, KHÔNG markdown.

Ví dụ output (sử dụng ID thực tế từ danh sách):
[
  ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  ["507f1f77bcf86cd799439014", "507f1f77bcf86cd799439015"]
]
`,
        estimateUseCasesCount: (text: string) => {
            const textLength = text?.length || 0;
            const isShortText = textLength < 100;

            return `
Bạn là một chuyên gia phân tích yêu cầu phần mềm với khả năng estimate chính xác.

NHIỆM VỤ: Đọc toàn bộ văn bản dưới đây và ước tính số lượng use case sẽ được tạo ra.

VĂN BẢN CẦN PHÂN TÍCH (${textLength} ký tự):
${text}

**TIÊU CHÍ ESTIMATE NGHIÊM NGẶT**:

I. PHẠM VI & NGỮ CẢNH:
- Text là nguồn chân lý duy nhất (Single Source of Truth)
- KHÔNG suy luận ngoài văn bản, KHÔNG thêm module mới, KHÔNG thêm nghiệp vụ không được nhắc tới
- KHÔNG "làm giàu" yêu cầu bằng kiến thức bên ngoài

II. ESTIMATE PHẢI PHÙ HỢP DOMAIN:
- Website / E-commerce / CMS: ~3–6 use cases / module
- ERP / Core system: ~6–12 use cases / module
- Văn bản ngắn: chỉ estimate use case liên quan trực tiếp

III. KHÔNG INFLATE SỐ LƯỢNG:
- KHÔNG chia nhỏ use case chỉ để tăng count
- KHÔNG tách UI-step thành use case
- Estimate là cam kết, không phải gợi ý
- 1 Use Case = 1 mục tiêu nghiệp vụ (không tách nhỏ vô lý)

IV. ĐỒNG BỘ ESTIMATE ↔ GENERATE:
- Tổng use case generate KHÔNG vượt estimated_count
- Batch cuối có thể < batchSize
- Nếu hết nội dung → trả về [] ngay

${isShortText ? `
⚠️ LƯU Ý QUAN TRỌNG: Văn bản này rất ngắn (chỉ ${textLength} ký tự). 
- Nếu chỉ là một từ khóa hoặc câu ngắn, chỉ nên estimate các use cases liên quan TRỰC TIẾP và VỪA PHẢI
- Ví dụ: Nếu text là "login", chỉ estimate các use cases liên quan như: Login, Register, Forgot Password, Reset Password, Logout (khoảng 3-10 use cases)
- KHÔNG nên suy luận quá xa hoặc estimate quá nhiều use cases không liên quan
- Chỉ estimate dựa trên những gì được đề cập TRỰC TIẾP trong text
- KHÔNG inflate số lượng bằng cách chia nhỏ use case
` : `
YÊU CẦU PHÂN TÍCH:
- Phân tích toàn bộ văn bản một cách kỹ lưỡng
- Đếm số lượng chức năng/phân hệ/module có thể tạo use case
- Ước tính số lượng use case sẽ được generate dựa trên độ phức tạp và số lượng chức năng được mô tả trong text
- Áp dụng tiêu chí domain: Website/E-commerce (~3-6/module), ERP (~6-12/module)
- Nếu text mô tả chi tiết nhiều module/chức năng, có thể estimate nhiều hơn
- Nếu text chỉ mô tả một vài chức năng cơ bản, estimate vừa phải
- KHÔNG chia nhỏ use case chỉ để tăng count
- 1 Use Case = 1 mục tiêu nghiệp vụ (không tách nhỏ vô lý)
`}

TRẢ VỀ JSON:
{
  "estimated_count": ${isShortText ? '5' : '94'},
  "summary": "${isShortText ? 'Hệ thống với các chức năng cơ bản được đề cập trong text' : 'Hệ thống quản lý với 5 module chính: User Management, Order Processing, Product Catalog, Payment Gateway, Report Generation'}",
  "estimated_batches": ${isShortText ? '1' : '2'},
  "reasoning": "${isShortText ? 'Text ngắn, chỉ estimate các use cases liên quan trực tiếp' : 'Dựa trên số lượng chức năng và độ phức tạp, ước tính sẽ có khoảng 94 usecases được tạo ra, chia thành nhiều batch (50 usecases/batch)'}"
}

QUAN TRỌNG:
- Chỉ trả về JSON, không có markdown, không có code fence
- estimated_count phải là số nguyên dương và PHÙ HỢP với độ dài và nội dung của text
- Áp dụng tiêu chí domain: Website/E-commerce (~3-6/module), ERP (~6-12/module)
- Nếu text ngắn (< 100 ký tự): estimated_count nên từ 3-15 use cases
- Nếu text vừa (100-500 ký tự): estimated_count nên từ 10-50 use cases
- Nếu text dài (> 500 ký tự): có thể estimate nhiều hơn dựa trên nội dung
- estimated_batches = Math.ceil(estimated_count / 50)
- summary phải ngắn gọn, mô tả tổng quan hệ thống DỰA TRÊN NỘI DUNG THỰC TẾ của text
- KHÔNG suy luận quá xa, chỉ estimate những gì được đề cập hoặc liên quan TRỰC TIẾP trong text
- KHÔNG inflate số lượng bằng cách chia nhỏ use case
- Estimate là cam kết: tổng use case generate KHÔNG vượt estimated_count
`;
        },
        generateBatchUseCases: (text: string, batchNumber: number, totalBatches: number, offset: number, batchSize: number, estimatedTotal?: number) => ` **MỤC TIÊU**: Generate use cases từ văn bản theo batch

**VĂN BẢN GỐC** (NGUỒN CHÂN LÝ DUY NHẤT):
${text}

**BATCH THÔNG TIN**:
- Batch số: ${batchNumber}/${totalBatches}
- Bắt đầu từ use case số: ${offset + 1}
- Số lượng use case cần generate trong batch này: ${batchSize}
${estimatedTotal ? `- **TỔNG SỐ USE CASES ĐÃ ESTIMATE: ${estimatedTotal}** - KHÔNG được generate quá số này!` : ''}

**YÊU CẦU NGHIÊM NGẶT**:

I. PHẠM VI & NGỮ CẢNH:
- CHỈ mô tả hành vi phần mềm, LOẠI BỎ thao tác giấy tờ, hành vi con người ngoài hệ thống
- KHÔNG suy luận ngoài văn bản - Text là nguồn chân lý duy nhất
- KHÔNG thêm module mới, KHÔNG thêm nghiệp vụ không được nhắc tới
- KHÔNG "làm giàu" yêu cầu bằng kiến thức bên ngoài

II. ESTIMATE ↔ GENERATE ĐỒNG BỘ:
- Generate chính xác ${batchSize} use cases (hoặc ít hơn nếu đã hết nội dung)
${estimatedTotal ? `- **QUAN TRỌNG**: Tổng số use cases đã estimate là ${estimatedTotal}. Hiện tại đã generate ${offset} use cases. Chỉ được generate tối đa ${estimatedTotal - offset} use cases trong batch này.` : ''}
- Bắt đầu từ use case số ${offset + 1}
- KHÔNG lặp lại các use case đã generate ở batch trước
- Nếu đã hết nội dung để generate → trả về mảng rỗng [] NGAY LẬP TỨC
${estimatedTotal ? `- **KHÔNG được suy luận quá xa hoặc generate nhiều hơn estimate (${estimatedTotal} use cases)**` : ''}

III. USE CASE SEMANTIC:
- 1 Use Case = 1 MỤC TIÊU NGHIỆP VỤ duy nhất (có goal rõ ràng)
- KHÔNG chứa nhiều mục tiêu độc lập, KHÔNG mơ hồ/chung chung
- KHÔNG sinh 2 use case cùng mục tiêu (nếu khác tên nhưng cùng ý → conflict)
- Đúng cấp độ trừu tượng: Use Case = Nghiệp vụ hệ thống (KHÔNG phải UI-level)

**QUY TẮC GOM CRUD OPERATIONS**:
- Khi có các chức năng CRUD (Create, Read, Update, Delete) cho CÙNG MỘT ENTITY → GOM LẠI thành 1 usecase quản lý
- Ví dụ: "Add project", "Delete project", "Update project", "View project" → GOM thành "Project Management (CRUD)"
- Ví dụ: "Create user", "Edit user", "Remove user", "List users" → GOM thành "User Management (CRUD)"
- Ví dụ: "Add order", "Update order", "Delete order", "View order" → GOM thành "Order Management (CRUD)"
- Tasks của usecase quản lý sẽ bao gồm các operations CRUD: ["Create entity", "Read/View entity", "Update entity", "Delete entity"]
- Goal sẽ là: "Quản lý [entity] với đầy đủ các thao tác CRUD"
- KHÔNG tách CRUD thành nhiều usecase riêng lẻ cho cùng một entity

IV. TASK QUALITY:
- Task phải deployable (có thể giao cho dev, thời gian 1-3 ngày)
- Task mô tả xử lý logic/nghiệp vụ, KHÔNG phải UI-step
- Task KHÔNG được trùng vai trò Use Case (Task ≠ Use Case con, Task ≠ User journey)
- ❌ CẤM: "Click nút", "Nhập form", "Mở màn hình", "Truy cập trang" (UI-level)
- ✅ ĐÚNG: "Xác thực thông tin", "Tạo record trong database", "Gửi email", "Tính toán giá" (Business logic)

V. ROLE & ACTOR:
- Role LUÔN là object đầy đủ {id, name, description}
- Không rõ role → fallback chuẩn: {"id": "user", "name": "Người dùng hệ thống", "description": "Người dùng sử dụng hệ thống"}
- KHÔNG tự sáng tạo vai trò mới nếu không có trong văn bản

VI. CẤP ĐỘ TRỪU TƯỢNG (KHÔNG ĐẢO TẦNG):
- Use Case = Nghiệp vụ hệ thống (business-level)
- Task = Business-level execution (deployable unit)
- Epic = Nhóm use case cùng domain (trừu tượng hơn use case)
- ❌ CẤM: UI-level (click, nhập form, màn hình, giao diện)

VII. SCHEMA & JSON:
- Schema tuyệt đối bất biến: KHÔNG thêm field, KHÔNG thiếu field, ĐÚNG type
- JSON parse-safe: KHÔNG markdown, KHÔNG code fence, KHÔNG comment
- KHÔNG sinh id: id do hệ thống backend quản lý, prompt cấm tuyệt đối thêm id

VIII. CHẤT LƯỢNG NỘI DUNG:
- Mỗi use case phải tự đủ nghĩa (đọc riêng vẫn hiểu, không phụ thuộc ngữ cảnh ngoài)
- Có rule – trigger – exception hợp lý (không rỗng, không hình thức, phù hợp nghiệp vụ)
- KHÔNG sinh nội dung "cho đủ" (không filler text, không lặp cấu trúc máy móc)
- Mỗi use case phải đầy đủ thông tin (~400-500 tokens)

**CẤU TRÚC USE CASE** (SCHEMA TUYỆT ĐỐI BẤT BIẾN):
[
  {
    "name": "Tên use case (1 mục tiêu nghiệp vụ rõ ràng)",
    "role": { "id": "...", "name": "...", "description": "..." },
    "goal": "Mục tiêu nghiệp vụ rõ ràng, cụ thể",
    "reason": "Lý do tồn tại use case này",
    "tasks": ["Task deployable 1-3 ngày", "Task business logic", "KHÔNG phải UI-step"],
    "inputs": [...],
    "outputs": [...],
    "context": "Module/domain",
    "priority": "high|medium|low",
    "feedback": "...",
    "rules": ["Rule nghiệp vụ hợp lý", "KHÔNG rỗng, KHÔNG hình thức"],
    "triggers": ["Trigger nghiệp vụ", "KHÔNG phải 'click nút'"],
    "preconditions": [...],
    "postconditions": [...],
    "exceptions": ["Exception hợp lý", "KHÔNG rỗng"],
    "stakeholders": [...],
    "constraints": [...],
    "related_usecases": []
  }
]

**QUAN TRỌNG**:
- Chỉ trả về JSON array, không có markdown, không có code fence, không có comment
- Nếu đã hết nội dung để generate → trả về mảng rỗng [] NGAY LẬP TỨC
- KHÔNG thêm field "id" vào response
- Đảm bảo 1 Use Case = 1 mục tiêu nghiệp vụ, Task là business-level deployable
`
    },
    'en-US': {
        schemaDescription: (batchSize: number, offset: number) => ` **OBJECTIVE**: Convert text into software use cases in JSON format
 **SCOPE**: FOCUS ONLY on SOFTWARE functions - COMPLETELY REMOVE real-world paperwork procedures

 **BEHAVIORS TO AVOID**:
• "Officer signs paper documents" →  WRONG
• "Submit hard copy documents" →  WRONG  
• "Send paper official letters" →  WRONG
• "Click button", "Enter form", "Screen" →  WRONG (UI-level, not use case)

 **CORRECT SOFTWARE BEHAVIORS**:
• "System verifies digital signature" →  CORRECT
• "Upload electronic documents" →  CORRECT
• "Send notifications via system" →  CORRECT 

 **OUTPUT REQUIREMENTS**: 
• Return ONLY valid JSON array
• NO explanations, NO markdown, NO code fence, NO comments
• Immediately parseable with JSON.parse()
• DO NOT add fields outside schema, DO NOT miss required fields

🛠 **REQUIRED USE CASE STRUCTURE** (ABSOLUTELY IMMUTABLE SCHEMA):
Each use case MUST have the following fields (DO NOT include "_id", "project_id", "version_id", "audit" - system will auto-generate):
[
  {
    "type": "use_case",
    "level": "system",
    "status": "active",
    "name": "System Login",
    "description": "Allows users to authenticate and access the system according to granted permissions.",
    "actor": {
      "id": "role_1",
      "name": "System User",
      "description": "User with valid system account"
    },
    "goal": "Access the system with granted permissions",
    "business_reason": "Allow users to use permitted features after authentication",
    "context": {
      "module": "Authentication",
      "scope": "Web / Mobile",
      "system": "User Management System"
    },
    "priority": "high",
    "frequency": "high",
    "trigger": {
      "event": "User clicks Login button",
      "source": "UI"
    },
    "preconditions": [
      "User has valid account",
      "System is operational",
      "System has connection to authentication database"
    ],
    "main_flow": [
      {
        "step": 1,
        "actor": "User",
        "action": "Access login page",
        "expected_result": "Login page is displayed"
      },
      {
        "step": 2,
        "actor": "User",
        "action": "Enter username and password",
        "inputs": ["username", "password"],
        "expected_result": "Login information is sent to system"
      },
      {
        "step": 3,
        "actor": "System",
        "action": "Authenticate login information",
        "rules_applied": ["R1", "R2"],
        "expected_result": "Login information is valid"
      },
      {
        "step": 4,
        "actor": "System",
        "action": "Create login session and redirect user",
        "expected_result": "User is redirected to home page"
      }
    ],
    "alternative_flows": [
      {
        "id": "AF1",
        "at_step": 3,
        "condition": "Username or password is incorrect",
        "system_response": "Display login error message",
        "end_state": "Login Failed"
      },
      {
        "id": "AF2",
        "at_step": 3,
        "condition": "Account is locked",
        "system_response": "Display account locked message",
        "end_state": "Login Failed"
      }
    ],
    "exceptions": [
      {
        "id": "E1",
        "at_step": 2,
        "type": "Network",
        "description": "Network connection lost",
        "system_response": "Display connection error message"
      },
      {
        "id": "E2",
        "at_step": 3,
        "type": "System",
        "description": "Server error",
        "system_response": "Display system temporarily unavailable message"
      }
    ],
    "rules": [
      {
        "id": "R1",
        "description": "Username and password must be correct"
      },
      {
        "id": "R2",
        "description": "Account must not be locked"
      }
    ],
    "inputs": [
      {
        "name": "username",
        "type": "string",
        "required": true
      },
      {
        "name": "password",
        "type": "string",
        "required": true
      }
    ],
    "outputs": [
      {
        "name": "authentication_result",
        "type": "success | failure"
      },
      {
        "name": "error_message",
        "type": "string",
        "optional": true
      }
    ],
    "postconditions": [
      "User is logged into the system",
      "Login session (session/token) is created"
    ],
    "non_functional_constraints": [
      "Secure login information",
      "Do not store password in plaintext",
      "Multi-platform support"
    ],
    "stakeholders": [
      "User",
      "System administrator"
    ],
    "related_usecases": []
  }
]

 **STRICT PROCESSING RULES**:

I. SCOPE & CONTEXT:
• ONLY describe software behaviors, REMOVE paperwork operations, human behaviors outside system
• DO NOT infer beyond text - Text is the single source of truth
• DO NOT add new modules, DO NOT add business processes not mentioned
• DO NOT "enrich" requirements with external knowledge

II. USE CASE SEMANTIC:
• 1 Use Case = 1 BUSINESS GOAL only (clear goal)
• DO NOT contain multiple independent goals, DO NOT be vague/generic
• DO NOT generate 2 use cases with same goal (if different names but same meaning → conflict)
• Correct abstraction level: Use Case = System business (NOT UI-level)

III. TASK QUALITY:
• Task must be deployable (can be assigned to dev, 1-3 days duration)
• Task describes logic/business processing, NOT UI-step
• Task MUST NOT duplicate Use Case role (Task ≠ Use Case child, Task ≠ User journey)
• ❌ FORBIDDEN: "Click button", "Enter form", "Open screen" (UI-level)
• ✅ CORRECT: "Validate information", "Create record in database", "Send email" (Business logic)

IV. ACTOR (instead of ROLE):
• Actor ALWAYS complete object {id, name, description}
• Unclear actor → standard fallback: {"id": "user", "name": "System User", "description": "User using the system"}
• DO NOT create new roles if not in text
• Field name is "actor" (NOT "role")

V. ABSTRACTION LEVEL (NO LEVEL MIXING):
• Use Case = System business (business-level)
• Task = Business-level execution (deployable unit)
• Epic = Group of use cases in same domain (more abstract than use case)
• ❌ FORBIDDEN: UI-level (click, enter form, screen, interface)

VI. SCHEMA & JSON:
• Absolutely immutable schema: DO NOT add fields, DO NOT miss fields, CORRECT types
• JSON parse-safe: NO markdown, NO code fence, NO comments
• DO NOT generate id: id managed by backend system, prompt absolutely forbids adding id

VII. RELATED USE CASES:
• related_usecases only reference valid IDs (only use existing IDs)
• DO NOT create new IDs, DO NOT reference meaningless cycles
• Default to empty array [] (will be processed later)

VIII. CONTENT QUALITY:
• Each use case must be self-sufficient (readable alone, no external context dependency)
• Have valid rule – trigger – exception (not empty, not formal, business-appropriate)
• DO NOT generate "filler" content (no filler text, no mechanical structure repetition)

 **BATCH RULES** (⚠️ CRITICAL - MUST FOLLOW):
• ⚠️ MUST return EXACTLY ${batchSize} use cases in this batch (NOT less, NOT more)
• Start from use case number ${offset + 1}
• If remaining content allows → MUST generate exactly ${batchSize} use cases
• ONLY return [] if you have COMPLETELY exhausted ALL content from the document
• DO NOT stop early - continue analyzing until you have ${batchSize} use cases
• DO NOT repeat use cases from previous batches

 **FINAL CHECK**:
✓ NO manual real-world operations
✓ ONLY software interactions
✓ Role is complete object {id, name, description}
✓ All fields follow exact schema (no additions, no omissions)
✓ NO "id" field in response
✓ Related usecases as empty array [] (will be processed later)
✓ 1 Use Case = 1 clear business goal
✓ Task is business-level, deployable (not UI-step)
✓ No filler text, no mechanical structure repetition
:`,
        relatedUseCases: (simplified: any, incremental?: boolean) => `Here is a list of existing software use cases:\n${JSON.stringify(simplified, null, 2)}\n\n**RELATED USE CASES CRITERIA**:

I. ONLY REFERENCE VALID IDs:
- related_usecases[] must only reference use cases from the list above
- Format: Use the exact ID value from the "id" field in the list above (e.g., if id is "507f1f77bcf86cd799439011", use "507f1f77bcf86cd799439011")
- DO NOT create new IDs, DO NOT reference meaningless cycles
- If a use case has no relations, return an empty array []

II. INCREMENTAL MODE SAFE:
${incremental ? `- DO NOT delete or overwrite existing related_usecases
- Only add links between new and old use cases
- Keep all existing related_usecases intact` : `- Analyze and regenerate all related_usecases for all use cases
- Ensure only valid IDs from the list above are referenced`}

Your task:
${incremental ? `- DO NOT delete or overwrite existing related_usecases.\n- Only add links between new and old use cases.` : `- Analyze and regenerate all related_usecases for all use cases.`}

REQUIREMENTS:
- related_usecases[] must only reference use cases from the list above.
- Format: Use the exact ID value from the "id" field in the list above (e.g., if id is "507f1f77bcf86cd799439011", use "507f1f77bcf86cd799439011").
- If a use case has no relations, return an empty array [].
- Return the entire list of use cases with the 'related_usecases' field updated.
- Keep all other fields and structure of each use case unchanged.
- DO NOT create new IDs, DO NOT reference meaningless cycles.`,
        conflictCheck: (textA: string, textB: string) => `
You are a strict use case comparison engine.

Task: Decide if the following two use case descriptions represent the SAME business goal.

A: "${textA}"
B: "${textB}"

**CONFLICT & DEDUPLICATION CRITERIA**:

I. DUPLICATE = SAME GOAL:
- Return { "conflict": true } ONLY IF both descriptions describe THE SAME BUSINESS GOAL
- DO NOT base on keywords, DO NOT base on text similarity
- ONLY base on business meaning (same goal = duplicate)
- Even if wording differs or has minor typos (e.g., "Login" vs "Sign in" → same use case)

II. DO NOT MISGROUP:
- Return { "conflict": false } if they are TWO different functions,
  even if related (e.g., "Login" is DIFFERENT from "Register")
- Related use cases ≠ duplicate (Login ≠ Register, Order ≠ Payment)
- DO NOT assume words with partial similarity are same function
- Only consider duplicate if business meaning is completely same (same goal)

Rules:
1. They are the SAME (conflict = true) ONLY IF they describe the exact same user goal or functionality,
   even if the wording is slightly different (e.g., "Login" vs "Sign in").
2. They are DIFFERENT (conflict = false) if they serve different purposes (e.g., "Login" vs "Register").
3. Do NOT confuse related but distinct actions as the same.

Respond ONLY with JSON, no explanation:
{ "conflict": true }   // same meaning
{ "conflict": false }  // different meaning
`,
        groupConflicts: (useCasesJson: string) => `
You are an extremely accurate software requirements analyst.
Your task is to read the following list of use cases and GROUP the ones that are functional DUPLICATES.

LIST OF USE CASES:
${useCasesJson}

**CONFLICT & DEDUPLICATION CRITERIA**:

I. DUPLICATE = SAME GOAL:
- Two use cases are duplicates IF they describe THE SAME BUSINESS GOAL
- DO NOT base on keywords, DO NOT base on text similarity
- ONLY base on business meaning (same goal = duplicate)
- Regardless of wording (e.g., "Log into the system" and "Allow user to sign-in" are DUPLICATES)

II. DO NOT MISGROUP:
- Related but distinct functions are NOT duplicates
- Example: "Login" and "Register" are DIFFERENT (Login ≠ Register)
- Example: "Order" and "Payment" are DIFFERENT (Order ≠ Payment)
- Related use cases ≠ duplicate

RULES:
1. Two use cases are duplicates IF they describe THE SAME GOAL or THE SAME FUNCTIONALITY, regardless of wording.
   Example: "Log into the system" and "Allow user to sign-in" are DUPLICATES.
2. Related but distinct functions are NOT duplicates.
   Example: "Login" and "Register" are DIFFERENT.
3. Only group the use cases that have duplicates. Ignore unique use cases.

OUTPUT REQUIREMENTS:
- ONLY return a valid JSON array and NOTHING ELSE.
- Each element in the array should be a GROUP of 'id's of the duplicate use cases.
- Use the exact ID value from the "id" field in the use case list above.
- NO explanations, NO markdown.

Example output (using actual IDs from the list):
[
  ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  ["507f1f77bcf86cd799439014", "507f1f77bcf86cd799439015"]
]
`,
        estimateUseCasesCount: (text: string) => {
            const textLength = text?.length || 0;
            const isShortText = textLength < 100;

            return `
You are a software requirements analysis expert with accurate estimation capabilities.

TASK: Read the entire text below and estimate the number of use cases that will be generated.

TEXT TO ANALYZE (${textLength} characters):
${text}

**STRICT ESTIMATION CRITERIA**:

I. SCOPE & CONTEXT:
- Text is the single source of truth
- DO NOT infer beyond text, DO NOT add new modules, DO NOT add business processes not mentioned
- DO NOT "enrich" requirements with external knowledge

II. ESTIMATE MUST MATCH DOMAIN:
- Website / E-commerce / CMS: ~3–6 use cases / module
- ERP / Core system: ~6–12 use cases / module
- Short text: only estimate directly related use cases

III. DO NOT INFLATE COUNT:
- DO NOT split use cases just to increase count
- DO NOT split UI-steps into use cases
- Estimate is a commitment, not a suggestion
- 1 Use Case = 1 business goal (do not split unreasonably)

IV. ESTIMATE ↔ GENERATE SYNC:
- Total generated use cases MUST NOT exceed estimated_count
- Last batch may be < batchSize
- If content exhausted → return [] immediately

${isShortText ? `
⚠️ IMPORTANT NOTE: This text is very short (only ${textLength} characters).
- If it's just a keyword or short phrase, only estimate DIRECTLY RELATED and MODERATE use cases
- Example: If text is "login", only estimate related use cases like: Login, Register, Forgot Password, Reset Password, Logout (approximately 3-10 use cases)
- DO NOT over-infer or estimate too many unrelated use cases
- Only estimate based on what is DIRECTLY mentioned in the text
- DO NOT inflate count by splitting use cases
` : `
ANALYSIS REQUIREMENTS:
- Analyze the entire text thoroughly
- Count the number of functions/modules/subsystems that can create use cases
- Estimate the number of use cases to be generated based on complexity and number of functions described in the text
- Apply domain criteria: Website/E-commerce (~3-6/module), ERP (~6-12/module)
- If text describes many detailed modules/functions, you can estimate more
- If text only describes a few basic functions, estimate moderately
- DO NOT split use cases just to increase count
- 1 Use Case = 1 business goal (do not split unreasonably)
`}

RETURN JSON:
{
  "estimated_count": ${isShortText ? '5' : '94'},
  "summary": "${isShortText ? 'System with basic functions mentioned in the text' : 'Management system with 5 main modules: User Management, Order Processing, Product Catalog, Payment Gateway, Report Generation'}",
  "estimated_batches": ${isShortText ? '1' : '2'},
  "reasoning": "${isShortText ? 'Short text, only estimating directly related use cases' : 'Based on the number of functions and complexity, estimated to generate approximately 94 usecases, divided into multiple batches (50 usecases/batch)'}"
}

IMPORTANT:
- Return ONLY JSON, no markdown, no code fence
- estimated_count must be a positive integer and APPROPRIATE for the length and content of the text
- Apply domain criteria: Website/E-commerce (~3-6/module), ERP (~6-12/module)
- If text is short (< 100 characters): estimated_count should be 3-15 use cases
- If text is medium (100-500 characters): estimated_count should be 10-50 use cases
- If text is long (> 500 characters): can estimate more based on content
- estimated_batches = Math.ceil(estimated_count / 50)
- summary must be concise, describing the system overview BASED ON ACTUAL CONTENT of the text
- DO NOT over-infer, only estimate what is mentioned or DIRECTLY related in the text
- DO NOT inflate count by splitting use cases
- Estimate is a commitment: total generated use cases MUST NOT exceed estimated_count
`;
        },
        generateBatchUseCases: (text: string, batchNumber: number, totalBatches: number, offset: number, batchSize: number, estimatedTotal?: number) => ` **OBJECTIVE**: Generate use cases from text in batches

**ORIGINAL TEXT** (SINGLE SOURCE OF TRUTH):
${text}

**BATCH INFORMATION**:
- Batch number: ${batchNumber}/${totalBatches}
- Start from use case number: ${offset + 1}
- Number of use cases to generate in this batch: ${batchSize}
${estimatedTotal ? `- **TOTAL ESTIMATED USE CASES: ${estimatedTotal}** - DO NOT generate more than this!` : ''}

**STRICT REQUIREMENTS**:

I. SCOPE & CONTEXT:
- ONLY describe software behaviors, REMOVE paperwork operations, human behaviors outside system
- DO NOT infer beyond text - Text is the single source of truth
- DO NOT add new modules, DO NOT add business processes not mentioned
- DO NOT "enrich" requirements with external knowledge

II. ESTIMATE ↔ GENERATE SYNC:
- Generate exactly ${batchSize} use cases (or fewer if content is exhausted)
${estimatedTotal ? `- **IMPORTANT**: Total estimated use cases is ${estimatedTotal}. Currently generated ${offset} use cases. Only generate maximum ${estimatedTotal - offset} use cases in this batch.` : ''}
- Start from use case number ${offset + 1}
- DO NOT repeat use cases already generated in previous batches
- If content exhausted → return empty array [] IMMEDIATELY
${estimatedTotal ? `- **DO NOT over-infer or generate more than estimate (${estimatedTotal} use cases)**` : ''}

III. USE CASE SEMANTIC:
- 1 Use Case = 1 BUSINESS GOAL only (clear goal)
- DO NOT contain multiple independent goals, DO NOT be vague/generic
- DO NOT generate 2 use cases with same goal (if different names but same meaning → conflict)
- Correct abstraction level: Use Case = System business (NOT UI-level)

**CRUD OPERATIONS GROUPING RULE**:
- When there are CRUD operations (Create, Read, Update, Delete) for the SAME ENTITY → GROUP them into 1 management usecase
- Example: "Add project", "Delete project", "Update project", "View project" → GROUP into "Project Management (CRUD)"
- Example: "Create user", "Edit user", "Remove user", "List users" → GROUP into "User Management (CRUD)"
- Example: "Add order", "Update order", "Delete order", "View order" → GROUP into "Order Management (CRUD)"
- Tasks of management usecase will include CRUD operations: ["Create entity", "Read/View entity", "Update entity", "Delete entity"]
- Goal will be: "Manage [entity] with full CRUD operations"
- DO NOT split CRUD into multiple separate usecases for the same entity

IV. TASK QUALITY:
- Task must be deployable (can be assigned to dev, 1-3 days duration)
- Task describes logic/business processing, NOT UI-step
- Task MUST NOT duplicate Use Case role (Task ≠ Use Case child, Task ≠ User journey)
- ❌ FORBIDDEN: "Click button", "Enter form", "Open screen", "Access page" (UI-level)
- ✅ CORRECT: "Validate information", "Create record in database", "Send email", "Calculate price" (Business logic)

V. ACTOR (instead of ROLE):
- Actor ALWAYS complete object {id, name, description}
- Unclear actor → standard fallback: {"id": "user", "name": "System User", "description": "User using the system"}
- DO NOT create new roles if not in text
- Field name is "actor" (NOT "role")

VI. ABSTRACTION LEVEL (NO LEVEL MIXING):
- Use Case = System business (business-level)
- Task = Business-level execution (deployable unit)
- Epic = Group of use cases in same domain (more abstract than use case)
- ❌ FORBIDDEN: UI-level (click, enter form, screen, interface)

VII. SCHEMA & JSON:
- Absolutely immutable schema: DO NOT add fields, DO NOT miss fields, CORRECT types
- JSON parse-safe: NO markdown, NO code fence, NO comments
- DO NOT generate id: id managed by backend system, prompt absolutely forbids adding id

VIII. CONTENT QUALITY:
- Each use case must be self-sufficient (readable alone, no external context dependency)
- Have valid rule – trigger – exception (not empty, not formal, business-appropriate)
- DO NOT generate "filler" content (no filler text, no mechanical structure repetition)
- Each use case must have complete information (~400-500 tokens)

**USE CASE STRUCTURE** (ABSOLUTELY IMMUTABLE SCHEMA):
Each use case MUST follow the exact structure as in schemaDescription above, with fields:
- type: "use_case" (default)
- level: "system" | "module" | "component" (default "system")
- status: "active" (default)
- name: Use case name
- description: Detailed use case description
- actor: {id, name, description} (NOT "role")
- goal: Business goal
- business_reason: Business reason (NOT "reason")
- context: {module, scope, system}
- priority: "low" | "medium" | "high"
- frequency: "low" | "medium" | "high" (default "medium")
- trigger: {event, source}
- preconditions: [string array]
- main_flow: [{step, actor, action, expected_result, inputs?, rules_applied?}]
- alternative_flows: [{id, at_step, condition, system_response, end_state}]
- exceptions: [{id, at_step, type, description, system_response}]
- rules: [{id, description}]
- inputs: [{name, type, required}]
- outputs: [{name, type, optional?}]
- postconditions: [string array]
- non_functional_constraints: [string array] (NOT "constraints")
- stakeholders: [string array]
- related_usecases: [] (empty array, will be processed later)

**IMPORTANT**:
- Return ONLY JSON array, no markdown, no code fence, no comments
- If content exhausted → return empty array [] IMMEDIATELY
- DO NOT add "id" field to response
- Ensure 1 Use Case = 1 business goal, Task is business-level deployable
`
    }
};

export class GeminiService {
    private apiKeyService = new ApiKeyService();
    private llmService = new LLMService();;
    // config
    private readonly BATCH_SIZE = 20;
    private readonly MAX_BATCHES = 100;
    private readonly MAX_ATTEMPTS_PER_OFFSET = 3;
    private readonly MAX_TOTAL_USE_CASES = 500; // Giới hạn tổng số use case tối đa

    private cleanJsonString(text: string): string {
        if (!text || typeof text !== 'string') return '{}';

        let cleaned = text.trim();

        // Remove markdown code fences (```json ... ``` or ``` ... ```)
        const codeFencePattern = /```(?:json)?\s*([\s\S]*?)\s*```/g;
        const codeFenceMatch = codeFencePattern.exec(cleaned);
        if (codeFenceMatch) {
            cleaned = codeFenceMatch[1].trim();
        }

        // ✅ Remove common LLM suffixes/prefixes that break JSON
        // Remove \end{response}, \end{json}, etc.
        cleaned = cleaned.replace(/\\end\{[^}]*\}/gi, '');
        cleaned = cleaned.replace(/\\begin\{[^}]*\}/gi, '');
        // Remove trailing text after valid JSON (find last } or ])
        const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (lastBrace > 0) {
            cleaned = cleaned.substring(0, lastBrace + 1);
        }
        // Remove leading text before valid JSON (find first { or [)
        const firstBrace = Math.min(
            cleaned.indexOf('{') >= 0 ? cleaned.indexOf('{') : Infinity,
            cleaned.indexOf('[') >= 0 ? cleaned.indexOf('[') : Infinity
        );
        if (firstBrace !== Infinity && firstBrace > 0) {
            cleaned = cleaned.substring(firstBrace);
        }

        return cleaned.trim();
    }

    private tryParseWhole(text: string): any[] | null {
        try {
            const v = JSON.parse(text);
            if (Array.isArray(v)) return v;
            return [v];
        } catch {
            return null;
        }
    }

    private extractBalancedArray(text: string): { jsonText?: string; complete: boolean } {
        const start = text.indexOf("[");
        if (start === -1) return { complete: false };

        let depth = 0;
        for (let i = start; i < text.length; i++) {
            const ch = text[i];
            if (ch === "[") depth++;
            else if (ch === "]") {
                depth--;
                if (depth === 0) {
                    const slice = text.slice(start, i + 1);
                    return { jsonText: slice, complete: true };
                }
            }
        }
        const partial = text.slice(start);
        return { jsonText: partial, complete: false };
    }

    private tryParseNdjson(text: string): any[] | null {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const out: any[] = [];
        let success = false;
        for (const line of lines) {
            try {
                const v = JSON.parse(line);
                out.push(v);
                success = true;
            } catch {
                // skip non-json lines
            }
        }
        return success ? out : null;
    }

    /**
     * ✅ CẢI THIỆN: Parse JSON robust với xử lý tốt hơn cho response bị cắt
     * - Phát hiện response bị truncate
     * - Parse từng object riêng lẻ khi array bị cắt
     * - Repair JSON bị cắt
     */
    private safeJsonParseRobust(txt: string): { items: any[]; incomplete: boolean; isTruncated?: boolean } {
        if (!txt || txt.trim().length === 0) {
            return { items: [], incomplete: false, isTruncated: false };
        }

        // Chiến lược 1: Thử phân tích toàn bộ chuỗi dưới dạng JSON array/object
        const whole = this.tryParseWhole(txt);
        if (whole) {
            const filtered = this.filterValidUseCases(whole);
            // Chỉ trả về nếu lọc ra có kết quả, hoặc nếu chuỗi gốc là một mảng rỗng '[]'
            if (filtered.length > 0 || txt.trim() === '[]') {
                return { items: filtered, incomplete: false, isTruncated: false };
            }
        }

        // Chiến lược 2: Trích xuất một mảng JSON cân bằng (thường nằm trong markdown)
        const extracted = this.extractBalancedArray(txt);
        if (extracted.jsonText) {
            try {
                const parsed = JSON.parse(extracted.jsonText);
                const items = Array.isArray(parsed) ? parsed : [parsed];
                const filtered = this.filterValidUseCases(items);
                const isTruncated = !extracted.complete;
                if (isTruncated) {
                    console.warn(`⚠️ [safeJsonParseRobust] Phát hiện response bị cắt (incomplete array). Parse được ${filtered.length} items.`);
                }
                return { items: filtered, incomplete: !extracted.complete, isTruncated };
            } catch {
                // Nếu thất bại và chuỗi không hoàn chỉnh, thử thêm ký tự đóng mảng ']'
                if (!extracted.complete) {
                    try {
                        const attempt = JSON.parse(extracted.jsonText + "]");
                        const items = Array.isArray(attempt) ? attempt : [attempt];
                        const filtered = this.filterValidUseCases(items);
                        console.warn(`⚠️ [safeJsonParseRobust] Đã repair JSON bị cắt bằng cách thêm ']'. Parse được ${filtered.length} items.`);
                        return { items: filtered, incomplete: false, isTruncated: true };
                    } catch {
                        // Thất bại, thử parse từng object riêng lẻ
                        const partialItems = this.parsePartialArray(extracted.jsonText);
                        if (partialItems.length > 0) {
                            console.warn(`⚠️ [safeJsonParseRobust] Parse từng object riêng lẻ từ array bị cắt. Parse được ${partialItems.length} items.`);
                            return { items: partialItems, incomplete: true, isTruncated: true };
                        }
                    }
                }
            }
        }

        // Chiến lược 3: Thử phân tích dưới dạng JSON mỗi dòng (ndjson)
        const nd = this.tryParseNdjson(txt);
        if (nd) {
            const filtered = this.filterValidUseCases(nd);
            if (filtered.length > 0) {
                return { items: filtered, incomplete: false, isTruncated: false };
            }
        }

        // Chiến lược 4 (Fallback): Dùng regex để tìm tất cả các object JSON có thể có
        // ✅ CẢI THIỆN: Parse từng object riêng lẻ với balanced brackets
        const parsedObjs = this.parseIndividualObjects(txt);
        if (parsedObjs.length > 0) {
            const filtered = this.filterValidUseCases(parsedObjs);
            if (filtered.length > 0) {
                console.warn(`⚠️ [safeJsonParseRobust] Parse từng object riêng lẻ (fallback strategy). Parse được ${filtered.length} items.`);
                return { items: filtered, incomplete: true, isTruncated: true };
            }
        }

        // Nếu tất cả các chiến lược đều thất bại, trả về mảng rỗng
        return { items: [], incomplete: true, isTruncated: true };
    }

    /**
     * ✅ MỚI: Parse từng object riêng lẻ từ array bị cắt
     * Tìm tất cả các object JSON hoàn chỉnh trong text, kể cả khi array bị cắt
     */
    private parsePartialArray(text: string): any[] {
        const items: any[] = [];
        let currentPos = 0;
        const startPos = text.indexOf('[');
        if (startPos === -1) return items;

        // Tìm từng object trong array
        let depth = 0;
        let objStart = -1;
        let braceDepth = 0;

        for (let i = startPos + 1; i < text.length; i++) {
            const ch = text[i];

            if (ch === '{') {
                if (braceDepth === 0) {
                    objStart = i; // Bắt đầu object mới
                }
                braceDepth++;
            } else if (ch === '}') {
                braceDepth--;
                if (braceDepth === 0 && objStart !== -1) {
                    // Đã đóng object hoàn chỉnh
                    try {
                        const objText = text.slice(objStart, i + 1);
                        const parsed = JSON.parse(objText);
                        items.push(parsed);
                    } catch {
                        // Bỏ qua object không parse được
                    }
                    objStart = -1;
                }
            } else if (ch === '[') {
                depth++;
            } else if (ch === ']') {
                depth--;
                if (depth < 0) break; // Đã ra ngoài array
            }
        }

        return items;
    }

    /**
     * ✅ MỚI: Parse từng object JSON riêng lẻ với balanced brackets
     * Tìm tất cả các object JSON hoàn chỉnh trong text
     */
    private parseIndividualObjects(text: string): any[] {
        const items: any[] = [];
        let braceDepth = 0;
        let objStart = -1;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];

            if (ch === '{') {
                if (braceDepth === 0) {
                    objStart = i; // Bắt đầu object mới
                }
                braceDepth++;
            } else if (ch === '}') {
                braceDepth--;
                if (braceDepth === 0 && objStart !== -1) {
                    // Đã đóng object hoàn chỉnh
                    try {
                        const objText = text.slice(objStart, i + 1);
                        const parsed = JSON.parse(objText);
                        // Chỉ thêm nếu là object hợp lệ (có name hoặc goal)
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                            items.push(parsed);
                        }
                    } catch {
                        // Bỏ qua object không parse được
                    }
                    objStart = -1;
                }
            }
        }

        return items;
    }

    private filterValidUseCases(items: any[]): any[] {
        if (!Array.isArray(items)) return [];
        return items.filter(item =>
            item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            ((typeof item.name === 'string' && item.name.trim() !== '') ||
                (typeof item.goal === 'string' && item.goal.trim() !== ''))
        );
    }

    private safeJsonParse(txt: string): any[] {
        const result = this.safeJsonParseRobust(txt);
        if (!Array.isArray(result.items)) return [];

        return result.items
            .map((it: any) => {
                if (typeof it === "string") {
                    return { name: it };
                }
                // Normalize role field to match new schema
                if (it.role && typeof it.role === 'string') {
                    it.role = {
                        id: `role_${it.role.toLowerCase().replace(/\s+/g, '_')}`,
                        name: it.role
                    };
                } else if (it.role && typeof it.role === 'object' && !it.role.id) {
                    // Ensure role has id if it's already an object
                    it.role.id = `role_${it.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`;
                }
                // Bỏ field 'id' từ Gemini response và tạo _id mới
                if (it.id) {
                    delete it.id;
                }
                // Tạo _id nếu chưa có
                if (!it._id) {
                    it._id = new Types.ObjectId();
                }
                return it;
            })
            .filter(Boolean);
    }

    /**
     * ✅ MỚI: Build prompt đơn giản cho single call - yêu cầu trả về TẤT CẢ usecases
     */
    private buildPromptSimple(cleanText: string, language: string): string {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const schemaDescription = prompts[lang].schemaDescription(500, 0); // Large batch size, offset 0

        // Thêm instruction rõ ràng: trả về TẤT CẢ usecases
        const instruction = lang === 'vi-VN'
            ? `\n\n**QUAN TRỌNG**: Phân tích TOÀN BỘ văn bản và trả về TẤT CẢ use cases bạn tìm thấy. Không bỏ sót bất kỳ use case nào.`
            : `\n\n**IMPORTANT**: Analyze the ENTIRE text and return ALL use cases you find. Do not miss any use cases.`;

        return `${schemaDescription}${instruction}\n\nVăn bản nguồn (Source text):\n${cleanText}`;
    }

    private buildPrompt(cleanText: string, language: string, offset = 0, batchSize = 20): string {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const schemaDescription = prompts[lang].schemaDescription(batchSize, offset);

        // ✅ Validate và clean text trước khi build prompt (sync để không làm chậm)
        // Sử dụng require để tránh async trong sync function
        const textPreprocessor = require("../../../shared/textPreprocessor");
        const validation = textPreprocessor.validateTextForLLM(cleanText);

        if (!validation.isValid) {
            console.warn(`⚠️ Invalid text in buildPrompt (offset=${offset}):`, validation.warnings);
        }

        if (validation.warnings.length > 0 && offset % 10 === 0) {
            // Chỉ log warnings mỗi 10 batches để tránh spam log
            console.warn(`⚠️ Text warnings in buildPrompt (offset=${offset}):`, validation.warnings.slice(0, 2));
        }

        // Sử dụng cleaned text
        const safeText = validation.cleanedText;

        // Kiểm tra token limit (ước tính) - chỉ cảnh báo nếu quá lớn
        if (validation.estimatedTokens > 100000) {
            console.warn(`⚠️ Chunk quá lớn (${validation.estimatedTokens} tokens, offset=${offset}). Có thể LLM không đọc hết.`);
        }

        return `${schemaDescription}\n\nVăn bản nguồn (Source text):\n${safeText}`;
    }

    /**
     * ✅ MỚI: Normalize use cases từ parsed items
     */
    private normalizeUseCases(items: any[]): any[] {
        return items.map((it: any) => {
            if (typeof it === "string") return { name: it };

            // Normalize role
            if (it.role && typeof it.role === 'string') {
                it.role = {
                    id: `role_${it.role.toLowerCase().replace(/\s+/g, '_')}`,
                    name: it.role
                };
            } else if (it.role && typeof it.role === 'object' && !it.role.id) {
                it.role.id = `role_${it.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`;
            }

            // Remove id field (system will generate)
            if (it.id) {
                delete it.id;
            }

            // Generate _id if not exists
            if (!it._id) {
                it._id = new Types.ObjectId();
            }

            return it;
        }).filter(uc =>
            uc && typeof uc === 'object' &&
            ((uc.name && typeof uc.name === 'string' && uc.name.trim() !== '') ||
                (uc.goal && typeof uc.goal === 'string' && uc.goal.trim() !== ''))
        );
    }

    async addRelatedUseCases(
        useCases: any[],
        options: { incremental?: boolean } | undefined,
        language: string,
        userId?: string,
        projectId?: string
    ): Promise<any[]> {
        if (!useCases || useCases.length <= 1) {
            console.log("⏩ Skipping addRelatedUseCases: Not enough use cases.");
            return useCases;
        }

        const simplified = useCases.map((u) => ({ id: u._id ? String(u._id) : '', name: u.name, goal: u.goal }));
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const basePrompt = prompts[lang].relatedUseCases(simplified, options?.incremental);

        // ✅ Sử dụng LLMService để lấy model (ưu tiên model user đã chọn)
        const modelName = await this.llmService.getRecommendedModel(undefined, userId);

        try {
            console.log(`🔑 Calling LLM for addRelatedUseCases with model: ${modelName}${userId ? ` (user: ${userId})` : ''}`);

            const response = await this.llmService.callLLM({
                prompt: basePrompt,
                modelName: modelName,
                userId: userId,
                projectId: projectId,
                endpoint: 'addRelatedUseCases',
                isProductionFreeMode: true,
                forceModel: true // ✅ Force sử dụng model user đã chọn
            });

            let text: string = response.text || "[]";
            text = this.cleanJsonString(text);
            const parsed = this.safeJsonParse(text);

            if (Array.isArray(parsed)) {
                // Tạo mapping từ id (từ Gemini response) sang _id (trong useCases)
                const updated = useCases.map((u) => {
                    const uId = u._id ? String(u._id) : '';
                    // Tìm match theo _id hoặc id (nếu Gemini trả về id cũ)
                    const match = parsed.find((p: any) => {
                        const pId = p._id ? String(p._id) : (p.id || '');
                        return pId === uId;
                    });

                    if (match && Array.isArray(match.related_usecases)) {
                        // Map related_usecases từ id cũ (UC1) sang _id mới
                        const mappedRelated = match.related_usecases.map((refId: string) => {
                            // Nếu refId là format cũ (UC1, UC2), tìm trong parsed để lấy _id tương ứng
                            if (refId.match(/^UC\d+$/)) {
                                const refUseCase = parsed.find((p: any) => p.id === refId || p._tempOldId === refId);
                                if (refUseCase && refUseCase._id) {
                                    return String(refUseCase._id);
                                }
                                // Nếu không tìm thấy trong parsed, tìm trong useCases
                                // (trường hợp này ít xảy ra vì Gemini chỉ trả về related trong cùng batch)
                            }
                            // Nếu refId đã là _id, giữ nguyên
                            return refId;
                        }).filter(Boolean);

                        return { ...u, related_usecases: mappedRelated };
                    }
                    return u;
                });
                return updated;
            }
            return useCases;
        } catch (err: any) {
            console.error("❌ addRelatedUseCases error:", err);
            // Nếu lỗi, trả về useCases gốc (không có related_usecases)
            return useCases;
        }
    }

    /**
     * ✅ MỚI: Estimate số lượng usecases sẽ được generate
     */
    async estimateUseCasesCount(
        text: string,
        language: string = 'vi-VN',
        modelName?: string,
        userId?: string,
        projectId?: string
    ): Promise<{
        estimated_count: number;
        summary: string;
        estimated_batches: number;
        reasoning?: string;
    }> {
        const textLength = text?.length ?? 0;
        console.log(`📊 [ESTIMATE] Estimating use cases count. Text length: ${textLength} chars`);

        // ✅ FIX: Tính toán max allowed dựa trên text length để validate sau
        let maxAllowed = 100; // Default max
        if (textLength < 50) {
            maxAllowed = 10;
        } else if (textLength < 100) {
            maxAllowed = 20;
        } else if (textLength < 500) {
            maxAllowed = 50;
        } else if (textLength < 2000) {
            maxAllowed = 100;
        }
        // Text rất dài (> 2000 chars): không giới hạn (maxAllowed = 100, nhưng có thể cao hơn)

        // ✅ Sử dụng LLMService để lấy model (ưu tiên model user đã chọn)
        const effectiveModelName = modelName || await this.llmService.getRecommendedModel(undefined, userId);

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].estimateUseCasesCount(text);

        try {
            console.log(`🔑 Calling LLM for estimateUseCasesCount with model: ${effectiveModelName}${userId ? ` (user: ${userId})` : ''}`);

            const response = await this.llmService.callLLM({
                prompt: prompt,
                modelName: effectiveModelName,
                userId: userId,
                projectId: projectId,
                endpoint: 'estimateUseCasesCount',
                isProductionFreeMode: true,
                forceModel: !!modelName // ✅ Nếu có modelName được chỉ định, force sử dụng nó
            });

            let text: string = response.text || "{}";

            // ✅ Kiểm tra nếu response rỗng hoặc không hợp lệ
            if (!text || text.trim().length === 0 || text.trim() === '{}') {
                console.error(`❌ [ESTIMATE] Empty or invalid response from LLM`);
                console.error(`   Model: ${effectiveModelName}`);
                console.error(`   Response text: "${text}"`);
                throw new Error(`LLM returned empty or invalid response. The model "${effectiveModelName}" may not be working correctly. Please try a different model.`);
            }

            // Log raw response for debugging
            console.log(`🔍 [ESTIMATE] Raw response (first 500 chars): ${text.substring(0, 500)}`);

            text = this.cleanJsonString(text);

            // ✅ Kiểm tra lại sau khi clean
            if (!text || text.trim().length === 0 || text.trim() === '{}') {
                console.error(`❌ [ESTIMATE] Response is still empty after cleaning`);
                throw new Error(`LLM returned empty response after cleaning. The model "${effectiveModelName}" may not be working correctly.`);
            }

            // Try to parse as JSON object (not array)
            let parsed: any = null;
            try {
                parsed = JSON.parse(text);
            } catch (parseError: any) {
                // Try to extract JSON object from text if it's wrapped in markdown or has extra text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        parsed = JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        console.error(`❌ [ESTIMATE] Failed to parse JSON: ${parseError.message}`);
                        console.error(`❌ [ESTIMATE] Cleaned text: ${text.substring(0, 1000)}`);
                        throw new Error(`Invalid JSON format: ${parseError.message}`);
                    }
                } else {
                    console.error(`❌ [ESTIMATE] No JSON object found in response`);
                    console.error(`❌ [ESTIMATE] Cleaned text: ${text.substring(0, 1000)}`);
                    throw new Error("No JSON object found in response");
                }
            }

            // Validate parsed object
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const estimate = parsed as any;

                // ✅ Kiểm tra nếu parsed object rỗng
                if (Object.keys(estimate).length === 0) {
                    console.error(`❌ [ESTIMATE] Parsed object is empty:`, estimate);
                    throw new Error(`LLM returned empty JSON object. The model "${effectiveModelName}" may not be working correctly. Please try a different model.`);
                }

                // Validate required fields
                if (typeof estimate.estimated_count !== 'number' || estimate.estimated_count < 1) {
                    console.error(`❌ [ESTIMATE] Invalid estimated_count: ${estimate.estimated_count}`);
                    console.error(`❌ [ESTIMATE] Full parsed object:`, JSON.stringify(estimate, null, 2));
                    throw new Error(`Invalid estimated_count: must be a positive number, got ${estimate.estimated_count}. The model "${effectiveModelName}" may not be following the prompt format correctly.`);
                }

                let estimated_count = Math.max(1, Math.floor(estimate.estimated_count || 1));

                // ✅ FIX: Giới hạn estimate dựa trên độ dài text input
                // maxAllowed đã được tính ở trên dựa trên textLength
                if (estimated_count > maxAllowed) {
                    console.warn(`⚠️ [ESTIMATE] LLM estimated ${estimated_count} use cases, but text length (${textLength} chars) suggests max ${maxAllowed}. Adjusting to ${maxAllowed}.`);
                    estimated_count = maxAllowed;
                }

                const estimated_batches = Math.ceil(estimated_count / 15);

                console.log(`✅ [ESTIMATE] Estimated ${estimated_count} use cases (from ${textLength} chars text), ${estimated_batches} batches`);

                return {
                    estimated_count,
                    summary: estimate.summary || 'System analysis',
                    estimated_batches,
                    reasoning: estimate.reasoning
                };
            }

            console.error(`❌ [ESTIMATE] Parsed result is not a valid object. Type: ${typeof parsed}, IsArray: ${Array.isArray(parsed)}`);
            console.error(`❌ [ESTIMATE] Parsed value: ${JSON.stringify(parsed).substring(0, 500)}`);
            throw new Error("Invalid estimate response format: expected JSON object, got " + (Array.isArray(parsed) ? "array" : typeof parsed));
        } catch (err: any) {
            console.error(`❌ [ESTIMATE] LLM call failed:`, err?.message || err);
            throw err;
        }
    }

    /**
     * ✅ MỚI: Generate usecases theo batch
     */
    async generateUseCasesBatch(
        text: string,
        batchNumber: number,
        totalBatches: number,
        offset: number,
        batchSize: number = 15,
        language: string = 'vi-VN',
        modelName?: string,
        userId?: string,
        projectId?: string,
        estimatedTotal?: number
    ): Promise<any[]> {
        console.log(`📦 [BATCH ${batchNumber}/${totalBatches}] Generating use cases ${offset + 1} to ${offset + batchSize}${estimatedTotal ? ` (estimated total: ${estimatedTotal})` : ''}`);

        // ✅ Sử dụng LLMService để lấy model (ưu tiên model user đã chọn)
        const effectiveModelName = modelName || await this.llmService.getRecommendedModel(undefined, userId);

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].generateBatchUseCases(text, batchNumber, totalBatches, offset, batchSize, estimatedTotal);

        try {
            console.log(`🔑 Calling LLM for generateUseCasesBatch with model: ${effectiveModelName}${userId ? ` (user: ${userId})` : ''}`);

            const response = await this.llmService.callLLM({
                prompt: prompt,
                modelName: effectiveModelName,
                userId: userId,
                projectId: projectId,
                endpoint: 'generateUseCasesBatch',
                isProductionFreeMode: true,
                forceModel: !!modelName // ✅ Nếu có modelName được chỉ định, force sử dụng nó
            });

            let responseText: string = response.text || "[]";
            responseText = this.cleanJsonString(responseText);

            const parsed = this.safeJsonParseRobust(responseText);
            let useCases = parsed.items || [];

            if (useCases.length === 0) {
                console.log(`⏩ [BATCH ${batchNumber}/${totalBatches}] No more use cases to generate`);
                return [];
            }

            // ✅ FIX: Giới hạn số lượng use cases dựa trên estimate
            if (estimatedTotal && estimatedTotal > 0) {
                const maxAllowed = estimatedTotal - offset;
                if (useCases.length > maxAllowed) {
                    console.warn(`⚠️ [BATCH ${batchNumber}/${totalBatches}] LLM generated ${useCases.length} use cases, but estimate (${estimatedTotal}) allows only ${maxAllowed} (offset: ${offset}). Limiting to ${maxAllowed}.`);
                    useCases = useCases.slice(0, maxAllowed);
                }
            }

            const normalized = this.normalizeUseCases(useCases);
            console.log(`✅ [BATCH ${batchNumber}/${totalBatches}] Generated ${normalized.length} use cases${estimatedTotal ? ` (estimated total: ${estimatedTotal}, remaining: ${estimatedTotal - offset - normalized.length})` : ''}`);

            return normalized;
        } catch (err: any) {
            console.error(`❌ [BATCH ${batchNumber}/${totalBatches}] LLM call failed:`, err?.message || err);
            throw err;
        }
    }

    /**
     * ✅ REFACTORED: Phân tích requirements với logic đơn giản hơn
     * - Text nhỏ (< 80% context window): Single call, trả về TẤT CẢ usecases
     * - Text lớn: Đã được chunk ở RequirementService, mỗi chunk gọi 1 lần
     * ⚠️ DEPRECATED: Sẽ được thay thế bởi estimateUseCasesCount + generateUseCasesBatch
     */
    async analyzeRequirements(
        cleanText: string,
        language: string,
        userId?: string,
        projectId?: string,
        chunkIndex?: number,
        totalChunks?: number
    ): Promise<any[]> {
        const chunkLabel = chunkIndex ? `[Chunk ${chunkIndex}${totalChunks ? `/${totalChunks}` : ''}]` : '';
        console.log(`${chunkLabel} Analyzing text with LLM (lang: ${language}). Text length: ${cleanText?.length ?? 0}`);

        // ✅ Sử dụng LLMService để lấy model (ưu tiên model user đã chọn)
        const { getModelConfig, estimateTokens, determineStrategy } = await import("../../../shared/tokenManager");
        const modelName = await this.llmService.getRecommendedModel(undefined, userId);
        const modelConfig = getModelConfig(modelName, undefined);
        const estimatedTokens = estimateTokens(cleanText, modelConfig);
        const strategy = determineStrategy(cleanText, modelConfig);

        console.log(`${chunkLabel} 📊 Token Analysis: ${estimatedTokens.toLocaleString()} tokens, Context Window: ${modelConfig.contextWindow.toLocaleString()}, Strategy: ${strategy.strategy}, Provider: ${modelConfig.provider}, Model: ${modelName}`);

        // ✅ QUAN TRỌNG: Nếu text vừa với context window (< 80%) → single call, không batch
        const contextThreshold = modelConfig.contextWindow * 0.8; // 80% để reserve cho prompt và output
        const useSimpleStrategy = estimatedTokens < contextThreshold && !strategy.needsChunking;

        if (useSimpleStrategy) {
            console.log(`${chunkLabel} ✅ Text nhỏ (${estimatedTokens.toLocaleString()} < ${Math.floor(contextThreshold).toLocaleString()} tokens). Sử dụng single call strategy.`);
            return await this.analyzeRequirementsSingleCall(cleanText, language, modelName, modelConfig, userId, projectId, chunkLabel);
        } else {
            // Text lớn hoặc đã được chunk → sử dụng batch strategy (giữ logic cũ nhưng tối ưu)
            console.log(`${chunkLabel} 📦 Text lớn hoặc đã chunk. Sử dụng batch strategy.`);
            return await this.analyzeRequirementsBatch(cleanText, language, modelName, modelConfig, userId, projectId, chunkLabel);
        }
    }

    /**
     * ✅ MỚI: Single call strategy - gọi 1 lần, trả về TẤT CẢ usecases
     * Dùng cho text nhỏ vừa với context window
     */
    private async analyzeRequirementsSingleCall(
        cleanText: string,
        language: string,
        modelName: string,
        modelConfig: any,
        userId?: string,
        projectId?: string,
        chunkLabel?: string
    ): Promise<any[]> {
        const prompt = this.buildPromptSimple(cleanText, language);

        try {
            console.log(`${chunkLabel} 🔑 Calling LLM with model: ${modelName} (single call)`);

            const response = await this.llmService.callLLM({
                prompt: prompt,
                modelName: modelName,
                userId: userId,
                projectId: projectId,
                endpoint: 'analyzeRequirements',
                isProductionFreeMode: true,
                forceModel: true // ✅ Force sử dụng model user đã chọn
            });

            let text: string = response.text || "";
            text = this.cleanJsonString(text);
            console.log(`${chunkLabel} 🤖 LLM response length: ${text.length} (single call)`);

            // Parse và normalize
            const parsed = this.safeJsonParseRobust(text);

            // ✅ CẢI THIỆN: Log chi tiết về truncation trong single call
            if (parsed.isTruncated) {
                console.warn(`${chunkLabel} ⚠️ PHÁT HIỆN RESPONSE BỊ CẮT trong single call! Parse được ${parsed.items.length} items từ response dài ${text.length} chars.`);
                console.warn(`${chunkLabel} ⚠️ Response preview (last 500 chars): ${text.slice(-500)}`);
                console.warn(`${chunkLabel} ⚠️ LƯU Ý: Single call strategy không thể retry. Có thể cần chuyển sang batch strategy cho text lớn.`);
            }

            if (parsed.items.length === 0) {
                console.log(`${chunkLabel} ✅ No use cases found in response.`);
                return [];
            }

            const normalizeStartTime = Date.now();
            const normalized = this.normalizeUseCases(parsed.items);
            const normalizeTime = Date.now() - normalizeStartTime;
            console.log(`${chunkLabel} ✅ Parsed ${normalized.length} use cases from single call (normalize took ${normalizeTime}ms, truncated=${parsed.isTruncated || false}).`);

            // ✅ QUAN TRỌNG: Return ngay sau khi parse xong để tránh timeout
            // ⚠️ Nếu response bị cắt, có thể cần chuyển sang batch strategy
            return normalized;

        } catch (err: any) {
            console.error(`${chunkLabel} ❌ LLM call failed:`, err?.message || err);
            throw err;
        }
    }

    /**
     * Batch strategy - giữ logic cũ nhưng tối ưu
     * Dùng cho text lớn hoặc đã được chunk
     */
    private async analyzeRequirementsBatch(
        cleanText: string,
        language: string,
        modelName: string,
        modelConfig: any,
        userId?: string,
        projectId?: string,
        chunkLabel?: string
    ): Promise<any[]> {
        let allResults: any[] = [];
        let offset = 0;
        let batchCount = 0;
        let lastError: any = null;
        let consecutiveEmptyBatches = 0;
        let lastOffset = 0;

        while (batchCount < this.MAX_BATCHES) {
            batchCount++;
            let gotBatch = false;
            let attemptsForThisOffset = 0;

            if (allResults.length >= this.MAX_TOTAL_USE_CASES) {
                console.warn(`${chunkLabel} ⚠️ Đã đạt giới hạn tối đa ${this.MAX_TOTAL_USE_CASES} use case. Dừng xử lý.`);
                return allResults.slice(0, this.MAX_TOTAL_USE_CASES);
            }

            // Thử gọi LLM với retry logic
            while (attemptsForThisOffset < this.MAX_ATTEMPTS_PER_OFFSET) {
                attemptsForThisOffset++;
                const startTime = Date.now();
                try {
                    console.log(`${chunkLabel} 🔑 Calling LLM with model: ${modelName} (offset=${offset}, batch=${batchCount}, attempt=${attemptsForThisOffset})`);

                    const prompt = this.buildPrompt(cleanText, language, offset, this.BATCH_SIZE);

                    const response = await this.llmService.callLLM({
                        prompt: prompt,
                        modelName: modelName,
                        userId: userId,
                        projectId: projectId,
                        endpoint: 'analyzeRequirements',
                        isProductionFreeMode: true,
                        forceModel: true // ✅ Force sử dụng model user đã chọn
                    });

                    let text: string = response.text || "";
                    text = this.cleanJsonString(text);
                    console.log(`${chunkLabel} 🤖 Gemini response length: ${text.length}, offset=${offset}, batch=${batchCount}`);

                    // Kiểm tra sớm nếu response là mảng rỗng
                    if (text.trim() === "[]" || text.trim().length === 0) {
                        console.log(`✅ Gemini trả về mảng rỗng. Đã xử lý xong. Tổng: ${allResults.length} use case`);
                        return allResults;
                    }

                    const parsed = this.safeJsonParseRobust(text);

                    // ✅ CẢI THIỆN: Log chi tiết về truncation
                    if (parsed.isTruncated) {
                        console.warn(`${chunkLabel} ⚠️ PHÁT HIỆN RESPONSE BỊ CẮT! Parse được ${parsed.items.length} items từ response dài ${text.length} chars.`);
                        console.warn(`${chunkLabel} ⚠️ Response preview (last 500 chars): ${text.slice(-500)}`);
                    }

                    if (parsed.items.length > 0) {
                        const normalized = parsed.items.map((it: any) => {
                            if (typeof it === "string") return { name: it };
                            // Normalize role to match new schema
                            if (it.role && typeof it.role === 'string') {
                                it.role = {
                                    id: `role_${it.role.toLowerCase().replace(/\s+/g, '_')}`,
                                    name: it.role
                                };
                            } else if (it.role && typeof it.role === 'object' && !it.role.id) {
                                // Ensure role has id if it's already an object
                                it.role.id = `role_${it.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`;
                            }
                            // Bỏ field 'id' từ Gemini response và tạo _id mới
                            const tempId = it.id; // Lưu tạm id từ Gemini để xử lý related_usecases sau
                            if (it.id) {
                                delete it.id;
                            }
                            // Tạo _id nếu chưa có
                            if (!it._id) {
                                it._id = new Types.ObjectId();
                            }
                            // Lưu mapping từ id cũ sang _id mới để xử lý related_usecases
                            if (tempId) {
                                it._tempOldId = tempId;
                            }
                            return it;
                        });

                        // Xử lý related_usecases: map từ id cũ (UC1, UC2) sang _id mới
                        const idToNewIdMap = new Map<string, string>();
                        normalized.forEach((uc: any) => {
                            if (uc._tempOldId && uc._id) {
                                idToNewIdMap.set(uc._tempOldId, String(uc._id));
                            }
                        });

                        // Cập nhật related_usecases trong normalized array
                        normalized.forEach((uc: any) => {
                            if (Array.isArray(uc.related_usecases) && uc.related_usecases.length > 0) {
                                uc.related_usecases = uc.related_usecases
                                    .map((oldId: string) => idToNewIdMap.get(oldId) || oldId)
                                    .filter((newId: string) => idToNewIdMap.has(newId) || normalized.some((x: any) => String(x._id) === newId));
                            }
                            // Xóa temp field
                            delete uc._tempOldId;
                        });

                        // Lọc lại để đảm bảo chỉ có use case hợp lệ (có name hoặc goal)
                        const validNormalized = normalized.filter(uc =>
                            uc && typeof uc === 'object' &&
                            ((uc.name && typeof uc.name === 'string' && uc.name.trim() !== '') ||
                                (uc.goal && typeof uc.goal === 'string' && uc.goal.trim() !== ''))
                        );

                        // Nếu không có items hợp lệ từ response, log warning và xử lý
                        if (validNormalized.length === 0) {
                            console.warn(`⚠️ Response không chứa use case hợp lệ nào sau khi filter. Parsed items: ${parsed.items.length}, Normalized: ${normalized.length}, Response length: ${text.length}`);
                            // Không cập nhật offset nếu không có items
                            // Nhưng vẫn break để thử batch tiếp theo hoặc dừng nếu đã hết
                            if (!parsed.incomplete) {
                                // Response hoàn chỉnh nhưng không có items → có thể đã hết
                                console.log(`✅ Response hoàn chỉnh nhưng không có use case hợp lệ. Có thể đã phân tích hết.`);
                                return allResults;
                            }
                            break; // Thử batch tiếp theo hoặc key tiếp theo
                        }

                        // Kiểm tra nếu offset không tăng (có thể Gemini đang lặp lại)
                        // CHỈ kiểm tra sau batch đầu tiên (khi lastOffset đã được set từ batch trước)
                        // Và CHỈ khi có items hợp lệ (validNormalized.length > 0)
                        if (lastOffset !== 0 && offset === lastOffset && validNormalized.length > 0) {
                            console.warn(`⚠️ Phát hiện offset không tăng (${offset}). Có thể Gemini đang lặp lại. Dừng xử lý.`);
                            return allResults;
                        }

                        allResults = allResults.concat(validNormalized);
                        console.log(`${chunkLabel} ✅ Parsed ${validNormalized.length} valid items from ${parsed.items.length} parsed items (incomplete=${parsed.incomplete}, truncated=${parsed.isTruncated || false}). total=${allResults.length}, offset=${offset} → ${offset + validNormalized.length}`);

                        lastOffset = offset;
                        offset += validNormalized.length;
                        gotBatch = true;
                        consecutiveEmptyBatches = 0; // Reset counter khi có items mới

                        // Kiểm tra giới hạn tổng số use case sau khi thêm
                        if (allResults.length >= this.MAX_TOTAL_USE_CASES) {
                            console.warn(`⚠️ Đã đạt giới hạn tối đa ${this.MAX_TOTAL_USE_CASES} use case. Dừng xử lý.`);
                            return allResults.slice(0, this.MAX_TOTAL_USE_CASES);
                        }

                        // ✅ CẢI THIỆN: Xử lý response bị cắt
                        if (parsed.isTruncated) {
                            console.warn(`${chunkLabel} ⚠️ Response bị cắt nhưng đã parse được ${validNormalized.length} items. Tiếp tục batch tiếp theo để lấy phần còn lại.`);
                            // Không dừng, tiếp tục batch tiếp theo với offset mới
                            // Có thể retry với chunk nhỏ hơn nếu cần
                            break;
                        }

                        // Dừng nếu response hoàn chỉnh và số lượng < BATCH_SIZE (đã hết use case)
                        if (!parsed.incomplete && validNormalized.length < this.BATCH_SIZE) {
                            console.log(`✅ Response hoàn chỉnh và số lượng (${validNormalized.length}) < BATCH_SIZE (${this.BATCH_SIZE}). Đã xử lý xong.`);
                            return allResults;
                        } else {
                            break;
                        }
                    } else {
                        // Không có items hợp lệ từ response
                        consecutiveEmptyBatches++;
                        console.warn(`⚠️ No parsable items from LLM. Response preview: ${text.slice(0, 200)}`);

                        // Nếu có 2 batch liên tiếp không có items → dừng
                        if (consecutiveEmptyBatches >= 2) {
                            console.warn(`⚠️ Có ${consecutiveEmptyBatches} batch liên tiếp không có items. Dừng xử lý.`);
                            return allResults;
                        }

                        if (text.trim() === "[]" || text.trim().length === 0) {
                            console.log(`✅ Response rỗng. Đã xử lý xong. Tổng: ${allResults.length} use case`);
                            return allResults;
                        }
                        lastError = new Error("No parsable items");
                        break; // Thử lại với attempt tiếp theo
                    }
                } catch (err: any) {
                    const responseTime = Date.now() - startTime;
                    lastError = err;

                    console.error(`${chunkLabel} ❌ LLM call failed (attempt ${attemptsForThisOffset}):`, err?.message || err);

                    // Nếu đã thử hết attempts cho offset này, break để thử offset tiếp theo hoặc dừng
                    if (attemptsForThisOffset >= this.MAX_ATTEMPTS_PER_OFFSET) {
                        console.warn(`${chunkLabel} ⚠️ Đã thử hết ${this.MAX_ATTEMPTS_PER_OFFSET} attempts cho offset ${offset}.`);
                        break;
                    }
                    // Tiếp tục thử lại
                    continue;
                }
            } // end while attempts

            if (!gotBatch) {
                consecutiveEmptyBatches++;
                console.warn(`${chunkLabel} ⚠️ Could not fetch a valid batch for current offset. Consecutive empty batches: ${consecutiveEmptyBatches}`);

                // Nếu có 2 batch liên tiếp không lấy được data → dừng
                if (consecutiveEmptyBatches >= 2) {
                    console.warn(`${chunkLabel} ⚠️ Có ${consecutiveEmptyBatches} batch liên tiếp không lấy được data. Dừng xử lý.`);
                    break;
                }
            } else {
                consecutiveEmptyBatches = 0; // Reset counter khi có batch thành công
            }
        } // end while

        console.log(`${chunkLabel} 📊 Kết thúc vòng lặp. Tổng số use case: ${allResults.length}, batch count: ${batchCount}`);

        // ✅ QUAN TRỌNG: Nếu có partial results, luôn return chúng thay vì throw error
        // Điều này đảm bảo dữ liệu đã generate được không bị mất
        if (allResults.length > 0) {
            if (lastError) {
                // Có lỗi nhưng đã có partial results → log warning nhưng vẫn return
                const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(lastError);
                console.warn(`${chunkLabel} ⚠️ Có lỗi trong quá trình generate (${errorInfo.type}), nhưng đã có ${allResults.length} use cases. Trả về partial results.`);
            }
            return allResults;
        }

        // Chỉ throw error khi KHÔNG có partial results nào
        if (lastError) {
            const { ApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
            throw new ApiKeyError(lastError, 'vi');
        }

        throw new Error("All Gemini API keys failed or no parsable output");
    }

    async checkConflictWithGemini(textA: string, textB: string, language: string, userId?: string, projectId?: string): Promise<boolean> {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].conflictCheck(textA, textB);

        // ✅ Sử dụng LLMService để lấy model (ưu tiên model user đã chọn)
        const modelName = await this.llmService.getRecommendedModel(undefined, userId);

        try {
            console.log(`🔑 Calling LLM for checkConflict with model: ${modelName}${userId ? ` (user: ${userId})` : ''}`);

            const response = await this.llmService.callLLM({
                prompt: prompt,
                modelName: modelName,
                userId: userId,
                projectId: projectId,
                endpoint: 'checkConflict',
                isProductionFreeMode: true,
                forceModel: true // ✅ Force sử dụng model user đã chọn
            });

            let text: string = response.text || "{}";
            text = this.cleanJsonString(text);

            // Debug log
            console.log("🔎 LLM conflict check raw response:", text);

            const parsed = JSON.parse(text.trim());

            if (typeof parsed.conflict === "boolean") {
                console.log(
                    `✅ LLM conflict decision: ${parsed.conflict ? "CONFLICT" : "NO CONFLICT"} | A="${textA}" | B="${textB}"`
                );
                return parsed.conflict;
            } else {
                console.warn("⚠️ LLM did not return a valid { conflict: boolean } object:", text);
                return false; // Default to no conflict if invalid response
            }
        } catch (err: any) {
            console.error("❌ LLM checkConflict error:", err);
            throw err;
        }
    }

    // --- HÀM MỚI: Gọi LLM để tìm các nhóm ID xung đột ---
    async findConflictGroups(useCases: any[], language: string, userId?: string, projectId?: string): Promise<string[][]> {
        if (!useCases || useCases.length < 2) {
            return [];
        }

        const simplifiedUseCases = useCases.map(uc => ({
            id: uc._id ? String(uc._id) : '',
            name: uc.name,
            goal: uc.goal
        }));

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].groupConflicts(JSON.stringify(simplifiedUseCases, null, 2));

        // ✅ Sử dụng LLMService để lấy model (ưu tiên model user đã chọn)
        const modelName = await this.llmService.getRecommendedModel(undefined, userId);

        try {
            console.log(`🔑 Calling LLM for findConflictGroups with model: ${modelName}${userId ? ` (user: ${userId})` : ''}`);

            const response = await this.llmService.callLLM({
                prompt: prompt,
                modelName: modelName,
                userId: userId,
                projectId: projectId,
                endpoint: 'findConflictGroups',
                isProductionFreeMode: true,
                forceModel: true // ✅ Force sử dụng model user đã chọn
            });

            let text: string = response.text || "[]";
            text = this.cleanJsonString(text);
            const parsed = JSON.parse(text.trim());

            if (Array.isArray(parsed) && (parsed.length === 0 || Array.isArray(parsed[0]))) {
                console.log(`✅ LLM found ${parsed.length} conflict groups.`);
                return parsed;
            } else {
                console.warn("⚠️ LLM did not return a valid array of arrays:", text);
                return [];
            }
        } catch (err: any) {
            console.error("❌ LLM findConflictGroups error:", err);
            throw err;
        }
    }
}