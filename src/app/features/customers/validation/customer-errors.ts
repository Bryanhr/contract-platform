import { Client } from '../models/client';

export type CustomerField = 'empresa' | 'ruc' | 'correo';
export type CustomerErrors = Partial<Record<CustomerField, string>>;

// Same rules as the backend's CustomerRequest, so the form catches them before sending.
export function customerErrors(client: Client): CustomerErrors {
  const errors: CustomerErrors = {};
  if (!client.empresa.trim()) errors.empresa = 'Escribe la razón social.';
  if (!/^\d{11}$/.test(client.ruc.trim())) errors.ruc = 'El RUC debe tener 11 dígitos.';
  const correo = client.correo.trim();
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errors.correo = 'Escribe un correo válido.';
  return errors;
}
