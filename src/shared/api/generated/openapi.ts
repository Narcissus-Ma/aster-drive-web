// 此文件由 scripts/generate-api-client.mjs 生成，请勿手动修改。

export interface ContentAccessResponse {
  declared_mime: string | null;
  detected_mime: string;
  disposition: "inline" | "attachment";
  etag: string;
  expires_at: string;
  filename: string;
  mime_type: string;
  previewable: boolean;
  resource_id: string;
  size_bytes: number;
  url: string;
}

export interface CopyOperationResponse {
  created_at?: string | null;
  error_code?: string | null;
  id?: string | null;
  kind: ResourceKind;
  last_error?: string | null;
  name: string;
  operation_id?: string | null;
  progress?: number;
  resource?: ResourceResponse | null;
  source_resource_id: string;
  status: CopyOperationStatus;
  target_parent_id: string;
  target_resource_id?: string | null;
  updated_at?: string | null;
}

export type CopyOperationStatus = "pending" | "running" | "succeeded" | "failed" | "canceled" | "cancel_requested";

export interface CopyRequest {
  name?: string | null;
  target_parent_id: string;
  version?: number | null;
}

export interface DocumentContentRequest {
  base_revision?: number | null;
  content: Record<string, unknown>;
  idempotency_key?: string | null;
  revision?: number | null;
}

export interface DocumentContentResponse {
  capabilities?: ResourceCapabilities;
  content: Record<string, unknown>;
  content_hash: string;
  effective_role?: string;
  resource_id: string;
  revision: number;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface ErrorResponse {
  code: string;
  fields?: Record<string, unknown> | null;
  message: string;
  request_id: string;
}

export interface GrantCreateRequest {
  grantee_user_id: string;
  role: "viewer" | "editor";
}

export interface GrantListResponse {
  items: GrantResponse[];
}

export interface GrantResponse {
  created_at: string;
  granted_by: string;
  grantee_user_id: string;
  id: string;
  resource_id: string;
  role: "viewer" | "editor";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MessageResponse {
  status: string;
}

export interface PublicContentResponse {
  declared_mime?: string | null;
  detected_mime: string;
  disposition: "inline" | "attachment";
  etag: string;
  expires_at: string;
  filename: string;
  mime_type: string;
  previewable: boolean;
  resource_id: string;
  size_bytes: number;
  url: string;
}

export interface PublicDocumentResponse {
  content: Record<string, unknown>;
  content_hash: string;
  resource_id: string;
  revision: number;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface PublicResourceResponse {
  created_at: string;
  declared_mime?: string | null;
  detected_mime?: string | null;
  id: string;
  kind: ResourceKind;
  name: string;
  size_bytes?: number | null;
  updated_at: string;
  version: number;
}

export interface PublicShareResponse {
  document?: PublicDocumentResponse | null;
  download?: PublicContentResponse | null;
  kind: ResourceKind;
  preview?: PublicContentResponse | null;
  read_only?: boolean;
  resource: PublicResourceResponse;
  resource_id: string;
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

export interface ResourceVersionRequest {
  version: number;
}

export interface ShareLinkListResponse {
  items: ShareLinkResponse[];
}

export interface ShareLinkResponse {
  created_at: string;
  created_by: string;
  id: string;
  resource_id: string;
  revoked_at?: string | null;
  role: string;
  token?: string | null;
  url?: string | null;
}

export interface SharedRootItemResponse {
  capabilities: ResourceCapabilities;
  effective_role: string;
  grant: GrantResponse;
  resource: ResourceResponse;
}

export interface SharedRootListResponse {
  items: SharedRootItemResponse[];
  next_cursor?: string | null;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type?: string;
}

export interface UploadSessionCompleteRequest {
  detected_mime?: string | null;
  etag?: string | null;
  name?: string | null;
  size_bytes?: number | null;
}

export interface UploadSessionCreateRequest {
  client_upload_id: string;
  declared_mime?: string | null;
  name: string;
  parent_id: string;
  size_bytes?: number | null;
}

export interface UploadSessionResponse {
  client_upload_id: string;
  created_at: string;
  declared_mime?: string | null;
  detected_mime?: string | null;
  expected_etag?: string | null;
  expected_size?: number | null;
  expires_at: string;
  final_object_key?: string | null;
  id: string;
  name: string;
  parent_id: string;
  resource_id?: string | null;
  status: UploadSessionStatus;
  temp_object_key: string;
  updated_at: string;
  upload_url?: string | null;
  upload_url_expires_at: string;
  user_id: string;
}

export type UploadSessionStatus = "pending" | "finalizing" | "completed" | "failed" | "aborted" | "expired";

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
  "/api/v1/content/{resource_id}/download": {
    get: {
      request: undefined;
      response: ContentAccessResponse;
    };
  };
  "/api/v1/content/{resource_id}/preview": {
    get: {
      request: undefined;
      response: ContentAccessResponse;
    };
  };
  "/api/v1/content/{resource_id}/stream": {
    get: {
      request: undefined;
      response: unknown;
    };
  };
  "/api/v1/copies/{operation_id}": {
    get: {
      request: undefined;
      response: CopyOperationResponse;
    };
  };
  "/api/v1/documents/{resource_id}": {
    get: {
      request: undefined;
      response: DocumentContentResponse;
    };
    put: {
      request: DocumentContentRequest;
      response: DocumentContentResponse;
    };
  };
  "/api/v1/public/share/{token}": {
    get: {
      request: undefined;
      response: PublicShareResponse;
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
  "/api/v1/resources/{resource_id}/copy": {
    post: {
      request: CopyRequest;
      response: CopyOperationResponse;
    };
  };
  "/api/v1/resources/{resource_id}/grants": {
    get: {
      request: undefined;
      response: GrantListResponse;
    };
    post: {
      request: GrantCreateRequest;
      response: GrantResponse;
    };
  };
  "/api/v1/resources/{resource_id}/grants/{grantee_user_id}": {
    delete: {
      request: undefined;
      response: MessageResponse;
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
  "/api/v1/resources/{resource_id}/share-links": {
    get: {
      request: undefined;
      response: ShareLinkListResponse;
    };
    post: {
      request: undefined;
      response: ShareLinkResponse;
    };
  };
  "/api/v1/resources/{resource_id}/share-links/{link_id}": {
    delete: {
      request: undefined;
      response: MessageResponse;
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
  "/api/v1/views/shared": {
    get: {
      request: undefined;
      response: SharedRootListResponse;
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

