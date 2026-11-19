import { PlanService } from '../models/plan-service';
import { soles } from './soles';

export function serviceLine(service: PlanService) {
  let line = service.name;
  if (service.type) line += ` (${service.type})`;
  if (service.monthlyLimit != null) {
    line += `: hasta ${service.monthlyLimit}`;
    if (service.unit) line += ` ${service.unit}`;
    line += ' al mes';
  }
  if (service.extraCost != null) line += `. Costo extra ${soles(service.extraCost)}`;
  return line;
}
