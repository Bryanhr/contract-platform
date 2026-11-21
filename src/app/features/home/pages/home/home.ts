import { Component, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { Shell } from '../../../../shell/shell';
import { getContracts } from '../../../contracts/services/contract-api';
import { getCustomers } from '../../../customers/services/customer-api';
import { getPlans } from '../../../plans/services/plan-api';
import { getSupportServices } from '../../../services/services/service-api';
import { getTemplates } from '../../../templates/services/template-api';
import { homeIcons } from '../../icons';
import { HomeGuide, HomeStat } from '../../models/module';

@Component({
  selector: 'app-home',
  imports: [Shell, NgIcon],
  providers: [homeIcons],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly loading = signal(true);
  protected readonly stats = signal<HomeStat[]>([
    { id: 'clients', icon: 'lucideBuilding2', label: 'Clientes', value: null },
    { id: 'services', icon: 'lucideWrench', label: 'Servicios', value: null },
    { id: 'plans', icon: 'lucideLayers', label: 'Planes', value: null },
    { id: 'templates', icon: 'lucideScrollText', label: 'Plantillas', value: null },
    { id: 'contracts', icon: 'lucideFileText', label: 'Contratos', value: null },
  ]);

  protected readonly guides: HomeGuide[] = [
    {
      id: 'clients',
      icon: 'lucideBuilding2',
      name: 'Clientes',
      summary: 'Guarda las empresas para usarlas en los contratos.',
      needs: ['Razón social y RUC', 'Representante o correo'],
    },
    {
      id: 'services',
      icon: 'lucideWrench',
      name: 'Servicios',
      summary: 'Lista lo que se puede incluir en un plan.',
      needs: ['Agruparlos por tipo', 'Agregar cada servicio'],
    },
    {
      id: 'plans',
      icon: 'lucideLayers',
      name: 'Planes',
      summary: 'Define cuánto cuesta y por cuánto tiempo.',
      needs: ['Precio y duración', 'Servicios que incluye'],
    },
    {
      id: 'templates',
      icon: 'lucideScrollText',
      name: 'Plantillas',
      summary: 'Prepara el texto del contrato de cada plan.',
      needs: ['Tener el plan listo', 'Solo una plantilla por plan'],
    },
    {
      id: 'contracts',
      icon: 'lucideFileText',
      name: 'Contratos',
      summary: 'Genera el documento para firmar con el cliente.',
      needs: ['Tener al cliente cargado', 'Tener plan con plantilla'],
    },
  ];

  constructor() {
    void this.loadCounts();
  }

  private async loadCounts() {
    const [customers, services, plans, templates, contracts] = await Promise.all([
      getCustomers().then((list) => list.length).catch(() => null),
      getSupportServices().then((list) => list.length).catch(() => null),
      getPlans().then((list) => list.length).catch(() => null),
      getTemplates().then((list) => list.length).catch(() => null),
      getContracts().then((list) => list.length).catch(() => null),
    ]);

    this.stats.set([
      { id: 'clients', icon: 'lucideBuilding2', label: 'Clientes', value: customers },
      { id: 'services', icon: 'lucideWrench', label: 'Servicios', value: services },
      { id: 'plans', icon: 'lucideLayers', label: 'Planes', value: plans },
      { id: 'templates', icon: 'lucideScrollText', label: 'Plantillas', value: templates },
      { id: 'contracts', icon: 'lucideFileText', label: 'Contratos', value: contracts },
    ]);
    this.loading.set(false);
  }
}
