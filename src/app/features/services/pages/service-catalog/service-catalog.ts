import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { EmptyState } from '../../../../shared/empty-state/empty-state';
import { Toast, ToastTone } from '../../../../shared/toast/toast';
import { Shell } from '../../../../shell/shell';
import { planIcons } from '../../../plans/icons';
import { ServiceType, SupportService } from '../../models/service-catalog';
import {
  createServiceType,
  createSupportService,
  deleteServiceType,
  deleteSupportService,
  getServiceTypes,
  getSupportServices,
  updateServiceType,
  updateSupportService,
} from '../../services/service-api';

/** Match `.catalog-fold::details-content` transition duration. */
const CATALOG_FOLD_MS = 280;

interface Feedback {
  type: 'success' | 'error';
  text: string;
}

type Removing =
  | { kind: 'type'; item: ServiceType }
  | { kind: 'service'; item: SupportService };

@Component({
  selector: 'app-service-catalog',
  imports: [Shell, RouterLink, NgIcon, EmptyState, Toast],
  providers: [planIcons, provideIcons({ lucidePlus })],
  templateUrl: './service-catalog.html',
  styleUrl: './service-catalog.css',
})
export class ServiceCatalog {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly removeDialog = viewChild<ElementRef<HTMLDialogElement>>('removeDialog');
  private readonly timers = new Map<string, number>();
  private catalogScrollRaf = 0;
  protected readonly typeSkeleton = [1, 2, 3];
  protected readonly types = signal<ServiceType[] | null>(null);
  protected readonly services = signal<SupportService[] | null>(null);
  protected readonly failed = signal('');
  protected readonly saving = signal('');
  protected readonly deleting = signal(false);
  protected readonly removing = signal<Removing | null>(null);
  protected readonly createServiceTypeFeedback = signal<Feedback | null>(null);
  protected readonly createServiceFeedback = signal<Feedback | null>(null);
  protected readonly serviceTypeRowFeedback = signal<Record<number, Feedback>>({});
  protected readonly serviceRowFeedback = signal<Record<number, Feedback>>({});
  protected readonly toast = signal<{ message: string; tone: ToastTone } | null>(null);
  protected readonly unreachable = unreachable;

  constructor() {
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.catalogScrollRaf));
    void this.load();
  }

  /** Ease scroll up with the collapsing fold above the one just opened. */
  protected followCatalogScroll(event: Event) {
    const details = event.currentTarget;
    if (!(details instanceof HTMLDetailsElement) || !details.open) return;

    const scroller = details.closest('.content');
    const previous = details.previousElementSibling;
    if (!(scroller instanceof HTMLElement) || !(previous instanceof HTMLDetailsElement)) return;

    const collapse = foldBodyHeight(previous);
    if (collapse < 1) return;

    cancelAnimationFrame(this.catalogScrollRaf);
    const from = scroller.scrollTop;
    const to = Math.max(0, from - collapse);
    if (Math.abs(to - from) < 1) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scroller.scrollTop = to;
      return;
    }

    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / CATALOG_FOLD_MS);
      scroller.scrollTop = from + (to - from) * easeInOut(t);
      if (t < 1) this.catalogScrollRaf = requestAnimationFrame(tick);
    };
    this.catalogScrollRaf = requestAnimationFrame(tick);
  }

  protected async createType(event: Event, name: string) {
    event.preventDefault();
    this.clearAllFeedback();
    const form = event.currentTarget as HTMLFormElement;
    if (!name.trim() || this.saving()) {
      if (!name.trim()) this.setCreateType(errorFeedback('Escribe el nombre del tipo de servicio.'));
      return;
    }
    this.saving.set('type');
    try {
      await createServiceType({ name: name.trim() });
      form.reset();
      this.showToast('Tipo de servicio creado.', 'success');
      await this.load();
    } catch (error) {
      this.setCreateType(await this.errorMessage(error, true, 'No se pudo crear el tipo de servicio.'));
    } finally {
      this.saving.set('');
    }
  }

  protected async saveType(event: Event, type: ServiceType, name: string) {
    event.preventDefault();
    this.clearAllFeedback();
    if (!name.trim() || this.saving()) {
      if (!name.trim()) this.setTypeRow(type.id, errorFeedback('Escribe el nombre del tipo de servicio.'));
      return;
    }
    this.saving.set(`type-${type.id}`);
    try {
      await updateServiceType(type.id, { name: name.trim() });
      this.showToast('Tipo de servicio actualizado.', 'success');
      await this.load();
    } catch (error) {
      this.setTypeRow(
        type.id,
        (await this.errorMessage(error, true, 'No se pudo actualizar el tipo de servicio.')) ??
          errorFeedback('No se pudo actualizar el tipo de servicio.'),
      );
    } finally {
      this.saving.set('');
    }
  }

  protected askRemoveType(type: ServiceType) {
    if (this.saving() || this.deleting()) return;
    this.removing.set({ kind: 'type', item: type });
    this.clearToast();
    const dialog = this.removeDialog()?.nativeElement;
    if (typeof dialog?.showModal === 'function') dialog.showModal();
  }

  protected async createService(event: Event, name: string, typeId: string, unit: string) {
    event.preventDefault();
    this.clearAllFeedback();
    const form = event.currentTarget as HTMLFormElement;
    const type = Number(typeId);
    if (!name.trim() || !Number.isSafeInteger(type) || type <= 0 || this.saving()) {
      this.setCreateService(
        errorFeedback(!name.trim() ? 'Escribe el nombre del servicio.' : 'Selecciona un tipo de servicio.'),
      );
      return;
    }
    this.saving.set('service');
    try {
      await createSupportService({ name: name.trim(), serviceTypeId: type, unit: unit.trim() || null });
      form.reset();
      this.showToast('Servicio creado.', 'success');
      await this.load();
    } catch (error) {
      this.setCreateService(await this.errorMessage(error, false, 'No se pudo crear el servicio.'));
    } finally {
      this.saving.set('');
    }
  }

  protected async saveService(event: Event, service: SupportService, name: string, typeId: string, unit: string) {
    event.preventDefault();
    this.clearAllFeedback();
    const type = Number(typeId);
    if (!name.trim() || !Number.isSafeInteger(type) || type <= 0 || this.saving()) {
      this.setServiceRow(
        service.id,
        errorFeedback(!name.trim() ? 'Escribe el nombre del servicio.' : 'Selecciona un tipo de servicio.'),
      );
      return;
    }
    this.saving.set(`service-${service.id}`);
    try {
      await updateSupportService(service.id, { name: name.trim(), serviceTypeId: type, unit: unit.trim() || null });
      this.showToast('Servicio actualizado.', 'success');
      await this.load();
    } catch (error) {
      this.setServiceRow(
        service.id,
        (await this.errorMessage(error, false, 'No se pudo actualizar el servicio.')) ??
          errorFeedback('No se pudo actualizar el servicio.'),
      );
    } finally {
      this.saving.set('');
    }
  }

  protected askRemoveService(service: SupportService) {
    if (this.saving() || this.deleting()) return;
    this.removing.set({ kind: 'service', item: service });
    this.clearToast();
    const dialog = this.removeDialog()?.nativeElement;
    if (typeof dialog?.showModal === 'function') dialog.showModal();
  }

  protected async confirmRemove() {
    const target = this.removing();
    if (!target || this.deleting()) return;
    this.clearToast();
    this.deleting.set(true);
    try {
      if (target.kind === 'type') {
        await deleteServiceType(target.item.id);
        this.showToast(`Tipo de servicio «${target.item.name}» eliminado.`, 'success');
      } else {
        await deleteSupportService(target.item.id);
        this.showToast(`Servicio «${target.item.name}» eliminado.`, 'success');
      }
      await this.load();
    } catch (error) {
      const message =
        target.kind === 'type'
          ? await this.toastMessage(
              error,
              'No se pudo eliminar el tipo de servicio.',
              'Este tipo está asignado a uno o más servicios.',
              'Este tipo de servicio ya no existe.',
            )
          : await this.toastMessage(
              error,
              'No se pudo eliminar el servicio.',
              'Este servicio está asociado a un plan.',
              'Este servicio ya no existe.',
            );
      if (message) this.showToast(message.text, message.tone);
    } finally {
      this.deleting.set(false);
      this.removing.set(null);
      this.removeDialog()?.nativeElement.close();
    }
  }

  protected clearCreateServiceTypeFeedback() {
    this.clearScope('create-type');
  }

  protected clearCreateServiceFeedback() {
    this.clearScope('create-service');
  }

  protected clearTypeRowFeedback(id: number) {
    this.clearScope(`type-${id}`);
  }

  protected clearServiceRowFeedback(id: number) {
    this.clearScope(`service-${id}`);
  }

  protected typeRowMessage(id: number) {
    return this.serviceTypeRowFeedback()[id];
  }

  protected serviceRowMessage(id: number) {
    return this.serviceRowFeedback()[id];
  }

  protected clearToast() {
    this.toast.set(null);
  }

  private showToast(message: string, tone: ToastTone) {
    this.toast.set(null);
    queueMicrotask(() => this.toast.set({ message, tone }));
  }

  private setCreateType(feedback: Feedback | null) {
    this.setTimed('create-type', feedback, this.createServiceTypeFeedback);
  }

  private setCreateService(feedback: Feedback | null) {
    this.setTimed('create-service', feedback, this.createServiceFeedback);
  }

  private setTypeRow(id: number, feedback: Feedback | null) {
    this.setTimed(`type-${id}`, feedback, this.serviceTypeRowFeedback, id);
  }

  private setServiceRow(id: number, feedback: Feedback | null) {
    this.setTimed(`service-${id}`, feedback, this.serviceRowFeedback, id);
  }

  private setTimed<T>(
    scope: string,
    feedback: Feedback | null,
    target: { set(value: T): void },
    id?: number,
  ) {
    this.clearScope(scope);
    if (id === undefined) {
      target.set(feedback as T);
    } else {
      const current = target === this.serviceTypeRowFeedback ? this.serviceTypeRowFeedback() : this.serviceRowFeedback();
      const next = { ...current };
      if (feedback) next[id] = feedback;
      else delete next[id];
      target.set(next as T);
    }
    if (!feedback) return;
    this.timers.set(scope, window.setTimeout(() => this.clearScope(scope), 5000));
  }

  private clearScope(scope: string) {
    const timer = this.timers.get(scope);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      this.timers.delete(scope);
    }
    if (scope === 'create-type') this.createServiceTypeFeedback.set(null);
    else if (scope === 'create-service') this.createServiceFeedback.set(null);
    else if (scope.startsWith('type-')) {
      const id = Number(scope.slice(5));
      this.serviceTypeRowFeedback.update((current) => withoutFeedback(current, id));
    } else if (scope.startsWith('service-')) {
      const id = Number(scope.slice(8));
      this.serviceRowFeedback.update((current) => withoutFeedback(current, id));
    }
  }

  private clearAllFeedback() {
    for (const scope of [...this.timers.keys()]) this.clearScope(scope);
    this.createServiceTypeFeedback.set(null);
    this.createServiceFeedback.set(null);
    this.serviceTypeRowFeedback.set({});
    this.serviceRowFeedback.set({});
    this.clearToast();
  }

  private async load() {
    this.failed.set('');
    try {
      const [types, services] = await Promise.all([getServiceTypes(), getSupportServices()]);
      this.types.set(sortByName(types));
      this.services.set(sortByName(services));
    } catch (error) {
      if (errorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) this.failed.set('No se pudo cargar el catálogo de servicios.');
    }
  }

  private async errorMessage(
    error: unknown,
    isType: boolean,
    fallback: string,
    conflict?: string,
    notFound?: string,
  ): Promise<Feedback | null> {
    const status = errorStatus(error);
    if (status === 401) {
      await this.router.navigateByUrl('/login');
      return null;
    }
    if (isUnreachable(error)) return null;
    if (status === 409) {
      return errorFeedback(conflict ?? (isType ? 'Ya existe un tipo de servicio con ese nombre.' : 'Ya existe un servicio con ese nombre.'));
    }
    if (status === 400) return errorFeedback('Revisa los datos ingresados.');
    if (status === 404) return errorFeedback(notFound ?? 'No se encontró el tipo o servicio seleccionado.');
    return errorFeedback(fallback);
  }

  private async toastMessage(
    error: unknown,
    fallback: string,
    conflict: string,
    notFound: string,
  ): Promise<{ text: string; tone: ToastTone } | null> {
    const status = errorStatus(error);
    if (status === 401) {
      await this.router.navigateByUrl('/login');
      return null;
    }
    if (isUnreachable(error)) return null;
    if (status === 409) return { text: conflict, tone: 'warning' };
    if (status === 404) return { text: notFound, tone: 'warning' };
    return { text: fallback, tone: 'danger' };
  }
}

function errorFeedback(text: string): Feedback {
  return { type: 'error', text };
}

function withoutFeedback(current: Record<number, Feedback>, id: number) {
  const next = { ...current };
  delete next[id];
  return next;
}

function errorStatus(error: unknown): number {
  if (typeof error !== 'object' || error === null || !('status' in error)) return 0;
  return typeof error.status === 'number' ? error.status : 0;
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }));
}

function foldBodyHeight(details: HTMLDetailsElement): number {
  let height = 0;
  for (const child of details.children) {
    if (!(child instanceof HTMLElement) || child.localName === 'summary') continue;
    const style = getComputedStyle(child);
    height +=
      child.getBoundingClientRect().height +
      (Number.parseFloat(style.marginBlockStart) || 0) +
      (Number.parseFloat(style.marginBlockEnd) || 0);
  }
  return height;
}

/** Same curve as CSS `ease-in-out`. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
