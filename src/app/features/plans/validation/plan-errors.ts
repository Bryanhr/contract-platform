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

  if (!draft.name.trim()) errors.name = 'Escribe el nombre.';
  if (!/^\d+$/.test(responseTime) || !Number.isSafeInteger(Number(responseTime)) || Number(responseTime) <= 0) {
    errors.responseTimeHours = 'Usa un entero mayor que 0.';
  }
  if (
    !costMatch ||
    integerDigits.length > 8 ||
    !Number.isFinite(Number(monthlyCost)) ||
    Number(monthlyCost) <= 0
  ) {
    errors.monthlyCost = 'Usa un monto mayor que 0 (máx. 2 decimales).';
  }
  if (!/^\d+$/.test(duration) || !Number.isSafeInteger(Number(duration)) || Number(duration) < 1) {
    errors.durationMonths = 'Usa un entero de al menos 1.';
  }
  return errors;
}

export type PlanServiceFieldErrors = {
  monthlyLimit?: string;
  extraCost?: string;
};

export function planServiceFieldErrors(monthlyLimit: string, extraCost: string): PlanServiceFieldErrors {
  const errors: PlanServiceFieldErrors = {};
  const limitText = monthlyLimit.trim();
  const costText = extraCost.trim();
  const costMatch = /^(\d+)(?:\.(\d{1,2}))?$/.exec(costText);
  const integerDigits = costMatch?.[1].replace(/^0+/, '') ?? '';
  const limit = Number(limitText);
  const cost = Number(costText);

  if (!limitText) errors.monthlyLimit = 'Escribe el límite.';
  else if (!/^\d+$/.test(limitText) || !Number.isSafeInteger(limit) || limit < 0) {
    errors.monthlyLimit = 'Usa un entero ≥ 0.';
  }

  if (!costText) errors.extraCost = 'Escribe el costo.';
  else if (!costMatch || integerDigits.length > 8 || !Number.isFinite(cost) || cost < 0) {
    errors.extraCost = 'Usa un monto ≥ 0 (2 dec.).';
  }
  return errors;
}

export function planServiceValues(monthlyLimit: string, extraCost: string) {
  const errors = planServiceFieldErrors(monthlyLimit, extraCost);
  if (errors.monthlyLimit || errors.extraCost) {
    return {
      error: errors.monthlyLimit || errors.extraCost || '',
      monthlyLimit: 0,
      extraCost: 0,
    };
  }
  return {
    error: '',
    monthlyLimit: Number(monthlyLimit),
    extraCost: Number(extraCost),
  };
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
    name: 'Escribe el nombre.',
    responseTimeHours: 'Usa un entero mayor que 0.',
    monthlyCost: 'Usa un monto mayor que 0 (máx. 2 decimales).',
    durationMonths: 'Usa un entero de al menos 1.',
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
