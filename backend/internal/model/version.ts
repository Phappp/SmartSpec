import { InferSchemaType, model, Schema } from "mongoose";

// Schema cho requirement_model (embedded document)
const requirementModelSchema = new Schema({
  id: { type: String, required: true },         // uuid
  name: { type: String, required: true },
  role: { type: String, default: "" },
  goal: { type: String, default: "" },
  reason: { type: String, default: "" },
  tasks: { type: [String], default: [] },
  inputs: { type: [String], default: [] },
  outputs: { type: [String], default: [] },
  context: { type: String, default: "" },
  priority: { type: String, default: "medium" },
  feedback: { type: String, default: "" },
  rules: { type: [String], default: [] },
  triggers: { type: String, default: "" },
  preconditions: { type: [String], default: [] },
  postconditions: { type: [String], default: [] },
  exceptions: { type: [String], default: [] },
  stakeholders: { type: [String], default: [] },
  constraints: { type: [String], default: [] },
  related_usecases: { type: [String], default: [] }
}, { _id: false });

// Schema chính cho version
const versionSchema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true
  },
  version_number: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  trigger_action: {
    type: String,
    enum: ["input_update", "output_update", "rollback"],
    default: null
  },
  inputs: [{
    type: Schema.Types.ObjectId,
    ref: "inputs"
  }],
  outputs: [{
    type: Schema.Types.ObjectId,
    ref: "outputs"
  }],
  affects_requirement: {
    type: Boolean,
    default: false
  },
  requirement_model: {
    type: requirementModelSchema,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

type VersionSchemaInferType = InferSchemaType<typeof versionSchema>;
export default model<VersionSchemaInferType>("versions", versionSchema);
