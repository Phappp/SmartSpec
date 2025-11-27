import { Types } from "mongoose";
import { randomUUID } from "crypto";
import Project from "../../../../../internal/model/project";
import Version from "../../../../../internal/model/version";
import Testcase from "../../../../../internal/model/testcase";
import Database from "../../../../../internal/model/database";
import UsecaseDiagram from "../../../../../internal/model/usecase_diagram";
import SequenceDiagram from "../../../../../internal/model/sequence_diagram";
import ActivityDiagram from "../../../../../internal/model/activity_diagram";
import UserConversation from "../../../../../internal/model/chatbot/user_conversation";
import ConversationMessage from "../../../../../internal/model/chatbot/conversation_message";
import { ServiceResponse, ResponseStatus } from "../../../services/serviceResponse";
import ChatOperation from "../../../../../internal/model/chatbot/chat_operation";
import { ChatLLMPlanner, ChatAction } from "./llmPlanner";
import { ChatEntityGateway, EntityType } from "./entityGateway";

type ContextPayload = {
    type: string;
    entityId: string;
    name: string;
    data?: Record<string, any>;
};

export class ChatbotService {
    private planner = new ChatLLMPlanner();
    private success<T>(data: T, message = "Thành công", code = 200) {
        return new ServiceResponse(ResponseStatus.Success, message, data, code);
    }

    public async getPendingOperations(userId: string, conversationId: string) {
        try {
            const conversation = await UserConversation.findOne({
                _id: this.toObjectId(conversationId),
                user_id: this.toObjectId(userId),
                status: { $ne: "archived" },
            }).lean();
            if (!conversation) {
                return this.failure("Không tìm thấy hội thoại", 404);
            }

            const operations = await ChatOperation.find({
                conversation_id: conversation._id,
                status: "pending",
            })
                .sort({ created_at: -1 })
                .lean();

            return this.success(
                operations.map((op) => ({
                    id: op._id.toString(),
                    entityType: op.entity_type,
                    entityId: op.entity_id,
                    action: op.action,
                    before: op.before_snapshot,
                    after: op.after_snapshot,
                    status: op.status,
                    description: op.description,
                    createdAt: op.created_at,
                })),
                "Lấy danh sách thay đổi tạm thời thành công"
            );
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể lấy danh sách thay đổi", 500);
        }
    }

    public async undoOperation(userId: string, operationId: string) {
        try {
            const operation = await ChatOperation.findById(operationId).lean();
            if (!operation) {
                return this.failure("Không tìm thấy thao tác", 404);
            }

            const conversation = await UserConversation.findOne({
                _id: operation.conversation_id,
                user_id: this.toObjectId(userId),
                status: { $ne: "archived" },
            }).lean();
            if (!conversation) {
                return this.failure("Không có quyền thao tác", 403);
            }

            if (operation.status !== "pending") {
                return this.failure("Thao tác đã được xử lý", 400);
            }

            const gateway = new ChatEntityGateway(
                operation.project_id as Types.ObjectId,
                operation.version_id as Types.ObjectId
            );
            const entityType = operation.entity_type as EntityType;

            switch (operation.action) {
                case "create":
                    await gateway.remove(entityType, operation.entity_id);
                    break;
                case "update":
                    await gateway.write(entityType, operation.entity_id, operation.before_snapshot || {});
                    break;
                case "delete":
                    await gateway.write(
                        entityType,
                        null,
                        { ...(operation.before_snapshot || {}), id: operation.entity_id }
                    );
                    break;
            }

            await ChatOperation.updateOne(
                { _id: operation._id },
                { $set: { status: "undone", updated_at: new Date() } }
            );

            return this.success({ id: operationId, status: "undone" }, "Đã hoàn tác thay đổi");
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể hoàn tác", 500);
        }
    }

    public async keepOperation(userId: string, operationId: string) {
        try {
            const operation = await ChatOperation.findById(operationId).lean();
            if (!operation) {
                return this.failure("Không tìm thấy thao tác", 404);
            }

            const conversation = await UserConversation.findOne({
                _id: operation.conversation_id,
                user_id: this.toObjectId(userId),
                status: { $ne: "archived" },
            }).lean();
            if (!conversation) {
                return this.failure("Không có quyền thao tác", 403);
            }

            if (operation.status !== "pending") {
                return this.failure("Thao tác đã được xử lý", 400);
            }

            await ChatOperation.updateOne(
                { _id: operation._id },
                { $set: { status: "kept", updated_at: new Date() } }
            );

            return this.success({ id: operationId, status: "kept" }, "Đã giữ thay đổi");
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể xác nhận thay đổi", 500);
        }
    }

    private async logOperation(params: {
        conversation: any;
        entityType: EntityType;
        entityId: string;
        action: "create" | "update" | "delete" | "read";
        before?: Record<string, any> | null;
        after?: Record<string, any> | null;
        description?: string;
        userId: string;
    }) {
        const operation = await ChatOperation.create({
            conversation_id: params.conversation._id,
            project_id: params.conversation.project_id,
            version_id: params.conversation.version_id,
            entity_type: params.entityType,
            entity_id: params.entityId,
            action: params.action,
            before_snapshot: params.before ?? null,
            after_snapshot: params.after ?? null,
            description: params.description,
            created_by: this.toObjectId(params.userId),
        });
        return operation.toObject();
    }

    private async executeAction(
        rawAction: ChatAction,
        gateway: ChatEntityGateway,
        conversation: any,
        userId: string
    ) {
        const entityType = this.normalizeEntityType((rawAction as any).entityType || (rawAction as any).entity_type);
        const action = (rawAction as any).action;

        if (action === "read") {
            const entityId = (rawAction as any).entityId;
            let entity = await gateway.read(entityType, entityId);

            // Fallback: nếu DB không có, thử lấy từ context_items (snapshot khi user kéo‑thả)
            if (!entity && Array.isArray(conversation.context_items)) {
                const loweredId = String(entityId || "").toLowerCase();
                const ctx = conversation.context_items.find((context: any) => {
                    // Ưu tiên match theo loại entity, nhưng nếu LLM không set đúng thì vẫn cho phép match rộng hơn
                    if (context.entity_type && context.entity_type !== entityType) return false;

                    const sameId = String(context.entity_id || "").toLowerCase() === loweredId;
                    const sameName = String(context.name || "").toLowerCase() === loweredId;

                    const snapshot: any = context.data_snapshot || {};
                    const snapId = snapshot._id || snapshot.id;
                    const sameSnapshotId = snapId && String(snapId).toLowerCase() === loweredId;

                    const includesName =
                        String(context.name || "").toLowerCase().includes(loweredId) ||
                        loweredId.includes(String(context.name || "").toLowerCase());

                    return sameId || sameName || sameSnapshotId || includesName;
                });
                if (ctx?.data_snapshot) {
                    entity = ctx.data_snapshot;
                }
            }

            return {
                success: true,
                needsApproval: false,
                entityType,
                action: action,
                entityId,
                data: entity,
            };
        }

        if (action === "write") {
            const payload = (rawAction as any).payload || {};
            let entityId = (rawAction as any).entityId || null;

            // Nếu LLM không truyền entityId nhưng người dùng đang chỉnh sửa entity đã tạo trước đó (chưa keep),
            // hãy tìm entityId từ pending operations trong conversation này
            if (!entityId && Array.isArray(conversation.context_items)) {
                // Tìm trong context_items: entity cùng type và có data_snapshot với _id
                const matchingContext = conversation.context_items.find((ctx: any) => {
                    if (ctx.entity_type !== entityType) return false;
                    const snapshot = ctx.data_snapshot || {};
                    return snapshot._id || snapshot.id;
                });
                if (matchingContext?.data_snapshot) {
                    entityId = matchingContext.data_snapshot._id?.toString() || matchingContext.data_snapshot.id;
                }
            }

            // Nếu vẫn không có entityId, thử tìm từ pending operations
            if (!entityId) {
                const pendingOps = await ChatOperation.find({
                    conversation_id: conversation._id,
                    entity_type: entityType,
                    status: "pending",
                    action: "create",
                })
                    .sort({ created_at: -1 })
                    .limit(1)
                    .lean();
                if (pendingOps.length > 0) {
                    entityId = pendingOps[0].entity_id;
                }
            }

            const result = await gateway.write(entityType, entityId, payload);

            // Ưu tiên sử dụng _id MongoDB (hoặc subdocument _id) làm entityId chuẩn cho toàn hệ thống,
            // tránh giữ lại các giá trị tạm như "new" hay mã business.
            const finalEntityId =
                result.entity?._id?.toString() ||
                result.afterSnapshot?._id?.toString() ||
                result.entity?.id ||
                result.afterSnapshot?.id ||
                entityId;

            const operation = await this.logOperation({
                conversation,
                entityType,
                entityId: finalEntityId,
                action: result.action,
                before: result.beforeSnapshot,
                after: result.afterSnapshot,
                userId,
                description:
                    result.action === "create"
                        ? `Tạo ${entityType} mới`
                        : `Cập nhật ${entityType} ${finalEntityId}`,
            });

            return {
                success: true,
                needsApproval: result.action !== "read",
                entityType,
                action: action,
                entityId: finalEntityId,
                data: result.entity,
                operation,
            };
        }

        if (action === "delete") {
            const result = await gateway.remove(entityType, (rawAction as any).entityId);
            const operation = await this.logOperation({
                conversation,
                entityType,
                entityId: (rawAction as any).entityId,
                action: "delete",
                before: result.beforeSnapshot,
                after: null,
                userId,
                description: `Xóa ${entityType} ${(rawAction as any).entityId}`,
            });
            return {
                success: true,
                needsApproval: true,
                entityType,
                action: action,
                entityId: (rawAction as any).entityId,
                data: null,
                operation,
            };
        }

        return {
            success: false,
            needsApproval: false,
            entityType,
            action: action,
            entityId: (rawAction as any).entityId,
            error: "Unsupported action",
        };
    }

    private failure(message: string, code = 400, data: any = null) {
        return new ServiceResponse(ResponseStatus.Failed, message, data, code);
    }

    private toObjectId(id: string) {
        if (!id) return null;
        try {
            return new Types.ObjectId(id);
        } catch {
            return null;
        }
    }

    private formatTime(date: Date | string | undefined) {
        if (!date) return "";
        return new Date(date).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    private mapMessage(message: any) {
        return {
            id: message?._id?.toString(),
            sender: message?.sender?.type === "user" ? "user" : "bot",
            text: message?.content?.text ?? "",
            time: this.formatTime(message?.createdAt ?? message?.updatedAt),
            type: message?.content?.type ?? "text",
        };
    }

    private mapContexts(contextItems: any[] = []) {
        return contextItems.map((context) => ({
            id: context.id,
            type: context.entity_type ?? "custom",
            name: context.name,
            data: context.data_snapshot ?? {},
            addedAt: context.added_at,
        }));
    }

    private buildProjectSummary(project: any, version?: any) {
        const progress = version?.progress != null ? `${version.progress}%` : "N/A";
        const stage = version?.stage || "unknown";
        return `Project: ${project?.name} (${project?._id})
Domain: ${project?.description || "Chưa có mô tả"}
Progress: ${progress} | Stage: ${stage}
Current version: ${version?._id || "N/A"}`;
    }

    private async getRecentMessages(conversationId: Types.ObjectId) {
        const messages = await ConversationMessage.find({ conversation_id: conversationId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
        return messages
            .reverse()
            .map((msg) => ({
                role: msg.sender?.type === "user" ? "user" : "assistant",
                text: (msg.content as any)?.text || "",
            }))
            .filter((m) => !!m.text);
    }

    private normalizeEntityType(value: string): EntityType {
        const allowed: EntityType[] = [
            "usecase",
            "testcase",
            "database",
            "uml-activity",
            "uml-usecase",
            "uml-sequence",
        ];
        const normalized = value?.toLowerCase();
        const found = allowed.find((item) => item === normalized);
        if (!found) {
            throw new Error(`Entity type ${value} is not supported`);
        }
        return found;
    }

    private async loadActiveVersion(project: any, explicitVersionId?: string) {
        if (explicitVersionId) {
            const version = await Version.findOne({
                _id: explicitVersionId,
                project_id: project._id,
            }).lean();
            if (version) return version;
        }

        if (project.current_version) {
            const version =
                typeof project.current_version === "object"
                    ? project.current_version
                    : await Version.findById(project.current_version).lean();
            if (version) return version;
        }

        return Version.findOne({ project_id: project._id })
            .sort({ createdAt: -1 })
            .lean();
    }

    private async ensureProjectAccess(projectId: string, userId: string) {
        const projectObjectId = this.toObjectId(projectId);
        const userObjectId = this.toObjectId(userId);
        if (!projectObjectId || !userObjectId) {
            return null;
        }

        return Project.findOne({
            _id: projectObjectId,
            $or: [
                { owner_id: userObjectId },
                { "members.user_id": userObjectId, "members.status": "accepted" },
            ],
        })
            .populate("current_version")
            .lean();
    }

    private buildProjectPayload(project: any, versionMap: Map<string, any>) {
        const populatedVersion =
            typeof project.current_version === "object"
                ? project.current_version
                : versionMap.get(project._id.toString());

        return {
            id: project._id.toString(),
            name: project.name,
            description: project.description,
            status: project.status?.is_trashed ? "inactive" : "active",
            members: (project.members || []).filter(
                (member: any) => member.status === "accepted"
            ).length + 1,
            progress: populatedVersion?.progress ?? 0,
            lastUpdated: new Date(project.updated_at ?? project.updatedAt).toISOString().split("T")[0],
            currentVersionId: populatedVersion?._id?.toString(),
        };
    }

    private async fetchKnowledgeBase(projectId: Types.ObjectId, versionId: Types.ObjectId) {
        const [testcases, database, usecaseDiagrams, sequenceDiagrams, activityDiagrams, version] =
            await Promise.all([
                Testcase.find({ project_id: projectId, version_id: versionId })
                    .sort({ updatedAt: -1 })
                    .lean(),
                Database.findOne({ project_id: projectId, version_id: versionId }).lean(),
                UsecaseDiagram.find({ project_id: projectId, version_id: versionId }).lean(),
                SequenceDiagram.find({ project_id: projectId, version_id: versionId }).lean(),
                ActivityDiagram.find({ project_id: projectId, version_id: versionId }).lean(),
                Version.findById(versionId).lean(),
            ]);

        const usecases = (version?.requirement_model || []).map((item: any) => ({
            // Dùng _id của subdocument để LLM và client luôn làm việc với Mongo ObjectId
            id: item._id?.toString() || item.id,
            type: "usecase",
            name: item.name,
            description: item.goal ?? item.description ?? "",
            actors: item.role ? [item.role.name] : [],
            preconditions: item.preconditions ?? [],
            postconditions: item.postconditions ?? [],
            mainFlow: item.tasks ?? [],
            priority: item.priority ?? "medium",
            status: "approved",
        }));

        const testcaseItems = (testcases || []).map((testcase: any) => ({
            id: testcase._id.toString(),
            type: "testcase",
            title: testcase.title,
            name: testcase.title,
            description: testcase.description,
            status: testcase.status,
            priority: testcase.priority,
            testType: testcase.test_type,
            steps: testcase.steps?.slice(0, 5) ?? [],
        }));

        const databaseItems = database
            ? [
                {
                    id: database._id.toString(),
                    type: "database",
                    name: database.name,
                    description: database.description,
                    tables: database.tables ?? [],
                },
            ]
            : [];

        const activityItems = (activityDiagrams || []).map((item: any) => ({
            id: item._id.toString(),
            type: "uml-activity",
            name: item.name,
            description: item.description,
            elements: item.nodes?.map((node: any) => node.label).filter(Boolean) ?? [],
        }));

        const usecaseDiagramItems = (usecaseDiagrams || []).map((item: any) => ({
            id: item._id.toString(),
            type: "uml-usecase",
            name: item.name,
            description: item.description,
            actors: item.actors?.map((actor: any) => actor.name) ?? [],
            usecases: item.usecases?.map((uc: any) => uc.title) ?? [],
        }));

        const sequenceItems = (sequenceDiagrams || []).map((item: any) => ({
            id: item._id.toString(),
            type: "uml-sequence",
            name: item.name,
            description: item.description,
            participants: item.lifelines?.map((line: any) => line.name) ?? [],
            interactions: item.messages?.map((msg: any) => msg.content) ?? [],
        }));

        return {
            versionId: versionId.toString(),
            entities: {
                usecases,
                testcases: testcaseItems,
                databases: databaseItems,
                umlDiagrams: {
                    activity: activityItems,
                    usecase: usecaseDiagramItems,
                    sequence: sequenceItems,
                },
            },
        };
    }

    private async buildConversationPayload(conversations: any[]) {
        const conversationIds = conversations.map((conversation) => conversation._id);
        if (conversationIds.length === 0) {
            return [];
        }

        const messages = await ConversationMessage.find({
            conversation_id: { $in: conversationIds },
        })
            .sort({ createdAt: 1 })
            .lean();

        const groupedMessages = messages.reduce<Record<string, any[]>>((acc, message) => {
            const id = message.conversation_id.toString();
            acc[id] = acc[id] || [];
            acc[id].push(this.mapMessage(message));
            return acc;
        }, {});

        return conversations.map((conversation) => ({
            id: conversation._id.toString(),
            title: conversation.title,
            createdAt: conversation.createdAt,
            contexts: this.mapContexts(conversation.context_items),
            messages: groupedMessages[conversation._id.toString()] ?? [],
        }));
    }

    public async getProjects(userId: string) {
        try {
            const userObjectId = this.toObjectId(userId);
            if (!userObjectId) {
                return this.failure("Người dùng không hợp lệ", 401);
            }

            const projects = await Project.find({
                $or: [
                    { owner_id: userObjectId },
                    { "members.user_id": userObjectId, "members.status": "accepted" },
                ],
                "status.is_trashed": { $ne: true },
            })
                .populate("current_version")
                .sort({ updated_at: -1 })
                .lean();

            const versionMap = new Map<string, any>();
            projects.forEach((project: any) => {
                if (project.current_version?._id) {
                    versionMap.set(project._id.toString(), project.current_version);
                }
            });

            const projectPayload = await Promise.all(
                projects.map(async (project) => {
                    if (!versionMap.has(project._id.toString())) {
                        const latestVersion = await Version.findOne({ project_id: project._id })
                            .sort({ createdAt: -1 })
                            .lean();
                        if (latestVersion) {
                            versionMap.set(project._id.toString(), latestVersion);
                        }
                    }
                    return this.buildProjectPayload(project, versionMap);
                })
            );

            return this.success({ projects: projectPayload }, "Lấy danh sách dự án thành công");
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể lấy danh sách dự án", 500);
        }
    }

    public async getProjectKnowledgeBase(userId: string, projectId: string, versionId?: string) {
        try {
            const project = await this.ensureProjectAccess(projectId, userId);
            if (!project) {
                return this.failure("Không tìm thấy dự án hoặc không có quyền truy cập", 404);
            }

            const activeVersion = await this.loadActiveVersion(project, versionId);
            if (!activeVersion) {
                return this.failure("Dự án chưa có phiên bản hợp lệ", 404);
            }

            const data = await this.fetchKnowledgeBase(
                project._id as Types.ObjectId,
                activeVersion._id as Types.ObjectId
            );

            return this.success(data, "Lấy dữ liệu dự án thành công");
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể lấy dữ liệu dự án", 500);
        }
    }

    public async getConversations(
        userId: string,
        projectId: string,
        versionId?: string
    ) {
        try {
            const project = await this.ensureProjectAccess(projectId, userId);
            if (!project) {
                return this.failure("Không tìm thấy dự án hoặc không có quyền truy cập", 404);
            }

            const activeVersion = await this.loadActiveVersion(project, versionId);
            if (!activeVersion) {
                return this.failure("Không tìm thấy phiên bản", 404);
            }

            const conversations = await UserConversation.find({
                project_id: project._id,
                user_id: this.toObjectId(userId),
                version_id: activeVersion._id,
                status: { $ne: "archived" },
            })
                .sort({ last_activity: -1 })
                .lean();

            const payload = await this.buildConversationPayload(conversations);
            return this.success(
                {
                    conversations: payload,
                    versionId: activeVersion._id.toString(),
                },
                "Lấy danh sách hội thoại thành công"
            );
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể lấy hội thoại", 500);
        }
    }

    public async getConversationMessages(userId: string, conversationId: string) {
        try {
            const conversation = await UserConversation.findOne({
                _id: this.toObjectId(conversationId),
                user_id: this.toObjectId(userId),
                status: { $ne: "archived" },
            }).lean();

            if (!conversation) {
                return this.failure("Không tìm thấy hội thoại", 404);
            }

            const messages = await ConversationMessage.find({
                conversation_id: conversation._id,
            })
                .sort({ createdAt: 1 })
                .lean();

            return this.success(
                {
                    conversation: {
                        id: conversation._id.toString(),
                        title: conversation.title,
                        contexts: this.mapContexts(conversation.context_items),
                        messages: messages.map((message) => this.mapMessage(message)),
                    },
                },
                "Lấy tin nhắn thành công"
            );
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể lấy tin nhắn", 500);
        }
    }

    public async createConversation(
        userId: string,
        projectId: string,
        versionId?: string,
        title?: string
    ) {
        try {
            const project = await this.ensureProjectAccess(projectId, userId);
            if (!project) {
                return this.failure("Không tìm thấy dự án hoặc không có quyền truy cập", 404);
            }

            const activeVersion = await this.loadActiveVersion(project, versionId);
            if (!activeVersion) {
                return this.failure("Không tìm thấy phiên bản", 404);
            }

            const conversation = await UserConversation.create({
                project_id: project._id,
                version_id: activeVersion._id,
                user_id: this.toObjectId(userId),
                title: title || "Chat mới",
                context_items: [],
                message_count: 1,
                last_activity: new Date(),
            });

            const greetingMessage = await ConversationMessage.create({
                conversation_id: conversation._id,
                content: {
                    text: "Xin chào! Tôi có thể hỗ trợ gì cho bạn về dự án này?",
                    type: "text",
                },
                sender: {
                    type: "assistant",
                },
            });

            return this.success(
                {
                    conversation: {
                        id: conversation._id.toString(),
                        title: conversation.title,
                        createdAt: conversation.createdAt,
                        contexts: [],
                        messages: [this.mapMessage(greetingMessage)],
                    },
                },
                "Tạo hội thoại mới thành công",
                201
            );
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể tạo hội thoại mới", 500);
        }
    }

    public async deleteConversation(userId: string, conversationId: string) {
        try {
            const conversation = await UserConversation.findOneAndUpdate(
                {
                    _id: this.toObjectId(conversationId),
                    user_id: this.toObjectId(userId),
                },
                { status: "archived" },
                { new: true }
            );

            if (!conversation) {
                return this.failure("Không tìm thấy hội thoại", 404);
            }

            await ConversationMessage.deleteMany({ conversation_id: conversation._id });

            return this.success(null, "Đã đóng hội thoại");
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể xóa hội thoại", 500);
        }
    }

    public async addContext(
        userId: string,
        conversationId: string,
        payload: ContextPayload
    ) {
        try {
            const conversation = await UserConversation.findOne({
                _id: this.toObjectId(conversationId),
                user_id: this.toObjectId(userId),
                status: { $ne: "archived" },
            });

            if (!conversation) {
                return this.failure("Không tìm thấy hội thoại", 404);
            }

            const exists = (conversation.context_items || []).some(
                (context: any) =>
                    context.entity_id?.toString() === payload.entityId &&
                    context.entity_type === payload.type
            );

            const contextItem = {
                id: randomUUID(),
                entity_id: payload.entityId,
                entity_type: payload.type,
                name: payload.name,
                data_snapshot: payload.data ?? {},
                added_at: new Date(),
            };

            let updatedContexts;
            if (exists) {
                updatedContexts = conversation.context_items.map((context: any) =>
                    context.entity_id?.toString() === payload.entityId &&
                        context.entity_type === payload.type
                        ? contextItem
                        : context
                );
            } else {
                updatedContexts = [...(conversation.context_items || []), contextItem];
            }

            conversation.context_items = updatedContexts;
            await conversation.save();

            return this.success(
                { contexts: this.mapContexts(conversation.context_items) },
                "Đã thêm ngữ cảnh"
            );
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể thêm ngữ cảnh", 500);
        }
    }

    public async removeContext(userId: string, conversationId: string, contextId: string) {
        try {
            const conversation = await UserConversation.findOne({
                _id: this.toObjectId(conversationId),
                user_id: this.toObjectId(userId),
                status: { $ne: "archived" },
            });

            if (!conversation) {
                return this.failure("Không tìm thấy hội thoại", 404);
            }

            conversation.context_items = (conversation.context_items || []).filter(
                (context: any) => context.id !== contextId
            );
            await conversation.save();

            return this.success(
                { contexts: this.mapContexts(conversation.context_items) },
                "Đã xóa ngữ cảnh"
            );
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể xóa ngữ cảnh", 500);
        }
    }

    public async clearContexts(userId: string, conversationId: string) {
        try {
            const conversation = await UserConversation.findOneAndUpdate(
                {
                    _id: this.toObjectId(conversationId),
                    user_id: this.toObjectId(userId),
                    status: { $ne: "archived" },
                },
                { context_items: [] },
                { new: true }
            ).lean();

            if (!conversation) {
                return this.failure("Không tìm thấy hội thoại", 404);
            }

            return this.success({ contexts: [] }, "Đã xóa tất cả ngữ cảnh");
        } catch (error: any) {
            return this.failure(error.message ?? "Không thể xóa ngữ cảnh", 500);
        }
    }

    public async sendMessage(userId: string, conversationId: string, messageText: string) {
        try {
            if (!messageText || !messageText.trim()) {
                return this.failure("Nội dung tin nhắn không được để trống", 400);
            }

            const conversation = await UserConversation.findOne({
                _id: this.toObjectId(conversationId),
                user_id: this.toObjectId(userId),
                status: { $ne: "archived" },
            }).lean();

            if (!conversation) {
                return this.failure("Không tìm thấy hội thoại", 404);
            }

            const project = await Project.findById(conversation.project_id).lean();
            const version = await Version.findById(conversation.version_id).lean();
            if (!project || !version) {
                return this.failure("Không thể tải dữ liệu dự án", 400);
            }

            const [userMessage] = await ConversationMessage.create([
                {
                    conversation_id: conversation._id,
                    content: {
                        text: messageText.trim(),
                        type: "text",
                    },
                    sender: {
                        type: "user",
                        user_id: this.toObjectId(userId),
                    },
                    context_snapshot: {
                        active_entities: (conversation.context_items || []).map((context: any) => {
                            const snapshot: any = context.data_snapshot || {};
                            const rawId = snapshot._id || snapshot.id || context.entity_id;
                            return {
                                entity_type: context.entity_type,
                                entity_id: rawId ? String(rawId) : undefined,
                                entity_name: context.name,
                                entity_data: snapshot || undefined,
                            };
                        }),
                    },
                },
            ]);

            const plannerInput = {
                language: (project.language as string) || "vi-VN",
                projectSummary: this.buildProjectSummary(project, version),
                contexts: this.mapContexts(conversation.context_items || []),
                memoryNotes: (conversation.memory_notes || []).map((note: any) => note.note),
                history: (await this.getRecentMessages(conversation._id)) as Array<{ role: "user" | "assistant"; text: string }>,
                userMessage: messageText.trim(),
            };

            console.log("[ChatbotService.sendMessage] plannerInput", {
                conversationId: conversation._id.toString(),
                userId,
                message: plannerInput.userMessage,
                contextsCount: plannerInput.contexts.length,
                historyCount: plannerInput.history.length,
            });

            const plan = await this.planner.generatePlan(plannerInput);

            console.log("[ChatbotService.sendMessage] planner output", {
                replyPreview: (plan.reply || "").slice(0, 200),
                actionsCount: Array.isArray(plan.actions) ? plan.actions.length : 0,
                hasMemoryNote: !!plan.memoryNote,
            });
            const gateway = new ChatEntityGateway(
                conversation.project_id as Types.ObjectId,
                conversation.version_id as Types.ObjectId
            );

            const actionResults: any[] = [];
            for (const action of plan.actions || []) {
                try {
                    const result = await this.executeAction(action as ChatAction, gateway, conversation, userId);
                    actionResults.push(result);
                } catch (error: any) {
                    console.error("[ChatbotService.sendMessage] executeAction error", {
                        action: action.action,
                        entityType: (action as any).entityType,
                        entityId: (action as any).entityId,
                        payload: (action as any).payload,
                        message: error?.message,
                        stack: error?.stack,
                    });
                    actionResults.push({
                        success: false,
                        action: action.action,
                        entityType: (action as any).entityType,
                        entityId: (action as any).entityId,
                        error: error?.message || "Thao tác thất bại",
                    });
                }
            }

            console.log("[ChatbotService.sendMessage] actions executed", {
                total: actionResults.length,
                successes: actionResults.filter((a: any) => a.success).length,
                reads: actionResults.filter((a: any) => a.action === "read").length,
                writes: actionResults.filter((a: any) => a.action === "write").length,
                deletes: actionResults.filter((a: any) => a.action === "delete").length,
                operationsCreated: actionResults.filter((a: any) => !!a.operation).length,
            });

            // Nếu có actions được thực hiện và reply ban đầu chỉ là câu xác nhận ngắn,
            // gửi lại cho LLM với kết quả actions để LLM tự tạo reply chi tiết
            let replyText = plan.reply || "Tôi đã tiếp nhận yêu cầu của bạn.";
            const hasReadActions = plan.actions?.some(a => a.action === "read") || false;
            const isShortConfirmation = replyText.toLowerCase().includes("kiểm tra") || 
                                       replyText.toLowerCase().includes("đang") ||
                                       replyText.toLowerCase().includes("đợi") ||
                                       replyText.toLowerCase().includes("vui lòng");

            if (actionResults.length > 0 && (hasReadActions || isShortConfirmation)) {
                // Gửi lại cho LLM với kết quả actions để tạo reply chi tiết
                const followUpPlan = await this.planner.generatePlan({
                    language: (project.language as string) || "vi-VN",
                    projectSummary: this.buildProjectSummary(project, version),
                    contexts: this.mapContexts(conversation.context_items || []),
                    memoryNotes: (conversation.memory_notes || []).map((note: any) => note.note),
                    history: (await this.getRecentMessages(conversation._id)) as Array<{ role: "user" | "assistant"; text: string }>,
                    userMessage: messageText.trim(),
                    actionResults: actionResults.map((ar: any) => ({
                        success: ar.success,
                        action: ar.action,
                        entityType: ar.entityType,
                        entityId: ar.entityId,
                        data: ar.data,
                        error: ar.error,
                    })),
                });

                if (followUpPlan.reply) {
                    replyText = followUpPlan.reply;
                }
            }

            const assistantPayloads: any[] = [];

            // Tin nhắn: câu trả lời của LLM (dựa trên kết quả actions nếu có)
            assistantPayloads.push({
                conversation_id: conversation._id,
                content: {
                    text: replyText,
                    type: "text",
                },
                sender: {
                    type: "assistant",
                },
            });

            const botDocs = await ConversationMessage.create(assistantPayloads);
            const botMessages = botDocs.map((doc) => this.mapMessage(doc));
            const botMessage = botMessages[botMessages.length - 1];

            const updatePayload: Record<string, any> = {
                $inc: { message_count: 1 + botMessages.length },
                $set: { last_activity: new Date() },
            };
            if (plan.memoryNote) {
                updatePayload.$push = {
                    memory_notes: {
                        note: plan.memoryNote,
                        created_at: new Date(),
                    },
                };
            }
            await UserConversation.updateOne({ _id: conversation._id }, updatePayload);

            return this.success(
                {
                    userMessage: this.mapMessage(userMessage),
                    botMessage,
                    botMessages,
                    actions: actionResults,
                    operations: actionResults
                        .filter((item: any) => !!item.operation)
                        .map((item: any) => ({
                            id: item.operation._id?.toString(),
                            entityType: item.entityType,
                            entityId: item.entityId,
                            action: item.operation.action,
                            before: item.operation.before_snapshot,
                            after: item.operation.after_snapshot,
                            status: item.operation.status,
                            description: item.operation.description,
                        })),
                },
                "Gửi tin nhắn thành công"
            );
        } catch (error: any) {
            console.error("[ChatbotService.sendMessage] error", error);
            return this.failure(error.message ?? "Không thể gửi tin nhắn", 500);
        }
    }
}

