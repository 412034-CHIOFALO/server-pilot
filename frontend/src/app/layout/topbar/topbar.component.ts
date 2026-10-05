import { Component, input, output } from '@angular/core';
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
      padding: 0 20px 0 16px;
      background: #161b22;
      border-bottom: 1px solid #21262d;
      gap: 8px;
    }
    .spacer { flex: 1; }

    /* Mobile wordmark — only shows when sidebar is hidden */
    .mobile-wordmark {
      display: flex; align-items: center; gap: 8px;
      flex: 1;
    }
    .mobile-icon {
      width: 28px; height: 28px; flex-shrink: 0;
      background: linear-gradient(145deg, #6ab0ff 0%, #1658c8 100%);
      border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 1px rgba(88,166,255,.2), 0 2px 8px rgba(30,100,220,.35);
    }
    .mobile-mark { width: 17px; height: 17px; display: block; }
    .mobile-name {
      font-size: 14px; font-weight: 700; letter-spacing: -0.2px;
      color: #e6edf3;
    }

    /* Status pill */
    .ws-pill {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 20px;
      font-size: 11.5px; font-weight: 600; border: 1px solid;
      cursor: default; letter-spacing: .1px;
      transition: all .3s;
    }
    .ws-pill.online  { background: rgba(63,185,80,.07);  color: #3fb950; border-color: rgba(63,185,80,.22); }
    .ws-pill.offline { background: rgba(248,81,73,.07);  color: #f85149; border-color: rgba(248,81,73,.22); }
    .ws-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .ws-pill.online .ws-dot {
      background: #3fb950;
      box-shadow: 0 0 0 3px rgba(63,185,80,.18);
      animation: pulse 2.5s infinite;
    }
    .ws-pill.offline .ws-dot { background: #f85149; }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }

    /* User area */
    .user-area {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 6px; border-radius: 8px;
      cursor: default;
      transition: background .12s;
    }
    .user-area:hover { background: #1c2128; }
    .avatar {
      width: 26px; height: 26px;
      background: linear-gradient(145deg, #6ab0ff, #1658c8);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
      box-shadow: 0 0 0 1px rgba(88,166,255,.25);
    }
    .username-label { color: #8b949e; font-size: 12.5px; font-weight: 500; }

    .menu-btn  { color: #6e7681 !important; }
    .menu-btn:hover  { color: #c9d1d9 !important; }
    .logout-btn { color: #6e7681 !important; }
    .logout-btn:hover { color: #f85149 !important; }

    @media (max-width: 640px) {
      .ws-label, .username-label { display: none; }
      .ws-pill { padding: 4px 7px; }
    }
  `],
  template: `
    <div class="topbar">
      @if (showMenu()) {
        <button mat-icon-button class="menu-btn" (click)="menuToggle.emit()">
          <mat-icon>menu</mat-icon>
        </button>
        <div class="mobile-wordmark">
          <div class="mobile-icon">
            <svg class="mobile-mark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6.5" width="10.5" height="3.8" rx="1.4" fill="white" opacity="0.93"/>
              <rect x="2" y="13.7" width="10.5" height="3.8" rx="1.4" fill="white" opacity="0.55"/>
              <path d="M12 5 L20.5 12 L12 19"
                    stroke="white" stroke-width="2.4"
                    stroke-linecap="round" stroke-linejoin="round"
                    fill="none" opacity="0.97"/>
              <circle cx="6.5" cy="8.4" r="1.4" fill="#3fb950"/>
            </svg>
          </div>
          <span class="mobile-name">Server Pilot</span>
        </div>
      }

      @if (!showMenu()) {
        <div class="spacer"></div>
      }

      <div [class]="'ws-pill ' + (wsConnected() ? 'online' : 'offline')">
        <div class="ws-dot"></div>
        <span class="ws-label">{{ wsConnected() ? 'Live' : 'Offline' }}</span>
      </div>

      <div class="user-area">
        <div class="avatar">{{ userInitial() }}</div>
        <span class="username-label">{{ username() }}</span>
      </div>

      <button mat-icon-button class="logout-btn" matTooltip="Cerrar sesión" (click)="auth.logout()">
        <mat-icon>logout</mat-icon>
      </button>
    </div>
  `
})
export class TopbarComponent {
  wsConnected = input(false);
  showMenu    = input(false);
  menuToggle  = output<void>();

  constructor(public auth: AuthService) {}

  username()    { return this.auth.getCredentials()?.username ?? 'admin'; }
  userInitial() { return this.username().charAt(0).toUpperCase(); }
}
