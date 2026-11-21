import { toCustomerRequest } from '../mappers/customer.mapper';
import { Client } from '../models/client';
import { customerErrors } from './customer-errors';

const valid: Client = {
  id: '',
  empresa: 'Acme SAC',
  ruc: '20123456789',
  representante: 'Ana Ruiz',
  domicilio: '',
  correo: 'ana@acme.pe',
  telefono: '',
};

describe('customerErrors', () => {
  it('accepts a customer with the required fields', () => {
    expect(customerErrors(valid)).toEqual({});
  });

  it('flags blank required fields and a bad email', () => {
    expect(
      customerErrors({
        ...valid,
        empresa: '  ',
        ruc: '2012345678',
        representante: ' ',
        correo: 'acme',
      }),
    ).toEqual({
      empresa: 'Escribe la razón social.',
      ruc: 'Escribe un RUC válido.',
      representante: 'Escribe el representante.',
      correo: 'Escribe un correo válido.',
    });
  });

  it('flags a missing email', () => {
    expect(customerErrors({ ...valid, correo: '' }).correo).toBe('Escribe el correo.');
  });

  it('rejects letters in the RUC', () => {
    expect(customerErrors({ ...valid, ruc: '2012345678a' }).ruc).toBeDefined();
  });
});

describe('toCustomerRequest', () => {
  it('trims values and sends blank optional fields as null', () => {
    expect(toCustomerRequest({ ...valid, empresa: ' Acme SAC ', telefono: ' ', domicilio: ' ' })).toEqual({
      businessName: 'Acme SAC',
      ruc: '20123456789',
      representative: 'Ana Ruiz',
      email: 'ana@acme.pe',
      phone: null,
      address: null,
    });
  });
});
