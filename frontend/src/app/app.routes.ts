import { Routes } from '@angular/router';
import { LoginComponent } from './core/auth/login/login.component';
import { ShellComponent } from './layout/shell.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'terminal',
        loadComponent: () => import('./features/terminal/terminal.component').then(m => m.TerminalComponent)
      },
      {
        path: 'containers',
        loadComponent: () => import('./features/containers/containers.component').then(m => m.ContainersComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./features/services/services.component').then(m => m.ServicesComponent)
      },
      {
        path: 'idrac',
        loadComponent: () => import('./features/idrac/idrac.component').then(m => m.IdracComponent)
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./features/audit/audit.component').then(m => m.AuditComponent)
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'archivos',
        loadComponent: () => import('./features/files/files.component').then(m => m.FilesComponent)
      },
      {
        path: 'procesos',
        loadComponent: () => import('./features/processes/processes.component').then(m => m.ProcessesComponent)
      },
      {
        path: 'acciones',
        loadComponent: () => import('./features/runbooks/runbooks.component').then(m => m.RunbooksComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
