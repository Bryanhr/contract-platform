import { Routes } from '@angular/router';
import { ContractDraft } from './features/contracts/pages/contract-draft/contract-draft';
import { ContractDetail } from './features/contracts/pages/contract-detail/contract-detail';
import { ContractList } from './features/contracts/pages/contract-list/contract-list';
import { TemplatePick } from './features/contracts/pages/template-pick/template-pick';
import { CustomerForm } from './features/customers/pages/customer-form/customer-form';
import { CustomerList } from './features/customers/pages/customer-list/customer-list';
import { Home } from './features/home/pages/home/home';
import { Login } from './features/login/pages/login/login';
import { PlanForm } from './features/plans/pages/plan-form/plan-form';
import { PlanList } from './features/plans/pages/plan-list/plan-list';
import { ServiceCatalog } from './features/services/pages/service-catalog/service-catalog';
import { TemplateForm } from './features/templates/pages/template-form/template-form';
import { TemplateList } from './features/templates/pages/template-list/template-list';
import { guestOnly, requireSession } from './features/login/guards/session.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestOnly] },
  { path: 'contratos', pathMatch: 'full', redirectTo: 'contracts' },
  { path: 'contratos/nuevo', pathMatch: 'full', redirectTo: 'contracts/new' },
  { path: 'contratos/nuevo/:template', redirectTo: 'contracts/new/:template' },
  { path: 'contratos/:id/editar', redirectTo: 'contracts/:id/edit' },
  { path: 'clientes', pathMatch: 'full', redirectTo: 'customers' },
  { path: 'clientes/nuevo', pathMatch: 'full', redirectTo: 'customers/new' },
  { path: 'clientes/:id/editar', redirectTo: 'customers/:id/edit' },
  { path: 'planes', pathMatch: 'full', redirectTo: 'plans' },
  { path: 'planes/nuevo', pathMatch: 'full', redirectTo: 'plans/new' },
  { path: 'planes/:id/editar', redirectTo: 'plans/:id/edit' },
  { path: 'plantillas', pathMatch: 'full', redirectTo: 'templates' },
  { path: 'plantillas/nueva', pathMatch: 'full', redirectTo: 'templates/new' },
  { path: 'plantillas/:planId/editar', redirectTo: 'templates/:planId/edit' },
  {
    path: '',
    canMatch: [requireSession],
    children: [
      { path: '', component: Home },
      { path: 'customers', component: CustomerList },
      { path: 'customers/new', component: CustomerForm },
      { path: 'customers/:id/edit', component: CustomerForm },
      { path: 'plans', component: PlanList },
      { path: 'plans/new', component: PlanForm },
      { path: 'plans/:id/edit', component: PlanForm },
      { path: 'services', component: ServiceCatalog },
      { path: 'templates', component: TemplateList },
      { path: 'templates/new', component: TemplateForm },
      { path: 'templates/:planId/edit', component: TemplateForm },
      { path: 'contracts', component: ContractList },
      { path: 'contracts/new', component: TemplatePick },
      { path: 'contracts/new/:template', component: ContractDraft },
      { path: 'contracts/:id', component: ContractDetail },
      { path: 'contracts/:id/edit', component: ContractDraft },
    ],
  },
  { path: '**', component: Login },
];
