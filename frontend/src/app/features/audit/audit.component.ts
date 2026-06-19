import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';

interface AuditEntry {
  timestamp: number;
  user: string;
  action: string;
  target: string;
  result: 'OK' | 'ERROR';
  detail: string;
}

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  styles: [`
    .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; gap:12px; flex-wrap:wrap; }
    .search-box {
      display:flex; align-items:center; gap:8px;
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:8px; padding:6px 12px; flex:1; max-width:340px; min-width:160px;
    }
    .search-box input {
      background:transparent; border:none; outline:none; color:var(--text-primary);
      font-size:13px; width:100%;
    }
    .search-box mat-icon { color:var(--text-muted); font-size:16px; width:16px; height:16px; }

    .refresh-btn {
      display:flex; align-items:center; gap:6px;
      padding:8px 16px; min-height:44px; border-radius:8px; cursor:pointer;
      font-size:13px; font-weight:500; border:1px solid var(--border);
      background:transparent; color:var(--text-secondary); transition:all .15s; white-space:nowrap;
    }
    .refresh-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .refresh-btn mat-icon { font-size:16px; width:16px; height:16px; }

    .table-wrap {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-md); overflow-x:auto;
    }
    table { width:100%; border-collapse:collapse; font-size:13px; min-width:420px; }
    thead tr { background:var(--bg-tertiary); }
    th {
      padding:10px 14px; text-align:left;
      font-size:10px; font-weight:600; letter-spacing:.6px; text-transform:uppercase;
      color:var(--text-muted); border-bottom:1px solid var(--border); white-space:nowrap;
    }
    td { padding:9px 14px; border-bottom:1px solid var(--border-subtle); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:var(--bg-hover); }

    .ts { font-family:monospace; color:var(--text-secondary); font-size:11px; white-space:nowrap; }
    .user { color:var(--accent); font-weight:500; }
    .action { font-family:monospace; color:var(--text-primary); font-size:12px; }
    .target { color:var(--text-secondary); font-family:monospace; font-size:12px;
              max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .detail { color:var(--text-muted); font-size:12px;
              max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    .empty { text-align:center; padding:48px; color:var(--text-muted); }
    .empty mat-icon { font-size:40px; width:40px; height:40px; display:block; margin:0 auto 12px; opacity:.3; }
    .count { font-size:12px; color:var(--text-muted); }

    @media (max-width: 640px) {
      .col-user, .col-target, .col-detail { display: none; }
    }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>history</mat-icon> Auditoría</h2>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input [(ngModel)]="filter" placeholder="Filtrar...">
        </div>
        <button class="refresh-btn" (click)="load()">
          <mat-icon>refresh</mat-icon> Refrescar
        </button>
      </div>
    </div>

    <div class="table-wrap">
      @if (filtered().length === 0) {
        <div class="empty">
          <mat-icon>history</mat-icon>
          <p>No hay registros de auditoría.</p>
        </div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th class="col-user">Usuario</th>
              <th>Acción</th>
              <th class="col-target">Target</th>
              <th>Resultado</th>
              <th class="col-detail">Detalle</th>
            </tr>
          </thead>
          <tbody>
            @for (e of filtered(); track e.timestamp + e.action) {
              <tr>
                <td class="ts">{{ formatTs(e.timestamp) }}</td>
                <td class="user col-user">{{ e.user }}</td>
                <td class="action">{{ e.action }}</td>
                <td class="target col-target" [title]="e.target">{{ e.target }}</td>
                <td><span [class]="e.result === 'OK' ? 'badge badge-running' : 'badge badge-exited'">{{ e.result }}</span></td>
                <td class="detail col-detail" [title]="e.detail">{{ e.detail }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div style="padding:8px 14px;border-top:1px solid var(--border-subtle)">
          <span class="count">{{ filtered().length }} de {{ entries().length }} registros</span>
        </div>
      }
    </div>
  `
})
export class AuditComponent implements OnInit {
  entries = signal<AuditEntry[]>([]);
  filter  = '';

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.get<AuditEntry[]>('/api/audit?limit=500').subscribe({
      next: d => this.entries.set(d)
    });
  }

  filtered() {
    const q = this.filter.toLowerCase();
    if (!q) return this.entries();
    return this.entries().filter(e =>
      e.action.toLowerCase().includes(q) ||
      e.user.toLowerCase().includes(q) ||
      e.target.toLowerCase().includes(q) ||
      e.result.toLowerCase().includes(q) ||
      e.detail.toLowerCase().includes(q)
    );
  }

  formatTs(ms: number): string {
    return new Date(ms).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' });
  }
}
