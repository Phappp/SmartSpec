import { InferSchemaType, model, Schema } from "mongoose";
import { randomUUID } from "crypto";

// Schema cho Role
export const roleSchema = new Schema({
    id: {
        type: String,
        required: true,
        default: () => randomUUID()
    },
    name: { type: String, required: true },
    description: { type: String, default: "" }
}, { _id: false });

// Schema cho Usecase - Model độc lập (giống testcase.ts)
const usecaseSchema = new Schema({
    // === LIÊN KẾT DỰ ÁN ===
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

    // === THÔNG TIN CHÍNH ===
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    role: {
        type: roleSchema,
        required: true
    },
    goal: {
        type: String,
        required: true,
        trim: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    tasks: {
        type: [String],
        required: true
    },
    inputs: {
        type: [String],
        default: []
    },
    outputs: {
        type: [String],
        default: []
    },
    context: {
        type: String,
        default: "",
        trim: true
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        required: true,
        index: true
    },
    feedback: {
        type: Schema.Types.Mixed,
        default: null
    },
    rules: {
        type: [String],
        default: []
    },
    triggers: {
        type: [String],
        default: []
    },
    preconditions: {
        type: [String],
        default: []
    },
    postconditions: {
        type: [String],
        default: []
    },
    exceptions: {
        type: [String],
        default: []
    },
    stakeholders: {
        type: [String],
        default: []
    },
    constraints: {
        type: [String],
        default: []
    },
    related_usecases: [{
        type: Schema.Types.ObjectId,
        ref: "usecases",
        index: true
    }],

    // === THEO DÕI / AUDIT TRAIL ===
    created_by: {
        type: Schema.Types.ObjectId,
        ref: "users"
    },
    updated_by: {
        type: Schema.Types.ObjectId,
        ref: "users"
    }
}, {
    timestamps: true
});

// === INDEXES (ENTERPRISE OPTIMIZED) ===
usecaseSchema.index({ project_id: 1, version_id: 1 });
usecaseSchema.index({ project_id: 1 });
usecaseSchema.index({ version_id: 1 });
usecaseSchema.index({ "related_usecases": 1 });
usecaseSchema.index({ name: 1 });
usecaseSchema.index({ priority: 1 });
usecaseSchema.index({ project_id: 1, priority: 1 });
usecaseSchema.index({ version_id: 1, priority: 1 });

type UsecaseSchemaInferType = InferSchemaType<typeof usecaseSchema>;
export default model<UsecaseSchemaInferType>("usecases", usecaseSchema);
