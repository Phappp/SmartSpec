import { Response, NextFunction } from "express";
import { BaseController } from "../../../../shared/base-controller";
import { ChatbotService } from "../../domain/service";
import { handleServiceResponse } from "../../../../services/httpHandlerResponse";
import { ServiceResponse, ResponseStatus } from "../../../../services/serviceResponse";
import { HttpRequest } from "../../../../types";

export class ChatbotController extends BaseController {
    constructor(private readonly service: ChatbotService) {
        super();
    }

    public getProjects = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }
            const result = await this.service.getProjects(userId);
            handleServiceResponse(result, innerRes);
        });
    };

    public getProjectKnowledgeBase = async (
        req: HttpRequest,
        res: Response,
        next: NextFunction
    ) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { projectId } = innerReq.params;
            const { versionId } = innerReq.query || {};

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }

            if (!projectId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu projectId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.getProjectKnowledgeBase(
                userId,
                projectId,
                typeof versionId === "string" ? versionId : undefined
            );
            handleServiceResponse(result, innerRes);
        });
    };

    public getConversations = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { projectId, versionId } = innerReq.query || {};

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }

            if (!projectId || typeof projectId !== "string") {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu projectId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.getConversations(
                userId,
                projectId,
                typeof versionId === "string" ? versionId : undefined
            );
            handleServiceResponse(result, innerRes);
        });
    };

    public getConversationMessages = async (
        req: HttpRequest,
        res: Response,
        next: NextFunction
    ) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { conversationId } = innerReq.params;

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }

            if (!conversationId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu conversationId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.getConversationMessages(userId, conversationId);
            handleServiceResponse(result, innerRes);
        });
    };

    public createConversation = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { projectId, versionId, title } = innerReq.body ?? {};

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }

            if (!projectId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu projectId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.createConversation(
                userId,
                projectId,
                versionId,
                title
            );
            handleServiceResponse(result, innerRes);
        });
    };

    public deleteConversation = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { conversationId } = innerReq.params;

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }

            if (!conversationId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu conversationId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.deleteConversation(userId, conversationId);
            handleServiceResponse(result, innerRes);
        });
    };

    public addContext = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { conversationId } = innerReq.params;
            const { type, entityId, name, data } = innerReq.body ?? {};

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }

            if (!conversationId || !type || !entityId || !name) {
                handleServiceResponse(
                    new ServiceResponse(
                        ResponseStatus.Failed,
                        "Thiếu thông tin ngữ cảnh (conversationId/type/entityId/name)",
                        null,
                        400
                    ),
                    innerRes
                );
                return;
            }

            const result = await this.service.addContext(userId, conversationId, {
                type,
                entityId,
                name,
                data,
            });
            handleServiceResponse(result, innerRes);
        });
    };

    public removeContext = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { conversationId, contextId } = innerReq.params;

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }

            if (!conversationId || !contextId) {
                handleServiceResponse(
                    new ServiceResponse(
                        ResponseStatus.Failed,
                        "Thiếu conversationId hoặc contextId",
                        null,
                        400
                    ),
                    innerRes
                );
                return;
            }

            const result = await this.service.removeContext(userId, conversationId, contextId);
            handleServiceResponse(result, innerRes);
        });
    };

    public clearContexts = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { conversationId } = innerReq.params;

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }

            if (!conversationId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu conversationId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.clearContexts(userId, conversationId);
            handleServiceResponse(result, innerRes);
        });
    };

    public getPendingOperations = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { conversationId } = innerReq.params;

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }
            if (!conversationId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu conversationId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.getPendingOperations(userId, conversationId);
            handleServiceResponse(result, innerRes);
        });
    };

    public undoOperation = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { operationId } = innerReq.params;

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }
            if (!operationId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu operationId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.undoOperation(userId, operationId);
            handleServiceResponse(result, innerRes);
        });
    };

    public keepOperation = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { operationId } = innerReq.params;

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }
            if (!operationId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu operationId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.keepOperation(userId, operationId);
            handleServiceResponse(result, innerRes);
        });
    };

    public sendMessage = async (req: HttpRequest, res: Response, next: NextFunction) => {
        await this.execWithTryCatchBlock(req, res, next, async (innerReq, innerRes) => {
            const userId = innerReq.getSubject?.();
            const { conversationId } = innerReq.params;
            const { message } = innerReq.body ?? {};

            if (!userId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
                    innerRes
                );
                return;
            }

            if (!conversationId) {
                handleServiceResponse(
                    new ServiceResponse(ResponseStatus.Failed, "Thiếu conversationId", null, 400),
                    innerRes
                );
                return;
            }

            const result = await this.service.sendMessage(userId, conversationId, message);
            handleServiceResponse(result, innerRes);
        });
    };
}

