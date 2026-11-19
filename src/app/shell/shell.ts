import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { account as sessionAccount } from '../core/session';
import { logout } from '../features/login/services/login';
import { shellIcons } from './icons';
import { NavLink } from './models/nav-link';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, NgIcon],
  providers: [shellIcons],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private readonly router = inject(Router);
  private readonly signOutDialog = viewChild<ElementRef<HTMLDialogElement>>('signOutDialog');
  private pressedOutside = false;

  readonly current = input('inicio');
  protected readonly account = sessionAccount;
  protected readonly leaving = signal(false);

  protected askSignOut() {
    const dialog = this.signOutDialog()?.nativeElement;
    if (typeof dialog?.showModal === 'function') dialog.showModal();
  }

  protected confirmSignOut() {
    if (this.leaving()) return;
    this.leaving.set(true);
    const dialog = this.signOutDialog()?.nativeElement;
    void logout().then(() => {
      if (typeof dialog?.close === 'function') dialog.close();
      return this.router.navigateByUrl('/login', { replaceUrl: true });
    });
  }

  protected resetSignOut(event: Event) {
    (event.target as HTMLDialogElement).returnValue = '';
  }

  protected trackBackdrop(event: PointerEvent) {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    const dialog = event.currentTarget as HTMLDialogElement;
    const rect = dialog.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (event.type === 'pointerdown') {
      this.pressedOutside = outside;
      return;
    }
    if (this.pressedOutside && outside) dialog.close();
    this.pressedOutside = false;
  }

  protected readonly links: NavLink[] = [
    { key: 'inicio', label: 'Inicio', path: '/', icon: 'lucideHouse' },
    { key: 'clientes', label: 'Clientes', path: '/customers', icon: 'lucideBuilding2' },
    { key: 'planes', label: 'Planes', path: '/', fragment: 'plans', icon: 'lucideLayers' },
    { key: 'contratos', label: 'Contratos', path: '/contracts', icon: 'lucideFileText' },
  ];
}
