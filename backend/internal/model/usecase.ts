import { InferSchemaType, model, Schema } from "mongoose";
import { randomUUID } from "crypto";

// Schema cho Actor (thay thế role)
export const actorSchema = new Schema({
    id: {
        type: String,
        required: true,
        default: () => randomUUID()
    },
    name: { type: String, required: true },
    description: { type: String, default: "" }
}, { _id: false });

// Schema cho Context
export const contextSchema = new Schema({
    module: { type: String, default: "" },
    scope: { type: String, default: "" },
    system: { type: String, default: "" }
}, { _id: false });

// Schema cho Trigger
export const triggerSchema = new Schema({
    event: { type: String, required: true },
    source: { type: String, default: "UI" }
}, { _id: false });

// Schema cho Main Flow Step
export const mainFlowStepSchema = new Schema({
    step: { type: Number, required: true },
    actor: { type: String, required: true },
    action: { type: String, required: true },
    inputs: { type: [String], default: [] },
    rules_applied: { type: [String], default: [] },
    expected_result: { type: String, required: true }
}, { _id: false });

// Schema cho Alternative Flow
export const alternativeFlowSchema = new Schema({
    id: { type: String, required: true },
    at_step: { type: Number, required: true },
    condition: { type: String, required: true },
    system_response: { type: String, required: true },
    end_state: { type: String, required: true }
}, { _id: false });

// Schema cho Exception
export const exceptionSchema = new Schema({
    id: { type: String, required: true },
    at_step: { type: Number, required: true },
    type: { type: String, required: true }, // Network, System, Business, etc.
    description: { type: String, required: true },
    system_response: { type: String, required: true }
}, { _id: false });

// Schema cho Rule
export const ruleSchema = new Schema({
    id: { type: String, required: true },
    description: { type: String, required: true }
}, { _id: false });

// Schema cho Input/Output
export const inputOutputSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, default: true },
    optional: { type: Boolean, default: false }
}, { _id: false });

// Schema cho Audit
export const auditSchema = new Schema({
    created_by: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    created_at: { type: Date, default: Date.now },
    updated_by: {
        type: Schema.Types.ObjectId,
        ref: "users"
    },
    updated_at: { type: Date, default: Date.now }
}, { _id: false });

// Schema cho Usecase - Model mới
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

    // === METADATA ===
    type: {
        type: String,
        enum: ["use_case", "epic", "feature"],
        default: "use_case",
        index: true
    },
    level: {
        type: String,
        enum: ["system", "module", "component"],
        default: "system",
        index: true
    },
    status: {
        type: String,
        enum: ["active", "inactive", "deprecated"],
        default: "active",
        index: true
    },

    // === THÔNG TIN CHÍNH ===
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    actor: {
        type: actorSchema,
        required: true
    },
    goal: {
        type: String,
        required: true,
        trim: true
    },
    business_reason: {
        type: String,
        required: true,
        trim: true
    },

    // === CONTEXT ===
    context: {
        type: contextSchema,
        default: () => ({})
    },

    // === PRIORITY & FREQUENCY ===
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        required: true,
        index: true
    },
    frequency: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },

    // === TRIGGER ===
    trigger: {
        type: triggerSchema,
        required: true
    },

    // === FLOWS ===
    preconditions: {
        type: [String],
        default: []
    },
    main_flow: {
        type: [mainFlowStepSchema],
        required: true
    },
    alternative_flows: {
        type: [alternativeFlowSchema],
        default: []
    },
    exceptions: {
        type: [exceptionSchema],
        default: []
    },
    postconditions: {
        type: [String],
        default: []
    },

    // === RULES ===
    rules: {
        type: [ruleSchema],
        default: []
    },

    // === INPUTS & OUTPUTS ===
    inputs: {
        type: [inputOutputSchema],
        default: []
    },
    outputs: {
        type: [inputOutputSchema],
        default: []
    },

    // === CONSTRAINTS & STAKEHOLDERS ===
    non_functional_constraints: {
        type: [String],
        default: []
    },
    stakeholders: {
        type: [String],
        default: []
    },

    // === RELATED USE CASES ===
    related_usecases: [{
        type: Schema.Types.ObjectId,
        ref: "usecases",
        index: true
    }],

    // === AUDIT TRAIL ===
    audit: {
        type: auditSchema,
        required: true
    }
}, {
    timestamps: false // Sử dụng audit.created_at và audit.updated_at thay vì timestamps
});

// === INDEXES (ENTERPRISE OPTIMIZED) ===
usecaseSchema.index({ project_id: 1, version_id: 1 });
usecaseSchema.index({ project_id: 1 });
usecaseSchema.index({ version_id: 1 });
usecaseSchema.index({ "related_usecases": 1 });
usecaseSchema.index({ name: 1 });
usecaseSchema.index({ priority: 1 });
usecaseSchema.index({ type: 1 });
usecaseSchema.index({ level: 1 });
usecaseSchema.index({ status: 1 });
usecaseSchema.index({ project_id: 1, priority: 1 });
usecaseSchema.index({ version_id: 1, priority: 1 });

type UsecaseSchemaInferType = InferSchemaType<typeof usecaseSchema>;
export default model<UsecaseSchemaInferType>("usecases", usecaseSchema);
