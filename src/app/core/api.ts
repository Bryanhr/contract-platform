import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { toApiError } from './mappers/api-error.mapper';
import { clearUnreachable, reportUnreachable } from './outage';
import { clearSession, token } from './session';

export const BASE_URL = environment.apiUrl;

let http: HttpClient | undefined;

export function initApi(client = inject(HttpClient)) {
  http = client;
}

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
    return request<void>('DELETE', path);
  },

  form<T>(path: string, body: FormData): Promise<T> {
    return request<T>('POST', path, body, 'form');
  },

  blob(path: string): Promise<Blob> {
    return request<Blob>('GET', path, undefined, 'blob');
  },
};

function headers(path: string, body: unknown, kind: 'json' | 'blob' | 'form') {
  let result = new HttpHeaders();
  if (kind === 'json' && body !== undefined) result = result.set('Content-Type', 'application/json');
  const session = path === '/auth/login' ? undefined : token();
  if (session) result = result.set('Authorization', `Bearer ${session}`);
  return result.keys().length ? result : undefined;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  kind: 'json' | 'blob' | 'form' = 'json',
): Promise<T> {
  const client = http;
  if (!client) throw new Error('API client not initialized');

  const requestHeaders = headers(path, body, kind);
  const url = `${BASE_URL}${path}`;

  try {
    if (kind === 'blob') {
      const response = await firstValueFrom(
        client.request(method, url, {
          body,
          ...(requestHeaders ? { headers: requestHeaders } : {}),
          observe: 'response',
          responseType: 'blob',
        }),
      );
      clearUnreachable();
      if (response.status === 204) return undefined as T;
      return response.body as T;
    }

    const response = await firstValueFrom(
      client.request(method, url, {
        body: kind === 'form' ? (body as FormData) : body,
        ...(requestHeaders ? { headers: requestHeaders } : {}),
        observe: 'response',
        responseType: 'text',
      }),
    );

    clearUnreachable();
    if (response.status === 204 || !response.body) return undefined as T;
    return JSON.parse(response.body) as T;
  } catch (error) {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) reportUnreachable();
      if (error.status === 401) clearSession();
      throw toApiError(error);
    }
    if (error instanceof TypeError) reportUnreachable();
    throw error;
  }
}
