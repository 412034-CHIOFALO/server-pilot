import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-idrac',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatFormFieldModule, MatInputModule, MatTooltipModule],
  styles: [`
    .layout { display:grid; grid-template-columns:1fr 340px; gap:20px; align-items:start; }
    @media(max-width:900px) { .layout { grid-template-columns:1fr; } }

    .power-card {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-md); overflow:hidden;
    }
    .power-hero {
      padding:28px; text-align:center;
      background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(88,166,255,.07) 0%,transparent 70%);
      border-bottom:1px solid var(--border);
    }
    .power-indicator {
      width:80px; height:80px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      margin:0 auto 16px; transition:all .5s;
    }
    .power-indicator mat-icon { font-size:36px; width:36px; height:36px; }
    .power-indicator.on  {
      background:rgba(63,185,80,.12); border:2px solid rgba(63,185,80,.4);
      box-shadow: 0 0 30px rgba(63,185,80,.2);
    }
    .power-indicator.on mat-icon  { color:var(--green); }
    .power-indicator.off {
      background:rgba(110,118,129,.1); border:2px solid rgba(110,118,129,.2);
    }
    .power-indicator.off mat-icon { color:var(--text-muted); }
    .power-indicator.unknown {
      background:rgba(210,153,34,.1); border:2px solid rgba(210,153,34,.2);
    }
    .power-indicator.unknown mat-icon { color:var(--yellow); }

    .power-state { font-size:22px; font-weight:700; color:var(--text-primary); }
    .power-ip    { font-size:12px; color:var(--text-secondary); margin-top:4px; font-family:monospace; }

    .power-actions { padding:20px; display:flex; flex-direction:column; gap:8px; }
    .pwr-btn {
      display:flex; align-items:center; gap:10px;
      padding:11px 16px; border-radius:8px; border:1px solid;
      cursor:pointer; font-size:13px; font-weight:500;
      transition:all .15s; background:transparent; width:100%; text-align:left;
    }
    .pwr-btn mat-icon { font-size:18px; width:18px; height:18px; }
    .pwr-btn:disabled { opacity:.35; cursor:not-allowed; }

    .pwr-btn.primary {
      background:rgba(63,185,80,.1); color:var(--green); border-color:rgba(63,185,80,.3);
    }
    .pwr-btn.primary:hover:not(:disabled) { background:rgba(63,185,80,.2); border-color:rgba(63,185,80,.5); }
    .pwr-btn.neutral {
      color:var(--text-secondary); border-color:var(--border);
    }
    .pwr-btn.neutral:hover:not(:disabled) { background:var(--bg-hover); color:var(--text-primary); border-color:#444c56; }
    .pwr-btn.danger  {
      color:var(--red); border-color:rgba(248,81,73,.25);
    }
    .pwr-btn.danger:hover:not(:disabled)  { background:rgba(248,81,73,.1); border-color:rgba(248,81,73,.5); }

    .divider { border:none; border-top:1px solid var(--border); margin:4px 0; }
    .idrac-link {
      display:flex; align-items:center; gap:10px;
      padding:11px 16px; border-radius:8px; border:1px solid var(--border);
      color:var(--accent); text-decoration:none; font-size:13px; font-weight:500;
      transition:all .15s;
    }
    .idrac-link:hover { background:var(--accent-glow); border-color:rgba(88,166,255,.4); }
    .idrac-link mat-icon { font-size:18px; width:18px; height:18px; }

    .feedback {
      margin:0 20px 16px; padding:10px 14px; border-radius:8px;
      font-size:13px; display:flex; align-items:center; gap:8px;
    }
    .feedback.ok    { background:rgba(63,185,80,.08); color:var(--green); border:1px solid rgba(63,185,80,.2); }
    .feedback.error { background:rgba(248,81,73,.08); color:var(--red);   border:1px solid rgba(248,81,73,.2); }
    .feedback mat-icon { font-size:16px; width:16px; height:16px; }

    .config-card {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-md); padding:20px;
    }
    .section-title {
      font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.8px;
      color:var(--text-secondary); margin-bottom:16px; display:flex; align-items:center; gap:6px;
    }
    .section-title mat-icon { font-size:14px; width:14px; height:14px; }
    mat-form-field { width:100%; }
    .save-btn {
      width:100%; padding:10px; border-radius:8px; border:none;
      background:var(--accent); color:#fff; font-size:13px; font-weight:600;
      cursor:pointer; transition:opacity .15s; margin-top:4px;
    }
    .save-btn:hover:not(:disabled) { opacity:.85; }
    .save-btn:disabled { opacity:.5; cursor:not-allowed; }
    .save-ok { font-size:12px; color:var(--green); margin-top:6px; display:flex; align-items:center; gap:4px; }
    .note {
      font-size:11px; color:var(--text-muted); line-height:1.7;
      margin-top:16px; padding-top:14px; border-top:1px solid var(--border-subtle);
    }
  `],
  template: `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <h2 class="page-title" style="margin:0"><mat-icon>power_settings_new</mat-icon> iDRAC / Power</h2>
      @if (configuredIp()) {
        <button (click)="refreshPower()" style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-secondary);cursor:pointer;font-size:12px;font-weight:500;transition:all .15s"
          [disabled]="polling()">
          <mat-icon style="font-size:15px;width:15px;height:15px">refresh</mat-icon>
          {{ polling() ? 'Verificando...' : 'Refrescar' }}
        </button>
      }
    </div>

    <div class="layout">
      <!-- Power control -->
      <div class="power-card">
        <div class="power-hero">
          <div class="power-indicator" [class]="indicatorClass()">
            <mat-icon>power_settings_new</mat-icon>
          </div>
          <div class="power-state">{{ powerLabel() }}</div>
          <div class="power-ip">{{ configuredIp() || 'iDRAC no configurado' }}</div>
        </div>

        @if (actionMsg()) {
          <div class="feedback" [class]="actionError() ? 'error' : 'ok'">
            <mat-icon>{{ actionError() ? 'error_outline' : 'check_circle' }}</mat-icon>
            {{ actionMsg() }}
          </div>
        }

        <div class="power-actions">
          <button class="pwr-btn primary"
            [disabled]="powerState()==='On' || !isConfigured() || busy()"
            (click)="action('on')">
            <mat-icon>power_settings_new</mat-icon>
            <div><div>Encender</div><div style="font-size:11px;opacity:.6">Power On via Redfish</div></div>
          </button>

          <button class="pwr-btn neutral"
            [disabled]="powerState()!=='On' || !isConfigured() || busy()"
            (click)="action('off')">
            <mat-icon>stop_circle</mat-icon>
            <div><div>Apagar</div><div style="font-size:11px;opacity:.6">Graceful Shutdown</div></div>
          </button>

          <button class="pwr-btn neutral"
            [disabled]="powerState()!=='On' || !isConfigured() || busy()"
            (click)="action('restart')">
            <mat-icon>restart_alt</mat-icon>
            <div><div>Reiniciar</div><div style="font-size:11px;opacity:.6">Graceful Restart</div></div>
          </button>

          <hr class="divider">

          <button class="pwr-btn danger"
            [disabled]="!isConfigured() || busy()"
            (click)="confirmForce('force-off')"
            matTooltip="Corta la alimentación inmediatamente sin apagar el SO">
            <mat-icon>flash_off</mat-icon>
            <div><div>Forzar apagado</div><div style="font-size:11px;opacity:.6">Force Off — sin aviso al SO</div></div>
          </button>

          <button class="pwr-btn danger"
            [disabled]="!isConfigured() || busy()"
            (click)="confirmForce('force-restart')"
            matTooltip="Reset de hardware sin apagar el SO">
            <mat-icon>electric_bolt</mat-icon>
            <div><div>Forzar reinicio</div><div style="font-size:11px;opacity:.6">Force Restart — reset de hardware</div></div>
          </button>

          @if (configuredIp()) {
            <hr class="divider">
            <a [href]="'https://' + configuredIp()" target="_blank" class="idrac-link">
              <mat-icon>open_in_new</mat-icon>
              Abrir WebUI del iDRAC
            </a>
          }
        </div>
      </div>

      <!-- Config -->
      <div class="config-card">
        <div class="section-title">
          <mat-icon>settings</mat-icon> Configuración iDRAC
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          <mat-form-field appearance="outline">
            <mat-label>IP del iDRAC</mat-label>
            <input matInput [(ngModel)]="form.ip" placeholder="192.168.1.100">
            <mat-icon matSuffix style="color:var(--text-muted)">router</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Usuario</mat-label>
            <input matInput [(ngModel)]="form.username" placeholder="root">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" [(ngModel)]="form.password"
              [placeholder]="hasPassword() ? '(sin cambios)' : 'calvin'">
          </mat-form-field>
          <button class="save-btn" (click)="saveConfig()" [disabled]="saving()">
            {{ saving() ? 'Guardando...' : 'Guardar configuración' }}
          </button>
          @if (saveMsg()) {
            <div class="save-ok"><mat-icon style="font-size:14px;width:14px;height:14px">check</mat-icon>{{ saveMsg() }}</div>
          }
        </div>

        <div class="note">
          Usa la API <strong>Redfish</strong> (iDRAC 7/8/9). El certificado SSL
          autofirmado se acepta automáticamente. La contraseña se guarda en
          <code>/data/idrac.json</code>.
        </div>
      </div>
    </div>
  `
})
export class IdracComponent implements OnInit, OnDestroy {
  powerState   = signal('Unknown');
  configuredIp = signal('');
  hasPassword  = signal(false);
  polling      = signal(false);
  busy         = signal(false);
  saving       = signal(false);
  actionMsg    = signal('');
  actionError  = signal(false);
  saveMsg      = signal('');

  form = { ip: '', username: '', password: '' };

  private interval?: ReturnType<typeof setInterval>;
  private msgTimer?: ReturnType<typeof setTimeout>;

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadConfig(); this.interval = setInterval(() => this.refreshPower(), 15000); }

  isConfigured() { return this.configuredIp().length > 0; }

  indicatorClass() {
    const s = this.powerState();
    if (s === 'On') return 'on';
    if (s === 'Off') return 'off';
    return 'unknown';
  }

  powerLabel() {
    return ({ 'On':'Encendido','Off':'Apagado','UNREACHABLE':'Sin respuesta','NOT_CONFIGURED':'No configurado' } as Record<string,string>)[this.powerState()] ?? this.powerState();
  }

  loadConfig() {
    this.api.get<{ ip:string; username:string; hasPassword:string }>('/api/idrac/config').subscribe({
      next: cfg => {
        this.form.ip = cfg.ip; this.form.username = cfg.username;
        this.configuredIp.set(cfg.ip); this.hasPassword.set(cfg.hasPassword === 'true');
        if (cfg.ip) this.refreshPower();
      }
    });
  }

  refreshPower() {
    if (!this.isConfigured()) return;
    this.polling.set(true);
    this.api.get<{ state:string }>('/api/idrac/power').subscribe({
      next: r => { this.powerState.set(r.state); this.polling.set(false); },
      error: () => { this.powerState.set('UNREACHABLE'); this.polling.set(false); }
    });
  }

  action(type: string) {
    this.busy.set(true); this.clearMsg();
    this.api.post(`/api/idrac/power/${type}`).subscribe({
      next: () => { this.busy.set(false); this.showMsg('Comando enviado', false); setTimeout(() => this.refreshPower(), 3000); },
      error: err => { this.busy.set(false); this.showMsg(err.error?.error || 'Error', true); }
    });
  }

  confirmForce(type: string) {
    const label = type === 'force-off' ? 'forzar apagado' : 'forzar reinicio';
    if (confirm(`¿Confirmar ${label}?\nEsto corta la alimentación sin apagar el SO.`)) this.action(type);
  }

  saveConfig() {
    this.saving.set(true); this.saveMsg.set('');
    this.api.put('/api/idrac/config', this.form).subscribe({
      next: () => {
        this.saving.set(false); this.configuredIp.set(this.form.ip);
        this.hasPassword.set(true); this.form.password = '';
        this.saveMsg.set('Guardado correctamente');
        this.refreshPower();
        setTimeout(() => this.saveMsg.set(''), 3000);
      },
      error: () => { this.saving.set(false); this.saveMsg.set('Error al guardar'); }
    });
  }

  private showMsg(msg: string, error: boolean) {
    clearTimeout(this.msgTimer);
    this.actionMsg.set(msg); this.actionError.set(error);
    this.msgTimer = setTimeout(() => this.actionMsg.set(''), 5000);
  }
  private clearMsg() { clearTimeout(this.msgTimer); this.actionMsg.set(''); }

  ngOnDestroy() { clearInterval(this.interval); clearTimeout(this.msgTimer); }
}
