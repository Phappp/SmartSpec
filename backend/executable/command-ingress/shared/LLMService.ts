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

    // ✅ Key rotation: Track counter per provider để round-robin
    private keyRotationCounters: Map<string, number> = new Map();

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

        // ✅ CẢI THIỆN: Nếu modelName có format OpenRouter (có / và :free), ưu tiên OpenRouter ngay
        const isOpenRouterFormat = modelName && modelName.includes('/') && (modelName.includes(':free') || !isProductionFreeMode);

        if (isOpenRouterFormat) {
            // Kiểm tra có OpenRouter keys không
            const openRouterKeys = await this.apiKeyService.getAllActiveKeys('openrouter');
            if (openRouterKeys && openRouterKeys.length > 0) {
                targetProvider = 'openrouter';
                targetModelName = modelName; // Dùng modelName gốc cho OpenRouter
            }
        }

        // Nếu có modelName, lấy config để xác định provider (nếu chưa có)
        if (modelName && !targetProvider) {
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
                    } else if (modelName && modelName.includes('/')) {
                        // Nếu modelName đã có format OpenRouter, dùng nó
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

        // ✅ KEY ROTATION: Rotate keys để phân bổ load
        // Nếu có nhiều keys, bắt đầu từ key khác nhau cho mỗi request
        const rotatedKeys = this.rotateKeys(keys, targetProvider);

        // Thử từng key cho đến khi thành công
        let lastError: any;
        for (const key of rotatedKeys) {
            const startTime = Date.now();
            // Tính toán effectiveModelName trước try block để có thể dùng trong catch
            const effectiveModelName = targetModelName || key.model_name || this.getDefaultModel(targetProvider);

            try {
                const keyIndex = rotatedKeys.indexOf(key) + 1;
                const totalKeys = rotatedKeys.length;
                console.log(`🔑 [${keyIndex}/${totalKeys}] Trying ${targetProvider} key: ${key.key_value.slice(0, 12)}... (model: ${effectiveModelName})`);

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

                // ✅ MỚI: Xử lý rate limit - tự động chuyển model/provider
                const isRateLimit = err.status === 429 || err.status === 503 ||
                    (err.message && (
                        err.message.toLowerCase().includes('rate limit') ||
                        err.message.toLowerCase().includes('free-models-per-day') ||
                        err.message.toLowerCase().includes('too many requests')
                    ));

                if (isRateLimit) {
                    console.warn(`⚠️ [RATE LIMIT] Key ${key.key_value.slice(0, 12)}... bị rate limit: ${err.message}`);

                    // ✅ ƯU TIÊN: Nếu là OpenRouter, thử key tiếp theo trước
                    if (targetProvider === 'openrouter') {
                        // Kiểm tra xem còn key nào khác không
                        const currentKeyIndex = keys.indexOf(key);
                        const remainingKeys = keys.slice(currentKeyIndex + 1);

                        if (remainingKeys.length > 0) {
                            console.log(`🔄 [RATE LIMIT] Còn ${remainingKeys.length} key(s) OpenRouter. Tiếp tục thử key tiếp theo...`);
                            continue; // Thử key tiếp theo trong vòng lặp
                        }

                        // Tất cả keys đều rate limit, thử các model khác với key đầu tiên
                        console.warn(`⚠️ [RATE LIMIT] Tất cả ${keys.length} key(s) OpenRouter đều bị rate limit. Thử model khác...`);

                        if (effectiveModelName?.includes(':free')) {
                            // Thử các free models khác trên OpenRouter (dùng model names hợp lệ từ MODEL_CONFIGS)
                            const alternativeFreeModels = [
                                'google/gemma-3-4b-it:free',      // ✅ Đúng format
                                'google/gemma-3-12b-it:free',     // ✅ Đúng format
                                'google/gemma-3-27b-it:free',     // ✅ Đúng format
                                'mistralai/mistral-7b-instruct:free',  // ✅ Đúng prefix mistralai/
                                'meta-llama/llama-3.2-3b-instruct:free',  // ✅ Đúng prefix meta-llama/
                                'google/gemini-2.0-flash-exp:free',  // ✅ Alternative Google model
                                'kwaipilot/kat-coder-pro:free'    // ✅ Alternative worker model
                            ];

                            for (const altModel of alternativeFreeModels) {
                                if (altModel === effectiveModelName) continue; // Đã thử rồi

                                try {
                                    console.log(`🔄 [RATE LIMIT] Thử model ${altModel} với key đầu tiên...`);
                                    const altResponse = await this.callOpenRouterAPI(keys[0].key_value, altModel, prompt);

                                    const altResponseTime = Date.now() - startTime;
                                    await logApiUsage({
                                        api_key_id: keys[0]._id.toString(),
                                        provider: targetProvider,
                                        model_name: altModel,
                                        user_id: userId,
                                        project_id: projectId,
                                        request_type: 'text',
                                        endpoint: endpoint,
                                        prompt_tokens: altResponse.tokens?.prompt_tokens || 0,
                                        completion_tokens: altResponse.tokens?.completion_tokens || 0,
                                        total_tokens: altResponse.tokens?.total_tokens || 0,
                                        status: 'success',
                                        status_code: 200,
                                        response_time: altResponseTime,
                                    }).catch(err => console.error('Failed to log API usage:', err));

                                    console.log(`✅ [RATE LIMIT] Model ${altModel} thành công!`);
                                    return altResponse;
                                } catch (altErr: any) {
                                    const isAltRateLimit = altErr.message?.toLowerCase().includes('rate limit') ||
                                        altErr.message?.toLowerCase().includes('free-models-per-day');
                                    if (isAltRateLimit) {
                                        console.warn(`⚠️ [RATE LIMIT] Model ${altModel} cũng bị rate limit:`, altErr.message);
                                    } else {
                                        console.warn(`⚠️ [RATE LIMIT] Model ${altModel} thất bại:`, altErr.message);
                                    }
                                    continue;
                                }
                            }
                        }

                        // Nếu tất cả free models đều fail, thử chuyển sang provider khác
                        console.warn(`⚠️ [RATE LIMIT] Tất cả models OpenRouter đều fail. Chuyển sang provider khác...`);
                        const fallbackProvider = await this.findAvailableProvider(['openrouter']); // Loại trừ openrouter
                        if (fallbackProvider) {
                            try {
                                const fallbackKeys = await this.apiKeyService.getAllActiveKeys(fallbackProvider);
                                if (fallbackKeys && fallbackKeys.length > 0) {
                                    const fallbackKey = fallbackKeys[0];
                                    const fallbackModel = fallbackKey.model_name || this.getDefaultModel(fallbackProvider);
                                    console.log(`🔄 [RATE LIMIT] Chuyển sang ${fallbackProvider} với model ${fallbackModel}`);

                                    let fallbackResponse: LLMResponse;
                                    if (fallbackProvider === 'gemini') {
                                        fallbackResponse = await this.callGeminiAPI(fallbackKey.key_value, fallbackModel, prompt);
                                    } else if (fallbackProvider === 'openai') {
                                        fallbackResponse = await this.callOpenAIAPI(fallbackKey.key_value, fallbackModel, prompt);
                                    } else if (fallbackProvider === 'claude') {
                                        fallbackResponse = await this.callClaudeAPI(fallbackKey.key_value, fallbackModel, prompt);
                                    } else {
                                        continue; // Không hỗ trợ provider này
                                    }

                                    const fallbackResponseTime = Date.now() - startTime;
                                    await logApiUsage({
                                        api_key_id: fallbackKey._id.toString(),
                                        provider: fallbackProvider,
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

                                    console.log(`✅ [RATE LIMIT] Provider ${fallbackProvider} thành công!`);
                                    return fallbackResponse;
                                }
                            } catch (fallbackErr: any) {
                                console.warn(`⚠️ [RATE LIMIT] Provider ${fallbackProvider} cũng thất bại:`, fallbackErr.message);
                            }
                        }
                    }
                }

                // Nếu là lỗi model không hợp lệ, thử fallback model
                if (err.message && (err.message.includes('not a valid model') || err.message.includes('model ID'))) {
                    console.warn(`⚠️ Model ${effectiveModelName} không hợp lệ. Thử fallback model...`);

                    // Thử fallback models cho OpenRouter (dùng model names hợp lệ từ MODEL_CONFIGS)
                    if (targetProvider === 'openrouter') {
                        const fallbackModels = [
                            'google/gemma-3-12b-it:free',      // ✅ Đúng format
                            'google/gemma-3-4b-it:free',        // ✅ Đúng format
                            'google/gemma-3-27b-it:free',       // ✅ Đúng format
                            'mistralai/mistral-7b-instruct:free',  // ✅ Đúng prefix mistralai/
                            'meta-llama/llama-3.2-3b-instruct:free'  // ✅ Đúng prefix meta-llama/
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
                if (!isRateLimit) {
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
     * @param excludeProviders - Danh sách providers cần loại trừ
     */
    private async findAvailableProvider(excludeProviders: Provider[] = []): Promise<Provider | null> {
        const providers: Provider[] = ['openrouter', 'gemini', 'google', 'mistral', 'meta', 'openai', 'claude'];
        for (const p of providers) {
            if (excludeProviders.includes(p)) continue; // Bỏ qua providers bị loại trừ
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
            'openrouter': 'google/gemma-3-12b-it:free',
            'nous': 'nousresearch/hermes-3-llama-3.1-405b:free',
            'qwen': 'qwen/qwen3-235b-a22b',
            'deepseek': 'tngtech/deepseek-r1t-chimera:free',
            'mistral': 'mistralai/mistral-7b-instruct:free',
            'meta': 'meta-llama/llama-3.2-3b-instruct:free',
            'meta-llama': 'meta-llama/llama-3.2-3b-instruct:free',
            'google': 'google/gemma-3-27b-it:free',
            'nvidia': 'nvidia/nemotron-nano-9b-v2:free',
            'kwaipilot': 'kwaipilot/kat-coder-pro:free',
            'allenai': 'allenai/olmo-3-32b-think:free',
            'amazon': 'amazon/nova-2-lite-v1:free',
            'nex-agi': 'nex-agi/deepseek-v3.1-nex-n1:free',
            'arcee-ai': 'arcee-ai/trinity-mini:free',
            'tngtech': 'tngtech/deepseek-r1t-chimera:free',
            'alibaba': 'alibaba/tongyi-deepresearch-30b-a3b:free',
            'z-ai': 'z-ai/glm-4.5-air:free',
            'moonshotai': 'moonshotai/kimi-k2:free',
            'cognitivecomputations': 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
        };
        return defaults[provider] || 'google/gemma-3-12b-it:free';
    }

    /**
     * ✅ KEY ROTATION: Rotate keys để phân bổ load giữa các requests
     * Round-robin mechanism để mỗi request dùng key khác nhau
     * 
     * @param keys - Danh sách keys
     * @param provider - Provider name để track rotation
     * @returns Rotated keys array (key đầu tiên được rotate)
     */
    private rotateKeys<T extends { _id: string }>(keys: T[], provider: string): T[] {
        if (!keys || keys.length === 0) {
            return keys;
        }

        // Nếu chỉ có 1 key, không cần rotate
        if (keys.length === 1) {
            return keys;
        }

        // Lấy counter hiện tại cho provider này
        const currentCounter = this.keyRotationCounters.get(provider) || 0;

        // Tăng counter và wrap around
        const nextCounter = (currentCounter + 1) % keys.length;
        this.keyRotationCounters.set(provider, nextCounter);

        // Rotate array: đưa key tại index `nextCounter` lên đầu
        const rotatedKeys = [
            ...keys.slice(nextCounter),
            ...keys.slice(0, nextCounter)
        ];

        console.log(`🔄 [KEY ROTATION] ${provider}: Using key ${nextCounter + 1}/${keys.length} (${rotatedKeys[0]._id.slice(0, 8)}...)`);

        return rotatedKeys;
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

