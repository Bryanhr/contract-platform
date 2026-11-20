import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { isUnreachable } from '../../../../core/outage';
import { Shell } from '../../../../shell/shell';
import { contractIcons } from '../../icons';
import { formatCalendarDate } from '../../format/calendar';
import { serviceLine } from '../../format/service-line';
import { soles } from '../../format/soles';
import { ContractResponse } from '../../models/contract-response';
import { PlanService } from '../../models/plan-service';
import { getContract } from '../../services/contract-api';
import { getPlanServices } from '../../../plans/services/plan-api';
import { apiErrorStatus } from '../../../plans/validation/plan-errors';

@Component({
  selector: 'app-contract-detail',
  imports: [Shell, RouterLink, NgIcon],
  providers: [contractIcons],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './contract-detail.html',
  styleUrl: './contract-detail.css',
})
export class ContractDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly contract = signal<ContractResponse | null>(null);
  protected readonly services = signal<PlanService[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal('');
  protected readonly servicesFailed = signal(false);
  protected readonly date = formatCalendarDate;
  protected readonly money = soles;
  protected readonly serviceLine = serviceLine;

  constructor() {
    void this.load();
  }

  protected statusName(status: ContractResponse['status']) {
    return status === 'SIGNED' ? 'Firmado' : 'Generado';
  }

  protected validityName(validity: ContractResponse['validity']) {
    switch (validity) {
      case 'PENDING': return 'Pendiente';
      case 'ACTIVE': return 'Vigente';
      case 'EXPIRING': return 'Por vencer';
      case 'EXPIRED': return 'Vencido';
      default: return '';
    }
  }

  private async load() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      this.failed.set('El identificador del contrato no es válido.');
      this.loading.set(false);
      return;
    }

    try {
      const contract = await getContract(id);
      this.contract.set(contract);
      try {
        const services = await getPlanServices(contract.planId);
        this.services.set(services.map((service) => ({
          id: service.supportServiceId,
          name: service.name,
          serviceType: service.serviceType,
          unit: service.unit,
          monthlyLimit: service.monthlyLimit,
          extraCost: service.extraCost,
        })));
      } catch (error) {
        if (apiErrorStatus(error) === 401) {
          await this.router.navigateByUrl('/login');
          return;
        }
        this.servicesFailed.set(true);
      }
    } catch (error) {
      if (apiErrorStatus(error) === 401) {
        await this.router.navigateByUrl('/login');
      } else if (apiErrorStatus(error) === 404) {
        this.failed.set('No se encontró el contrato solicitado.');
      } else {
        this.failed.set(
          isUnreachable(error)
            ? 'No se pudo conectar para cargar el contrato. Comprueba tu conexión e inténtalo de nuevo.'
            : 'No se pudo cargar el contrato.',
        );
      }
    } finally {
      this.loading.set(false);
    }
  }
}
