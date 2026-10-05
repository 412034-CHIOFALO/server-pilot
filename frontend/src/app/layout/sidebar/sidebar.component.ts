import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface NavItem { icon: string; label: string; path: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  styles: [`
    :host { display:flex; flex-direction:column; height:100%; overflow:hidden; }

    /* ── Logo area ── */
    .logo {
      padding: 18px 16px 14px;
      display: flex; align-items: center; gap: 11px;
      border-bottom: 1px solid #21262d;
      margin-bottom: 6px; flex-shrink: 0;
    }
    .logo-icon {
      width: 36px; height: 36px; flex-shrink: 0;
      background: linear-gradient(145deg, #6ab0ff 0%, #1658c8 100%);
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      box-shadow:
        0 0 0 1px rgba(88,166,255,.22),
        0 2px 12px rgba(30,100,220,.4);
    }
    .logo-mark { width: 22px; height: 22px; display: block; }
    .logo-name {
      display: flex; flex-direction: column; gap: 1px;
    }
    .logo-text {
      font-size: 14.5px; font-weight: 700; letter-spacing: -0.2px;
      color: #e6edf3; line-height: 1;
    }
    .logo-sub {
      font-size: 9.5px; font-weight: 500; letter-spacing: 0.5px;
      text-transform: uppercase; color: #484f58; line-height: 1;
    }

    /* ── Nav ── */
    nav { padding: 4px 8px; flex: 1; overflow-y: auto; scrollbar-width: none; }
    nav::-webkit-scrollbar { display: none; }

    .section-label {
      font-size: 9.5px; font-weight: 600; letter-spacing: 1.1px;
      text-transform: uppercase; color: #3d444c;
      padding: 14px 8px 5px;
    }
    a {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; min-height: 40px;
      border-radius: 7px; text-decoration: none;
      color: #6e7681; font-size: 13px; font-weight: 500;
      transition: background .12s, color .12s;
      margin-bottom: 1px;
    }
    a:hover { background: #1c2128; color: #c9d1d9; }
    a.active { background: rgba(88,166,255,.1); color: #58a6ff; }
    a.active mat-icon { color: #58a6ff; }
    mat-icon {
      font-size: 17px; width: 17px; height: 17px;
      color: inherit; transition: color .12s; flex-shrink: 0;
    }

    /* ── Footer ── */
    .footer {
      padding: 10px 16px; flex-shrink: 0;
      border-top: 1px solid #21262d;
      display: flex; align-items: center; gap: 7px;
    }
    .version-badge {
      font-size: 10px; font-weight: 600; letter-spacing: .3px;
      color: #3d444c; background: #161b22;
      border: 1px solid #21262d;
      border-radius: 4px; padding: 2px 6px;
      line-height: 1.4;
    }
  `],
  template: `
    <div class="logo">
      <div class="logo-icon">
        <!--
          Server Pilot mark: two server bars (left) + terminal chevron › (right).
          Bars = infrastructure; chevron = the command / pilot prompt.
          Green dot = live status. Consistent 1.8px stroke everywhere.
        -->
        <svg class="logo-mark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Server bar 1 (top) -->
          <rect x="2" y="6.5" width="10.5" height="3.8" rx="1.4" fill="white" opacity="0.93"/>
          <!-- Server bar 2 (bottom) -->
          <rect x="2" y="13.7" width="10.5" height="3.8" rx="1.4" fill="white" opacity="0.55"/>
          <!-- Terminal chevron › — the pilot/command element -->
          <path d="M12 5 L20.5 12 L12 19"
                stroke="white" stroke-width="2.4"
                stroke-linecap="round" stroke-linejoin="round"
                fill="none" opacity="0.97"/>
          <!-- Live status dot on top bar -->
          <circle cx="6.5" cy="8.4" r="1.4" fill="#3fb950"/>
        </svg>
      </div>
      <div class="logo-name">
        <span class="logo-text">Server Pilot</span>
        <span class="logo-sub">Admin Panel</span>
      </div>
    </div>

    <nav>
      <div class="section-label">Monitoreo</div>
      @for (item of monitorItems; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" (click)="navClick.emit()">
          <mat-icon>{{ item.icon }}</mat-icon>{{ item.label }}
        </a>
      }
      <div class="section-label">Infraestructura</div>
      @for (item of infraItems; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" (click)="navClick.emit()">
          <mat-icon>{{ item.icon }}</mat-icon>{{ item.label }}
        </a>
      }
      <div class="section-label">Sistema</div>
      @for (item of systemItems; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" (click)="navClick.emit()">
          <mat-icon>{{ item.icon }}</mat-icon>{{ item.label }}
        </a>
      }
    </nav>

    <div class="footer">
      <span class="version-badge">v2.1</span>
    </div>
  `
})
export class SidebarComponent {
  navClick = output<void>();

  monitorItems: NavItem[] = [
    { icon: 'dashboard',     label: 'Dashboard',  path: '/dashboard' },
    { icon: 'monitor_heart', label: 'Services',   path: '/services' },
    { icon: 'memory',        label: 'Procesos',   path: '/procesos' },
  ];
  infraItems: NavItem[] = [
    { icon: 'apps',               label: 'Accesos',    path: '/accesos' },
    { icon: 'inventory_2',        label: 'Containers', path: '/containers' },
    { icon: 'folder',             label: 'Archivos',   path: '/archivos' },
    { icon: 'terminal',           label: 'Terminal',   path: '/terminal' },
    { icon: 'power_settings_new', label: 'iDRAC',      path: '/idrac' },
    { icon: 'bolt',               label: 'Acciones',   path: '/acciones' },
    { icon: 'tune',               label: 'Systemd',    path: '/systemd' },
  ];
  systemItems: NavItem[] = [
    { icon: 'history',  label: 'Auditoría',     path: '/auditoria' },
    { icon: 'settings', label: 'Configuración', path: '/configuracion' },
  ];
}
