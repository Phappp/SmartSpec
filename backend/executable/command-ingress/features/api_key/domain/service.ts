import { v4 as uuidv4 } from "uuid";
import { ApiKeyService, APIKeysResponse } from "../types";
import Key from "../../../../../internal/model/api_key";
import Session from "../../../../../internal/model/session";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { generateJwt, generateJwtOTP } from "../../../services/jwtService";
import mailService from "../../../services/sendMail.service";

export class ApiKeyServiceImpl implements ApiKeyService {
  searchAPIKeys(content: string): Promise<APIKeysResponse[]> {
    throw new Error("Method not implemented.");
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
      is_active,
      created_by,
    });
    await newKey.save();
    return {
      id: newKey.id,
      key_value: newKey.key_value,
      provider: newKey.provider,
      is_active: newKey.is_active,
      created_by: newKey.created_by?.toString(),
      createAt: newKey.createdAt,
      updatedAt: newKey.updatedAt,
    };
  }
  async getAllAPIKey(): Promise<APIKeysResponse[]> {
    const keys = await Key.find();
    console.log("Keys in service:", keys); // Debug log
    return keys.map((key) => ({
      id: key.id,
      key_value: key.key_value,
      provider: key.provider,
      is_active: key.is_active,
      created_by: key.created_by?.toString(),
      createAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
  }
  async getAPIKeyById(id: string): Promise<APIKeysResponse> {
    const key = await Key.findOne({ _id: id });
    if (!key) {
      throw new Error("API Key not found");
    }
    return {
      id: key.id,
      key_value: key.key_value,
      provider: key.provider,
      is_active: key.is_active,
      created_by: key.created_by?.toString(),
      createAt: key.createdAt,
      updatedAt: key.updatedAt,
    };
  }
  async updateAPIKey(
    id: string,
    body: { key_value?: string; provider?: string; is_active?: boolean }
  ): Promise<APIKeysResponse> {
    const key = await Key.findOne({ _id: id });
    if (!key) {
      throw new Error("API Key not found");
    }
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
    if (body.is_active !== undefined) {
      key.is_active = body.is_active;
    }
    await key.save();

    return await this.getAPIKeyById(id);
  }
  async deleteAPIKey(id: string): Promise<string> {
    const key = await Key.findOne({ _id: id });
    if (!key) {
      throw new Error("API Key not found");
    }
    await Key.deleteOne({ _id: id });
    return "API Key deleted successfully";
  }
}
