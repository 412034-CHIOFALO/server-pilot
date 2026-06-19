import { Component, ViewChild, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MetricsStore } from '../core/metrics-store.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, MatSidenavModule],
  styles: [`
    mat-sidenav-container { height: 100vh; background: var(--bg-primary); }
    mat-sidenav {
      width: 216px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-subtle);
    }
    .app-layout { display: flex; flex-direction: column; height: 100%; }
    .page-content { flex: 1; overflow-y: auto; padding: 28px; }
    @media (max-width: 959px) { .page-content { padding: 16px; } }
  `],
  template: `
    <mat-sidenav-container>
      <mat-sidenav #sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        fixedInViewport>
        <app-sidebar (navClick)="onNavClick()" />
      </mat-sidenav>
      <mat-sidenav-content>
        <div class="app-layout">
          <app-topbar
            [wsConnected]="metricsStore.connected()"
            [showMenu]="isMobile()"
            (menuToggle)="sidenav.toggle()" />
          <div class="page-content">
            <router-outlet />
          </div>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class ShellComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = signal(false);

  constructor(
    public metricsStore: MetricsStore,
    private breakpoint: BreakpointObserver
  ) {
    this.breakpoint.observe('(max-width: 959px)').subscribe(result => {
      this.isMobile.set(result.matches);
    });
  }

  onNavClick() {
    if (this.isMobile()) this.sidenav?.close();
  }
}
