import { PlanDraft } from '../models/plan-draft';
import { apiFieldErrors, planErrors, planServiceFieldErrors, problemDetail } from './plan-errors';

const valid: PlanDraft = {
  name: 'Soporte estándar',
  responseTimeHours: '4',
  monthlyCost: '250.50',
  durationMonths: '12',
};

describe('planErrors', () => {
  it('accepts a valid plan', () => {
    expect(planErrors(valid)).toEqual({});
  });

  it('validates all required fields and numeric constraints', () => {
    expect(
      planErrors({
        ...valid,
        name: ' ',
        responseTimeHours: '1.5',
        monthlyCost: '0',
        durationMonths: '0',
      }),
    ).toEqual({
      name: 'Escribe el nombre.',
      responseTimeHours: 'Usa un entero mayor que 0.',
      monthlyCost: 'Usa un monto mayor que 0 (máx. 2 decimales).',
      durationMonths: 'Usa un entero de al menos 1.',
    });
  });

  it('rejects monthly costs with more than two decimal places', () => {
    expect(planErrors({ ...valid, monthlyCost: '10.123' }).monthlyCost).toBeDefined();
  });

  it('rejects monthly costs with more than eight integer digits', () => {
    expect(planErrors({ ...valid, monthlyCost: '123456789.10' }).monthlyCost).toBeDefined();
  });
});

describe('planServiceFieldErrors', () => {
  it('accepts valid limit and extra cost', () => {
    expect(planServiceFieldErrors('10', '1.5')).toEqual({});
  });

  it('rejects empty or invalid service values', () => {
    expect(planServiceFieldErrors('', '')).toEqual({
      monthlyLimit: 'Escribe el límite.',
      extraCost: 'Escribe el costo.',
    });
    expect(planServiceFieldErrors('1.5', '10.123')).toEqual({
      monthlyLimit: 'Usa un entero ≥ 0.',
      extraCost: 'Usa un monto ≥ 0 (2 dec.).',
    });
  });
});

describe('backend validation errors', () => {
  it('reads ProblemDetail detail and maps field errors', () => {
    const error = {
      status: 400,
      body: {
        detail: 'Validation failed',
        errors: { name: 'must not be blank', monthlyCost: 'must be greater than 0' },
      },
    };

    expect(problemDetail(error)).toBe('Validation failed');
    expect(apiFieldErrors(error)).toEqual({
      name: 'Escribe el nombre.',
      monthlyCost: 'Usa un monto mayor que 0 (máx. 2 decimales).',
    });
  });
});
