/**
 * Token Management Utility
 * Quản lý token estimation, context window limits, và strategies cho từng LLM model
 * 
 * LLM đọc TOKEN, không đọc chữ. Mỗi model có cách tokenize khác nhau.
 */

export type Provider = 'gemini' | 'openai' | 'claude' | 'nous' | 'qwen' | 'deepseek' | 'mistral' | 'meta' | 'allenai' | 'google' | 'amazon' | 'nvidia' | 'kwaipilot' | 'openrouter';
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
        modelName: 'nous/hermes-3-405b-instruct',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'qwen3-235b-a22b': {
        provider: 'qwen',
        modelName: 'qwen/qwen3-235b-a22b',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'deepseek-r1t-chimera': {
        provider: 'deepseek',
        modelName: 'tng/deepseek-r1t-chimera',
        category: 'agent',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },

    // =========================
    // ⚙️ WORKER (FREE)
    // =========================
    'gemma-3-4b-free': {
        provider: 'google',
        modelName: 'google/gemma-3-4b:free',
        category: 'worker',
        contextWindow: 32000,
        strategy: 'truncate',
        tokenEstimationRatio: 4.0,
        supportsLongContext: false,
        supportsCompression: false
    },
    'gemma-3-12b-free': {
        provider: 'google',
        modelName: 'google/gemma-3-12b:free',
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
    'mistral-7b-instruct': {
        provider: 'mistral',
        modelName: 'mistral/mistral-7b-instruct',
        category: 'worker',
        contextWindow: 32000,
        strategy: 'truncate',
        tokenEstimationRatio: 4.0,
        supportsLongContext: false,
        supportsCompression: false
    },
    'llama-3.2-3b-instruct': {
        provider: 'meta',
        modelName: 'meta/llama-3.2-3b-instruct',
        category: 'worker',
        contextWindow: 16384,
        strategy: 'truncate',
        tokenEstimationRatio: 4.0,
        supportsLongContext: false,
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
        modelName: 'nvidia/nemotron-nano-9b-v2',
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
        modelName: 'nvidia/nemotron-nano-12b-2-vl',
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
 * Get model config by model name (with fallback)
 */
export function getModelConfig(modelName: string, provider?: Provider, isProductionFreeMode: boolean = true): ModelConfig {
    // Try exact match first
    if (MODEL_CONFIGS[modelName]) {
        const config = MODEL_CONFIGS[modelName];
        validateFreeMode(config, isProductionFreeMode);
        return config;
    }

    // Try to match by provider and partial name
    if (provider) {
        const providerModels = Object.values(MODEL_CONFIGS).filter(m => m.provider === provider);
        const matched = providerModels.find(m =>
            modelName.toLowerCase().includes(m.modelName.toLowerCase()) ||
            m.modelName.toLowerCase().includes(modelName.toLowerCase())
        );
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
        } else if (provider === 'deepseek') {
            const config = MODEL_CONFIGS['deepseek-r1t-chimera'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        } else if (provider === 'mistral') {
            const config = MODEL_CONFIGS['mistral-7b-instruct'];
            validateFreeMode(config, isProductionFreeMode);
            return config;
        } else if (provider === 'meta') {
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

