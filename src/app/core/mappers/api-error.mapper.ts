import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../models/api-error';

export function toApiError(error: HttpErrorResponse): ApiError {
  return {
    status: error.status,
    body: error.status === 0 ? null : parseErrorBody(error),
  };
}

function parseErrorBody(error: HttpErrorResponse): unknown {
  const body: unknown = error.error;

  if (body === null || body === undefined || body === '') {
    return null;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }

  return body;
}
