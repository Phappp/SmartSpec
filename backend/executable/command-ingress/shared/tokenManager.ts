/**
 * Token Management Utility
 * Quản lý token estimation, context window limits, và strategies cho từng LLM model
 * 
 * LLM đọc TOKEN, không đọc chữ. Mỗi model có cách tokenize khác nhau.
 */

export type Provider = 'gemini' | 'openai' | 'claude';
export type ModelStrategy = 'truncate' | 'chunk-sliding' | 'compress-long';

export interface ModelConfig {
    provider: Provider;
    modelName: string;
    contextWindow: number; // Max tokens
    strategy: ModelStrategy;
    tokenEstimationRatio: number; // chars per token (approximate)
    supportsLongContext: boolean;
    supportsCompression: boolean;
}

/**
 * Model configurations với context window limits
 */
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
    // Gemini models
    'gemini-2.0-flash': {
        provider: 'gemini',
        modelName: 'gemini-2.0-flash',
        contextWindow: 1000000, // ~1M tokens
        strategy: 'compress-long',
        tokenEstimationRatio: 3.0, // ~3 chars/token (tiếng Việt)
        supportsLongContext: true,
        supportsCompression: true
    },
    'gemini-2.0-flash-001': {
        provider: 'gemini',
        modelName: 'gemini-2.0-flash-001',
        contextWindow: 1000000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.0,
        supportsLongContext: true,
        supportsCompression: true
    },
    'gemini-2.5-flash': {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        contextWindow: 1000000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.0,
        supportsLongContext: true,
        supportsCompression: true
    },
    'gemini-1.5-pro': {
        provider: 'gemini',
        modelName: 'gemini-1.5-pro',
        contextWindow: 2000000, // 2M tokens
        strategy: 'compress-long',
        tokenEstimationRatio: 3.0,
        supportsLongContext: true,
        supportsCompression: true
    },
    
    // OpenAI models
    'gpt-4o': {
        provider: 'openai',
        modelName: 'gpt-4o',
        contextWindow: 128000, // 128k tokens
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0, // ~4 chars/token (tiếng Anh)
        supportsLongContext: true,
        supportsCompression: false
    },
    'gpt-4o-mini': {
        provider: 'openai',
        modelName: 'gpt-4o-mini',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'gpt-4-turbo': {
        provider: 'openai',
        modelName: 'gpt-4-turbo',
        contextWindow: 128000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 4.0,
        supportsLongContext: true,
        supportsCompression: false
    },
    'gpt-3.5-turbo': {
        provider: 'openai',
        modelName: 'gpt-3.5-turbo',
        contextWindow: 16385, // 16k tokens
        strategy: 'truncate',
        tokenEstimationRatio: 4.0,
        supportsLongContext: false,
        supportsCompression: false
    },
    
    // Claude models
    'claude-3-5-sonnet': {
        provider: 'claude',
        modelName: 'claude-3-5-sonnet',
        contextWindow: 200000, // 200k tokens
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'claude-3-opus': {
        provider: 'claude',
        modelName: 'claude-3-opus',
        contextWindow: 200000,
        strategy: 'compress-long',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: true
    },
    'claude-3-haiku': {
        provider: 'claude',
        modelName: 'claude-3-haiku',
        contextWindow: 200000,
        strategy: 'chunk-sliding',
        tokenEstimationRatio: 3.5,
        supportsLongContext: true,
        supportsCompression: false
    }
};

/**
 * Get model config by model name (with fallback)
 */
export function getModelConfig(modelName: string, provider?: Provider): ModelConfig {
    // Try exact match first
    if (MODEL_CONFIGS[modelName]) {
        return MODEL_CONFIGS[modelName];
    }
    
    // Try to match by provider and partial name
    if (provider) {
        const providerModels = Object.values(MODEL_CONFIGS).filter(m => m.provider === provider);
        const matched = providerModels.find(m => 
            modelName.toLowerCase().includes(m.modelName.toLowerCase()) ||
            m.modelName.toLowerCase().includes(modelName.toLowerCase())
        );
        if (matched) return matched;
        
        // Fallback to default for provider
        if (provider === 'gemini') {
            return MODEL_CONFIGS['gemini-2.0-flash'];
        } else if (provider === 'openai') {
            return MODEL_CONFIGS['gpt-4o'];
        } else if (provider === 'claude') {
            return MODEL_CONFIGS['claude-3-5-sonnet'];
        }
    }
    
    // Ultimate fallback: Gemini 2.0 Flash
    return MODEL_CONFIGS['gemini-2.0-flash'];
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

