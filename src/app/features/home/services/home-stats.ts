import { getContracts } from '../../contracts/services/contract-api';
import { getCustomers } from '../../customers/services/customer-api';
import { getPlans } from '../../plans/services/plan-api';
import { getSupportServices } from '../../services/services/service-api';
import { getTemplates } from '../../templates/services/template-api';
import { HomeStat } from '../models/module';

const KEY = 'servit.homeStats';

let cachedStats: HomeStat[] | undefined;
let statsRequest: Promise<HomeStat[]> | undefined;

/** Sync read — used so Inicio can paint with numbers already available. */
export function readHomeStats(): HomeStat[] | undefined {
  if (cachedStats) return cachedStats;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as HomeStat[];
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    cachedStats = parsed;
    return cachedStats;
  } catch {
    return;
  }
}

export function loadHomeStats() {
  statsRequest ??= Promise.all([
    countOf(getCustomers()),
    countOf(getSupportServices()),
    countOf(getPlans()),
    countOf(getTemplates()),
    countOf(getContracts()),
  ])
    .then(([customers, services, plans, templates, contracts]) => {
      const stats: HomeStat[] = [
        { id: 'clients', icon: 'lucideBuilding2', label: 'Clientes', value: customers },
        { id: 'services', icon: 'lucideWrench', label: 'Servicios', value: services },
        { id: 'plans', icon: 'lucideLayers', label: 'Planes', value: plans },
        { id: 'templates', icon: 'lucideScrollText', label: 'Plantillas', value: templates },
        { id: 'contracts', icon: 'lucideFileText', label: 'Contratos', value: contracts },
      ];
      cachedStats = stats;
      sessionStorage.setItem(KEY, JSON.stringify(stats));
      return stats;
    })
    .catch((error: unknown) => {
      statsRequest = undefined;
      throw error;
    });
  return statsRequest;
}

async function countOf(request: Promise<unknown[]>): Promise<number> {
  try {
    const list = await request;
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}
