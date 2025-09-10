import { InferSchemaType, model, Schema } from "mongoose";

const metadataSchema = new Schema({
  pages: { type: Number, default: null },
  language: { type: String, default: "unknown" },
  file_path: { type: String, default: null }
}, { _id: false });

const inputSchema = new Schema({
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
    enum: ["pdf", "docx", "image", "audio", "text"],
    required: true
  },
  raw_text: {
    type: String,
    default: ""
  },
  metadata: metadataSchema,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

type InputSchemaInferType = InferSchemaType<typeof inputSchema>;
export default model<InputSchemaInferType>("inputs", inputSchema);
