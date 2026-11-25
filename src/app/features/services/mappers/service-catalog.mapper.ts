import { ServiceType, SupportService } from '../models/service-catalog';

export interface ServiceTypeResponse {
  id: number;
  name: string;
}

export interface SupportServiceResponse {
  id: number;
  name: string;
  serviceTypeId: number;
  serviceTypeName: string;
  unit: string | null;
}

export function toServiceType(response: ServiceTypeResponse): ServiceType {
  return {
    id: response.id,
    name: response.name,
  };
}

export function toServiceTypes(responses: ServiceTypeResponse[]): ServiceType[] {
  return responses.map(toServiceType);
}

export function toSupportService(response: SupportServiceResponse): SupportService {
  return {
    id: response.id,
    name: response.name,
    serviceTypeId: response.serviceTypeId,
    serviceTypeName: response.serviceTypeName,
    unit: response.unit ?? null,
  };
}

export function toSupportServices(responses: SupportServiceResponse[]): SupportService[] {
  return responses.map(toSupportService);
}
