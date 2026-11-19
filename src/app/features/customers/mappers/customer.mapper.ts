import { Client } from '../models/client';
import { CustomerRequest } from '../models/customer-request';
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

export function toCustomerRequest(client: Client): CustomerRequest {
  return {
    businessName: client.empresa.trim(),
    ruc: client.ruc.trim(),
    representative: client.representante.trim() || null,
    email: client.correo.trim() || null,
    phone: client.telefono.trim() || null,
    address: client.domicilio.trim() || null,
  };
}
