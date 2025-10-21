import { InferSchemaType, model, Schema } from "mongoose";
import { randomUUID } from "crypto";

const requirementModelSchema = new Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    goal: { type: String, required: true },
    reason: { type: String, required: true },
    tasks: { type: [String], required: true },
    inputs: { type: [String], default: [] },
    outputs: { type: [String], default: [] },
    context: { type: String, default: "" }, // hoặc required: false
    priority: { type: String, enum: ["low", "medium", "high"], required: true },
    feedback: { type: Schema.Types.Mixed, default: null },
    rules: { type: [String], default: [] },
    triggers: { type: [String], default: [] },
    preconditions: { type: [String], default: [] },
    postconditions: { type: [String], default: [] },
    exceptions: { type: [String], default: [] },
    stakeholders: { type: [String], default: [] },
    constraints: { type: [String], default: [] },
    related_usecases: { type: [String], default: [] },
}, { _id: false });

const conflictSchema = new Schema({
    conflict_id: {
        type: String,
        default: () => randomUUID(),
        required: true
    },
    // Chứa một mảng các use case bị trùng lặp
    items: {
        type: [requirementModelSchema],
        required: true
    }
});

const versionSchema = new Schema({
    project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
    version_major: { type: Number, required: true, default: 1 }, // ví dụ: 1.x
    version_minor: { type: Number, required: true, default: 0 }, // ví dụ: x.1
    version_number: { type: String, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: "users", required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    inputs: [{ type: Schema.Types.ObjectId, ref: "inputs" }],
    outputs: [{ type: Schema.Types.ObjectId, ref: "outputs" }],
    progress: { type: Number, default: 0 }, // %
    stage: { type: String, enum: ["normalization", "input", "analyzing", "finalizing", "completed", "failed"], default: "input" },
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
versionSchema.pre("save", function (next) {
    if (this.version_major != null && this.version_minor != null) {
        this.version_number = `${this.version_major}.${this.version_minor}`;
    }
    next();
});
type VersionSchemaInferType = InferSchemaType<typeof versionSchema>;
export default model<VersionSchemaInferType>("versions", versionSchema);