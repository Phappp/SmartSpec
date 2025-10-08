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
  provider: string;
  is_active: boolean;
  created_by: string;
  createAt: Date;
  updatedAt: Date;
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
    is_active: boolean,
    created_by: string
  ): Promise<APIKeysResponse>;
  getAllAPIKey(): Promise<APIKeysResponse[]>;
  getAPIKeyById(id: string): Promise<APIKeysResponse>;
  updateAPIKey(
    id: string,
    body: { key_value?: string; provider?: string; is_active?: boolean }
  ): Promise<APIKeysResponse>;
  deleteAPIKey(id: string): Promise<string>;
}

export { ApiKeyService, APIKeysResponse };
