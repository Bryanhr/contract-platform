import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { listPageQuery, readListPage } from '../../../../core/list-page';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { EmptyState, noSearchResults } from '../../../../shared/empty-state/empty-state';
import { Toast, ToastTone } from '../../../../shared/toast/toast';
import { Shell } from '../../../../shell/shell';
import { customerIcons } from '../../icons';
import { Client } from '../../models/client';
import { deleteCustomer, getCustomers } from '../../services/customer-api';

@Component({
  selector: 'app-customer-list',
  imports: [Shell, RouterLink, NgIcon, EmptyState, Toast],
  providers: [customerIcons],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.css',
})
export class CustomerList {
  protected readonly noSearchResults = noSearchResults;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly removeDialog = viewChild<ElementRef<HTMLDialogElement>>('removeDialog');
  protected readonly pageSize = 8;
  protected readonly skeleton = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly customers = signal<Client[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly query = signal('');
  protected readonly page = signal(readListPage(this.route.snapshot.queryParamMap.get('page')));
  protected readonly listPageQuery = listPageQuery;
  protected readonly toast = signal<{ message: string; tone: ToastTone } | null>(null);
  protected readonly removing = signal<Client | null>(null);
  protected readonly deleting = signal(false);
  protected readonly unreachable = unreachable;

  // ponytail: search filters the cached list in the browser; use the API's ?search= if the list gets big.
  protected readonly matches = computed(() => {
    const list = this.customers() ?? [];
    const query = plain(this.query());
    return list
      .filter((client) => !query || plain(client.empresa).includes(query) || client.ruc.includes(query))
      .sort((left, right) => left.empresa.localeCompare(right.empresa, 'es', { sensitivity: 'base' }));
  });

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.matches().length / this.pageSize)));

  protected readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));

  protected readonly visible = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.matches().slice(start, start + this.pageSize);
  });

  constructor() {
    const notice = this.router.getCurrentNavigation()?.extras.state?.['notice'];
    if (typeof notice === 'string') this.showToast(notice, 'success');
    void this.load();
  }

  protected search(event: Event) {
    this.clearToast();
    this.query.set((event.target as HTMLInputElement).value);
    this.setPage(1);
  }

  protected clearSearch() {
    this.clearToast();
    this.query.set('');
    this.setPage(1);
    document.getElementById('buscar')?.focus();
  }

  protected go(next: number) {
    const page = Math.min(this.pageCount(), Math.max(1, next));
    if (page === this.page()) return;
    this.setPage(page);
    const heading = document.querySelector('main.content')?.querySelector<HTMLElement>('h1');
    const scroller = heading?.closest('.content');
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (scroller instanceof HTMLElement) scroller.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
    heading?.focus({ preventScroll: true });
  }

  private setPage(page: number) {
    this.page.set(page);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: listPageQuery(page),
      replaceUrl: true,
    });
  }

  protected askRemove(client: Client) {
    this.removing.set(client);
    this.clearToast();
    const dialog = this.removeDialog()?.nativeElement;
    if (typeof dialog?.showModal === 'function') dialog.showModal();
  }

  protected async confirmRemove() {
    const client = this.removing();
    if (!client || this.deleting()) return;
    this.clearToast();
    this.deleting.set(true);
    try {
      await deleteCustomer(client.id);
      this.customers.set(await getCustomers());
      if (this.page() > this.pageCount()) this.setPage(this.pageCount());
      this.showToast(`Cliente «${client.empresa}» eliminado.`, 'success');
    } catch (error) {
      if (!isUnreachable(error)) {
        const status = typeof error === 'object' && error && 'status' in error ? error.status : 0;
        this.showToast(
          status === 409
            ? `${client.empresa} tiene contratos asociados.`
            : `No se pudo eliminar a ${client.empresa}.`,
          status === 409 ? 'warning' : 'danger',
        );
      }
    } finally {
      this.deleting.set(false);
      this.removeDialog()?.nativeElement.close();
    }
  }

  protected clearToast() {
    this.toast.set(null);
  }

  private showToast(message: string, tone: ToastTone) {
    this.toast.set(null);
    queueMicrotask(() => this.toast.set({ message, tone }));
  }

  private async load() {
    this.failed.set(false);
    this.customers.set(null);
    try {
      this.customers.set(await getCustomers());
      if (this.page() > this.pageCount()) this.setPage(this.pageCount());
    } catch {
      this.failed.set(true);
    }
  }
}

function plain(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim();
}
