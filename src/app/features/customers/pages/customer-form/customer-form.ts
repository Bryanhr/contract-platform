import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { Shell } from '../../../../shell/shell';
import { customerIcons } from '../../icons';
import { Client } from '../../models/client';
import { createCustomer, getCustomer, updateCustomer } from '../../services/customer-api';
import { CustomerErrors, CustomerField, customerErrors } from '../../validation/customer-errors';

const blank: Client = {
  id: '',
  empresa: '',
  ruc: '',
  representante: '',
  domicilio: '',
  correo: '',
  telefono: '',
};

@Component({
  selector: 'app-customer-form',
  imports: [Shell, RouterLink, NgIcon],
  providers: [customerIcons],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.css',
})
export class CustomerForm {
  private readonly router = inject(Router);

  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly editing = Boolean(this.id);
  protected readonly draft = signal<Client | null>(this.editing ? null : { ...blank });
  protected readonly failed = signal(false);
  protected readonly saving = signal(false);
  protected readonly checked = signal(false);
  protected readonly errors = signal<CustomerErrors>({});
  protected readonly failure = signal('');
  protected readonly unreachable = unreachable;

  constructor() {
    if (this.editing) void this.load();
  }

  protected set(event: Event) {
    const field = event.target as HTMLInputElement;
    const key = field.name as keyof Client;
    this.draft.update((current) => (current ? { ...current, [key]: field.value } : current));
    if (this.checked()) this.errors.set(customerErrors(this.draft()!));
  }

  protected error(field: CustomerField) {
    return this.errors()[field];
  }

  protected save(event: Event) {
    event.preventDefault();
    const client = this.draft();
    if (!client || this.saving()) return;
    this.checked.set(true);
    this.failure.set('');
    const errors = customerErrors(client);
    this.errors.set(errors);
    const first = (['empresa', 'ruc', 'correo'] as const).find((field) => errors[field]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    this.saving.set(true);
    void this.send(client);
  }

  private async send(client: Client) {
    try {
      if (this.editing) await updateCustomer(this.id, client);
      else await createCustomer(client);
      await this.router.navigateByUrl('/customers');
    } catch (error) {
      if (isUnreachable(error)) return;
      const status = typeof error === 'object' && error && 'status' in error ? error.status : 0;
      if (status === 401) {
        await this.router.navigateByUrl('/login');
      } else if (status === 409) {
        this.errors.set({ ruc: 'Ya existe un cliente con este RUC.' });
        document.getElementById('ruc')?.focus();
      } else if (status === 404) {
        this.failure.set('Este cliente ya no existe.');
      } else if (status === 400) {
        this.failure.set('Revisa los datos e inténtalo otra vez.');
      } else {
        this.failure.set('No se pudo guardar el cliente.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async load() {
    try {
      this.draft.set(await getCustomer(this.id));
    } catch (error) {
      const status = typeof error === 'object' && error && 'status' in error ? error.status : 0;
      if (status === 401) await this.router.navigateByUrl('/login');
      else this.failed.set(true);
    }
  }
}
