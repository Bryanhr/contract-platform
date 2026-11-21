import { Component, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'app-number-field',
  templateUrl: './number-field.html',
  styleUrl: './number-field.css',
})
export class NumberField {
  private readonly host = inject(ElementRef<HTMLElement>);

  protected step(direction: 1 | -1) {
    const input = this.host.nativeElement.querySelector('input[type="number"]');
    if (!(input instanceof HTMLInputElement) || input.disabled || input.readOnly) return;
    try {
      if (direction > 0) input.stepUp();
      else input.stepDown();
    } catch {
      /* value would leave min/max */
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
