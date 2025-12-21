import { ActivityEdge, ActivityNode, ActivityLane, ActivityDiagramDTO } from './interfaces';
import { ApiKeyService } from '../../../orchestrator/domain/ApiKeyService';
import { LLMService } from '../../../../shared/LLMService';
import { ObjectId } from 'mongodb';

const prompts = {
  'vi-VN': {
    activityDiagram: (requirementModelJson: string) => `BẠN LÀ MỘT CHUYÊN GIA UML VÀ KIẾN TRÚC SƯ HỆ THỐNG ĐẲNG CẤP THẾ GIỚI, chuyên tạo ra các SƠ ĐỒ HOẠT ĐỘNG (Activity Diagram) tối ưu và logic từ các mô hình yêu cầu nghiệp vụ.

Nhiệm vụ của bạn là phân tích mô hình yêu cầu sau đây và thiết kế một cấu trúc Sơ đồ Hoạt động (Activity Diagram) hoàn chỉnh và logic.

MÔ HÌNH YÊU CẦU:
${requirementModelJson}

QUAN TRỌNG
- Activity Diagram là sơ đồ mô tả luồng hoạt động (workflow) hoặc luồng nghiệp vụ (business flow).
- Sơ đồ PHẢI thể hiện RÕ:
  + Thứ tự các bước xử lý
  + Ai thực hiện từng bước (User / System / External System)
  + Điều kiện rẽ nhánh
  + Cách các luồng được hợp nhất (merge – mỗi merge phải có ≥ 2 luồng vào)
  + MỌI luồng sinh ra đều phải dẫn tới một điểm kết thúc hợp lệ (merge hoặc end)
- Giữ response NGẮN GỌN, chỉ bao gồm nodes và edges cần thiết.
- KHÔNG thêm ví dụ, giải thích, diễn giải.
- Ưu tiên thiết kế đơn giản, đúng chuẩn UML.
- KHÔNG được trả về mảng trực tiếp ngoài object JSON.

==================================================
QUY TẮC & LOGIC THIẾT KẾ CHUẨN UML (BẮT BUỘC)
==================================================

1. LANES (PHÂN LUỒNG TRÁCH NHIỆM)
- Diagram PHẢI có lanes.
- Mỗi lane đại diện cho đúng 1 actor hoặc hệ thống:
  + User
  + System
  + External System (nếu có)
- Mọi action PHẢI nằm trong đúng lane của chủ thể thực hiện.
- User KHÔNG được thực hiện logic xử lý nội bộ của System.

--------------------------------------------------
2. NODE TYPES BẮT BUỘC

- Start Node:
  + Có đúng 1 start trong toàn bộ diagram.

- End Node:
  + Có đúng 1 end trong toàn bộ diagram.

- Action Node:
  + Bắt buộc thuộc 1 lane xác định.
  + Chỉ được có đúng 1 outgoing edge.
  + Không được gắn condition.
  + Không được tự rẽ nhánh.

- Decision Node:
  + Có đúng 1 incoming edge.
  + Có từ 2 outgoing edges trở lên.
  + 100% outgoing edges PHẢI có condition.
  + Các condition phải loại trừ lẫn nhau (mutually exclusive).
  + Decision CHỈ dùng để rẽ nhánh, KHÔNG được là điểm kết thúc.

- Merge Node:
  + Dùng để hợp nhất các alternative flows.
  + Có ít nhất 2 incoming edges.
  + Các incoming edges PHẢI xuất phát từ CÙNG MỘT Decision.
  + Có đúng 1 outgoing edge.
  + KHÔNG có condition.
  + BẮT BUỘC sử dụng khi các nhánh từ Decision quay lại cùng một luồng xử lý.

--------------------------------------------------
3. QUY TẮC LUỒNG (FLOW INTEGRITY)

- MỌI node (trừ end) đều PHẢI có outgoing edge.
- MỌI nhánh sinh ra từ Decision:
  + Hoặc đi tới Merge
  + Hoặc đi trực tiếp tới End (ví dụ: cancel, failure, reject)
- KHÔNG được tồn tại luồng chết.
- Edges phải tạo thành luồng liên tục từ start → end.
- KHÔNG được tạo node cô lập.

--------------------------------------------------
4. RÀNG BUỘC EDGE

- Thuộc tính "condition":
  + CHỈ được dùng cho edges đi ra từ Decision Node.
  + KHÔNG được dùng cho Action, Merge, Start.
- Action Node:
  + Chỉ 1 outgoing edge.
- Decision Node:
  + Tối thiểu 2 outgoing edges.
  + Tất cả đều phải có condition.

--------------------------------------------------
5. CẤU TRÚC & ĐỊNH DANH

- ID của mỗi node phải là string DUY NHẤT.
- Node ID theo mẫu:
  [UCID]_[NodeType]_[Meaning]
  Ví dụ:
  UC1_Action_EnterCredentials
  UC1_Decision_AuthResult
  UC1_Merge_AfterAuth

--------------------------------------------------
6. VỊ TRÍ (POSITION)

- Mọi node PHẢI có position { x, y }.
- x ∈ [100, 1100]
- y ∈ [100, 1500]
- Node cùng lane → x gần nhau.
- y tăng dần theo thứ tự luồng xử lý.
- Decision rẽ nhánh → các nhánh lệch x trái/phải.
- Merge đặt phía dưới các nhánh hợp nhất.

--------------------------------------------------
7. USE CASE TRACEABILITY

- Node loại action / decision / merge PHẢI có requirement_ids.
- Nếu không xác định được → [].
- Start và End không cần requirement_ids.

--------------------------------------------------
8. PHÁT HIỆN NODE TỪ USE CASE

- Hành động của User / System → action
- Điều kiện kiểm tra → decision
- Điểm hội tụ các nhánh → merge
- KHÔNG được bỏ merge nếu nhiều nhánh quay lại cùng một luồng.

==================================================
BẮT BUỘC ĐẦU RA
==================================================

- Chỉ trả về DUY NHẤT 1 object JSON hợp lệ.
- KHÔNG trả về mảng ngoài object.
- KHÔNG markdown, KHÔNG giải thích.
- Object JSON PHẢI có đầy đủ các trường:
  - name (string)
  - description (string)
  - lanes (array)
  - nodes (array)
  - edges (array)
  - diagram_svg (null)
- Mỗi node và mỗi edge phải chứa ĐẦY ĐỦ các trường theo schema yêu cầu.
- Output phải sẵn sàng để hệ thống parse và render ngay lập tức.

ĐẦU RA: Chỉ trả về JSON object, KHÔNG markdown/code block. Cấu trúc:
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
    { "id": "n_update", "type": "action", "label": "Update Password", "lane_id": "lane_system", "position": { "x": 800, "y": 550 } },
    { "id": "n_show_error", "type": "action", "label": "Show Error Message", "lane_id": "lane_system", "position": { "x": 800, "y": 600 } },
    { "id": "n_success", "type": "action", "label": "Show Success Message", "lane_id": "lane_system", "position": { "x": 800, "y": 650 } },
    { "id": "n_merge", "type": "merge", "label": "Return to End", "lane_id": "lane_system", "position": { "x": 800, "y": 700 } },
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
  ]
}
`
  },

  'en-US': {
    activityDiagram: (requirementModelJson: string) => `YOU ARE A WORLD-CLASS UML EXPERT AND SYSTEM ARCHITECT, specializing in designing optimal and logically sound ACTIVITY DIAGRAMS from business requirement models.

Your task is to analyze the following requirement model and design a complete, correct, and well-structured Activity Diagram.

REQUIREMENT MODEL:
${requirementModelJson}

IMPORTANT
- An Activity Diagram represents a workflow or business flow.
- The diagram MUST CLEARLY show:
  + The sequence of processing steps
  + Who performs each step (User / System / External System)
  + Decision/branching conditions
  + How alternative flows are merged (each merge must have ≥ 2 incoming flows)
  + EVERY generated flow must lead to a valid end point (merge or end)
- Keep the response CONCISE, including only necessary nodes and edges.
- DO NOT add examples, explanations, or interpretations.
- Prefer a simple design that strictly follows UML standards.
- DO NOT return an array directly outside a JSON object.

==================================================
MANDATORY UML DESIGN RULES & LOGIC
==================================================

1. LANES (RESPONSIBILITY PARTITIONING)
- The diagram MUST include lanes.
- Each lane represents exactly ONE actor or system:
  + User
  + System
  + External System (if applicable)
- Every action MUST be placed in the correct lane.
- The User MUST NOT perform internal System logic.

--------------------------------------------------
2. REQUIRED NODE TYPES

- Start Node:
  + Exactly ONE start node in the entire diagram.

- End Node:
  + Exactly ONE end node in the entire diagram.

- Action Node:
  + Must belong to exactly one lane.
  + Must have exactly ONE outgoing edge.
  + Must NOT have conditions.
  + Must NOT branch.

- Decision Node:
  + Must have exactly ONE incoming edge.
  + Must have TWO OR MORE outgoing edges.
  + 100% of outgoing edges MUST have conditions.
  + Conditions must be mutually exclusive.
  + Decision nodes are ONLY for branching and MUST NOT be terminal.

- Merge Node:
  + Used to merge alternative flows.
  + Must have at least TWO incoming edges.
  + All incoming edges MUST originate from the SAME decision.
  + Must have exactly ONE outgoing edge.
  + Must NOT have conditions.
  + REQUIRED when multiple branches return to a single flow.

--------------------------------------------------
3. FLOW INTEGRITY RULES

- Every node (except End) MUST have an outgoing edge.
- Every branch created by a Decision:
  + Must go to a Merge
  + OR go directly to the End (e.g., cancel, failure, rejection)
- NO dead flows are allowed.
- Edges must form a continuous flow from start → end.
- NO isolated nodes are allowed.

--------------------------------------------------
4. EDGE CONSTRAINTS

- The "condition" attribute:
  + Is ONLY allowed on edges outgoing from Decision nodes.
  + Is NOT allowed on Action, Merge, or Start nodes.
- Action nodes:
  + Exactly ONE outgoing edge.
- Decision nodes:
  + Minimum TWO outgoing edges.
  + ALL must have conditions.

--------------------------------------------------
5. STRUCTURE & IDENTIFICATION

- Each node ID MUST be a UNIQUE string.
- Node ID format:
  [UCID]_[NodeType]_[Meaning]
  Examples:
  UC1_Action_EnterCredentials
  UC1_Decision_AuthResult
  UC1_Merge_AfterAuth

--------------------------------------------------
6. POSITIONING RULES

- Every node MUST have a position { x, y }.
- x ∈ [100, 1100]
- y ∈ [100, 1500]
- Nodes in the same lane → similar x values.
- y MUST increase following the process flow.
- Decision branches → diverge left/right on x-axis.
- Merge nodes MUST be placed below merged branches.

--------------------------------------------------
7. USE CASE TRACEABILITY

- Action / Decision / Merge nodes MUST include requirement_ids.
- If not determinable → [].
- Start and End nodes do NOT require requirement_ids.

--------------------------------------------------
8. NODE DISCOVERY FROM USE CASE

- User/System actions → Action nodes
- Conditional checks → Decision nodes
- Converging alternative flows → Merge nodes
- DO NOT omit a Merge if multiple branches return to one flow.

==================================================
MANDATORY OUTPUT
==================================================

- Return EXACTLY ONE valid JSON object.
- DO NOT return arrays outside a JSON object.
- NO markdown, NO explanations.
- The JSON object MUST include all fields:
  - name (string)
  - description (string)
  - lanes (array)
  - nodes (array)
  - edges (array)
  - diagram_svg (null)
- Every node and edge MUST include ALL required schema fields.
- The output MUST be immediately parsable and renderable by the system.

OUTPUT: Return ONLY JSON object, NO markdown/code blocks. Structure:
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
    { "id": "n_update", "type": "action", "label": "Update Password", "lane_id": "lane_system", "position": { "x": 800, "y": 550 } },
    { "id": "n_show_error", "type": "action", "label": "Show Error Message", "lane_id": "lane_system", "position": { "x": 800, "y": 600 } },
    { "id": "n_success", "type": "action", "label": "Show Success Message", "lane_id": "lane_system", "position": { "x": 800, "y": 650 } },
    { "id": "n_merge", "type": "merge", "label": "Return to End", "lane_id": "lane_system", "position": { "x": 800, "y": 700 } },
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
  ]
}`
  }
};

export class ActivityGeminiService {
  private apiKeyService = new ApiKeyService();
  private llmService = new LLMService(); // ✅ Sử dụng LLMService

  private async callGemini(prompt: string, userId?: string, projectId?: string): Promise<string> {
    // ✅ Sử dụng LLMService để lấy recommended model (ưu tiên model user đã chọn)
    const modelName = await this.llmService.getRecommendedModel(undefined, userId);

    try {
      const response = await this.llmService.callLLM({
        prompt: prompt,
        modelName: modelName,
        userId: userId,
        projectId: projectId,
        endpoint: 'generateActivityDiagram',
        isProductionFreeMode: true
      });

      return this.cleanJson(response.text);
    } catch (err: any) {
      console.error('❌ LLM call failed for activity diagram:', err.message);
      throw err;
    }
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

    // 4️⃣ Thử parse JSON, nếu fail throw error thay vì trả về fallback
    try {
      const parsed = JSON.parse(cleanedText);
      if (typeof parsed === 'object') return JSON.stringify(parsed); // đảm bảo là string JSON chuẩn
      throw new Error('Parsed result is not an object');
    } catch (parseError: any) {
      console.error('❌ Could not parse AI response:', parseError);
      throw new Error(`Failed to parse AI response: ${parseError.message || 'Invalid JSON format'}`);
    }
  }

  async generateFromUseCase(requirements: any[], language: string, userId?: string, projectId?: string): Promise<ActivityDiagramDTO> {
    console.log('--- generateFromUseCase START ---');
    console.log('Input requirements:', JSON.stringify(requirements, null, 2));

    const simplified = requirements.map(r => ({
      name: r.name,
      goal: r.goal,
      main_flow: (r as any).main_flow || r.tasks, // Hỗ trợ cả main_flow (mới) và tasks (cũ)
      inputs: r.inputs,
      outputs: r.outputs,
      context: typeof r.context === 'object' ? r.context : { module: r.context || '', scope: '', system: '' },
      rules: r.rules,
      trigger: (r as any).trigger || (r.triggers ? { event: r.triggers[0] || 'User initiates action', source: 'UI' } : { event: 'User initiates action', source: 'UI' }),
      preconditions: r.preconditions,
      postconditions: r.postconditions,
      exceptions: r.exceptions,
      non_functional_constraints: (r as any).non_functional_constraints || r.constraints || []
    }));

    const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
    const prompt = prompts[lang].activityDiagram(JSON.stringify(simplified, null, 2));

    console.log('Prompt sent to AI (preview):', prompt.substring(0, 400));

    // ✅ MỚI: Token analysis trước khi gọi LLM
    const { getModelConfig, logTokenInfo } = await import("../../../../shared/tokenManager");
    const modelName = await this.llmService.getRecommendedModel(undefined, userId);
    // ✅ CẢI THIỆN: Set isProductionFreeMode = false để cho phép model có phí (user đã chọn)
    const modelConfig = getModelConfig(modelName, undefined, false);
    logTokenInfo(prompt, modelConfig, '[UML Activity Diagram]');

    // ✅ Không catch error ở đây - để service layer xử lý và emit failed event
    const raw = await this.callGemini(prompt, userId, projectId);
    console.log('Raw AI response length:', raw.length);

    const cleanedJson = this.cleanJson(raw);
    console.log('Cleaned JSON preview:', cleanedJson.substring(0, 400));

    // ✅ cleanJson sẽ throw error nếu parse fail, không cần fallback
    const parsed = JSON.parse(cleanedJson);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid response from AI: response is not an object');
    }

    const lanes: ActivityLane[] = Array.isArray(parsed.lanes) ? parsed.lanes : [];
    let nodes: ActivityNode[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    let edges: ActivityEdge[] = Array.isArray(parsed.edges) ? parsed.edges : [];

    // ✅ Validate rằng có ít nhất nodes hoặc lanes
    if (nodes.length === 0 && lanes.length === 0) {
      throw new Error('Invalid response from AI: no nodes or lanes generated');
    }

    // ✅ Đảm bảo chỉ có 1 start node và 1 end node duy nhất
    const startNodes = nodes.filter(n => n.type === 'start');
    const endNodes = nodes.filter(n => n.type === 'end');

    if (startNodes.length === 0) {
      throw new Error('Invalid response from AI: missing start node');
    }
    if (endNodes.length === 0) {
      throw new Error('Invalid response from AI: missing end node');
    }

    let finalNodes = [...nodes];
    let finalEdges = [...edges];

    // Nếu có nhiều start nodes, chỉ giữ lại node đầu tiên và chuyển edges
    if (startNodes.length > 1) {
      console.warn(`⚠️ [Activity Diagram] Found ${startNodes.length} start nodes, keeping only the first one`);
      const keptStartNodeId = startNodes[0].id;
      const removedStartNodeIds = startNodes.slice(1).map(n => n.id);

      // Chuyển tất cả edges từ các start nodes bị xóa sang start node được giữ lại
      finalEdges = finalEdges.map(edge => {
        if (removedStartNodeIds.includes(edge.from)) {
          return { ...edge, from: keptStartNodeId };
        }
        return edge;
      });

      // Loại bỏ các start nodes thừa
      finalNodes = finalNodes.filter(n => !(n.type === 'start' && n.id !== keptStartNodeId));
    }

    // Nếu có nhiều end nodes, chỉ giữ lại node đầu tiên và chuyển edges
    if (endNodes.length > 1) {
      console.warn(`⚠️ [Activity Diagram] Found ${endNodes.length} end nodes, keeping only the first one`);
      const keptEndNodeId = endNodes[0].id;
      const removedEndNodeIds = endNodes.slice(1).map(n => n.id);

      // Chuyển tất cả edges đến các end nodes bị xóa sang end node được giữ lại
      finalEdges = finalEdges.map(edge => {
        if (removedEndNodeIds.includes(edge.to)) {
          return { ...edge, to: keptEndNodeId };
        }
        return edge;
      });

      // Loại bỏ các end nodes thừa
      finalNodes = finalNodes.filter(n => !(n.type === 'end' && n.id !== keptEndNodeId));
    }

    // Loại bỏ các edges trùng lặp sau khi merge
    const uniqueEdges = finalEdges.filter((edge, index, self) =>
      index === self.findIndex(e => e.from === edge.from && e.to === edge.to)
    );

    nodes = finalNodes;
    edges = uniqueEdges;

    // Translate string IDs to ObjectIds (giống sequence diagram)
    const translated = this.translateKeysToIds({
      name: parsed?.name || 'Generated Activity',
      description: typeof parsed?.description === 'string' ? parsed.description : '',
      lanes,
      nodes,
      edges
    });

    console.log('Final ActivityDiagramDTO (translated):', JSON.stringify(translated, null, 2));
    console.log('--- generateFromUseCase END ---');

    return translated;
  }

  /**
   * Translate string keys/IDs to ObjectIds (giống sequence diagram)
   * Chuyển đổi từ format AI trả về (string IDs) sang format DB (ObjectIds)
   */
  private translateKeysToIds(diagramJson: any): ActivityDiagramDTO {
    const nodeIdMap = new Map<string, ObjectId>();
    const laneIdMap = new Map<string, ObjectId>();

    // Bước 1: Tạo ID và Map cho Lanes
    const lanesWithIds = (diagramJson.lanes || []).map((lane: any) => {
      const newId = new ObjectId();
      const laneKey = lane.id || lane.name; // Sử dụng id hoặc name làm key
      if (laneKey) {
        laneIdMap.set(laneKey, newId);
      }
      const { id, ...rest } = lane; // Xóa id string
      return { ...rest, _id: newId };
    });

    // Bước 2: Tạo ID và Map cho Nodes
    const nodesWithIds = (diagramJson.nodes || []).map((node: any) => {
      const newId = new ObjectId();
      const nodeKey = node.id; // Sử dụng id string từ AI
      if (nodeKey) {
        nodeIdMap.set(nodeKey, newId);
      }

      // Dịch lane_id từ string sang ObjectId nếu có
      let laneId = null;
      if (node.lane_id) {
        laneId = laneIdMap.get(node.lane_id) || null;
      }

      const { id, lane_id, ...rest } = node; // Xóa id và lane_id string
      return {
        ...rest,
        _id: newId,
        lane_id: laneId
      };
    });

    // Bước 3: Dịch mảng edges - chuyển from/to từ string sang ObjectId
    const edgesWithIds = (diagramJson.edges || [])
      .map((edge: any) => {
        const fromId = nodeIdMap.get(edge.from);
        const toId = nodeIdMap.get(edge.to);

        if (fromId && toId) {
          const { from, to, ...rest } = edge;
          return {
            ...rest,
            _id: new ObjectId(),
            from: fromId,
            to: toId
          };
        }
        console.warn(
          `[DATA_WARN] Bỏ qua edge bị lỗi (không tìm thấy node): ${edge.from} -> ${edge.to}`
        );
        return null;
      })
      .filter((e: any) => e !== null);

    return {
      name: diagramJson.name || 'Generated Activity',
      description: diagramJson.description || '',
      lanes: lanesWithIds,
      nodes: nodesWithIds,
      edges: edgesWithIds
    };
  }
}
