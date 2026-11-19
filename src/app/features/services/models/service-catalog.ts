export interface ServiceType {
  id: number;
  name: string;
}

export interface SupportService {
  id: number;
  name: string;
  serviceTypeId: number;
  serviceTypeName: string;
  unit: string | null;
}

export interface ServiceTypeRequest {
  name: string;
}

export interface SupportServiceRequest {
  name: string;
  serviceTypeId: number;
  unit: string | null;
}
