import { InferSchemaType, model, Schema } from "mongoose";
import { randomUUID } from "crypto";

// Conflict schema - items giờ reference usecase _id thay vì embed
const conflictSchema = new Schema({
    conflict_id: {
        type: String,
        default: () => randomUUID(),
        required: true
    },
    items: [{
        type: Schema.Types.ObjectId,
        ref: "usecases",
        required: true
    }]
});

const versionSchema = new Schema({
    project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
    version_major: { type: Number, required: true, default: 1 }, // ví dụ: 1.x
    version_minor: { type: Number, required: true, default: 0 }, // ví dụ: x.1
    version_number: { type: String, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: "users", required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    parent_version_id: { type: Schema.Types.ObjectId, ref: "versions", default: null },
    version_temporary: { type: Boolean, default: true }, // là version tmp -> true
    inputs: [{ type: Schema.Types.ObjectId, ref: "inputs" }],
    progress: { type: Number, default: 0 },
    stage: { type: String, enum: ["normalization", "input", "analyzing", "finalizing", "completed", "failed"], default: "input" },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed', 'has_conflicts'],
        default: 'processing'
    },
    affects_requirement: { type: Boolean, default: false },
    pending_conflicts: { type: [conflictSchema], default: [] },
    processing_errors: { type: [String], default: [] },
    // ===== TRƯỜNG MỚI: CỜ VERSION =====
    edit_flag: {
        type: String,
        enum: ["editing", "locked", "none"],
        default: "none"
    },
    // ===== TRƯỜNG MỚI: CHECKPOINT CHO RESUME =====
    processing_checkpoint: {
        type: Schema.Types.Mixed,
        default: null
    }
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