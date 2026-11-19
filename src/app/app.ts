import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Outage } from './outage/outage';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Outage],
  template: '<app-outage /><router-outlet />',
})
export class App {}
