export interface PlanService {
  id: number;
  name: string;
  type: string | null;
  unit: string | null;
  monthlyLimit: number | null;
  extraCost: number | null;
}
