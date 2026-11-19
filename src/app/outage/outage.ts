import { Component, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { clearUnreachable, unreachable } from '../core/outage';
import { outageIcons } from './icons';

@Component({
  selector: 'app-outage',
  imports: [NgIcon],
  providers: [outageIcons],
  templateUrl: './outage.html',
  styleUrl: './outage.css',
})
export class Outage implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private previous: HTMLElement | null = null;

  protected readonly unreachable = unreachable;

  private readonly remember = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || this.host.nativeElement.contains(target)) return;
    this.previous = target;
  };

  ngOnInit() {
    document.addEventListener('focusin', this.remember);
  }

  ngOnDestroy() {
    document.removeEventListener('focusin', this.remember);
  }

  protected dismiss() {
    const returnTo = this.previous;
    clearUnreachable();
    window.setTimeout(() => returnTo?.focus());
  }
}
