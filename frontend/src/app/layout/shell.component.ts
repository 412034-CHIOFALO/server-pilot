import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-primary);
    }
    .sidebar {
      width: 216px;
      min-width: 216px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 28px 28px;
    }
  `],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <app-sidebar />
      </aside>
      <div class="main">
        <app-topbar [wsConnected]="wsConnected()" />
        <div class="content">
          <router-outlet />
        </div>
      </div>
    </div>
  `
})
export class ShellComponent {
  wsConnected = signal(false);
}
