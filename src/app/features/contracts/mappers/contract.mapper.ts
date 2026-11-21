import { ContractSignature, ContractSummary, ContractValidity } from '../models/contract';
import { ContractResponse } from '../models/contract-response';

const FIRMA: Record<ContractResponse['status'], { estado: ContractSignature; estadoNombre: string; firmado: boolean }> = {
  SIGNED: { estado: 'firmado', estadoNombre: 'Firmado', firmado: true },
  GENERATED: { estado: 'generado', estadoNombre: 'Generado', firmado: false },
};

const VIGENCIA: Record<Exclude<ContractResponse['validity'], null>, { vigencia: ContractValidity; vigenciaNombre: string }> = {
  PENDING: { vigencia: 'pendiente', vigenciaNombre: 'Pendiente' },
  ACTIVE: { vigencia: 'vigente', vigenciaNombre: 'Vigente' },
  EXPIRING: { vigencia: 'por-vencer', vigenciaNombre: 'Por vencer' },
  EXPIRED: { vigencia: 'vencido', vigenciaNombre: 'Vencido' },
};

export function toContract(contract: ContractResponse, representante = ''): ContractSummary {
  return {
    id: String(contract.id),
    cliente: contract.customerName,
    representante: contratoRepresentante(contract, representante),
    plan: contract.planName,
    startDate: contract.startDate ?? '',
    inicio: contract.startDate ?? '',
    fin: contract.endDate ?? '',
    ...FIRMA[contract.status],
    ...(contract.validity ? VIGENCIA[contract.validity] : { vigencia: null, vigenciaNombre: null }),
  };
}

export function toContracts(
  contracts: ContractResponse[],
  representantes: ReadonlyMap<string, string> = new Map(),
): ContractSummary[] {
  return contracts.map((contract) =>
    toContract(contract, representantes.get(String(contract.customerId)) ?? ''),
  );
}

function contratoRepresentante(contract: ContractResponse, representante: string) {
  const fromContract = contract.customerRepresentative?.trim() ?? '';
  if (fromContract) return fromContract;
  return representante.trim();
}
