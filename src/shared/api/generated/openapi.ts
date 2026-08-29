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

export interface ResourceCapabilities {
  can_accept_children?: boolean;
  can_download?: boolean;
  can_edit_content?: boolean;
  can_move?: boolean;
  can_rename?: boolean;
  can_share?: boolean;
  can_trash?: boolean;
}

export interface ResourceCreateRequest {
  declared_mime?: string | null;
  name: string;
  parent_id: string;
}

export type ResourceKind = "root" | "folder" | "document" | "file";

export interface ResourceListResponse {
  items: ResourceResponse[];
  next_cursor?: string | null;
}

export interface ResourceMoveRequest {
  target_parent_id: string;
  version: number;
}

export interface ResourcePatchRequest {
  name?: string | null;
  version: number;
}

export interface ResourceResponse {
  capabilities?: ResourceCapabilities;
  created_at: string;
  created_by: string;
  declared_mime?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  detected_mime?: string | null;
  effective_role?: string;
  id: string;
  kind: ResourceKind;
  name: string;
  name_key: string;
  object_key?: string | null;
  owner_id: string;
  parent_id: string | null;
  purged_at?: string | null;
  size_bytes?: number | null;
  state: ResourceState;
  updated_at: string;
  version: number;
}

export type ResourceState = "active" | "upload_pending" | "copy_pending" | "trash" | "purge" | "purge_pending";

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
  "/api/v1/resources/documents": {
    post: {
      request: ResourceCreateRequest;
      response: ResourceResponse;
    };
  };
  "/api/v1/resources/folders": {
    post: {
      request: ResourceCreateRequest;
      response: ResourceResponse;
    };
  };
  "/api/v1/resources/{parent_id}/children": {
    get: {
      request: undefined;
      response: ResourceListResponse;
    };
  };
  "/api/v1/resources/{resource_id}": {
    get: {
      request: undefined;
      response: ResourceResponse;
    };
    patch: {
      request: ResourcePatchRequest;
      response: ResourceResponse;
    };
  };
  "/api/v1/resources/{resource_id}/move": {
    post: {
      request: ResourceMoveRequest;
      response: ResourceResponse;
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

