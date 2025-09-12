import { toInteger } from "lodash";
import { InferSchemaType, model, Schema } from "mongoose";

const userSchema = new Schema({
  email: { type: String, required: true, unique: true }, 
  password: {
    type: String,
    required: function () {
      return !this.isGoogleAccount;
    },
  },
  name: { type: String }, 
  system_role: {
    type: String,
    enum: ["ADMIN", "PARTICIPANT"],
    default: "PARTICIPANT",
  },
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE",
  },
  setting: {
    language: { type: String, default: "vi" },
    theme: { type: String, default: "light" },
  },
  bio: String,
  avatar_url: String,
  phone: String,
  isTwoFactorEnabled: { type: Boolean, default: false },
  gender: String,
  dob: Date,
  accessToken: String,
  refreshToken: String,
  created_at: { type: Date, default: Date.now }, // Ngày tạo tài khoản
  updated_at: { type: Date },
});

type userSchemaInferType = InferSchemaType<typeof userSchema>;
export default model<userSchemaInferType>("users", userSchema);
