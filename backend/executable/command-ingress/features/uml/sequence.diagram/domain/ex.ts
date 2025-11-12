// SequenceDiagramGeminiService.ts

type PromptEntry = {
  diagramDesign: (useCaseContextJson: string) => string;
};

// <-- THAY ĐỔI: Prompts đã được cập nhật hoàn toàn
const sequenceDiagramPrompts: Record<string, PromptEntry> = {
  "vi-VN": {
    diagramDesign: (useCaseContextJson: string) => {
      return `
BẠN LÀ MỘT KỸ SƯ PHÂN TÍCH NGHIỆP VỤ (BUSINESS ANALYST) VÀ KIẾN TRÚC SƯ HỆ THỐNG.

Nhiệm vụ của bạn là phân tích ĐỐI TƯỢNG USE CASE sau đây (bao gồm 'role' và 'tasks') và tạo ra một cấu trúc JSON DUY NHẤT cho BIỂU ĐỒ TUẦN TỰ (Sequence Diagram).

ĐỐI TƯỢNG USE CASE CẦN VẼ:
${useCaseContextJson}

**QUAN TRỌNG:**
- Phản hồi của bạn BẮT BUỘC CHỈ LÀ một đối tượng JSON hợp lệ.
- KHÔNG bao gồm bất kỳ lời giải thích, bình luận, hay định dạng markdown nào như \`\`\`json.

Đối tượng JSON BẮT BUỘC phải tuân thủ nghiêm ngặt cấu trúc (dùng string) sau:

{
  "name": "Tên kịch bản (Lấy từ 'goal' hoặc 'name' của usecase)",
  "description": "Mô tả ngắn về kịch bản (tự động tạo)",
  "lifelines": [
    { "name": "Tên Actor (Lấy từ 'role')", "description": "Tác nhân chính" },
    { "name": ":Application", "description": "Giao diện/ứng dụng" },
    { "name": ":OrderService", "description": "Dịch vụ xử lý nghiệp vụ" },
    { "name": ":Database", "description": "Cơ sở dữ liệu" },
    { "name": ":PaymentGateway", "description": "Cổng thanh toán bên thứ ba" }
  ],
  "fragments": [
    { "key": "frag1", "type": "loop", "guard_condition": "For each item", "parent_key": null }
  ],
  "messages": [
    { 
      "order": 1,
      "source_lifeline_name": "Tên Actor (Lấy từ 'role')", 
      "target_lifeline_name": ":Application", 
      "type": "sync", 
      "content": "Nội dung bước 1 từ 'tasks'",
      "fragment_key": null
    },
    { 
      "order": 2,
      "source_lifeline_name": ":Application", 
      "target_lifeline_name": "Tên Actor (Lấy từ 'role')", 
      "type": "reply", 
      "content": "Hiển thị giao diện",
      "fragment_key": null
    }
  ]
}

**QUY TẮC LOGIC (ĐÃ CẬP NHẬT):**
1.  name: Lấy 'name' hoặc 'goal' từ ĐỐI TƯỢNG USE CASE đầu vào làm tên biểu đồ.
2.  description: Tự động tạo mô tả ngắn.
3.  lifelines: Phải tạo lifeline cho Actor chính, suy luận thêm các lifeline hệ thống, tên duy nhất.
4.  fragments: Suy luận các khối logic (loop, alt, opt) nếu có.
5.  messages: Dịch tuần tự 'tasks', luôn có phản hồi reply và luồng nội bộ giữa các lifeline.

Hãy phân tích kỹ và trả về ĐÚNG đối tượng JSON này.
`;
    },
  },
  "en-US": {
    diagramDesign: (useCaseContextJson: string) => {
      return `
YOU ARE A SENIOR BUSINESS ANALYST AND SYSTEM ARCHITECT.

Your task is to analyze the following USE CASE OBJECT (containing 'role' and 'tasks') and generate a SINGLE JSON object for a SEQUENCE DIAGRAM.

USE CASE OBJECT TO ANALYZE:
${useCaseContextJson}

**IMPORTANT:**
- Your response MUST be ONLY a single, valid JSON object.
- DO NOT include any explanations, comments, or markdown formatting.

The JSON object MUST strictly follow this string-based structure:
{
  "name": "Scenario Name (From use case 'goal' or 'name')",
  "description": "Short generated description",
  "lifelines": [
    { "name": "Actor Name (From 'role')", "description": "Primary actor" },
    { "name": ":Application", "description": "Client interface" },
    { "name": ":OrderService", "description": "Business logic service" },
    { "name": ":Database", "description": "Data storage" },
    { "name": ":PaymentGateway", "description": "External payment processor" }
  ],
  "fragments": [
    { "key": "frag1", "type": "loop", "guard_condition": "For each item", "parent_key": null }
  ],
  "messages": [
    { 
      "order": 1,
      "source_lifeline_name": "Actor Name (From 'role')", 
      "target_lifeline_name": ":Application", 
      "type": "sync", 
      "content": "Step 1 content from 'tasks'",
      "fragment_key": null
    },
    { 
      "order": 2,
      "source_lifeline_name": ":Application", 
      "target_lifeline_name": "Actor Name (From 'role')", 
      "type": "reply", 
      "content": "Show interface",
      "fragment_key": null
    }
  ]
}

**LOGIC RULES (UPDATED):**
1. name: Use the 'name' or 'goal' from the input USE CASE OBJECT as the diagram name.
2. description: Automatically generate a short description.
3. lifelines: Create lifeline for main Actor, infer other system lifelines, unique names.
4. fragments: Infer logical blocks (loop, alt, opt) if applicable.
5. messages: Translate 'tasks', always include replies and internal flow between lifelines.

Analyze carefully and return ONLY this JSON object.
`;
    },
  },
};

export default sequenceDiagramPrompts;
