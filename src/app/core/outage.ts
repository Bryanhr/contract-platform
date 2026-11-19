import { signal } from '@angular/core';

export const unreachable = signal(false);

export function reportUnreachable(): void {
  unreachable.set(true);
}

export function clearUnreachable(): void {
  unreachable.set(false);
}

export function isUnreachable(error: unknown): boolean {
  return error instanceof TypeError;
}
