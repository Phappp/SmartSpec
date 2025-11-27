import { Types } from "mongoose";
import Version from "../../../../../internal/model/version";
import Testcase from "../../../../../internal/model/testcase";
import Database from "../../../../../internal/model/database";
import UsecaseDiagram from "../../../../../internal/model/usecase_diagram";
import SequenceDiagram from "../../../../../internal/model/sequence_diagram";
import ActivityDiagram from "../../../../../internal/model/activity_diagram";

export type EntityType =
    | "usecase"
    | "testcase"
    | "database"
    | "uml-activity"
    | "uml-usecase"
    | "uml-sequence";

export type EntityWritePayload = Record<string, any>;

export type EntityOperationResult = {
    entity: Record<string, any> | null;
    beforeSnapshot?: Record<string, any> | null;
    afterSnapshot?: Record<string, any> | null;
    action: "create" | "update" | "delete" | "read";
};

export class ChatEntityGateway {
    constructor(
        private readonly projectId: Types.ObjectId,
        private readonly versionId: Types.ObjectId
    ) { }

    async read(entityType: EntityType, entityId: string) {
        // Với các entity Mongo (trừ usecase), nếu entityId không phải ObjectId hợp lệ thì bỏ qua, tránh CastError
        let normalizedId: string | null = entityId;
        if (entityType !== "usecase" && entityId && !Types.ObjectId.isValid(entityId)) {
            normalizedId = null;
        }

        switch (entityType) {
            case "usecase":
                return this.findUsecase(entityId);
            case "testcase":
                if (!normalizedId) return null;
                return Testcase.findOne({
                    _id: normalizedId,
                    project_id: this.projectId,
                    version_id: this.versionId,
                })
                    .lean()
                    .exec();
            case "database":
                if (!normalizedId) return null;
                return Database.findOne({
                    _id: normalizedId,
                    project_id: this.projectId,
                    version_id: this.versionId,
                })
                    .lean()
                    .exec();
            case "uml-usecase":
                if (!normalizedId) return null;
                return UsecaseDiagram.findOne({
                    _id: normalizedId,
                    project_id: this.projectId,
                    version_id: this.versionId,
                })
                    .lean()
                    .exec();
            case "uml-sequence":
                if (!normalizedId) return null;
                return SequenceDiagram.findOne({
                    _id: normalizedId,
                    project_id: this.projectId,
                    version_id: this.versionId,
                })
                    .lean()
                    .exec();
            case "uml-activity":
                if (!normalizedId) return null;
                return ActivityDiagram.findOne({
                    _id: normalizedId,
                    project_id: this.projectId,
                    version_id: this.versionId,
                })
                    .lean()
                    .exec();
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }
    }

    async write(entityType: EntityType, entityId: string | null, payload: EntityWritePayload): Promise<EntityOperationResult> {
        // Chuẩn hoá entityId: tránh CastError khi LLM gửi các giá trị không phải ObjectId
        // Đối với các entity lưu trong Mongo (_id là ObjectId), nếu entityId không phải ObjectId thì coi như create (entityId = null)
        let normalizedId = entityId;
        if (entityType !== "usecase" && entityId) {
            // Với testcase/database/uml-*, _id là ObjectId
            if (!Types.ObjectId.isValid(entityId)) {
                normalizedId = null;
            }
        }

        switch (entityType) {
            case "usecase":
                return this.saveUsecase(entityId, payload);
            case "testcase":
                return this.saveTestcase(normalizedId, payload);
            case "database":
                return this.saveDatabase(normalizedId, payload);
            case "uml-usecase":
                return this.saveUmlDoc(entityType, UsecaseDiagram, normalizedId, payload);
            case "uml-sequence":
                return this.saveUmlDoc(entityType, SequenceDiagram, normalizedId, payload);
            case "uml-activity":
                return this.saveUmlDoc(entityType, ActivityDiagram, normalizedId, payload);
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }
    }

    async remove(entityType: EntityType, entityId: string): Promise<EntityOperationResult> {
        switch (entityType) {
            case "usecase":
                return this.deleteUsecase(entityId);
            case "testcase":
                return this.deleteDocument(Testcase, entityId, "testcase");
            case "database":
                return this.deleteDocument(Database, entityId, "database");
            case "uml-usecase":
                return this.deleteDocument(UsecaseDiagram, entityId, entityType);
            case "uml-sequence":
                return this.deleteDocument(SequenceDiagram, entityId, entityType);
            case "uml-activity":
                return this.deleteDocument(ActivityDiagram, entityId, entityType);
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }
    }

    private async findUsecase(entityId: string) {
        const version = await Version.findOne({
            _id: this.versionId,
            project_id: this.projectId,
        }).lean();
        if (!version) return null;

        const list = (version.requirement_model || []) as any[];

        // 1. Ưu tiên khớp theo _id MongoDB của subdocument (id chuẩn mà chatbot nên dùng)
        let found = list.find((item: any) => String(item._id) === String(entityId));
        if (found) return found;

        // 2. Fallback: khớp theo id nội bộ cũ (trường id trong requirement_model)
        found = list.find((item: any) => String(item.id) === String(entityId));
        if (found) return found;

        // 3. Fallback: khớp theo name (LLM đôi khi dùng title thay vì id)
        found = list.find((item: any) => item.name === entityId);
        if (found) return found;

        // Thử khớp gần đúng theo tên
        found = list.find((item) => String(item.name).toLowerCase() === String(entityId).toLowerCase());
        return found || null;
    }

    /**
     * Chuẩn hoá payload usecase từ LLM về đúng schema requirement_model
     * - id: đảm bảo luôn có
     * - name: bắt buộc
     * - goal: bắt buộc
     * - reason: nếu thiếu thì sinh lý do mặc định từ goal/name
     * - tasks: từ steps (string[]) hoặc tasks (string[])
     * - role: nếu thiếu thì gán role mặc định "Người dùng hệ thống"
     * - priority: nếu thiếu -> "medium"
     */
    /**
     * Normalize usecase payload, có thể merge với existing data khi update
     * @param raw - Payload từ LLM
     * @param existingData - Dữ liệu hiện có (khi update), để giữ các field required
     */
    private normalizeUsecasePayload(
        raw: EntityWritePayload,
        existingData?: Record<string, any>
    ): EntityWritePayload {
        // Khi update, merge với existing data để giữ các field required
        const payload: any = existingData ? { ...existingData, ...raw } : { ...raw };

        // id nội bộ (cho requirement_model)
        if (!payload.id) {
            payload.id = existingData?.id || `UC-${Date.now()}`;
        }

        // name bắt buộc: nếu LLM dùng title
        if (!payload.name && payload.title) {
            payload.name = payload.title;
        }
        // Nếu vẫn không có name, dùng từ existing hoặc tạo mặc định
        if (!payload.name || (typeof payload.name === 'string' && payload.name.trim() === '')) {
            if (existingData?.name) {
                payload.name = existingData.name;
            } else {
                payload.name = `Use Case ${Date.now()}`;
            }
        } else {
            payload.name = String(payload.name).trim();
        }

        // goal bắt buộc: đảm bảo luôn có giá trị (không phải empty string)
        // Nếu goal là empty string hoặc falsy, thì set giá trị mặc định
        if (!payload.goal || (typeof payload.goal === 'string' && payload.goal.trim() === '')) {
            // Ưu tiên dùng từ existing data
            if (existingData?.goal && typeof existingData.goal === 'string' && existingData.goal.trim()) {
                payload.goal = existingData.goal.trim();
            } else if (payload.description && typeof payload.description === 'string' && payload.description.trim()) {
                // Nếu không có từ existing, dùng description nếu có
                payload.goal = payload.description.trim();
            } else {
                // Nếu không có description, tạo goal mặc định từ name
                const name = payload.name || "use case";
                payload.goal = `Thực hiện chức năng ${name} cho người dùng.`;
            }
        } else {
            // Đảm bảo goal là string và không phải empty
            payload.goal = String(payload.goal).trim();
        }

        // reason bắt buộc: nếu thiếu thì generate từ goal/name
        if (!payload.reason || (typeof payload.reason === 'string' && payload.reason.trim() === '')) {
            // Ưu tiên dùng từ existing data
            if (existingData?.reason && typeof existingData.reason === 'string' && existingData.reason.trim()) {
                payload.reason = existingData.reason.trim();
            } else {
                // Nếu không có từ existing, generate từ goal/name
                const name = payload.name || "use case";
                const goal = payload.goal || "";
                payload.reason = goal
                    ? `Đáp ứng mục tiêu: ${goal}`
                    : `Cung cấp chức năng ${name} cho người dùng.`;
            }
        } else {
            // Đảm bảo reason là string và không phải empty
            payload.reason = String(payload.reason).trim();
        }

        // Helper function để normalize task item (có thể là string hoặc object)
        const normalizeTaskItem = (item: any): string => {
            if (typeof item === 'string') {
                return item.trim();
            }
            if (typeof item === 'object' && item !== null) {
                // Nếu là object, thử extract text từ các field phổ biến
                if (item.text) return String(item.text).trim();
                if (item.description) return String(item.description).trim();
                if (item.name) return String(item.name).trim();
                if (item.action) return String(item.action).trim();
                if (item.step) return String(item.step).trim();
                if (item.content) return String(item.content).trim();
                // Nếu không có field nào, thử JSON stringify (nhưng chỉ lấy một phần)
                const jsonStr = JSON.stringify(item);
                // Nếu JSON quá dài, chỉ lấy một phần
                if (jsonStr.length > 200) {
                    return jsonStr.substring(0, 200) + '...';
                }
                return jsonStr;
            }
            return String(item).trim();
        };

        // tasks: ưu tiên tasks; nếu không có thì chuyển steps -> tasks hoặc mainFlow -> tasks
        // Khi update, nếu payload có mainFlow/steps mới, dùng nó; nếu không, giữ tasks cũ
        if (raw.mainFlow && Array.isArray(raw.mainFlow) && raw.mainFlow.length > 0) {
            // LLM gửi mainFlow -> chuyển thành tasks
            payload.tasks = raw.mainFlow.map(normalizeTaskItem).filter(Boolean);
        } else if (raw.steps && Array.isArray(raw.steps) && raw.steps.length > 0) {
            // LLM gửi steps -> chuyển thành tasks
            payload.tasks = raw.steps.map(normalizeTaskItem).filter(Boolean);
        } else if (raw.tasks && Array.isArray(raw.tasks) && raw.tasks.length > 0) {
            // LLM gửi tasks trực tiếp - normalize từng item
            payload.tasks = raw.tasks.map(normalizeTaskItem).filter(Boolean);
        } else if (!Array.isArray(payload.tasks) || payload.tasks.length === 0) {
            // Nếu không có tasks mới, giữ tasks cũ từ existing (nếu có)
            if (existingData?.tasks && Array.isArray(existingData.tasks)) {
                payload.tasks = existingData.tasks;
            } else {
                payload.tasks = [];
            }
        } else {
            // Đảm bảo tasks đã có cũng được normalize
            payload.tasks = payload.tasks.map(normalizeTaskItem).filter(Boolean);
        }

        // Final validation: đảm bảo tasks là array of strings
        if (Array.isArray(payload.tasks)) {
            payload.tasks = payload.tasks
                .map((item: any) => {
                    if (typeof item === 'string') {
                        return item.trim();
                    }
                    return normalizeTaskItem(item);
                })
                .filter((item: string) => item && item.length > 0); // Loại bỏ empty strings
        } else {
            payload.tasks = [];
        }

        // role bắt buộc: nếu thiếu thì set role mặc định
        if (!payload.role) {
            // Ưu tiên dùng từ existing data
            if (existingData?.role) {
                payload.role = existingData.role;
            } else {
                payload.role = {
                    id: `ROLE-${Date.now()}`,
                    name: "Người dùng hệ thống",
                    description: "Người dùng tương tác với hệ thống thông qua use case này",
                };
            }
        }

        // priority bắt buộc: default "medium"
        if (!payload.priority || !["low", "medium", "high"].includes(String(payload.priority))) {
            payload.priority = "medium";
        }

        // Các field mảng tuỳ chọn: đảm bảo luôn là mảng để không vi phạm schema
        const arrayFields = [
            "inputs",
            "outputs",
            "rules",
            "triggers",
            "preconditions",
            "postconditions",
            "exceptions",
            "stakeholders",
            "constraints",
            "related_usecases",
        ];
        for (const field of arrayFields) {
            if (payload[field] == null) {
                payload[field] = [];
            } else if (!Array.isArray(payload[field])) {
                payload[field] = [payload[field]];
            }
        }

        if (payload.context == null) payload.context = "";
        if (payload.feedback == null) payload.feedback = null;

        return payload;
    }

    private async saveUsecase(entityId: string | null, rawPayload: EntityWritePayload): Promise<EntityOperationResult> {
        const version = await Version.findOne({
            _id: this.versionId,
            project_id: this.projectId,
        });
        if (!version) throw new Error("Version not found");

        const requirementModel = version.requirement_model || [];
        let action: "create" | "update" = "update";
        let beforeSnapshot: Record<string, any> | undefined;
        let targetInternalId: string;
        let existingData: Record<string, any> | undefined;

        if (entityId) {
            // 1. Tìm theo _id MongoDB của subdocument (id mà chatbot nên dùng)
            let idx = requirementModel.findIndex(
                (item: any) => String(item._id) === String(entityId)
            );

            // 2. Fallback: tìm theo id nội bộ cũ
            if (idx === -1) {
                idx = requirementModel.findIndex(
                    (item: any) => String(item.id) === String(entityId)
                );
            }

            // 3. Fallback: theo name (trường hợp rất cũ LLM dùng tên làm id)
            if (idx === -1) {
                idx = requirementModel.findIndex((item: any) => item.name === entityId);
            }

            if (idx === -1) {
                // Không tìm thấy usecase -> coi như tạo usecase mới
                action = "create";
                const payload = this.normalizeUsecasePayload(rawPayload);
                targetInternalId = payload.id;
                requirementModel.push({ id: targetInternalId, ...payload });
            } else {
                // Tìm thấy usecase -> update
                beforeSnapshot = requirementModel[idx]?.toObject
                    ? requirementModel[idx].toObject()
                    : { ...requirementModel[idx] };
                
                // Lấy existing data để normalize payload (giữ các field required)
                existingData = beforeSnapshot;
                
                // Normalize payload với existing data để đảm bảo các field required luôn có
                const payload = this.normalizeUsecasePayload(rawPayload, existingData);
                
                // Merge: payload mới override các field có trong rawPayload, giữ các field khác từ existing
                // Đảm bảo giữ nguyên _id MongoDB
                const mongoId = (requirementModel[idx] as any)._id;
                requirementModel[idx] = {
                    ...beforeSnapshot,
                    ...payload,
                    _id: mongoId, // Giữ nguyên _id MongoDB
                };
                
                // Giữ nguyên id nội bộ cũ
                targetInternalId = (requirementModel[idx] as any).id;
            }
        } else {
            action = "create";
            const payload = this.normalizeUsecasePayload(rawPayload);
            targetInternalId = payload.id;
            requirementModel.push({ id: targetInternalId, ...payload });
        }

        (version as any).requirement_model = requirementModel;
        version.markModified("requirement_model");
        await version.save();

        const saved =
            requirementModel.find(
                (item: any) => String(item.id) === String(targetInternalId)
            ) || null;
        return {
            entity: saved,
            beforeSnapshot: beforeSnapshot || null,
            afterSnapshot: saved,
            action,
        };
    }

    /**
     * Chuẩn hoá payload testcase từ LLM về đúng schema trong Mongo
     * - name -> title
     * - precondition/preconditions (string) -> preconditions: string[]
     * - steps: string[] -> steps: { step_number, action, ... }[]
     * - expectedResult -> expected_results.ui_level[]
     * - usecaseId -> source_requirement_ids
     */
    private normalizeTestcasePayload(raw: EntityWritePayload): EntityWritePayload {
        const payload: any = { ...raw };

        // name -> title
        if (payload.name && !payload.title) {
            payload.title = payload.name;
        }

        // precondition / preconditions -> preconditions: string[]
        if (payload.precondition && !payload.preconditions) {
            payload.preconditions = [String(payload.precondition).trim()].filter(Boolean);
        } else if (typeof payload.preconditions === "string") {
            payload.preconditions = [payload.preconditions.trim()].filter(Boolean);
        }

        // usecaseId -> source_requirement_ids
        if (payload.usecaseId && !payload.source_requirement_ids) {
            payload.source_requirement_ids = [String(payload.usecaseId)];
        }

        // steps: string[] -> steps: object[]
        if (Array.isArray(payload.steps) && payload.steps.length > 0) {
            const originalSteps = payload.steps;
            const isStringArray = originalSteps.every((s: any) => typeof s === "string");
            if (isStringArray) {
                payload.steps = originalSteps.map((s: string, idx: number) => {
                    const withoutNumber = s.replace(/^\s*\d+[\.\)]\s*/, "").trim();
                    return {
                        step_number: idx + 1,
                        action: withoutNumber || s,
                        input_data: {},
                        expected_immediate_result: "",
                        verification_points: [],
                    };
                });
            }
        }

        // expectedResult -> expected_results.ui_level[]
        if (payload.expectedResult && !payload.expected_results) {
            payload.expected_results = {
                ui_level: [String(payload.expectedResult).trim()].filter(Boolean),
                api_level: {},
                database_level: [],
                business_level: "",
            };
        }

        return payload;
    }

    private async saveTestcase(entityId: string | null, payload: EntityWritePayload): Promise<EntityOperationResult> {
        const normalizedPayload = this.normalizeTestcasePayload(payload);

        if (entityId) {
            const current = await Testcase.findOne({
                _id: entityId,
                project_id: this.projectId,
                version_id: this.versionId,
            });
            if (!current) {
                // Nếu không tìm thấy testcase theo _id thì fallback sang tạo mới
                const created = await Testcase.create({
                    ...normalizedPayload,
                    project_id: this.projectId,
                    version_id: this.versionId,
                });
                return {
                    entity: created.toObject(),
                    beforeSnapshot: null,
                    afterSnapshot: created.toObject(),
                    action: "create",
                };
            }
            const beforeSnapshot = current.toObject();
            Object.assign(current, normalizedPayload);
            await current.save();
            const afterSnapshot = current.toObject();
            return {
                entity: afterSnapshot,
                beforeSnapshot,
                afterSnapshot,
                action: "update",
            };
        }

        const created = await Testcase.create({
            ...normalizedPayload,
            project_id: this.projectId,
            version_id: this.versionId,
        });
        return {
            entity: created.toObject(),
            beforeSnapshot: null,
            afterSnapshot: created.toObject(),
            action: "create",
        };
    }

    private async saveDatabase(entityId: string | null, payload: EntityWritePayload): Promise<EntityOperationResult> {
        const normalizedPayload: any = { ...payload };
        // Đảm bảo name có giá trị (LLM đôi khi gửi title thay vì name)
        if (!normalizedPayload.name && normalizedPayload.title) {
            normalizedPayload.name = normalizedPayload.title;
        }

        if (entityId) {
            const current = await Database.findOne({
                _id: entityId,
                project_id: this.projectId,
                version_id: this.versionId,
            });
            if (!current) {
                // Không tìm thấy database hiện có -> tạo mới
                const created = await Database.create({
                    ...normalizedPayload,
                    project_id: this.projectId,
                    version_id: this.versionId,
                });
                return {
                    entity: created.toObject(),
                    beforeSnapshot: null,
                    afterSnapshot: created.toObject(),
                    action: "create",
                };
            }
            const beforeSnapshot = current.toObject();
            Object.assign(current, normalizedPayload);
            await current.save();
            const afterSnapshot = current.toObject();
            return {
                entity: afterSnapshot,
                beforeSnapshot,
                afterSnapshot,
                action: "update",
            };
        }

        const created = await Database.create({
            ...normalizedPayload,
            project_id: this.projectId,
            version_id: this.versionId,
        });
        return {
            entity: created.toObject(),
            beforeSnapshot: null,
            afterSnapshot: created.toObject(),
            action: "create",
        };
    }

    private async saveUmlDoc(entityType: EntityType, Model: any, entityId: string | null, payload: EntityWritePayload): Promise<EntityOperationResult> {
        const normalizedPayload: any = { ...payload };
        // Một số LLM có thể dùng "title" thay cho "name"
        if (!normalizedPayload.name && normalizedPayload.title) {
            normalizedPayload.name = normalizedPayload.title;
        }

        if (entityId) {
            const current = await Model.findOne({
                _id: entityId,
                project_id: this.projectId,
                version_id: this.versionId,
            });
            if (!current) {
                // Không tìm thấy UML doc -> tạo mới
                const created = await Model.create({
                    ...normalizedPayload,
                    project_id: this.projectId,
                    version_id: this.versionId,
                });
                return {
                    entity: created.toObject(),
                    beforeSnapshot: null,
                    afterSnapshot: created.toObject(),
                    action: "create",
                };
            }
            const beforeSnapshot = current.toObject();
            Object.assign(current, normalizedPayload);
            await current.save();
            const afterSnapshot = current.toObject();
            return {
                entity: afterSnapshot,
                beforeSnapshot,
                afterSnapshot,
                action: "update",
            };
        }

        const created = await Model.create({
            ...normalizedPayload,
            project_id: this.projectId,
            version_id: this.versionId,
        });
        return {
            entity: created.toObject(),
            beforeSnapshot: null,
            afterSnapshot: created.toObject(),
            action: "create",
        };
    }

    private async deleteUsecase(entityId: string): Promise<EntityOperationResult> {
        const version = await Version.findOne({
            _id: this.versionId,
            project_id: this.projectId,
        });
        if (!version) throw new Error("Version not found");

        const requirementModel = version.requirement_model || [];

        // 1. Ưu tiên xoá theo _id MongoDB của subdocument
        let idx = requirementModel.findIndex(
            (item: any) => String(item._id) === String(entityId)
        );

        // 2. Fallback theo id nội bộ cũ
        if (idx === -1) {
            idx = requirementModel.findIndex(
                (item: any) => String(item.id) === String(entityId)
            );
        }

        // 3. Fallback theo tên (legacy)
        if (idx === -1) {
            idx = requirementModel.findIndex((item: any) => item.name === entityId);
        }
        if (idx === -1) throw new Error("Use case not found");

        const removed = requirementModel[idx]?.toObject ? requirementModel[idx].toObject() : { ...requirementModel[idx] };
        requirementModel.splice(idx, 1);
        (version as any).requirement_model = requirementModel;
        version.markModified("requirement_model");
        await version.save();

        return {
            entity: null,
            beforeSnapshot: removed,
            afterSnapshot: null,
            action: "delete",
        };
    }

    private async deleteDocument(Model: any, entityId: string, entityType: string): Promise<EntityOperationResult> {
        const doc = await Model.findOne({
            _id: entityId,
            project_id: this.projectId,
            version_id: this.versionId,
        });
        if (!doc) throw new Error(`${entityType} not found`);
        const beforeSnapshot = doc.toObject();
        await doc.deleteOne();
        return {
            entity: null,
            beforeSnapshot,
            afterSnapshot: null,
            action: "delete",
        };
    }
}

