import { Component, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { Shell } from '../../../../shell/shell';
import { homeIcons } from '../../icons';
import { HomeGuide, HomeStat } from '../../models/module';
import { homeStatCards, loadHomeStats, readHomeStats } from '../../services/home-stats';

@Component({
  selector: 'app-home',
  imports: [Shell, NgIcon],
  providers: [homeIcons],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly stats = signal<HomeStat[]>(readHomeStats() ?? homeStatCards);

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
    void loadHomeStats()
      .then((stats) => this.stats.set(stats))
      .catch(() => undefined);
  }
}
