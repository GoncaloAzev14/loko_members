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
  {
    path: 'join',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/join-club/join-club').then((m) => m.JoinClubComponent),
  },
  {
    path: '',
    canActivate: [authGuard, clubGuard],
    loadComponent: () => import('./pages/shell/shell').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'members',
        loadComponent: () => import('./pages/member-list/member-list').then((m) => m.MemberListComponent),
      },
      {
        path: 'members/:id',
        loadComponent: () => import('./pages/member-detail/member-detail').then((m) => m.MemberDetailComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
