import { api } from '../../../core/api';
import { ApiError } from '../../../core/models/api-error';
import { toTemplate, toTemplateRequest, toTemplates } from '../mappers/template.mapper';
import { Template, TemplateRequest } from '../models/template';
import { TemplateResponse } from '../models/template-response';

let templatesRequest: Promise<Template[]> | undefined;

export function getTemplates() {
  templatesRequest ??= api
    .get<TemplateResponse[]>('/templates')
    .then(toTemplates)
    .catch((error: unknown) => {
      templatesRequest = undefined;
      throw error;
    });
  return templatesRequest;
}

/** One template per plan — load with GET /templates?planId= */
export async function getTemplateByPlan(planId: number): Promise<Template> {
  const list = await api.get<TemplateResponse[]>(`/templates?planId=${planId}`).then(toTemplates);
  const found = list[0];
  if (found) return found;
  const missing: ApiError = { status: 404, body: null };
  throw missing;
}

export function createTemplate(request: TemplateRequest) {
  return api
    .post<TemplateResponse>('/templates', toTemplateRequest(request))
    .then(toTemplate)
    .finally(forgetTemplates);
}

export function updateTemplate(id: number, request: TemplateRequest) {
  return api
    .put<TemplateResponse>(`/templates/${id}`, toTemplateRequest(request))
    .then(toTemplate)
    .finally(forgetTemplates);
}

export function deleteTemplate(id: number) {
  return api.delete(`/templates/${id}`).finally(forgetTemplates);
}

export function forgetTemplates() {
  templatesRequest = undefined;
}
