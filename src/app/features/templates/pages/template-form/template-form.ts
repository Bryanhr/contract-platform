import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { focusField } from '../../../../core/focus-field';
import { listPageQuery, readListPage } from '../../../../core/list-page';
import { isUnreachable, unreachable } from '../../../../core/outage';
import { EmptyState } from '../../../../shared/empty-state/empty-state';
import { Shell } from '../../../../shell/shell';
import { getPlans } from '../../../plans/services/plan-api';
import { Plan } from '../../../plans/models/plan';
import { readTemplate } from '../../../contracts/document/read-template';
import {
  contentForApi,
  emptyBlock,
  emptyFullDocument,
  parseTemplateContent,
  serializeTemplateContent,
} from '../../document/template-editor-codec';
import { TEMPLATE_FIELDS, fieldLabel } from '../../document/template-fields';
import { templateIcons } from '../../icons';
import { EditorBlock, EditorBlockKind, EditorPiece } from '../../models/editor-block';
import { TemplateContentMode, TemplateRequest } from '../../models/template';
import {
  createTemplate,
  getTemplateByPlan,
  getTemplates,
  updateTemplate,
} from '../../services/template-api';

@Component({
  selector: 'app-template-form',
  imports: [Shell, RouterLink, NgIcon, EmptyState],
  providers: [templateIcons],
  templateUrl: './template-form.html',
  styleUrl: './template-form.css',
})
export class TemplateForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly listQuery = listPageQuery(readListPage(this.route.snapshot.queryParamMap.get('page')));
  protected readonly fields = TEMPLATE_FIELDS;
  protected readonly fieldLabel = fieldLabel;

  /** Route param is the plan id (one template per plan). */
  private readonly planRouteId = Number(this.route.snapshot.paramMap.get('planId'));
  protected readonly editing = Number.isSafeInteger(this.planRouteId) && this.planRouteId > 0;
  private templateId = 0;

  protected readonly plans = signal<Plan[] | null>(null);
  protected readonly name = signal('');
  protected readonly planId = signal('');
  /** full = as-is; clause = insert into the backend default document. */
  protected readonly mode = signal<TemplateContentMode>('full');
  protected readonly blocks = signal<EditorBlock[]>(emptyFullDocument());
  protected readonly loading = signal(this.editing);
  protected readonly failed = signal(false);
  protected readonly saving = signal(false);
  protected readonly failure = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly pickerFor = signal<string | null>(null);
  protected readonly unreachable = unreachable;

  protected readonly preview = computed(() => readTemplate(serializeTemplateContent(this.blocks())));

  constructor() {
    void this.bootstrap();
  }

  protected error(field: string) {
    return this.errors()[field] ?? '';
  }

  protected setName(event: Event) {
    this.name.set((event.target as HTMLInputElement).value);
    this.clearError('name');
  }

  protected setPlan(event: Event) {
    this.planId.set((event.target as HTMLSelectElement).value);
    this.clearError('planId');
  }

  protected setMode(next: TemplateContentMode) {
    if (this.mode() === next) return;
    this.mode.set(next);
    if (!this.editing) {
      this.blocks.set(next === 'full' ? emptyFullDocument() : [emptyBlock('paragraph')]);
    }
  }

  protected setBlockKind(blockId: string, event: Event) {
    const kind = (event.target as HTMLSelectElement).value as EditorBlockKind;
    this.blocks.update((list) =>
      list.map((block) => (block.id === blockId ? { ...block, kind } : block)),
    );
  }

  protected setTextPiece(blockId: string, index: number, event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.blocks.update((list) =>
      list.map((block) => {
        if (block.id !== blockId) return block;
        const pieces = block.pieces.map((piece, pieceIndex) =>
          pieceIndex === index && piece.kind === 'text' ? { ...piece, value } : piece,
        );
        return { ...block, pieces };
      }),
    );
    this.clearError('content');
  }

  protected addBlock(kind: EditorBlockKind) {
    this.blocks.update((list) => [...list, emptyBlock(kind)]);
  }

  protected removeBlock(blockId: string) {
    this.blocks.update((list) => (list.length <= 1 ? list : list.filter((block) => block.id !== blockId)));
  }

  protected moveBlock(blockId: string, delta: number) {
    this.blocks.update((list) => {
      const index = list.findIndex((block) => block.id === blockId);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= list.length) return list;
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  protected addTextPiece(blockId: string) {
    this.blocks.update((list) =>
      list.map((block) =>
        block.id === blockId
          ? { ...block, pieces: [...block.pieces, { kind: 'text', value: '' } as EditorPiece] }
          : block,
      ),
    );
  }

  protected openFieldPicker(blockId: string) {
    this.pickerFor.update((current) => (current === blockId ? null : blockId));
  }

  protected insertField(blockId: string, name: string) {
    this.blocks.update((list) =>
      list.map((block) =>
        block.id === blockId
          ? { ...block, pieces: [...block.pieces, { kind: 'field', name } as EditorPiece] }
          : block,
      ),
    );
    this.pickerFor.set(null);
    this.clearError('content');
  }

  protected removePiece(blockId: string, index: number) {
    this.blocks.update((list) =>
      list.map((block) => {
        if (block.id !== blockId) return block;
        const pieces = block.pieces.filter((_, pieceIndex) => pieceIndex !== index);
        return { ...block, pieces: pieces.length ? pieces : [{ kind: 'text', value: '' }] };
      }),
    );
  }

  protected save(event: Event) {
    event.preventDefault();
    if (this.saving()) return;
    this.failure.set('');
    const name = this.name().trim();
    const planId = Number(this.planId());
    const raw = serializeTemplateContent(this.blocks()).trim();
    const content = contentForApi(raw, this.mode());
    const next: Record<string, string> = {};
    if (!name) next['name'] = 'Escribe un nombre.';
    if (!Number.isSafeInteger(planId) || planId <= 0) next['planId'] = 'Selecciona un plan.';
    if (!raw) next['content'] = 'Escribe al menos un párrafo.';
    this.errors.set(next);
    if (next['name']) {
      void focusField('template-name');
      return;
    }
    if (next['planId']) {
      void focusField('template-plan');
      return;
    }
    if (next['content']) return;

    const request: TemplateRequest = { name, planId, content };
    this.saving.set(true);
    void this.persist(request);
  }

  private async persist(request: TemplateRequest) {
    try {
      if (this.editing) {
        await updateTemplate(this.templateId, request);
        await this.router.navigate(['/templates'], {
          queryParams: this.listQuery,
          state: { notice: 'Plantilla actualizada.' },
        });
      } else {
        await createTemplate(request);
        await this.router.navigateByUrl('/templates', { state: { notice: 'Plantilla creada.' } });
      }
    } catch (error) {
      if (isUnreachable(error)) return;
      const status = errorStatus(error);
      if (status === 401) {
        await this.router.navigateByUrl('/login');
      } else if (status === 409) {
        this.errors.set({ name: 'Ya existe una plantilla con ese nombre.' });
        void focusField('template-name');
      } else if (status === 404) {
        this.failure.set('Esta plantilla ya no existe.');
      } else if (status === 400) {
        this.failure.set('Revisa los datos e inténtalo otra vez.');
      } else {
        this.failure.set(this.editing ? 'No se pudo guardar la plantilla.' : 'No se pudo crear la plantilla.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  private clearError(field: string) {
    if (!this.errors()[field]) return;
    this.errors.update((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  private async bootstrap() {
    try {
      const [plans, templates] = await Promise.all([getPlans(), getTemplates()]);
      const taken = new Set(templates.map((template) => Number(template.planId)));
      const sorted = [...plans].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

      if (!this.editing) {
        this.plans.set(sorted.filter((plan) => !taken.has(Number(plan.id))));
        this.loading.set(false);
        return;
      }

      if (!Number.isSafeInteger(this.planRouteId) || this.planRouteId <= 0) {
        this.failed.set(true);
        return;
      }

      const template = await getTemplateByPlan(this.planRouteId);
      this.templateId = Number(template.id);
      this.name.set(template.name ?? '');
      this.planId.set(String(template.planId));
      this.plans.set(sorted.filter((plan) => Number(plan.id) === Number(template.planId)));
      this.mode.set(template.content?.includes('# CONTRATO') ? 'full' : 'clause');
      this.blocks.set(parseTemplateContent(template.content));
    } catch (error) {
      if (errorStatus(error) === 401) await this.router.navigateByUrl('/login');
      else this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}

function errorStatus(error: unknown): number {
  if (typeof error !== 'object' || error === null || !('status' in error)) return 0;
  return typeof error.status === 'number' ? error.status : 0;
}
