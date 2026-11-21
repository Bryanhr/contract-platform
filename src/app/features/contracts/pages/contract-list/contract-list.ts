import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { EmptyState } from '../../../../shared/empty-state/empty-state';
import { Toast, ToastTone } from '../../../../shared/toast/toast';
import { Shell } from '../../../../shell/shell';
import { formatCalendarDate } from '../../format/calendar';
import { contractIcons } from '../../icons';
import { contractListQuery, readContractListState } from '../../list-query';
import { ContractSummary } from '../../models/contract';
import {
  ContractFilters,
  ContractStatusFilter,
  ContractValidityFilter,
  emptyContractFilters,
} from '../../models/contract-filters';
import { contractPdf, getContracts, signedDocument, uploadSigned } from '../../services/contract-api';

@Component({
  selector: 'app-contract-list',
  imports: [Shell, RouterLink, NgIcon, EmptyState, Toast],
  providers: [contractIcons],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './contract-list.html',
  styleUrl: './contract-list.css',
})
export class ContractList {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly navState =
    this.router.getCurrentNavigation()?.extras.state ??
    (typeof history !== 'undefined' ? history.state : null);
  private readonly initial = readContractListState(this.route.snapshot.queryParamMap);
  protected readonly pageSize = 8;
  protected readonly skeleton = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly contracts = signal<ContractSummary[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly opening = signal('');
  protected readonly downloading = signal('');
  protected readonly uploading = signal('');
  protected readonly toast = signal<{ message: string; tone: ToastTone } | null>(null);
  protected readonly page = signal(this.initial.page);
  protected readonly filters = signal<ContractFilters>({ ...this.initial.filters });
  protected readonly filtersOpen = signal(Boolean(this.initial.filters.status || this.initial.filters.validity));
  protected readonly date = formatCalendarDate;
  protected readonly unreachable = unreachable;

  protected readonly pageCount = computed(() => {
    const total = this.contracts()?.length ?? 0;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  protected readonly pages = computed(() =>
    Array.from({ length: this.pageCount() }, (_, index) => index + 1),
  );

  protected readonly visible = computed(() => {
    const list = [...(this.contracts() ?? [])].sort(
      (left, right) =>
        left.cliente.localeCompare(right.cliente, 'es', { sensitivity: 'base' }) ||
        left.plan.localeCompare(right.plan, 'es', { sensitivity: 'base' }),
    );
    const start = (this.page() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  protected readonly filtering = computed(() => {
    const current = this.filters();
    return Boolean(current.status || current.validity);
  });

  protected listQuery(page = this.page()) {
    return contractListQuery(page, this.filters());
  }

  constructor() {
    const notice = this.navState?.['notice'];
    if (typeof notice === 'string') this.showToast(notice, 'success');
    void this.load();
  }

  protected toggleFilters() {
    this.clearToast();
    this.filtersOpen.update((open) => !open);
  }

  protected setStatus(event: Event) {
    this.clearToast();
    const value = (event.target as HTMLSelectElement).value as ContractStatusFilter;
    this.filters.update((current) => ({ ...current, status: value }));
    void this.load({ resetPage: true });
  }

  protected setValidity(event: Event) {
    this.clearToast();
    const value = (event.target as HTMLSelectElement).value as ContractValidityFilter;
    this.filters.update((current) => ({ ...current, validity: value }));
    void this.load({ resetPage: true });
  }

  protected clearFilters() {
    this.clearToast();
    this.filters.set({ ...emptyContractFilters });
    void this.load({ resetPage: true });
  }

  protected go(next: number) {
    const page = Math.min(this.pageCount(), Math.max(1, next));
    if (page === this.page()) return;
    this.setPage(page);
    const heading = document.querySelector('main.content')?.querySelector<HTMLElement>('h1');
    const scroller = heading?.closest('.content');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
    if (scroller instanceof HTMLElement) scroller.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
    heading?.focus({ preventScroll: true });
  }

  private setPage(page: number, syncUrl = true) {
    this.page.set(page);
    if (!syncUrl) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: contractListQuery(page, this.filters()),
      replaceUrl: true,
    });
  }

  private syncFiltersUrl(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: contractListQuery(page, this.filters()),
      replaceUrl: true,
    });
  }

  protected async upload(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!pdf) {
      this.showToast('Solo se aceptan archivos PDF.', 'warning');
      return;
    }
    this.uploading.set(id);
    this.clearToast();
    try {
      await uploadSigned(id, file);
      this.contracts.set(await getContracts(this.filters()));
    } catch (error) {
      if (!isUnreachable(error)) this.showToast('No se pudo subir el documento firmado.', 'danger');
    } finally {
      this.uploading.set('');
    }
  }

  protected async download(id: string) {
    if (this.downloading()) return;
    this.downloading.set(id);
    this.clearToast();
    try {
      const file = await contractPdf(id);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_${id}.pdf`;
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      if (!isUnreachable(error)) this.showToast('No se pudo descargar el contrato.', 'danger');
    } finally {
      this.downloading.set('');
    }
  }

  protected async openSigned(id: string) {
    const tab = window.open('', '_blank');
    if (!tab) {
      this.showToast('El navegador bloqueó la ventana del documento.', 'warning');
      return;
    }
    this.opening.set(id);
    this.clearToast();
    try {
      const file = await signedDocument(id);
      const url = URL.createObjectURL(file);
      tab.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      tab.close();
      if (!isUnreachable(error)) this.showToast('No se pudo abrir el documento firmado.', 'danger');
    } finally {
      this.opening.set('');
    }
  }

  protected clearToast() {
    this.toast.set(null);
  }

  private showToast(message: string, tone: ToastTone) {
    this.toast.set(null);
    queueMicrotask(() => this.toast.set({ message, tone }));
  }

  private async load(options: { resetPage?: boolean } = {}) {
    this.failed.set(false);
    this.contracts.set(null);
    const page = options.resetPage ? 1 : this.page();
    if (options.resetPage) this.page.set(1);
    this.syncFiltersUrl(page);
    try {
      const list = await getContracts(this.filters());
      this.contracts.set(list);
      const pageCount = Math.max(1, Math.ceil(list.length / this.pageSize));
      const clamped = Math.min(this.page(), pageCount);
      if (clamped !== this.page()) this.setPage(clamped);
    } catch {
      this.failed.set(true);
    }
  }
}
