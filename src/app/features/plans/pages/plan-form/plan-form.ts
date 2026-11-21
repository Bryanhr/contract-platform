import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { focusField } from '../../../../core/focus-field';
import { listPageQuery, readListPage } from '../../../../core/list-page';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { FieldTip } from '../../../../shared/field-tip/field-tip';
import { NumberField } from '../../../../shared/number-field/number-field';
import { Shell } from '../../../../shell/shell';
import { getSupportServices } from '../../../services/services/service-api';
import { SupportService } from '../../../services/models/service-catalog';
import { planIcons } from '../../icons';
import { toPlanRequest } from '../../mappers/plan.mapper';
import { PlanDraft } from '../../models/plan-draft';
import { PlanServiceAddRequest, PlanServiceLink } from '../../models/plan-service-link';
import {
  addPlanService,
  createPlan,
  getPlan,
  getPlanServices,
  removePlanService,
  updatePlan,
  updatePlanService,
} from '../../services/plan-api';
import {
  apiErrorStatus,
  apiFieldErrors,
  PlanErrors,
  PlanField,
  planErrors,
  PlanServiceFieldErrors,
  planServiceFieldErrors,
  planServiceValues,
  problemDetail,
} from '../../validation/plan-errors';

const blank: PlanDraft = {
  name: '',
  responseTimeHours: '',
  monthlyCost: '',
  durationMonths: '',
};

type FeedbackScope = 'failure' | 'service';

@Component({
  selector: 'app-plan-form',
  imports: [Shell, RouterLink, NgIcon, FieldTip, NumberField],
  providers: [planIcons],
  templateUrl: './plan-form.html',
  styleUrl: './plan-form.css',
})
export class PlanForm {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routeId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly feedbackTimers = new Map<string, number>();

  protected readonly id = Number(this.routeId);
  protected readonly editing = Boolean(this.routeId);
  protected readonly listQuery = listPageQuery(readListPage(this.route.snapshot.queryParamMap.get('page')));
  protected readonly draft = signal<PlanDraft | null>(this.editing ? null : { ...blank });
  protected readonly failed = signal('');
  protected readonly saving = signal(false);
  protected readonly checked = signal(false);
  protected readonly errors = signal<PlanErrors>({});
  protected readonly failure = signal('');
  protected readonly unreachable = unreachable;
  protected readonly planServices = signal<PlanServiceLink[]>([]);
  protected readonly serviceOptions = signal<SupportService[]>([]);
  protected readonly pendingServices = signal<Record<number, PendingService>>({});
  protected readonly originalServices = signal<Record<number, PendingService>>({});
  protected readonly pendingErrors = signal<Record<number, PlanServiceFieldErrors>>({});
  protected readonly selectedServiceCount = computed(() => Object.keys(this.pendingServices()).length);
  protected readonly serviceEntries = computed(() => {
    const pending = this.pendingServices();
    const options = new Map(this.serviceOptions().map((service) => [service.id, service]));
    const links = new Map(this.planServices().map((service) => [service.supportServiceId, service]));
    const linkedOrder = this.planServices()
      .map((service) => service.supportServiceId)
      .filter((serviceId) => pending[serviceId] !== undefined);
    const linked = new Set(linkedOrder);
    const added = Object.keys(pending)
      .map(Number)
      .filter((serviceId) => !linked.has(serviceId));

    return [...linkedOrder, ...added].map((serviceId) => {
      const option = options.get(serviceId);
      const link = links.get(serviceId);
      return {
        service: {
          id: serviceId,
          name: option?.name ?? link?.name ?? 'Servicio',
          serviceTypeName: option?.serviceTypeName ?? link?.serviceType ?? '',
          unit: option?.unit ?? link?.unit ?? '',
        },
        values: pending[serviceId]!,
      };
    });
  });
  protected readonly creatableServiceOptions = computed(() => {
    const pending = this.pendingServices();
    return this.serviceOptions().filter((service) => pending[service.id] === undefined);
  });
  protected readonly servicesPanelOpen = signal(false);
  protected readonly serviceLoading = signal(false);
  protected readonly serviceFailure = signal('');

  constructor() {
    if (this.editing) void this.load();
    else void this.loadCatalog();
  }

  protected set(event: Event) {
    const field = event.target as HTMLInputElement;
    const key = field.name as PlanField;
    this.clearFeedback('failure');
    this.errors.update((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    this.draft.update((current) => (current ? { ...current, [key]: field.value } : current));
  }

  protected error(field: PlanField) {
    return this.errors()[field];
  }

  protected save(event: Event) {
    event.preventDefault();
    const draft = this.draft();
    if (!draft || this.saving()) return;
    this.checked.set(true);
    this.clearFeedback('failure');
    this.clearFeedback('service');

    const errors = planErrors(draft);
    this.errors.set(errors);

    this.syncPendingFromDom();
    const pendingErrors = this.collectPendingErrors();
    this.pendingErrors.set(pendingErrors);
    const firstPending = this.firstPendingErrorTarget(pendingErrors);
    if (firstPending) this.openServicesPanel();

    const firstPlan = (['name', 'responseTimeHours', 'monthlyCost', 'durationMonths'] as const).find(
      (field) => errors[field],
    );
    if (firstPlan) {
      void focusField(firstPlan);
      return;
    }
    if (firstPending) {
      void this.focusAfterPaint(firstPending);
      return;
    }

    this.saving.set(true);
    void this.send(draft);
  }

  protected pendingError(serviceId: number, field: keyof PlanServiceFieldErrors) {
    return this.pendingErrors()[serviceId]?.[field] ?? '';
  }

  protected onServicesToggle(event: Event) {
    this.servicesPanelOpen.set((event.target as HTMLDetailsElement).open);
  }

  protected addPendingService(event: Event) {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    const serviceId = Number(select.value);
    select.value = '';
    if (!Number.isSafeInteger(serviceId) || serviceId <= 0) return;
    if (this.pendingServices()[serviceId]) return;
    this.pendingServices.update((current) => ({
      ...current,
      [serviceId]: { monthlyLimit: '', extraCost: '' },
    }));
    this.openServicesPanel();
    this.clearFeedback('service');
  }

  protected removePendingService(serviceId: number) {
    this.pendingServices.update((current) => {
      const next = { ...current };
      delete next[serviceId];
      return next;
    });
    this.pendingErrors.update((current) => {
      const next = { ...current };
      delete next[serviceId];
      return next;
    });
    this.clearFeedback('service');
  }

  protected setPendingServiceField(serviceId: number, field: 'monthlyLimit' | 'extraCost', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.pendingServices.update((current) => {
      const entry = current[serviceId];
      if (!entry) return current;
      return { ...current, [serviceId]: { ...entry, [field]: value } };
    });
    if (this.checked()) {
      const entry = this.pendingServices()[serviceId];
      if (!entry) return;
      const nextErrors = planServiceFieldErrors(entry.monthlyLimit, entry.extraCost);
      this.pendingErrors.update((current) => {
        const next = { ...current };
        const merged: PlanServiceFieldErrors = { ...(next[serviceId] ?? {}) };
        // Only refresh the field being edited — don't invent errors on the sibling.
        if (field === 'monthlyLimit') {
          if (nextErrors.monthlyLimit) merged.monthlyLimit = nextErrors.monthlyLimit;
          else delete merged.monthlyLimit;
        } else if (nextErrors.extraCost) merged.extraCost = nextErrors.extraCost;
        else delete merged.extraCost;
        if (merged.monthlyLimit || merged.extraCost) next[serviceId] = merged;
        else delete next[serviceId];
        return next;
      });
    }
    this.clearFeedback('service');
  }

  private async send(draft: PlanDraft) {
    try {
      const request = toPlanRequest(draft);
      const pending = this.preparedPendingServices();
      if (!pending) {
        this.syncPendingFromDom();
        const pendingErrors = this.collectPendingErrors();
        this.pendingErrors.set(pendingErrors);
        this.openServicesPanel();
        const firstPending = this.firstPendingErrorTarget(pendingErrors);
        if (firstPending) void this.focusAfterPaint(firstPending);
        return;
      }

      if (this.editing) {
        await updatePlan(this.id, request);
        await this.syncLinkedServices(pending);
        await this.router.navigate(['/plans'], {
          queryParams: this.listQuery,
          state: { notice: 'Plan actualizado.' },
        });
        return;
      }

      const created = await createPlan(request);
      try {
        for (const service of pending) {
          await addPlanService(created.id, service);
        }
        await this.router.navigateByUrl('/plans', { state: { notice: 'Plan creado.' } });
      } catch (error) {
        if (apiErrorStatus(error) === 401) {
          await this.router.navigateByUrl('/login');
          return;
        }
        if (!isUnreachable(error)) {
          await this.router.navigateByUrl(`/plans/${created.id}/edit`);
        }
      }
    } catch (error) {
      if (isUnreachable(error)) return;
      const status = apiErrorStatus(error);
      if (status === 401) {
        await this.router.navigateByUrl('/login');
      } else if (status === 400) {
        const fieldErrors = apiFieldErrors(error);
        this.errors.set(fieldErrors);
        this.setFeedback('failure', 'Revisa los datos.');
        const first = (['name', 'responseTimeHours', 'monthlyCost', 'durationMonths'] as const).find(
          (field) => fieldErrors[field],
        );
        void focusField(first ?? 'name');
      } else if (status === 409) {
        this.errors.set({ name: 'Ese nombre ya existe.' });
        this.clearFeedback('failure');
        void focusField('name');
      } else if (status === 404) {
        this.setFeedback('failure', 'Ese plan ya no existe.');
      } else {
        this.setFeedback('failure', problemDetail(error) || 'No se pudo guardar.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async syncLinkedServices(pending: PlanServiceAddRequest[]) {
    const next = new Map(pending.map((service) => [service.supportServiceId, service]));
    const original = this.originalServices();

    for (const id of Object.keys(original).map(Number)) {
      if (!next.has(id)) await removePlanService(this.id, id);
    }

    for (const [id, values] of next) {
      const previous = original[id];
      if (!previous) {
        await addPlanService(this.id, values);
        continue;
      }
      const previousLimit = Number(previous.monthlyLimit);
      const previousExtra = Number(previous.extraCost);
      if (previousLimit !== values.monthlyLimit || previousExtra !== values.extraCost) {
        await updatePlanService(this.id, id, {
          monthlyLimit: values.monthlyLimit,
          extraCost: values.extraCost,
        });
      }
    }
  }

  private openServicesPanel() {
    this.servicesPanelOpen.set(true);
    const panel = document.getElementById('plan-services-fold');
    if (panel instanceof HTMLDetailsElement) panel.open = true;
  }

  private async focusAfterPaint(target: string) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await focusField(target);
  }

  private syncPendingFromDom() {
    this.pendingServices.update((current) => {
      const next: Record<number, PendingService> = { ...current };
      for (const id of Object.keys(next)) {
        const serviceId = Number(id);
        const limit = document.getElementById(`limit-${serviceId}`);
        const extra = document.getElementById(`extra-${serviceId}`);
        const entry = next[serviceId];
        if (!entry) continue;
        next[serviceId] = {
          monthlyLimit: limit instanceof HTMLInputElement ? limit.value : entry.monthlyLimit,
          extraCost: extra instanceof HTMLInputElement ? extra.value : entry.extraCost,
        };
      }
      return next;
    });
  }

  private collectPendingErrors() {
    const result: Record<number, PlanServiceFieldErrors> = {};
    for (const [id, values] of Object.entries(this.pendingServices())) {
      const serviceId = Number(id);
      const fieldErrors = planServiceFieldErrors(values.monthlyLimit, values.extraCost);
      if (fieldErrors.monthlyLimit || fieldErrors.extraCost) result[serviceId] = fieldErrors;
    }
    return result;
  }

  private firstPendingErrorTarget(errors: Record<number, PlanServiceFieldErrors>) {
    for (const entry of this.serviceEntries()) {
      const fieldErrors = errors[entry.service.id];
      if (!fieldErrors) continue;
      if (fieldErrors.monthlyLimit) return `limit-${entry.service.id}`;
      if (fieldErrors.extraCost) return `extra-${entry.service.id}`;
    }
    return null;
  }

  private preparedPendingServices(): PlanServiceAddRequest[] | null {
    const prepared: PlanServiceAddRequest[] = [];
    for (const [id, values] of Object.entries(this.pendingServices())) {
      const parsed = planServiceValues(values.monthlyLimit, values.extraCost);
      if (parsed.error) return null;
      prepared.push({
        supportServiceId: Number(id),
        monthlyLimit: parsed.monthlyLimit,
        extraCost: parsed.extraCost,
      });
    }
    return prepared;
  }

  private setFeedback(scope: FeedbackScope, message: string) {
    this.clearFeedback(scope);
    if (scope === 'failure') this.failure.set(message);
    this.feedbackTimers.set(
      scope,
      window.setTimeout(() => this.clearFeedback(scope), 5000),
    );
  }

  private clearFeedback(scope: FeedbackScope) {
    const timer = this.feedbackTimers.get(scope);
    if (timer !== undefined) window.clearTimeout(timer);
    this.feedbackTimers.delete(scope);
    if (scope === 'failure') this.failure.set('');
  }

  private async load() {
    if (!Number.isSafeInteger(this.id) || this.id <= 0) {
      this.failed.set('Identificador de plan inválido.');
      return;
    }
    try {
      const plan = await getPlan(this.id);
      await this.loadServices();
      this.draft.set({
        name: plan.name,
        responseTimeHours: String(plan.responseTimeHours),
        monthlyCost: String(plan.monthlyCost),
        durationMonths: String(plan.durationMonths),
      });
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) this.failed.set('No se pudo cargar el plan.');
    }
  }

  private async loadServices() {
    this.serviceLoading.set(true);
    try {
      const [services, options] = await Promise.all([getPlanServices(this.id), getSupportServices()]);
      this.planServices.set(services);
      this.serviceOptions.set(options);
      const seeded = Object.fromEntries(
        services.map((service) => [
          service.supportServiceId,
          {
            monthlyLimit: String(service.monthlyLimit),
            extraCost: String(service.extraCost),
          },
        ]),
      );
      this.pendingServices.set(seeded);
      this.originalServices.set(structuredClone(seeded));
      if (services.length > 0) this.openServicesPanel();
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) this.serviceFailure.set('No se pudieron cargar los servicios.');
    } finally {
      this.serviceLoading.set(false);
    }
  }

  private async loadCatalog() {
    this.serviceLoading.set(true);
    this.serviceFailure.set('');
    try {
      this.serviceOptions.set(await getSupportServices());
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) this.serviceFailure.set('No se pudieron cargar los servicios.');
    } finally {
      this.serviceLoading.set(false);
    }
  }
}

interface PendingService {
  monthlyLimit: string;
  extraCost: string;
}
