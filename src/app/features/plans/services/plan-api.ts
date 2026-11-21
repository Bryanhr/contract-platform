import { api } from '../../../core/api';
import { PlanServiceAddRequest, PlanServiceLink, PlanServiceRequest } from '../models/plan-service-link';
import { Plan } from '../models/plan';
import { PlanRequest } from '../models/plan-request';

let plansRequest: Promise<Plan[]> | undefined;

export function getPlans() {
  plansRequest ??= api.get<Plan[]>('/plans').catch((error: unknown) => {
    plansRequest = undefined;
    throw error;
  });
  return plansRequest;
}

export function getPlan(id: number) {
  return api.get<Plan>(`/plans/${id}`);
}

export function createPlan(plan: PlanRequest) {
  return api.post<Plan>('/plans', plan).finally(forget);
}

export function updatePlan(id: number, plan: PlanRequest) {
  return api.put<Plan>(`/plans/${id}`, plan).finally(forget);
}

export async function deletePlan(id: number) {
  const services = await getPlanServices(id).catch((error: unknown) => {
    // Plan already gone or has no services endpoint payload — still try plan delete.
    if (isNotFound(error)) return [] as PlanServiceLink[];
    throw error;
  });
  for (const service of services) {
    await removePlanService(id, service.supportServiceId);
  }
  return api.delete(`/plans/${id}`).finally(forget);
}

function isNotFound(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'status' in error &&
      (error as { status: unknown }).status === 404,
  );
}

export function getPlanServices(planId: number) {
  return api.get<PlanServiceLink[]>(`/plans/${planId}/services`);
}

export function addPlanService(planId: number, request: PlanServiceAddRequest) {
  return api.post<PlanServiceLink>(`/plans/${planId}/services`, request);
}

export function updatePlanService(planId: number, serviceId: number, request: PlanServiceRequest) {
  return api.put<PlanServiceLink>(`/plans/${planId}/services/${serviceId}`, request);
}

export function removePlanService(planId: number, serviceId: number) {
  return api.delete(`/plans/${planId}/services/${serviceId}`);
}

function forget() {
  plansRequest = undefined;
}
