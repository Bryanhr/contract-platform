import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideCircleAlert,
  lucideClipboardList,
  lucideFileSearch,
  lucideFileSignature,
  lucideFilterX,
  lucideInbox,
  lucideTags,
  lucideUserSearch,
  lucideWrench,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-empty-state',
  imports: [NgIcon],
  providers: [
    provideIcons({
      lucideBuilding2,
      lucideCircleAlert,
      lucideClipboardList,
      lucideFileSearch,
      lucideFileSignature,
      lucideFilterX,
      lucideInbox,
      lucideTags,
      lucideUserSearch,
      lucideWrench,
    }),
  ],
  host: {
    '[class.compact]': 'compact()',
    '[attr.data-tone]': 'tone()',
  },
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  /** ng-icon name, e.g. lucideBuilding2 or lucideUserSearch */
  readonly icon = input('lucideInbox');
  readonly message = input.required<string>();
  /** Shorter block for nested sections (e.g. service catalog). */
  readonly compact = input(false);
  /** Visual tone: empty catalog, failed search/filter, or load error. */
  readonly tone = input<'empty' | 'search' | 'alert'>('empty');
}

export function noSearchResults(query: string) {
  const trimmed = query.trim();
  return trimmed ? `No se encontró «${trimmed}».` : 'No se encontraron resultados.';
}
