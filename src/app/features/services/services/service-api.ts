import { api } from '../../../core/api';
import {
  ServiceTypeResponse,
  SupportServiceResponse,
  toServiceType,
  toServiceTypes,
  toSupportService,
  toSupportServices,
} from '../mappers/service-catalog.mapper';
import {
  ServiceType,
  ServiceTypeRequest,
  SupportService,
  SupportServiceRequest,
} from '../models/service-catalog';

let typesRequest: Promise<ServiceType[]> | undefined;
let servicesRequest: Promise<SupportService[]> | undefined;

export function getServiceTypes() {
  typesRequest ??= api
    .get<ServiceTypeResponse[]>('/service-types')
    .then(toServiceTypes)
    .catch((error: unknown) => {
      typesRequest = undefined;
      throw error;
    });
  return typesRequest;
}

export function getSupportServices() {
  servicesRequest ??= api
    .get<SupportServiceResponse[]>('/support-services')
    .then(toSupportServices)
    .catch((error: unknown) => {
      servicesRequest = undefined;
      throw error;
    });
  return servicesRequest;
}

export function createServiceType(request: ServiceTypeRequest) {
  return api.post<ServiceTypeResponse>('/service-types', request).then(toServiceType).finally(forgetServiceCatalog);
}

export function updateServiceType(id: number, request: ServiceTypeRequest) {
  return api
    .put<ServiceTypeResponse>(`/service-types/${id}`, request)
    .then(toServiceType)
    .finally(forgetServiceCatalog);
}

export function deleteServiceType(id: number) {
  return api.delete(`/service-types/${id}`).finally(forgetServiceCatalog);
}

export function createSupportService(request: SupportServiceRequest) {
  return api
    .post<SupportServiceResponse>('/support-services', request)
    .then(toSupportService)
    .finally(forgetServiceCatalog);
}

export function updateSupportService(id: number, request: SupportServiceRequest) {
  return api
    .put<SupportServiceResponse>(`/support-services/${id}`, request)
    .then(toSupportService)
    .finally(forgetServiceCatalog);
}

export function deleteSupportService(id: number) {
  return api.delete(`/support-services/${id}`).finally(forgetServiceCatalog);
}

export function forgetServiceCatalog() {
  typesRequest = undefined;
  servicesRequest = undefined;
}
