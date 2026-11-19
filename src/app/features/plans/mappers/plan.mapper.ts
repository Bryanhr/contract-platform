import { PlanDraft } from '../models/plan-draft';
import { PlanRequest } from '../models/plan-request';

export function toPlanRequest(draft: PlanDraft): PlanRequest {
  return {
    name: draft.name.trim(),
    responseTimeHours: Number(draft.responseTimeHours),
    monthlyCost: Number(draft.monthlyCost),
    durationMonths: Number(draft.durationMonths),
  };
}
