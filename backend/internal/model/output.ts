import { Schema, model, InferSchemaType } from "mongoose";

const outputSchema = new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
  version_id: { type: Schema.Types.ObjectId, ref: "versions", required: true },
  type: {
    type: String,
    enum: ["testcase", "database", "uml"],
    required: true,
  },
  // ✅ liên kết đến từng loại output con
  testcase_id: { type: Schema.Types.ObjectId, ref: "testcases" },
  database_id: { type: Schema.Types.ObjectId, ref: "databases" },
  uml_id: { type: Schema.Types.ObjectId, ref: "umls" },
  generated_by: { type: Schema.Types.ObjectId, ref: "users" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending"
  }
}, { timestamps: true });

type OutputSchemaInferType = InferSchemaType<typeof outputSchema>;
export default model<OutputSchemaInferType>("outputs", outputSchema);
