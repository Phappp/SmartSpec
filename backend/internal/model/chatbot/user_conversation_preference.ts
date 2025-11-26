// [file name]: user_conversation_preference.ts
import { Schema, model, InferSchemaType } from "mongoose";

const preferenceSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true
    },
    project_id: {
        type: Schema.Types.ObjectId,
        ref: "projects",
        required: true,
        index: true
    },

    // UI & Behavior Preferences
    ui_preferences: {
        default_focus_area: {
            type: String,
            enum: ["usecase", "testcase", "database", "uml", "requirement", "general"],
            default: "general"
        },
        show_tool_suggestions: { type: Boolean, default: true },
        auto_expand_entities: { type: Boolean, default: false },
        theme: { type: String, enum: ["light", "dark"], default: "light" }
    },

    // AI Behavior Preferences
    ai_preferences: {
        auto_save_context: { type: Boolean, default: true },
        suggest_related_entities: { type: Boolean, default: true },
        proactive_suggestions: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Unique constraint
preferenceSchema.index({ user_id: 1, project_id: 1 }, { unique: true });

type PreferenceSchemaInferType = InferSchemaType<typeof preferenceSchema>;
export default model<PreferenceSchemaInferType>("user_conversation_preferences", preferenceSchema);