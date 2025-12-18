import { InferSchemaType, model, Schema } from "mongoose";
import { randomUUID } from "crypto";

// Schema cho Actor (thay thế role) - relaxed validation
export const actorSchema = new Schema({
    id: {
        type: String,
        default: () => randomUUID()
    },
    name: { type: String, default: "User" },
    description: { type: String, default: "" }
}, { _id: false });

// Schema cho Context
export const contextSchema = new Schema({
    module: { type: String, default: "" },
    scope: { type: String, default: "" },
    system: { type: String, default: "" }
}, { _id: false });

// Schema cho Trigger - relaxed validation
export const triggerSchema = new Schema({
    event: { type: String, default: "" },
    source: { type: String, default: "UI" }
}, { _id: false });

// Schema cho Main Flow Step - relaxed validation
export const mainFlowStepSchema = new Schema({
    step: { type: Number, default: 1 },
    actor: { type: String, default: "User" },
    action: { type: String, default: "" },
    inputs: { type: [String], default: [] },
    rules_applied: { type: [String], default: [] },
    expected_result: { type: String, default: "" }
}, { _id: false });

// Schema cho Alternative Flow - relaxed validation
export const alternativeFlowSchema = new Schema({
    id: { type: String, default: "" },
    at_step: { type: Number, default: 1 },
    condition: { type: String, default: "" },
    system_response: { type: String, default: "" },
    end_state: { type: String, default: "" }
}, { _id: false });

// Schema cho Exception - relaxed validation
export const exceptionSchema = new Schema({
    id: { type: String, default: "" },
    at_step: { type: Number, default: 1 },
    type: { type: String, default: "System" }, // Network, System, Business, etc.
    description: { type: String, default: "" },
    system_response: { type: String, default: "" }
}, { _id: false });

// Schema cho Rule - relaxed validation
export const ruleSchema = new Schema({
    id: { type: String, default: "" },
    description: { type: String, default: "" }
}, { _id: false });

// Schema cho Input/Output - relaxed validation
export const inputOutputSchema = new Schema({
    name: { type: String, default: "" },
    type: { type: String, default: "string" },
    required: { type: Boolean, default: true },
    optional: { type: Boolean, default: false }
}, { _id: false });

// Schema cho Audit - relaxed validation
export const auditSchema = new Schema({
    created_by: {
        type: Schema.Types.ObjectId,
        ref: "users"
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
        default: "",
        trim: true
    },
    actor: {
        type: actorSchema,
        default: () => ({ id: "user", name: "User", description: "" })
    },
    goal: {
        type: String,
        default: "",
        trim: true
    },
    business_reason: {
        type: String,
        default: "",
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
        default: "medium",
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
        default: () => ({ event: "", source: "UI" })
    },

    // === FLOWS ===
    preconditions: {
        type: [String],
        default: []
    },
    main_flow: {
        type: [mainFlowStepSchema],
        default: []
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
        default: () => ({ created_at: new Date(), updated_at: new Date() })
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
