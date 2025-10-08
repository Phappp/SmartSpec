import { Schema, model, InferSchemaType } from "mongoose";

const tableSchema = new Schema({
    name: { type: String, required: true },
    columns: [{
        name: { type: String, required: true },
        type: { type: String, required: true },
        is_primary_key: { type: Boolean, default: false },
        is_foreign_key: { type: Boolean, default: false },
        references: { type: String } // bảng được tham chiếu
    }]
}, { _id: false });

const databaseSchema = new Schema({
    project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
    version_id: { type: Schema.Types.ObjectId, ref: "versions", required: true },
    name: { type: String, required: true },
    description: { type: String },
    tables: [tableSchema],
    relationships: [{
        from_table: String,
        to_table: String,
        type: { type: String, enum: ["one-to-one", "one-to-many", "many-to-many"] }
    }],
    generated_by: { type: Schema.Types.ObjectId, ref: "users" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

type DatabaseSchemaInferType = InferSchemaType<typeof databaseSchema>;
export default model<DatabaseSchemaInferType>("databases", databaseSchema);
