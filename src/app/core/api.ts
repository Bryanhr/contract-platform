import { environment } from '../../environments/environment';
import { toApiError } from './mappers/api-error.mapper';
import { clearUnreachable, reportUnreachable } from './outage';
import { clearSession, token } from './session';

export const BASE_URL = environment.apiUrl;

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>('PUT', path, body);
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },

  delete(path: string): Promise<void> {
    return request('DELETE', path);
  },

  form<T>(path: string, body: FormData): Promise<T> {
    return request<T>('POST', path, body, 'form');
  },

  blob(path: string): Promise<Blob> {
    return request<Blob>('GET', path, undefined, 'blob');
  },
};

function headers(path: string, body: unknown, kind: 'json' | 'blob' | 'form') {
  const result: Record<string, string> = {};
  if (kind === 'json' && body !== undefined) result['Content-Type'] = 'application/json';
  const session = path === '/auth/login' ? undefined : token();
  if (session) result['Authorization'] = `Bearer ${session}`;
  return Object.keys(result).length ? result : undefined;
}

async function request<T>(method: string, path: string, body?: unknown, kind: 'json' | 'blob' | 'form' = 'json'): Promise<T> {
  const requestHeaders = headers(path, body, kind);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      body: kind === 'form' ? (body as FormData) : body === undefined ? undefined : JSON.stringify(body),
      ...(requestHeaders ? { headers: requestHeaders } : {}),
    });
  } catch (error) {
    if (error instanceof TypeError) reportUnreachable();
    throw error;
  }

  clearUnreachable();

  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (kind === 'blob') {
    return response.blob() as Promise<T>;
  }

  return response.json() as Promise<T>;
}
