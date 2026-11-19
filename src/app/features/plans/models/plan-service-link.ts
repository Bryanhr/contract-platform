export interface PlanServiceLink {
  supportServiceId: number;
  name: string;
  serviceType: string | null;
  unit: string | null;
  monthlyLimit: number;
  extraCost: number;
}

export interface PlanServiceRequest {
  monthlyLimit: number;
  extraCost: number;
}

export interface PlanServiceAddRequest extends PlanServiceRequest {
  supportServiceId: number;
}
