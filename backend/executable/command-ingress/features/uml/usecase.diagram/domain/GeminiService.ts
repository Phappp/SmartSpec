// UsecaseDiagramGeminiService.ts
import { ApiKeyService } from "../../../orchestrator/domain/ApiKeyService";
// Giả định ApiKeyService được import từ đúng đường dẫn
// import { ApiKeyService } from "../../orchestrator/domain/ApiKeyService";

// PROMPTS MỚI - YÊU CẦU TRẢ VỀ ĐÚNG FORMAT MONGO SCHEMA
type PromptEntry = {
  diagramDesign: (requirementsJson: string) => string;
};

const usecaseDiagramPrompts: Record<string, PromptEntry> = {
  "vi-VN": {
    diagramDesign: (requirementsJson: string) => `
BẠN LÀ MỘT KỸ SƯ PHÂN TÍCH NGHIỆP VỤ (BUSINESS ANALYST) VÀ KIẾN TRÚC SƯ HỆ THỐNG.

Nhiệm vụ của bạn là phân tích danh sách các use case sau đây và tạo ra một cấu trúc JSON DUY NHẤT.

DANH SÁCH USE CASE:
${requirementsJson}

**QUAN TRỌNG:**
- Phản hồi của bạn BẮT BUỘC CHỈ LÀ một đối tượng JSON hợp lệ.
- KHÔNG bao gồm bất kỳ lời giải thích, bình luận, hay định dạng markdown nào như \`\`\`json.

Đối tượng JSON BẮT BUỘC phải tuân thủ nghiêm ngặt cấu trúc Mongoose Schema sau:

{
  "name": "Tên biểu đồ (Tự động tạo, ví dụ: Hệ thống Quản lý Bán hàng)",
  "description": "Mô tả ngắn về biểu đồ(tự động tạo, ví dụ: Biểu đồ usecase cho dự án X)",
  "actors": [
    { "name": "Tên Actor (ví dụ: Customer)", "description": "Mô tả ngắn về actor" }
  ],
  "usecases": [
    { "title": "Tên Use Case (ví dụ: Đăng nhập)", "description": "Mô tả ngắn về use case" }
  ],
  "associations": [
    { "actor_name": "Customer", "usecase_title": "Đăng nhập" }
  ],
  "relationships": [
    { 
      "source": "Thanh toán", 
      "target": "Xác thực thẻ", 
      "type": "include" 
    },
    { 
      "source": "Admin", 
      "target": "User", 
      "type": "generalization" 
    }
  ]
}

**QUY TẮC LOGIC:**

1.  **name**: Tự động tạo một tên mô tả ngắn gọn cho toàn bộ biểu đồ.
2.  **description**: Tự động tạo một mô tả ngắn về biểu đồ usecase.
3.  **actors**: Liệt kê TẤT CẢ các tác nhân (role) duy nhất. 'name' phải là duy nhất.
4.  **usecases**: Liệt kê TẤT CẢ các chức năng (goal) duy nhất. 'title' phải là duy nhất.
5.  **associations**: Chỉ tạo các liên kết giữa 'actor' và 'usecase'. Giá trị 'actor_name' và 'usecase_title' phải khớp 100% với 'name' và 'title' đã định nghĩa ở trên.
6.  **relationships**: Chỉ tạo các liên kết 'include', 'extend', hoặc 'generalization'. 'source' và 'target' phải khớp 100% với 'name' (của actor) hoặc 'title' (của usecase).

Hãy phân tích kỹ và trả về ĐÚNG đối tượng JSON này.
`,
  },
  "en-US": {
    diagramDesign: (requirementsJson: string) => `
YOU ARE A SENIOR BUSINESS ANALYST AND SYSTEM ARCHITECT.

Your task is to analyze the following list of use cases and generate a SINGLE JSON object.

LIST OF USE CASES:
${requirementsJson}

**IMPORTANT:**
- Your response MUST be ONLY a single, valid JSON object.
- DO NOT include any explanations, comments, or markdown formatting like \`\`\`json.

The JSON object MUST strictly follow this Mongoose Schema structure:

{
  "name": "Generated Diagram Name (e.g., Sales Management System)",
  "description": "Short description of the diagram (e.g., Usecase diagram for project X)",
  "actors": [
    { "name": "Actor Name (e.g., Customer)", "description": "Short description" }
  ],
  "usecases": [
    { "title": "Use Case Title (e.g., Log In)", "description": "Short description" }
  ],
  "associations": [
    { "actor_name": "Customer", "usecase_title": "Log In" }
  ],
  "relationships": [
    { 
      "source": "Checkout", 
      "target": "Validate Card", 
      "type": "include" 
    },
    { 
      "source": "Admin", 
      "target": "User", 
      "type": "generalization" 
    }
  ]
}

**LOGIC RULES:**

1.  **name**: Automatically generate a concise, descriptive name for the entire diagram.
2.  **description**: Automatically generate a short description of the usecase diagram.
3.  **actors**: List ALL unique actors (roles). 'name' must be unique.
4.  **usecases**: List ALL unique functions (goals). 'title' must be unique.
5.  **associations**: Only create links between 'actor' and 'usecase'. 'actor_name' and 'usecase_title' must 100% match the 'name' and 'title' defined above.
6.  **relationships**: Only create 'include', 'extend', or 'generalization' links. 'source' and 'target' must 100% match an actor 'name' or usecase 'title'.

Analyze carefully and return ONLY this JSON object.
`,
  },
};

export class UsecaseDiagramGeminiService {
  private apiKeyService = new ApiKeyService();

  /**
   * Tạo JSON cho use case diagram (theo format Mongoose Schema) từ requirements
   */
  async generateUsecaseDiagram(
    requirements: any[],
    language: string
  ): Promise<any> {
    try {
      // Đơn giản hóa requirements để gửi cho Gemini
      const simplifiedRequirements = requirements.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role, // Quan trọng để xác định actors
        goal: r.goal, // Quan trọng để xác định usecases
        tasks: r.tasks, // Giúp xác định 'include'
      }));

      const requirementsJson = JSON.stringify(simplifiedRequirements, null, 2);
      const lang = language === "en-US" ? "en-US" : "vi-VN";

      const prompt =
        usecaseDiagramPrompts[lang].diagramDesign(requirementsJson);

      console.log(
        `📊 Generating use case diagram for ${requirements.length} use cases`
      );

      // 1. Gọi Gemini và lấy chuỗi JSON đã được làm sạch
      const generatedJsonString = await this.generateJsonContent(prompt);

      if (!generatedJsonString) {
        throw new Error("Empty response from Gemini");
      }

      console.log(`📄 Raw response length: ${generatedJsonString.length}`);

      // 2. Parse và validate cấu trúc JSON mới (theo format Mongoose)
      const diagramJson = this.validateAndParseDiagramJson(generatedJsonString);

      console.log(
        `🎉 Final diagram JSON: ${diagramJson.actors.length} actors, ${diagramJson.usecases.length} usecases`
      );
      return diagramJson;
    } catch (error) {
      console.error("❌ Error in generateUsecaseDiagram:", error);

      // Fallback: Trả về cấu trúc rỗng khớp với schema
      return {
        name: "Generation Failed",
        actors: [],
        usecases: [],
        associations: [],
        relationships: [],
      };
    }
  }

  /**
   * CẬP NHẬT: Parse và validate JSON theo Mongoose Schema
   */
  private validateAndParseDiagramJson(jsonStr: string): any {
    // Log chuỗi thô để debug (rất quan trọng)
    console.log("--- RAW STRING TO PARSE ---");
    console.log(jsonStr);
    console.log("--- END RAW STRING ---");

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("❌ JSON parse error, attempting repair...", parseError);
      const repairedJson = this.repairTruncatedJson(jsonStr);
      try {
        parsedResponse = JSON.parse(repairedJson);
      } catch (repairError) {
        console.error("❌ JSON repair failed:", repairError);
        throw new Error(
          `Failed to parse JSON even after repair: ${repairError.message}`
        );
      }
    }

    // Validate: Đảm bảo cấu trúc cơ bản mà Schema cần
    if (
      parsedResponse &&
      parsedResponse.name && // Phải có 'name'
      typeof parsedResponse.name === "string" &&
      parsedResponse.description &&
      typeof parsedResponse.description === "string" &&
      Array.isArray(parsedResponse.actors) && // Phải có 'actors'
      Array.isArray(parsedResponse.usecases) // Phải có 'usecases'
      // associations và relationships có thể là mảng rỗng (hoặc undefined)
    ) {
      console.log("✅ JSON structure is VALID (matches Mongoose schema)");
      return parsedResponse;
    }

    console.error("❌ VALIDATION FAILED. Parsed object:", parsedResponse);
    console.error(
      "❌ Invalid diagram JSON structure. Response did not contain 'name', 'actors', and 'usecases'."
    );
    throw new Error("Invalid diagram JSON structure from Gemini");
  }

  /**
   * Sửa chữa JSON bị cắt ngắn (Giữ nguyên từ file cũ)
   */
  private repairTruncatedJson(jsonStr: string): string {
    let balance = 0;
    let inString = false;
    let escapeNext = false;

    // Đếm balance hiện tại
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === "\\") {
        escapeNext = true;
        continue;
      }
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{" || char === "[") balance++;
        if (char === "}" || char === "]") balance--;
      }
    }

    // Đóng tất cả các mở ngoặc còn thiếu
    let repaired = jsonStr;
    while (balance > 0) {
      if (repaired.trim().endsWith(",")) {
        repaired = repaired.slice(0, -1); // Remove trailing comma
      }
      repaired += "}"; // Ưu tiên đóng '}' vì chúng ta mong đợi một object
      balance--;
    }

    // Đảm bảo kết thúc đúng
    if (repaired.startsWith("[") && !repaired.endsWith("]")) {
      repaired += "]";
    } else if (repaired.startsWith("{") && !repaired.endsWith("}")) {
      repaired += "}";
    }
    return repaired;
  }

  /**
   * Một hàm chung để gửi prompt tới Gemini và trả về kết quả dạng chuỗi JSON đã được làm sạch.
   */
  private async generateJsonContent(prompt: string): Promise<string> {
    const keys = await this.apiKeyService.getAllActiveKeys("gemini");
    if (!keys || keys.length === 0) {
      throw new Error("No active Gemini API key found.");
    }

    let lastError: any;
    for (const k of keys) {
      try {
        console.log(
          `🔑 Trying Gemini key for diagram content: ${k.key_value.slice(
            0,
            12
          )}...`
        );

        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const client = new GoogleGenerativeAI(k.key_value);
        const model = client.getGenerativeModel({
          model: k.model_name,
        });

        const resp: any = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const text: string = resp?.response?.text?.() || "";

        // Trả về ngay sau khi thành công (sử dụng hàm clean nâng cấp)
        return this.cleanJsonString(text);
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || "").toLowerCase();
        console.error(
          `❌ Gemini key ${k._id} failed during diagram content generation:`,
          err?.message || err
        );

        if (msg.includes("invalid") || msg.includes("unauthorized")) {
          try {
            await this.apiKeyService.disableKey(k._id);
            console.warn(`⚠️ Disabled invalid Gemini key: ${k._id}`);
          } catch {
            /* Bỏ qua lỗi khi disable key */
          }
        }
        continue;
      }
    }

    throw (
      lastError ||
      new Error("All Gemini API keys failed during diagram content generation.")
    );
  }

  /**
   * CẬP NHẬT: Hàm Clean JSON mạnh mẽ hơn, ưu tiên tìm markdown
   */
  private cleanJsonString(text: string): string {
    if (!text) return "";
    let cleanedText = text.trim();

    // Bước 1: Tìm khối JSON được bọc trong markdown ```json ... ```
    // Dùng regex non-greedy ([\s\S]*?) để tìm khối JSON
    const markdownMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      cleanedText = markdownMatch[1];
    }

    // Bước 2: Nếu không có markdown, tìm JSON object đầu tiên
    // Chúng ta chỉ tìm kiếm object '{...}' vì đó là yêu cầu BẮT BUỘC
    const jsonStart = cleanedText.indexOf("{");
    const jsonEnd = cleanedText.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    } else {
      // Nếu không tìm thấy object, có thể là lỗi
      console.warn(
        "⚠️ cleanJsonString: Could not find a JSON object {}. Returning raw trimmed text for parsing."
      );
      // Trả về text đã trim để validateAndParse có thể thấy lỗi
      return cleanedText;
    }

    // Bước 3: Thử parse để kiểm tra
    try {
      JSON.parse(cleanedText);
      return cleanedText; // JSON hợp lệ
    } catch (e) {
      console.warn(
        "⚠️ cleanJsonString: Could not parse cleaned JSON, falling back to repair."
      );
      // Gửi nó đến hàm repair để thử sửa (ví dụ: đóng ngoặc bị thiếu)
      return this.repairTruncatedJson(cleanedText);
    }
  }
}
