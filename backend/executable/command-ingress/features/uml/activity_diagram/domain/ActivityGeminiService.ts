import { ActivityEdge, ActivityNode, ActivityLane, ActivityDiagramDTO } from './interfaces';
import { ApiKeyService } from '../../../orchestrator/domain/ApiKeyService';
import { Types } from 'mongoose';

const prompts = {
  'vi-VN': {
    activityDiagram: (requirementModelJson: string) => `
BẠN LÀ MỘT CHUYÊN GIA UML VÀ KIẾN TRÚC SƯ HỆ THỐNG ĐẲNG CẤP THẾ GIỚI, chuyên tạo ra các SƠ ĐỒ HOẠT ĐỘNG (Activity Diagram) tối ưu và logic từ các mô hình yêu cầu nghiệp vụ.
Nhiệm vụ của bạn là phân tích mô hình yêu cầu sau đây và thiết kế một cấu trúc Sơ đồ Hoạt động (Activity Diagram) hoàn chỉnh và logic.

MÔ HÌNH YÊU CẦU:
${requirementModelJson}

**QUAN TRỌNG:**
- Activity diagram đúng chuẩn là : sơ đồ mô tả luồng hoạt động (workflow) hoặc luồng nghiệp vụ (business flow) bằng cách biểu diễn các hành động, 
quyết định, rẽ nhánh, song song và kết thúc của một quy trình. Nó cho thấy thứ tự các bước, ai thực hiện, điều kiện xảy ra, và cách các dòng chảy 
hợp nhất trở lại.
- Giữ response CÀNG NGẮN GỌN CÀNG TỐT, chỉ bao gồm các nodes và edges thực sự cần thiết.
- KHÔNG thêm ví dụ, giải thích, hoặc nội dung thừa.
- Ưu tiên thiết kế đơn giản, hiệu quả, tuân thủ chuẩn UML.
- *KHÔNG được trả về mảng trực tiếp*.
**QUY TẮC VÀ LOGIC THIẾT KẾ CHUẨN UML:**
1. **NODE TYPES BẮT BUỘC:**
   - Phải có 1 start và 1 end.
   - Mọi action phải nằm trong một lane.
   - Decision luôn phải có điều kiện trên các nhánh đi ra.
   - Merge phải được dùng để đóng các nhánh phát sinh từ decision.
   - Edges phải tạo luồng liên tục từ start → end.
   - Không được tạo các node “cô lập” không liên kết.
   - Chỉ decision mới được phép có “condition”.
   - Action không được có quá nhiều nhánh đi ra (1 hoặc 2 nếu có exception).
2. **CẤU TRÚC VÀ TÍNH DUY NHẤT:**
   - **ID** của node phải là **string duy nhất** trong toàn bộ sơ đồ.
   - **Edges** phải đảm bảo luồng hoạt động **liên tục** từ 'start' đến 'end'.
   - **Node ID** nên theo mẫu: '[UCID]_[LoaiNode]' (ví dụ: 'UC1_ActionA').
   - mỗi decision đều phải có ít nhất 2 edges với condition(đúng/sai hoặc có/không)
3. **RÀNG BUỘC EDGE:**
   - **"condition"** chỉ được dùng cho edges đi ra từ **"decision"** node.
   - Tất cả các edges đi ra từ node **"decision"** phải có **"condition"** rõ ràng, mỗi decision đều phải có ít nhất 2 edges(đúng/sai hoặc có/không)
   - Với các node là action thì chỉ được có 1 Edges để đi đến node khác hoặc đến node end khi đã kết thúc.
4. **CỘT HỆ THỐNG:**
   - Trường **"diagram_svg"** = null.
   - Trường **"label"** là **bắt buộc** với **"action"**, **"decision"**, **"merge"**.
   - Trường **"position"** là **bắt buộc** cho TẤT CẢ các nodes, phải là object với **"x"** và **"y"** (số nguyên).
   - **Position** phải được tính toán hợp lý: nodes trong cùng lane nên có X tương tự nhau, Y tăng dần theo thứ tự luồng.
   - X nên nằm trong khoảng 100-1100, Y nên nằm trong khoảng 100-1500.
5. **XÁC ĐỊNH USE CASE:**
   - Node loại **"action"**, **"decision"**, **"merge"** phải có **requirement_ids** tương ứng.
   - Nếu không rõ nguồn, để **[]**.
**PHÁT HIỆN NODE TỪ USE CASE:**
- Mỗi hành động → **action**
- Mỗi điều kiện rẽ nhánh → **decision**
- Mỗi điểm hội tụ → **merge**
⚠️ BẮT BUỘC:
1. Luôn trả về một **object JSON** với đầy đủ các trường:
   - name (string) 
   - description (string)
   - lanes (array)
   - nodes (array)
   - edges (array)
   - diagram_svg (null)
2. Tuyệt đối KHÔNG trả về mảng ngoài object.
Phản hồi của bạn BẮT BUỘC CHỈ LÀ một đối tượng JSON hợp lệ.
KHÔNG bao gồm bất kỳ lời giải thích, bình luận, hay định dạng markdown nào như \`\`\`json.
Đầu ra phải sẵn sàng để được một chương trình phân tích ngay lập tức.
Đối tượng JSON BẮT BUỘC phải tuân thủ nghiêm ngặt cấu trúc chi tiết sau.
Bao gồm TẤT CẢ các trường cho mỗi node và edge.
Dưới dây là 1 ví dụ:
{
  "name": "Password Change Flow",
  "description": "Activity diagram mô tả quy trình đổi mật khẩu người dùng.",
  "lanes": [
    { "id": "lane_user", "name": "User" },
    { "id": "lane_system", "name": "System" }
  ],
  "nodes": [
    { "id": "n_start", "type": "start", "label": "Start", "lane_id": "lane_user", "position": { "x": 300, "y": 100 } },

    { "id": "n_select_change", "type": "action", "label": "Select Change Password", "lane_id": "lane_user", "position": { "x": 300, "y": 200 } },

    { "id": "n_show_form", "type": "action", "label": "Show Change Password Form", "lane_id": "lane_system", "position": { "x": 800, "y": 200 } },

    { "id": "n_input", "type": "action", "label": "Input Old/New Password", "lane_id": "lane_user", "position": { "x": 300, "y": 300 } },

    { "id": "n_confirm_cancel", "type": "decision", "label": "Confirm or Cancel?", "lane_id": "lane_user", "position": { "x": 300, "y": 400 } },

    { "id": "n_check_valid", "type": "action", "label": "Validate New Password", "lane_id": "lane_system", "position": { "x": 800, "y": 400 } },

    { "id": "n_decision_valid", "type": "decision", "label": "Password Valid?", "lane_id": "lane_system", "position": { "x": 800, "y": 500 } },

    { "id": "n_show_error", "type": "action", "label": "Show Error Message", "lane_id": "lane_system", "position": { "x": 800, "y": 600 } },

    { "id": "n_merge", "type": "merge", "label": "Return to End", "lane_id": "lane_system", "position": { "x": 800, "y": 700 } },

    { "id": "n_update", "type": "action", "label": "Update Password", "lane_id": "lane_system", "position": { "x": 800, "y": 550 } },

    { "id": "n_success", "type": "action", "label": "Show Success Message", "lane_id": "lane_system", "position": { "x": 800, "y": 650 } },

    { "id": "n_end", "type": "end", "label": "End", "lane_id": "lane_system", "position": { "x": 800, "y": 800 } }
  ],
  "edges": [
    { "from": "n_start", "to": "n_select_change" },

    { "from": "n_select_change", "to": "n_show_form" },

    { "from": "n_show_form", "to": "n_input" },

    { "from": "n_input", "to": "n_confirm_cancel" },

    { "from": "n_confirm_cancel", "to": "n_check_valid", "condition": "Confirm" },

    { "from": "n_confirm_cancel", "to": "n_merge", "condition": "Cancel" },

    { "from": "n_check_valid", "to": "n_decision_valid" },

    { "from": "n_decision_valid", "to": "n_show_error", "condition": "Invalid" },

    { "from": "n_show_error", "to": "n_show_form" },

    { "from": "n_decision_valid", "to": "n_update", "condition": "Valid" },

    { "from": "n_update", "to": "n_success" },

    { "from": "n_success", "to": "n_merge" },

    { "from": "n_merge", "to": "n_end" }
  ],
  "diagram_svg": "",
}
`
  },

  'en-US': {
    activityDiagram: (requirementModelJson: string) => `
YOU ARE A WORLD-CLASS UML EXPERT AND SYSTEM ARCHITECT, specializing in creating optimal, logical Activity Diagrams from business requirement models.
Your task is to analyze the following requirement model and design a complete and logical Activity Diagram structure.
REQUIREMENT MODEL:
${requirementModelJson}

**IMPORTANT:**
- A standard activity diagram is: a diagram that describes the workflow or business flow by representing the actions,
decisions, branches, parallelism, and termination of a process. It shows the order of steps, who performs them, what conditions occur, and how the flows
reconcile back.
- Keep the response AS SHORT AS POSSIBLE, including only the nodes and edges that are truly necessary.
- DO NOT add examples, explanations, or redundant content.
- Prioritize simple, efficient, UML-compliant designs.
- *DO NOT return arrays directly*.
**UML STANDARD DESIGN RULES AND LOGIC:**
1. **REQUIRED NODE TYPES:**
- Must have 1 start and 1 end.
- Every action must be in a lane.
- Decision must always have conditions on outgoing branches.
- Merge must be used to close branches arising from decision.
- Edges must create a continuous flow from start → end.
- Do not create “isolated” nodes that are not connected.
- Only decisions are allowed to have “conditions”.
- Actions must not have too many outgoing branches (1 or 2 if there is an exception).
2. **STRUCTURE AND UNIQUENESS:**
- The **ID** of a node must be a **unique string** in the entire diagram.
- **Edges** must ensure a **continuous** flow of operations from 'start' to 'end'.
- Each decision must have at least 2 edges with a condition (true/false or yes/no).
- **Node ID** should follow the pattern: '[UCID]_[LoaiNode]' (e.g., 'UC1_ActionA').
3. **EDGE CONSTRAINTS:**
- **"condition"** is only used for edges coming from the **"decision"** node.
- All edges coming from the **"decision"** node must have an explicit **"condition"**,Each decision must have at least two branches (true/false or yes/no).
- For action nodes, there can only be 1 Edge to go to another node or to the end node when finished.
4. **SYSTEM COLUMNS:**
   - Field **"diagram_svg"** = null.
   - Field **"label"** is **required** for **"action"**, **"decision"**, **"merge"**.
   - Field **"position"** is **required** for ALL nodes, must be an object with **"x"** and **"y"** (integers).
   - **Position** must be calculated logically: nodes in the same lane should have similar X values, Y increases along the flow order.
   - X should be in range 100-1100, Y should be in range 100-1500.
5. **DETERMINING USE CASE:**
   - Nodes of type **"action"**, **"decision"**, **"merge"** must have corresponding **requirement_ids**.
If the source is unknown, leave **[]**.
**DETECTING NODE FROM USE CASE:**
- Each action → **action**
- Each branch condition → **decision**
- Each convergence point → **merge**
⚠️ REQUIRED:
1. Always return a **JSON object** with full fields:
- name (string)
- description (string)
- lanes (array)
- nodes (array)
- edges (array)
- diagram_svg (null)
2. Absolutely DO NOT return arrays outside of objects.
Your response MUST BE ONLY a valid JSON object.
Do NOT include any explanations, comments, or markdown formatting such as \`\`\`json.
The output must be ready to be parsed immediately by a program.
The JSON object MUST strictly adhere to the following detailed structure.
Include ALL fields for each node and edge.
Return ONLY a single, valid JSON object with:
{
  "name": "Password Change Flow",
  "description": "Activity diagram mô tả quy trình đổi mật khẩu người dùng.",
  "lanes": [
    { "id": "lane_user", "name": "User" },
    { "id": "lane_system", "name": "System" }
  ],
  "nodes": [
    { "id": "n_start", "type": "start", "label": "Start", "lane_id": "lane_user", "position": { "x": 300, "y": 100 } },

    { "id": "n_select_change", "type": "action", "label": "Select Change Password", "lane_id": "lane_user", "position": { "x": 300, "y": 200 } },

    { "id": "n_show_form", "type": "action", "label": "Show Change Password Form", "lane_id": "lane_system", "position": { "x": 800, "y": 200 } },

    { "id": "n_input", "type": "action", "label": "Input Old/New Password", "lane_id": "lane_user", "position": { "x": 300, "y": 300 } },

    { "id": "n_confirm_cancel", "type": "decision", "label": "Confirm or Cancel?", "lane_id": "lane_user", "position": { "x": 300, "y": 400 } },

    { "id": "n_check_valid", "type": "action", "label": "Validate New Password", "lane_id": "lane_system", "position": { "x": 800, "y": 400 } },

    { "id": "n_decision_valid", "type": "decision", "label": "Password Valid?", "lane_id": "lane_system", "position": { "x": 800, "y": 500 } },

    { "id": "n_show_error", "type": "action", "label": "Show Error Message", "lane_id": "lane_system", "position": { "x": 800, "y": 600 } },

    { "id": "n_merge", "type": "merge", "label": "Return to End", "lane_id": "lane_system", "position": { "x": 800, "y": 700 } },

    { "id": "n_update", "type": "action", "label": "Update Password", "lane_id": "lane_system", "position": { "x": 800, "y": 550 } },

    { "id": "n_success", "type": "action", "label": "Show Success Message", "lane_id": "lane_system", "position": { "x": 800, "y": 650 } },

    { "id": "n_end", "type": "end", "label": "End", "lane_id": "lane_system", "position": { "x": 800, "y": 800 } }
  ],
  "edges": [
    { "from": "n_start", "to": "n_select_change" },

    { "from": "n_select_change", "to": "n_show_form" },

    { "from": "n_show_form", "to": "n_input" },

    { "from": "n_input", "to": "n_confirm_cancel" },

    { "from": "n_confirm_cancel", "to": "n_check_valid", "condition": "Confirm" },

    { "from": "n_confirm_cancel", "to": "n_merge", "condition": "Cancel" },

    { "from": "n_check_valid", "to": "n_decision_valid" },

    { "from": "n_decision_valid", "to": "n_show_error", "condition": "Invalid" },

    { "from": "n_show_error", "to": "n_show_form" },

    { "from": "n_decision_valid", "to": "n_update", "condition": "Valid" },

    { "from": "n_update", "to": "n_success" },

    { "from": "n_success", "to": "n_merge" },

    { "from": "n_merge", "to": "n_end" }
  ],
  "diagram_svg": ""
}
`
  }
};

export class ActivityGeminiService {
  private apiKeyService = new ApiKeyService();

  private async callGemini(prompt: string, userId?: string, projectId?: string): Promise<string> {
    const keys = await this.apiKeyService.getAllActiveKeys("gemini");
    let lastError: any;

    for (const k of keys) {
      const startTime = Date.now();
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const client = new GoogleGenerativeAI(k.key_value);
        const modelName = k.model_name || 'gemini-2.0-flash-001';
        const model = client.getGenerativeModel({ model: modelName });

        const resp: any = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });

        const responseTime = Date.now() - startTime;
        const { logApiUsage, extractGeminiTokens } = await import("../../../../features/stats/domain/apiUsageLogger");
        const tokens = extractGeminiTokens(resp);

        logApiUsage({
          api_key_id: k._id.toString(),
          provider: 'gemini',
          model_name: modelName,
          user_id: userId,
          project_id: projectId,
          request_type: 'text',
          endpoint: 'generateActivityDiagram',
          ...tokens,
          status: 'success',
          status_code: 200,
          response_time: responseTime,
        }).catch(err => console.error('Failed to log API usage:', err));

        const text: string = resp?.response?.text?.() || "";
        return this.cleanJson(text);

      } catch (err: any) {
        const responseTime = Date.now() - startTime;
        lastError = err;
        const msg = (err?.message || '').toLowerCase();

        const { logApiUsage } = await import("../../../../features/stats/domain/apiUsageLogger");
        const modelName = k.model_name || 'gemini-2.0-flash-001';
        logApiUsage({
          api_key_id: k._id.toString(),
          provider: 'gemini',
          model_name: modelName,
          user_id: userId,
          project_id: projectId,
          request_type: 'text',
          endpoint: 'generateActivityDiagram',
          status: 'failed',
          status_code: err.status || 500,
          error_message: err.message || 'Unknown error',
          response_time: responseTime,
        }).catch(logErr => console.error('Failed to log API usage:', logErr));

        if (msg.includes('invalid') || msg.includes('unauthorized')) {
          try {
            await this.apiKeyService.disableKey(k._id);
          } catch { }
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
      name: r.name,
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
    const lanes: ActivityLane[] = Array.isArray(parsed.lanes) ? parsed.lanes : [];
    const nodes: ActivityNode[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const edges: ActivityEdge[] = Array.isArray(parsed.edges) ? parsed.edges : [];

    const result: ActivityDiagramDTO = {
      name: parsed?.name || 'Generated Activity',
      description: typeof parsed?.description === 'string' ? parsed.description : '',
      lanes,
      nodes,
      edges
    };

    console.log('Final ActivityDiagramDTO:', JSON.stringify(result, null, 2));
    console.log('--- generateFromUseCase END ---');

    return result;
  }
}
