import { Plan } from './plan';
import { PlanService } from './plan-service';

export interface PlanDetail extends Plan {
  services: PlanService[];
}
