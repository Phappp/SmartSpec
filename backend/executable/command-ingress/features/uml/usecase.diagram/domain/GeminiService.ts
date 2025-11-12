import { ApiKeyService } from "../../../orchestrator/domain/ApiKeyService";
import { ObjectId } from "mongodb"; // <-- THÊM MỚI: Cần thiết để tạo ID

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
7. TỰ SUY LUẬN QUAN HỆ (QUAN TRỌNG NHẤT): Bạn BẮT BUỘC phải phân tích logic nghiệp vụ của các use case đã liệt kê để điền vào mảng relationships.
  - Sử dụng "include" khi một use case bắt buộc phải chứa (gọi) một use case khác.
    +Ví dụ: "Tiến hành thanh toán" phải include "Nhập thông tin giao hàng".
    +Ví dụ: "Tiến hành thanh toán" phải include "Chọn phương thức thanh toán".
  - Sử dụng "extend" khi một use case là một phần mở rộng tùy chọn của use case khác.
    +Ví dụ: "Xem danh sách sản phẩm" có thể được extend bởi "Lọc sản phẩm".
    +Ví dụ: "Xem danh sách sản phẩm" có thể được extend bởi "Tìm kiếm sản phẩm".
  Phân tích kỹ toàn bộ danh sách để tìm tất cả các mối quan hệ include và extend hợp lý.
Hãy phân tích kỹ và trả về ĐÚNG đối tượng JSON này.
`,
  },
  "en-US": {
    diagramDesign: (
      requirementsJson: string
    ) => `YOU ARE A SENIOR BUSINESS ANALYST AND SYSTEM ARCHITECT.

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
7. RELATIONSHIP REASONING (MOST IMPORTANT): You MUST analyze the business logic of the listed use cases to fill in the relationships array.
  - Use "include" when a use case must contain (call) another use case.
    +For example: "Proceed to checkout" must include "Enter shipping information".
    +For example: "Proceed to checkout" must include "Select payment method".
  - Use "extend" when a use case is an optional extension of another use case.
    +For example: "View product list" can be extended by "Filter products".
    +For example: "View product list" can be extended by "Search products".
  Examine the entire list to find all the logical include and extend relationships.
Analyze carefully and return ONLY this JSON object.`,
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
      const simplifiedRequirements = requirements.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        goal: r.goal,
        tasks: r.tasks,
      }));

      const requirementsJson = JSON.stringify(simplifiedRequirements, null, 2);
      const lang = language === "en-US" ? "en-US" : "vi-VN";

      const prompt =
        usecaseDiagramPrompts[lang].diagramDesign(requirementsJson);

      console.log(
        `📊 Generating use case diagram for ${requirements.length} use cases`
      );

      // 1. Gọi Gemini và lấy chuỗi JSON (dùng TÊN string)
      const generatedJsonString = await this.generateJsonContent(prompt);

      if (!generatedJsonString) {
        throw new Error("Empty response from Gemini");
      }

      console.log(`📄 Raw response length: ${generatedJsonString.length}`);

      // 2. Parse và validate cấu trúc JSON (vẫn dùng TÊN string)
      // <-- THAY ĐỔI: Đổi tên biến để rõ nghĩa
      const diagramJsonWithStringNames =
        this.validateAndParseDiagramJson(generatedJsonString);

      // 3. Dịch TÊN (string) sang ID (ObjectId)
      console.log("🔄 Translating string names to ObjectIds...");
      const finalDiagramJsonWithIds = this.translateNamesToIds(
        diagramJsonWithStringNames
      );

      console.log(
        `🎉 Final diagram JSON: ${finalDiagramJsonWithIds.actors.length} actors, ${finalDiagramJsonWithIds.usecases.length} usecases`
      );
      return finalDiagramJsonWithIds;
    } catch (error) {
      console.error("❌ Error in generateUsecaseDiagram:", error);

      return {
        name: "Generation Failed",
        description: `Error: ${error.message || "Unknown error"}`,
        actors: [],
        usecases: [],
        associations: [],
        relationships: [],
      };
    }
  }

  // <-- THÊM MỚI: Hàm dịch tên (string) sang ID (ObjectId)
  /**
   * Dịch JSON từ LLM (dùng tên) sang JSON chuẩn hóa (dùng ID)
   * để lưu vào DB, đảm bảo toàn vẹn tham chiếu.
   */
  private translateNamesToIds(diagramJson: any): any {
    const actorNameMap = new Map<string, ObjectId>();
    const usecaseTitleMap = new Map<string, ObjectId>();

    // Bước 1: Tạo ID và Map cho Actors
    const actorsWithIds = diagramJson.actors.map((actor: any) => {
      const newId = new ObjectId(); // Tạo ID thật
      actorNameMap.set(actor.name, newId);
      return {
        ...actor,
        _id: newId, // Gán ID vào object
      };
    });

    // Bước 2: Tạo ID và Map cho Usecases
    const usecasesWithIds = diagramJson.usecases.map((usecase: any) => {
      const newId = new ObjectId(); // Tạo ID thật
      usecaseTitleMap.set(usecase.title, newId);
      return {
        ...usecase,
        _id: newId, // Gán ID vào object
      };
    });

    // Bước 3: Dịch mảng `associations` (dùng tên sang ID)
    const newAssociations = (diagramJson.associations || [])
      .map((assoc: any) => {
        const actorId = actorNameMap.get(assoc.actor_name);
        const usecaseId = usecaseTitleMap.get(assoc.usecase_title);

        // Chỉ thêm nếu cả hai đều hợp lệ
        if (actorId && usecaseId) {
          return {
            _id: new ObjectId(),
            actor_id: actorId, // Dùng ID
            usecase_id: usecaseId, // Dùng ID
          };
        }
        console.warn(
          `[DATA_WARN] Bỏ qua association bị lỗi (không tìm thấy tên): ${assoc.actor_name} -> ${assoc.usecase_title}`
        );
        return null;
      })
      .filter((a: any) => a !== null); // Lọc bỏ các giá trị null (bị lỗi)

    // Bước 4: Dịch mảng `relationships` (dùng tên sang ID)
    const newRelationships = (diagramJson.relationships || [])
      .map((rel: any) => {
        // Source và Target có thể là Actor hoặc Usecase
        // Ưu tiên tìm trong Actor Map trước, sau đó đến Usecase Map
        const sourceId =
          actorNameMap.get(rel.source) || usecaseTitleMap.get(rel.source);
        const targetId =
          actorNameMap.get(rel.target) || usecaseTitleMap.get(rel.target);

        if (sourceId && targetId) {
          return {
            _id: new ObjectId(),
            source: sourceId, // Dùng ID
            target: targetId, // Dùng ID
            type: rel.type,
          };
        }
        console.warn(
          `[DATA_WARN] Bỏ qua relationship bị lỗi (không tìm thấy tên): ${rel.source} -> ${rel.target}`
        );
        return null;
      })
      .filter((r: any) => r !== null);

    // Bước 5: Trả về đối tượng JSON hoàn chỉnh, đã được chuẩn hóa
    return {
      name: diagramJson.name,
      description: diagramJson.description,
      actors: actorsWithIds,
      usecases: usecasesWithIds,
      associations: newAssociations,
      relationships: newRelationships,
      // Đảm bảo trả về các trường khác nếu có
      ...(diagramJson.diagram_svg && {
        diagram_svg: diagramJson.diagram_svg,
      }),
    };
  }

  /**
   * CẬP NHẬT: Parse và validate JSON theo Mongoose Schema
   * (Hàm này giữ nguyên, vì nó validate JSON thô từ LLM)
   */
  private validateAndParseDiagramJson(jsonStr: string): any {
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

    if (
      parsedResponse &&
      parsedResponse.name &&
      typeof parsedResponse.name === "string" &&
      parsedResponse.description &&
      typeof parsedResponse.description === "string" &&
      Array.isArray(parsedResponse.actors) &&
      Array.isArray(parsedResponse.usecases)
    ) {
      console.log("✅ JSON structure is VALID (matches Mongoose schema input)");
      return parsedResponse;
    }

    console.error("❌ VALIDATION FAILED. Parsed object:", parsedResponse);
    console.error(
      "❌ Invalid diagram JSON structure. Response did not contain 'name', 'actors', and 'usecases'."
    );
    throw new Error("Invalid diagram JSON structure from Gemini");
  }

  /**
   * Sửa chữa JSON bị cắt ngắn
   */
  private repairTruncatedJson(jsonStr: string): string {
    let balance = 0;
    let inString = false;
    let escapeNext = false;

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

    let repaired = jsonStr;
    while (balance > 0) {
      if (repaired.trim().endsWith(",")) {
        repaired = repaired.slice(0, -1);
      }
      repaired += "}";
      balance--;
    }

    if (repaired.startsWith("[") && !repaired.endsWith("]")) {
      repaired += "]";
    } else if (repaired.startsWith("{") && !repaired.endsWith("}")) {
      repaired += "}";
    }
    return repaired;
  }

  /**
   * Một hàm chung để gửi prompt tới Gemini và trả về kết quả dạng chuỗi JSON đã được làm sạch.
   * (Giữ nguyên toàn bộ nội dung hàm này)
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
   * Hàm Clean JSON mạnh mẽ hơn, ưu tiên tìm markdown
   */
  private cleanJsonString(text: string): string {
    if (!text) return "";
    let cleanedText = text.trim();

    const markdownMatch = cleanedText.match(/```(?:json)?\s*([\sS]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      cleanedText = markdownMatch[1];
    }

    const jsonStart = cleanedText.indexOf("{");
    const jsonEnd = cleanedText.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    } else {
      console.warn(
        "⚠️ cleanJsonString: Could not find a JSON object {}. Returning raw trimmed text for parsing."
      );
      return cleanedText;
    }

    try {
      JSON.parse(cleanedText);
      return cleanedText;
    } catch (e) {
      console.warn(
        "⚠️ cleanJsonString: Could not parse cleaned JSON, falling back to repair."
      );
      return this.repairTruncatedJson(cleanedText);
    }
  }
}
