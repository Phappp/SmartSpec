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

YÊU CẦU ĐẦU RA (JSON hợp lệ):
{
  "reply": "Câu trả lời tự nhiên cho người dùng",
  "actions": [
    { "action": "read" | "write" | "delete", "entityType": "usecase|testcase|database|uml-usecase|uml-sequence|uml-activity", "entityId": "string", "payload": { ... } }
  ],
  "memoryNote": "Kiến thức ngắn gọn cần lưu (tùy chọn)"
}

QUY TẮC:
- Chỉ tạo hành động khi thật sự cần. Một hành động tương ứng một API call.
- Khi ghi dữ liệu phải cung cấp đầy đủ trường quan trọng (ví dụ usecase: name, goal, steps...).
- Với thao tác delete hãy chắc chắn đã đọc dữ liệu trước đó.
- Nếu người dùng chỉ hỏi thông tin, chỉ cần action read và phản hồi.
- memoryNote chỉ dùng khi người dùng cung cấp thông tin lâu dài (ví dụ "User thích trả lời tiếng Việt").

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
        try {
            const plan = JSON.parse(raw);
            if (typeof plan.reply !== "string") {
                plan.reply = "Tôi đã tiếp nhận yêu cầu.";
            }
            if (plan.actions && !Array.isArray(plan.actions)) {
                plan.actions = [];
            }
            return plan;
        } catch (error) {
            return {
                reply: raw.trim(),
                actions: [],
            };
        }
    }
}

