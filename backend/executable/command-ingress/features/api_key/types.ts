type ExchangeTokenResult = {
  sub: string;
  refreshToken: string;
  accessToken: string;
};

type ExchangeTokenRequest = {
  code: string;
  idp: string;
};

interface APIKeysResponse {
  id: string;
  key_value: string;
  model_name: string;
  provider: string;
  is_active: boolean;
  created_by: string;
  createAt: Date;
  updatedAt: Date;
  display_name?: string;
  description?: string;
  daily_limit?: number | null;
  rate_limit?: number | null;
  priority?: string;
  expires_at?: Date | null;
  permissions?: {
    text_generation?: boolean;
    code_generation?: boolean;
    analysis?: boolean;
    chat_models?: boolean;
    vision_models?: boolean;
    embedding_models?: boolean;
  };
  usage_count?: number;
  last_used?: Date | null;
}

interface ApiKeyService {
  searchAPIKeys(content: string): Promise<APIKeysResponse[]>;
  filterAPIKeys(
    provider?: string,
    is_active?: boolean,
    created_by?: string
  ): Promise<APIKeysResponse[]>;
  getAPIKeyStatistics(): Promise<any>;
  createAPIKey(
    key_value: string,
    provider: string,
    model_name: string,
    is_active: boolean,
    created_by: string
  ): Promise<APIKeysResponse>;
  getAllAPIKey(): Promise<APIKeysResponse[]>;
  getAPIKeyById(id: string): Promise<APIKeysResponse>;
  updateAPIKey(
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
  ): Promise<APIKeysResponse>;
  deleteAPIKey(id: string): Promise<string>;
}

export { ApiKeyService, APIKeysResponse };
