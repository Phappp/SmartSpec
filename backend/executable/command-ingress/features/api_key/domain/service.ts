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
  createAPIKey(
    key_value: string,
    provider: string,
    is_active: boolean,
    created_by: string
  ): Promise<APIKeysResponse> {
    throw new Error("Method not implemented.");
  }
  async getAllAPIKey(): Promise<APIKeysResponse[]> {
    const keys = await Key.find();
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
  getAPIKeyById(id: string): Promise<APIKeysResponse> {
    throw new Error("Method not implemented.");
  }
  updateAPIKey(
    id: string,
    key_value?: string,
    provider?: string,
    is_active?: boolean
  ): Promise<APIKeysResponse> {
    throw new Error("Method not implemented.");
  }
  deleteAPIKey(id: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
