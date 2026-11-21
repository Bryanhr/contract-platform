export type ContractStatusFilter = 'GENERATED' | 'SIGNED' | '';

export type ContractValidityFilter = 'PENDING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | '';

export interface ContractFilters {
  status: ContractStatusFilter;
  validity: ContractValidityFilter;
  startDate: string;
  endDate: string;
}

export const emptyContractFilters: ContractFilters = {
  status: '',
  validity: '',
  startDate: '',
  endDate: '',
};
