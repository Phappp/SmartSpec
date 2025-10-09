import { Schema, model, InferSchemaType } from "mongoose";

// Cấu trúc cột trong bảng
const columnSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    length: { type: Number }, // hỗ trợ VARCHAR(255)
    is_primary_key: { type: Boolean, default: false },
    is_foreign_key: { type: Boolean, default: false },
    nullable: { type: Boolean, default: true },
    unique: { type: Boolean, default: false },
    references: { type: String }, // tên bảng được tham chiếu
    related_usecase_ids: { type: [String], default: [] } // Mảng các ID của use case
}, { _id: false });

// Cấu trúc bảng
const tableSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    position: { // lưu vị trí để vẽ diagram
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    },
    columns: [columnSchema],
}, { _id: false });

// Cấu trúc mối quan hệ giữa các bảng
const relationshipSchema = new Schema({
    from_table: { type: String, required: true },
    to_table: { type: String, required: true },
    type: {
        type: String,
        enum: ["one-to-one", "one-to-many", "many-to-one", "many-to-many"],
        default: "one-to-many"
    }
}, { _id: false });

// Database tổng thể
const databaseSchema = new Schema({
    project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
    version_id: { type: Schema.Types.ObjectId, ref: "versions", required: true },
    name: { type: String, required: true },
    description: { type: String },
    tables: [tableSchema],
    relationships: [relationshipSchema],
    generated_by: { type: Schema.Types.ObjectId, ref: "users" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

type DatabaseSchemaInferType = InferSchemaType<typeof databaseSchema>;
export default model<DatabaseSchemaInferType>("databases", databaseSchema);
