import { Client } from './client';
import { Plan } from './plan';

export interface SlotContext {
  client?: Client;
  plan?: Plan;
  planName: string;
  issuedOn: string;
  startsOn: string;
  endsOn: string;
  monthly: string;
  total: string;
}

export type SlotStrategy = (context: SlotContext) => string;
