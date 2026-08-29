// 此文件由 scripts/generate-api-client.mjs 生成，请勿手动修改。

export interface ErrorResponse {
  code: string;
  fields?: Record<string, unknown> | null;
  message: string;
  request_id: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MessageResponse {
  status: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type?: string;
}

export interface UserResponse {
  display_name: string;
  email: string;
  id: string;
  status: string;
}

export interface ApiPathMap {
  "/api/v1/auth/login": {
    post: {
      request: LoginRequest;
      response: TokenResponse;
    };
  };
  "/api/v1/auth/logout": {
    post: {
      request: undefined;
      response: MessageResponse;
    };
  };
  "/api/v1/auth/refresh": {
    post: {
      request: undefined;
      response: TokenResponse;
    };
  };
  "/api/v1/users/me": {
    get: {
      request: undefined;
      response: UserResponse;
    };
  };
  "/health/live": {
    get: {
      request: undefined;
      response: Record<string, string>;
    };
  };
  "/health/ready": {
    get: {
      request: undefined;
      response: Record<string, string>;
    };
  };
}

