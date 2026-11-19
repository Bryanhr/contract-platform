import { ApiError } from '../models/api-error';

export async function toApiError(response: Response): Promise<ApiError> {
  return {
    status: response.status,
    body: await parseResponseBody(response),
  };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
