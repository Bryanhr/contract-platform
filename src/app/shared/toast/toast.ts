import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideInfo,
  lucideTriangleAlert,
  lucideX,
} from '@ng-icons/lucide';

export type ToastTone = 'danger' | 'warning' | 'info' | 'success';

const toneIcon: Record<ToastTone, string> = {
  danger: 'lucideCircleAlert',
  warning: 'lucideTriangleAlert',
  info: 'lucideInfo',
  success: 'lucideCircleCheck',
};

@Component({
  selector: 'app-toast',
  imports: [NgIcon],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleCheck,
      lucideInfo,
      lucideTriangleAlert,
      lucideX,
    }),
  ],
  host: {
    role: 'region',
    'aria-label': 'Avisos',
    '[attr.data-tone]': 'tone()',
    '(focusin)': 'pauseDismiss()',
    '(focusout)': 'resumeDismiss($event)',
  },
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private dismissTimer: number | undefined;
  private dismissAt = 0;
  private remaining = 0;

  readonly message = input.required<string>();
  readonly tone = input<ToastTone>('warning');
  /** 0 = stay until dismissed. Omit to auto-pick by tone. */
  readonly duration = input<number | null>(null);
  readonly icon = input<string | null>(null);
  readonly dismissLabel = input('Cerrar aviso');
  readonly dismissed = output<void>();

  protected readonly resolvedIcon = computed(() => this.icon() || toneIcon[this.tone()]);

  constructor() {
    afterNextRender(() => {
      const el = this.host.nativeElement;
      if (Object.hasOwn(HTMLElement.prototype, 'popover')) {
        el.setAttribute('popover', 'manual');
        try {
          el.showPopover();
        } catch {
          /* already open */
        }
      }
      this.scheduleDismiss();
    });
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  protected dismiss() {
    this.clearTimer();
    this.dismissed.emit();
  }

  protected pauseDismiss() {
    if (this.dismissTimer === undefined) return;
    this.remaining = Math.max(0, this.dismissAt - Date.now());
    this.clearTimer();
  }

  protected resumeDismiss(event: FocusEvent) {
    const next = event.relatedTarget;
    if (next instanceof Node && this.host.nativeElement.contains(next)) return;
    if (this.remaining <= 0) return;
    this.armTimer(this.remaining);
  }

  private scheduleDismiss() {
    const explicit = this.duration();
    const ms =
      explicit === null
        ? this.tone() === 'success' || this.tone() === 'info'
          ? 5000
          : 0
        : explicit;
    if (ms <= 0) return;
    this.armTimer(ms);
  }

  private armTimer(ms: number) {
    this.clearTimer();
    this.remaining = ms;
    this.dismissAt = Date.now() + ms;
    this.dismissTimer = window.setTimeout(() => this.dismiss(), ms);
  }

  private clearTimer() {
    if (this.dismissTimer !== undefined) window.clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
  }
}
