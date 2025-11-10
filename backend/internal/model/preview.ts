import { Schema, model, InferSchemaType } from "mongoose";
import { randomUUID } from "crypto";

// === Cấu trúc thay đổi cho từng entity (requirement/input/output...) ===
const previewChangeSchema = new Schema({
  change_id: {
    type: String,
    default: () => randomUUID(),
    required: true
  },
  entity_type: {
    type: String,
    enum: ["requirement", "input","output", "database","table","column","relationship", "testcase","uml", "activity_diagram","sequence_diagram","usecase_diagram"],
    required: true
  },
  entity_id: { type: String, required: false },
  change_type: {
    type: String,
    enum: ["added", "updated", "deleted"],
    required: true
  },
  before_snapshot: { type: Schema.Types.Mixed, default: null },
  after_snapshot: { type: Schema.Types.Mixed, default: null },
  add_at : { type: Date, default: Date.now }
}, { _id: false });

// === Cấu trúc người phê duyệt ===
const approverSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
  role: { type: String, enum: ["owner", "member"], required: true },
  approved_at: { type: Date, default: null },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  comment: { type: String, default: "" }
}, { _id: false });

// === Schema chính của Preview ===
const previewSchema = new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
  base_version_id: { type: Schema.Types.ObjectId, ref: "versions", required: true }, // version gốc
  target_version_id: { type: Schema.Types.ObjectId, ref: "versions" }, // version mới sẽ tạo sau khi approved
  created_by: { type: Schema.Types.ObjectId, ref: "users", required: true },
  created_at: { type: Date, default: Date.now },

  changes: { type: [previewChangeSchema], default: [] },

  // Danh sách người duyệt
  approvers: { type: [approverSchema], default: [] },

  // Trạng thái tổng thể của preview
  status: {
    type: String,
    enum: ["pending", "under_review", "approved", "rejected", "version_upgraded"],
    default: "pending"
  },
  notes: { type: String, default: "" },
}, { timestamps: true });

type PreviewSchemaInferType = InferSchemaType<typeof previewSchema>;
export default model<PreviewSchemaInferType>("previews", previewSchema);
