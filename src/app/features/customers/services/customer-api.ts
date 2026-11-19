import { api } from '../../../core/api';
import { forgetContracts } from '../../contracts/services/contract-api';
import { toClient, toClients, toCustomerRequest } from '../mappers/customer.mapper';
import { Client } from '../models/client';
import { CustomerResponse } from '../models/customer-response';

let customersRequest: Promise<Client[]> | undefined;

export function getCustomers() {
  customersRequest ??= api
    .get<CustomerResponse[]>('/customers')
    .then(toClients)
    .catch((error: unknown) => {
      customersRequest = undefined;
      throw error;
    });
  return customersRequest;
}

export function getCustomer(id: string) {
  return api.get<CustomerResponse>(`/customers/${id}`).then(toClient);
}

export function createCustomer(client: Client) {
  return api.post<CustomerResponse>('/customers', toCustomerRequest(client)).finally(forget);
}

export function updateCustomer(id: string, client: Client) {
  return api.put<CustomerResponse>(`/customers/${id}`, toCustomerRequest(client)).finally(forget);
}

export function deleteCustomer(id: string) {
  return api.delete(`/customers/${id}`).finally(forget);
}

// Contracts show the customer's name and representative, so they go stale too.
function forget() {
  customersRequest = undefined;
  forgetContracts();
}
