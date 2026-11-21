export type ContractSignature = 'firmado' | 'generado';

export type ContractValidity = 'pendiente' | 'vigente' | 'por-vencer' | 'vencido';

export interface ContractSummary {
  id: string;
  cliente: string;
  representante: string;
  plan: string;
  startDate: string;
  inicio: string;
  fin: string;
  firmado: boolean;
  estado: ContractSignature;
  estadoNombre: string;
  vigencia: ContractValidity | null;
  vigenciaNombre: string | null;
}
