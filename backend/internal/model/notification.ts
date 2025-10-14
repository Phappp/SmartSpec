import { InferSchemaType, model, Schema } from "mongoose";
import { title } from "process";

const notificationSchema = new Schema({
  recipient_id: { type: Schema.Types.ObjectId, ref: "users" },
  sender_id: { type: Schema.Types.ObjectId, ref: "users" },
  type: {
    type: String,
    enum: ["INVITATION", "TESTCASE", "PROJECT"],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  link: { type: String },
  created_at: { type: Date, default: Date.now },
});

type notificationSchemaInferType = InferSchemaType<typeof notificationSchema>;
export default model<notificationSchemaInferType>(
  "notifications",
  notificationSchema
);
