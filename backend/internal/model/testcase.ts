import { Schema, model, InferSchemaType } from "mongoose";

const testcaseSchema = new Schema({
    // --- Liên kết ---
    project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
    version_id: { type: Schema.Types.ObjectId, ref: "versions", required: true },
    database_id: { type: Schema.Types.ObjectId, ref: "databases" }, // database cha (tùy chọn)
    table_refs: [{
        table_name: { type: String, required: true },
        column_names: [{ type: String }] // các cột liên quan
    }],
    source_requirement_ids: [{ type: String }], // mapping với requirement_model.id

    // --- Thông tin chính ---
    title: { type: String, required: true },
    description: { type: String },
    steps: [{ type: String, required: true }],
    expected_result: { type: String },
    actual_result: { type: String },
    status: {
        type: String,
        enum: ["passed", "failed", "blocked", "not_executed", "in_progress"],
        default: "not_executed"
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium"
    },

    // --- Test Data (Input/Output) ---
    test_data: {
        type: [{
            name: { type: String }, // tên test data (tùy chọn)
            inputs: { type: Schema.Types.Mixed, default: {} },   // dữ liệu đầu vào
            expected_outputs: { type: Schema.Types.Mixed, default: {} }, // dữ liệu mong đợi
            actual_outputs: { type: Schema.Types.Mixed, default: {} }, // dữ liệu thực tế
        }],
        default: []
    },

    // --- Exception & Error Handling ---
    exceptions: [{
        message: { type: String },
        type: { type: String, enum: ["validation", "runtime", "assertion", "system", "other"], default: "other" },
        occurred_at_step: { type: Number }, // chỉ ra lỗi ở bước nào
        resolved: { type: Boolean, default: false },
        resolved_by: { type: Schema.Types.ObjectId, ref: "users" },
        resolved_at: { type: Date }
    }],

    // --- Thông tin chạy test ---
    environment: {
        os: String,
        browser: String,
        database: String,
        url: String,
        device: String
    },
    executed_by: { type: Schema.Types.ObjectId, ref: "users" },
    executed_at: { type: Date },
    execution_logs: [{ type: String }],

    // --- Tự động hóa ---
    automation: {
        is_automated: { type: Boolean, default: false },
        script_path: { type: String },
        tool: { type: String },
        last_run_duration: { type: Number }
    },

    // --- Tracking ---
    created_by: { type: Schema.Types.ObjectId, ref: "users" },
    updated_by: { type: Schema.Types.ObjectId, ref: "users" },

}, { timestamps: true });

type TestcaseSchemaInferType = InferSchemaType<typeof testcaseSchema>;
export default model<TestcaseSchemaInferType>("testcases", testcaseSchema);
