export interface CustomerRequest {
  businessName: string;
  ruc: string;
  representative: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}
