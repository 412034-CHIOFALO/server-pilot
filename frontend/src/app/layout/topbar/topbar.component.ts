import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  styles: [`
    .topbar {
      height: 52px; min-height: 52px;
      display: flex; align-items: center;
      padding: 0 24px;
      background: #161b22;
      border-bottom: 1px solid #21262d;
      gap: 12px;
    }
    .spacer { flex: 1; }
    .ws-pill {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px; font-weight: 500;
      border: 1px solid;
      cursor: default;
      transition: all .3s;
    }
    .ws-pill.online {
      background: rgba(63,185,80,.08);
      color: #3fb950;
      border-color: rgba(63,185,80,.25);
    }
    .ws-pill.offline {
      background: rgba(248,81,73,.08);
      color: #f85149;
      border-color: rgba(248,81,73,.25);
    }
    .ws-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
    }
    .ws-pill.online .ws-dot {
      background: #3fb950;
      box-shadow: 0 0 6px #3fb950;
      animation: pulse 2s infinite;
    }
    .ws-pill.offline .ws-dot { background: #f85149; }
    @keyframes pulse {
      0%,100% { opacity:1; }
      50% { opacity:.4; }
    }
    .user-info {
      display: flex; align-items: center; gap: 8px;
      padding: 0 8px;
      color: #8b949e; font-size: 13px;
    }
    .avatar {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #1f6feb, #58a6ff);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; color: #fff;
    }
    button { color: #8b949e !important; }
    button:hover { color: #e6edf3 !important; }
  `],
  template: `
    <div class="topbar">
      <div class="spacer"></div>

      <div [class]="'ws-pill ' + (wsConnected() ? 'online' : 'offline')">
        <div class="ws-dot"></div>
        {{ wsConnected() ? 'Live' : 'Offline' }}
      </div>

      <div class="user-info">
        <div class="avatar">{{ userInitial() }}</div>
        <span>{{ username() }}</span>
      </div>

      <button mat-icon-button matTooltip="Cerrar sesión" (click)="auth.logout()">
        <mat-icon>logout</mat-icon>
      </button>
    </div>
  `
})
export class TopbarComponent {
  wsConnected = input(false);

  constructor(public auth: AuthService) {}

  username() { return this.auth.getCredentials()?.username ?? 'admin'; }
  userInitial() { return this.username().charAt(0).toUpperCase(); }
}
