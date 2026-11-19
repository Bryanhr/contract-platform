import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { unreachable } from '../../../../core/outage';
import { Shell } from '../../../../shell/shell';
import { contractIcons } from '../../icons';
import { Template } from '../../models/template';
import { getTemplates } from '../../services/contract-api';

@Component({
  selector: 'app-template-pick',
  imports: [Shell, RouterLink, NgIcon],
  providers: [contractIcons],
  templateUrl: './template-pick.html',
  styleUrl: './template-pick.css',
})
export class TemplatePick {
  protected readonly templates = signal<Template[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly skeleton = [1, 2, 3, 4, 5];
  protected readonly unreachable = unreachable;

  constructor() {
    void getTemplates().then(
      (list) => this.templates.set(list),
      () => this.failed.set(true),
    );
  }
}
