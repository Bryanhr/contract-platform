import { SlotContext, SlotStrategy } from '../models/slot-context';

export const slotStrategies = {
  cliente: (context) => context.client?.empresa ?? '',
  fecha_emision: (context) => context.issuedOn,
  ruc: (context) => context.client?.ruc ?? '',
  representante: (context) => context.client?.representante ?? '',
  domicilio: (context) => context.client?.domicilio ?? '',
  direccion: (context) => context.client?.domicilio ?? '',
  correo: (context) => context.client?.correo ?? '',
  telefono: (context) => context.client?.telefono ?? '',
  plan: (context) => context.planName,
  duracion: (context) => (context.plan ? `${context.plan.durationMonths} meses` : ''),
  costo_mensual: (context) => context.monthly,
  tiempo_atencion: (context) => (context.plan ? `${context.plan.responseTimeHours} horas` : ''),
  response_time_hours: (context) => (context.plan ? String(context.plan.responseTimeHours) : ''),
  fecha_inicio: (context) => context.startsOn,
  fecha_fin: (context) => context.endsOn,
  duration_months: (context) => (context.plan ? String(context.plan.durationMonths) : ''),
  total: (context) => context.total,
} satisfies Record<string, SlotStrategy>;

export function resolveSlot(name: string, context: SlotContext) {
  const strategy = slotStrategies[name as keyof typeof slotStrategies];
  return strategy ? strategy(context) : '';
}
