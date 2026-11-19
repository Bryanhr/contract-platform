import { Component, ElementRef, computed, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { Shell } from '../../../../shell/shell';
import { customerIcons } from '../../icons';
import { Client } from '../../models/client';
import { deleteCustomer, getCustomers } from '../../services/customer-api';

@Component({
  selector: 'app-customer-list',
  imports: [Shell, RouterLink, NgIcon],
  providers: [customerIcons],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.css',
})
export class CustomerList {
  private readonly removeDialog = viewChild<ElementRef<HTMLDialogElement>>('removeDialog');

  protected readonly pageSize = 8;
  protected readonly customers = signal<Client[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly query = signal('');
  protected readonly page = signal(1);
  protected readonly notice = signal('');
  protected readonly removing = signal<Client | null>(null);
  protected readonly deleting = signal(false);
  protected readonly unreachable = unreachable;

  // ponytail: search filters the cached list in the browser; use the API's ?search= if the list gets big.
  protected readonly matches = computed(() => {
    const list = this.customers() ?? [];
    const query = plain(this.query());
    if (!query) return list;
    return list.filter((client) => plain(client.empresa).includes(query) || client.ruc.includes(query));
  });

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.matches().length / this.pageSize)));

  protected readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));

  protected readonly visible = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.matches().slice(start, start + this.pageSize);
  });

  constructor() {
    void this.load();
  }

  protected search(event: Event) {
    this.query.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected go(next: number) {
    const page = Math.min(this.pageCount(), Math.max(1, next));
    if (page === this.page()) return;
    this.page.set(page);
    const heading = document.getElementById('contenido');
    const scroller = heading?.closest('.content');
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (scroller instanceof HTMLElement) scroller.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
    heading?.focus({ preventScroll: true });
  }

  protected askRemove(client: Client) {
    this.removing.set(client);
    this.notice.set('');
    const dialog = this.removeDialog()?.nativeElement;
    if (typeof dialog?.showModal === 'function') dialog.showModal();
  }

  protected async confirmRemove() {
    const client = this.removing();
    if (!client || this.deleting()) return;
    this.deleting.set(true);
    try {
      await deleteCustomer(client.id);
      this.customers.set(await getCustomers());
      if (this.page() > this.pageCount()) this.page.set(this.pageCount());
    } catch (error) {
      if (!isUnreachable(error)) {
        const status = typeof error === 'object' && error && 'status' in error ? error.status : 0;
        this.notice.set(
          status === 409
            ? `${client.empresa} tiene contratos, por eso no se puede eliminar.`
            : `No se pudo eliminar a ${client.empresa}.`,
        );
      }
    } finally {
      this.deleting.set(false);
      this.removeDialog()?.nativeElement.close();
    }
  }

  private async load() {
    this.failed.set(false);
    this.customers.set(null);
    try {
      this.customers.set(await getCustomers());
    } catch {
      this.failed.set(true);
    }
  }
}

function plain(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim();
}
