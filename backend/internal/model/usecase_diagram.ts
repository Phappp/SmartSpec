import { Schema, model, InferSchemaType } from "mongoose";

const actorSchema = new Schema({
    name: String,
    description: String
}, { _id: false });

const usecaseItemSchema = new Schema({
    title: String,
    description: String,
    relationships: [String]
}, { _id: false });

const associationSchema = new Schema({
    actor: String,
    usecase: String,
    type: { type: String, enum: ["association", "include", "extend"] }
}, { _id: false });

const usecaseDiagramSchema = new Schema({
    uml_id: { type: Schema.Types.ObjectId, ref: "umls", required: true },
    name: { type: String, required: true },
    description: String,
    actors: [actorSchema],
    usecases: [usecaseItemSchema],
    associations: [associationSchema],
    diagram_svg: String,
    related_requirements: [String],
    linked_testcases: [{ type: Schema.Types.ObjectId, ref: "testcases" }],
    created_by: { type: Schema.Types.ObjectId, ref: "users" }
}, { timestamps: true });

type UsecaseDiagramInferType = InferSchemaType<typeof usecaseDiagramSchema>;
export default model<UsecaseDiagramInferType>("usecase_diagrams", usecaseDiagramSchema);
