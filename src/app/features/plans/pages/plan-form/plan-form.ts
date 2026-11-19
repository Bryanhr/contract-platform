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
  protected readonly checked = signal(false);
  protected readonly errors = signal<PlanErrors>({});
  protected readonly failure = signal('');
  protected readonly unreachable = unreachable;
  protected readonly planServices = signal<PlanServiceLink[] | null>(null);
  protected readonly serviceOptions = signal<SupportService[]>([]);
  protected readonly availableServiceOptions = computed(() => {
    const associated = new Set((this.planServices() ?? []).map((service) => service.supportServiceId));
    return this.serviceOptions().filter((service) => !associated.has(service.id));
  });
  protected readonly serviceLoading = signal(false);
  protected readonly serviceFailure = signal('');
  protected readonly serviceNotice = signal('');
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
    this.draft.update((current) => (current ? { ...current, [key]: field.value } : current));
    if (this.checked()) this.errors.set(planErrors(this.draft()!));
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
    const errors = planErrors(draft);
    this.errors.set(errors);
    const first = (['name', 'responseTimeHours', 'monthlyCost', 'durationMonths'] as const).find(
      (field) => errors[field],
    );
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    this.saving.set(true);
    void this.send(draft);
  }

  protected setServiceField(field: 'selectedService' | 'newMonthlyLimit' | 'newExtraCost', event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    if (field === 'selectedService') this.selectedService.set(value);
    else if (field === 'newMonthlyLimit') this.newMonthlyLimit.set(value);
    else this.newExtraCost.set(value);
  }

  protected async associateService(event: Event) {
    event.preventDefault();
    if (!this.selectedService() || this.addingService()) return;
    const values = serviceValues(this.newMonthlyLimit(), this.newExtraCost());
    if (values.error) {
      this.setFeedback('service', values.error);
      return;
    }

    this.addingService.set(true);
    this.clearFeedback('service');
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
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) {
        const status = apiErrorStatus(error);
        this.setFeedback(
          'service',
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
    const values = serviceValues(monthlyLimit, extraCost);
    if (values.error) {
      this.setFeedback('service', values.error);
      return;
    }

    this.savingService.set(service.supportServiceId);
    this.clearFeedback('service');
    try {
      await updatePlanService(this.id, service.supportServiceId, {
        monthlyLimit: values.monthlyLimit,
        extraCost: values.extraCost,
      });
      await this.loadServices();
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) {
        const status = apiErrorStatus(error);
        this.setFeedback(
          'service',
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
    this.removingService.set(service.supportServiceId);
    this.clearFeedback('service');
    try {
      await removePlanService(this.id, service.supportServiceId);
      await this.loadServices();
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) {
        this.setFeedback(
          'service',
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
      await this.router.navigateByUrl('/plans');
    } catch (error) {
      if (isUnreachable(error)) return;
      const status = apiErrorStatus(error);
      if (status === 401) {
        await this.router.navigateByUrl('/login');
      } else if (status === 400) {
        this.errors.set(apiFieldErrors(error));
        this.setFeedback('failure', 'Revisa los datos e inténtalo otra vez.');
      } else if (status === 409) {
        this.errors.set({ name: 'Ya existe un plan con este nombre.' });
        this.clearFeedback('failure');
        document.getElementById('name')?.focus();
      } else if (status === 404) {
        this.setFeedback('failure', 'Este plan ya no existe.');
      } else {
        this.setFeedback('failure', problemDetail(error) || 'No se pudo guardar el plan.');
      }

    } finally {
      this.saving.set(false);
    }
  }

  private setFeedback(scope: 'failure' | 'service', message: string) {
    this.clearFeedback(scope);
    (scope === 'failure' ? this.failure : this.serviceNotice).set(message);
    this.feedbackTimers.set(scope, window.setTimeout(() => this.clearFeedback(scope), 5000));
  }

  private clearFeedback(scope: 'failure' | 'service') {
    const timer = this.feedbackTimers.get(scope);
    if (timer !== undefined) window.clearTimeout(timer);
    this.feedbackTimers.delete(scope);
    (scope === 'failure' ? this.failure : this.serviceNotice).set('');
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
    this.serviceFailure.set('');
    try {
      const [services, options] = await Promise.all([getPlanServices(this.id), getSupportServices()]);
      this.planServices.set(services);
      this.serviceOptions.set(options);
    } catch (error) {
      if (apiErrorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else if (!isUnreachable(error)) this.serviceFailure.set('No se pudieron cargar los servicios del plan.');
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

  if (!/^\d+$/.test(monthlyLimit.trim()) || !Number.isSafeInteger(limit) || limit < 0) {
    return {
      error: 'El límite mensual debe ser un entero mayor o igual que 0.',
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
