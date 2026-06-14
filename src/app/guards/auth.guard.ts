import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ClubService } from '../services/club.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.currentUser()) {
    return router.createUrlTree(['/login']);
  }
  return true;
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.currentUser()) {
    return router.createUrlTree(['/']);
  }
  return true;
};

export const clubGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const club = inject(ClubService);
  const router = inject(Router);

  if (!auth.currentUser()) {
    return router.createUrlTree(['/login']);
  }
  if (!club.clubId()) {
    return router.createUrlTree(['/join']);
  }
  return true;
};
