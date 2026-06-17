import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { ServiceDialogComponent } from './service-dialog/service-dialog.component';

interface ServiceStatus { id:string; name:string; host:string; port:number; status:string; }

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule, MatTooltipModule],
  styles: [`
    .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
    .btn-group { display:flex; gap:8px; }

    .services-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; }
    .svc-card {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-md); padding:16px 18px;
      display:flex; flex-direction:column; gap:10px;
      transition:border-color .2s, box-shadow .2s;
      position:relative; overflow:hidden;
    }
    .svc-card:hover { border-color:#444c56; box-shadow:var(--shadow-md); }
    .svc-card .status-stripe {
      position:absolute; top:0; left:0; bottom:0; width:3px;
      border-radius:var(--radius-md) 0 0 var(--radius-md);
    }
    .svc-card.up   .status-stripe { background:var(--green); }
    .svc-card.down .status-stripe { background:var(--red); }

    .svc-header { display:flex; align-items:flex-start; justify-content:space-between; padding-left:8px; }
    .svc-name   { font-size:15px; font-weight:600; color:var(--text-primary); }
    .svc-addr   { font-size:12px; color:var(--text-secondary); font-family:monospace; padding-left:8px; margin-top:2px; }
    .svc-actions { display:flex; gap:4px; }
    .icon-btn {
      width:28px; height:28px; border-radius:6px; border:none;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; background:transparent; color:var(--text-secondary);
      transition:all .15s;
    }
    .icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .icon-btn.danger:hover { background:rgba(248,81,73,.12); color:var(--red); }
    .icon-btn mat-icon { font-size:15px; width:15px; height:15px; }

    .add-btn {
      display:flex; align-items:center; gap:6px;
      padding:7px 16px; border-radius:8px; border:none;
      background:var(--accent); color:#fff; cursor:pointer;
      font-size:13px; font-weight:600; transition:opacity .15s;
    }
    .add-btn:hover { opacity:.85; }
    .add-btn mat-icon { font-size:16px; width:16px; height:16px; }

    .refresh-btn {
      display:flex; align-items:center; gap:6px;
      padding:7px 16px; border-radius:8px; cursor:pointer;
      font-size:13px; font-weight:500; border:1px solid var(--border);
      background:transparent; color:var(--text-secondary); transition:all .15s;
    }
    .refresh-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .refresh-btn mat-icon { font-size:16px; width:16px; height:16px; }

    .empty { text-align:center; padding:60px 24px; color:var(--text-muted); }
    .empty mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto 12px; opacity:.25; }
    .empty p { font-size:14px; }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>monitor_heart</mat-icon> Health Checks</h2>
      <div class="btn-group">
        <button class="refresh-btn" (click)="refresh()">
          <mat-icon>refresh</mat-icon> Verificar ahora
        </button>
        <button class="add-btn" (click)="openDialog('create')">
          <mat-icon>add</mat-icon> Agregar servicio
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="empty"><mat-icon>monitor_heart</mat-icon><p>Verificando servicios...</p></div>
    } @else if (services().length === 0) {
      <div class="empty">
        <mat-icon>monitor_heart</mat-icon>
        <p>No hay servicios configurados.</p>
        <button class="add-btn" style="margin:0 auto" (click)="openDialog('create')">
          <mat-icon>add</mat-icon> Agregar el primero
        </button>
      </div>
    } @else {
      <div class="services-grid">
        @for (s of services(); track s.id) {
          <div class="svc-card fade-in" [class.up]="s.status==='UP'" [class.down]="s.status!=='UP'">
            <div class="status-stripe"></div>
            <div class="svc-header">
              <div>
                <div class="svc-name">{{ s.name }}</div>
                <div class="svc-addr">{{ s.host }}:{{ s.port }}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span [class]="s.status==='UP' ? 'badge badge-up' : 'badge badge-down'">{{ s.status }}</span>
                <div class="svc-actions">
                  <button class="icon-btn" matTooltip="Editar" (click)="openDialog('edit', s)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="icon-btn danger" matTooltip="Eliminar" (click)="remove(s)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `
})
export class ServicesComponent implements OnInit, OnDestroy {
  services = signal<ServiceStatus[]>([]);
  loading = signal(true);
  private interval?: ReturnType<typeof setInterval>;

  constructor(private api: ApiService, private dialog: MatDialog) {}

  ngOnInit() { this.refresh(); this.interval = setInterval(() => this.refresh(), 15000); }

  refresh() {
    this.api.get<ServiceStatus[]>('/api/services/status').subscribe({
      next: d => { this.services.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openDialog(mode: 'create'|'edit', service?: ServiceStatus) {
    const ref = this.dialog.open(ServiceDialogComponent, { data: { mode, service } });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      if (mode === 'create') this.api.post('/api/services', result).subscribe(() => this.refresh());
      else if (service) this.api.put(`/api/services/${service.id}`, result).subscribe(() => this.refresh());
    });
  }

  remove(s: ServiceStatus) {
    if (confirm(`¿Eliminar "${s.name}"?`)) {
      this.api.delete(`/api/services/${s.id}`).subscribe(() => this.refresh());
    }
  }

  ngOnDestroy() { clearInterval(this.interval); }
}
