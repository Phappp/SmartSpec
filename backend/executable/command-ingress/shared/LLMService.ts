/**
 * LLMService - Universal LLM API Wrapper
 * Hỗ trợ Gemini, OpenRouter và các providers khác
 */

import { ApiKeyService } from "../features/orchestrator/domain/ApiKeyService";
import { getModelConfig, validateFreeMode, type Provider, type ModelConfig } from "./tokenManager";
import { logApiUsage } from "../features/stats/domain/apiUsageLogger";

export interface LLMResponse {
    text: string;
    tokens?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}

export interface LLMCallOptions {
    prompt: string;
    modelName?: string;
    provider?: Provider;
    userId?: string;
    projectId?: string;
    endpoint?: string;
    isProductionFreeMode?: boolean;
}

export class LLMService {
    private apiKeyService = new ApiKeyService();

    /**
     * Gọi LLM API - tự động chọn provider và model phù hợp
     * Ưu tiên OpenRouter nếu có, sau đó auto-detect từ modelName hoặc keys có sẵn
     */
    async callLLM(options: LLMCallOptions): Promise<LLMResponse> {
        const {
            prompt,
            modelName,
            provider,
            userId,
            projectId,
            endpoint = 'llm_call',
            isProductionFreeMode = true
        } = options;

        // Xác định provider và model
        let targetProvider: Provider | undefined = provider;
        let targetModelName = modelName;

        // Nếu có modelName, lấy config để xác định provider
        if (modelName) {
            const modelConfig = getModelConfig(modelName, provider, isProductionFreeMode);
            targetProvider = modelConfig.provider;
            targetModelName = modelConfig.modelName;
        }

        // Nếu không có provider, tự động detect
        if (!targetProvider) {
            targetProvider = await this.autoDetectProvider(modelName);
        }

        // Lấy API keys cho provider
        let keys = await this.apiKeyService.getAllActiveKeys(targetProvider);

        // Nếu không có keys cho provider này, thử fallback
        if (!keys || keys.length === 0) {
            // Ưu tiên OpenRouter vì nó có thể dùng cho nhiều models
            if (targetProvider !== 'openrouter') {
                const openRouterKeys = await this.apiKeyService.getAllActiveKeys('openrouter');
                if (openRouterKeys && openRouterKeys.length > 0) {
                    console.log(`🔄 Fallback to OpenRouter (no keys for ${targetProvider})`);
                    targetProvider = 'openrouter';
                    keys = openRouterKeys;
                    // Nếu có modelName, dùng modelName đó với OpenRouter
                    if (!targetModelName && modelName) {
                        targetModelName = modelName;
                    }
                }
            }

            // Nếu vẫn không có keys, thử tìm provider khác
            if (!keys || keys.length === 0) {
                const fallbackProvider = await this.findAvailableProvider();
                if (fallbackProvider) {
                    console.log(`🔄 Fallback to ${fallbackProvider} (no keys for ${targetProvider})`);
                    targetProvider = fallbackProvider;
                    keys = await this.apiKeyService.getAllActiveKeys(fallbackProvider);
                }
            }

            if (!keys || keys.length === 0) {
                throw new Error(`No active API keys found. Please add an API key (preferably OpenRouter) to use LLM features.`);
            }
        }

        // Thử từng key cho đến khi thành công
        let lastError: any;
        for (const key of keys) {
            const startTime = Date.now();
            // Tính toán effectiveModelName trước try block để có thể dùng trong catch
            const effectiveModelName = targetModelName || key.model_name || this.getDefaultModel(targetProvider);

            try {
                console.log(`🔑 Trying ${targetProvider} key: ${key.key_value.slice(0, 12)}... (model: ${effectiveModelName})`);

                let response: LLMResponse;

                // Gọi API tương ứng với provider
                if (targetProvider === 'openrouter') {
                    response = await this.callOpenRouterAPI(key.key_value, effectiveModelName, prompt);
                } else if (targetProvider === 'gemini') {
                    response = await this.callGeminiAPI(key.key_value, effectiveModelName, prompt);
                } else if (targetProvider === 'openai') {
                    response = await this.callOpenAIAPI(key.key_value, effectiveModelName, prompt);
                } else if (targetProvider === 'claude') {
                    response = await this.callClaudeAPI(key.key_value, effectiveModelName, prompt);
                } else {
                    // Các provider khác qua OpenRouter
                    response = await this.callOpenRouterAPI(key.key_value, effectiveModelName, prompt);
                }

                const responseTime = Date.now() - startTime;

                // Log API usage
                await logApiUsage({
                    api_key_id: key._id.toString(),
                    provider: targetProvider,
                    model_name: effectiveModelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: endpoint,
                    prompt_tokens: response.tokens?.prompt_tokens || 0,
                    completion_tokens: response.tokens?.completion_tokens || 0,
                    total_tokens: response.tokens?.total_tokens || 0,
                    status: 'success',
                    status_code: 200,
                    response_time: responseTime,
                }).catch(err => console.error('Failed to log API usage:', err));

                return response;

            } catch (err: any) {
                const responseTime = Date.now() - startTime;
                lastError = err;

                // Log error
                await logApiUsage({
                    api_key_id: key._id.toString(),
                    provider: targetProvider,
                    model_name: targetModelName || key.model_name || 'unknown',
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: endpoint,
                    status: 'failed',
                    status_code: err.status || 500,
                    response_time: responseTime,
                    error_message: err.message,
                }).catch(logErr => console.error('Failed to log API usage error:', logErr));

                console.error(`❌ ${targetProvider} API call failed with key ${key.key_value.slice(0, 12)}...:`, err.message);

                // Nếu là lỗi model không hợp lệ, thử fallback model
                if (err.message && (err.message.includes('not a valid model') || err.message.includes('model ID'))) {
                    console.warn(`⚠️ Model ${effectiveModelName} không hợp lệ. Thử fallback model...`);

                    // Thử fallback models cho OpenRouter
                    if (targetProvider === 'openrouter') {
                        const fallbackModels = [
                            'google/gemma-3-12b:free',
                            'google/gemma-3-4b:free',
                            'mistral/mistral-7b-instruct',
                            'meta/llama-3.2-3b-instruct'
                        ];

                        for (const fallbackModel of fallbackModels) {
                            if (fallbackModel === effectiveModelName) continue; // Đã thử rồi

                            try {
                                console.log(`🔄 Thử fallback model: ${fallbackModel}`);
                                const fallbackResponse = await this.callOpenRouterAPI(key.key_value, fallbackModel, prompt);

                                const fallbackResponseTime = Date.now() - startTime;

                                // Log success với fallback model
                                await logApiUsage({
                                    api_key_id: key._id.toString(),
                                    provider: targetProvider,
                                    model_name: fallbackModel,
                                    user_id: userId,
                                    project_id: projectId,
                                    request_type: 'text',
                                    endpoint: endpoint,
                                    prompt_tokens: fallbackResponse.tokens?.prompt_tokens || 0,
                                    completion_tokens: fallbackResponse.tokens?.completion_tokens || 0,
                                    total_tokens: fallbackResponse.tokens?.total_tokens || 0,
                                    status: 'success',
                                    status_code: 200,
                                    response_time: fallbackResponseTime,
                                }).catch(err => console.error('Failed to log API usage:', err));

                                console.log(`✅ Fallback model ${fallbackModel} thành công!`);
                                return fallbackResponse;
                            } catch (fallbackErr: any) {
                                console.warn(`⚠️ Fallback model ${fallbackModel} cũng thất bại:`, fallbackErr.message);
                                continue; // Thử model tiếp theo
                            }
                        }
                    }
                }

                // Nếu là lỗi không phải rate limit, tiếp tục thử key tiếp theo
                if (err.status !== 429 && err.status !== 503) {
                    continue;
                }
            }
        }

        // Tất cả keys đều fail
        throw new Error(`All ${targetProvider} API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Gọi OpenRouter API
     */
    private async callOpenRouterAPI(apiKey: string, modelName: string, prompt: string): Promise<LLMResponse> {
        // Validate và normalize model name cho OpenRouter
        let normalizedModelName = modelName;

        // Nếu model name không có provider prefix, thêm vào
        if (!normalizedModelName.includes('/')) {
            // Nếu là model từ MODEL_CONFIGS, nó đã có prefix
            // Nhưng nếu không có, thử thêm prefix dựa trên model name
            if (normalizedModelName.startsWith('gemma')) {
                normalizedModelName = `google/${normalizedModelName}`;
            } else if (normalizedModelName.startsWith('mistral')) {
                normalizedModelName = `mistral/${normalizedModelName}`;
            } else if (normalizedModelName.startsWith('llama')) {
                normalizedModelName = `meta/${normalizedModelName}`;
            }
        }

        // Đảm bảo :free suffix được giữ nguyên nếu có
        // OpenRouter có thể yêu cầu format khác, nhưng thử format hiện tại trước

        console.log(`🌐 Calling OpenRouter API with model: ${normalizedModelName}`);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.APP_URL || 'https://smartspec.app',
                'X-Title': 'SmartSpec',
            },
            body: JSON.stringify({
                model: normalizedModelName,
                messages: [
                    { role: 'user', content: prompt }
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            const errorMessage = errorData.error?.message || response.statusText;

            // Nếu lỗi là model không hợp lệ, log chi tiết hơn
            if (errorMessage.includes('not a valid model') || errorMessage.includes('model ID')) {
                console.error(`❌ OpenRouter model validation failed:`);
                console.error(`   Attempted model: ${normalizedModelName}`);
                console.error(`   Original model: ${modelName}`);
                console.error(`   Error: ${errorMessage}`);
                console.error(`   💡 Tip: Kiểm tra model name trên https://openrouter.ai/models`);
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        return {
            text,
            tokens: {
                prompt_tokens: data.usage?.prompt_tokens,
                completion_tokens: data.usage?.completion_tokens,
                total_tokens: data.usage?.total_tokens,
            },
        };
    }

    /**
     * Gọi Gemini API
     */
    private async callGeminiAPI(apiKey: string, modelName: string, prompt: string): Promise<LLMResponse> {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: modelName });

        const resp: any = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const text = resp?.response?.text() || "";

        // Extract tokens từ Gemini response
        const { extractGeminiTokens } = await import("../features/stats/domain/apiUsageLogger");
        const tokens = extractGeminiTokens(resp);

        return {
            text,
            tokens: {
                prompt_tokens: tokens.prompt_tokens,
                completion_tokens: tokens.completion_tokens,
                total_tokens: tokens.total_tokens,
            },
        };
    }

    /**
     * Gọi OpenAI API
     */
    private async callOpenAIAPI(apiKey: string, modelName: string, prompt: string): Promise<LLMResponse> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: 'user', content: prompt }
                ],
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        return {
            text,
            tokens: {
                prompt_tokens: data.usage?.prompt_tokens,
                completion_tokens: data.usage?.completion_tokens,
                total_tokens: data.usage?.total_tokens,
            },
        };
    }

    /**
     * Gọi Claude API
     */
    private async callClaudeAPI(apiKey: string, modelName: string, prompt: string): Promise<LLMResponse> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelName,
                max_tokens: 4096,
                messages: [
                    { role: 'user', content: prompt }
                ],
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(error.error?.message || `Claude API error: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '';

        return {
            text,
            tokens: {
                prompt_tokens: data.usage?.input_tokens,
                completion_tokens: data.usage?.output_tokens,
                total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
            },
        };
    }

    /**
     * Tự động detect provider từ modelName hoặc keys có sẵn
     */
    private async autoDetectProvider(modelName?: string): Promise<Provider> {
        // Nếu có modelName, thử lấy provider từ MODEL_CONFIGS
        if (modelName) {
            try {
                const modelConfig = getModelConfig(modelName, undefined, true);
                return modelConfig.provider;
            } catch {
                // Nếu không tìm thấy trong config, tiếp tục detect
            }
        }

        // Ưu tiên OpenRouter vì nó có thể dùng cho nhiều models
        const openRouterKeys = await this.apiKeyService.getAllActiveKeys('openrouter');
        if (openRouterKeys && openRouterKeys.length > 0) {
            return 'openrouter';
        }

        // Thử các providers khác theo thứ tự ưu tiên
        const providers: Provider[] = ['gemini', 'google', 'mistral', 'meta', 'openai', 'claude'];
        for (const p of providers) {
            const keys = await this.apiKeyService.getAllActiveKeys(p);
            if (keys && keys.length > 0) {
                return p;
            }
        }

        // Fallback cuối cùng
        return 'gemini';
    }

    /**
     * Tìm provider có keys available
     */
    private async findAvailableProvider(): Promise<Provider | null> {
        const providers: Provider[] = ['openrouter', 'gemini', 'google', 'mistral', 'meta', 'openai', 'claude'];
        for (const p of providers) {
            const keys = await this.apiKeyService.getAllActiveKeys(p);
            if (keys && keys.length > 0) {
                return p;
            }
        }
        return null;
    }

    /**
     * Lấy model mặc định cho provider
     */
    private getDefaultModel(provider: Provider): string {
        const defaults: Record<Provider, string> = {
            'gemini': 'gemini-2.0-flash-001',
            'openai': 'gpt-4o',
            'claude': 'claude-3-5-sonnet',
            'openrouter': 'google/gemma-3-12b:free', // Đổi sang model ổn định hơn
            'nous': 'nous/hermes-3-405b-instruct',
            'qwen': 'qwen/qwen3-235b-a22b',
            'deepseek': 'tng/deepseek-r1t-chimera',
            'mistral': 'mistral/mistral-7b-instruct',
            'meta': 'meta/llama-3.2-3b-instruct',
            'google': 'google/gemma-3-27b-it:free', // Đổi sang model ổn định hơn
            'nvidia': 'nvidia/nemotron-nano-9b-v2',
            'kwaipilot': 'kwaipilot/kat-coder-pro-v1',
            'allenai': 'olmo-3-32b-think',
            'amazon': 'nova-2-lite',
        };
        return defaults[provider] || 'google/gemma-3-12b:free'; // Đổi sang model ổn định hơn
    }

    /**
     * ✅ PUBLIC METHOD: Lấy recommended model name tự động từ keys có sẵn
     * Đây là method tập trung - tất cả modules nên dùng method này thay vì hardcode
     * 
     * Logic:
     * 1. Ưu tiên OpenRouter (nếu có key)
     * 2. Fallback sang Gemini (nếu có key)
     * 3. Fallback sang providers khác
     * 4. Trả về model từ key.model_name hoặc default model
     * 
     * @param preferredModel - Model name ưu tiên (optional, nếu không có sẽ auto-detect)
     * @returns Model name để sử dụng
     * @throws Error nếu không có API keys nào
     */
    async getRecommendedModel(preferredModel?: string): Promise<string> {
        // Nếu có preferredModel, thử dùng nó
        if (preferredModel) {
            return preferredModel;
        }

        // Ưu tiên OpenRouter
        const openRouterKeys = await this.apiKeyService.getAllActiveKeys('openrouter');
        if (openRouterKeys && openRouterKeys.length > 0) {
            return openRouterKeys[0].model_name || this.getDefaultModel('openrouter');
        }

        // Fallback sang Gemini
        const geminiKeys = await this.apiKeyService.getAllActiveKeys('gemini');
        if (geminiKeys && geminiKeys.length > 0) {
            return geminiKeys[0].model_name || this.getDefaultModel('gemini');
        }

        // Thử các providers khác
        const providers: Provider[] = ['google', 'mistral', 'meta', 'openai', 'claude'];
        for (const provider of providers) {
            const keys = await this.apiKeyService.getAllActiveKeys(provider);
            if (keys && keys.length > 0) {
                return keys[0].model_name || this.getDefaultModel(provider);
            }
        }

        // Nếu không có keys nào, throw error
        throw new Error("No active API keys found. Please add an API key (preferably OpenRouter) to use LLM features.");
    }
}

