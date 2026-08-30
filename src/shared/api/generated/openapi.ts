// 此文件由 scripts/generate-api-client.mjs 生成，请勿手动修改。

export interface ErrorResponse {
  code: string;
  message: string;
  request_id: string;
  fields?: Record<string, unknown> | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MessageResponse {
  status: string;
}

export interface ResourceCapabilities {
  can_edit_content?: boolean;
  can_rename?: boolean;
  can_move?: boolean;
  can_trash?: boolean;
  can_share?: boolean;
  can_download?: boolean;
  can_accept_children?: boolean;
}

export interface ResourceCreateRequest {
  parent_id: string;
  name: string;
  declared_mime?: string | null;
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
  version: number;
  name?: string | null;
}

export interface ResourceResponse {
  id: string;
  owner_id: string;
  created_by: string;
  parent_id: string | null;
  kind: ResourceKind;
  state: ResourceState;
  name: string;
  name_key: string;
  declared_mime?: string | null;
  detected_mime?: string | null;
  size_bytes?: number | null;
  object_key?: string | null;
  version: number;
  deleted_by?: string | null;
  deleted_at?: string | null;
  purged_at?: string | null;
  created_at: string;
  updated_at: string;
  effective_role?: string;
  capabilities?: ResourceCapabilities;
}

export type ResourceState = "active" | "upload_pending" | "copy_pending" | "trash" | "purge" | "purge_pending";

export interface ResourceVersionRequest {
  version: number;
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in: number;
}

export interface UploadSessionCompleteRequest {
  etag?: string | null;
  size_bytes?: number | null;
  detected_mime?: string | null;
  name?: string | null;
}

export interface UploadSessionCreateRequest {
  parent_id: string;
  client_upload_id: string;
  name: string;
  size_bytes?: number | null;
  declared_mime?: string | null;
}

export interface UploadSessionResponse {
  id: string;
  user_id: string;
  parent_id: string;
  resource_id?: string | null;
  client_upload_id: string;
  name: string;
  declared_mime?: string | null;
  detected_mime?: string | null;
  expected_size?: number | null;
  expected_etag?: string | null;
  temp_object_key: string;
  final_object_key?: string | null;
  status: UploadSessionStatus;
  upload_url?: string | null;
  upload_url_expires_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export type UploadSessionStatus = "pending" | "finalizing" | "completed" | "failed" | "aborted" | "expired";

export interface UserResponse {
  id: string;
  email: string;
  display_name: string;
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
  "/api/v1/resources/trash": {
    get: {
      request: undefined;
      response: ResourceListResponse;
    };
  };
  "/api/v1/resources/{parent_id}/children": {
    get: {
      request: undefined;
      response: ResourceListResponse;
    };
  };
  "/api/v1/resources/{resource_id}": {
    delete: {
      request: ResourceVersionRequest;
      response: ResourceResponse;
    };
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
  "/api/v1/resources/{resource_id}/purge": {
    delete: {
      request: ResourceVersionRequest;
      response: ResourceResponse;
    };
  };
  "/api/v1/resources/{resource_id}/restore": {
    post: {
      request: ResourceVersionRequest;
      response: ResourceResponse;
    };
  };
  "/api/v1/search": {
    get: {
      request: undefined;
      response: ResourceListResponse;
    };
  };
  "/api/v1/uploads/sessions": {
    post: {
      request: UploadSessionCreateRequest;
      response: UploadSessionResponse;
    };
  };
  "/api/v1/uploads/sessions/{session_id}": {
    get: {
      request: undefined;
      response: UploadSessionResponse;
    };
  };
  "/api/v1/uploads/sessions/{session_id}/abort": {
    post: {
      request: undefined;
      response: UploadSessionResponse;
    };
  };
  "/api/v1/uploads/sessions/{session_id}/complete": {
    post: {
      request: UploadSessionCompleteRequest;
      response: UploadSessionResponse;
    };
  };
  "/api/v1/uploads/sessions/{session_id}/renew": {
    post: {
      request: undefined;
      response: UploadSessionResponse;
    };
  };
  "/api/v1/users/me": {
    get: {
      request: undefined;
      response: UserResponse;
    };
  };
  "/api/v1/views/favorites": {
    get: {
      request: undefined;
      response: ResourceListResponse;
    };
  };
  "/api/v1/views/favorites/{resource_id}": {
    delete: {
      request: undefined;
      response: MessageResponse;
    };
    put: {
      request: undefined;
      response: MessageResponse;
    };
  };
  "/api/v1/views/recent": {
    get: {
      request: undefined;
      response: ResourceListResponse;
    };
  };
  "/api/v1/views/recent/{resource_id}": {
    post: {
      request: undefined;
      response: ResourceResponse;
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

