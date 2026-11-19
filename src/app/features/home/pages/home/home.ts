import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { Shell } from '../../../../shell/shell';
import { homeIcons } from '../../icons';
import { HomeModule } from '../../models/module';

@Component({
  selector: 'app-home',
  imports: [Shell, RouterLink, NgIcon],
  providers: [homeIcons],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly modules: HomeModule[] = [
    {
      id: 'clients',
      icon: 'lucideBuilding2',
      name: 'Clientes',
      path: '/customers',
      summary: 'Empresas atendidas, contactos y el estado de cada cuenta.',
    },
    {
      id: 'plans',
      icon: 'lucideLayers',
      name: 'Planes',
      summary: 'Servicios IT, alcance, vigencia y precio de cada oferta.',
    },
    {
      id: 'contratos',
      icon: 'lucideFileText',
      name: 'Contratos',
      path: '/contracts',
      summary: 'El vínculo vigente entre un cliente y el plan que contrató.',
    },
  ];
}
