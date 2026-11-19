import { ApiError } from '../../../core/models/api-error';
import { PlanDraft } from '../models/plan-draft';

export type PlanField = keyof PlanDraft;
export type PlanErrors = Partial<Record<PlanField, string>>;

export function planErrors(draft: PlanDraft): PlanErrors {
  const errors: PlanErrors = {};
  const responseTime = draft.responseTimeHours.trim();
  const monthlyCost = draft.monthlyCost.trim();
  const duration = draft.durationMonths.trim();
  const costMatch = /^(\d+)(?:\.(\d{1,2}))?$/.exec(monthlyCost);
  const integerDigits = costMatch?.[1].replace(/^0+/, '') ?? '';

  if (!draft.name.trim()) errors.name = 'Escribe el nombre del plan.';
  if (!/^\d+$/.test(responseTime) || !Number.isSafeInteger(Number(responseTime)) || Number(responseTime) <= 0) {
    errors.responseTimeHours = 'El tiempo de respuesta debe ser un entero mayor que 0.';
  }
  if (
    !costMatch ||
    integerDigits.length > 8 ||
    !Number.isFinite(Number(monthlyCost)) ||
    Number(monthlyCost) <= 0
  ) {
    errors.monthlyCost = 'El costo mensual debe ser mayor que 0, tener hasta 8 cifras enteras y máximo 2 decimales.';
  }
  if (!/^\d+$/.test(duration) || !Number.isSafeInteger(Number(duration)) || Number(duration) < 1) {
    errors.durationMonths = 'La duración debe ser un entero de al menos 1 mes.';
  }
  return errors;
}

export function apiErrorStatus(error: unknown): number {
  return isApiError(error) ? error.status : 0;
}

export function problemDetail(error: unknown): string {
  if (!isApiError(error) || !isRecord(error.body)) return '';
  return typeof error.body['detail'] === 'string' ? error.body['detail'] : '';
}

export function apiFieldErrors(error: unknown): PlanErrors {
  if (!isApiError(error) || !isRecord(error.body) || !isRecord(error.body['errors'])) return {};

  const result: PlanErrors = {};
  const messages: Record<PlanField, string> = {
    name: 'Escribe el nombre del plan.',
    responseTimeHours: 'El tiempo de respuesta debe ser un entero mayor que 0.',
    monthlyCost: 'El costo mensual debe ser mayor que 0, tener hasta 8 cifras enteras y máximo 2 decimales.',
    durationMonths: 'La duración debe ser un entero de al menos 1 mes.',
  };
  for (const field of Object.keys(messages) as PlanField[]) {
    if (typeof error.body['errors'][field] === 'string') result[field] = messages[field];
  }
  return result;
}

function isApiError(error: unknown): error is ApiError {
  return isRecord(error) && typeof error['status'] === 'number' && 'body' in error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
