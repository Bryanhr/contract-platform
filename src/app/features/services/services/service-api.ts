import { api } from '../../../core/api';
import {
  ServiceType,
  ServiceTypeRequest,
  SupportService,
  SupportServiceRequest,
} from '../models/service-catalog';

let typesRequest: Promise<ServiceType[]> | undefined;
let servicesRequest: Promise<SupportService[]> | undefined;

export function getServiceTypes() {
  typesRequest ??= api.get<ServiceType[]>('/service-types').catch((error: unknown) => {
    typesRequest = undefined;
    throw error;
  });
  return typesRequest;
}

export function getSupportServices() {
  servicesRequest ??= api.get<SupportService[]>('/support-services').catch((error: unknown) => {
    servicesRequest = undefined;
    throw error;
  });
  return servicesRequest;
}

export function createServiceType(request: ServiceTypeRequest) {
  return api.post<ServiceType>('/service-types', request).finally(forgetServiceCatalog);
}

export function updateServiceType(id: number, request: ServiceTypeRequest) {
  return api.put<ServiceType>(`/service-types/${id}`, request).finally(forgetServiceCatalog);
}

export function deleteServiceType(id: number) {
  return api.delete(`/service-types/${id}`).finally(forgetServiceCatalog);
}

export function createSupportService(request: SupportServiceRequest) {
  return api.post<SupportService>('/support-services', request).finally(forgetServiceCatalog);
}

export function updateSupportService(id: number, request: SupportServiceRequest) {
  return api.put<SupportService>(`/support-services/${id}`, request).finally(forgetServiceCatalog);
}

export function deleteSupportService(id: number) {
  return api.delete(`/support-services/${id}`).finally(forgetServiceCatalog);
}

export function forgetServiceCatalog() {
  typesRequest = undefined;
  servicesRequest = undefined;
}
