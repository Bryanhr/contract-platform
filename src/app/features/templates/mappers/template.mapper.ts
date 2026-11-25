import { Template, TemplateRequest } from '../models/template';
import { TemplateResponse } from '../models/template-response';

export function toTemplate(response: TemplateResponse): Template {
  return {
    id: response.id,
    planId: response.planId,
    planName: response.planName,
    name: response.name,
    content: response.content,
    updatedAt: response.updatedAt,
  };
}

export function toTemplates(responses: TemplateResponse[]): Template[] {
  return responses.map(toTemplate);
}

export function toTemplateRequest(template: TemplateRequest): TemplateRequest {
  return {
    name: template.name.trim(),
    planId: template.planId,
    content: template.content,
  };
}
