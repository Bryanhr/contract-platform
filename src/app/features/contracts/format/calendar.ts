import { TemporalApi } from '../models/temporal';

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function addMonths(iso: string, months: number) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return '';
  const monthIndex = month - 1 + months;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const date = new Date(year, monthIndex, Math.min(day, lastDay));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatCalendarDate(iso: string) {
  if (!iso) return '';
  const temporal = (globalThis as { Temporal?: TemporalApi }).Temporal;
  if (temporal) return temporal.PlainDate.from(iso).toLocaleString('es', { dateStyle: 'long' });
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat('es', { dateStyle: 'long' }).format(new Date(year, month - 1, day));
}
