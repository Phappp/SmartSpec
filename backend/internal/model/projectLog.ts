import { InferSchemaType, model, Schema } from "mongoose";

const detailsSchema = new Schema({
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null }
}, { _id: false }); // Không tạo _id riêng cho details

const projectLogSchema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  action: {
    type: String,
    enum: [
      "create_input", "update_input", "delete_input",
      "generate_output", "update_output", "delete_output",
      "create_version", "update_version", "delete_version",
      "update_project", "delete_project"
    ],
    required: true
  },
  target_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  target_type: {
    type: String,
    enum: ["input", "output", "requirement_model", "project", "version"],
    required: true
  },
  version_number: {
    type: Number,
    default: null
  },
  affects_requirement: {
    type: Boolean,
    default: false
  },
  details: detailsSchema,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: "created_at", updatedAt: false }
});

type ProjectLogSchemaInferType = InferSchemaType<typeof projectLogSchema>;
export default model<ProjectLogSchemaInferType>("project_logs", projectLogSchema);
