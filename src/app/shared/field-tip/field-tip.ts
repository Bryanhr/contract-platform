import { Component, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleHelp } from '@ng-icons/lucide';

@Component({
  selector: 'app-field-tip',
  imports: [NgIcon],
  providers: [provideIcons({ lucideCircleHelp })],
  templateUrl: './field-tip.html',
  styleUrl: './field-tip.css',
})
export class FieldTip {
  /** Unique id for the hint popover (also used as aria-describedby target). */
  readonly tipId = input.required<string>();
  readonly text = input.required<string>();
  /** Accessible name for the help button. */
  readonly label = input('Más información');

  protected readonly open = signal(false);

  protected onToggle(event: Event) {
    const next = (event as ToggleEvent).newState === 'open';
    this.open.set(next);
  }
}
