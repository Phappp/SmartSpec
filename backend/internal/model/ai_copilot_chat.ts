import { InferSchemaType, model, Schema } from "mongoose";

// Schema for a single message in a chat
const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    actions: {
      type: [Schema.Types.Mixed], // Array of action objects
      default: [],
    },
  },
  { _id: false }
);

// Schema for context items (dragged items from project data)
const contextItemSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["usecase", "testcase", "table", "column", "requirement"],
      required: true,
    },
    label: { type: String, required: true },
    data: { type: Schema.Types.Mixed }, // Full item data
  },
  { _id: false }
);

// Main chat session schema
const aiCopilotChatSchema = new Schema(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "projects",
      required: true,
      index: true,
    },
    version_id: {
      type: Schema.Types.ObjectId,
      ref: "versions",
      required: false, // Optional, can be null
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: "New Chat",
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    context_items: {
      type: [contextItemSchema],
      default: [],
    },
    // Metadata
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    is_archived: {
      type: Boolean,
      default: false,
    },
    is_pinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
aiCopilotChatSchema.index({ project_id: 1, user_id: 1 });
aiCopilotChatSchema.index({ project_id: 1, user_id: 1, updated_at: -1 });
aiCopilotChatSchema.index({ user_id: 1, is_archived: 1 });

// Update updated_at before saving
aiCopilotChatSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

type AICopilotChatInferType = InferSchemaType<typeof aiCopilotChatSchema>;
export default model<AICopilotChatInferType>("ai_copilot_chats", aiCopilotChatSchema);

