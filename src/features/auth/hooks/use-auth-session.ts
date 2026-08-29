import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type { LoginRequest, UserResponse } from '../../../shared/api/generated/openapi';
import { ApiClientError, apiClient } from '../../../shared/api/api-client';
import { authApi } from '../api/auth-api';

export type AuthSessionStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthSessionContextValue {
  error: ApiClientError | null;
  login: (payload: LoginRequest) => Promise<UserResponse>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  status: AuthSessionStatus;
  user: UserResponse | null;
}

export interface AuthSessionProviderProps extends PropsWithChildren {
  restoreOnMount?: boolean;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  return new ApiClientError('请求失败，请稍后重试', { status: 0 });
}

export function AuthSessionProvider({
  children,
  restoreOnMount = true,
}: AuthSessionProviderProps): JSX.Element {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthSessionStatus>(
    restoreOnMount ? 'checking' : 'anonymous',
  );
  const [user, setUser] = useState<UserResponse | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const restorePromiseRef = useRef<Promise<void> | null>(null);
  const sessionOperationRef = useRef(0);

  const clearSession = useCallback(() => {
    sessionOperationRef.current += 1;
    apiClient.clearAccessToken();
    setUser(null);
    setStatus('anonymous');
    setError(null);
    queryClient.clear();
  }, [queryClient]);

  const restore = useCallback(async (): Promise<void> => {
    if (restorePromiseRef.current !== null) {
      return restorePromiseRef.current;
    }

    const operationId = sessionOperationRef.current + 1;
    sessionOperationRef.current = operationId;
    const restorePromise = (async () => {
      setStatus('checking');
      setError(null);
      try {
        const tokenResponse = await authApi.refresh();
        if (sessionOperationRef.current !== operationId) {
          return;
        }
        apiClient.setAccessToken(tokenResponse.access_token);
        const currentUser = await authApi.me();
        if (sessionOperationRef.current !== operationId) {
          return;
        }
        setUser(currentUser);
        setStatus('authenticated');
      } catch {
        if (sessionOperationRef.current === operationId) {
          clearSession();
        }
      }
    })().finally(() => {
      restorePromiseRef.current = null;
    });

    restorePromiseRef.current = restorePromise;
    return restorePromise;
  }, [clearSession]);

  useEffect(() => {
    return apiClient.onRefreshFailure(clearSession);
  }, [clearSession]);

  useEffect(() => {
    if (restoreOnMount) {
      void restore();
    }
  }, [restore, restoreOnMount]);

  const login = useCallback(async (payload: LoginRequest): Promise<UserResponse> => {
    const operationId = sessionOperationRef.current + 1;
    sessionOperationRef.current = operationId;
    setStatus('checking');
    setError(null);
    try {
      const tokenResponse = await authApi.login(payload);
      if (sessionOperationRef.current !== operationId) {
        throw new ApiClientError('登录操作已过期', { status: 0 });
      }
      apiClient.setAccessToken(tokenResponse.access_token);
      const currentUser = await authApi.me();
      if (sessionOperationRef.current !== operationId) {
        throw new ApiClientError('登录操作已过期', { status: 0 });
      }
      setUser(currentUser);
      setStatus('authenticated');
      return currentUser;
    } catch (loginError) {
      const normalizedError = toApiClientError(loginError);
      if (sessionOperationRef.current !== operationId) {
        throw normalizedError;
      }
      apiClient.clearAccessToken();
      setUser(null);
      setStatus('anonymous');
      setError(normalizedError);
      throw normalizedError;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    sessionOperationRef.current += 1;
    try {
      await authApi.logout();
    } catch {
      // 无论服务端响应如何，本地会话都必须清理，避免继续使用旧凭证。
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({ error, login, logout, restore, status, user }),
    [error, login, logout, restore, status, user],
  );

  return createElement(AuthSessionContext.Provider, { value }, children);
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (context === null) {
    throw new Error('useAuthSession 必须在 AuthSessionProvider 内使用');
  }
  return context;
}
