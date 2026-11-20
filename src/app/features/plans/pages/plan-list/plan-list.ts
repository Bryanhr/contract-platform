import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { Shell } from '../../../../shell/shell';
import { planIcons } from '../../icons';
import { Plan } from '../../models/plan';
import { apiErrorStatus, problemDetail } from '../../validation/plan-errors';
import { deletePlan, getPlans } from '../../services/plan-api';

@Component({
  selector: 'app-plan-list',
  imports: [Shell, RouterLink, NgIcon, DecimalPipe],
  providers: [planIcons],
  templateUrl: './plan-list.html',
  styleUrl: './plan-list.css',
})
export class PlanList {
  private readonly router = inject(Router);
  private readonly removeDialog = viewChild<ElementRef<HTMLDialogElement>>('removeDialog');
  private noticeTimer: number | undefined;

  protected readonly pageSize = 8;
  protected readonly plans = signal<Plan[] | null>(null);
  protected readonly failed = signal('');
  protected readonly query = signal('');
  protected readonly page = signal(1);
  protected readonly notice = signal('');
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
    if (typeof notice === 'string') this.setNotice(notice);
    void this.load();
  }

  protected search(event: Event) {
    this.clearNotice();
    this.query.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected go(next: number) {
    const page = Math.min(this.pageCount(), Math.max(1, next));
    if (page === this.page()) return;
    this.page.set(page);
    const heading = document.getElementById('contenido');
    const scroller = heading?.closest('.content');
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (scroller instanceof HTMLElement) scroller.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
    heading?.focus({ preventScroll: true });
  }

  protected askRemove(plan: Plan) {
    this.removing.set(plan);
    this.clearNotice();
    const dialog = this.removeDialog()?.nativeElement;
    if (typeof dialog?.showModal === 'function') dialog.showModal();
  }

  protected async confirmRemove() {
    const plan = this.removing();
    if (!plan || this.deleting()) return;
    this.clearNotice();
    this.deleting.set(true);
    try {
      await deletePlan(plan.id);
      this.plans.set(await getPlans());
      if (this.page() > this.pageCount()) this.page.set(this.pageCount());
    } catch (error) {
      if (apiErrorStatus(error) === 401) {
        await this.router.navigateByUrl('/login');
      } else if (!isUnreachable(error)) {
        const status = apiErrorStatus(error);
        this.setNotice(
          status === 404
            ? 'Este plan ya no existe.'
            : status === 409
              ? 'No se puede eliminar el plan porque está en uso por contratos, plantillas o servicios.'
              : 'No se pudo eliminar el plan.',
        );
      }

    } finally {
      this.deleting.set(false);
      this.removeDialog()?.nativeElement.close();
      if (this.notice()) document.getElementById('buscar')?.focus();
    }
  }

  private setNotice(message: string) {
    this.clearNotice();
    this.notice.set(message);
    this.noticeTimer = window.setTimeout(() => this.clearNotice(), 5000);
  }

  private clearNotice() {
    if (this.noticeTimer !== undefined) window.clearTimeout(this.noticeTimer);
    this.noticeTimer = undefined;
    this.notice.set('');
  }

  private async load() {
    this.failed.set('');
    this.plans.set(null);
    try {
      this.plans.set(await getPlans());
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
