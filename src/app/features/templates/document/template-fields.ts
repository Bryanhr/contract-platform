/** Insertable contract fields shown in the template editor. */
export const TEMPLATE_FIELDS = [
  { name: 'cliente', label: 'Nombre de la empresa' },
  { name: 'ruc', label: 'RUC' },
  { name: 'representante', label: 'Nombre del representante' },
  { name: 'representante_frase', label: 'Representante (con presentación)' },
  { name: 'direccion', label: 'Domicilio' },
  { name: 'correo', label: 'Correo' },
  { name: 'telefono', label: 'Teléfono' },
  { name: 'contacto', label: 'Domicilio, correo y teléfono' },
  { name: 'plan', label: 'Nombre del plan' },
  { name: 'duracion', label: 'Duración del servicio' },
  { name: 'costo_mensual', label: 'Costo mensual' },
  { name: 'tiempo_atencion', label: 'Tiempo de atención' },
  { name: 'total', label: 'Total a pagar' },
  { name: 'fecha_emision', label: 'Fecha de emisión' },
  { name: 'fecha_inicio', label: 'Fecha de inicio' },
  { name: 'fecha_fin', label: 'Fecha de fin' },
  { name: 'servicios', label: 'Servicios incluidos' },
] as const;

export type TemplateFieldName = (typeof TEMPLATE_FIELDS)[number]['name'];

export function fieldLabel(name: string): string {
  return TEMPLATE_FIELDS.find((field) => field.name === name)?.label ?? name;
}
