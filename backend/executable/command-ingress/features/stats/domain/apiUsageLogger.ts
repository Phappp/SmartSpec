import ApiUsage from '../../../../../internal/model/api_usage';

interface LogApiUsageParams {
  api_key_id: string;
  provider: 'gemini' | 'openai' | 'claude';
  model_name?: string;
  user_id?: string;
  project_id?: string;
  request_type?: 'text' | 'image' | 'audio' | 'document' | 'other';
  endpoint?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  status: 'success' | 'failed' | 'timeout';
  status_code?: number;
  error_message?: string;
  response_time?: number;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Helper function để log API usage vào database
 * Gọi function này sau mỗi lần gọi API (Gemini, OpenAI, Claude)
 */
export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  try {
    await ApiUsage.create({
      api_key_id: params.api_key_id,
      provider: params.provider,
      model_name: params.model_name || '',
      user_id: params.user_id || null,
      project_id: params.project_id || null,
      request_type: params.request_type || 'other',
      endpoint: params.endpoint || '',
      prompt_tokens: params.prompt_tokens || 0,
      completion_tokens: params.completion_tokens || 0,
      total_tokens: params.total_tokens || (params.prompt_tokens || 0) + (params.completion_tokens || 0),
      status: params.status,
      status_code: params.status_code || null,
      error_message: params.error_message || null,
      response_time: params.response_time || 0,
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
    });
  } catch (error) {
    // Log lỗi nhưng không throw để không ảnh hưởng đến flow chính
    console.error('❌ Error logging API usage:', error);
  }
}

/**
 * Extract tokens từ Gemini response
 */
export function extractGeminiTokens(response: any): {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
} {
  try {
    const usageMetadata = response?.response?.usageMetadata || {};
    return {
      prompt_tokens: usageMetadata.promptTokenCount || 0,
      completion_tokens: usageMetadata.candidatesTokenCount || 0,
      total_tokens: usageMetadata.totalTokenCount || 0,
    };
  } catch {
    return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  }
}

