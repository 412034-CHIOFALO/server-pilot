import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(ellipse 80% 60% at 50% -10%, rgba(88,166,255,.12) 0%, transparent 60%),
        #0d1117;
    }
    .login-card {
      width: 380px;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 14px;
      padding: 40px 36px;
      box-shadow: 0 20px 60px rgba(0,0,0,.6);
      animation: fadeIn .3s ease;
    }
    @keyframes fadeIn {
      from { opacity:0; transform:translateY(16px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #58a6ff 0%, #1f6feb 100%);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(88,166,255,.3);
    }
    .logo-icon mat-icon { color: #fff; font-size: 22px; }
    .logo-text { font-size: 20px; font-weight: 700; color: #e6edf3; }
    .logo-sub  { font-size: 12px; color: #8b949e; margin-top: 1px; }
    .field-wrap { display:flex; flex-direction:column; gap:12px; }
    mat-form-field { width: 100%; }
    .error-msg {
      display: flex; align-items: center; gap: 6px;
      color: #f85149; font-size: 12px; margin-top: 4px;
    }
    .submit-btn {
      width: 100%;
      margin-top: 20px;
      height: 42px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: .3px;
      background: linear-gradient(135deg, #1f6feb 0%, #388bfd 100%) !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 14px rgba(31,111,235,.4) !important;
      transition: box-shadow .2s !important;
    }
    .submit-btn:hover { box-shadow: 0 6px 20px rgba(31,111,235,.6) !important; }
  `],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="logo">
          <div class="logo-icon"><mat-icon>dns</mat-icon></div>
          <div>
            <div class="logo-text">Server Pilot</div>
            <div class="logo-sub">Panel de administración</div>
          </div>
        </div>

        <div class="field-wrap">
          <mat-form-field appearance="outline">
            <mat-label>Usuario</mat-label>
            <mat-icon matPrefix style="margin-right:8px;color:#8b949e">person</mat-icon>
            <input matInput [(ngModel)]="username" (keyup.enter)="login()" autocomplete="username">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Contraseña</mat-label>
            <mat-icon matPrefix style="margin-right:8px;color:#8b949e">lock</mat-icon>
            <input matInput [type]="showPass ? 'text' : 'password'"
                   [(ngModel)]="password" (keyup.enter)="login()" autocomplete="current-password">
            <button mat-icon-button matSuffix (click)="showPass = !showPass" tabindex="-1">
              <mat-icon style="color:#8b949e">{{ showPass ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>
        </div>

        @if (error) {
          <div class="error-msg">
            <mat-icon style="font-size:15px;width:15px;height:15px">error_outline</mat-icon>
            {{ error }}
          </div>
        }

        <button mat-flat-button class="submit-btn" (click)="login()">Iniciar sesión</button>
      </div>
    </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  showPass = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    if (!this.username || !this.password) { this.error = 'Ingresá usuario y contraseña'; return; }
    this.auth.login(this.username, this.password);
    this.router.navigate(['/dashboard']);
  }
}
