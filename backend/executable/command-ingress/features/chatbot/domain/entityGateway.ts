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
        switch (entityType) {
            case "usecase":
                return this.findUsecase(entityId);
            case "testcase":
                return Testcase.findOne({
                    _id: entityId,
                    project_id: this.projectId,
                    version_id: this.versionId,
                })
                    .lean()
                    .exec();
            case "database":
                return Database.findOne({
                    _id: entityId,
                    project_id: this.projectId,
                    version_id: this.versionId,
                })
                    .lean()
                    .exec();
            case "uml-usecase":
                return UsecaseDiagram.findOne({
                    _id: entityId,
                    project_id: this.projectId,
                    version_id: this.versionId,
                })
                    .lean()
                    .exec();
            case "uml-sequence":
                return SequenceDiagram.findOne({
                    _id: entityId,
                    project_id: this.projectId,
                    version_id: this.versionId,
                })
                    .lean()
                    .exec();
            case "uml-activity":
                return ActivityDiagram.findOne({
                    _id: entityId,
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
        switch (entityType) {
            case "usecase":
                return this.saveUsecase(entityId, payload);
            case "testcase":
                return this.saveTestcase(entityId, payload);
            case "database":
                return this.saveDatabase(entityId, payload);
            case "uml-usecase":
                return this.saveUmlDoc(entityType, UsecaseDiagram, entityId, payload);
            case "uml-sequence":
                return this.saveUmlDoc(entityType, SequenceDiagram, entityId, payload);
            case "uml-activity":
                return this.saveUmlDoc(entityType, ActivityDiagram, entityId, payload);
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
        // Ưu tiên khớp theo id nội bộ
        let found = list.find((item) => String(item.id) === String(entityId));
        if (found) return found;

        // Fallback: khớp theo name (LLM đôi khi dùng title thay vì id)
        found = list.find((item) => item.name === entityId);
        if (found) return found;

        // Thử khớp gần đúng theo tên
        found = list.find((item) => String(item.name).toLowerCase() === String(entityId).toLowerCase());
        return found || null;
    }

    private async saveUsecase(entityId: string | null, payload: EntityWritePayload): Promise<EntityOperationResult> {
        const version = await Version.findOne({
            _id: this.versionId,
            project_id: this.projectId,
        });
        if (!version) throw new Error("Version not found");

        const requirementModel = version.requirement_model || [];
        let action: "create" | "update" = "update";
        let beforeSnapshot: Record<string, any> | undefined;
        let targetId = entityId;

        if (entityId) {
            const idx = requirementModel.findIndex((item: any) => String(item.id) === String(entityId));
            if (idx === -1) throw new Error("Use case not found");
            beforeSnapshot = requirementModel[idx]?.toObject ? requirementModel[idx].toObject() : { ...requirementModel[idx] };
            requirementModel[idx] = { ...beforeSnapshot, ...payload };
        } else {
            action = "create";
            targetId = payload.id || `UC-${Date.now()}`;
            requirementModel.push({ id: targetId, ...payload });
        }

        (version as any).requirement_model = requirementModel;
        version.markModified("requirement_model");
        await version.save();

        const saved = requirementModel.find((item: any) => String(item.id) === String(targetId)) || null;
        return {
            entity: saved,
            beforeSnapshot: beforeSnapshot || null,
            afterSnapshot: saved,
            action,
        };
    }

    private async saveTestcase(entityId: string | null, payload: EntityWritePayload): Promise<EntityOperationResult> {
        if (entityId) {
            const current = await Testcase.findOne({
                _id: entityId,
                project_id: this.projectId,
                version_id: this.versionId,
            });
            if (!current) throw new Error("Test case not found");
            const beforeSnapshot = current.toObject();
            Object.assign(current, payload);
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
            ...payload,
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
        if (entityId) {
            const current = await Database.findOne({
                _id: entityId,
                project_id: this.projectId,
                version_id: this.versionId,
            });
            if (!current) throw new Error("Database schema not found");
            const beforeSnapshot = current.toObject();
            Object.assign(current, payload);
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
            ...payload,
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
        if (entityId) {
            const current = await Model.findOne({
                _id: entityId,
                project_id: this.projectId,
                version_id: this.versionId,
            });
            if (!current) throw new Error(`${entityType} not found`);
            const beforeSnapshot = current.toObject();
            Object.assign(current, payload);
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
            ...payload,
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
        let idx = requirementModel.findIndex((item: any) => String(item.id) === String(entityId));
        if (idx === -1) {
            // Fallback theo tên
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

