import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { hasSession } from './app/core/session';
import { loadHomeStats } from './app/features/home/services/home-stats';

if (hasSession()) {
  void loadHomeStats().catch(() => undefined);
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
