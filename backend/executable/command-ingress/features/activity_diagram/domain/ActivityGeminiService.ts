import { ActivityEdge, ActivityNode, ActivityDiagramDTO } from './interfaces';
import { ApiKeyService } from '../../orchestrator/domain/ApiKeyService';
import { Types } from 'mongoose';

const prompts = {
  'vi-VN': {
    activityDiagram: (requirementModelJson: string) => `
BẠN LÀ MỘT CHUYÊN GIA UML VÀ KIẾN TRÚC SƯ HỆ THỐNG ĐẲNG CẤP THẾ GIỚI, chuyên tạo ra các SƠ ĐỒ HOẠT ĐỘNG (Activity Diagram) tối ưu và logic từ các mô hình yêu cầu nghiệp vụ.

Nhiệm vụ của bạn là phân tích mô hình yêu cầu sau đây và thiết kế một cấu trúc Sơ đồ Hoạt động (Activity Diagram) hoàn chỉnh và logic.

MÔ HÌNH YÊU CẦU:
${requirementModelJson}

**QUAN TRỌNG:**
- Giữ response CÀNG NGẮN GỌN CÀNG TỐT, chỉ bao gồm các nodes và edges thực sự cần thiết.
- KHÔNG thêm ví dụ, giải thích, hoặc nội dung thừa.
- Ưu tiên thiết kế đơn giản, hiệu quả, tuân thủ chuẩn UML.
- *KHÔNG được trả về mảng trực tiếp*.

⚠️ BẮT BUỘC:
1. Luôn trả về một **object JSON** với đầy đủ các trường:
   - name (string)
   - description (string)
   - nodes (array)
   - edges (array)
   - diagram_svg (null)
2. Tuyệt đối KHÔNG trả về mảng ngoài object.

Phản hồi của bạn BẮT BUỘC CHỈ LÀ một đối tượng JSON hợp lệ.
KHÔNG bao gồm bất kỳ lời giải thích, bình luận, hay định dạng markdown nào như \`\`\`json.
Đầu ra phải sẵn sàng để được một chương trình phân tích ngay lập tức.

Đối tượng JSON BẮT BUỘC phải tuân thủ nghiêm ngặt cấu trúc chi tiết sau.
Bao gồm TẤT CẢ các trường cho mỗi node và edge.

{
  "name": "TenSoDoHoatDong",
  "description": "Mô tả ngắn gọn nhưng rõ ràng về luồng hoạt động được mô hình hóa.",
  "nodes": [
    { 
      "id": "start", 
      "type": "start", 
      "label": "Bắt đầu luồng", 
      "requirement_ids": [] 
    },
    { 
      "id": "UC1_ActionA", 
      "type": "action", 
      "label": "Thực hiện hành động A", 
      "requirement_ids": ["UC1"] 
    },
    { 
      "id": "UC2_DecisionB", 
      "type": "decision", "
      label": "Kiểm tra điều kiện B", 
      "requirement_ids": ["UC2"] 
    },
    { 
      "id": "end", 
      "type": "end", 
      "label": "Kết thúc luồng", 
      "requirement_ids": [] 
    }
  ],
  "edges": [
    { 
      "from": "start", 
      "to": "UC1_ActionA", 
      "condition": null 
    },
    { 
      "from": "UC1_ActionA", 
      "to": "UC2_DecisionB", 
      "condition": null 
    },
    { 
      "from": "UC2_DecisionB", 
      "to": "end", "condition": 
      "Nếu đúng (True)" 
    },
    { 
      "from": "UC2_DecisionB", 
      "to": "UC1_ActionA", 
      "condition": "Nếu sai (False)" 
    }
  ],
  "diagram_svg": null
}

**QUY TẮC VÀ LOGIC THIẾT KẾ CHUẨN UML:**

1. **NODE TYPES BẮT BUỘC:**
   - Phải có **đúng 1** node type **"start"**
   - Phải có **ít nhất 1** node type **"end"**
   - Các loại node khác: **"action"**, **"decision"**, **"merge"**

2. **CẤU TRÚC VÀ TÍNH DUY NHẤT:**
   - **ID** của node phải là **string duy nhất** trong toàn bộ sơ đồ.
   - **Edges** phải đảm bảo luồng hoạt động **liên tục** từ 'start' đến 'end'.
   - **Node ID** nên theo mẫu: '[UCID]_[LoaiNode]' (ví dụ: 'UC1_ActionA').

3. **RÀNG BUỘC EDGE:**
   - **"condition"** chỉ được dùng cho edges đi ra từ **"decision"** node.
   - Tất cả các edges đi ra từ node **"decision"** phải có **"condition"** rõ ràng.

4. **CỘT HỆ THỐNG:**
   - Trường **"diagram_svg"** = null.
   - Trường **"label"** là **bắt buộc** với **"action"**, **"decision"**, **"merge"**.

5. **XÁC ĐỊNH USE CASE:**
   - Node loại **"action"**, **"decision"**, **"merge"** phải có **requirement_ids** tương ứng.
   - Nếu không rõ nguồn, để **[]**.

**PHÁT HIỆN NODE TỪ USE CASE:**
- Mỗi hành động → **action**
- Mỗi điều kiện rẽ nhánh → **decision**
- Mỗi điểm hội tụ → **merge**
`
  },

  'en-US': {
    activityDiagram: (requirementModelJson: string) => `
YOU ARE A WORLD-CLASS UML EXPERT AND SYSTEM ARCHITECT, specializing in creating optimal, logical Activity Diagrams from business requirement models.

Your task is to analyze the following requirement model and design a complete and logical Activity Diagram structure.

REQUIREMENT MODEL:
${requirementModelJson}

**IMPORTANT:**
- Keep the response AS CONCISE AS POSSIBLE.
- Include only essential nodes and edges.
- DO NOT include examples, explanations, or markdown formatting.

Return ONLY a single, valid JSON object with:
{
  "name": "ActivityDiagramName",
  "description": "A brief but clear description of the modeled activity flow.",
  "nodes": [
    { 
      "id": "start", 
      "type": "start", 
      "label": "Start Flow", 
      "requirement_ids": [] 
    },
    { 
      "id": "UC1_ActionA", 
      "type": "action", "label": 
      "Perform Action A", 
      "requirement_ids": ["UC1"] 
    },
    { 
      "id": "UC2_DecisionB", 
      "type": "decision", 
      "label": "Check Condition B", 
      "requirement_ids": ["UC2"] 
    },
    { 
      "id": "end", 
      "type": "end", 
      "label": "End Flow", 
      "requirement_ids": [] 
    }
  ],
  "edges": [
    { 
      "from": "start", 
      "to": "UC1_ActionA", 
      "condition": null 
    },
    { 
      "from": "UC1_ActionA", 
      "to": "UC2_DecisionB", 
      "condition": null 
    },
    { 
      "from": "UC2_DecisionB", 
      "to": "end", 
      "condition": "True" 
    },
    { 
      "from": "UC2_DecisionB", 
      "to": "UC1_ActionA", 
      "condition": "False" 
    }
  ],
  "diagram_svg": null
}
`
  }
};

export class ActivityGeminiService {
  private apiKeyService = new ApiKeyService();

  private async callGemini(prompt: string): Promise<string> {
    const keys = await this.apiKeyService.getAllActiveKeys("gemini");
    let lastError: any;

    for (const k of keys) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const client = new GoogleGenerativeAI(k.key_value);
        const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

        const resp: any = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });

        const text: string = resp?.response?.text?.() || "";
        return this.cleanJson(text);

      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || '').toLowerCase();

        if (msg.includes('invalid') || msg.includes('unauthorized')) {
          try {
            await this.apiKeyService.disableKey(k._id);
          } catch {}
        }
        continue;
      }
    }
    throw lastError || new Error("All Gemini keys failed for activity generation.");
  }

  private cleanJson(text: string): string {
     if (!text) return '';

    let cleanedText = text.trim();

    // 1️⃣ Loại bỏ code block ```json ... ``` hoặc ``` ... ```
    cleanedText = cleanedText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');

    // 2️⃣ Loại bỏ inline code `...`
    cleanedText = cleanedText.replace(/`([^`]+)`/g, '$1');

    // 3️⃣ Loại bỏ các dòng thừa
    const lines = cleanedText.split('\n').filter(line => {
        const l = line.trim();
        return !l.match(/^(Đây là|Here is|Output:|Kết quả:|JSON:|===|---)/i)
            && !l.match(/^[#*-]{3,}/)
            && !l.match(/^(Ví dụ|Example):/i);
    });
    cleanedText = lines.join('\n').trim();

    // 4️⃣ Thử parse JSON, nếu fail trả về fallback object
    try {
        const parsed = JSON.parse(cleanedText);
        if (typeof parsed === 'object') return JSON.stringify(parsed); // đảm bảo là string JSON chuẩn
    } catch {
        console.warn('⚠️ Could not parse AI response, using fallback ActivityDiagram.');
        return null;
    }
  }

  async generateFromUseCase(requirements: any[], language: string): Promise<ActivityDiagramDTO> {
    console.log('--- generateFromUseCase START ---');
    console.log('Input requirements:', JSON.stringify(requirements, null, 2));

    const simplified = requirements.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      goal: r.goal,
      tasks: r.tasks,
      inputs: r.inputs,
      outputs: r.outputs,
      context: r.context,
      rules: r.rules,
      triggers: r.triggers,
      preconditions: r.preconditions,
      postconditions: r.postconditions,
      exceptions: r.exceptions,
      constraints: r.constraints
    }));

    const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
    const prompt = prompts[lang].activityDiagram(JSON.stringify(simplified, null, 2));

    console.log('Prompt sent to AI (preview):', prompt.substring(0, 400));

    let raw = '';
    try {
      raw = await this.callGemini(prompt);
      console.log('Raw AI response length:', raw.length);
    } catch (err) {
      console.error('Error calling AI service:', err);
    }

    const cleanedJson = this.cleanJson(raw);
    console.log('Cleaned JSON preview:', cleanedJson.substring(0, 400));

    let parsed: any = {};
    try {
      parsed = cleanedJson ? JSON.parse(cleanedJson) : {};
    } catch (err) {
      console.error('Error parsing cleaned AI response:', err);
      parsed = {};
    }

    const nodes: ActivityNode[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const edges: ActivityEdge[] = Array.isArray(parsed.edges) ? parsed.edges : [];

    const result: ActivityDiagramDTO = {
      name: parsed?.name || 'Generated Activity',
      description: typeof parsed?.description === 'string' ? parsed.description : '',
      nodes,
      edges,
      diagram_svg: typeof parsed?.diagram_svg === 'string' ? parsed.diagram_svg : ''
    };

    console.log('Final ActivityDiagramDTO:', JSON.stringify(result, null, 2));
    console.log('--- generateFromUseCase END ---');

    return result;
  }
}
