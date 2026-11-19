import { PlanDraft } from '../models/plan-draft';
import { apiFieldErrors, planErrors, problemDetail } from './plan-errors';

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
      name: 'Escribe el nombre del plan.',
      responseTimeHours: 'El tiempo de respuesta debe ser un entero mayor que 0.',
      monthlyCost: 'El costo mensual debe ser mayor que 0, tener hasta 8 cifras enteras y máximo 2 decimales.',
      durationMonths: 'La duración debe ser un entero de al menos 1 mes.',
    });
  });

  it('rejects monthly costs with more than two decimal places', () => {
    expect(planErrors({ ...valid, monthlyCost: '10.123' }).monthlyCost).toBeDefined();
  });

  it('rejects monthly costs with more than eight integer digits', () => {
    expect(planErrors({ ...valid, monthlyCost: '123456789.10' }).monthlyCost).toBeDefined();
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
      name: 'Escribe el nombre del plan.',
      monthlyCost: 'El costo mensual debe ser mayor que 0, tener hasta 8 cifras enteras y máximo 2 decimales.',
    });
  });
});
