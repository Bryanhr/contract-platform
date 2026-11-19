export interface ContractResponse {
  id: number;
  customerId: number;
  customerName: string;
  customerRepresentative?: string | null;
  planId: number;
  planName: string;
  issueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  amount: number | null;
  status: 'GENERATED' | 'SIGNED';
  signedDate: string | null;
  validity: 'PENDING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | null;
}
