import { Schema, model, InferSchemaType } from "mongoose";

const nodeSchema = new Schema({
    id: String,
    type: { type: String, enum: ["start", "action", "decision", "merge", "end"] },
    label: String
}, { _id: false });

const edgeSchema = new Schema({
    from: String,
    to: String,
    condition: String
}, { _id: false });

const activityDiagramSchema = new Schema({
    uml_id: { type: Schema.Types.ObjectId, ref: "umls", required: true },
    name: { type: String, required: true },
    description: String,
    nodes: [nodeSchema],
    edges: [edgeSchema],
    diagram_svg: String,
    created_by: { type: Schema.Types.ObjectId, ref: "users" }
}, { timestamps: true });

type ActivityDiagramInferType = InferSchemaType<typeof activityDiagramSchema>;
export default model<ActivityDiagramInferType>("activity_diagrams", activityDiagramSchema);
