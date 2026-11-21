import { api } from '../../../core/api';
import { ApiError } from '../../../core/models/api-error';
import { Template, TemplateRequest } from '../models/template';

let templatesRequest: Promise<Template[]> | undefined;

export function getTemplates() {
  templatesRequest ??= api.get<Template[]>('/templates').catch((error: unknown) => {
    templatesRequest = undefined;
    throw error;
  });
  return templatesRequest;
}

/** One template per plan — load with GET /templates?planId= */
export async function getTemplateByPlan(planId: number): Promise<Template> {
  const list = await api.get<Template[]>(`/templates?planId=${planId}`);
  const found = list[0];
  if (found) return found;
  const missing: ApiError = { status: 404, body: null };
  throw missing;
}

export function createTemplate(request: TemplateRequest) {
  return api.post<Template>('/templates', request).finally(forgetTemplates);
}

export function updateTemplate(id: number, request: TemplateRequest) {
  return api.put<Template>(`/templates/${id}`, request).finally(forgetTemplates);
}

export function deleteTemplate(id: number) {
  return api.delete(`/templates/${id}`).finally(forgetTemplates);
}

export function forgetTemplates() {
  templatesRequest = undefined;
}
