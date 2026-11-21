import {
  afterRenderEffect,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { map } from 'rxjs';
import { focusField } from '../../../../core/focus-field';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { EmptyState } from '../../../../shared/empty-state/empty-state';
import { Shell } from '../../../../shell/shell';
import { readTemplate } from '../../document/read-template';
import { addMonths, formatCalendarDate, todayIso } from '../../format/calendar';
import { serviceLine } from '../../format/service-line';
import { soles } from '../../format/soles';
import { contractIcons } from '../../icons';
import { contractListQuery, readContractListState } from '../../list-query';
import { Client } from '../../../customers/models/client';
import { Draft } from '../../models/draft';
import { Piece } from '../../models/document';
import { PlanDetail } from '../../models/plan-detail';
import { Template } from '../../models/template';
import { getCustomers } from '../../../customers/services/customer-api';
import {
  createContract,
  getContract,
  getPlan,
  getTemplates,
  updateContract,
} from '../../services/contract-api';
import { resolveSlot } from '../../strategies/slot.strategy';

@Component({
  selector: 'app-contract-draft',
  imports: [Shell, RouterLink, NgIcon, EmptyState],
  providers: [contractIcons],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './contract-draft.html',
  styleUrl: './contract-draft.css',
})
export class ContractDraft {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listState = readContractListState(this.route.snapshot.queryParamMap);
  protected readonly listQuery = contractListQuery(this.listState.page, this.listState.filters);

  protected readonly clients = signal<Client[] | null>(null);
  protected readonly clientsFailed = signal(false);
  protected readonly today = todayIso();
  protected readonly startMin = signal(todayIso());
  protected readonly issuedOn = signal(todayIso());

  private readonly templateParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('template') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('template') ?? '' },
  );

  private readonly contractId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  private readonly editTemplateId = signal('');

  protected readonly editing = computed(() => Boolean(this.contractId()));
  protected readonly templates = signal<Template[] | null>(null);
  protected readonly plan = signal<PlanDetail | null>(null);
  protected readonly failed = signal(false);
  protected readonly unreachable = unreachable;

  protected readonly template = computed(() => {
    const list = this.templates();
    if (!list) return;
    const id = this.editing() ? this.editTemplateId() : this.templateParam();
    return list.find((item) => String(item.id) === id);
  });

  protected readonly document = computed(() => readTemplate(this.template()?.content ?? ''));

  protected readonly draft = signal<Draft>({
    cliente: '',
    inicio: '',
  });

  protected readonly generating = signal(false);
  protected readonly failure = signal('');

  constructor() {
    void this.bootstrap();

    effect(() => {
      if (this.editing()) return;
      const id = this.templateParam();
      const list = this.templates();
      if (!id || !list) return;
      if (!list.some((item) => String(item.id) === id)) {
        void this.router.navigateByUrl('/contracts/new');
      }
    });

    effect((onCleanup) => {
      const planId = this.template()?.planId;
      if (!planId) {
        this.plan.set(null);
        return;
      }
      if (this.plan()?.id === planId) return;
      let active = true;
      void getPlan(planId).then(
        (detail) => {
          if (active) this.plan.set(detail);
        },
        () => {
          if (active) this.plan.set(null);
        },
      );
      onCleanup(() => {
        active = false;
      });
    });

    afterRenderEffect(() => {
      const value = this.draft().cliente;
      if (this.clients() === null) return;
      const el = document.getElementById('cliente');
      if (!(el instanceof HTMLSelectElement)) return;
      if (el.value !== value) el.value = value;
    });
  }

  protected set(event: Event) {
    const field = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const key = field.name as keyof Draft;
    if (key === 'inicio' && field.value && field.value < this.startMin()) {
      field.value = this.draft().inicio;
      return;
    }
    this.draft.update((current) => ({ ...current, [key]: field.value }));
    if (!this.failure()) return;
    const missing = this.missing();
    this.failure.set(missing === 'cliente' ? 'Elige un cliente.' : missing === 'inicio' ? 'Elige el inicio del servicio.' : '');
  }

  protected missing(): 'cliente' | 'inicio' | '' {
    if (!this.draft().cliente) return 'cliente';
    if (!this.draft().inicio) return 'inicio';
    return '';
  }

  protected describedBy(field: 'cliente' | 'inicio') {
    const ids: string[] = [];
    if (field === 'cliente' && this.client()) ids.push('cliente-datos');
    if (field === 'inicio' && this.endDate()) ids.push('fin-aviso');
    if (this.failure() && this.missing() === field) ids.push('generar-error');
    return ids.length ? ids.join(' ') : null;
  }

  protected generate(event: Event) {
    event.preventDefault();
    if (this.generating() || this.clients() === null) return;
    const missing = this.missing();
    if (missing) {
      this.failure.set(missing === 'cliente' ? 'Elige un cliente.' : 'Elige el inicio del servicio.');
      const fold = document.getElementById(missing === 'cliente' ? 'cliente-fold' : 'inicio-fold');
      if (fold instanceof HTMLDetailsElement) fold.open = true;
      void focusField(missing);
      return;
    }
    const planId = this.template()?.planId;
    const customerId = Number(this.draft().cliente);
    if (!planId || !Number.isInteger(customerId)) return;
    this.failure.set('');
    this.generating.set(true);
    void this.save(customerId, planId, this.draft().inicio);
  }

  protected leave(event: PointerEvent) {
    const select = event.currentTarget as HTMLSelectElement;
    if (select.matches(':open')) return;
    const next = event.relatedTarget;
    if (next instanceof Node && select.contains(next)) return;
    const active = document.activeElement;
    if (active === select || (active instanceof Node && select.contains(active))) {
      (active as HTMLElement).blur();
    }
  }

  protected pending(value: string) {
    return !value.trim();
  }

  protected client() {
    const id = this.draft().cliente;
    if (!id) return;
    return this.clients()?.find((item) => item.id === id);
  }

  protected slotValue(name: string) {
    if (name === 'servicios') return this.servicesIntro();
    return resolveSlot(name, {
      client: this.client(),
      plan: this.plan() ?? undefined,
      planName: this.template()?.planName ?? '',
      issuedOn: this.signDate(),
      startsOn: this.startDate(),
      endsOn: this.endDate(),
      monthly: this.monthly(),
      total: this.total(),
    });
  }

  protected slotPending(name: string) {
    if (name === 'monto_registrado' || name === 'firmado') return false;
    if (name === 'servicios') return !this.plan();
    return this.pending(this.slotValue(name));
  }

  protected isServicesBlock(pieces: Piece[]) {
    return pieces.length === 1 && pieces[0]?.kind === 'slot' && pieces[0].name === 'servicios';
  }

  protected servicesIntro() {
    const plan = this.plan();
    if (!plan) return '';
    if (plan.services.length === 0) {
      return `El plan "${plan.name}" no tiene servicios registrados.`;
    }
    return `Servicios incluidos en el plan "${plan.name}":`;
  }

  protected serviceLines() {
    return (this.plan()?.services ?? []).map(serviceLine);
  }

  protected signDate() {
    return formatCalendarDate(this.issuedOn());
  }

  protected startDate() {
    return formatCalendarDate(this.draft().inicio);
  }

  protected endDate() {
    const plan = this.plan();
    if (!plan || !this.draft().inicio) return '';
    return formatCalendarDate(addMonths(this.draft().inicio, plan.durationMonths));
  }

  protected monthly() {
    const plan = this.plan();
    return plan ? soles(plan.monthlyCost) : '';
  }

  protected total() {
    const plan = this.plan();
    return plan ? soles(plan.monthlyCost * plan.durationMonths) : '';
  }

  private async bootstrap() {
    try {
      const templates = await getTemplates();
      this.templates.set(templates);

      const id = this.contractId();
      if (id) {
        await this.hydrateEdit(id, templates);
        return;
      }

      const template = templates.find((item) => String(item.id) === this.templateParam());
      if (template) {
        void getPlan(template.planId).then(
          (detail) => this.plan.set(detail),
          () => this.plan.set(null),
        );
      }

      void getCustomers().then(
        (list) => this.clients.set(list),
        (error: unknown) => {
          this.clients.set([]);
          if (!isUnreachable(error)) this.clientsFailed.set(true);
        },
      );
    } catch {
      this.failed.set(true);
    }
  }

  private async hydrateEdit(id: string, templates: Template[]) {
    try {
      const [contract, clients] = await Promise.all([
        getContract(id),
        getCustomers().catch((error: unknown) => {
          if (!isUnreachable(error)) this.clientsFailed.set(true);
          return [] as Client[];
        }),
      ]);
      if (contract.status === 'SIGNED') {
        await this.router.navigateByUrl('/contracts');
        return;
      }
      const template = templates.find((item) => item.planId === contract.planId);
      if (!template || !contract.startDate) {
        this.failed.set(true);
        return;
      }
      const detail = await getPlan(template.planId).catch(() => null);
      if (!detail) {
        this.failed.set(true);
        return;
      }
      this.plan.set(detail);
      this.editTemplateId.set(String(template.id));
      this.issuedOn.set(contract.issueDate || todayIso());
      this.startMin.set(contract.startDate < this.today ? contract.startDate : this.today);
      const customerId = String(contract.customerId);
      this.draft.set({
        cliente: customerId,
        inicio: contract.startDate,
      });
      // Clients last so the select mounts once with the saved cliente already set.
      this.clients.set(
        clients.some((item) => item.id === customerId) || !contract.customerName
          ? clients
          : [
              {
                id: customerId,
                empresa: contract.customerName,
                ruc: '',
                representante: contract.customerRepresentative ?? '',
                domicilio: '',
                correo: '',
                telefono: '',
              },
              ...clients,
            ],
      );
    } catch (error) {
      if (isUnreachable(error)) return;
      this.failed.set(true);
    }
  }

  private async save(customerId: number, planId: number, startDate: string) {
    const id = this.contractId();
    try {
      if (id) {
        await updateContract(id, { customerId, planId, startDate });
        await this.router.navigate(['/contracts'], {
          queryParams: this.listQuery,
          state: { notice: 'Contrato actualizado.' },
        });
      } else {
        await createContract({ customerId, planId, startDate });
        await this.router.navigateByUrl('/contracts', { state: { notice: 'Contrato generado.' } });
      }
    } catch (error) {
      if (isUnreachable(error)) return;
      const status = typeof error === 'object' && error && 'status' in error ? error.status : 0;
      if (status === 401) {
        await this.router.navigateByUrl('/login');
        return;
      }
      this.failure.set(id ? 'No se pudo guardar el contrato.' : 'No se pudo generar el contrato.');
    } finally {
      this.generating.set(false);
    }
  }
}
