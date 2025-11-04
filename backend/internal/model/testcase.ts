import mongoose, { Schema, model, InferSchemaType } from "mongoose";

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
        enum: ["integration", "api", "ui", "performance", "security"],
        default: "integration",
        index: true
    },
    source_requirement_ids: [{ type: String }],

    // === DATABASE IMPACT ===
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
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    objectives: [{
        type: String,
        trim: true
    }],

    // === TIỀN ĐIỀU KIỆN / HẬU ĐIỀU KIỆN ===
    preconditions: [{
        type: String,
        trim: true
    }],
    postconditions: [{
        type: String,
        trim: true
    }],

    // === CÁC BƯỚC THỰC HIỆN (ENTERPRISE FORMAT) ===
    steps: [{
        step_number: { type: Number, required: true },
        action: { type: String, required: true, trim: true },
        input_data: { type: Schema.Types.Mixed, default: {} },
        expected_immediate_result: { type: String, trim: true },
        verification_points: [{ type: String, trim: true }]
    }],

    // === KẾT QUẢ MONG ĐỢI Ở NHIỀU TẦNG ===
    expected_results: {
        ui_level: [{ type: String, trim: true }],
        api_level: {
            status_code: { type: Number },
            response_schema: { type: Schema.Types.Mixed, default: {} }
        },
        database_level: [{ type: String, trim: true }],
        business_level: { type: String, trim: true }
    },

    // === KẾT QUẢ THỰC TẾ ===
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
    severity: {
        type: String,
        enum: ["minor", "major", "critical"],
        default: "minor"
    },

    // === TEST DATA ===
    test_data: [{
        name: { type: String, required: true },
        input_payload: { type: Schema.Types.Mixed, default: {} },
        expected_output: { type: Schema.Types.Mixed, default: {} },
        validation_rules: [{ type: String, trim: true }],
        actual_outputs: { type: Schema.Types.Mixed, default: {} }
    }],

    // === LỖI / NGOẠI LỆ ===
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
        resolved_at: { type: Date },
        severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" }
    }],

    // === THỰC THI & MÔI TRƯỜNG ===
    environment: {
        os: String,
        browser: String,
        database: String,
        url: String,
        device: String,
        runtime_env: { type: String, enum: ["local", "staging", "production"], default: "staging" }
    },
    executed_by: {
        type: Schema.Types.ObjectId,
        ref: "users"
    },
    executed_at: {
        type: Date,
        index: true
    },

    // === LỊCH SỬ THỰC THI (TÁCH NHẸ) ===
    execution_history: [{
        executed_at: { type: Date, default: Date.now },
        executed_by: { type: Schema.Types.ObjectId, ref: "users" },
        duration_ms: { type: Number },
        result: { type: String, enum: ["passed", "failed", "blocked"], default: "passed" },
        environment_snapshot: { type: Schema.Types.Mixed, default: {} }
    }],

    // === LOG CHI TIẾT THỰC THI ===
    execution_logs: [{
        timestamp: { type: Date, default: Date.now },
        step_number: { type: Schema.Types.Mixed },
        status: { type: String },
        actual_result: { type: String },
        screenshot_path: { type: String },
        log_message: { type: String }
    }],

    // === TỰ ĐỘNG HÓA ===
    automation: {
        is_automated: { type: Boolean, default: false },
        script_path: { type: String },
        test_command: { type: String },
        tags: [{ type: String }],
        last_run_duration: { type: Number },
        last_run_status: { type: String, enum: ["passed", "failed", "error", "skipped"], default: "skipped" },
        ci_pipeline_id: { type: String },
        ci_job_url: { type: String }
    },

    // === PHÂN TÍCH MỞ RỘNG (ANALYTICS / AI FEEDBACK) ===
    insights: {
        stability_score: { type: Number, min: 0, max: 1, default: null },
        failure_rate: { type: Number, min: 0, max: 1, default: null },
        last_failure_reason: { type: String, trim: true },
        ai_recommendation: { type: String, trim: true }
    },

    // === THEO DÕI / AUDIT TRAIL ===
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


// === INDEXES (ENTERPRISE OPTIMIZED) ===
testcaseSchema.index({ project_id: 1, status: 1 });
testcaseSchema.index({ project_id: 1, test_type: 1 });
testcaseSchema.index({ project_id: 1, priority: 1 });
testcaseSchema.index({ project_id: 1, database_tables: 1 });
testcaseSchema.index({ database_tables: 1 });
testcaseSchema.index({ database_operations: 1 });
testcaseSchema.index({ title: 1 });
testcaseSchema.index({ "automation.tags": 1 });
testcaseSchema.index({ "source_requirement_ids": 1 });
testcaseSchema.index({ executed_by: 1, executed_at: -1 });
testcaseSchema.index({ project_id: 1, version_id: 1, status: 1 });
testcaseSchema.index({ project_id: 1, test_type: 1, priority: 1 });
testcaseSchema.index({ project_id: 1, database_tables: 1, status: 1 });
testcaseSchema.index({ "insights.failure_rate": 1 });

// === COMPOUND INDEX FOR REPORT DASHBOARD ===
testcaseSchema.index({
    project_id: 1,
    test_type: 1,
    status: 1,
    "automation.is_automated": 1
});

type TestcaseSchemaInferType = InferSchemaType<typeof testcaseSchema>;
export default model<TestcaseSchemaInferType>("testcases", testcaseSchema);
