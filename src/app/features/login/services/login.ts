import { api } from '../../../core/api';
import { Session } from '../../../core/models/session';
import { clearSession, saveSession } from '../../../core/session';

export function login(email: string, password: string) {
  return api
    .post<Session>('/auth/login', { email, password })
    .then((session) => saveSession(session));
}

export function logout() {
  return api
    .post<void>('/auth/logout', undefined)
    .catch(() => undefined)
    .finally(clearSession);
}

export function nextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) return '/';
  return value;
}
