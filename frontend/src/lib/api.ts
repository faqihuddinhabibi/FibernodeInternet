const BASE_URL = '/api';

interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    message: string;
    code: string;
    details?: Array<{ path: string; message: string }>;
  };
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const json = await res.json();
    setTokens(json.data.accessToken, json.data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && token) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }

    const success = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (success) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!retryRes.ok) {
        const errorJson = await retryRes.json().catch(() => ({}));
        throw new ApiError(
          retryRes.status,
          errorJson.error?.code || 'ERROR',
          errorJson.error?.message || 'Request failed',
          errorJson.error?.details,
        );
      }

      return retryRes.json();
    } else {
      clearTokens();
      window.location.href = '/login';
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
    }
  }

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      errorJson.error?.code || 'ERROR',
      errorJson.error?.message || 'Request failed',
      errorJson.error?.details,
    );
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: 'POST', body: formData }),
};

export { ApiError, setTokens, clearTokens, getToken };
export type { ApiResponse };
