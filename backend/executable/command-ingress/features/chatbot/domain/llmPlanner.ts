import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiKeyService } from "../../orchestrator/domain/ApiKeyService";

export type ChatAction =
    | {
        action: "read";
        entityType: string;
        entityId: string;
    }
    | {
        action: "write";
        entityType: string;
        entityId?: string | null;
        payload: Record<string, any>;
    }
    | {
        action: "delete";
        entityType: string;
        entityId: string;
    };

export type ChatPlan = {
    reply: string;
    actions?: ChatAction[];
    memoryNote?: string;
};

type PlannerInput = {
    language: string;
    projectSummary: string;
    contexts: { type: string; name: string; data?: Record<string, any> }[];
    memoryNotes: string[];
    history: { role: "user" | "assistant"; text: string }[];
    userMessage: string;
    actionResults?: Array<{
        success: boolean;
        action: string;
        entityType?: string;
        entityId?: string;
        data?: any;
        error?: string;
    }>;
};

export class ChatLLMPlanner {
    private apiKeyService = new ApiKeyService();
    private readonly modelName = "gemini-2.0-flash-001";

    private buildPrompt(input: PlannerInput) {
        const contextSection =
            input.contexts.length > 0
                ? input.contexts
                    .map(
                        (ctx, idx) =>
                            `${idx + 1}. [${ctx.type}] ${ctx.name}${ctx.data?.description ? ` - ${ctx.data.description}` : ""
                            }`
                    )
                    .join("\n")
                : "Không có";

        const memorySection =
            input.memoryNotes.length > 0
                ? input.memoryNotes.map((note) => `- ${note}`).join("\n")
                : "Chưa có";

        const historySection =
            input.history.length > 0
                ? input.history
                    .slice(-6)
                    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.text}`)
                    .join("\n")
                : "Chưa có cuộc trao đổi trước đó.";

        return `
Bạn là SmartSpec AI Assistant đang hỗ trợ phân tích và chỉnh sửa tài liệu dự án phần mềm.
Hãy hành động như một kỹ sư yêu cầu nghiệp vụ, có khả năng đọc/ghi dữ liệu qua API nội bộ.

THÔNG TIN DỰ ÁN
${input.projectSummary}

NGỮ CẢNH HIỆN CÓ:
${contextSection}

TRÍ NHỚ HIỆN TẠI:
${memorySection}

LỊCH SỬ GẦN NHẤT:
${historySection}
${input.actionResults && input.actionResults.length > 0 ? `
KẾT QUẢ ACTIONS VỪA THỰC HIỆN:
${input.actionResults.map((ar, idx) => {
            if (ar.success && ar.data) {
                return `${idx + 1}. Action "${ar.action}" trên ${ar.entityType} "${ar.entityId || 'N/A'}":\n   Dữ liệu: ${JSON.stringify(ar.data, null, 2)}`;
            } else if (ar.success) {
                return `${idx + 1}. Action "${ar.action}" trên ${ar.entityType} "${ar.entityId || 'N/A'}": Thành công nhưng không có dữ liệu trả về.`;
            } else {
                return `${idx + 1}. Action "${ar.action}" trên ${ar.entityType} "${ar.entityId || 'N/A'}": Thất bại - ${ar.error || 'Lỗi không xác định'}`;
            }
        }).join("\n")}

LƯU Ý: Bạn đã có kết quả thực tế từ actions ở trên. Hãy tạo reply dựa trên kết quả này, trả lời câu hỏi của người dùng một cách chính xác và chi tiết. KHÔNG tạo thêm actions nữa, chỉ cần trả lời dựa trên dữ liệu đã có.
` : ""}

YÊU CẦU ĐẦU RA (JSON hợp lệ):
{
  "reply": "Câu trả lời tự nhiên cho người dùng (có thể gồm nhiều ý: xác nhận, tóm tắt, gợi ý bước tiếp theo)",
  "actions": [
    { "action": "read" | "write" | "delete", "entityType": "usecase|testcase|database|uml-usecase|uml-sequence|uml-activity", "entityId": "string", "payload": { ... } }
  ],
  "memoryNote": "Kiến thức ngắn gọn cần lưu (tùy chọn)"
}

QUY TẮC:
${input.actionResults && input.actionResults.length > 0 ? `
- BẠN ĐÃ CÓ KẾT QUẢ TỪ ACTIONS: Hãy phân tích kết quả và trả lời câu hỏi của người dùng một cách chính xác, chi tiết. KHÔNG tạo thêm actions nữa.
- Nếu có dữ liệu từ action "read", hãy trả lời dựa trên dữ liệu thực tế đó.
- Nếu action thất bại hoặc không tìm thấy dữ liệu, hãy thông báo rõ ràng cho người dùng.
` : `
- Chỉ tạo hành động khi thật sự cần. Một hành động tương ứng một API call.
- Khi ghi dữ liệu phải cung cấp đầy đủ trường quan trọng (ví dụ usecase: name, goal, steps...).
- Với thao tác delete hãy chắc chắn đã đọc dữ liệu trước đó.
- QUAN TRỌNG: Khi người dùng hỏi về dữ liệu (ví dụ "kiểm tra xem...", "xem...", "có... không?", "liệt kê..."), BẮT BUỘC phải tạo action "read" để lấy dữ liệu thực tế trước khi trả lời. KHÔNG được trả lời dựa trên suy đoán hoặc thông tin cũ.
- Nếu người dùng hỏi về một entity cụ thể (theo tên hoặc id), hãy tạo action "read" với entityId tương ứng. Nếu không biết entityId chính xác, hãy tìm trong contexts hoặc lịch sử.
- Nếu người dùng hỏi về danh sách hoặc kiểm tra điều kiện, hãy tạo action "read" để lấy dữ liệu.
- Reply chỉ nên là câu xác nhận ngắn gọn khi có action "read" (ví dụ "Để tôi kiểm tra..."), phần trả lời chi tiết sẽ được tạo sau khi có kết quả.
- QUAN TRỌNG: Khi người dùng yêu cầu tạo entity (usecase, testcase, database, UML), hãy TỰ ĐỘNG tạo ngay lập tức bằng action "write" với entityId = null hoặc không truyền entityId. KHÔNG hỏi lại "bạn muốn tạo đúng không?" hay "bạn có muốn tôi tạo không?". Chỉ cần xác nhận đã tạo xong trong reply.
- Khi người dùng yêu cầu chỉnh sửa/bổ sung cho entity đã tạo trước đó (chưa keep), hãy sử dụng entityId từ lần tạo trước (từ context hoặc lịch sử) để update, KHÔNG tạo entity mới.
`}
- memoryNote chỉ dùng khi người dùng cung cấp thông tin lâu dài (ví dụ "User thích trả lời tiếng Việt").

SCHEMA HINTS (để tạo payload chính xác):
- usecase: { name: string, goal: string, tasks: string[] (KHÔNG phải objects), role: { id, name, description }, priority: "low"|"medium"|"high", ... }
- testcase: { title: string, steps: object[] (với step_number, action, ...), preconditions: string[], ... }
- database: { name: string, tables: object[], ... }
- LƯU Ý: tasks trong usecase phải là array of strings, KHÔNG phải array of objects. Ví dụ: tasks: ["Bước 1", "Bước 2"] chứ KHÔNG phải tasks: [{text: "Bước 1"}, {text: "Bước 2"}]

PHONG CÁCH TRẢ LỜI:
- Ngắn gọn, tự nhiên, thân thiện.
- Khi tạo entity: "Tôi đã tạo [entity] [tên] với các thông tin [tóm tắt]. Bạn có muốn chỉnh sửa gì thêm không?"
- Khi chỉnh sửa: "Tôi đã cập nhật [entity] [tên] với [thay đổi]. Bạn có muốn thêm gì nữa không?"
- Có thể cấu trúc theo 2–3 câu: (1) xác nhận đã hiểu/yêu cầu, (2) tóm tắt nội dung liên quan, (3) gợi ý bước tiếp theo.

NGÔN NGỮ ƯU TIÊN: ${input.language || "vi-VN"}

Tin nhắn người dùng:
${input.userMessage}

Trả về đúng JSON, không giải thích thêm.
`;
    }

    async generatePlan(input: PlannerInput): Promise<ChatPlan> {
        const apiKey = await this.apiKeyService.getActiveKey("gemini");
        if (!apiKey) {
            throw new Error("Không tìm thấy API key Gemini đang hoạt động");
        }

        const prompt = this.buildPrompt(input);
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: this.modelName });
        const response = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const text = response?.response?.text?.() || "";
        return this.safeParsePlan(text);
    }

    private safeParsePlan(raw: string): ChatPlan {
        if (!raw) {
            return {
                reply: "Xin lỗi, tôi không thể xử lý yêu cầu này ngay lúc này.",
            };
        }

        const normalizePlan = (plan: any): ChatPlan => {
            if (!plan || typeof plan !== "object") {
                throw new Error("Invalid plan object");
            }
            if (typeof plan.reply !== "string") {
                plan.reply = "Tôi đã tiếp nhận yêu cầu.";
            }
            if (plan.actions && !Array.isArray(plan.actions)) {
                plan.actions = [];
            }
            return plan;
        };

        const tryParse = (text: string): ChatPlan | null => {
            try {
                const parsed = JSON.parse(text);
                return normalizePlan(parsed);
            } catch {
                return null;
            }
        };

        const trimmed = raw.trim();

        // 1) Nếu LLM trả về trong code block ```json ... ``` thì tách phần bên trong ra
        const fenceMatch = trimmed.match(/```[a-zA-Z0-9_-]*\s*([\s\S]*?)```/);
        if (fenceMatch && fenceMatch[1]) {
            const inner = fenceMatch[1].trim();
            const parsed = tryParse(inner);
            if (parsed) {
                return parsed;
            }
        }

        // 2) Thử parse toàn bộ chuỗi (trường hợp LLM trả JSON thuần)
        const direct = tryParse(trimmed);
        if (direct) {
            return direct;
        }

        // 3) Fallback: tìm đoạn từ dấu { đầu tiên đến } cuối cùng và thử parse
        const firstBrace = trimmed.indexOf("{");
        const lastBrace = trimmed.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            const slice = trimmed.slice(firstBrace, lastBrace + 1);
            const sliced = tryParse(slice);
            if (sliced) {
                return sliced;
            }
        }

        // 4) Nếu vẫn thất bại: coi toàn bộ nội dung là reply text, không có actions
        return {
            reply: trimmed,
            actions: [],
        };
    }
}

