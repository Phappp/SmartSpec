import { InferSchemaType, model, Schema } from 'mongoose';

const apiKeySchema = new Schema({
    key_value: { type: String, required: true },
    provider: { type: String, enum: ['gemini', 'openai', 'claude'], required: true },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'users' },
}, { timestamps: true });

type ApiKeySchemaInferType = InferSchemaType<typeof apiKeySchema>;
export default model<ApiKeySchemaInferType>('api_keys', apiKeySchema);








