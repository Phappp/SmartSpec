// [file name]: conversation_message.ts
import { Schema, model, InferSchemaType } from "mongoose";

const messageSchema = new Schema({
    conversation_id: {
        type: Schema.Types.ObjectId,
        ref: "user_conversations",
        required: true,
        index: true
    },

    // Message Content
    content: {
        text: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ["text", "system", "tool_call", "tool_result", "entity_reference"],
            default: "text"
        }
    },

    // Sender
    sender: {
        type: {
            type: String,
            enum: ["user", "assistant", "system", "tool"],
            required: true
        },
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "users",
            required: function () { return this.sender.type === 'user'; }
        }
    },

    // Tool Execution - RIÊNG cho conversation này
    tool_calls: [{
        id: { type: String, required: true },
        function: {
            name: { type: String, required: true },
            arguments: { type: Schema.Types.Mixed }
        },
        status: {
            type: String,
            enum: ["pending", "executing", "success", "error"],
            default: "pending"
        },
        result: { type: Schema.Types.Mixed },
        error_message: { type: String },
        executed_at: { type: Date }
    }],

    // Context tại thời điểm gửi message - ẢNH CHỤP RIÊNG
    context_snapshot: {
        active_entities: [{
            entity_type: String,
            entity_id: Schema.Types.Mixed,
            entity_name: String
        }],
        current_focus: String,
        user_intent: String
    },

    // Metadata
    metadata: {
        is_edited: { type: Boolean, default: false },
        edited_at: { type: Date },
        triggers_context_update: { type: Boolean, default: false } // Có update context không
    }

}, {
    timestamps: true
});

// Index for context-based retrieval
messageSchema.index({ conversation_id: 1, createdAt: -1 });
messageSchema.index({
    "context_snapshot.active_entities.entity_id": 1
});

type MessageSchemaInferType = InferSchemaType<typeof messageSchema>;
export default model<MessageSchemaInferType>("conversation_messages", messageSchema);