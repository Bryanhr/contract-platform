export type ContractStatusFilter = 'GENERATED' | 'SIGNED' | '';

export type ContractValidityFilter = 'PENDING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | '';

export interface ContractFilters {
  status: ContractStatusFilter;
  validity: ContractValidityFilter;
}

export const emptyContractFilters: ContractFilters = {
  status: '',
  validity: '',
};
