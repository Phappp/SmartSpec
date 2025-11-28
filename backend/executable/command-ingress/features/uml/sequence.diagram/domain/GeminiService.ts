// services/SequenceDiagramGeminiService.ts

import { ApiKeyService } from "../../../orchestrator/domain/ApiKeyService";
import { ObjectId } from "mongodb";
// <-- THAY ĐỔI: Import payload mới, giả sử bạn đã cập nhật file types.ts
import { GenerateSequenceDiagramPayload } from "../types";

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
- KHÔNG bao gồm bất kỳ lời giải thích, bình luận, hay định dạng markdown nào.

Đối tượng JSON BẮT BUỘC phải tuân thủ nghiêm ngặt cấu trúc (dùng string) sau:
{
  "name": "Tên kịch bản (Lấy từ 'goal' hoặc 'name')",
  "description": "Mô tả ngắn về kịch bản (tự động tạo)",
  "lifelines": [
    { "name": "Customer", "description": "Tác nhân chính" },
    { "name": ":Application", "description": "Giao diện" }
  ],
  "fragments": [
    { "key": "alt_payment", "type": "alt", "guard_condition": "[Payment OK]", "parent_key": null }
  ],
  "messages": [
    { 
      "key": "msg_1", // <-- CÓ KEY
      "order": 1, 
      "source_lifeline_name": "Customer", 
      "target_lifeline_name": ":Application", 
      "type": "sync", 
      "content": "submitPayment()", 
      "fragment_key": null 
    },
    { 
      "key": "msg_2", // <-- CÓ KEY
      "order": 2, 
      "source_lifeline_name": ":Application", 
      "target_lifeline_name": "Customer", 
      "type": "reply", 
      "content": "Processing...", 
      "fragment_key": null 
    }
  ],
  "layout_data": {
    "nodes": [
      { "id": "Customer", "type": "lifelineNode", "position": { "x": 100, "y": 50 }, "data": { "label": "Customer" } },
      { "id": ":Application", "type": "lifelineNode", "position": { "x": 300, "y": 50 }, "data": { "label": ":Application" } }
    ],
    "edges": [
      { "id": "msg_1", "source": "Customer", "target": ":Application", "type": "messageEdge", "data": { "label": "submitPayment()" } }
    ]
  }
}

**QUY TẮC LOGIC:**

1.  **name**: Lấy 'name' hoặc 'goal' từ ĐỐI TƯỢNG USE CASE đầu vào.
2.  **description**: Tự động tạo mô tả ngắn.
3.  **lifelines**:
    - **Bắt buộc:** Tạo lifeline cho Actor chính (từ 'role').
    - **Suy luận nâng cao:** BẮT BUỘC suy luận thêm các lifeline chi tiết (ví dụ: **:Application**, **:Controller**, **:Service**, **:Database**, **:PaymentGateway**).
    - 'name' phải là duy nhất.

4.  **messages (QUY TẮC MỚI):**
    - **Bắt buộc có 'key':** Phải tạo một 'key' string duy nhất cho mỗi message (ví dụ: "msg_1", "msg_2").
    - **Phải có phản hồi (Reply):** Với mỗi lệnh 'sync' từ Actor, phải có một 'reply' tương ứng trả về.
    - **Phải có luồng nội bộ:** Tích cực tạo thêm thông điệp nội bộ giữa các lifeline hệ thống.
    - 'order', 'type', 'content' là bắt buộc.
    
5.  **fragments (QUY TẮC MỚI):**
    - 'key' phải là một chuỗi string duy nhất (ví dụ: "frag1", "alt_payment").
    - **SUY LUẬN KỊCH BẢN THAY THẾ (ALT):** Tích cực tìm kiếm các điểm rẽ nhánh (ví dụ: kiểm tra, xác thực, thanh toán). Khi gặp chúng, BẠN BẮT BUỘC phải sử dụng một 'fragment' với 'type: "alt"' và 'type: "else"' để mô tả cả hai luồng (ví dụ: '[Thành công]' và '[Thất bại]').
    - Các 'messages' thuộc các luồng này phải có 'fragment_key' trỏ đến 'key' của fragment tương ứng.

6.  **layout_data (QUY TẮC MỚI):**
    - BẠN BẮT BUỘC phải tạo một đối tượng \`layout_data\` để vẽ.
    - **nodes:**
        - Tạo một 'node' cho MỖI lifeline. **'id' của node phải GIỐNG HỆT 'name' của lifeline** (ví dụ: \`id: "Customer"\`). **'data.label' phải là 'name'** (ví dụ: \`data: { "label": "Customer" }\`).
        - Tạo thêm 'node' cho MỖI fragment. **'id' của node phải GIỐNG HỆT 'key' của fragment** (ví dụ: \`id: "alt_payment"\`). **'data.label' phải là \`type\` + ' ' + \`guard_condition\`** (ví dụ: \`data: { "label": "alt [Thanh toán thành công]" }\`).
        - Tự động gán \`position: { "x": ..., "y": ... }\` một cách hợp lý.
    - **edges:**
        - Tạo một 'edge' cho MỖI message.
        - **'id' của edge phải GIỐNG HỆT 'key' của message** (ví dụ: \`id: "msg_1"\`).
        - **'source' của edge phải là 'name' của lifeline nguồn.**
        - **'target' của edge phải là 'name' của lifeline đích.**
        - 'data: { "label": ... }' phải chứa 'content' của message.

Hãy phân tích kỹ và trả về ĐÚNG đối tượng JSON này.
`;
    },
  },
  "en-US": {
    diagramDesign: (useCaseContextJson: string) => {
      return `
YOU ARE A BUSINESS ANALYST AND SYSTEM ARCHITECT.

Your task is to analyze the following USE CASE OBJECT (including 'role' and 'tasks') and create a UNIQUE JSON structure for the SEQUENCE DIAGRAM.

USE CASE OBJECT TO DRAW:
${useCaseContextJson}

**IMPORTANT:**
- Your response MUST ONLY be a valid JSON object.
- DO NOT include any explanations, comments, or markdown formatting.

The JSON object MUST strictly adhere to the following structure (using strings):
{
  "name": "Scenario name (Taken from 'goal' or 'name')",
  "description": "Short description of the scenario (auto-generated)",
  "lifelines": [
    { "name": "Customer", "description": "Main actor" },
    { "name": ":Application", "description": "Interface" }
  ],
  "fragments": [
    { "key": "alt_payment", "type": "alt", "guard_condition": "[Payment OK]", "parent_key": null }
  ],
  "messages": [
    {
      "key": "msg_1", 
      "order": 1,
      "source_lifeline_name": "Customer", 
      "target_lifeline_name": ":Application", 
      "type": "sync", 
      "content": "submitPayment()", 
      "fragment_key": null 
    }, 
    { 
      "key": "msg_2", // <-- HAS KEY 
      "order": 2, 
      "source_lifeline_name": ":Application", 
      "target_lifeline_name": "Customer", 
      "type": "reply", 
      "content": "Processing...", 
      "fragment_key": null 
    } 
  ], 
  "layout_data": { 
  "nodes": [ 
    { "id": "Customer", "type": "lifelineNode", "position": { "x": 100, "y": 50 }, "data": { "label": "Customer" } }, 
    { "id": ":Application", "type": "lifelineNode", "position": { "x": 300, "y": 50 }, "data": { "label": ":Application" } }
  ],
  "edges": [
    { "id": "msg_1", "source": "Customer", "target": ":Application", "type": "messageEdge", "data": { "label": "submitPayment()" } }
  ]
  }
}

**LOGIC RULES (UPDATED):**

1. **name**: Get 'name' or 'goal' from the input USE CASE OBJECT.

2. **description**: Automatically generate a short description.
3. **lifelines**:
  - **Required:** Create a lifeline for the main Actor (from 'role').
  - **Advanced Reasoning:** REQUIRED to infer additional detailed lifelines (e.g., **:Application**, **:Controller**, **:Service**, **:Database**, **:PaymentGateway**).
  - 'name' must be unique.

4. **messages (NEW RULE):**
  - **Required 'key':** Must create a unique 'key' string for each message (e.g., "msg_1", "msg_2").
  - **Reply:** For each 'sync' command from the Actor, there must be a corresponding 'reply' returned.
  - **Internal Threads:** Actively create additional internal messages between system lifelines.
  - 'order', 'type', 'content' are required.

5. **fragments (NEW RULE):**
  - 'key' must be a unique string (e.g. "frag1", "alt_payment").
  - **ALTERNATE SCENARIO (ALT):** Actively look for branching points (e.g. checkout, authentication, payment). When you encounter them, YOU MUST use a 'fragment' with 'type: "alt"' and 'type: "else"' to describe both flows (e.g. '[Success]' and '[Failure]').
  - The 'messages' belonging to these flows must have a 'fragment_key' pointing to the 'key' of the corresponding fragment.

6. **layout_data (NEW RULE):**
  - YOU MUST create a \`layout_data\` object to draw.
  - **nodes:**
    - Create a 'node' for EACH lifeline. The node's **id' must be EXACTLY the same as the lifeline's 'name'** (e.g., \`id: "Customer"\`). **'data.label' must be the 'name'** (e.g., \`data: { "label": "Customer" }\`).
    - Create an additional 'node' for EACH fragment. The node's **id' must be EXACTLY the same as the fragment's 'key'** (e.g., \`id: "alt_payment"\`). **'data.label' must be \`type\` + ' ' + \`guard_condition\`** (e.g., \`data: { "label": "alt [Payment successful]" }\`).
    - Automatically assign \`position: { "x": ..., "y": ... }\` appropriately.
  - **edges:**
    - Create an 'edge' for EACH message.
    - **'id' of the edge must be EXACTLY the same as the 'key' of the message** (e.g., \`id: "msg_1"\`).
    - **'source' of the edge must be the 'name' of the source lifeline.**
    - **'target' of the edge must be the 'name' of the target lifeline.**
    - 'data: { "label": ... }' must contain the 'content' of the message.

Please parse this JSON object carefully and return the CORRECT one.
`;
    },
  },
};

export class SequenceDiagramGeminiService {
  private apiKeyService = new ApiKeyService();

  /**
   * Tạo JSON cho sequence diagram từ *một* Usecase cụ thể (context)
   */
  async generateSequenceDiagram(
    payload: GenerateSequenceDiagramPayload, // <-- Đã cập nhật (chứa useCaseContext)
    language: string
  ): Promise<any> {
    try {
      // <-- THAY ĐỔI: Lấy ngữ cảnh Usecase (là 1 object)
      const useCaseContext = payload.useCaseContext;
      if (
        !useCaseContext ||
        typeof useCaseContext !== "object" ||
        !useCaseContext.tasks
      ) {
        throw new Error(
          "Invalid useCaseContext. It must be a Usecase object containing 'tasks'."
        );
      }

      // <-- THAY ĐỔI: Stringify toàn bộ object Usecase
      const requirementsJson = JSON.stringify(useCaseContext, null, 2);
      const lang = language === "en-US" ? "en-US" : "vi-VN";

      const prompt =
        sequenceDiagramPrompts[lang].diagramDesign(requirementsJson);

      console.log(
        `📊 Generating sequence diagram for usecase ${payload.usecaseId}`
      );

      // 1. Gọi Gemini (Giữ nguyên)
      const generatedJsonString = await this.generateJsonContent(prompt);

      if (!generatedJsonString) {
        throw new Error("Empty response from Gemini");
      }

      console.log(`📄 Raw response length: ${generatedJsonString.length}`);

      // 2. Parse và validate JSON thô (Giữ nguyên)
      const diagramJsonWithStringKeys =
        this.validateAndParseSequenceJson(generatedJsonString);

      // 3. Dịch TÊN/KEY (string) sang ID (ObjectId) (Giữ nguyên)
      console.log("🔄 Translating string keys/names to ObjectIds...");
      const finalDiagramJsonWithIds = this.translateKeysToIds(
        diagramJsonWithStringKeys
      );

      console.log(
        `🎉 Final diagram JSON: ${finalDiagramJsonWithIds.lifelines.length} lifelines, ${finalDiagramJsonWithIds.messages.length} messages`
      );
      return finalDiagramJsonWithIds;
    } catch (error) {
      console.error("❌ Error in generateSequenceDiagram:", error);

      return {
        name: "Generation Failed",
        description: `Error: ${error.message || "Unknown error"}`,
        lifelines: [],
        messages: [],
        fragments: [],
      };
    }
  }

  // --- CÁC HÀM SAU ĐÂY KHÔNG CẦN THAY ĐỔI ---
  // (Chúng là "backend" của service này và hoạt động chính xác)

  /**
   * Dịch JSON (dùng name/key) sang JSON chuẩn hóa (dùng ID)
   */

  // private translateKeysToIds(diagramJson: any): any {
  //   const lifelineNameMap = new Map<string, ObjectId>();
  //   const fragmentKeyMap = new Map<string, ObjectId>();

  //   // Bước 1: Tạo ID và Map cho Lifelines
  //   const lifelinesWithIds = diagramJson.lifelines.map((line: any) => {
  //     const newId = new ObjectId();
  //     lifelineNameMap.set(line.name, newId); // Map<"Customer", "id_ABC">
  //     return { ...line, _id: newId };
  //   });

  //   // Bước 2: Tạo ID và Map cho Fragments
  //   const fragmentsWithIds = (diagramJson.fragments || []).map((frag: any) => {
  //     const newId = new ObjectId();
  //     fragmentKeyMap.set(frag.key, newId); // Map<"alt_payment", "id_XYZ">
  //     return { ...frag, _id: newId };
  //   });

  //   // Bước 2.5: Dịch 'parent_key' (string) sang 'parent_fragment_id' (ObjectId)
  //   const fragmentsWithParentIds = fragmentsWithIds.map((frag) => {
  //     if (frag.parent_key) {
  //       const parentId = fragmentKeyMap.get(frag.parent_key);
  //       if (parentId) {
  //         const { parent_key, ...rest } = frag;
  //         return { ...rest, parent_fragment_id: parentId };
  //       }
  //     }
  //     return frag;
  //   });

  //   // Bước 3: Dịch mảng `messages`
  //   const newMessages = (diagramJson.messages || [])
  //     .map((msg: any) => {
  //       const sourceId = lifelineNameMap.get(msg.source_lifeline_name);
  //       const targetId = lifelineNameMap.get(msg.target_lifeline_name);
  //       const fragmentId = msg.fragment_key
  //         ? fragmentKeyMap.get(msg.fragment_key)
  //         : null;

  //       if (sourceId && targetId) {
  //         const {
  //           source_lifeline_name,
  //           target_lifeline_name,
  //           fragment_key,
  //           ...rest
  //         } = msg;
  //         const newMessage: any = {
  //           ...rest,
  //           _id: new ObjectId(),
  //           source_lifeline_id: sourceId,
  //           target_lifeline_id: targetId,
  //         };
  //         if (fragmentId) {
  //           newMessage.fragment_id = fragmentId;
  //         }
  //         return newMessage;
  //       }
  //       console.warn(
  //         `[DATA_WARN] Bỏ qua message bị lỗi (không tìm thấy lifeline): ${msg.source_lifeline_name} -> ${msg.target_lifeline_name}`
  //       );
  //       return null;
  //     })
  //     .filter((m: any) => m !== null);

  //   // <-- BƯỚC 4: DỊCH LAYOUT_DATA (MỚI) -->
  //   let translatedLayoutData = { nodes: [], edges: [] }; // Default
  //   if (diagramJson.layout_data) {
  //     // 4a. Dịch Nodes (Lifelines và Fragments)
  //     const translatedNodes = (diagramJson.layout_data.nodes || [])
  //       .map((node: any) => {
  //         // node.id có thể là "Customer" (Lifeline) hoặc "alt_payment" (Fragment)
  //         const lifelineId = lifelineNameMap.get(node.id);
  //         const fragmentId = fragmentKeyMap.get(node.id);

  //         const newId = lifelineId || fragmentId; // Tìm ID mới

  //         if (newId) {
  //           return { ...node, id: newId.toString() }; // Thay thế 'id' (string) bằng ObjectId (dưới dạng string)
  //         }
  //         console.warn(`[LAYOUT_WARN] Không tìm thấy node layout: ${node.id}`);
  //         return null; // Bỏ qua node không xác định
  //       })
  //       .filter((n: any) => n !== null);

  //     // 4b. Dịch Edges (Messages)
  //     const translatedEdges = (diagramJson.layout_data.edges || [])
  //       .map((edge: any) => {
  //         // edge.source và edge.target là 'name' của lifeline (ví dụ: "Customer")
  //         const newSourceId = lifelineNameMap.get(edge.source);
  //         const newTargetId = lifelineNameMap.get(edge.target);

  //         if (newSourceId && newTargetId) {
  //           return {
  //             ...edge,
  //             source: newSourceId.toString(), // Thay 'source' bằng ObjectId
  //             target: newTargetId.toString(), // Thay 'target' bằng ObjectId
  //           };
  //         }
  //         console.warn(
  //           `[LAYOUT_WARN] Không tìm thấy edge layout: ${edge.source} -> ${edge.target}`
  //         );
  //         return null;
  //       })
  //       .filter((e: any) => e !== null);

  //     translatedLayoutData = {
  //       nodes: translatedNodes,
  //       edges: translatedEdges,
  //     };
  //   }

  //   // Bước 5: Trả về đối tượng JSON hoàn chỉnh
  //   // Xóa 'key' (string) khỏi fragments sau khi đã dịch
  //   const finalFragments = fragmentsWithParentIds.map((f) => {
  //     const { key, parent_key, ...rest } = f; // Xóa cả parent_key
  //     return rest;
  //   });

  //   return {
  //     name: diagramJson.name,
  //     description: diagramJson.description,
  //     lifelines: lifelinesWithIds,
  //     fragments: finalFragments, // <-- Dùng bản đã dịch
  //     messages: newMessages, // <-- Dùng bản đã dịch
  //     layout_data: translatedLayoutData, // <-- Dùng bản đã dịch
  //   };
  // }

  private translateKeysToIds(diagramJson: any): any {
    const lifelineNameMap = new Map<string, ObjectId>();
    const fragmentKeyMap = new Map<string, ObjectId>();
    const messageKeyMap = new Map<string, ObjectId>(); // <-- BƯỚC MỚI

    // Bước 1: Tạo ID và Map cho Lifelines
    const lifelinesWithIds = diagramJson.lifelines.map((line: any) => {
      const newId = new ObjectId();
      lifelineNameMap.set(line.name, newId); // Map<"Customer", "id_ABC">
      return { ...line, _id: newId };
    });

    // Bước 2: Tạo ID và Map cho Fragments
    const fragmentsWithIds = (diagramJson.fragments || []).map((frag: any) => {
      const newId = new ObjectId();
      fragmentKeyMap.set(frag.key, newId); // Map<"alt_payment", "id_XYZ">
      return { ...frag, _id: newId };
    });

    // Bước 2.5: Dịch 'parent_key' (string) sang 'parent_fragment_id' (ObjectId)
    const fragmentsWithParentIds = fragmentsWithIds.map((frag) => {
      if (frag.parent_key) {
        const parentId = fragmentKeyMap.get(frag.parent_key);
        if (parentId) {
          const { parent_key, ...rest } = frag;
          return { ...rest, parent_fragment_id: parentId };
        }
      }
      return frag;
    });

    // Bước 3: Dịch mảng `messages` VÀ TẠO MAP
    const newMessages = (diagramJson.messages || [])
      .map((msg: any) => {
        const sourceId = lifelineNameMap.get(msg.source_lifeline_name);
        const targetId = lifelineNameMap.get(msg.target_lifeline_name);
        const fragmentId = msg.fragment_key
          ? fragmentKeyMap.get(msg.fragment_key)
          : null;

        if (sourceId && targetId) {
          const newId = new ObjectId(); // <-- Tạo ID thật cho message

          // <-- BƯỚC MỚI: Lưu vào map
          // Map<"msg_1", "id_Msg_A">
          messageKeyMap.set(msg.key, newId);

          const {
            source_lifeline_name,
            target_lifeline_name,
            fragment_key,
            key,
            ...rest
          } = msg;

          const newMessage: any = {
            ...rest,
            _id: newId, // <-- Dùng ID thật
            source_lifeline_id: sourceId,
            target_lifeline_id: targetId,
          };
          if (fragmentId) {
            newMessage.fragment_id = fragmentId;
          }
          return newMessage;
        }
        console.warn(
          `[DATA_WARN] Bỏ qua message bị lỗi (không tìm thấy lifeline): ${msg.source_lifeline_name} -> ${msg.target_lifeline_name}`
        );
        return null;
      })
      .filter((m: any) => m !== null);

    // Bước 4: Dịch LAYOUT_DATA (Sử dụng cả 3 Map)
    let translatedLayoutData = { nodes: [], edges: [] };
    if (diagramJson.layout_data) {
      // 4a. Dịch Nodes (Lifelines và Fragments)
      const translatedNodes = (diagramJson.layout_data.nodes || [])
        .map((node: any) => {
          const lifelineId = lifelineNameMap.get(node.id);
          const fragmentId = fragmentKeyMap.get(node.id);
          const newId = lifelineId || fragmentId; // Tìm ID mới

          if (newId) {
            return { ...node, id: newId.toString() };
          }
          console.warn(`[LAYOUT_WARN] Không tìm thấy node layout: ${node.id}`);
          return null;
        })
        .filter((n: any) => n !== null);

      // 4b. Dịch Edges (Messages)
      const translatedEdges = (diagramJson.layout_data.edges || [])
        .map((edge: any) => {
          // <-- THAY ĐỔI: Dịch ID của edge
          // edge.id bây giờ là "msg_1", "msg_2"
          const newEdgeId = messageKeyMap.get(edge.id);

          // Dịch source/target (vẫn là "Customer", ":Application")
          const newSourceId = lifelineNameMap.get(edge.source);
          const newTargetId = lifelineNameMap.get(edge.target);

          if (newEdgeId && newSourceId && newTargetId) {
            return {
              ...edge,
              id: newEdgeId.toString(), // <-- Sửa: Dùng _id của message
              source: newSourceId.toString(), // Sửa: Dùng _id của lifeline
              target: newTargetId.toString(), // Sửa: Dùng _id của lifeline
            };
          }
          console.warn(
            `[LAYOUT_WARN] Không tìm thấy edge layout: ${edge.id} (source: ${edge.source}, target: ${edge.target})`
          );
          return null;
        })
        .filter((e: any) => e !== null);

      translatedLayoutData = {
        nodes: translatedNodes,
        edges: translatedEdges,
      };
    }

    // Bước 5: Trả về đối tượng JSON hoàn chỉnh
    // Xóa 'key' (string) khỏi fragments sau khi đã dịch
    const finalFragments = fragmentsWithParentIds.map((f) => {
      const { key, parent_key, ...rest } = f;
      return rest;
    });

    return {
      name: diagramJson.name,
      description: diagramJson.description,
      lifelines: lifelinesWithIds,
      fragments: finalFragments,
      messages: newMessages,
      layout_data: translatedLayoutData, // <-- Dùng bản đã dịch
    };
  }

  /**
   * Parse và validate JSON thô từ LLM (cho Sequence Diagram)
   */
  private validateAndParseSequenceJson(jsonStr: string): any {
    console.log("--- RAW STRING TO PARSE (Sequence) ---");
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
      Array.isArray(parsedResponse.lifelines) &&
      Array.isArray(parsedResponse.messages)
    ) {
      console.log("✅ JSON structure is VALID (matches Sequence schema input)");
      return parsedResponse;
    }

    console.error("❌ VALIDATION FAILED. Parsed object:", parsedResponse);
    console.error(
      "❌ Invalid diagram JSON structure. Response did not contain 'name', 'lifelines', and 'messages'."
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
   * Một hàm chung để gửi prompt tới Gemini
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
   * Hàm Clean JSON
   */
  private cleanJsonString(text: string): string {
    if (!text) return "";
    let cleanedText = text.trim();

    const markdownMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
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
