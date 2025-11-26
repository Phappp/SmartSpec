// [file name]: chatbot_tool.ts
import { Schema, model, InferSchemaType } from "mongoose";

const toolSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ["usecase", "testcase", "database", "uml", "project", "user", "analysis"],
        required: true,
        index: true
    },

    // Function Definition
    parameters: [{
        name: { type: String, required: true },
        type: {
            type: String,
            enum: ["string", "number", "boolean", "object", "array"],
            required: true
        },
        description: { type: String, required: true },
        required: { type: Boolean, default: false },
        entity_reference: { // Tự động suggest entities từ project
            type: Boolean,
            default: false
        }
    }],

    // Execution
    endpoint: { type: String, required: true },
    method: {
        type: String,
        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        required: true
    },

    // Security & Permissions
    required_permissions: [{
        type: String,
        enum: ["read", "write", "delete", "admin"]
    }],

    // Status
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: "users" }
}, {
    timestamps: true
});

type ToolSchemaInferType = InferSchemaType<typeof toolSchema>;
export default model<ToolSchemaInferType>("chatbot_tools", toolSchema);