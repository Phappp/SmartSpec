import { ActivityEdge, ActivityNode, ActivityLane, ActivityDiagramDTO } from './interfaces';
import { ApiKeyService } from '../../../orchestrator/domain/ApiKeyService';
import { LLMService } from '../../../../shared/LLMService';
import { ObjectId } from 'mongodb';

const prompts = {
  'vi-VN': {
    activityDiagram: (requirementModelJson: string) => `BẠN LÀ CHUYÊN GIA UML, tạo Activity Diagram từ yêu cầu nghiệp vụ.

YÊU CẦU:
${requirementModelJson}

QUY TẮC UML:
1. NODES:
   - ⚠️ BẮT BUỘC: CHỈ có ĐÚNG 1 node type="start" và ĐÚNG 1 node type="end" trong toàn bộ diagram
   - KHÔNG được tạo nhiều start nodes hoặc nhiều end nodes
   - Mọi action phải nằm trong lane. Decision BẮT BUỘC có đúng 2 edges với condition "true"/"false". Merge đóng nhánh từ decision.
   - Node ID duy nhất (mẫu: 'UC1_ActionA'). Label bắt buộc cho action/decision/merge.

2. EDGES: Liên tục start→end. Condition CHỈ cho edges từ decision, LUÔN là "true" hoặc "false". Action chỉ có 1 edge ra.

3. CẤU TRÚC: Node ID duy nhất (mẫu: 'UC1_ActionA'). Label bắt buộc cho action/decision/merge.

4. POSITION: Bắt buộc cho tất cả nodes {x, y}. X: 100-1100, Y: 100-1500. Cùng lane có X tương tự, Y tăng theo luồng.

⚠️ QUAN TRỌNG VỀ START/END NODES:
- CHỈ được tạo ĐÚNG 1 node với type="start" (đây là điểm bắt đầu duy nhất của diagram)
- CHỈ được tạo ĐÚNG 1 node với type="end" (đây là điểm kết thúc duy nhất của diagram)
- TẤT CẢ các luồng phải bắt đầu từ start node và kết thúc tại end node
- KHÔNG được tạo nhiều start/end nodes, ngay cả khi có nhiều luồng song song

⚠️ QUAN TRỌNG VỀ DECISION:
- Mỗi decision node PHẢI có đúng 2 edges đi ra
- Một edge có condition: "true"
- Một edge có condition: "false"
- KHÔNG dùng "yes/no", "có/không", hoặc bất kỳ giá trị nào khác ngoài "true"/"false"

ĐẦU RA: Chỉ trả về JSON object, KHÔNG markdown/code block. Cấu trúc:
{
  "name": "string",
  "description": "string",
  "lanes": [{"id": "string", "name": "string"}],
  "nodes": [{"id": "string", "type": "start|end|action|decision|merge", "label": "string", "lane_id": "string", "position": {"x": number, "y": number}}],
  "edges": [{"from": "string", "to": "string", "condition": "true" | "false" (chỉ cho decision, BẮT BUỘC 2 edges)}]
}`
  },

  'en-US': {
    activityDiagram: (requirementModelJson: string) => `YOU ARE A UML EXPERT, create Activity Diagram from business requirements.

REQUIREMENTS:
${requirementModelJson}

UML RULES:
1. NODES:
   - ⚠️ MANDATORY: MUST have EXACTLY 1 node with type="start" and EXACTLY 1 node with type="end" in the entire diagram
   - DO NOT create multiple start nodes or multiple end nodes
   - All actions must be in lanes. Decision MUST have exactly 2 edges with conditions "true"/"false". Merge closes decision branches.
   - Unique node IDs (pattern: 'UC1_ActionA'). Label required for action/decision/merge.

2. EDGES: Continuous start→end flow. Condition ONLY for edges from decision, ALWAYS "true" or "false". Action has only 1 outgoing edge.

3. STRUCTURE: Unique node IDs (pattern: 'UC1_ActionA'). Label required for action/decision/merge.

4. POSITION: Required for all nodes {x, y}. X: 100-1100, Y: 100-1500. Same lane has similar X, Y increases by flow.

⚠️ CRITICAL ABOUT START/END NODES:
- MUST create EXACTLY 1 node with type="start" (this is the ONLY entry point of the diagram)
- MUST create EXACTLY 1 node with type="end" (this is the ONLY exit point of the diagram)
- ALL flows must start from the start node and end at the end node
- DO NOT create multiple start/end nodes, even if there are parallel flows

⚠️ IMPORTANT ABOUT DECISION:
- Each decision node MUST have exactly 2 outgoing edges
- One edge with condition: "true"
- One edge with condition: "false"
- DO NOT use "yes/no", "có/không", or any other values except "true"/"false"

OUTPUT: Return ONLY JSON object, NO markdown/code blocks. Structure:
{
  "name": "string",
  "description": "string",
  "lanes": [{"id": "string", "name": "string"}],
  "nodes": [{"id": "string", "type": "start|end|action|decision|merge", "label": "string", "lane_id": "string", "position": {"x": number, "y": number}}],
  "edges": [{"from": "string", "to": "string", "condition": "true" | "false" (only for decision, MUST have 2 edges)}]
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
