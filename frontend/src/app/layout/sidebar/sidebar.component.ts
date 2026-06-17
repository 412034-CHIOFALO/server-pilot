import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface NavItem { icon: string; label: string; path: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  styles: [`
    :host { display:flex; flex-direction:column; height:100%; }
    .logo {
      padding: 20px 16px 16px;
      display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid #21262d;
      margin-bottom: 8px;
    }
    .logo-icon {
      width: 34px; height: 34px;
      background: linear-gradient(135deg, #58a6ff 0%, #1f6feb 100%);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(88,166,255,.3);
    }
    .logo-icon mat-icon { color: #fff; font-size: 18px; width: 18px; height: 18px; }
    .logo-text { font-size: 15px; font-weight: 700; color: #e6edf3; line-height:1; }
    .logo-sub  { font-size: 10px; color: #8b949e; margin-top: 2px; letter-spacing:.3px; }

    nav { padding: 4px 8px; flex: 1; overflow-y: auto; }
    .section-label {
      font-size: 10px; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; color: #484f58;
      padding: 12px 8px 4px;
    }
    a {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      text-decoration: none;
      color: #8b949e;
      font-size: 13px; font-weight: 500;
      transition: background .15s, color .15s;
      margin-bottom: 2px;
      cursor: pointer;
    }
    a:hover { background: #21262d; color: #e6edf3; }
    a.active { background: rgba(88,166,255,.12); color: #58a6ff; }
    a.active mat-icon { color: #58a6ff; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; color: inherit; transition: color .15s; }

    .footer {
      padding: 12px 16px;
      border-top: 1px solid #21262d;
      font-size: 10px; color: #484f58;
      text-align: center; letter-spacing:.3px;
    }
  `],
  template: `
    <div class="logo">
      <div class="logo-icon"><mat-icon>dns</mat-icon></div>
      <div>
        <div class="logo-text">Server Pilot</div>
        <div class="logo-sub">Admin Panel</div>
      </div>
    </div>

    <nav>
      <div class="section-label">Monitoreo</div>
      @for (item of monitorItems; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active">
          <mat-icon>{{ item.icon }}</mat-icon>{{ item.label }}
        </a>
      }
      <div class="section-label">Infraestructura</div>
      @for (item of infraItems; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active">
          <mat-icon>{{ item.icon }}</mat-icon>{{ item.label }}
        </a>
      }
      <div class="section-label">Sistema</div>
      @for (item of systemItems; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active">
          <mat-icon>{{ item.icon }}</mat-icon>{{ item.label }}
        </a>
      }
    </nav>

    <div class="footer">Server Pilot v2.0</div>
  `
})
export class SidebarComponent {
  monitorItems: NavItem[] = [
    { icon: 'dashboard',     label: 'Dashboard',  path: '/dashboard' },
    { icon: 'monitor_heart', label: 'Services',   path: '/services' },
    { icon: 'memory',        label: 'Procesos',   path: '/procesos' },
  ];
  infraItems: NavItem[] = [
    { icon: 'inventory_2',        label: 'Containers',  path: '/containers' },
    { icon: 'folder',             label: 'Archivos',    path: '/archivos' },
    { icon: 'terminal',           label: 'Terminal',    path: '/terminal' },
    { icon: 'power_settings_new', label: 'iDRAC',       path: '/idrac' },
    { icon: 'bolt',               label: 'Acciones',    path: '/acciones' },
    { icon: 'tune',               label: 'Systemd',     path: '/systemd' },
  ];
  systemItems: NavItem[] = [
    { icon: 'history',  label: 'Auditoría',       path: '/auditoria' },
    { icon: 'settings', label: 'Configuración',   path: '/configuracion' },
  ];
}
