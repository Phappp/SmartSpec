import { InferSchemaType, model, Schema } from 'mongoose';

const apiUsageSchema = new Schema({
    api_key_id: {
        type: Schema.Types.ObjectId,
        ref: 'api_keys',
        required: true,
    },
    provider: {
        type: String,
        enum: ['gemini', 'openai', 'claude'],
        required: true,
    },
    model_name: {
        type: String,
        default: '',
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        default: null,
    },
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'projects',
        default: null,
    },
    // Thông tin request
    request_type: {
        type: String,
        enum: ['text', 'image', 'audio', 'document', 'other'],
        default: 'other',
    },
    endpoint: {
        type: String,
        default: '',
    },
    // Thông tin tokens
    prompt_tokens: {
        type: Number,
        default: 0,
    },
    completion_tokens: {
        type: Number,
        default: 0,
    },
    total_tokens: {
        type: Number,
        default: 0,
    },
    // Trạng thái
    status: {
        type: String,
        enum: ['success', 'failed', 'timeout'],
        required: true,
    },
    status_code: {
        type: Number,
        default: null,
    },
    error_message: {
        type: String,
        default: null,
    },
    // Thời gian xử lý (ms)
    response_time: {
        type: Number,
        default: 0,
    },
    // Metadata
    ip_address: {
        type: String,
        default: null,
    },
    user_agent: {
        type: String,
        default: null,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    indexes: [
        { provider: 1, created_at: -1 },
        { api_key_id: 1, created_at: -1 },
        { status: 1, created_at: -1 },
        { user_id: 1, created_at: -1 },
    ],
});

type ApiUsageSchemaInferType = InferSchemaType<typeof apiUsageSchema>;
export default model<ApiUsageSchemaInferType>('api_usages', apiUsageSchema);

