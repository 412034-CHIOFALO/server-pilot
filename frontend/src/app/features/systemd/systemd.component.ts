import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { RealtimeService } from '../../core/realtime.service';

interface UnitDTO { name: string; load: string; active: string; sub: string; description: string; }

@Component({
  selector: 'app-systemd',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  styles: [`
    .toolbar { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
    .search-input {
      flex:1; min-width:200px; padding:8px 14px; border-radius:8px;
      border:1px solid var(--border); background:var(--bg-secondary);
      color:var(--text-primary); font-size:13px; outline:none;
    }
    .search-input:focus { border-color:var(--accent); }
    .refresh-btn {
      padding:8px 14px; border-radius:8px; border:1px solid var(--border);
      background:transparent; color:var(--text-secondary); cursor:pointer;
      font-size:13px; display:flex; align-items:center; gap:5px; transition:all .15s;
    }
    .refresh-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .refresh-btn mat-icon { font-size:16px; width:16px; height:16px; }

    table { width:100%; border-collapse:collapse; font-size:13px; }
    th {
      text-align:left; padding:8px 12px; font-size:11px; font-weight:600;
      text-transform:uppercase; letter-spacing:.6px; color:var(--text-secondary);
      border-bottom:1px solid var(--border); background:var(--bg-tertiary);
    }
    td { padding:9px 12px; border-bottom:1px solid var(--border-subtle); vertical-align:middle; }
    tr:hover td { background:var(--bg-hover); }
    .unit-name { font-family:monospace; font-size:12px; color:var(--text-primary); }
    .unit-desc { font-size:12px; color:var(--text-secondary); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    .badge {
      display:inline-block; font-size:10px; font-weight:600; padding:2px 8px;
      border-radius:20px; white-space:nowrap;
    }
    .active   { background:rgba(63,185,80,.1);  color:var(--green); border:1px solid rgba(63,185,80,.25); }
    .inactive { background:rgba(139,148,158,.1); color:var(--text-muted); border:1px solid rgba(139,148,158,.2); }
    .failed   { background:rgba(248,81,73,.1);  color:var(--red);   border:1px solid rgba(248,81,73,.25); }
    .other    { background:rgba(210,153,34,.1);  color:var(--yellow); border:1px solid rgba(210,153,34,.25); }

    .actions { display:flex; gap:3px; }
    .icon-btn {
      width:28px; height:28px; border-radius:6px; border:none;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; background:transparent; color:var(--text-secondary); transition:all .15s;
    }
    .icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .icon-btn.green:hover { background:rgba(63,185,80,.12); color:var(--green); }
    .icon-btn.red:hover   { background:rgba(248,81,73,.12); color:var(--red); }
    .icon-btn mat-icon { font-size:15px; width:15px; height:15px; }

    .log-panel {
      margin-top:20px; background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-md); overflow:hidden;
    }
    .log-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:10px 16px; background:var(--bg-tertiary); border-bottom:1px solid var(--border);
    }
    .log-title { font-size:12px; color:var(--text-secondary); font-family:monospace; display:flex; align-items:center; gap:6px; }
    .log-body {
      padding:12px 16px; font-family:'JetBrains Mono',monospace; font-size:11px; line-height:1.6;
      color:#c9d1d9; white-space:pre-wrap; max-height:350px; overflow-y:auto; background:#0d1117;
    }
    .live-dot { width:7px; height:7px; border-radius:50%; background:var(--green); animation:pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    .empty { text-align:center; padding:60px; color:var(--text-muted); }
    .empty mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto 12px; opacity:.25; }
    .loading { text-align:center; padding:40px; color:var(--text-muted); font-size:13px; }
    @media (max-width: 640px) {
      .col-load, .col-sub, .col-desc { display: none; }
      .search-input { min-width: 120px; }
    }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>tune</mat-icon> Systemd</h2>
      <input class="search-input" [(ngModel)]="filter" placeholder="Filtrar servicios…">
      <button class="refresh-btn" (click)="load()" [disabled]="loading()">
        <mat-icon>refresh</mat-icon> {{ loading() ? 'Cargando…' : 'Actualizar' }}
      </button>
    </div>

    @if (loading()) {
      <div class="loading">Cargando unidades…</div>
    } @else if (filtered().length === 0) {
      <div class="empty">
        <mat-icon>tune</mat-icon>
        <p>{{ units().length === 0 ? 'SSH no disponible o sin unidades.' : 'Sin resultados.' }}</p>
      </div>
    } @else {
      <div style="overflow-x:auto;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md)">
        <table>
          <thead>
            <tr>
              <th>Unidad</th>
              <th class="col-load">Load</th>
              <th>Active</th>
              <th class="col-sub">Sub</th>
              <th class="col-desc">Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (u of filtered(); track u.name) {
              <tr>
                <td><span class="unit-name">{{ u.name }}</span></td>
                <td class="col-load"><span class="badge" [class]="u.load === 'loaded' ? 'active' : 'inactive'">{{ u.load }}</span></td>
                <td><span class="badge" [class]="activeBadge(u.active)">{{ u.active }}</span></td>
                <td class="col-sub"><span style="font-size:11px;color:var(--text-secondary)">{{ u.sub }}</span></td>
                <td class="col-desc"><div class="unit-desc" [title]="u.description">{{ u.description }}</div></td>
                <td>
                  <div class="actions">
                    <button class="icon-btn green" matTooltip="Start"   (click)="doAction(u, 'start')"><mat-icon>play_arrow</mat-icon></button>
                    <button class="icon-btn red"   matTooltip="Stop"    (click)="doAction(u, 'stop')"><mat-icon>stop</mat-icon></button>
                    <button class="icon-btn"       matTooltip="Restart" (click)="doAction(u, 'restart')"><mat-icon>restart_alt</mat-icon></button>
                    <button class="icon-btn"       matTooltip="Journal" (click)="openJournal(u)"><mat-icon>article</mat-icon></button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (journalUnit()) {
      <div class="log-panel fade-in">
        <div class="log-header">
          <div class="log-title">
            <div class="live-dot"></div>
            journalctl -f — {{ journalUnit() }}
          </div>
          <button class="icon-btn" (click)="closeJournal()"><mat-icon>close</mat-icon></button>
        </div>
        <div class="log-body" #logBody>{{ journalLog() }}</div>
      </div>
    }
  `
})
export class SystemdComponent implements OnInit, OnDestroy {
  units   = signal<UnitDTO[]>([]);
  loading = signal(false);
  filter  = '';

  journalUnit = signal('');
  journalLog  = signal('');
  private journalWs?: WebSocket;

  constructor(private api: ApiService, private rt: RealtimeService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get<UnitDTO[]>('/api/systemd/units').subscribe({
      next: d => { this.units.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  filtered(): UnitDTO[] {
    const q = this.filter.toLowerCase();
    return q ? this.units().filter(u =>
      u.name.toLowerCase().includes(q) || u.description.toLowerCase().includes(q)
    ) : this.units();
  }

  activeBadge(active: string): string {
    if (active === 'active') return 'active';
    if (active === 'failed') return 'failed';
    if (active === 'inactive') return 'inactive';
    return 'other';
  }

  doAction(u: UnitDTO, action: string) {
    if ((action === 'stop' || action === 'restart') && !confirm(`¿${action} "${u.name}"?`)) return;
    this.api.post<any>(`/api/systemd/${u.name}/${action}`).subscribe({
      next: () => setTimeout(() => this.load(), 800),
      error: e => alert(e.error?.error || 'Error')
    });
  }

  async openJournal(u: UnitDTO) {
    this.closeJournal();
    this.journalUnit.set(u.name);
    this.journalLog.set('');
    this.journalWs = await this.rt.openSocket('/ws/journal/' + u.name);
    this.journalWs.onmessage = ev => {
      this.journalLog.update(l => l + ev.data);
    };
  }

  closeJournal() {
    this.journalWs?.close();
    this.journalWs = undefined;
    this.journalUnit.set('');
    this.journalLog.set('');
  }

  ngOnDestroy() { this.closeJournal(); }
}
