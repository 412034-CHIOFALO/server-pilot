import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';

interface ProcessDTO {
  pid: number;
  name: string;
  user: string;
  cpuPercent: number;
  memRssMB: number;
  state: string;
}

@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  styles: [`
    .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
    .controls { display:flex; gap:10px; align-items:center; }
    .pause-btn {
      display:flex; align-items:center; gap:6px; padding:7px 14px;
      border-radius:8px; border:1px solid var(--border); background:transparent;
      color:var(--text-secondary); cursor:pointer; font-size:12px; font-weight:500; transition:all .15s;
    }
    .pause-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .pause-btn mat-icon { font-size:16px; width:16px; height:16px; }

    .table-wrap {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-md); overflow:hidden;
    }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    thead tr { background:var(--bg-tertiary); }
    th {
      padding:9px 14px; text-align:left;
      font-size:10px; font-weight:600; letter-spacing:.6px; text-transform:uppercase;
      color:var(--text-muted); border-bottom:1px solid var(--border);
    }
    td { padding:8px 14px; border-bottom:1px solid var(--border-subtle); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:var(--bg-hover); }

    .pid   { font-family:monospace; color:var(--text-muted); font-size:12px; }
    .pname { font-weight:500; color:var(--text-primary); }
    .user  { color:var(--text-secondary); font-size:12px; }
    .cpu   { font-family:monospace; font-weight:600; }
    .mem   { font-family:monospace; color:var(--text-secondary); font-size:12px; }

    .cpu-bar { display:flex; align-items:center; gap:8px; }
    .cpu-track { flex:1; background:var(--bg-tertiary); border-radius:4px; height:4px; min-width:60px; }
    .cpu-fill  { height:4px; border-radius:4px; transition:width .5s; }

    .kill-btn {
      display:flex; align-items:center; gap:4px;
      padding:4px 10px; border-radius:6px; border:1px solid rgba(248,81,73,.25);
      background:transparent; color:var(--red); cursor:pointer; font-size:11px; font-weight:500;
      transition:all .15s;
    }
    .kill-btn:hover { background:rgba(248,81,73,.1); border-color:rgba(248,81,73,.5); }
    .kill-btn mat-icon { font-size:13px; width:13px; height:13px; }

    .force-toggle { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--text-muted); cursor:pointer; }
    .force-toggle input { cursor:pointer; }

    .empty { text-align:center; padding:48px; color:var(--text-muted); }
    .empty mat-icon { font-size:40px; width:40px; height:40px; display:block; margin:0 auto 12px; opacity:.3; }
    .auto-badge {
      font-size:11px; color:var(--green); background:rgba(63,185,80,.08);
      border:1px solid rgba(63,185,80,.2); border-radius:20px; padding:2px 10px;
    }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>memory</mat-icon> Procesos</h2>
      <div class="controls">
        @if (!paused()) { <span class="auto-badge">● auto-refresh 5s</span> }
        <button class="pause-btn" (click)="togglePause()">
          <mat-icon>{{ paused() ? 'play_arrow' : 'pause' }}</mat-icon>
          {{ paused() ? 'Reanudar' : 'Pausar' }}
        </button>
        <button class="pause-btn" (click)="load()">
          <mat-icon>refresh</mat-icon> Actualizar
        </button>
      </div>
    </div>

    <div class="table-wrap">
      @if (processes().length === 0) {
        <div class="empty"><mat-icon>memory</mat-icon><p>Sin datos</p></div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>PID</th>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>CPU %</th>
              <th>RAM MB</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            @for (p of processes(); track p.pid) {
              <tr>
                <td class="pid">{{ p.pid }}</td>
                <td class="pname">{{ p.name }}</td>
                <td class="user">{{ p.user }}</td>
                <td>
                  <div class="cpu-bar">
                    <span class="cpu" [style.color]="cpuColor(p.cpuPercent)">{{ p.cpuPercent | number:'1.1-1' }}%</span>
                    <div class="cpu-track">
                      <div class="cpu-fill" [style.width]="p.cpuPercent + '%'" [style.background]="cpuColor(p.cpuPercent)"></div>
                    </div>
                  </div>
                </td>
                <td class="mem">{{ p.memRssMB }}</td>
                <td><span class="badge" [class]="stateClass(p.state)">{{ p.state }}</span></td>
                <td>
                  <div style="display:flex;gap:8px;align-items:center">
                    <button class="kill-btn" (click)="kill(p)">
                      <mat-icon>close</mat-icon>
                      {{ forceMode ? 'SIGKILL' : 'SIGTERM' }}
                    </button>
                    <label class="force-toggle" matTooltip="Forzar SIGKILL">
                      <input type="checkbox" [(ngModel)]="forceMode"> Forzar
                    </label>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `
})
export class ProcessesComponent implements OnInit, OnDestroy {
  processes = signal<ProcessDTO[]>([]);
  paused    = signal(false);
  forceMode = false;

  private interval?: ReturnType<typeof setInterval>;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
    this.interval = setInterval(() => { if (!this.paused()) this.load(); }, 5000);
  }

  load() {
    this.api.get<ProcessDTO[]>('/api/processes?limit=20').subscribe({
      next: d => this.processes.set(d)
    });
  }

  togglePause() { this.paused.set(!this.paused()); }

  kill(p: ProcessDTO) {
    const label = this.forceMode ? 'SIGKILL (forzar)' : 'SIGTERM';
    if (!confirm(`¿Enviar ${label} al proceso "${p.name}" (PID ${p.pid})?`)) return;
    this.api.post(`/api/processes/${p.pid}/kill?force=${this.forceMode}`).subscribe({
      next: () => setTimeout(() => this.load(), 500),
      error: e => alert(e.error?.error || 'Error al matar proceso')
    });
  }

  cpuColor(pct: number): string {
    if (pct >= 70) return 'var(--red)';
    if (pct >= 40) return 'var(--yellow)';
    return 'var(--green)';
  }

  stateClass(state: string): string {
    if (state === 'RUNNING') return 'badge-running';
    if (state === 'SLEEPING') return 'badge badge-up';
    return 'badge badge-exited';
  }

  ngOnDestroy() { clearInterval(this.interval); }
}
