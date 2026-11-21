import { Client } from '../models/client';

export type CustomerField = 'empresa' | 'ruc' | 'representante' | 'correo';
export type CustomerErrors = Partial<Record<CustomerField, string>>;

const correoPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function customerErrors(client: Client): CustomerErrors {
  const errors: CustomerErrors = {};
  if (!client.empresa.trim()) errors.empresa = 'Escribe la razón social.';
  if (!/^\d{11}$/.test(client.ruc.trim())) errors.ruc = 'Escribe un RUC válido.';
  if (!client.representante.trim()) errors.representante = 'Escribe el representante.';
  const correo = client.correo.trim();
  if (!correo) errors.correo = 'Escribe el correo.';
  else if (!correoPattern.test(correo)) errors.correo = 'Escribe un correo válido.';
  return errors;
}
