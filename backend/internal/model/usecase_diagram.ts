import { Schema, model, InferSchemaType } from "mongoose";

const actorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    // Thêm trường position cho actor
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    }
  },
  { _id: true }
);

const usecaseItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    // Thêm trường position cho use case
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    }
  },
  { _id: true }
);

const associationSchema = new Schema(
  {
    actor_id: { type: Schema.Types.ObjectId, required: true },
    usecase_id: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: true }
);

const relationshipSchema = new Schema(
  {
    source: { type: Schema.Types.ObjectId, required: true },
    target: { type: Schema.Types.ObjectId, required: true },
    type: {
      type: String,
      enum: ["include", "extend", "generalization"],
      required: true,
    },
  },
  { _id: true }
);

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

    actors: [actorSchema],
    usecases: [usecaseItemSchema],

    associations: [associationSchema],
    relationships: [relationshipSchema],

    diagram_svg: String,
    related_requirements: [String],
    created_by: { type: Schema.Types.ObjectId, ref: "users" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

type UsecaseDiagramInferType = InferSchemaType<typeof usecaseDiagramSchema>;
export default model<UsecaseDiagramInferType>(
  "usecase_diagrams",
  usecaseDiagramSchema
);