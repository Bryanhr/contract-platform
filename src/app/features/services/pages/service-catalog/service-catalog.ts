import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { isUnreachable, unreachable } from '../../../../core/outage';
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

interface Feedback {
  type: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-service-catalog',
  imports: [Shell, RouterLink, NgIcon],
  providers: [planIcons],
  templateUrl: './service-catalog.html',
  styleUrl: './service-catalog.css',
})
export class ServiceCatalog {
  private readonly router = inject(Router);
  private readonly timers = new Map<string, number>();

  protected readonly types = signal<ServiceType[] | null>(null);
  protected readonly services = signal<SupportService[] | null>(null);
  protected readonly failed = signal('');
  protected readonly saving = signal('');
  protected readonly createServiceTypeFeedback = signal<Feedback | null>(null);
  protected readonly createServiceFeedback = signal<Feedback | null>(null);
  protected readonly serviceTypeRowFeedback = signal<Record<number, Feedback>>({});
  protected readonly serviceRowFeedback = signal<Record<number, Feedback>>({});
  protected readonly deleteServiceTypeFeedback = signal<Feedback | null>(null);
  protected readonly deleteServiceFeedback = signal<Feedback | null>(null);
  protected readonly unreachable = unreachable;

  constructor() {
    void this.load();
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
      this.setCreateType(successFeedback('Tipo de servicio creado correctamente.'));
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
      this.setTypeRow(type.id, successFeedback('Tipo de servicio actualizado correctamente.'));
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

  protected async removeType(type: ServiceType) {
    if (this.saving()) return;
    this.clearAllFeedback();
    this.saving.set(`delete-type-${type.id}`);
    try {
      await deleteServiceType(type.id);
      this.setDeleteType(successFeedback(`Tipo de servicio «${type.name}» eliminado correctamente.`));
      await this.load();
    } catch (error) {
      this.setTypeRow(
        type.id,
        (await this.errorMessage(
          error,
          true,
          'No se pudo eliminar el tipo de servicio.',
          'No se puede eliminar este tipo de servicio porque está asignado a uno o más servicios.',
          'Este tipo de servicio ya no existe.',
        )) ?? errorFeedback('No se pudo eliminar el tipo de servicio.'),
      );
    } finally {
      this.saving.set('');
    }
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
      this.setCreateService(successFeedback('Servicio creado correctamente.'));
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
      this.setServiceRow(service.id, successFeedback('Servicio actualizado correctamente.'));
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

  protected async removeService(service: SupportService) {
    if (this.saving()) return;
    this.clearAllFeedback();
    this.saving.set(`delete-service-${service.id}`);
    try {
      await deleteSupportService(service.id);
      this.setDeleteService(successFeedback(`Servicio «${service.name}» eliminado correctamente.`));
      await this.load();
    } catch (error) {
      this.setServiceRow(
        service.id,
        (await this.errorMessage(
          error,
          false,
          'No se pudo eliminar el servicio.',
          'No se puede eliminar este servicio porque está asociado a un plan.',
          'Este servicio ya no existe.',
        )) ?? errorFeedback('No se pudo eliminar el servicio.'),
      );
    } finally {
      this.saving.set('');
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

  protected closeDeleteTypeFeedback() {
    this.clearScope('delete-type');
  }

  protected closeDeleteServiceFeedback() {
    this.clearScope('delete-service');
  }

  private setCreateType(feedback: Feedback | null) {
    this.setTimed('create-type', feedback, this.createServiceTypeFeedback);
  }

  private setCreateService(feedback: Feedback | null) {
    this.setTimed('create-service', feedback, this.createServiceFeedback);
  }

  private setDeleteType(feedback: Feedback | null) {
    this.setTimed('delete-type', feedback, this.deleteServiceTypeFeedback);
  }

  private setDeleteService(feedback: Feedback | null) {
    this.setTimed('delete-service', feedback, this.deleteServiceFeedback);
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
    else if (scope === 'delete-type') this.deleteServiceTypeFeedback.set(null);
    else if (scope === 'delete-service') this.deleteServiceFeedback.set(null);
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
    this.deleteServiceTypeFeedback.set(null);
    this.deleteServiceFeedback.set(null);
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
}

function successFeedback(text: string): Feedback {
  return { type: 'success', text };
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
