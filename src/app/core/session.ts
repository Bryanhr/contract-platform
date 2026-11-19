import { Account } from './models/account';
import { Session } from './models/session';

const KEY = 'servit.session';

export function saveSession(session: Session) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}

export function token() {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return;
  try {
    const session = JSON.parse(raw) as Session;
    if (!session.token || Number.isNaN(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now()) {
      clearSession();
      return;
    }
    return session.token;
  } catch {
    clearSession();
    return;
  }
}

export function hasSession() {
  return token() !== undefined;
}

export function account(): Account | undefined {
  const email = subject();
  if (!email) return;
  const local = email.split('@')[0]?.trim() || email;
  const letter = local.charAt(0);
  if (!letter) return;
  return { initial: letter.toLocaleUpperCase('es'), label: email };
}

function subject() {
  const value = token();
  if (!value) return;
  const segment = value.split('.')[1];
  if (!segment) return;
  try {
    const payload = JSON.parse(decode(segment)) as { sub?: unknown };
    return typeof payload.sub === 'string' ? payload.sub : undefined;
  } catch {
    return;
  }
}

function decode(segment: string) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}
