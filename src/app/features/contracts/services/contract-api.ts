import { api } from '../../../core/api';
import { Client } from '../../customers/models/client';
import { getCustomers } from '../../customers/services/customer-api';
import { toContracts } from '../mappers/contract.mapper';
import { ContractSummary } from '../models/contract';
import { ContractFilters, emptyContractFilters } from '../models/contract-filters';
import { ContractRequest } from '../models/contract-request';
import { ContractResponse } from '../models/contract-response';
import { Plan } from '../models/plan';
import { PlanDetail } from '../models/plan-detail';
import { Template } from '../models/template';

let templatesRequest: Promise<Template[]> | undefined;
let plansRequest: Promise<Plan[]> | undefined;
const planDetailCache = new Map<number, Promise<PlanDetail>>();
const contractsCache = new Map<string, Promise<ContractSummary[]>>();

export function getTemplates() {
  templatesRequest ??= api.get<Template[]>('/templates').catch((error: unknown) => {
    templatesRequest = undefined;
    throw error;
  });
  return templatesRequest;
}

export function getPlans() {
  plansRequest ??= api.get<Plan[]>('/plans').catch((error: unknown) => {
    plansRequest = undefined;
    throw error;
  });
  return plansRequest;
}

export function getPlan(id: number) {
  const cached = planDetailCache.get(id);
  if (cached) return cached;

  const request = api
    .get<PlanDetail>(`/plans/${id}`)
    .then((plan) => ({ ...plan, services: plan.services ?? [] }))
    .catch((error: unknown) => {
      planDetailCache.delete(id);
      throw error;
    });
  planDetailCache.set(id, request);
  return request;
}

export function forgetContracts() {
  contractsCache.clear();
}

export function getContracts(filters: ContractFilters = emptyContractFilters) {
  const key = contractsKey(filters);
  const cached = contractsCache.get(key);
  if (cached) return cached;

  const request = api
    .get<ContractResponse[]>(contractsPath(filters))
    .then(async (contracts) => {
      const clients = await getCustomers().catch(() => [] as Client[]);
      const representantes = new Map(
        clients.map((client) => [client.id, client.representante] as const),
      );
      return toContracts(contracts, representantes);
    })
    .catch((error: unknown) => {
      contractsCache.delete(key);
      throw error;
    });

  contractsCache.set(key, request);
  return request;
}

export function createContract(body: ContractRequest) {
  return api.post<ContractResponse>('/contracts', body).finally(() => {
    contractsCache.clear();
  });
}

export function getContract(id: string) {
  return api.get<ContractResponse>(`/contracts/${id}`);
}

export function updateContract(id: string, body: ContractRequest) {
  return api.put<ContractResponse>(`/contracts/${id}`, body).finally(() => {
    contractsCache.clear();
  });
}

export function contractPdf(id: string) {
  return api.blob(`/contracts/${id}/pdf`);
}

export function signedDocument(id: string) {
  return api.blob(`/contracts/${id}/signed-document`);
}

export function uploadSigned(id: string, file: File) {
  const upload = file.type === 'application/pdf' ? file : new File([file], file.name, { type: 'application/pdf' });
  const body = new FormData();
  body.append('file', upload);
  return api.form(`/contracts/${id}/upload-signed`, body).finally(() => {
    contractsCache.clear();
  });
}

function contractsPath(filters: ContractFilters) {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.validity) query.set('validity', filters.validity);
  const params = query.toString();
  return params ? `/contracts?${params}` : '/contracts';
}

function contractsKey(filters: ContractFilters) {
  return `${filters.status}|${filters.validity}`;
}
