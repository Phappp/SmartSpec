import { Schema, model, InferSchemaType } from "mongoose";

const testcaseSchema = new Schema({
    // === LIÊN KẾT DỰ ÁN ===
    project_id: {
        type: Schema.Types.ObjectId,
        ref: "projects",
        required: true,
        index: true
    },
    version_id: {
        type: Schema.Types.ObjectId,
        ref: "versions",
        required: true,
        index: true
    },

    // === PHÂN LOẠI ===
    test_type: {
        type: String,
        enum: ["unit", "integration", "api", "ui", "performance", "security"],
        default: "integration",
        index: true
    },
    source_requirement_ids: [{ type: String }],

    // 🆕 LIÊN KẾT VỚI DATABASE SCHEMA
    database_tables: [{
        type: String,
        trim: true,
        index: true
    }],
    database_operations: [{
        type: String,
        enum: ["select", "insert", "update", "delete", "create", "alter"],
        default: "select"
    }],

    // === THÔNG TIN CHÍNH ===
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    steps: [{
        type: String,
        required: true,
        trim: true
    }],
    expected_result: {
        type: String,
        trim: true
    },
    actual_result: {
        type: String,
        trim: true
    },

    // === TRẠNG THÁI & ƯU TIÊN ===
    status: {
        type: String,
        enum: ["passed", "failed", "blocked", "not_executed", "in_progress"],
        default: "not_executed",
        index: true
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium",
        index: true
    },

    // === TEST DATA ===
    test_data: [{
        name: { type: String },
        inputs: { type: Schema.Types.Mixed, default: {} },
        expected_outputs: { type: Schema.Types.Mixed, default: {} },
        actual_outputs: { type: Schema.Types.Mixed, default: {} }
    }],

    // === XỬ LÝ LỖI ===
    exceptions: [{
        message: { type: String },
        type: {
            type: String,
            enum: ["validation", "runtime", "assertion", "system", "other"],
            default: "other"
        },
        occurred_at_step: { type: Number },
        resolved: { type: Boolean, default: false },
        resolved_by: { type: Schema.Types.ObjectId, ref: "users" },
        resolved_at: { type: Date }
    }],

    // === THÔNG TIN THỰC THI ===
    environment: {
        os: String,
        browser: String,
        database: String,
        url: String,
        device: String
    },
    executed_by: {
        type: Schema.Types.ObjectId,
        ref: "users"
    },
    executed_at: {
        type: Date,
        index: true
    },
    execution_logs: [{ type: String }],

    // === TỰ ĐỘNG HÓA ===
    automation: {
        is_automated: { type: Boolean, default: false },
        script_path: { type: String },
        tool: { type: String },
        last_run_duration: { type: Number }
    },

    // === TRACKING ===
    created_by: {
        type: Schema.Types.ObjectId,
        ref: "users"
    },
    updated_by: {
        type: Schema.Types.ObjectId,
        ref: "users"
    }

}, {
    timestamps: true
});

// === INDEXES FOR PERFORMANCE ===
testcaseSchema.index({ project_id: 1, status: 1 });
testcaseSchema.index({ project_id: 1, test_type: 1 });
testcaseSchema.index({ project_id: 1, priority: 1 });
testcaseSchema.index({ project_id: 1, database_tables: 1 });
testcaseSchema.index({ database_tables: 1 });
testcaseSchema.index({ database_operations: 1 });

type TestcaseSchemaInferType = InferSchemaType<typeof testcaseSchema>;
export default model<TestcaseSchemaInferType>("testcases", testcaseSchema);