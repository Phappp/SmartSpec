import { Schema, model, InferSchemaType } from "mongoose";

const lifelineSchema = new Schema({
    name: String,
    type: String
}, { _id: false });

const messageSchema = new Schema({
    from: String,
    to: String,
    message: String,
    type: { type: String, enum: ["synchronous", "asynchronous", "return"] }
}, { _id: false });

const sequenceDiagramSchema = new Schema({
    uml_id: { type: Schema.Types.ObjectId, ref: "umls", required: true },
    name: { type: String, required: true },
    description: String,
    lifelines: [lifelineSchema],
    messages: [messageSchema],
    diagram_svg: String,
    linked_activity: { type: Schema.Types.ObjectId, ref: "activity_diagrams" },
    created_by: { type: Schema.Types.ObjectId, ref: "users" }
}, { timestamps: true });

type SequenceDiagramInferType = InferSchemaType<typeof sequenceDiagramSchema>;
export default model<SequenceDiagramInferType>("sequence_diagrams", sequenceDiagramSchema);
