import { ActivityEdge, ActivityNode, ActivityLane, ActivityDiagramDTO } from './interfaces';
import { ApiKeyService } from '../../../orchestrator/domain/ApiKeyService';
import { Types } from 'mongoose';

const prompts = {
  'vi-VN': {
    activityDiagram: (requirementModelJson: string) => `BẠN LÀ CHUYÊN GIA UML, tạo Activity Diagram từ yêu cầu nghiệp vụ.

YÊU CẦU:
${requirementModelJson}

QUY TẮC UML:
1. NODES: Phải có 1 start, 1 end. Mọi action trong lane. Decision BẮT BUỘC có đúng 2 edges với condition "true"/"false". Merge đóng nhánh từ decision.
2. EDGES: Liên tục start→end. Condition CHỈ cho edges từ decision, LUÔN là "true" hoặc "false". Action chỉ có 1 edge ra.
3. CẤU TRÚC: Node ID duy nhất (mẫu: 'UC1_ActionA'). Label bắt buộc cho action/decision/merge.
4. POSITION: Bắt buộc cho tất cả nodes {x, y}. X: 100-1100, Y: 100-1500. Cùng lane có X tương tự, Y tăng theo luồng.

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
1. NODES: Must have 1 start, 1 end. All actions in lanes. Decision MUST have exactly 2 edges with conditions "true"/"false". Merge closes decision branches.
2. EDGES: Continuous start→end flow. Condition ONLY for edges from decision, ALWAYS "true" or "false". Action has only 1 outgoing edge.
3. STRUCTURE: Unique node IDs (pattern: 'UC1_ActionA'). Label required for action/decision/merge.
4. POSITION: Required for all nodes {x, y}. X: 100-1100, Y: 100-1500. Same lane has similar X, Y increases by flow.

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

        // Phân tích lỗi API key
        const { analyzeApiKeyError, ApiKeyErrorType } = await import("../../../../shared/apiKeyErrorHandler");
        const errorInfo = analyzeApiKeyError(err);
        lastError = err;

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
          status_code: err.status || err.statusCode || 500,
          error_message: err.message || 'Unknown error',
          error_type: errorInfo.type,
          response_time: responseTime,
        }).catch(logErr => console.error('Failed to log API usage:', logErr));

        // Disable key nếu cần (invalid, unauthorized)
        if (errorInfo.shouldDisableKey) {
          try {
            await this.apiKeyService.disableKey(k._id);
            console.warn(`⚠️ Disabled ${errorInfo.type} Gemini key: ${k._id}`);
          } catch { }
        }

        // Nếu là lỗi không retryable (quota, invalid key), không thử key tiếp theo
        if (!errorInfo.retryable && errorInfo.type !== ApiKeyErrorType.RATE_LIMIT) {
          const { ApiKeyError } = await import("../../../../shared/apiKeyErrorHandler");
          throw new ApiKeyError(err, 'vi');
        }

        continue;
      }
    }

    // Nếu tất cả các key đều thất bại
    if (lastError) {
      const { ApiKeyError } = await import("../../../../shared/apiKeyErrorHandler");
      throw new ApiKeyError(lastError, 'vi');
    }

    throw new Error("All Gemini keys failed for activity generation.");
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

    // ✅ MỚI: Token analysis trước khi gọi LLM
    const { getModelConfig, estimateTokens, determineStrategy, logTokenInfo } = await import("../../../../shared/tokenManager");
    const keys = await this.apiKeyService.getAllActiveKeys("gemini");
    if (keys && keys.length > 0) {
      const modelConfig = getModelConfig(keys[0].model_name || 'gemini-2.0-flash', 'gemini');
      logTokenInfo(prompt, modelConfig, '[UML Activity Diagram]');
    }

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
