import { v4 as uuidv4 } from "uuid";
import { ApiKeyService, APIKeysResponse } from "../types";
import Key from "../../../../../internal/model/api_key";
import Session from "../../../../../internal/model/session";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { generateJwt, generateJwtOTP } from "../../../services/jwtService";
import mailService from "../../../services/sendMail.service";
import mongoose from "mongoose";

export class ApiKeyServiceImpl implements ApiKeyService {
  async searchAPIKeys(content: string): Promise<APIKeysResponse[]> {
    const regex = new RegExp(content, "i");
    const keys = await Key.find({
      $or: [
        {
          key_value: { $regex: regex },
        },
        {
          provider: { $regex: regex },
        },
      ],
    });
    console.log("Keys found:", keys); // Debug log

    return keys.map((key) => ({
      id: key._id?.toString() || key.id, // Ensure we use _id.toString() for consistency
      key_value: key.key_value,
      model_name: key.model_name,
      provider: key.provider,
      is_active: key.is_active,
      created_by: key.created_by?.toString(),
      createAt: key.createdAt,
      updatedAt: key.updatedAt,
      display_name: (key as any).display_name || '',
      description: (key as any).description || '',
      daily_limit: (key as any).daily_limit || null,
      rate_limit: (key as any).rate_limit || null,
      priority: (key as any).priority || 'medium',
      expires_at: (key as any).expires_at || null,
      permissions: (key as any).permissions || {
        text_generation: true,
        code_generation: true,
        analysis: true,
        chat_models: true,
        vision_models: false,
        embedding_models: false,
      },
      usage_count: (key as any).usage_count || 0,
      last_used: (key as any).last_used || null,
    }));
  }
  filterAPIKeys(
    provider?: string,
    is_active?: boolean,
    created_by?: string
  ): Promise<APIKeysResponse[]> {
    throw new Error("Method not implemented.");
  }
  getAPIKeyStatistics(): Promise<any> {
    throw new Error("Method not implemented.");
  }
  async createAPIKey(
    key_value: string,
    provider: string,
    model_name: string,
    is_active: boolean,
    created_by: string
  ): Promise<APIKeysResponse> {
    const keyExists = await Key.findOne({ key_value: key_value });
    if (keyExists) {
      throw new Error("API Key already exists");
    }
    if (
      provider !== "gemini" &&
      provider !== "openai" &&
      provider !== "claude"
    ) {
      throw new Error(
        "Provider must be one of 'gemini', 'openai', or 'claude'"
      );
    }
    const newKey = new Key({
      key_value,
      provider,
      model_name,
      is_active,
      created_by,
    });
    await newKey.save();
    return {
      id: newKey._id?.toString() || newKey.id, // Ensure we use _id.toString() for consistency
      key_value: newKey.key_value,
      model_name: newKey.model_name,
      provider: newKey.provider,
      is_active: newKey.is_active,
      created_by: newKey.created_by?.toString(),
      createAt: newKey.createdAt,
      updatedAt: newKey.updatedAt,
    };
  }
  async getAllAPIKey(): Promise<APIKeysResponse[]> {
    const keys = await Key.find();
    console.log("📋 getAllAPIKey - Found keys:", keys.length);
    if (keys.length > 0) {
      console.log("📋 Sample key IDs:", keys.slice(0, 3).map(k => ({ 
        _id: k._id?.toString(), 
        id: k.id,
        idType: typeof k.id 
      })));
    }
    return keys.map((key) => ({
      id: key._id?.toString() || key.id, // Ensure we use _id.toString() for consistency
      key_value: key.key_value,
      provider: key.provider,
      model_name: key.model_name,
      is_active: key.is_active,
      created_by: key.created_by?.toString(),
      createAt: key.createdAt,
      updatedAt: key.updatedAt,
      display_name: (key as any).display_name || '',
      description: (key as any).description || '',
      daily_limit: (key as any).daily_limit || null,
      rate_limit: (key as any).rate_limit || null,
      priority: (key as any).priority || 'medium',
      expires_at: (key as any).expires_at || null,
      permissions: (key as any).permissions || {
        text_generation: true,
        code_generation: true,
        analysis: true,
        chat_models: true,
        vision_models: false,
        embedding_models: false,
      },
      usage_count: (key as any).usage_count || 0,
      last_used: (key as any).last_used || null,
    }));
  }
  async getAPIKeyById(id: string): Promise<APIKeysResponse> {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid API Key ID format");
    }
    const key = await Key.findById(id);
    if (!key) {
      throw new Error("API Key not found");
    }
    return {
      id: key._id?.toString() || key.id, // Ensure we use _id.toString() for consistency
      key_value: key.key_value,
      provider: key.provider,
      model_name: key.model_name,
      is_active: key.is_active,
      created_by: key.created_by?.toString(),
      createAt: key.createdAt,
      updatedAt: key.updatedAt,
      display_name: (key as any).display_name || '',
      description: (key as any).description || '',
      daily_limit: (key as any).daily_limit || null,
      rate_limit: (key as any).rate_limit || null,
      priority: (key as any).priority || 'medium',
      expires_at: (key as any).expires_at || null,
      permissions: (key as any).permissions || {
        text_generation: true,
        code_generation: true,
        analysis: true,
        chat_models: true,
        vision_models: false,
        embedding_models: false,
      },
      usage_count: (key as any).usage_count || 0,
      last_used: (key as any).last_used || null,
    };
  }
  async updateAPIKey(
    id: string,
    body: {
      key_value?: string;
      provider?: string;
      model_name?: string;
      is_active?: boolean;
      display_name?: string;
      description?: string;
      daily_limit?: number | null;
      rate_limit?: number | null;
      priority?: string;
      expires_at?: string | null;
      permissions?: {
        text_generation?: boolean;
        code_generation?: boolean;
        analysis?: boolean;
        chat_models?: boolean;
        vision_models?: boolean;
        embedding_models?: boolean;
      };
    }
  ): Promise<APIKeysResponse> {
    try {
      console.log("🔍 updateAPIKey called with:", { id, idType: typeof id, body });
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error("❌ Invalid ObjectId format:", id);
        throw new Error(`Invalid API Key ID format: ${id}`);
      }
      
      // Try multiple ways to find the key
      let key = await Key.findById(id);
      if (!key) {
        // Try with ObjectId constructor
        try {
          const objectId = new mongoose.Types.ObjectId(id);
          key = await Key.findById(objectId);
        } catch (e) {
          console.error("❌ Failed to create ObjectId:", e);
        }
      }
      if (!key) {
        // Try finding by _id string match
        key = await Key.findOne({ _id: id });
      }
      if (!key) {
        // List all keys to debug
        const allKeys = await Key.find().limit(10).select('_id');
        console.error("❌ API Key not found. ID searched:", id);
        console.error("📋 All keys in DB (first 10):", allKeys.map(k => k._id?.toString()));
        throw new Error(`API Key not found with ID: ${id}`);
      }
      
      console.log("✅ Found API Key:", { _id: key._id?.toString(), id: (key as any).id });
      
      console.log("🔧 Updating API Key:", { id, body });
      
      if (body.key_value) {
        key.key_value = body.key_value;
      }
      if (
        (body.provider && body.provider === "gemini") ||
        body.provider === "openai" ||
        body.provider === "claude"
      ) {
        key.provider = body.provider;
      }
      if (body.model_name !== undefined) {
        key.model_name = body.model_name;
      }
      if (body.is_active !== undefined) {
        key.is_active = body.is_active;
      }
      if (body.display_name !== undefined) {
        key.display_name = body.display_name;
      }
      if (body.description !== undefined) {
        key.description = body.description;
      }
      if (body.daily_limit !== undefined) {
        key.daily_limit = body.daily_limit;
      }
      if (body.rate_limit !== undefined) {
        key.rate_limit = body.rate_limit;
      }
      if (body.priority && ['low', 'medium', 'high'].includes(body.priority)) {
        key.priority = body.priority as 'low' | 'medium' | 'high';
      }
      if (body.expires_at !== undefined) {
        key.expires_at = body.expires_at ? new Date(body.expires_at) : null;
      }
      if (body.permissions) {
        if (!key.permissions) {
          key.permissions = {
            text_generation: true,
            code_generation: true,
            analysis: true,
            chat_models: true,
            vision_models: false,
            embedding_models: false,
          };
        }
        if (body.permissions.text_generation !== undefined) {
          key.permissions.text_generation = body.permissions.text_generation;
        }
        if (body.permissions.code_generation !== undefined) {
          key.permissions.code_generation = body.permissions.code_generation;
        }
        if (body.permissions.analysis !== undefined) {
          key.permissions.analysis = body.permissions.analysis;
        }
        if (body.permissions.chat_models !== undefined) {
          key.permissions.chat_models = body.permissions.chat_models;
        }
        if (body.permissions.vision_models !== undefined) {
          key.permissions.vision_models = body.permissions.vision_models;
        }
        if (body.permissions.embedding_models !== undefined) {
          key.permissions.embedding_models = body.permissions.embedding_models;
        }
      }
      
      console.log("💾 Saving API Key...");
      await key.save();
      console.log("✅ API Key saved successfully");

      return await this.getAPIKeyById(id);
    } catch (error) {
      console.error("❌ Error in updateAPIKey service:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to update API Key: ${error.message}`);
      }
      throw error;
    }
  }
  async deleteAPIKey(id: string): Promise<string> {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid API Key ID format");
    }
    const key = await Key.findById(id);
    if (!key) {
      throw new Error("API Key not found");
    }
    await Key.findByIdAndDelete(id);
    return "API Key deleted successfully";
  }
}
