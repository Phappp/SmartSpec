import { InferSchemaType, model, Schema } from 'mongoose';

const apiKeySchema = new Schema({
    key_value: { type: String, required: true },
    provider: { type: String, enum: ['gemini', 'openai', 'claude', 'nous', 'qwen', 'deepseek', 'mistral', 'meta', 'allenai', 'google', 'amazon', 'nvidia', 'kwaipilot', 'openrouter', 'nex-agi', 'arcee-ai', 'tngtech', 'alibaba', 'z-ai', 'moonshotai', 'cognitivecomputations', 'meta-llama', 'x-ai'], required: true },
    model_name: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'users' },
    // Các field mới cho quản lý nâng cao
    display_name: { type: String, default: '' },
    description: { type: String, default: '' },
    daily_limit: { type: Number, default: null },
    rate_limit: { type: Number, default: null },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    expires_at: { type: Date, default: null },
    permissions: {
        text_generation: { type: Boolean, default: true },
        code_generation: { type: Boolean, default: true },
        analysis: { type: Boolean, default: true },
        chat_models: { type: Boolean, default: true },
        vision_models: { type: Boolean, default: false },
        embedding_models: { type: Boolean, default: false },
    },
    // Thống kê sử dụng
    usage_count: { type: Number, default: 0 },
    last_used: { type: Date, default: null },
}, { timestamps: true });

type ApiKeySchemaInferType = InferSchemaType<typeof apiKeySchema>;
export default model<ApiKeySchemaInferType>('api_keys', apiKeySchema);









