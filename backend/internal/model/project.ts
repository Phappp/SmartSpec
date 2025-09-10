
import { InferSchemaType, model, Schema } from "mongoose";

const memberSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'removed'],
    required: true
  },
  invited_at: {
    type: Date,
    default: Date.now
  },
  accepted_at: {
    type: Date,
    default: null
  }
}, { _id: false }); // Không tạo ID riêng cho từng thành viên

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
}, { _id: false }); // Không tạo ID riêng cho trạng thái

const projectSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  owner_id: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  current_version: { 
    type: Schema.Types.ObjectId, 
    ref: 'versions', 
    default: null 
  },
  members: [memberSchema],
  status: statusSchema,
  last_accessed_at: {
    type: Date,
    default: Date.now
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
  timestamps: true
});

type ProjectSchemaInferType = InferSchemaType<typeof projectSchema>;
export default model<ProjectSchemaInferType>("projects", projectSchema);