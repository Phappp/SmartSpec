// [file name]: user_learning_profile.ts
import { Schema, model, InferSchemaType } from "mongoose";

const learningProfileSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        unique: true
    },

    // Learning từ tất cả conversations của user - RIÊNG TƯ
    learned_patterns: {
        common_workflows: [{
            workflow_name: String, // "analyze_before_creating", "test_driven" 
            frequency: { type: Number, default: 0 },
            last_used: Date,
            success_rate: { type: Number, default: 0 } // Tỷ lệ thành công
        }],
        preferred_tools: [{
            tool_name: String,
            usage_count: { type: Number, default: 0 },
            comfort_level: { type: Number, min: 0, max: 1, default: 0.5 }
        }],
        expertise_areas: [{
            area: String, // "database_design", "testing", "usecase_analysis"
            confidence_score: { type: Number, min: 0, max: 1, default: 0.5 },
            last_practiced: Date
        }]
    },

    // Communication Style - RIÊNG
    communication_style: {
        verbosity: { // Độ dài câu trả lời user thích
            type: String,
            enum: ["concise", "balanced", "detailed"],
            default: "balanced"
        },
        technical_depth: { // Độ sâu kỹ thuật
            type: String,
            enum: ["high_level", "practical", "deep_technical"],
            default: "practical"
        },
        learning_preference: { // Cách học
            type: String,
            enum: ["examples_based", "step_by_step", "conceptual"],
            default: "examples_based"
        }
    },

    // Personal Vocabulary - RIÊNG
    personal_vocabulary: {
        custom_terms: [{
            term: String,
            meaning: String,
            usage_count: { type: Number, default: 0 }
        }],
        preferred_naming: { // Quy ước đặt tên user thích
            usecase_pattern: { type: String, default: "UC-{id}" },
            testcase_pattern: { type: String, default: "TC-{id}" }
        }
    },

    // Performance Metrics - RIÊNG
    performance_metrics: {
        average_response_quality: { type: Number, min: 0, max: 5, default: 0 },
        task_completion_rate: { type: Number, min: 0, max: 1, default: 0 },
        preferred_diagram_complexity: { // Độ phức tạp diagram user thích
            type: String,
            enum: ["simple", "moderate", "complex"],
            default: "moderate"
        }
    }

}, {
    timestamps: true
});

type LearningProfileSchemaInferType = InferSchemaType<typeof learningProfileSchema>;
export default model<LearningProfileSchemaInferType>("user_learning_profiles", learningProfileSchema);