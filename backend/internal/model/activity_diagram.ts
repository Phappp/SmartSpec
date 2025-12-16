import { Schema, model, InferSchemaType } from "mongoose";

/* ----------------- NODE SCHEMA ------------------ */
const nodeSchema = new Schema({
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
    // Tham chiếu đến _id của một 'lane' trong MẢNG 'lanes'
    lane_id: { type: Schema.Types.ObjectId, default: null },
    // Thêm trường position cho node
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    }
}, { _id: true }); // Bật _id để edges có thể tham chiếu đến _id này

/* ----------------- EDGE SCHEMA ------------------ */
const edgeSchema = new Schema({
    // Tham chiếu đến _id của một 'node' trong MẢNG 'nodes'
    from: { type: Schema.Types.ObjectId, required: true },
    // Tham chiếu đến _id của một 'node' trong MẢNG 'nodes'
    to: { type: Schema.Types.ObjectId, required: true },
    condition: String,     // dùng cho decision nodes
    guard: String,         // biểu thức điều kiện
    trigger: String        // sự kiện kích hoạt
}, { _id: true }); // Bật _id để có thể tham chiếu nếu cần

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
            name: String
        }
    ], // Lanes sẽ có _id tự động
    nodes: [nodeSchema],
    edges: [edgeSchema],

    created_by: { type: Schema.Types.ObjectId, ref: "users" }
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

type ActivityDiagramInferType = InferSchemaType<typeof activityDiagramSchema>;
export default model<ActivityDiagramInferType>("activity_diagrams", activityDiagramSchema);
