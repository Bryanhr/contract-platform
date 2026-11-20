import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { Shell } from '../../../../shell/shell';
import { getSupportServices } from '../../../services/services/service-api';
import { SupportService } from '../../../services/models/service-catalog';
import { planIcons } from '../../icons';
import { toPlanRequest } from '../../mappers/plan.mapper';
import { PlanDraft } from '../../models/plan-draft';
import { PlanServiceLink } from '../../models/plan-service-link';
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
  problemDetail,
} from '../../validation/plan-errors';

const blank: PlanDraft = {
  name: '',
  responseTimeHours: '',
  monthlyCost: '',
  durationMonths: '',
};

type FeedbackScope = 'plan' | 'services' | 'add' | `service:${number}`;
type FeedbackKind = 'success' | 'error';

interface Feedback {
  message: string;
  kind: FeedbackKind;
}

@Component({
  selector: 'app-plan-form',
  imports: [Shell, RouterLink, NgIcon],
  providers: [planIcons],
  templateUrl: './plan-form.html',
  styleUrl: './plan-form.css',
})
export class PlanForm {
  private readonly router = inject(Router);
  private readonly routeId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly feedbackTimers = new Map<string, number>();

  protected readonly id = Number(this.routeId);
  protected readonly editing = Boolean(this.routeId);
  protected readonly draft = signal<PlanDraft | null>(this.editing ? null : { ...blank });
  protected readonly failed = signal('');
  protected readonly saving = signal(false);
  protected readonly errors = signal<PlanErrors>({});
  protected readonly feedbacks = signal<Record<string, Feedback>>({});
  protected readonly unreachable = unreachable;
  protected readonly planServices = signal<PlanServiceLink[] | null>(null);
  protected readonly serviceOptions = signal<SupportService[]>([]);
  protected readonly availableServiceOptions = computed(() => {
    const associated = new Set((this.planServices() ?? []).map((service) => service.supportServiceId));
    return this.serviceOptions().filter((service) => !associated.has(service.id));
  });
  protected readonly serviceLoading = signal(false);
  protected readonly addingService = signal(false);
  protected readonly savingService = signal<number | null>(null);
  protected readonly removingService = signal<number | null>(null);
  protected readonly selectedService = signal('');
  protected readonly newMonthlyLimit = signal('');
  protected readonly newExtraCost = signal('');

  constructor() {
    if (this.editing) void this.load();
  }

  protected set(event: Event) {
    const field = event.target as HTMLInputElement;
    const key = field.name as PlanField;
    this.clearAllFeedback();
    this.draft.update((current) => (current ? { ...current, [key]: field.value } : current));
  }

  protected feedback(scope: string) {
    return this.feedbacks()[scope]?.message ?? '';
  }

  protected feedbackKind(scope: string) {
    return this.feedbacks()[scope]?.kind ?? 'error';
  }

  protected selectedServiceOption() {
    const id = Number(this.selectedService());
    return this.serviceOptions().find((service) => service.id === id);
  }

  protected clearMessagesOnEdit() {
    this.clearAllFeedback();
  }

  protected error(field: PlanField) {
    return this.errors()[field];
  }

  protected save(event: Event) {
    event.preventDefault();
    const draft = this.draft();
    if (!draft || this.saving()) return;
    this.clearAllFeedback();
    const errors = planErrors(draft);
    this.errors.set(errors);
    const first = (['name', 'responseTimeHours', 'monthlyCost', 'durationMonths'] as const).find(
      (field) => errors[field],
    );
    if (first) {
      this.setFeedback('plan', 'Corrige los campos marcados e inténtalo otra vez.');
      document.getElementById(first)?.focus();
      return;
    }
    this.saving.set(true);
    void this.send(draft);
  }

  protected setServiceField(field: 'selectedService' | 'newMonthlyLimit' | 'newExtraCost', event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.clearAllFeedback();
    if (field === 'selectedService') this.selectedService.set(value);
    else if (field === 'newMonthlyLimit') this.newMonthlyLimit.set(value);
    else this.newExtraCost.set(value);
  }

  protected async associateService(event: Event) {
    event.preventDefault();
    if (this.addingService()) return;
    this.clearAllFeedback();
    if (!this.selectedService()) {
      this.setFeedback('add', 'Selecciona un servicio.');
      return;
    }
    const values = serviceValues(this.newMonthlyLimit(), this.newExtraCost());
    if (values.error) {
      this.setFeedback('add', values.error);
      return;
    }

    this.addingService.set(true);
    try {
      await addPlanService(this.id, {
        supportServiceId: Number(this.selectedService()),
        monthlyLimit: values.monthlyLimit,
        extraCost: values.extraCost,
      });
      this.selectedService.set('');
      this.newMonthlyLimit.set('');
      this.newExtraCost.set('');
      await this.loadServices();
      this.setFeedback('add', 'Servicio asociado al plan.', 'success');
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) {
        const status = apiErrorStatus(error);
        this.setFeedback(
          'add',
          status === 409
            ? 'Este servicio ya está asociado al plan.'
            : status === 400
              ? 'Revisa el límite y el costo adicional.'
              : status === 404
                ? 'No se encontró el plan o el servicio seleccionado.'
                : 'No se pudo asociar el servicio.',
        );
      }
    } finally {
      this.addingService.set(false);
    }
  }

  protected async saveService(event: Event, service: PlanServiceLink, monthlyLimit: string, extraCost: string) {
    event.preventDefault();
    if (this.savingService() !== null) return;
    this.clearAllFeedback();
    const values = serviceValues(monthlyLimit, extraCost);
    const scope = `service:${service.supportServiceId}` as const;
    if (values.error) {
      this.setFeedback(scope, values.error);
      return;
    }

    this.savingService.set(service.supportServiceId);
    try {
      await updatePlanService(this.id, service.supportServiceId, {
        monthlyLimit: values.monthlyLimit,
        extraCost: values.extraCost,
      });
      await this.loadServices();
      this.setFeedback(scope, 'Cambios del servicio guardados.', 'success');
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) {
        const status = apiErrorStatus(error);
        this.setFeedback(
          scope,
          status === 400
            ? 'Revisa el límite y el costo adicional.'
            : status === 404
              ? 'Este servicio ya no está asociado al plan.'
              : 'No se pudieron guardar los cambios del servicio.',
        );
      }
    } finally {
      this.savingService.set(null);
    }
  }

  protected async removeService(service: PlanServiceLink) {
    if (this.removingService() !== null) return;
    this.clearAllFeedback();
    this.removingService.set(service.supportServiceId);
    try {
      await removePlanService(this.id, service.supportServiceId);
      await this.loadServices();
      this.setFeedback('services', 'Servicio quitado del plan.', 'success');
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) {
        this.setFeedback(
          `service:${service.supportServiceId}`,
          apiErrorStatus(error) === 404
            ? 'Este servicio ya no está asociado al plan.'
            : 'No se pudo quitar el servicio del plan.',
        );
      }
    } finally {
      this.removingService.set(null);
    }
  }

  private async send(draft: PlanDraft) {
    try {
      const request = toPlanRequest(draft);
      if (this.editing) await updatePlan(this.id, request);
      else await createPlan(request);
      await this.router.navigateByUrl('/plans', {
        state: { notice: this.editing ? 'Plan actualizado correctamente.' : 'Plan creado correctamente.' },
      });
    } catch (error) {
      if (isUnreachable(error)) return;
      const status = apiErrorStatus(error);
      if (status === 401) {
        await this.router.navigateByUrl('/login');
      } else if (status === 400) {
        this.errors.set(apiFieldErrors(error));
        this.setFeedback('plan', 'Revisa los datos e inténtalo otra vez.');
      } else if (status === 409) {
        this.errors.set({ name: 'Ya existe un plan con este nombre.' });
        this.setFeedback('plan', 'Ya existe un plan con este nombre.');
        document.getElementById('name')?.focus();
      } else if (status === 404) {
        this.setFeedback('plan', 'Este plan ya no existe.');
      } else {
        this.setFeedback('plan', problemDetail(error) || 'No se pudo guardar el plan.');
      }

    } finally {
      this.saving.set(false);
    }
  }

  private setFeedback(scope: FeedbackScope, message: string, kind: FeedbackKind = 'error') {
    this.clearFeedback(scope);
    this.feedbacks.update((current) => ({ ...current, [scope]: { message, kind } }));
    this.feedbackTimers.set(
      scope,
      window.setTimeout(() => {
        this.clearFeedback(scope);
        if (scope === 'plan') this.errors.set({});
      }, 5000),
    );
  }

  private clearFeedback(scope: FeedbackScope) {
    const timer = this.feedbackTimers.get(scope);
    if (timer !== undefined) window.clearTimeout(timer);
    this.feedbackTimers.delete(scope);
    this.feedbacks.update((current) => {
      const { [scope]: _removed, ...remaining } = current;
      return remaining;
    });
  }

  private clearAllFeedback() {
    for (const timer of this.feedbackTimers.values()) window.clearTimeout(timer);
    this.feedbackTimers.clear();
    this.feedbacks.set({});
    this.errors.set({});
  }

  private async load() {
    if (!Number.isSafeInteger(this.id) || this.id <= 0) {
      this.failed.set('El identificador del plan no es válido.');
      return;
    }
    try {
      const plan = await getPlan(this.id);
      this.draft.set({
        name: plan.name,
        responseTimeHours: String(plan.responseTimeHours),
        monthlyCost: String(plan.monthlyCost),
        durationMonths: String(plan.durationMonths),
      });
      void this.loadServices();
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
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) {
        this.setFeedback('services', 'No se pudieron cargar los servicios del plan.');
      }
    } finally {
      this.serviceLoading.set(false);
    }
  }
}

function serviceValues(monthlyLimit: string, extraCost: string) {
  const costMatch = /^(\d+)(?:\.(\d{1,2}))?$/.exec(extraCost.trim());
  const integerDigits = costMatch?.[1].replace(/^0+/, '') ?? '';
  const limit = Number(monthlyLimit);
  const cost = Number(extraCost);

  if (!/^\d+$/.test(monthlyLimit.trim()) || !Number.isSafeInteger(limit) || limit < 1) {
    return {
      error: 'El límite mensual debe ser un entero mayor o igual que 1.',
      monthlyLimit: 0,
      extraCost: 0,
    };
  }
  if (!costMatch || integerDigits.length > 8 || !Number.isFinite(cost) || cost < 0) {
    return {
      error: 'El costo adicional debe ser mayor o igual que 0, con hasta 8 cifras enteras y máximo 2 decimales.',
      monthlyLimit: limit,
      extraCost: 0,
    };
  }
  return { error: '', monthlyLimit: limit, extraCost: cost };
}
