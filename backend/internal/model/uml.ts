import { Schema, model, InferSchemaType } from "mongoose";

/**
 * UML model tổng hợp (cha của các loại diagram)
 */
const umlSchema = new Schema({
    project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
    version_id: { type: Schema.Types.ObjectId, ref: "versions", required: true },
    name: { type: String, required: true },
    description: String,

    // metadata
    created_by: { type: Schema.Types.ObjectId, ref: "users" },
    updated_by: { type: Schema.Types.ObjectId, ref: "users" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

type UMLInferType = InferSchemaType<typeof umlSchema>;
export default model<UMLInferType>("umls", umlSchema);
