export interface CustomerResponse {
  id: number;
  businessName: string;
  ruc: string;
  representative: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}
