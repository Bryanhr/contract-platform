import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { listPageQuery, readListPage } from '../../../../core/list-page';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { EmptyState, noSearchResults } from '../../../../shared/empty-state/empty-state';
import { Toast, ToastTone } from '../../../../shared/toast/toast';
import { Shell } from '../../../../shell/shell';
import { planIcons } from '../../icons';
import { Plan } from '../../models/plan';
import { apiErrorStatus, problemDetail } from '../../validation/plan-errors';
import { deletePlan, getPlans } from '../../services/plan-api';

@Component({
  selector: 'app-plan-list',
  imports: [Shell, RouterLink, NgIcon, DecimalPipe, EmptyState, Toast],
  providers: [planIcons],
  templateUrl: './plan-list.html',
  styleUrl: './plan-list.css',
})
export class PlanList {
  protected readonly noSearchResults = noSearchResults;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly removeDialog = viewChild<ElementRef<HTMLDialogElement>>('removeDialog');
  protected readonly pageSize = 8;
  protected readonly skeleton = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly plans = signal<Plan[] | null>(null);
  protected readonly failed = signal('');
  protected readonly query = signal('');
  protected readonly page = signal(readListPage(this.route.snapshot.queryParamMap.get('page')));
  protected readonly listPageQuery = listPageQuery;
  protected readonly toast = signal<{ message: string; tone: ToastTone } | null>(null);
  protected readonly removing = signal<Plan | null>(null);
  protected readonly deleting = signal(false);
  protected readonly unreachable = unreachable;

  protected readonly matches = computed(() => {
    const list = this.plans() ?? [];
    const query = plain(this.query());
    return list
      .filter((plan) => !query || plain(plan.name).includes(query))
      .sort((left, right) => left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }));
  });

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.matches().length / this.pageSize)));
  protected readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));
  protected readonly visible = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.matches().slice(start, start + this.pageSize);
  });

  constructor() {
    const notice = this.router.getCurrentNavigation()?.extras.state?.['notice'];
    if (typeof notice === 'string') this.showToast(notice, 'success');
    void this.load();
  }

  protected search(event: Event) {
    this.clearToast();
    this.query.set((event.target as HTMLInputElement).value);
    this.setPage(1);
  }

  protected clearSearch() {
    this.clearToast();
    this.query.set('');
    this.setPage(1);
    document.getElementById('buscar')?.focus();
  }

  protected go(next: number) {
    const page = Math.min(this.pageCount(), Math.max(1, next));
    if (page === this.page()) return;
    this.setPage(page);
    const heading = document.querySelector('main.content')?.querySelector<HTMLElement>('h1');
    const scroller = heading?.closest('.content');
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (scroller instanceof HTMLElement) scroller.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
    heading?.focus({ preventScroll: true });
  }

  private setPage(page: number) {
    this.page.set(page);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: listPageQuery(page),
      replaceUrl: true,
    });
  }

  protected askRemove(plan: Plan) {
    this.removing.set(plan);
    this.clearToast();
    const dialog = this.removeDialog()?.nativeElement;
    if (typeof dialog?.showModal === 'function') dialog.showModal();
  }

  protected async confirmRemove() {
    const plan = this.removing();
    if (!plan || this.deleting()) return;
    this.clearToast();
    this.deleting.set(true);
    try {
      await deletePlan(plan.id);
      this.plans.set(await getPlans());
      if (this.page() > this.pageCount()) this.setPage(this.pageCount());
      this.showToast(`Plan «${plan.name}» eliminado.`, 'success');
    } catch (error) {
      if (apiErrorStatus(error) === 401) {
        await this.router.navigateByUrl('/login');
      } else if (!isUnreachable(error)) {
        const status = apiErrorStatus(error);
        this.showToast(
          status === 404
            ? 'Este plan ya no existe.'
            : status === 409
              ? 'Este plan está en uso por contratos o plantillas.'
              : 'No se pudo eliminar el plan.',
          status === 409 ? 'warning' : 'danger',
        );
      }
    } finally {
      this.deleting.set(false);
      this.removeDialog()?.nativeElement.close();
    }
  }

  protected clearToast() {
    this.toast.set(null);
  }

  private showToast(message: string, tone: ToastTone) {
    this.toast.set(null);
    queueMicrotask(() => this.toast.set({ message, tone }));
  }

  private async load() {
    this.failed.set('');
    this.plans.set(null);
    try {
      this.plans.set(await getPlans());
      if (this.page() > this.pageCount()) this.setPage(this.pageCount());
    } catch (error) {
      if (apiErrorStatus(error) === 401) {
        await this.router.navigateByUrl('/login');
      } else if (!isUnreachable(error)) {
        this.failed.set(problemDetail(error) || 'No se pudieron cargar los planes.');
      }
    }
  }
}

function plain(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim();
}
