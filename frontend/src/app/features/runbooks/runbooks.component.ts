import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { RunbookDialogComponent } from './runbook-dialog.component';

interface Runbook {
  id: string;
  name: string;
  description: string;
  command: string;
  confirm: boolean;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

@Component({
  selector: 'app-runbooks',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule, MatTooltipModule],
  styles: [`
    .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .add-btn {
      display:flex; align-items:center; gap:6px; padding:8px 18px;
      border-radius:8px; border:none; background:var(--accent); color:#fff;
      cursor:pointer; font-size:13px; font-weight:600; transition:opacity .15s;
    }
    .add-btn:hover { opacity:.85; }
    .add-btn mat-icon { font-size:16px; width:16px; height:16px; }

    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; margin-bottom:24px; }
    .rb-card {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-md); padding:18px 20px;
      display:flex; flex-direction:column; gap:10px;
      transition:border-color .2s, box-shadow .2s;
    }
    .rb-card:hover { border-color:#444c56; box-shadow:var(--shadow-md); }
    .rb-header { display:flex; align-items:flex-start; justify-content:space-between; }
    .rb-name { font-size:15px; font-weight:600; color:var(--text-primary); }
    .rb-desc { font-size:12px; color:var(--text-secondary); line-height:1.5; }
    .rb-cmd  { font-family:monospace; font-size:11px; color:var(--accent); background:var(--bg-tertiary); padding:6px 10px; border-radius:6px; word-break:break-all; }
    .rb-footer { display:flex; align-items:center; gap:8px; justify-content:space-between; }
    .run-btn {
      display:flex; align-items:center; gap:6px; padding:7px 16px;
      border-radius:8px; border:none; background:var(--accent); color:#fff;
      cursor:pointer; font-size:12px; font-weight:600; transition:opacity .15s;
    }
    .run-btn:hover:not(:disabled) { opacity:.85; }
    .run-btn:disabled { opacity:.4; cursor:not-allowed; }
    .run-btn mat-icon { font-size:14px; width:14px; height:14px; }
    .card-actions { display:flex; gap:2px; }
    .icon-btn {
      width:28px; height:28px; border-radius:6px; border:none;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; background:transparent; color:var(--text-secondary); transition:all .15s;
    }
    .icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .icon-btn.danger:hover { background:rgba(248,81,73,.12); color:var(--red); }
    .icon-btn mat-icon { font-size:15px; width:15px; height:15px; }
    .confirm-badge {
      font-size:10px; color:var(--yellow); background:var(--yellow-glow);
      border:1px solid rgba(210,153,34,.25); border-radius:20px; padding:2px 8px;
    }

    .output-panel {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-md); overflow:hidden;
    }
    .output-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:10px 16px; background:var(--bg-tertiary); border-bottom:1px solid var(--border);
    }
    .output-title { font-size:12px; color:var(--text-secondary); font-family:monospace; display:flex; align-items:center; gap:6px; }
    .output-body {
      padding:14px 16px; font-family:'JetBrains Mono',monospace; font-size:12px; line-height:1.6;
      color:#c9d1d9; white-space:pre-wrap; max-height:400px; overflow-y:auto; background:#0d1117;
    }
    .exit-badge { font-size:11px; font-weight:600; padding:2px 10px; border-radius:20px; }
    .exit-ok  { background:rgba(63,185,80,.1); color:var(--green); border:1px solid rgba(63,185,80,.25); }
    .exit-err { background:rgba(248,81,73,.1); color:var(--red);   border:1px solid rgba(248,81,73,.25); }

    .empty { text-align:center; padding:60px; color:var(--text-muted); }
    .empty mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto 12px; opacity:.25; }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>bolt</mat-icon> Quick Actions</h2>
      <button class="add-btn" (click)="openDialog()">
        <mat-icon>add</mat-icon> Nueva acción
      </button>
    </div>

    @if (runbooks().length === 0) {
      <div class="empty">
        <mat-icon>bolt</mat-icon>
        <p>No hay acciones configuradas.</p>
      </div>
    } @else {
      <div class="grid">
        @for (rb of runbooks(); track rb.id) {
          <div class="rb-card fade-in">
            <div class="rb-header">
              <div class="rb-name">{{ rb.name }}</div>
              <div class="card-actions">
                <button class="icon-btn" matTooltip="Editar" (click)="openDialog(rb)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button class="icon-btn danger" matTooltip="Eliminar" (click)="delete(rb)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
            <div class="rb-desc">{{ rb.description }}</div>
            <div class="rb-cmd">$ {{ rb.command }}</div>
            <div class="rb-footer">
              <button class="run-btn" (click)="run(rb)" [disabled]="running()">
                <mat-icon>play_arrow</mat-icon>
                {{ running() && runningId() === rb.id ? 'Ejecutando...' : 'Ejecutar' }}
              </button>
              @if (rb.confirm) { <span class="confirm-badge">⚠ confirmación requerida</span> }
            </div>
          </div>
        }
      </div>
    }

    @if (lastResult()) {
      <div class="output-panel fade-in">
        <div class="output-header">
          <div class="output-title">
            <mat-icon style="font-size:14px;width:14px;height:14px;color:var(--accent)">terminal</mat-icon>
            {{ lastRunName() }} — salida
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="exit-badge" [class]="lastResult()!.exitCode === 0 ? 'exit-ok' : 'exit-err'">
              exit {{ lastResult()!.exitCode }}
            </span>
            <button class="icon-btn" (click)="lastResult.set(null)"><mat-icon>close</mat-icon></button>
          </div>
        </div>
        <div class="output-body">{{ lastResult()!.stdout }}{{ lastResult()!.stderr }}</div>
      </div>
    }
  `
})
export class RunbooksComponent implements OnInit {
  runbooks   = signal<Runbook[]>([]);
  running    = signal(false);
  runningId  = signal('');
  lastResult = signal<RunResult | null>(null);
  lastRunName = signal('');

  constructor(private api: ApiService, private dialog: MatDialog) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.get<Runbook[]>('/api/runbooks').subscribe({ next: d => this.runbooks.set(d) });
  }

  run(rb: Runbook) {
    if (rb.confirm && !confirm(`¿Ejecutar "${rb.name}"?\n$ ${rb.command}`)) return;
    this.running.set(true);
    this.runningId.set(rb.id);
    this.lastResult.set(null);
    this.lastRunName.set(rb.name);
    this.api.post<RunResult>(`/api/runbooks/${rb.id}/run`).subscribe({
      next: r => { this.running.set(false); this.lastResult.set(r); },
      error: e => { this.running.set(false); alert(e.error?.error || 'Error'); }
    });
  }

  openDialog(rb?: Runbook) {
    const ref = this.dialog.open(RunbookDialogComponent, { data: rb, width: '480px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      if (rb) this.api.put(`/api/runbooks/${rb.id}`, result).subscribe(() => this.load());
      else     this.api.post('/api/runbooks', result).subscribe(() => this.load());
    });
  }

  delete(rb: Runbook) {
    if (!confirm(`¿Eliminar "${rb.name}"?`)) return;
    this.api.delete(`/api/runbooks/${rb.id}`).subscribe(() => this.load());
  }
}
