// models/usecaseDiagram.model.ts
import { Schema, model, InferSchemaType } from "mongoose";

// Chỉ lưu thông tin Actor
const actorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
  },
  { _id: true }
);

// Chỉ lưu thông tin Usecase
const usecaseItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    // ĐÃ LOẠI BỎ 'relationships' khỏi đây để tránh nhầm lẫn
  },
  { _id: true }
);

// SỬA LẠI: Chỉ lưu quan hệ Actor -> Usecase (type 'association')
const associationSchema = new Schema(
  {
    actor_name: { type: String, required: true },
    usecase_title: { type: String, required: true },
  },
  { _id: true }
);

// MỚI: Dùng để lưu các quan hệ Usecase <-> Usecase hoặc Actor <-> Actor
const relationshipSchema = new Schema(
  {
    source: { type: String, required: true }, // Có thể là actor 'name' hoặc usecase 'title'
    target: { type: String, required: true }, // Tương tự, là 'name' hoặc 'title'
    type: {
      type: String,
      enum: ["include", "extend", "generalization"], // 'generalization' cho kế thừa
      required: true,
    },
  },
  { _id: true }
);

// Schema chính đã được cập nhật
const usecaseDiagramSchema = new Schema(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "projects",
      required: true,
    },
    version_id: {
      type: Schema.Types.ObjectId,
      ref: "versions",
      required: true,
    },

    name: { type: String, required: true },
    description: String,

    actors: [actorSchema], // Danh sách các actor
    usecases: [usecaseItemSchema], // Danh sách các use case

    associations: [associationSchema], // Quan hệ Actor -> Usecase
    relationships: [relationshipSchema], // Quan hệ Usecase <-> Usecase, Actor <-> Actor

    diagram_svg: String,
    related_requirements: [String],
    linked_testcases: [{ type: Schema.Types.ObjectId, ref: "testcases" }],
    created_by: { type: Schema.Types.ObjectId, ref: "users" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } } // Đổi lại cho nhất quán
);

type UsecaseDiagramInferType = InferSchemaType<typeof usecaseDiagramSchema>;
export default model<UsecaseDiagramInferType>(
  "usecase_diagrams",
  usecaseDiagramSchema
);
