import type {
  LoginRequest,
  MessageResponse,
  TokenResponse,
  UserResponse,
} from '../../../shared/api/generated/openapi';
import { apiClient } from '../../../shared/api/api-client';

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  return apiClient.request<TokenResponse>('/api/v1/auth/login', {
    body: payload,
    method: 'POST',
    retryUnauthorized: false,
  });
}

export async function refresh(): Promise<TokenResponse> {
  return apiClient.refreshSession();
}

export async function me(): Promise<UserResponse> {
  return apiClient.request<UserResponse>('/api/v1/users/me');
}

export async function logout(): Promise<MessageResponse> {
  return apiClient.request<MessageResponse>('/api/v1/auth/logout', {
    method: 'POST',
    retryUnauthorized: false,
  });
}

export const authApi = { login, logout, me, refresh };
