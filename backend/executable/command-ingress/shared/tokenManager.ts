/**
 * Token Management Utility
 * Quản lý token estimation, context window limits, và strategies cho từng LLM model
 * 
 * LLM đọc TOKEN, không đọc chữ. Mỗi model có cách tokenize khác nhau.
 */

export type Provider = 'gemini' | 'openai' | 'claude' | 'nous' | 'qwen' | 'deepseek' | 'mistral' | 'meta' | 'allenai' | 'google' | 'amazon' | 'nvidia' | 'kwaipilot' | 'openrouter' | 'nex-agi' | 'arcee-ai' | 'tngtech' | 'alibaba' | 'z-ai' | 'moonshotai' | 'cognitivecomputations' | 'meta-llama';
export type ModelStrategy = 'truncate' | 'chunk-sliding' | 'compress-long';
export type ModelCategory = 'agent' | 'worker' | 'specialized';

export interface ModelConfig {
    provider: Provider;
    modelName: string;
    category: ModelCategory; // Phân loại: agent (planner/controller), worker (executor), specialized
    contextWindow: number; // Max tokens
    strategy: ModelStrategy;
    tokenEstimationRatio: number; // chars per token (approximate)
    supportsLongContext: boolean;
    supportsCompression: boolean;
}

/**
 * ⛔ Lưu ý quan trọng
 * Model FREE trên OpenRouter PHẢI có :free trong modelName
 * Nếu không → có thể bị tính tiền
 * 
 * 🔥 Phiên bản CLEAN (rút gọn, chỉ FREE models)
 */
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
    // =========================
    // 🧠 AGENT (FREE)
    // =========================
    'nous-hermes-3-405b-instruct': {
        provider: 'nous',
        modelName: 'nousresearch/hermes-3-llama-3.1-405b:free',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'qwen3-235b-a22b': {
        provider: 'qwen',
        modelName: 'qwen/qwen3-235b-a22b:free',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'deepseek-r1t-chimera': {
        provider: 'tngtech',
        modelName: 'tngtech/deepseek-r1t-chimera:free',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'devstral-2512': {
        provider: 'mistral',
        modelName: 'mistralai/devstral-2512:free',
        category: 'agent',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: false
    },
    'deepseek-v3.1-nex-n1': {
        provider: 'nex-agi',
        modelName: 'nex-agi/deepseek-v3.1-nex-n1:free',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'tng-r1t-chimera': {
        provider: 'tngtech',
        modelName: 'tngtech/tng-r1t-chimera:free',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'deepseek-r1t2-chimera': {
        provider: 'tngtech',
        modelName: 'tngtech/deepseek-r1t2-chimera:free',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'olmo-3-32b-think': {
        provider: 'allenai',
        modelName: 'allenai/olmo-3-32b-think:free',
        category: 'agent',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: false
    },
    'tongyi-deepresearch-30b-a3b': {
        provider: 'alibaba',
        modelName: 'alibaba/tongyi-deepresearch-30b-a3b:free',
        category: 'agent',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: false
    },
    'gpt-oss-120b': {
        provider: 'openai',
        modelName: 'openai/gpt-oss-120b:free',
        category: 'agent',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: false
    },
    'kimi-k2': {
        provider: 'moonshotai',
        modelName: 'moonshotai/kimi-k2:free',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'llama-3.3-70b-instruct': {
        provider: 'meta-llama',
        modelName: 'meta-llama/llama-3.3-70b-instruct:free',
        category: 'agent',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: false
    },

    // =========================
    // ⚙️ WORKER (FREE)
    // =========================
    'gemma-3-4b-free': {
        provider: 'google',
        modelName: 'google/gemma-3-4b-it:free',
        category: 'worker',
        contextWindow: 32000,
        strategy: 'truncate',
        tokenEstimationRatio: 4.0,
        supportsLongContext: false,
        supportsCompression: false
    },
    'gemma-3-12b-free': {
        provider: 'google',
        modelName: 'google/gemma-3-12b-it:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'gemma-3-27b-free': {
        provider: 'google',
        modelName: 'google/gemma-3-27b-it:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'gemma-3n-e2b-it': {
        provider: 'google',
        modelName: 'google/gemma-3n-e2b-it:free',
        category: 'worker',
        contextWindow: 32000,
        strategy: 'truncate',
        tokenEstimationRatio: 4.0,
        supportsLongContext: false,
        supportsCompression: false
    },
    'gemma-3n-e4b-it': {
        provider: 'google',
        modelName: 'google/gemma-3n-e4b-it:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'gemini-2.0-flash-exp': {
        provider: 'google',
        modelName: 'google/gemini-2.0-flash-exp:free',
        category: 'worker',
        contextWindow: 1000000,
        strategy: 'compress-long',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: true
    },
    'mistral-7b-instruct': {
        provider: 'mistral',
        modelName: 'mistralai/mistral-7b-instruct:free',
        category: 'worker',
        contextWindow: 32000,
        strategy: 'truncate',
        tokenEstimationRatio: 4.0,
        supportsLongContext: false,
        supportsCompression: false
    },
    'mistral-small-3.1-24b-instruct': {
        provider: 'mistral',
        modelName: 'mistralai/mistral-small-3.1-24b-instruct:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'llama-3.2-3b-instruct': {
        provider: 'meta-llama',
        modelName: 'meta-llama/llama-3.2-3b-instruct:free',
        category: 'worker',
        contextWindow: 16384,
        strategy: 'truncate',
        tokenEstimationRatio: 4.0,
        supportsLongContext: false,
        supportsCompression: false
    },
    'kat-coder-pro': {
        provider: 'kwaipilot',
        modelName: 'kwaipilot/kat-coder-pro:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'kat-coder-pro-v1': {
        provider: 'kwaipilot',
        modelName: 'kwaipilot/kat-coder-pro-v1',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'nemotron-nano-9b-v2': {
        provider: 'nvidia',
        modelName: 'nvidia/nemotron-nano-9b-v2:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'gpt-oss-20b': {
        provider: 'openai',
        modelName: 'openai/gpt-oss-20b:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'glm-4.5-air': {
        provider: 'z-ai',
        modelName: 'z-ai/glm-4.5-air:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'qwen3-coder': {
        provider: 'qwen',
        modelName: 'qwen/qwen3-coder:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'qwen3-4b': {
        provider: 'qwen',
        modelName: 'qwen/qwen3-4b:free',
        category: 'worker',
        contextWindow: 32000,
        strategy: 'truncate',
        tokenEstimationRatio: 4.0,
        supportsLongContext: false,
        supportsCompression: false
    },
    'dolphin-mistral-24b-venice': {
        provider: 'cognitivecomputations',
        modelName: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'trinity-mini': {
        provider: 'arcee-ai',
        modelName: 'arcee-ai/trinity-mini:free',
        category: 'worker',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },

    // =========================
    // 🧪 SPECIALIZED (FREE)
    // =========================
    'nemotron-nano-12b-2-vl': {
        provider: 'nvidia',
        modelName: 'nvidia/nemotron-nano-12b-2-vl:free',
        category: 'specialized',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'nova-2-lite-v1': {
        provider: 'amazon',
        modelName: 'amazon/nova-2-lite-v1:free',
        category: 'specialized',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    }
};

/**
 * Kiểm tra model có phải FREE không (có :free trong modelName)
 */
export function isFreeModel(modelConfig: ModelConfig): boolean {
    return modelConfig.modelName.includes(':free');
}

/**
 * Validate model config trong FREE mode
 * ⛔ Model FREE trên OpenRouter PHẢI có :free trong modelName
 * Nếu không → có thể bị tính tiền
 */
export function validateFreeMode(modelConfig: ModelConfig, isProductionFreeMode: boolean = true): void {
    if (isProductionFreeMode && !isFreeModel(modelConfig)) {
        throw new Error(`Paid model blocked in FREE mode: ${modelConfig.modelName}. Model FREE trên OpenRouter PHẢI có :free trong modelName.`);
    }
}

/**
 * Extract provider từ modelName (ví dụ: 'google/gemma-3-12b-it:free' → 'google')
 */
function extractProviderFromModelName(modelName: string): Provider | null {
    if (!modelName || !modelName.includes('/')) {
        return null;
    }

    const providerPart = modelName.split('/')[0].toLowerCase();

    // Map provider names
    const providerMap: Record<string, Provider> = {
        'google': 'google',
        'mistralai': 'mistral',
        'mistral': 'mistral',
        'meta-llama': 'meta-llama',
        'meta': 'meta-llama',
        'nousresearch': 'nous',
        'nous': 'nous',
        'qwen': 'qwen',
        'deepseek': 'deepseek',
        'tngtech': 'tngtech',
        'tng': 'tngtech',
        'allenai': 'allenai',
        'amazon': 'amazon',
        'nvidia': 'nvidia',
        'kwaipilot': 'kwaipilot',
        'openai': 'openai',
        'alibaba': 'alibaba',
        'z-ai': 'z-ai',
        'moonshotai': 'moonshotai',
        'cognitivecomputations': 'cognitivecomputations',
        'nex-agi': 'nex-agi',
        'arcee-ai': 'arcee-ai',
    };

    return providerMap[providerPart] || null;
}

/**
 * Normalize model name để match (bỏ prefix provider và :free)
 */
function normalizeModelNameForMatching(modelName: string): string {
    // Bỏ prefix provider (google/, mistralai/, etc.)
    let normalized = modelName.split('/').pop() || modelName;
    // Bỏ :free suffix
    normalized = normalized.replace(/:free$/, '');
    // Bỏ -it suffix (instruction-tuned)
    normalized = normalized.replace(/-it$/, '');
    return normalized.toLowerCase();
}

/**
 * Get model config by model name (with fallback)
 * ✅ CẢI THIỆN: Smart matching với extract provider và normalize name
 */
export function getModelConfig(modelName: string, provider?: Provider, isProductionFreeMode: boolean = true): ModelConfig {
    // Try exact match first
    if (MODEL_CONFIGS[modelName]) {
        const config = MODEL_CONFIGS[modelName];
        validateFreeMode(config, isProductionFreeMode);
        return config;
    }

    // ✅ MỚI: Extract provider từ modelName nếu không có provider
    if (!provider) {
        provider = extractProviderFromModelName(modelName) || undefined;
    }

    // ✅ MỚI: Try smart matching với normalized names
    const normalizedInput = normalizeModelNameForMatching(modelName);

    // Tìm trong tất cả models
    const allModels = Object.entries(MODEL_CONFIGS);
    for (const [key, config] of allModels) {
        const normalizedConfig = normalizeModelNameForMatching(config.modelName);

        // Match nếu normalized names giống nhau hoặc gần giống
        if (normalizedInput === normalizedConfig ||
            normalizedInput.includes(normalizedConfig) ||
            normalizedConfig.includes(normalizedInput)) {
            // Nếu có provider, kiểm tra provider match
            if (!provider || config.provider === provider) {
                validateFreeMode(config, isProductionFreeMode);
                return config;
            }
        }
    }

    // Try to match by provider and partial name
    if (provider) {
        const providerModels = Object.values(MODEL_CONFIGS).filter(m => m.provider === provider);
        const matched = providerModels.find(m => {
            const normalizedM = normalizeModelNameForMatching(m.modelName);
            return normalizedInput === normalizedM ||
                normalizedInput.includes(normalizedM) ||
                normalizedM.includes(normalizedInput);
        });
        if (matched) {
            validateFreeMode(matched, isProductionFreeMode);
            return matched;
        }

        // Fallback to default for provider
        if (provider === 'nous') {
            const config = MODEL_CONFIGS['nous-hermes-3-405b-instruct'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        } else if (provider === 'qwen') {
            const config = MODEL_CONFIGS['qwen3-235b-a22b'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        } else if (provider === 'deepseek' || provider === 'tngtech') {
            const config = MODEL_CONFIGS['deepseek-r1t-chimera'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        } else if (provider === 'mistral') {
            const config = MODEL_CONFIGS['mistral-7b-instruct'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        } else if (provider === 'meta' || provider === 'meta-llama') {
            const config = MODEL_CONFIGS['llama-3.2-3b-instruct'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        } else if (provider === 'google') {
            const config = MODEL_CONFIGS['gemma-3-27b-free'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        } else if (provider === 'nvidia') {
            const config = MODEL_CONFIGS['nemotron-nano-9b-v2'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        } else if (provider === 'kwaipilot') {
            const config = MODEL_CONFIGS['kat-coder-pro-v1'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        }
    }

    // Ultimate fallback: Gemma 3 27B Free
    const config = MODEL_CONFIGS['gemma-3-27b-free'];
    validateFreeMode(config, isProductionFreeMode);
    return config;
}

/**
 * Estimate tokens cho text dựa trên model
 * Sử dụng ratio khác nhau cho từng model
 */
export function estimateTokens(text: string, modelConfig: ModelConfig): number {
    if (!text) return 0;

    // Ước tính dựa trên ratio của model
    const estimated = Math.ceil(text.length / modelConfig.tokenEstimationRatio);

    // Điều chỉnh cho tiếng Việt (thường ít tokens hơn)
    const hasVietnamese = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạ]/.test(text);
    if (hasVietnamese) {
        // Tiếng Việt: giảm 10-15% tokens
        return Math.ceil(estimated * 0.9);
    }

    return estimated;
}

/**
 * Kiểm tra xem text có vượt quá context window không
 */
export function exceedsContextWindow(text: string, modelConfig: ModelConfig): boolean {
    const estimatedTokens = estimateTokens(text, modelConfig);
    return estimatedTokens > modelConfig.contextWindow;
}

/**
 * Tính toán safe chunk size dựa trên model config
 * Reserve 20% cho prompt/system messages và output
 */
export function calculateSafeChunkSize(modelConfig: ModelConfig, reservePercent: number = 20): number {
    const reserved = Math.floor(modelConfig.contextWindow * (reservePercent / 100));
    const safeSize = modelConfig.contextWindow - reserved;

    // Convert tokens back to chars (approximate)
    return Math.floor(safeSize * modelConfig.tokenEstimationRatio);
}

/**
 * Determine strategy dựa trên model và text size
 */
export function determineStrategy(
    text: string,
    modelConfig: ModelConfig
): {
    strategy: ModelStrategy;
    needsChunking: boolean;
    recommendedChunkSize: number;
} {
    const estimatedTokens = estimateTokens(text, modelConfig);
    const exceeds = estimatedTokens > modelConfig.contextWindow;

    if (!exceeds) {
        // Text vừa với context window → xử lý bình thường
        return {
            strategy: modelConfig.strategy,
            needsChunking: false,
            recommendedChunkSize: text.length
        };
    }

    // Text vượt quá → cần strategy
    if (modelConfig.strategy === 'truncate') {
        // Model rẻ → truncate (cắt phần đầu)
        const maxChars = calculateSafeChunkSize(modelConfig);
        return {
            strategy: 'truncate',
            needsChunking: false,
            recommendedChunkSize: maxChars
        };
    } else if (modelConfig.strategy === 'chunk-sliding') {
        // Model cao cấp → chunk với sliding window
        const chunkSize = calculateSafeChunkSize(modelConfig);
        return {
            strategy: 'chunk-sliding',
            needsChunking: true,
            recommendedChunkSize: chunkSize
        };
    } else {
        // compress-long (Gemini, Claude)
        // Có thể gửi toàn bộ, model tự compress
        // Nhưng vẫn nên chunk nếu quá lớn để đảm bảo chất lượng
        const chunkSize = calculateSafeChunkSize(modelConfig, 30); // Reserve 30% cho compression overhead
        return {
            strategy: 'compress-long',
            needsChunking: estimatedTokens > modelConfig.contextWindow * 1.5, // Chunk nếu > 1.5x limit
            recommendedChunkSize: chunkSize
        };
    }
}

/**
 * Log token usage info
 */
export function logTokenInfo(
    text: string,
    modelConfig: ModelConfig,
    context?: string
): void {
    const estimatedTokens = estimateTokens(text, modelConfig);
    const exceeds = exceedsContextWindow(text, modelConfig);
    const strategy = determineStrategy(text, modelConfig);

    const logPrefix = context ? `[${context}]` : '';
    console.log(`${logPrefix} 📊 Token Analysis:`);
    console.log(`   Model: ${modelConfig.modelName} (${modelConfig.provider})`);
    console.log(`   Context Window: ${modelConfig.contextWindow.toLocaleString()} tokens`);
    console.log(`   Estimated Tokens: ${estimatedTokens.toLocaleString()} tokens`);
    console.log(`   Text Length: ${text.length.toLocaleString()} chars`);
    console.log(`   Exceeds Limit: ${exceeds ? '⚠️ YES' : '✅ NO'}`);
    console.log(`   Strategy: ${strategy.strategy}`);
    console.log(`   Needs Chunking: ${strategy.needsChunking ? '✅ YES' : '❌ NO'}`);
    if (strategy.needsChunking) {
        console.log(`   Recommended Chunk Size: ${strategy.recommendedChunkSize.toLocaleString()} chars`);
        const numChunks = Math.ceil(text.length / strategy.recommendedChunkSize);
        console.log(`   Estimated Chunks: ${numChunks}`);
    }
}

