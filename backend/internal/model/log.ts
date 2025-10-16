import { Schema, model, InferSchemaType } from "mongoose";

/**
 * ✅ Log chi tiết hoạt động trong toàn hệ thống
 * Dùng cho: giám sát, kiểm toán (audit trail), debugging, thống kê người dùng, v.v.
 */
const logSchema = new Schema({
    // --- Ai thực hiện ---
    user_id: { type: Schema.Types.ObjectId, ref: "users" }, // có thể null nếu do hệ thống
    username: { type: String }, // lưu lại để dễ truy xuất nhanh
    role: { type: String, enum: ["ADMIN", "PARTICIPANT", "SYSTEM"], default: "PARTICIPANT" },

    // --- Mục tiêu hành động ---
    project_id: { type: Schema.Types.ObjectId, ref: "projects" },
    version_id: { type: Schema.Types.ObjectId, ref: "versions" },
    target_collection: {
        type: String,
        enum: [
            "users", "projects", "versions", "inputs", "outputs",
            "testcases", "databases", "umls",
            "usecase_diagrams", "activity_diagrams", "sequence_diagrams",
            "notifications", "logs", "api_keys"
        ],
        required: true
    },
    target_id: { type: Schema.Types.ObjectId }, // id của đối tượng tác động
    target_name: { type: String }, // tên đối tượng để hiển thị nhanh

    // --- Hành động ---
    action: {
        type: String,
        enum: [
            // CRUD chung
            "CREATE", "UPDATE", "DELETE", "VIEW",
            // use case cụ thể
            "CREATE_TESTCASE", "UPDATE_TESTCASE", "DELETE_TESTCASE", "EXECUTE_TESTCASE",
            "CREATE_USECASE_DIAGRAM", "UPDATE_USECASE_DIAGRAM", "DELETE_USECASE_DIAGRAM",
            "CREATE_ACTIVITY_DIAGRAM", "UPDATE_ACTIVITY_DIAGRAM", "DELETE_ACTIVITY_DIAGRAM",
            "CREATE_SEQUENCE_DIAGRAM", "UPDATE_SEQUENCE_DIAGRAM", "DELETE_SEQUENCE_DIAGRAM",
            // version & project
            "CREATE_VERSION", "UPDATE_VERSION", "DELETE_VERSION", "CHANGE_CURRENT_VERSION",
            "CREATE_PROJECT", "UPDATE_PROJECT", "DELETE_PROJECT", "INVITE_MEMBER", "REMOVE_MEMBER",
            // inputs / outputs
            "UPLOAD_INPUT", "DELETE_INPUT", "GENERATE_OUTPUT", "EXPORT_OUTPUT",
            // AI & Processing
            "AI_PROCESSING_START", "AI_PROCESSING_COMPLETE", "AI_PROCESSING_FAILED",
            "AI_CONFLICT_DETECTED", "AI_CONFLICT_RESOLVED", "PIPELINE_EXECUTED",
            // hệ thống & auth
            "LOGIN", "LOGOUT", "LOGIN_FAILED", "REGISTER", "UPDATE_PROFILE",
            // database
            "CREATE_DATABASE", "UPDATE_DATABASE", "DELETE_DATABASE", "GENERATE_SCHEMA"
        ],
        required: true
    },

    // --- Nội dung chi tiết ---
    message: { type: String }, // mô tả ngắn hành động
    details: { type: Schema.Types.Mixed }, // dữ liệu chi tiết JSON (before/after, payload, request body, ...)

    // --- Mức độ & nguồn ---
    level: {
        type: String,
        enum: ["INFO", "WARNING", "ERROR", "DEBUG", "CRITICAL"],
        default: "INFO"
    },
    source: {
        type: String,
        enum: ["USER_ACTION", "SYSTEM_EVENT", "PIPELINE", "AI_SERVICE", "AUTOMATION"],
        default: "USER_ACTION"
    },

    // --- Phân loại cho dashboard ---
    category: {
        type: String,
        enum: ["project", "ai", "test", "diagram", "system", "user", "database"],
        default: "system"
    },

    // --- Thông tin môi trường ---
    ip_address: { type: String },
    user_agent: { type: String },
    session_id: { type: String },

    // --- Hiệu suất ---
    execution_time: { type: Number }, // thời gian thực thi (ms)
    resource_usage: {
        memory: Number,
        cpu: Number
    },

    // --- Dấu thời gian ---
    created_at: { type: Date, default: Date.now }

}, { timestamps: true });

type LogSchemaInferType = InferSchemaType<typeof logSchema>;
export default model<LogSchemaInferType>("logs", logSchema);