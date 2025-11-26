import { Schema, model, InferSchemaType } from "mongoose";

const chatOperationSchema = new Schema({
    conversation_id: {
        type: Schema.Types.ObjectId,
        ref: "user_conversations",
        required: true,
        index: true
    },
    project_id: {
        type: Schema.Types.ObjectId,
        ref: "projects",
        required: true,
        index: true
    },
    version_id: {
        type: Schema.Types.ObjectId,
        ref: "versions",
        required: true,
        index: true
    },
    entity_type: {
        type: String,
        enum: ["usecase", "testcase", "database", "uml-activity", "uml-usecase", "uml-sequence"],
        required: true
    },
    entity_id: { type: String, required: true },
    action: {
        type: String,
        enum: ["create", "update", "delete", "read"],
        required: true
    },
    before_snapshot: { type: Schema.Types.Mixed, default: null },
    after_snapshot: { type: Schema.Types.Mixed, default: null },
    description: { type: String },
    status: {
        type: String,
        enum: ["pending", "kept", "undone"],
        default: "pending",
        index: true
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

chatOperationSchema.index({ conversation_id: 1, status: 1, created_at: -1 });

type ChatOperationInferType = InferSchemaType<typeof chatOperationSchema>;
export default model<ChatOperationInferType>("chatbot_operations", chatOperationSchema);

