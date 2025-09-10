import { InferSchemaType, model, Schema } from "mongoose";

const statusSchema = new Schema({
  is_trashed: {
    type: Boolean,
    default: false
  },
  trashed_at: {
    type: Date,
    default: null
  },
  delete_after_days: {
    type: Number,
    default: 30
  }
}, { _id: false });

const versionSchema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'projects',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  based_on: {
    type: Schema.Types.ObjectId,
    ref: 'versions',
    default: null   // Nếu version này được tạo dựa trên version cũ
  },
  status: statusSchema,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

type VersionSchemaInferType = InferSchemaType<typeof versionSchema>;
export default model<VersionSchemaInferType>("versions", versionSchema);
