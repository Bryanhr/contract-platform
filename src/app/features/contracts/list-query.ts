import { ParamMap } from '@angular/router';
import { readListPage } from '../../core/list-page';
import {
  ContractFilters,
  ContractStatusFilter,
  ContractValidityFilter,
  emptyContractFilters,
} from './models/contract-filters';

const statuses = new Set<ContractStatusFilter>(['GENERATED', 'SIGNED', '']);
const validities = new Set<ContractValidityFilter>(['PENDING', 'ACTIVE', 'EXPIRING', 'EXPIRED', '']);

/** Read list page + filters from the contracts URL. */
export function readContractListState(params: ParamMap): { page: number; filters: ContractFilters } {
  const status = params.get('status') ?? '';
  const validity = params.get('validity') ?? '';
  return {
    page: readListPage(params.get('page')),
    filters: {
      status: statuses.has(status as ContractStatusFilter) ? (status as ContractStatusFilter) : '',
      validity: validities.has(validity as ContractValidityFilter)
        ? (validity as ContractValidityFilter)
        : '',
    },
  };
}

/** Query params to keep page and filters across detail/edit → back. */
export function contractListQuery(
  page: number,
  filters: ContractFilters = emptyContractFilters,
): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (page > 1) query['page'] = page;
  if (filters.status) query['status'] = filters.status;
  if (filters.validity) query['validity'] = filters.validity;
  return query;
}
