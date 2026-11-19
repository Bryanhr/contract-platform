import { Routes } from '@angular/router';
import { ContractDraft } from './features/contracts/pages/contract-draft/contract-draft';
import { ContractList } from './features/contracts/pages/contract-list/contract-list';
import { TemplatePick } from './features/contracts/pages/template-pick/template-pick';
import { Home } from './features/home/pages/home/home';
import { Login } from './features/login/pages/login/login';
import { guestOnly, requireSession } from './features/login/guards/session.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestOnly] },
  { path: 'contratos', pathMatch: 'full', redirectTo: 'contracts' },
  { path: 'contratos/nuevo', pathMatch: 'full', redirectTo: 'contracts/new' },
  { path: 'contratos/nuevo/:template', redirectTo: 'contracts/new/:template' },
  { path: 'contratos/:id/editar', redirectTo: 'contracts/:id/edit' },
  {
    path: '',
    canMatch: [requireSession],
    children: [
      { path: '', component: Home },
      { path: 'contracts', component: ContractList },
      { path: 'contracts/new', component: TemplatePick },
      { path: 'contracts/new/:template', component: ContractDraft },
      { path: 'contracts/:id/edit', component: ContractDraft },
    ],
  },
  { path: '**', component: Login },
];
