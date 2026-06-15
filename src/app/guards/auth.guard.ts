import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ClubService } from '../services/club.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.waitUntilReady();

  if (!auth.currentUser()) {
    return router.createUrlTree(['/login']);
  }
  return true;
};

export const publicGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.waitUntilReady();

  if (auth.currentUser()) {
    return router.createUrlTree(['/']);
  }
  return true;
};

export const clubGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const club = inject(ClubService);
  const router = inject(Router);

  await auth.waitUntilReady();

  if (!auth.currentUser()) {
    return router.createUrlTree(['/login']);
  }

  // On reload the in-memory clubId signal is empty — fetch it from Firestore
  // before deciding whether the user needs to join/create a club.
  if (!club.clubId()) {
    await club.loadUserClub();
  }

  if (!club.clubId()) {
    return router.createUrlTree(['/clubs']);
  }
  return true;
};
