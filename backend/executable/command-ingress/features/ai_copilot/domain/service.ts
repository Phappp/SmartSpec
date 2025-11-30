import { ApiKeyService } from "../../orchestrator/domain/ApiKeyService";
import { UsecaseService } from "../../usecase/domain/service";
import { TestcaseService } from "../../testcase/domain/service";
import { DatabaseCoreService } from "../../database/domain/DatabaseCoreService";
import { ProjectService } from "../../project/domain/service";
import Version from "../../../../../internal/model/version";
import Testcase from "../../../../../internal/model/testcase";
import Database from "../../../../../internal/model/database";
import AICopilotChat from "../../../../../internal/model/ai_copilot_chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIAction {
  type: "create" | "update" | "delete";
  target: string; // usecase, testcase, table, column, etc.
  targetId?: string;
  data: any;
}

interface ProjectContext {
  usecases: any[];
  testcases: any[];
  database: any;
  requirements: any[];
}

export class AICopilotService {
  private apiKeyService = new ApiKeyService();
  private usecaseService = new UsecaseService();
  private testcaseService = new TestcaseService();
  private databaseService = new DatabaseCoreService();

  /**
   * Chat with AI Copilot
   */
  async chat(
    projectId: string,
    versionId: string | null,
    message: string,
    context: any[] = [],
    conversationHistory: ChatMessage[] = []
  ): Promise<{ content: string; actions?: AIAction[] }> {
    // Load project data
    const projectData = await this.loadProjectData(projectId, versionId);

    // Build context prompt
    const contextPrompt = this.buildContextPrompt(projectData, context);

    // Build conversation prompt
    const conversationPrompt = this.buildConversationPrompt(
      message,
      contextPrompt,
      conversationHistory
    );

    // Call Gemini
    const response = await this.callGemini(conversationPrompt);

    // Parse response for actions
    const actions = this.parseActions(response);

    return {
      content: response,
      actions: actions.length > 0 ? actions : undefined,
    };
  }

  /**
   * Chat with AI Copilot (Streaming)
   */
  async chatStream(
    projectId: string,
    versionId: string | null,
    message: string,
    context: any[] = [],
    conversationHistory: ChatMessage[] = [],
    onChunk: (chunk: string) => void
  ): Promise<void> {
    // Load project data
    const projectData = await this.loadProjectData(projectId, versionId);

    // Build context prompt
    const contextPrompt = this.buildContextPrompt(projectData, context);

    // Build conversation prompt
    const conversationPrompt = this.buildConversationPrompt(
      message,
      contextPrompt,
      conversationHistory
    );

    // Call Gemini with streaming
    await this.callGeminiStream(conversationPrompt, onChunk);
  }

  /**
   * Apply AI action
   */
  async applyAction(
    projectId: string,
    versionId: string | null,
    action: AIAction
  ): Promise<any> {
    switch (action.type) {
      case "create":
        return this.createItem(projectId, versionId, action);
      case "update":
        return this.updateItem(projectId, versionId, action);
      case "delete":
        return this.deleteItem(projectId, versionId, action);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Analyze project for inconsistencies
   */
  async analyzeProject(
    projectId: string,
    versionId: string | null,
    options: { includeSuggestions?: boolean } = {}
  ): Promise<any> {
    const projectData = await this.loadProjectData(projectId, versionId);

    const analysisPrompt = this.buildAnalysisPrompt(projectData, options);

    const response = await this.callGemini(analysisPrompt);

    try {
      return JSON.parse(this.cleanJsonResponse(response));
    } catch {
      return { analysis: response, issues: [] };
    }
  }

  /**
   * Get project data summary
   */
  async getProjectSummary(
    projectId: string,
    versionId: string | null
  ): Promise<any> {
    const projectData = await this.loadProjectData(projectId, versionId);

    return {
      usecases: {
        count: projectData.usecases.length,
        items: projectData.usecases.map((uc: any) => ({
          id: uc._id || uc.id,
          name: uc.name,
          goal: uc.goal,
        })),
      },
      testcases: {
        count: projectData.testcases.length,
        items: projectData.testcases.map((tc: any) => ({
          id: tc._id || tc.id,
          title: tc.title,
          test_type: tc.test_type,
        })),
      },
      database: {
        tables: projectData.database?.tables?.length || 0,
        tables_list: projectData.database?.tables?.map((t: any) => t.name) || [],
      },
      requirements: {
        count: projectData.requirements.length,
      },
    };
  }

  // Private methods

  private async loadProjectData(
    projectId: string,
    versionId: string | null
  ): Promise<ProjectContext> {
    const data: ProjectContext = {
      usecases: [],
      testcases: [],
      database: null,
      requirements: [],
    };

    try {
      // Load use cases from version
      if (versionId) {
        const version = await Version.findById(versionId).lean();
        if (version && version.requirement_model) {
          data.usecases = version.requirement_model || [];
          data.requirements = version.requirement_model || [];
        }
      }

      // Load test cases
      const testcasesQuery: any = { project_id: projectId };
      if (versionId) {
        testcasesQuery.version_id = versionId;
      }
      data.testcases = await Testcase.find(testcasesQuery).lean();

      // Load database
      if (versionId) {
        const database = await Database.findOne({
          project_id: projectId,
          version_id: versionId
        }).lean();
        if (database) {
          data.database = database;
        }
      }
    } catch (error) {
      console.error("Error loading project data:", error);
    }

    return data;
  }

  private buildContextPrompt(
    projectData: ProjectContext,
    context: any[]
  ): string {
    let prompt = "## Project Context\n\n";

    if (context.length > 0) {
      prompt += "### Selected Items:\n";
      context.forEach((ctx) => {
        prompt += `- ${ctx.type}: ${ctx.name} (ID: ${ctx.id})\n`;
      });
      prompt += "\n";
    }

    prompt += `### Project Overview:\n`;
    prompt += `- Use Cases: ${projectData.usecases.length}\n`;
    prompt += `- Test Cases: ${projectData.testcases.length}\n`;
    prompt += `- Database Tables: ${projectData.database?.tables?.length || 0}\n`;
    prompt += `- Requirements: ${projectData.requirements.length}\n\n`;

    if (projectData.usecases.length > 0) {
      prompt += `### Use Cases (sample):\n${JSON.stringify(
        projectData.usecases.slice(0, 5),
        null,
        2
      )}\n\n`;
    }

    if (projectData.database?.tables) {
      prompt += `### Database Schema:\n${JSON.stringify(
        projectData.database.tables.slice(0, 3),
        null,
        2
      )}\n\n`;
    }

    return prompt;
  }

  private buildConversationPrompt(
    message: string,
    contextPrompt: string,
    history: ChatMessage[]
  ): string {
    let prompt = `You are an AI Copilot assistant for a software requirements management system.
Your role is to help users manage their project data including:
- Use Cases
- Test Cases
- Database Schema
- Requirements

${contextPrompt}

## Instructions:
1. Understand the user's request
2. If the request involves creating, updating, or deleting data, provide an action in JSON format
3. Be helpful, concise, and accurate
4. When suggesting changes, explain why

## Available Actions:
- CREATE: Create new use case, test case, table, etc.
- UPDATE: Update existing item
- DELETE: Delete item

## Action Format:
If you need to perform an action, include it in your response as:
\`\`\`json
{
  "type": "create|update|delete",
  "target": "usecase|testcase|table|column",
  "targetId": "optional-id-for-update-delete",
  "data": { ... }
}
\`\`\`

## Conversation History:
${history
  .map((msg) => `${msg.role}: ${msg.content}`)
  .join("\n")}

## User Message:
${message}

## Your Response:`;

    return prompt;
  }

  private buildAnalysisPrompt(
    projectData: ProjectContext,
    options: any
  ): string {
    return `Analyze the following project data for inconsistencies, errors, and improvement opportunities.

Project Data:
${JSON.stringify(projectData, null, 2)}

Provide analysis in JSON format:
{
  "issues": [
    {
      "type": "error|warning|suggestion",
      "severity": "high|medium|low",
      "description": "...",
      "location": "...",
      "suggestion": "..."
    }
  ],
  "summary": "...",
  "recommendations": [...]
}`;
  }

  private parseActions(response: string): AIAction[] {
    const actions: AIAction[] = [];

    // Try to extract JSON action blocks
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
    let match;

    while ((match = jsonBlockRegex.exec(response)) !== null) {
      try {
        const action = JSON.parse(match[1]);
        if (action.type && action.target) {
          actions.push(action);
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    }

    return actions;
  }

  private async createItem(
    projectId: string,
    versionId: string | null,
    action: AIAction
  ): Promise<any> {
    // TODO: Implement based on target type
    switch (action.target) {
      case "usecase":
        // return await this.usecaseService.createUsecase(versionId, action.data);
        break;
      case "testcase":
        // return await this.testcaseService.createTestCase(projectId, versionId, action.data);
        break;
      default:
        throw new Error(`Cannot create ${action.target}`);
    }
  }

  private async updateItem(
    projectId: string,
    versionId: string | null,
    action: AIAction
  ): Promise<any> {
    if (!action.targetId) {
      throw new Error("targetId required for update");
    }

    // TODO: Implement based on target type
    switch (action.target) {
      case "usecase":
        // return await this.usecaseService.updateUsecase(versionId, action.targetId, action.data);
        break;
      case "testcase":
        // return await this.testcaseService.updateTestCase(action.targetId, action.data);
        break;
      default:
        throw new Error(`Cannot update ${action.target}`);
    }
  }

  private async deleteItem(
    projectId: string,
    versionId: string | null,
    action: AIAction
  ): Promise<any> {
    if (!action.targetId) {
      throw new Error("targetId required for delete");
    }

    // TODO: Implement based on target type
    switch (action.target) {
      case "usecase":
        // return await this.usecaseService.deleteUsecase(versionId, action.targetId);
        break;
      case "testcase":
        // return await this.testcaseService.deleteTestCase(action.targetId);
        break;
      default:
        throw new Error(`Cannot delete ${action.target}`);
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    const keys = await this.apiKeyService.getAllActiveKeys("gemini");
    if (!keys || keys.length === 0) {
      throw new Error("No active Gemini API key found");
    }

    let lastError: any;

    for (const key of keys) {
      try {
        console.log(
          `🔑 Trying Gemini key for AI Copilot: ${key.key_value.slice(0, 12)}...`
        );
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const client = new GoogleGenerativeAI(key.key_value);
        const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

        const response = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const text = response?.response?.text() || "";
        return this.cleanJsonResponse(text);
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Gemini key failed:`, error.message);

        const message = error.message.toLowerCase();
        if (message.includes("invalid") || message.includes("unauthorized")) {
          try {
            await this.apiKeyService.disableKey(key._id);
            console.warn(`⚠️ Disabled invalid key: ${key._id}`);
          } catch {
            // Ignore disable errors
          }
        }
      }
    }

    throw lastError || new Error("All Gemini API keys failed");
  }

  private async callGeminiStream(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const keys = await this.apiKeyService.getAllActiveKeys("gemini");
    if (!keys || keys.length === 0) {
      throw new Error("No active Gemini API key found");
    }

    let lastError: any;

    for (const key of keys) {
      try {
        console.log(
          `🔑 Trying Gemini key for AI Copilot (streaming): ${key.key_value.slice(0, 12)}...`
        );
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const client = new GoogleGenerativeAI(key.key_value);
        const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

        const result = await model.generateContentStream({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            onChunk(chunkText);
          }
        }

        return; // Success
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Gemini key failed (streaming):`, error.message);

        const message = error.message.toLowerCase();
        if (message.includes("invalid") || message.includes("unauthorized")) {
          try {
            await this.apiKeyService.disableKey(key._id);
            console.warn(`⚠️ Disabled invalid key: ${key._id}`);
          } catch {
            // Ignore disable errors
          }
        }
      }
    }

    throw lastError || new Error("All Gemini API keys failed");
  }

  private cleanJsonResponse(text: string): string {
    if (!text) return "";

    // Remove markdown code blocks
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Try to extract JSON if wrapped in text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return text.trim();
  }

  // Chat Sessions CRUD
  async getChatSessions(projectId: string, userId: string) {
    try {
      const chats = await AICopilotChat.find({
        project_id: projectId,
        user_id: userId,
        is_archived: false,
      })
        .sort({ updated_at: -1 })
        .lean();
      return chats;
    } catch (error: any) {
      console.error("Error getting chat sessions:", error);
      throw new Error("Failed to get chat sessions");
    }
  }

  async createChatSession(
    projectId: string,
    userId: string,
    versionId: string | null,
    title: string,
    messages: any[],
    contextItems: any[]
  ) {
    try {
      const chat = new AICopilotChat({
        project_id: projectId,
        user_id: userId,
        version_id: versionId,
        title,
        messages,
        context_items: contextItems,
      });
      await chat.save();
      return chat.toObject();
    } catch (error: any) {
      console.error("Error creating chat session:", error);
      throw new Error("Failed to create chat session");
    }
  }

  async getChatSession(projectId: string, chatId: string, userId: string) {
    try {
      const chat = await AICopilotChat.findOne({
        _id: chatId,
        project_id: projectId,
        user_id: userId,
      }).lean();
      return chat;
    } catch (error: any) {
      console.error("Error getting chat session:", error);
      throw new Error("Failed to get chat session");
    }
  }

  async updateChatSession(
    projectId: string,
    chatId: string,
    userId: string,
    updates: {
      title?: string;
      messages?: any[];
      contextItems?: any[];
      is_archived?: boolean;
      is_pinned?: boolean;
    }
  ) {
    try {
      const chat = await AICopilotChat.findOneAndUpdate(
        {
          _id: chatId,
          project_id: projectId,
          user_id: userId,
        },
        {
          $set: {
            ...(updates.title && { title: updates.title }),
            ...(updates.messages && { messages: updates.messages }),
            ...(updates.contextItems && { context_items: updates.contextItems }),
            ...(updates.is_archived !== undefined && { is_archived: updates.is_archived }),
            ...(updates.is_pinned !== undefined && { is_pinned: updates.is_pinned }),
            updated_at: new Date(),
          },
        },
        { new: true }
      ).lean();
      return chat;
    } catch (error: any) {
      console.error("Error updating chat session:", error);
      throw new Error("Failed to update chat session");
    }
  }

  async deleteChatSession(projectId: string, chatId: string, userId: string) {
    try {
      await AICopilotChat.findOneAndDelete({
        _id: chatId,
        project_id: projectId,
        user_id: userId,
      });
    } catch (error: any) {
      console.error("Error deleting chat session:", error);
      throw new Error("Failed to delete chat session");
    }
  }
}
