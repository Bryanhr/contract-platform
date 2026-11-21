export interface Template {
  id: number;
  planId: number;
  planName: string;
  name: string;
  content: string;
  updatedAt: string;
}

export interface TemplateRequest {
  name: string;
  planId: number;
  content: string;
}

/** full = contrato de cero (as-is); clause = texto insertado en el documento base del backend. */
export type TemplateContentMode = 'full' | 'clause';
