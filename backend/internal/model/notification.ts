import { Schema, model, InferSchemaType } from "mongoose";

/**
 * ✅ Schema thông báo hệ thống gửi tới người dùng
 * Hỗ trợ: thông báo cá nhân, nhóm, hệ thống, và sự kiện pipeline/AI.
 */
const notificationSchema = new Schema({
    // --- Người nhận & người gửi ---
    recipient_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    sender_id: { type: Schema.Types.ObjectId, ref: "users" },

    // --- Loại thông báo ---
    type: {
        type: String,
        enum: [
            "system",         // do hệ thống sinh
            "project",        // thay đổi trong project
            "version",        // version mới hoặc cập nhật
            "invitation",     // được mời vào dự án
            "testcase",       // testcase được tạo/cập nhật
            "uml",            // UML diagram sinh xong
            "ai_process",     // AI pipeline xử lý hoàn tất
            "ai_conflict",    // Phát hiện xung đột use case
            "alert",          // cảnh báo lỗi hoặc sự cố
            "reminder",       // nhắc nhở (deadline, review,...)
            "member"          // thay đổi thành viên
        ],
        default: "system"
    },

    // --- Thông tin liên kết ---
    project_id: { type: Schema.Types.ObjectId, ref: "projects" },
    version_id: { type: Schema.Types.ObjectId, ref: "versions" },
    related_object: {
        type: Schema.Types.Mixed, // có thể là test case, use case, activity, ...
        default: {}
    },

    // --- Nội dung ---
    title: { type: String, required: true },
    message: { type: String },
    icon: { type: String, default: "" }, // có thể hiển thị icon tùy loại
    link: { type: String, default: "" }, // URL để điều hướng khi click

    // --- Trạng thái đọc ---
    is_read: { type: Boolean, default: false },
    read_at: { type: Date },

    // --- Mức độ ưu tiên ---
    priority: {
        type: String,
        enum: ["low", "normal", "high", "critical"],
        default: "normal"
    },

    // --- Thông tin hiển thị & quản lý ---
    is_pinned: { type: Boolean, default: false }, // ghim trên giao diện
    expires_at: { type: Date, default: null },    // tự xoá sau thời gian

    // --- Tùy chỉnh người dùng ---
    category: {
        type: String,
        enum: ["all", "project", "ai", "test", "system"],
        default: "all"
    },

    // --- Action buttons ---
    actions: [{
        label: String,
        action_type: String, // "accept", "reject", "view", "resolve"
        link: String
    }],

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }

}, { timestamps: true });

type NotificationSchemaInferType = InferSchemaType<typeof notificationSchema>;
export default model<NotificationSchemaInferType>("notifications", notificationSchema);