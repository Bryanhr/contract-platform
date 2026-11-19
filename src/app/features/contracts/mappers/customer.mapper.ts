import { Client } from '../models/client';
import { CustomerResponse } from '../models/customer-response';

export function toClient(customer: CustomerResponse): Client {
  return {
    id: String(customer.id),
    empresa: customer.businessName,
    ruc: customer.ruc,
    representante: customer.representative ?? '',
    domicilio: customer.address ?? '',
    correo: customer.email ?? '',
    telefono: customer.phone ?? '',
  };
}

export function toClients(customers: CustomerResponse[]): Client[] {
  return customers.map(toClient);
}
