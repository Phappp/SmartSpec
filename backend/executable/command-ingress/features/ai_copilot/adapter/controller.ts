import { Request, Response } from "express";
import { AICopilotService } from "../domain/service";

export class AICopilotController {
  private service: AICopilotService;

  constructor() {
    this.service = new AICopilotService();
  }

  // Chat Sessions CRUD
  getChatSessions = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.userId || (req as any).user?._id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const chats = await this.service.getChatSessions(projectId, userId);
      res.json({ data: chats });
    } catch (error: any) {
      console.error("Error getting chat sessions:", error);
      res.status(500).json({ error: error.message || "Failed to get chat sessions" });
    }
  };

  createChatSession = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { versionId, title, messages, contextItems } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?._id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const chat = await this.service.createChatSession(
        projectId,
        userId,
        versionId || null,
        title || "New Chat",
        messages || [],
        contextItems || []
      );
      res.status(201).json({ data: chat });
    } catch (error: any) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: error.message || "Failed to create chat session" });
    }
  };

  getChatSession = async (req: Request, res: Response) => {
    try {
      const { projectId, chatId } = req.params;
      const userId = (req as any).user?.userId || (req as any).user?._id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const chat = await this.service.getChatSession(projectId, chatId, userId);
      if (!chat) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json({ data: chat });
    } catch (error: any) {
      console.error("Error getting chat session:", error);
      res.status(500).json({ error: error.message || "Failed to get chat session" });
    }
  };

  updateChatSession = async (req: Request, res: Response) => {
    try {
      const { projectId, chatId } = req.params;
      const { title, messages, contextItems, is_archived, is_pinned } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?._id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const chat = await this.service.updateChatSession(
        projectId,
        chatId,
        userId,
        { title, messages, contextItems, is_archived, is_pinned }
      );
      if (!chat) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json({ data: chat });
    } catch (error: any) {
      console.error("Error updating chat session:", error);
      res.status(500).json({ error: error.message || "Failed to update chat session" });
    }
  };

  deleteChatSession = async (req: Request, res: Response) => {
    try {
      const { projectId, chatId } = req.params;
      const userId = (req as any).user?.userId || (req as any).user?._id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      await this.service.deleteChatSession(projectId, chatId, userId);
      res.json({ message: "Chat session deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting chat session:", error);
      res.status(500).json({ error: error.message || "Failed to delete chat session" });
    }
  };

  chat = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      
      // Debug: Log raw request body
      console.log('Raw request body:', JSON.stringify(req.body, null, 2));
      console.log('Request headers:', req.headers);
      console.log('Content-Type:', req.headers['content-type']);
      
      // Try to get message from different possible locations
      let message = req.body?.message;
      let versionId = req.body?.versionId;
      let context = req.body?.context || [];
      let conversationHistory = req.body?.conversationHistory || [];
      let stream = req.body?.stream || false;

      // Debug log
      console.log('Chat request received:', {
        projectId,
        versionId,
        message: message ? `${message.substring(0, 50)}...` : 'null/undefined',
        messageLength: message?.length || 0,
        messageType: typeof message,
        hasContext: !!context,
        contextLength: context?.length || 0,
        conversationHistoryLength: conversationHistory?.length || 0,
        stream,
        bodyKeys: Object.keys(req.body || {})
      });

      if (!message || typeof message !== 'string' || !message.trim()) {
        console.error('Invalid message:', { 
          message, 
          type: typeof message,
          body: req.body,
          bodyKeys: Object.keys(req.body || {})
        });
        return res.status(400).json({ error: "Message is required" });
      }

      // If streaming is requested, use SSE
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        try {
          await this.service.chatStream(
            projectId,
            versionId || null,
            message,
            context,
            conversationHistory,
            (chunk: string) => {
              if (chunk) {
                res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
              }
            }
          );
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        } catch (error: any) {
          console.error("Streaming error:", error);
          res.write(`data: ${JSON.stringify({ error: error.message || "Internal server error" })}\n\n`);
          res.end();
        }
        return;
      }

      // Non-streaming response
      const result = await this.service.chat(
        projectId,
        versionId || null,
        message,
        context,
        conversationHistory
      );

      res.json(result);
    } catch (error: any) {
      console.error("AI Copilot chat error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  };

  applyAction = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { versionId, action } = req.body;

      if (!action || !action.type || !action.target) {
        return res.status(400).json({ error: "Invalid action" });
      }

      const result = await this.service.applyAction(
        projectId,
        versionId || null,
        action
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("AI Copilot action error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  };

  getProjectSummary = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { versionId } = req.query;

      const summary = await this.service.getProjectSummary(
        projectId,
        (versionId as string) || null
      );

      res.json(summary);
    } catch (error: any) {
      console.error("AI Copilot summary error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  };

  analyzeProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { versionId, ...options } = req.body;

      const analysis = await this.service.analyzeProject(
        projectId,
        versionId || null,
        options
      );

      res.json(analysis);
    } catch (error: any) {
      console.error("AI Copilot analysis error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  };
}
