import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { hasSession } from '../../../core/session';

export const requireSession: CanMatchFn = () => hasSession();

export const guestOnly: CanActivateFn = () => (hasSession() ? inject(Router).createUrlTree(['/']) : true);
