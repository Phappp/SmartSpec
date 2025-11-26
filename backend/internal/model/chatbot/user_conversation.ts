// [file name]: user_conversation.ts
import { Schema, model, InferSchemaType } from "mongoose";

const userConversationSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: "projects",
        required: true,
        index: true
    },

    // Contexts dành riêng cho cuộc hội thoại - phục vụ UI chatbot
    context_items: {
        type: [{
            id: { type: String, required: true },
            entity_id: { type: Schema.Types.Mixed },
            entity_type: {
                type: String,
                enum: ["usecase", "testcase", "database", "uml", "requirement", "custom"],
                default: "custom"
            },
            name: { type: String, required: true },
            data_snapshot: { type: Schema.Types.Mixed },
            added_at: { type: Date, default: Date.now }
        }],
        default: []
    },
    version_id: {
        type: Schema.Types.ObjectId,
        ref: "versions",
        required: true,
        index: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true
    },

    // Conversation Info - RIÊNG TƯ
    title: {
        type: String,
        default: "New Conversation",
        trim: true
    },

    // CONTEXT HOÀN TOÀN RIÊNG - không chia sẻ
    private_context: {
        // Focus area hiện tại
        current_focus: {
            type: String,
            enum: ["usecase", "testcase", "database", "uml", "requirement", "general"],
            default: "general"
        },

        // Entities đang thao tác - RIÊNG
        active_entities: {
            usecase_ids: [{
                entity_id: { type: Schema.Types.ObjectId, ref: "usecase_diagrams" },
                last_mentioned: { type: Date, default: Date.now },
                mention_count: { type: Number, default: 1 }
            }],
            testcase_ids: [{
                entity_id: { type: Schema.Types.ObjectId, ref: "testcases" },
                last_mentioned: Date,
                mention_count: Number
            }],
            database_ids: [{
                entity_id: { type: Schema.Types.ObjectId, ref: "databases" },
                last_mentioned: Date,
                mention_count: Number
            }]
        },

        // Short-term memory - RIÊNG
        short_term_memory: {
            last_mentioned_entities: [{
                entity_type: String,
                entity_id: Schema.Types.Mixed,
                mentioned_at: { type: Date, default: Date.now }
            }],
            recent_topics: [{
                topic: String,
                discussed_at: Date
            }]
        },

        // User's working style - RIÊNG
        working_style: {
            preference_detail_level: { // Mức độ chi tiết user thích
                type: String,
                enum: ["brief", "normal", "detailed"],
                default: "normal"
            },
            technical_level: { // Trình độ kỹ thuật
                type: String,
                enum: ["beginner", "intermediate", "expert"],
                default: "intermediate"
            },
            preferred_diagram_types: [{ // Loại diagram ưa thích
                type: String,
                enum: ["usecase", "sequence", "activity", "database"]
            }]
        }
    },

    // Conversation State - RIÊNG
    conversation_state: {
        last_user_intent: { type: String }, // "analyze", "create", "debug", "review"
        pending_actions: [{
            action: String,
            target_entity: Schema.Types.Mixed,
            created_at: { type: Date, default: Date.now }
        }],
        unresolved_questions: [{
            question: String,
            asked_at: Date
        }]
    },

    // Analytics - RIÊNG cho user
    personal_analytics: {
        total_messages: { type: Number, default: 0 },
        favorite_tools: [{
            tool_name: String,
            usage_count: { type: Number, default: 0 },
            last_used: Date
        }],
        common_patterns: [{
            pattern_type: String, // "analyze_then_create", "debug_focused", etc
            frequency: { type: Number, default: 0 }
        }]
    },

    // Status
    status: {
        type: String,
        enum: ["active", "archived", "pinned"],
        default: "active"
    },

    // Long-term memory the assistant can learn per conversation
    memory_notes: {
        type: [{
            note: { type: String, required: true },
            created_at: { type: Date, default: Date.now }
        }],
        default: []
    },

    // Operation stats
    message_count: { type: Number, default: 0 },
    last_activity: { type: Date, default: Date.now }

}, {
    timestamps: true
});

// Index for personal conversations
userConversationSchema.index({ user_id: 1, project_id: 1, status: 1 });
userConversationSchema.index({ user_id: 1, last_activity: -1 });
userConversationSchema.index({
    "private_context.active_entities.usecase_ids.entity_id": 1
});

type UserConversationSchemaInferType = InferSchemaType<typeof userConversationSchema>;
export default model<UserConversationSchemaInferType>("user_conversations", userConversationSchema);