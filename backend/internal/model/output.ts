import { InferSchemaType, model, Schema } from "mongoose";

const outputSchema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true
  },
  version_id: {
    type: Schema.Types.ObjectId,
    ref: "versions",
    required: true
  },
  type: {
    type: String,
    enum: [
      "db_schema",
      "testcase",
      "uml_usecase",
      "uml_activity",
      "uml_sequence",
      "usecase_spec"
    ],
    required: true
  },
  content: {
    type: Schema.Types.Mixed, // JSON, Markdown, text...
    required: true
  },
  generated_by: {
    type: String,
    enum: ["LLM", "user"],
    default: "LLM"
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

type OutputSchemaInferType = InferSchemaType<typeof outputSchema>;
export default model<OutputSchemaInferType>("outputs", outputSchema);
