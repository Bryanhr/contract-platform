import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { Shell } from '../../../../shell/shell';
import { formatCalendarDate } from '../../format/calendar';
import { contractIcons } from '../../icons';
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
  imports: [Shell, RouterLink, NgIcon],
  providers: [contractIcons],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './contract-list.html',
  styleUrl: './contract-list.css',
})
export class ContractList {
  private readonly showLatest =
    inject(Router).getCurrentNavigation()?.extras.state?.['generated'] === true ||
    (typeof history !== 'undefined' && history.state?.['generated'] === true);
  protected readonly pageSize = 8;
  protected readonly skeleton = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly contracts = signal<ContractSummary[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly opening = signal('');
  protected readonly downloading = signal('');
  protected readonly uploading = signal('');
  protected readonly openFailed = signal('');
  protected readonly page = signal(1);
  protected readonly filtersOpen = signal(false);
  protected readonly filters = signal<ContractFilters>({ ...emptyContractFilters });
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
    const list = this.contracts() ?? [];
    const start = (this.page() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  protected readonly filtering = computed(() => {
    const current = this.filters();
    return Boolean(current.status || current.validity);
  });

  constructor() {
    void this.load(this.showLatest);
  }

  protected toggleFilters() {
    this.filtersOpen.update((open) => !open);
  }

  protected setStatus(event: Event) {
    const value = (event.target as HTMLSelectElement).value as ContractStatusFilter;
    this.filters.update((current) => ({ ...current, status: value }));
    void this.load();
  }

  protected setValidity(event: Event) {
    const value = (event.target as HTMLSelectElement).value as ContractValidityFilter;
    this.filters.update((current) => ({ ...current, validity: value }));
    void this.load();
  }

  protected clearFilters() {
    this.filters.set({ ...emptyContractFilters });
    void this.load();
  }

  protected go(next: number) {
    const page = Math.min(this.pageCount(), Math.max(1, next));
    if (page === this.page()) return;
    this.page.set(page);
    const heading = document.getElementById('contenido');
    const scroller = heading?.closest('.content');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
    if (scroller instanceof HTMLElement) scroller.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
    heading?.focus({ preventScroll: true });
  }

  protected async upload(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!pdf) {
      this.openFailed.set('Solo se aceptan archivos PDF.');
      return;
    }
    this.uploading.set(id);
    this.openFailed.set('');
    try {
      await uploadSigned(id, file);
      this.contracts.set(await getContracts(this.filters()));
    } catch (error) {
      if (!isUnreachable(error)) this.openFailed.set('No se pudo subir el documento firmado.');
    } finally {
      this.uploading.set('');
    }
  }

  protected async download(id: string) {
    if (this.downloading()) return;
    this.downloading.set(id);
    this.openFailed.set('');
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
      if (!isUnreachable(error)) this.openFailed.set('No se pudo descargar el contrato.');
    } finally {
      this.downloading.set('');
    }
  }

  protected async openSigned(id: string) {
    const tab = window.open('', '_blank');
    if (!tab) {
      this.openFailed.set('El navegador bloqueó la ventana del documento.');
      return;
    }
    this.opening.set(id);
    this.openFailed.set('');
    try {
      const file = await signedDocument(id);
      const url = URL.createObjectURL(file);
      tab.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      tab.close();
      if (!isUnreachable(error)) this.openFailed.set('No se pudo abrir el documento firmado.');
    } finally {
      this.opening.set('');
    }
  }

  private async load(showLatest = false) {
    this.failed.set(false);
    this.contracts.set(null);
    this.page.set(1);
    try {
      const list = await getContracts(this.filters());
      this.contracts.set(list);
      if (showLatest) this.page.set(this.pageCount());
    } catch {
      this.failed.set(true);
    }
  }
}
