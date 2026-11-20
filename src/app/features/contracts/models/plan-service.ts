export interface PlanService {
  id: number;
  name: string;
  serviceType: string | null;
  unit: string | null;
  monthlyLimit: number | null;
  extraCost: number | null;
}
