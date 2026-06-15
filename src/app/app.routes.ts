import { Routes } from '@angular/router';
import { authGuard, publicGuard, clubGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    canActivate: [publicGuard],
    loadComponent: () => import('./pages/sign-up/sign-up').then((m) => m.SignUpComponent),
  },
  // Legacy /join redirects to the clubs page inside the shell
  { path: 'join', redirectTo: '/clubs', pathMatch: 'full' },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/shell/shell').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'clubs', pathMatch: 'full' },
      {
        path: 'clubs',
        loadComponent: () => import('./pages/clubs/clubs').then((m) => m.ClubsComponent),
      },
      {
        path: 'dashboard',
        canActivate: [clubGuard],
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'members',
        canActivate: [clubGuard],
        loadComponent: () => import('./pages/member-list/member-list').then((m) => m.MemberListComponent),
      },
      {
        path: 'members/:id',
        canActivate: [clubGuard],
        loadComponent: () => import('./pages/member-detail/member-detail').then((m) => m.MemberDetailComponent),
      },
      {
        path: 'settings',
        canActivate: [clubGuard],
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
