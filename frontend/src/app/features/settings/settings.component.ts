import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTabsModule,
            MatFormFieldModule, MatInputModule, MatSlideToggleModule],
  styles: [`
    .settings-wrap { max-width: 680px; }
    mat-form-field { width: 100%; }
    .section-card {
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 24px; margin-top: 20px;
      display: flex; flex-direction: column; gap: 14px;
    }
    .row-2 { display: grid; grid-template-columns: 1fr 120px; gap: 12px; }
    .action-row { display: flex; gap: 10px; align-items: center; margin-top: 4px; flex-wrap: wrap; }
    .save-btn {
      padding: 9px 22px; border-radius: 8px; border: none;
      background: var(--accent); color: #fff; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity .15s;
    }
    .save-btn:hover:not(:disabled) { opacity: .85; }
    .save-btn:disabled { opacity: .45; cursor: not-allowed; }
    .test-btn {
      padding: 9px 18px; border-radius: 8px; border: 1px solid var(--border);
      background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 500;
      cursor: pointer; transition: all .15s;
    }
    .test-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .msg { font-size: 12px; padding: 3px 0; }
    .msg.ok    { color: var(--green); }
    .msg.error { color: var(--red); }
    .note { font-size: 12px; color: var(--text-muted); line-height: 1.6; padding-top: 10px; border-top: 1px solid var(--border-subtle); }
    .toggle-row { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text-secondary); }
  `],
  template: `
    <h2 class="page-title" style="margin-bottom:24px"><mat-icon>settings</mat-icon> Configuración</h2>
    <div class="settings-wrap">
      <mat-tab-group animationDuration="150ms">

        <!-- SSH -->
        <mat-tab label="SSH">
          <div class="section-card">
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Host / IP</mat-label>
                <input matInput [(ngModel)]="ssh.host" placeholder="192.168.1.10">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Puerto</mat-label>
                <input matInput type="number" [(ngModel)]="ssh.port">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Usuario SSH</mat-label>
              <input matInput [(ngModel)]="ssh.username" placeholder="ubuntu">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Ruta clave privada</mat-label>
              <input matInput [(ngModel)]="ssh.keyPath" placeholder="/root/.ssh/id_rsa">
            </mat-form-field>
            <div class="action-row">
              <button class="save-btn" (click)="saveSsh()" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
              <button class="test-btn" (click)="testSsh()" [disabled]="testing()">
                {{ testing() ? 'Probando...' : 'Probar conexión' }}
              </button>
              @if (sshMsg()) {
                <span class="msg" [class]="sshMsgOk() ? 'ok' : 'error'">
                  <mat-icon style="font-size:14px;vertical-align:middle">{{ sshMsgOk() ? 'check_circle' : 'error' }}</mat-icon>
                  {{ sshMsg() }}
                </span>
              }
            </div>
            <div class="note">
              Credenciales usadas por Terminal SSH, File Manager, Runbooks y kill de procesos.
            </div>
          </div>
        </mat-tab>

        <!-- iDRAC -->
        <mat-tab label="iDRAC">
          <div class="section-card">
            <div class="toggle-row">
              <mat-slide-toggle [(ngModel)]="idrac.enabled" color="primary">Habilitado</mat-slide-toggle>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>IP del iDRAC</mat-label>
              <input matInput [(ngModel)]="idrac.host" placeholder="192.168.1.100">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Usuario</mat-label>
              <input matInput [(ngModel)]="idrac.username" placeholder="root">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Contraseña</mat-label>
              <input matInput type="password" [(ngModel)]="idrac.password"
                    placeholder="{{ idracHasPass ? '(sin cambios)' : 'calvin' }}">
            </mat-form-field>
            <div class="action-row">
              <button class="save-btn" (click)="saveIdrac()" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
              <button class="test-btn" (click)="testIdrac()" [disabled]="testing()">
                {{ testing() ? 'Probando...' : 'Probar conexión' }}
              </button>
              @if (idracMsg()) {
                <span class="msg" [class]="idracMsgOk() ? 'ok' : 'error'">{{ idracMsg() }}</span>
              }
            </div>
          </div>
        </mat-tab>

        <!-- Notificaciones -->
        <mat-tab label="Notificaciones">
          <div class="section-card">
            <mat-form-field appearance="outline">
              <mat-label>Webhook URL</mat-label>
              <input matInput [(ngModel)]="alerts.url" placeholder="https://hooks.slack.com/...">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <input matInput [(ngModel)]="alerts.type" placeholder="webhook / slack / discord">
            </mat-form-field>
            <div class="action-row">
              <button class="save-btn" (click)="saveAlerts()" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
              <button class="test-btn" (click)="testAlerts()" [disabled]="testing()">
                {{ testing() ? 'Probando...' : 'Probar' }}
              </button>
              @if (alertsMsg()) {
                <span class="msg" [class]="alertsMsgOk() ? 'ok' : 'error'">{{ alertsMsg() }}</span>
              }
            </div>
          </div>
        </mat-tab>

        <!-- Observabilidad -->
        <mat-tab label="Observabilidad">
          <div class="section-card">
            <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">
              El backend expone métricas en formato Prometheus en:
            </div>
            <div style="font-family:monospace;font-size:12px;background:var(--bg-tertiary);padding:10px 14px;border-radius:6px;color:var(--accent);word-break:break-all">
              {{ prometheusUrl }}
            </div>
            <div class="action-row">
              <button class="test-btn" (click)="copyPrometheus()">
                <mat-icon style="font-size:14px;vertical-align:middle">content_copy</mat-icon>
                {{ copyMsg() || 'Copiar URL' }}
              </button>
            </div>
            <div class="note">
              Autenticación: Basic Auth con las credenciales del panel.<br>
              Iniciá el stack de observabilidad con:<br>
              <code style="display:block;margin-top:6px;font-size:11px">docker compose -f docker-compose.observability.yml up -d</code>
              Grafana queda disponible en <strong>http://localhost:3001</strong>
            </div>
          </div>
        </mat-tab>

        <!-- Acceso -->
        <mat-tab label="Acceso al panel">
          <div class="section-card">
            <mat-form-field appearance="outline">
              <mat-label>Usuario</mat-label>
              <input matInput [(ngModel)]="creds.username">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nueva contraseña</mat-label>
              <input matInput type="password" [(ngModel)]="creds.newPassword">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Confirmar contraseña</mat-label>
              <input matInput type="password" [(ngModel)]="creds.confirmPassword">
            </mat-form-field>
            <div class="action-row">
              <button class="save-btn" (click)="saveCredentials()" [disabled]="saving() || creds.newPassword !== creds.confirmPassword">
                {{ saving() ? 'Guardando...' : 'Cambiar credenciales' }}
              </button>
              @if (credsMsg()) {
                <span class="msg" [class]="credsMsgOk() ? 'ok' : 'error'">{{ credsMsg() }}</span>
              }
            </div>
            <div class="note">
              Al guardar se cerrará la sesión y deberás ingresar con las nuevas credenciales.
            </div>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  saving  = signal(false);
  testing = signal(false);
  copyMsg = signal('');

  ssh    = { host: '', port: 22, username: '', keyPath: '' };
  idrac  = { enabled: false, host: '', username: '', password: '' };
  alerts = { url: '', type: 'webhook' };
  creds  = { username: '', newPassword: '', confirmPassword: '' };

  idracHasPass = false;
  prometheusUrl = `${window.location.protocol}//${window.location.hostname}:8090/actuator/prometheus`;

  sshMsg    = signal(''); sshMsgOk    = signal(false);
  idracMsg  = signal(''); idracMsgOk  = signal(false);
  alertsMsg = signal(''); alertsMsgOk = signal(false);
  credsMsg  = signal(''); credsMsgOk  = signal(false);

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.get<any>('/api/settings').subscribe({ next: s => {
      if (s.ssh)    this.ssh    = { ...s.ssh };
      if (s.idrac)  { this.idrac = { ...s.idrac }; this.idracHasPass = s.idrac.password === '********'; }
      if (s.alerts) this.alerts = { ...s.alerts };
      if (s.auth)   this.creds.username = s.auth.username;
    }});
  }

  saveSsh() {
    this.saving.set(true);
    this.api.put('/api/settings', { ssh: this.ssh }).subscribe({
      next: () => { this.saving.set(false); this.showMsg('sshMsg', 'sshMsgOk', 'Guardado', true); },
      error: () => { this.saving.set(false); this.showMsg('sshMsg', 'sshMsgOk', 'Error al guardar', false); }
    });
  }

  saveIdrac() {
    this.saving.set(true);
    this.api.put('/api/settings', { idrac: this.idrac }).subscribe({
      next: () => { this.saving.set(false); this.showMsg('idracMsg', 'idracMsgOk', 'Guardado', true); },
      error: () => { this.saving.set(false); this.showMsg('idracMsg', 'idracMsgOk', 'Error al guardar', false); }
    });
  }

  saveAlerts() {
    this.saving.set(true);
    this.api.put('/api/alerts/config', this.alerts).subscribe({
      next: () => { this.saving.set(false); this.showMsg('alertsMsg', 'alertsMsgOk', 'Guardado', true); },
      error: () => { this.saving.set(false); this.showMsg('alertsMsg', 'alertsMsgOk', 'Error al guardar', false); }
    });
  }

  saveCredentials() {
    if (this.creds.newPassword !== this.creds.confirmPassword) return;
    this.saving.set(true);
    this.api.put('/api/settings/credentials', {
      username: this.creds.username,
      newPassword: this.creds.newPassword
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showMsg('credsMsg', 'credsMsgOk', 'Guardado. Cerrando sesión...', true);
        setTimeout(() => { this.auth.logout(); this.router.navigate(['/login']); }, 1500);
      },
      error: (e) => { this.saving.set(false); this.showMsg('credsMsg', 'credsMsgOk', e.error?.error || 'Error', false); }
    });
  }

  testSsh() {
    this.testing.set(true);
    this.api.post<any>('/api/settings/test/ssh').subscribe({
      next: r => { this.testing.set(false); this.showMsg('sshMsg', 'sshMsgOk', r.result + (r.detail ? ': ' + r.detail : ''), r.result === 'OK'); },
      error: () => { this.testing.set(false); this.showMsg('sshMsg', 'sshMsgOk', 'Error de red', false); }
    });
  }

  testIdrac() {
    this.testing.set(true);
    this.api.post<any>('/api/settings/test/idrac').subscribe({
      next: r => { this.testing.set(false); this.showMsg('idracMsg', 'idracMsgOk', r.result + (r.detail ? ': ' + r.detail : ''), r.result === 'OK'); },
      error: () => { this.testing.set(false); this.showMsg('idracMsg', 'idracMsgOk', 'Error de red', false); }
    });
  }

  testAlerts() {
    this.testing.set(true);
    this.api.post<any>('/api/alerts/test').subscribe({
      next: r => { this.testing.set(false); this.showMsg('alertsMsg', 'alertsMsgOk', r.result + (r.detail ? ': ' + r.detail : ''), r.result === 'OK'); },
      error: () => { this.testing.set(false); this.showMsg('alertsMsg', 'alertsMsgOk', 'Error de red', false); }
    });
  }

  copyPrometheus() {
    navigator.clipboard.writeText(this.prometheusUrl).then(() => {
      this.copyMsg.set('¡Copiado!');
      setTimeout(() => this.copyMsg.set(''), 2000);
    });
  }

  private showMsg(msgKey: string, okKey: string, msg: string, ok: boolean) {
    (this as any)[msgKey].set(msg);
    (this as any)[okKey].set(ok);
    setTimeout(() => (this as any)[msgKey].set(''), 5000);
  }
}
