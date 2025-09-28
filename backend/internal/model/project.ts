import { InferSchemaType, model, Schema } from "mongoose";

// Định nghĩa schema lịch sử thành viên
const memberHistorySchema = new Schema({
  action: {
    type: String,
    enum: ['invited', 'accepted', 'rejected', 'cancelled', 'unshared', 'left'],
    required: true
  },
  by: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  at: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Định nghĩa schema thành viên
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
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    required: true
  },
  invited_by: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  invited_at: {
    type: Date,
    default: Date.now
  },
  responded_at: {
    type: Date,
    default: null
  },
  history: [memberHistorySchema]
}, { _id: false });

// Định nghĩa schema trạng thái
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

// Định nghĩa schema dự án
const projectSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['vi-VN', 'en-US'],
    required: true,
    default: 'vi-VN'
  },
  owner_id: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  members: [memberSchema],
  current_version: {
    type: Schema.Types.ObjectId,
    ref: 'project_versions',
    default: null
  },
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

// Kiểu dữ liệu cho project
type ProjectSchemaInferType = InferSchemaType<typeof projectSchema>;
export default model<ProjectSchemaInferType>("projects", projectSchema);