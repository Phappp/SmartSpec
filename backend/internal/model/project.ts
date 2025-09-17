
// import { InferSchemaType, model, Schema } from "mongoose";

// const memberSchema = new Schema({
//   user_id: {
//     type: Schema.Types.ObjectId,
//     ref: 'users',
//     required: true
//   },
//   role: {
//     type: String,
//     enum: ['owner', 'editor', 'viewer'],
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'active', 'removed'],
//     required: true
//   },
//   invited_at: {
//     type: Date,
//     default: Date.now
//   },
//   accepted_at: {
//     type: Date,
//     default: null
//   }
// }, { _id: false }); // Không tạo ID riêng cho từng thành viên

// const statusSchema = new Schema({
//   is_trashed: {
//     type: Boolean,
//     default: false
//   },
//   trashed_at: {
//     type: Date,
//     default: null
//   },
//   delete_after_days: {
//     type: Number,
//     default: 30
//   }
// }, { _id: false }); // Không tạo ID riêng cho trạng thái

// const projectSchema = new Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   description: {
//     type: String,
//     required: true
//   },
//   owner_id: {
//     type: Schema.Types.ObjectId,
//     ref: 'users',
//     required: true
//   },
//   current_version: { 
//     type: Schema.Types.ObjectId, 
//     ref: 'versions', 
//     default: null 
//   },
//   members: [memberSchema],
//   status: statusSchema,
//   last_accessed_at: {
//     type: Date,
//     default: Date.now
//   },
//   created_at: {
//     type: Date,
//     default: Date.now
//   },
//   updated_at: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// type ProjectSchemaInferType = InferSchemaType<typeof projectSchema>;
// export default model<ProjectSchemaInferType>("projects", projectSchema);
import { InferSchemaType, model, Schema } from "mongoose";

const memberHistorySchema = new Schema({
  action: {
    type: String,
    enum: ['invited', 'accepted', 'rejected', 'cancelled', 'unshared', 'left','role_changed'],
    required: true,
  },
  by: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  at: {
    type: Date,
    default: Date.now,
  },
  details: {
    type: Object,
    default: {},
  }
}, { _id: false });

const memberSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending',
  },
  invited_by: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: false,
  },
  invited_at: {
    type: Date,
    default: Date.now,
  },
  responded_at: {
    type: Date,
    default: null,
  },
  history: {
    type: [memberHistorySchema],
    default: [],
  }
}, { _id: false });

const statusSchema = new Schema({
  is_trashed: { type: Boolean, default: false },
  trashed_at: { type: Date, default: null },
  delete_after_days: { type: Number, default: 30 }
}, { _id: false });

const projectSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  owner_id: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  current_version: { type: Schema.Types.ObjectId, ref: 'versions', default: null },
  members: { type: [memberSchema], default: [] },
  status: { type: statusSchema, default: () => ({}) },
  last_accessed_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

type ProjectSchemaInferType = InferSchemaType<typeof projectSchema>;
export default model<ProjectSchemaInferType>("projects", projectSchema);
