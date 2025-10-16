import { InferSchemaType, model, Schema } from "mongoose";

const detailsSchema = new Schema({
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    message: { type: String, default: null }
}, { _id: false });

const projectLogSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId, 
        ref: "projects", 
        required: function() {
            return !["create_user","update_user","failed_login","login","logout","performance", "deploy", "startup"].includes(this.action);
        }
    },
    user_id: {
       type: Schema.Types.ObjectId,
        ref: "users",
        required: function () {
            return ![
            "failed_login","startup", "performance", "deploy"
            ].includes(this.action);
        },
        default: null,
    },
    action: {
        type: String,
        enum: [
            "create_input", "update_input", "delete_input", // target_type input in project
            "generate_output", "update_output", "delete_output", "export_data", // target_type output/ diagram/ testcase 
            "create_version", "update_version", "delete_version", "rollback", // target_type version in project
            "create_project", "update_project", "delete_project", "restore_project", // target_type project

            "create_user","update_user","failed_login","login","logout",// target_type system
            
            "performance", "deploy", "startup", // target_type system AI service khởi động, Ghi lại khi triển khai phiên bản mới,Theo dõi hiệu năng, chậm, timeout
            
            "generate_data","update_data","delete_data", "resolve_conflict",// target_type requirement_model in project

            "invite_member", "accept_invite", "reject_invite","cancel_invite", 
            "remove_member", "leave_project","change_member_role", // target_type member in project
        ],
        required: true
    },
    target_id: {
        type: Schema.Types.ObjectId,
        required: function () {
            // Không cần cho log hệ thống
            return !["failed_login","startup", "performance", "deploy"].includes(this.action);
        },
    },
    target_type: {
        type: String,
        enum: ["input", "output", "project", "version",   
        "system", 
        "requirement_model", // thuộc version
        "member", // thuộc project
        "databases","testcases", "activity_diagrams", "usecase_diagrams", "sequence_diagrams" // thuộc output
        ],
        required: true
    },
    version_number: {
        type: Number,
        default: null
    },
    affects_requirement: {
        type: Boolean,
        default: false
    },
    level: {
    type: String,
    enum:["info","warning","error"],
    required:true
    },
    performed_by_ai: { type: Boolean, default: false },
    details: detailsSchema,
    ip: { type: String, default: null },  // nên thêm khi login/ failed_login/ logout 
    user_agent: { type: String, default: null },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: false }
});

type ProjectLogSchemaInferType = InferSchemaType<typeof projectLogSchema>;
export default model<ProjectLogSchemaInferType>("logs", projectLogSchema);
