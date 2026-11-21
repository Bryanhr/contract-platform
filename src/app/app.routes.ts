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
  { path: 'login', component: Login, canActivate: [guestOnly], title: 'Login · SERVIT' },
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
      { path: '', component: Home, title: 'Inicio · SERVIT' },
      { path: 'customers', component: CustomerList, title: 'Clientes · SERVIT' },
      { path: 'customers/new', component: CustomerForm, title: 'Clientes · Nuevo' },
      { path: 'customers/:id/edit', component: CustomerForm, title: 'Clientes · Editar' },
      { path: 'plans', component: PlanList, title: 'Planes · SERVIT' },
      { path: 'plans/new', component: PlanForm, title: 'Planes · Nuevo' },
      { path: 'plans/:id/edit', component: PlanForm, title: 'Planes · Editar' },
      { path: 'services', component: ServiceCatalog, title: 'Servicios · SERVIT' },
      { path: 'templates', component: TemplateList, title: 'Plantillas · SERVIT' },
      { path: 'templates/new', component: TemplateForm, title: 'Plantillas · Nueva' },
      { path: 'templates/:planId/edit', component: TemplateForm, title: 'Plantillas · Editar' },
      { path: 'contracts', component: ContractList, title: 'Contratos · SERVIT' },
      { path: 'contracts/new', component: TemplatePick, title: 'Contratos · Nueva' },
      { path: 'contracts/new/:template', component: ContractDraft, title: 'Contratos · Generar' },
      { path: 'contracts/:id', component: ContractDetail, title: 'Contratos · Detalle' },
      { path: 'contracts/:id/edit', component: ContractDraft, title: 'Contratos · Editar' },
    ],
  },
  { path: '**', component: Login, title: 'Login · SERVIT' },
];
