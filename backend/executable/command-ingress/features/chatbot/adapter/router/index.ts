import { Router, Request, Response, NextFunction } from "express";
import { requireAuthorizedUser } from "../../../../middlewares/auth";
import { ChatbotController } from "../controller";

export default function initChatbotRoute(controller: ChatbotController) {
    const router = Router();

    router.use(requireAuthorizedUser);

    router.get(
        "/projects",
        (req: Request, res: Response, next: NextFunction) =>
            controller.getProjects(req as any, res, next)
    );

    router.get(
        "/projects/:projectId/knowledge-base",
        (req: Request, res: Response, next: NextFunction) =>
            controller.getProjectKnowledgeBase(req as any, res, next)
    );

    router.get(
        "/conversations",
        (req: Request, res: Response, next: NextFunction) =>
            controller.getConversations(req as any, res, next)
    );

    router.get(
        "/conversations/:conversationId/messages",
        (req: Request, res: Response, next: NextFunction) =>
            controller.getConversationMessages(req as any, res, next)
    );

    router.post(
        "/conversations",
        (req: Request, res: Response, next: NextFunction) =>
            controller.createConversation(req as any, res, next)
    );

    router.delete(
        "/conversations/:conversationId",
        (req: Request, res: Response, next: NextFunction) =>
            controller.deleteConversation(req as any, res, next)
    );

    router.post(
        "/conversations/:conversationId/contexts",
        (req: Request, res: Response, next: NextFunction) =>
            controller.addContext(req as any, res, next)
    );

    router.get(
        "/conversations/:conversationId/operations",
        (req: Request, res: Response, next: NextFunction) =>
            controller.getPendingOperations(req as any, res, next)
    );

    router.post(
        "/operations/:operationId/undo",
        (req: Request, res: Response, next: NextFunction) =>
            controller.undoOperation(req as any, res, next)
    );

    router.post(
        "/operations/:operationId/keep",
        (req: Request, res: Response, next: NextFunction) =>
            controller.keepOperation(req as any, res, next)
    );

    router.delete(
        "/conversations/:conversationId/contexts/:contextId",
        (req: Request, res: Response, next: NextFunction) =>
            controller.removeContext(req as any, res, next)
    );

    router.delete(
        "/conversations/:conversationId/contexts",
        (req: Request, res: Response, next: NextFunction) =>
            controller.clearContexts(req as any, res, next)
    );

    router.post(
        "/conversations/:conversationId/messages",
        (req: Request, res: Response, next: NextFunction) =>
            controller.sendMessage(req as any, res, next)
    );

    return router;
}

