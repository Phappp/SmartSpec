import { InferSchemaType, model, Schema } from "mongoose";
import { randomUUID } from "crypto";

const requirementModelSchema = new Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    goal: { type: String, required: true },
    reason: { type: String, required: true },
    tasks: { type: [String], required: true },
    inputs: { type: [String], required: true },
    outputs: { type: [String], required: true },
    context: { type: String, required: true },
    priority: { type: String, enum: ["low", "medium", "high"], required: true },
    feedback: { type: Schema.Types.Mixed, default: null },
    rules: { type: [String], required: true },
    triggers: { type: [String], required: true },
    preconditions: { type: [String], required: true },
    postconditions: { type: [String], required: true },
    exceptions: { type: [String], required: true },
    stakeholders: { type: [String], required: true },
    constraints: { type: [String], required: true },
    related_usecases: { type: [String], required: true },
}, { _id: false });

const conflictSchema = new Schema({
    conflict_id: {
        type: String,
        default: () => randomUUID(), // ✅ UUID tự sinh
        required: true
    },
    existing: {
        type: requirementModelSchema,
        required: true
    },
    new: {
        type: requirementModelSchema,
        required: true
    }
}); // ⚠️ không để _id: false, để mỗi conflict có _id riêng

const versionSchema = new Schema({
    project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
    version_number: { type: Number, required: true },
    created_by: { type: Schema.Types.ObjectId, ref: "users", required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    inputs: [{ type: Schema.Types.ObjectId, ref: "inputs" }],
    outputs: [{ type: Schema.Types.ObjectId, ref: "outputs" }],
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed', 'has_conflicts'],
        default: 'processing'
    },
    // merged_text: { type: String, required: true },
    affects_requirement: { type: Boolean, default: false },
    requirement_model: { type: [requirementModelSchema], default: [] },
    pending_conflicts: { type: [conflictSchema], default: [] },
    processing_errors: { type: [String], default: [] }
}, {
    timestamps: true
});

type VersionSchemaInferType = InferSchemaType<typeof versionSchema>;
export default model<VersionSchemaInferType>("versions", versionSchema);
