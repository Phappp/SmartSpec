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
    /** ✅ MỚI: Force sử dụng model được chỉ định, không fallback sang model khác */
    forceModel?: boolean;
}

export interface AvailableModel {
    modelName: string;
    provider: Provider;
    displayName: string;
    category: 'agent' | 'worker' | 'specialized';
    contextWindow: number;
    isFree: boolean;
    hasKey: boolean;
}

export class LLMService {
    private apiKeyService = new ApiKeyService();

    // ✅ Key rotation: Track counter per provider để round-robin
    private keyRotationCounters: Map<string, number> = new Map();

    /**
     * Gọi LLM API - tự động chọn provider và model phù hợp
     * Ưu tiên OpenRouter nếu có, sau đó auto-detect từ modelName hoặc keys có sẵn
     * 
     * ✅ MỚI: Nếu forceModel = true, sẽ bắt buộc dùng model được chỉ định, không fallback
     */
    async callLLM(options: LLMCallOptions): Promise<LLMResponse> {
        const {
            prompt,
            modelName,
            provider,
            userId,
            projectId,
            endpoint = 'llm_call',
            isProductionFreeMode = true,
            forceModel = false // ✅ MỚI: Mặc định không force
        } = options;

        // Xác định provider và model
        let targetProvider: Provider | undefined = provider;
        let targetModelName = modelName;

        // ✅ CẢI THIỆN: Nếu modelName có format OpenRouter (có /), ưu tiên OpenRouter ngay
        // Format OpenRouter: provider/model-name hoặc provider/model-name:free
        const isOpenRouterFormat = modelName && modelName.includes('/');

        // ✅ QUAN TRỌNG: Nếu forceModel = true và model có format OpenRouter, set provider = openrouter trước
        if (forceModel && modelName && isOpenRouterFormat) {
            // Model có format OpenRouter → cần OpenRouter keys
            const openRouterKeys = await this.apiKeyService.getAllActiveKeys('openrouter');
            if (openRouterKeys && openRouterKeys.length > 0) {
                targetProvider = 'openrouter';
                targetModelName = modelName; // Dùng modelName gốc cho OpenRouter
                console.log(`✅ [callLLM] Force model "${modelName}" detected as OpenRouter format, using openrouter provider`);
            } else {
                throw new Error(
                    `Model "${modelName}" requires OpenRouter API key (OpenRouter format detected), but no active keys found. ` +
                    `Please add an OpenRouter API key to use this model.`
                );
            }
        } else if (isOpenRouterFormat && !forceModel) {
            // Nếu không forceModel, vẫn ưu tiên OpenRouter nếu có keys
            const openRouterKeys = await this.apiKeyService.getAllActiveKeys('openrouter');
            if (openRouterKeys && openRouterKeys.length > 0) {
                targetProvider = 'openrouter';
                targetModelName = modelName; // Dùng modelName gốc cho OpenRouter
            }
        }

        // ✅ MỚI: Nếu forceModel = true và chưa set provider (không phải OpenRouter format), validate model trước
        if (forceModel && modelName && !targetProvider) {
            const modelConfig = getModelConfig(modelName, provider, isProductionFreeMode);
            targetProvider = modelConfig.provider;
            targetModelName = modelConfig.modelName;

            console.log(`✅ [callLLM] Force model "${modelName}" → provider: ${targetProvider}, modelName: ${targetModelName}`);

            // Kiểm tra có keys cho provider này không
            const keysForProvider = await this.apiKeyService.getAllActiveKeys(targetProvider);
            if (!keysForProvider || keysForProvider.length === 0) {
                throw new Error(
                    `Model "${modelName}" requires ${targetProvider} API key, but no active keys found. ` +
                    `Please add a ${targetProvider} API key or choose a different model.`
                );
            }
        }

        // Nếu có modelName, lấy config để xác định provider (nếu chưa có)
        // ✅ QUAN TRỌNG: Nếu modelName có format OpenRouter (có /), giữ nguyên modelName gốc
        if (modelName && !targetProvider) {
            const isOpenRouterFormat = modelName.includes('/');
            if (isOpenRouterFormat) {
                // Model OpenRouter format → giữ nguyên modelName, set provider = openrouter
                targetProvider = 'openrouter';
                targetModelName = modelName; // ✅ Giữ nguyên modelName gốc
                console.log(`✅ [callLLM] OpenRouter format detected, keeping original modelName: ${modelName}`);
            } else {
                // Model native format → dùng getModelConfig
                const modelConfig = getModelConfig(modelName, provider, isProductionFreeMode);
                targetProvider = modelConfig.provider;
                targetModelName = modelConfig.modelName;
            }
        } else if (modelName && !targetModelName) {
            // ✅ Nếu đã có targetProvider nhưng chưa có targetModelName, dùng modelName gốc
            targetModelName = modelName;
        }

        // Nếu không có provider, tự động detect (chỉ khi không forceModel)
        if (!targetProvider && !forceModel) {
            targetProvider = await this.autoDetectProvider(modelName);
        }

        // Lấy API keys cho provider
        let keys = await this.apiKeyService.getAllActiveKeys(targetProvider);

        // Nếu không có keys cho provider này, thử fallback (chỉ khi không forceModel)
        if ((!keys || keys.length === 0) && !forceModel) {
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
        } else if ((!keys || keys.length === 0) && forceModel) {
            // ✅ Nếu forceModel nhưng không có keys → throw error rõ ràng
            throw new Error(
                `Model "${modelName || targetModelName}" requires ${targetProvider} API key, but no active keys found. ` +
                `Please add a ${targetProvider} API key to use this model.`
            );
        }

        // ✅ KEY ROTATION: Rotate keys để phân bổ load
        // Nếu có nhiều keys, bắt đầu từ key khác nhau cho mỗi request
        const rotatedKeys = this.rotateKeys(keys, targetProvider);

        // Thử từng key cho đến khi thành công
        let lastError: any;
        for (const key of rotatedKeys) {
            const startTime = Date.now();
            // ✅ Tính toán effectiveModelName: nếu forceModel, dùng modelName được chỉ định
            // Nếu không forceModel, có thể fallback sang key.model_name hoặc default
            // ✅ QUAN TRỌNG: Ưu tiên targetModelName (từ getRecommendedModel/user selected) hơn key.model_name
            let effectiveModelName: string;
            if (forceModel && targetModelName) {
                effectiveModelName = targetModelName; // ✅ Force dùng model được chỉ định
            } else if (targetModelName) {
                // ✅ Nếu có targetModelName (từ getRecommendedModel, có thể là user selected), dùng nó
                effectiveModelName = targetModelName;
            } else {
                // ✅ Chỉ fallback về key.model_name hoặc default khi không có targetModelName
                effectiveModelName = key.model_name || this.getDefaultModel(targetProvider);
                console.log(`⚠️ [callLLM] No targetModelName, using key.model_name or default: ${effectiveModelName}`);
            }

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
        if (forceModel && modelName) {
            // ✅ Nếu model không available (invalid model error), thử fallback sang model tương tự
            const isInvalidModel = lastError?.message?.includes('not a valid model') ||
                lastError?.message?.includes('model not found') ||
                lastError?.message?.includes('invalid_model') ||
                lastError?.message?.includes('model ID');

            if (isInvalidModel && targetProvider === 'openrouter' && keys && keys.length > 0) {
                console.warn(`⚠️ [callLLM] Model "${modelName}" is not available on OpenRouter. Trying fallback model...`);

                // Thử fallback sang model đã được verify hoạt động
                const fallbackModel = 'google/gemma-3-12b-it:free';
                console.log(`🔄 [callLLM] Falling back to verified model: ${fallbackModel}`);

                try {
                    const fallbackResponse = await this.callOpenRouterAPI(keys[0].key_value, fallbackModel, prompt);
                    console.log(`✅ [callLLM] Fallback model "${fallbackModel}" succeeded`);

                    // Log API usage với fallback model
                    await logApiUsage({
                        api_key_id: keys[0]._id.toString(),
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
                        response_time: Date.now() - Date.now(),
                    }).catch(err => console.error('Failed to log API usage:', err));

                    return fallbackResponse;
                } catch (fallbackErr: any) {
                    console.error(`❌ [callLLM] Fallback model also failed:`, fallbackErr.message);
                }
            }

            throw new Error(
                `Failed to use model "${modelName}" with ${targetProvider}. ` +
                `Last error: ${lastError?.message || 'Unknown error'}. ` +
                `Please check if the model name is correct and you have valid API keys. ` +
                `💡 Tip: Model "${modelName}" may not be available on OpenRouter. Try selecting a different model.`
            );
        }
        throw new Error(`All ${targetProvider} API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * ✅ MỚI: Lấy danh sách các models có thể sử dụng dựa trên keys có sẵn
     * @param category - Lọc theo category (agent, worker, specialized), optional
     * @returns Danh sách models có thể dùng
     */
    async getAvailableModels(category?: 'agent' | 'worker' | 'specialized'): Promise<AvailableModel[]> {
        const { MODEL_CONFIGS } = await import('./tokenManager');
        const availableModels: AvailableModel[] = [];

        // Lấy tất cả providers có keys
        const providers: Provider[] = ['openrouter', 'gemini', 'google', 'mistral', 'meta', 'openai', 'claude',
            'nous', 'qwen', 'deepseek', 'tngtech', 'nex-agi', 'arcee-ai', 'kwaipilot', 'nvidia',
            'amazon', 'z-ai', 'moonshotai', 'cognitivecomputations', 'meta-llama', 'allenai', 'alibaba'];

        const providersWithKeys = new Set<Provider>();
        for (const provider of providers) {
            const keys = await this.apiKeyService.getAllActiveKeys(provider);
            if (keys && keys.length > 0) {
                providersWithKeys.add(provider);
                console.log(`✅ [getAvailableModels] Found ${keys.length} key(s) for provider: ${provider}`);
            }
        }

        console.log(`📊 [getAvailableModels] Providers with keys: ${Array.from(providersWithKeys).join(', ') || 'NONE'}`);

        // Kiểm tra có OpenRouter key không (quan trọng vì nhiều models dùng OpenRouter)
        const hasOpenRouterKey = providersWithKeys.has('openrouter');

        // Duyệt qua tất cả models trong MODEL_CONFIGS
        for (const [key, config] of Object.entries(MODEL_CONFIGS)) {
            // Lọc theo category nếu có
            if (category && config.category !== category) {
                continue;
            }

            // ✅ Kiểm tra model có thể dùng được không
            // Nếu modelName có format OpenRouter (có '/' và có thể có ':free'), chỉ cần OpenRouter key
            const isOpenRouterFormat = config.modelName.includes('/');
            const hasProviderKey = providersWithKeys.has(config.provider);

            let canUse = false;
            let hasKey = false;

            if (isOpenRouterFormat) {
                // Model OpenRouter format → chỉ cần OpenRouter key
                canUse = hasOpenRouterKey;
                hasKey = hasOpenRouterKey;
            } else {
                // Model native format → cần key cho provider của nó
                canUse = hasProviderKey;
                hasKey = hasProviderKey;
            }

            if (canUse) {
                availableModels.push({
                    modelName: config.modelName,
                    provider: config.provider,
                    displayName: key,
                    category: config.category,
                    contextWindow: config.contextWindow,
                    isFree: config.modelName.includes(':free'),
                    hasKey: hasKey
                });
            }
        }

        // Sắp xếp: agent trước, sau đó worker, cuối cùng specialized
        const categoryOrder = { agent: 0, worker: 1, specialized: 2 };
        availableModels.sort((a, b) => {
            const orderDiff = categoryOrder[a.category] - categoryOrder[b.category];
            if (orderDiff !== 0) return orderDiff;
            return a.displayName.localeCompare(b.displayName);
        });

        console.log(`✅ [getAvailableModels] Found ${availableModels.length} available models${category ? ` for category: ${category}` : ''}`);

        // ✅ Nếu không có models nào, vẫn trả về empty array (không throw error)
        // Frontend sẽ hiển thị "No models available"
        return availableModels;
    }

    /**
     * ✅ MỚI: Validate model có thể sử dụng được không
     * @param modelName - Model name cần validate
     * @returns true nếu model có thể dùng, false nếu không
     */
    async validateModel(modelName: string): Promise<{ valid: boolean; reason?: string; provider?: Provider }> {
        try {
            console.log(`🔍 [validateModel] Validating model: ${modelName}`);

            // ✅ QUAN TRỌNG: Nếu model có format OpenRouter (có /), chỉ cần check OpenRouter keys
            if (modelName.includes('/')) {
                const openRouterKeys = await this.apiKeyService.getAllActiveKeys('openrouter');
                if (openRouterKeys && openRouterKeys.length > 0) {
                    console.log(`✅ [validateModel] OpenRouter model "${modelName}" validated (OpenRouter keys available)`);
                    return { valid: true, provider: 'openrouter' };
                } else {
                    console.warn(`⚠️ [validateModel] OpenRouter model "${modelName}" requires OpenRouter keys, but none found`);
                    return {
                        valid: false,
                        reason: 'OpenRouter API key is required for this model. Please add an OpenRouter API key first.',
                        provider: 'openrouter'
                    };
                }
            }

            // Validate non-OpenRouter models
            const { getModelConfig } = await import('./tokenManager');
            const modelConfig = getModelConfig(modelName);

            // Kiểm tra có keys cho provider này không
            const keys = await this.apiKeyService.getAllActiveKeys(modelConfig.provider);
            if (!keys || keys.length === 0) {
                console.warn(`⚠️ [validateModel] No active API keys found for provider: ${modelConfig.provider}`);
                return {
                    valid: false,
                    reason: `No active API keys found for provider: ${modelConfig.provider}`,
                    provider: modelConfig.provider
                };
            }

            console.log(`✅ [validateModel] Non-OpenRouter model "${modelName}" validated (${modelConfig.provider} keys available)`);
            return { valid: true, provider: modelConfig.provider };
        } catch (error: any) {
            console.error(`❌ [validateModel] Error validating model "${modelName}":`, error.message);
            return {
                valid: false,
                reason: error.message || 'Invalid model name'
            };
        }
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
            const errorCode = errorData.error?.code || response.status;
            const errorType = errorData.error?.type || 'unknown';

            // ✅ Log chi tiết lỗi từ OpenRouter
            console.error(`❌ OpenRouter API Error:`);
            console.error(`   Status: ${response.status} ${response.statusText}`);
            console.error(`   Model: ${normalizedModelName} (original: ${modelName})`);
            console.error(`   Error Code: ${errorCode}`);
            console.error(`   Error Type: ${errorType}`);
            console.error(`   Error Message: ${errorMessage}`);
            console.error(`   Full Error Data:`, JSON.stringify(errorData, null, 2));

            // Nếu lỗi là model không hợp lệ, log chi tiết hơn
            if (errorMessage.includes('not a valid model') ||
                errorMessage.includes('model ID') ||
                errorMessage.includes('model not found') ||
                errorType === 'invalid_model') {
                console.error(`   💡 Tip: Model "${normalizedModelName}" không tồn tại hoặc không available trên OpenRouter`);
                console.error(`   💡 Tip: Kiểm tra model name trên https://openrouter.ai/models`);
                console.error(`   💡 Tip: Có thể model này không có sẵn trong free tier hoặc đã bị deprecated`);
            }

            throw new Error(`OpenRouter API error (${response.status}): ${errorMessage}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        // ✅ Kiểm tra nếu response rỗng hoặc không hợp lệ
        if (!text || text.trim().length === 0) {
            console.error(`❌ [callOpenRouterAPI] Empty response from OpenRouter:`);
            console.error(`   Model: ${normalizedModelName}`);
            console.error(`   Response data:`, JSON.stringify(data, null, 2));
            throw new Error(`OpenRouter returned empty response for model "${normalizedModelName}". The model may not be available or may have returned an error.`);
        }

        // ✅ Kiểm tra nếu response chỉ là "{}" hoặc object rỗng
        const trimmedText = text.trim();
        if (trimmedText === '{}' || trimmedText === '[]' || trimmedText.length < 10) {
            console.warn(`⚠️ [callOpenRouterAPI] Suspicious response from OpenRouter (too short or empty object):`);
            console.warn(`   Model: ${normalizedModelName}`);
            console.warn(`   Response length: ${trimmedText.length}`);
            console.warn(`   Response preview: ${trimmedText.substring(0, 200)}`);
            // Không throw error ngay, để caller xử lý (có thể là valid response cho một số trường hợp)
        }

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
            'qwen': 'qwen/qwen3-235b-a22b:free',
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
     * ✅ MỚI: Lấy model được user chọn từ database
     * @param userId - User ID để lấy preference
     * @returns Model name nếu user đã chọn, null nếu chưa chọn
     */
    async getUserSelectedModel(userId?: string): Promise<string | null> {
        if (!userId) {
            console.log(`⚠️ [getUserSelectedModel] No userId provided`);
            return null;
        }

        try {
            const User = (await import("../../../internal/model/user")).default;
            const user = await User.findById(userId).lean();

            if (!user) {
                console.log(`⚠️ [getUserSelectedModel] User ${userId} not found`);
                return null;
            }

            const selectedModel = (user as any).setting?.selectedModel;
            if (!selectedModel) {
                console.log(`⚠️ [getUserSelectedModel] User ${userId} has no selected model in settings`);
                return null;
            }

            console.log(`✅ [getUserSelectedModel] User ${userId} selected model: ${selectedModel}`);

            // ✅ CẢI THIỆN: Nếu model có format OpenRouter (có /), chỉ cần check OpenRouter keys
            // Không cần validate phức tạp vì OpenRouter có thể dùng nhiều models
            if (selectedModel.includes('/')) {
                const openRouterKeys = await this.apiKeyService.getAllActiveKeys('openrouter');
                if (openRouterKeys && openRouterKeys.length > 0) {
                    console.log(`✅ [getUserSelectedModel] OpenRouter model "${selectedModel}" detected, OpenRouter keys available. Returning user selected model.`);
                    return selectedModel; // ✅ QUAN TRỌNG: Trả về model user đã chọn, không fallback
                } else {
                    console.warn(`⚠️ [getUserSelectedModel] OpenRouter model "${selectedModel}" requires OpenRouter keys, but none found`);
                    return null;
                }
            }

            // Validate model có thể dùng được không (cho non-OpenRouter models)
            const validation = await this.validateModel(selectedModel);
            if (validation.valid) {
                console.log(`✅ [getUserSelectedModel] Non-OpenRouter model "${selectedModel}" validated successfully. Returning user selected model.`);
                return selectedModel; // ✅ QUAN TRỌNG: Trả về model user đã chọn
            } else {
                console.warn(`⚠️ [getUserSelectedModel] User selected model "${selectedModel}" is not available: ${validation.reason}`);
                return null;
            }
        } catch (error: any) {
            console.error(`❌ [getUserSelectedModel] Error getting user model preference:`, error.message);
            return null;
        }
    }

    /**
     * ✅ PUBLIC METHOD: Lấy recommended model name tự động từ keys có sẵn
     * Đây là method tập trung - tất cả modules nên dùng method này thay vì hardcode
     * 
     * Logic:
     * 1. Nếu có userId, ưu tiên model user đã chọn
     * 2. Nếu có preferredModel, thử dùng nó
     * 3. Ưu tiên OpenRouter (nếu có key)
     * 4. Fallback sang Gemini (nếu có key)
     * 5. Fallback sang providers khác
     * 6. Trả về model từ key.model_name hoặc default model
     * 
     * @param preferredModel - Model name ưu tiên (optional, nếu không có sẽ auto-detect)
     * @param userId - User ID để lấy model preference (optional)
     * @returns Model name để sử dụng
     * @throws Error nếu không có API keys nào
     */
    async getRecommendedModel(preferredModel?: string, userId?: string): Promise<string> {
        console.log(`🔍 [getRecommendedModel] Called with preferredModel: ${preferredModel || 'none'}, userId: ${userId || 'none'}`);

        // ✅ MỚI: Ưu tiên model user đã chọn
        if (userId) {
            console.log(`🔍 [getRecommendedModel] Checking user selected model for userId: ${userId}`);
            const userSelectedModel = await this.getUserSelectedModel(userId);
            if (userSelectedModel) {
                console.log(`✅ [getRecommendedModel] Using user selected model: ${userSelectedModel}`);
                return userSelectedModel;
            } else {
                console.log(`⚠️ [getRecommendedModel] No user selected model found, falling back to auto-detect`);
            }
        } else {
            console.log(`⚠️ [getRecommendedModel] No userId provided, skipping user preference check`);
        }

        // Nếu có preferredModel, thử dùng nó
        if (preferredModel) {
            console.log(`✅ [getRecommendedModel] Using preferredModel: ${preferredModel}`);
            return preferredModel;
        }

        // Ưu tiên OpenRouter
        const openRouterKeys = await this.apiKeyService.getAllActiveKeys('openrouter');
        if (openRouterKeys && openRouterKeys.length > 0) {
            // ✅ QUAN TRỌNG: Nếu key có model_name, chỉ dùng nó khi không có user preference
            // Nếu key.model_name là empty/null, dùng default
            // Nhưng ưu tiên luôn là user selected model (đã check ở trên)
            const defaultModel = openRouterKeys[0].model_name || this.getDefaultModel('openrouter');
            console.log(`✅ [getRecommendedModel] Using OpenRouter model: ${defaultModel} (from key.model_name: ${openRouterKeys[0].model_name || 'empty'})`);
            return defaultModel;
        }

        // Fallback sang Gemini
        const geminiKeys = await this.apiKeyService.getAllActiveKeys('gemini');
        if (geminiKeys && geminiKeys.length > 0) {
            const defaultModel = geminiKeys[0].model_name || this.getDefaultModel('gemini');
            console.log(`✅ [getRecommendedModel] Using Gemini default model: ${defaultModel}`);
            return defaultModel;
        }

        // Thử các providers khác
        const providers: Provider[] = ['google', 'mistral', 'meta', 'openai', 'claude'];
        for (const provider of providers) {
            const keys = await this.apiKeyService.getAllActiveKeys(provider);
            if (keys && keys.length > 0) {
                const defaultModel = keys[0].model_name || this.getDefaultModel(provider);
                console.log(`✅ [getRecommendedModel] Using ${provider} default model: ${defaultModel}`);
                return defaultModel;
            }
        }

        // Nếu không có keys nào, throw error
        throw new Error("No active API keys found. Please add an API key (preferably OpenRouter) to use LLM features.");
    }
}

