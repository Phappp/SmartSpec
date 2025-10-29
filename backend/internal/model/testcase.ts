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

    // === THÔNG TIN CHÍNH - ENTERPRISE STANDARD ===
    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },

    // 🆕 ENTERPRISE FIELDS
    preconditions: [{
        type: String,
        trim: true
    }],
    postconditions: [{
        type: String,
        trim: true
    }],

    // 🆕 ENHANCED STEPS với Enterprise format
    steps: [{
        step_number: { type: Number, required: true },
        action: { type: String, required: true, trim: true },
        input_data: { type: Schema.Types.Mixed, default: {} },
        expected_immediate_result: { type: String, trim: true }
    }],

    // 🆕 MULTI-LEVEL EXPECTED RESULTS
    expected_results: {
        ui_level: [{ type: String, trim: true }],
        api_level: {
            status_code: { type: Number },
            response_schema: { type: Schema.Types.Mixed, default: {} }
        },
        database_level: [{ type: String, trim: true }],
        business_level: { type: String, trim: true }
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

    // 🆕 ENHANCED TEST DATA - ENTERPRISE STANDARD
    test_data: [{
        name: { type: String, required: true },
        input_payload: { type: Schema.Types.Mixed, default: {} },
        expected_output: { type: Schema.Types.Mixed, default: {} },
        validation_rules: [{ type: String, trim: true }],
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

    // 🆕 EXECUTION LOGS FORMAT - ENTERPRISE STANDARD
    execution_logs_format: {
        timestamp: { type: String, default: "ISO format" },
        step_number: { type: Number },
        status: { type: String, enum: ["passed", "failed", "skipped"] },
        actual_result: { type: String },
        screenshot_path: { type: String },
        log_message: { type: String }
    },

    // === TỰ ĐỘNG HÓA - ENTERPRISE STANDARD ===
    automation: {
        is_automated: { type: Boolean, default: false },
        script_path: { type: String },
        test_command: { type: String },
        tags: [{ type: String }],
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

// === INDEXES FOR PERFORMANCE - ENTERPRISE OPTIMIZED ===
testcaseSchema.index({ project_id: 1, status: 1 });
testcaseSchema.index({ project_id: 1, test_type: 1 });
testcaseSchema.index({ project_id: 1, priority: 1 });
testcaseSchema.index({ project_id: 1, database_tables: 1 });
testcaseSchema.index({ database_tables: 1 });
testcaseSchema.index({ database_operations: 1 });
testcaseSchema.index({ title: 1 }); // 🆕 For unique title lookup
testcaseSchema.index({ "automation.tags": 1 }); // 🆕 For automation tag filtering
testcaseSchema.index({ "source_requirement_ids": 1 }); // 🆕 For requirement-based queries

// 🆕 Compound indexes for common query patterns
testcaseSchema.index({
    project_id: 1,
    version_id: 1,
    status: 1
});
testcaseSchema.index({
    project_id: 1,
    test_type: 1,
    priority: 1
});
testcaseSchema.index({
    project_id: 1,
    database_tables: 1,
    status: 1
});

type TestcaseSchemaInferType = InferSchemaType<typeof testcaseSchema>;
export default model<TestcaseSchemaInferType>("testcases", testcaseSchema);