import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isUnreachable } from '../../../../core/outage';
import { login, nextPath } from '../../services/login';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit, OnDestroy {
  private readonly formRef = viewChild.required<ElementRef<HTMLFormElement>>('session');
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected passwordVisible = false;
  protected readonly pending = signal(false);
  protected readonly failure = signal('');

  private announcer?: HTMLDivElement;
  private announceTimer = 0;
  private announcedField?: HTMLInputElement;
  private readonly flagged = new WeakSet<HTMLInputElement>();
  private readonly announced = new WeakSet<HTMLInputElement>();

  private readonly onBlur = (event: Event) => this.sync(event.target, true);
  private readonly onInput = (event: Event) => {
    if (event.target instanceof HTMLInputElement && event.target.hasAttribute('aria-invalid')) {
      this.sync(event.target);
    }
  };
  private readonly onInvalid = (event: Event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.announced.add(event.target);
    this.sync(event.target);
  };

  ngAfterViewInit() {
    const form = this.formRef().nativeElement;
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'visually-hidden';
    form.append(announcer);
    this.announcer = announcer;
    form.querySelectorAll('input').forEach((field) => this.sync(field));
    form.addEventListener('focusout', this.onBlur);
    form.addEventListener('input', this.onInput);
    form.addEventListener('invalid', this.onInvalid, true);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#14312b');
  }

  ngOnDestroy() {
    const form = this.formRef().nativeElement;
    form.removeEventListener('focusout', this.onBlur);
    form.removeEventListener('input', this.onInput);
    form.removeEventListener('invalid', this.onInvalid, true);
    window.clearTimeout(this.announceTimer);
    this.announcer?.remove();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#e7eeea');
  }

  protected togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  protected submit(event: Event) {
    event.preventDefault();
    if (this.pending()) return;
    const form = event.target as HTMLFormElement;
    this.failure.set('');
    window.setTimeout(() => {
      const fields = [...form.querySelectorAll('input')];
      fields.forEach((field) => this.sync(field));
      const first = fields.find((field) => field.matches(':user-invalid'));
      if (first) {
        this.announced.add(first);
        first.focus();
        return;
      }
      const data = new FormData(form);
      void this.enter(String(data.get('correo') ?? ''), String(data.get('contrasena') ?? ''));
    });
  }

  private async enter(email: string, password: string) {
    this.pending.set(true);
    try {
      await login(email, password);
      const target = nextPath(this.route.snapshot.queryParamMap.get('next'));
      await this.router.navigateByUrl(target, { onSameUrlNavigation: 'reload', replaceUrl: true });
    } catch (error) {
      if (isUnreachable(error)) return;
      const status = typeof error === 'object' && error && 'status' in error ? error.status : 0;
      this.failure.set(status === 401 ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión.');
    } finally {
      this.pending.set(false);
    }
  }

  private sync(target: EventTarget | null, announce = false) {
    if (!(target instanceof HTMLInputElement)) return;
    const invalid = target.matches(':user-invalid');
    if (invalid) {
      const changed = this.writeError(target);
      if (announce && (changed || !this.announced.has(target))) {
        this.announce(target);
        this.announced.add(target);
      }
      target.setAttribute('aria-invalid', 'true');
      this.linkError(target, true);
      this.flagged.add(target);
      return;
    }
    if (this.flagged.has(target) || target.getAttribute('aria-invalid') !== 'true') {
      target.setAttribute('aria-invalid', 'false');
      this.linkError(target, false);
      this.flagged.delete(target);
      this.announced.delete(target);
      if (this.announcedField === target) {
        window.clearTimeout(this.announceTimer);
        if (this.announcer) this.announcer.textContent = '';
      }
    }
  }

  private writeError(field: HTMLInputElement): boolean {
    const error = field.dataset['error'] ? document.getElementById(field.dataset['error']) : null;
    if (!error) return false;
    const text = this.errorText(field);
    if (!text || error.textContent === text) return false;
    error.textContent = text;
    return true;
  }

  private errorText(field: HTMLInputElement): string {
    if (field.validity.valueMissing) {
      return field.id === 'correo' ? 'Error: escribe el correo.' : 'Error: escribe la contraseña.';
    }
    if (field.id === 'correo' && field.validity.typeMismatch) {
      return 'Error: el formato es nombre@empresa.com.';
    }
    return '';
  }

  private linkError(field: HTMLInputElement, shown: boolean) {
    const errorId = field.dataset['error'];
    if (!errorId) return;
    const ids = (field.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) field.setAttribute('aria-describedby', ids.join(' '));
    else field.removeAttribute('aria-describedby');
  }

  private announce(field: HTMLInputElement) {
    const error = field.dataset['error'] ? document.getElementById(field.dataset['error']) : null;
    if (!error || !this.announcer) return;
    const label = field.labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim();
    const message = error.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    window.clearTimeout(this.announceTimer);
    this.announcer.textContent = '';
    this.announcedField = field;
    this.announceTimer = window.setTimeout(() => {
      if (this.announcer) this.announcer.textContent = label ? `${label}: ${message}` : message;
    }, 500);
  }
}
