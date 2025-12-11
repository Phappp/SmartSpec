import { Schema, model, InferSchemaType } from "mongoose";

/* ----------------- NODE SCHEMA ------------------ */
const nodeSchema = new Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: [
            "start",
            "end",
            "action",
            "decision",
            "merge",
            "fork",
            "join",
            "object",
            "swimlane"
        ],
        required: true
    },
    label: String,
    lane_id: String,  // để phân swimlane
    // Thêm trường position cho node
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    }
}, { _id: false });

/* ----------------- EDGE SCHEMA ------------------ */
const edgeSchema = new Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    condition: String,     // dùng cho decision nodes
    guard: String,         // biểu thức điều kiện
    trigger: String        // sự kiện kích hoạt
}, { _id: false });

/* ----------------- ACTIVITY DIAGRAM ------------------ */
const activityDiagramSchema = new Schema({
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
    lanes: [
        {
            id: String,
            name: String
        }
    ],
    nodes: [nodeSchema],
    edges: [edgeSchema],

    created_by: { type: Schema.Types.ObjectId, ref: "users" }
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

type ActivityDiagramInferType = InferSchemaType<typeof activityDiagramSchema>;
export default model<ActivityDiagramInferType>("activity_diagrams", activityDiagramSchema);
