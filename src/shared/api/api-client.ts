import type { ErrorResponse, TokenResponse } from './generated/openapi';

export interface ApiRequestInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  retryUnauthorized?: boolean;
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export interface ApiClientErrorOptions {
  status: number;
  code?: string;
  requestId?: string;
  fields?: Record<string, unknown> | null;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly requestId: string | undefined;
  readonly fields: Record<string, unknown> | null | undefined;

  constructor(message: string, options: ApiClientErrorOptions) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.fields = options.fields;
  }
}

const defaultBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

function isRawBody(value: unknown): boolean {
  if (typeof value === 'string' || value instanceof ArrayBuffer) {
    return true;
  }
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return true;
  }
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return true;
  }
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) {
    return true;
  }
  return false;
}

function toErrorPayload(value: unknown): Partial<ErrorResponse> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  return value as Partial<ErrorResponse>;
}

export class ApiClient {
  private readonly baseUrl: string;

  private readonly fetcher: typeof fetch | undefined;

  private accessToken: string | null = null;

  private refreshPromise: Promise<string | null> | null = null;

  private readonly refreshFailureListeners = new Set<() => void>();

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? defaultBaseUrl;
    this.fetcher = options.fetcher;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  onRefreshFailure(listener: () => void): () => void {
    this.refreshFailureListeners.add(listener);
    return () => this.refreshFailureListeners.delete(listener);
  }

  async request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const { retryUnauthorized = true, ...requestInit } = init;
    return this.execute<T>(path, requestInit, retryUnauthorized);
  }

  async refreshSession(): Promise<TokenResponse> {
    return this.execute<TokenResponse>(
      '/api/v1/auth/refresh',
      { auth: false, method: 'POST' },
      false,
    );
  }

  private async execute<T>(
    path: string,
    init: ApiRequestInit,
    retryUnauthorized: boolean,
  ): Promise<T> {
    const response = await this.send(path, init);

    if (response.status === 401 && retryUnauthorized) {
      const refreshedToken = await this.refreshAccessToken();
      if (refreshedToken !== null) {
        return this.execute<T>(path, init, false);
      }
    }

    if (!response.ok) {
      throw await this.createError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  private async send(path: string, init: ApiRequestInit): Promise<Response> {
    const { auth = true, ...requestInitWithoutAuth } = init;
    const headers = new Headers(requestInitWithoutAuth.headers);
    headers.set('Accept', 'application/json');
    if (auth && this.accessToken !== null) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    let body = requestInitWithoutAuth.body;
    if (body !== undefined && !isRawBody(body)) {
      body = JSON.stringify(body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }

    const requestInit: RequestInit = {
      ...requestInitWithoutAuth,
      body: body as BodyInit | null | undefined,
      credentials: init.credentials ?? 'include',
      headers,
    };

    const fetcher = this.fetcher ?? globalThis.fetch;
    if (typeof fetcher !== 'function') {
      throw new Error('当前运行环境未提供 fetch');
    }
    return fetcher(this.buildUrl(path), requestInit);
  }

  private buildUrl(path: string): string {
    if (/^https?:\/\//.test(path) || this.baseUrl === '') {
      return path;
    }
    return new URL(path, `${this.baseUrl.replace(/\/$/, '')}/`).toString();
  }

  private async createError(response: Response): Promise<ApiClientError> {
    let payload: Partial<ErrorResponse> = {};
    try {
      payload = toErrorPayload(await response.json());
    } catch {
      payload = {};
    }

    return new ApiClientError(payload.message ?? `请求失败（${response.status}）`, {
      status: response.status,
      code: payload.code,
      fields: payload.fields,
      requestId:
        payload.request_id ?? response.headers.get('X-Request-ID') ?? undefined,
    });
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise === null) {
      const refreshPromise = this.refreshSession()
        .then((tokenResponse) => {
          this.setAccessToken(tokenResponse.access_token);
          return tokenResponse.access_token;
        })
        .catch(() => {
          this.clearAccessToken();
          for (const listener of this.refreshFailureListeners) {
            listener();
          }
          return null;
        });
      this.refreshPromise = refreshPromise;
    }

    const refreshPromise = this.refreshPromise;
    try {
      return await refreshPromise;
    } finally {
      if (this.refreshPromise === refreshPromise) {
        this.refreshPromise = null;
      }
    }
  }
}

export const apiClient = new ApiClient();
