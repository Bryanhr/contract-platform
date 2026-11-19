import { toCustomerRequest } from '../mappers/customer.mapper';
import { Client } from '../models/client';
import { customerErrors } from './customer-errors';

const valid: Client = {
  id: '',
  empresa: 'Acme SAC',
  ruc: '20123456789',
  representante: '',
  domicilio: '',
  correo: '',
  telefono: '',
};

describe('customerErrors', () => {
  it('accepts a customer with only the required fields', () => {
    expect(customerErrors(valid)).toEqual({});
  });

  it('flags a blank name, a short RUC and a bad email', () => {
    expect(customerErrors({ ...valid, empresa: '  ', ruc: '2012345678', correo: 'acme' })).toEqual({
      empresa: 'Escribe la razón social.',
      ruc: 'El RUC debe tener 11 dígitos.',
      correo: 'Escribe un correo válido.',
    });
  });

  it('rejects letters in the RUC', () => {
    expect(customerErrors({ ...valid, ruc: '2012345678a' }).ruc).toBeDefined();
  });
});

describe('toCustomerRequest', () => {
  it('trims values and sends blank optional fields as null', () => {
    expect(toCustomerRequest({ ...valid, empresa: ' Acme SAC ', correo: ' ' })).toEqual({
      businessName: 'Acme SAC',
      ruc: '20123456789',
      representative: null,
      email: null,
      phone: null,
      address: null,
    });
  });
});
