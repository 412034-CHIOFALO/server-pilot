import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { RealtimeService } from '../../core/realtime.service';

interface Container { id:string; shortId:string; name:string; image:string; status:string; state:string; ports:string[]; project:string; }
interface ProjectGroup { name:string; containers:Container[]; open:boolean; }

@Component({
  selector: 'app-containers',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, FormsModule],
  styles: [`
    .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
    .filter-tabs { display:flex; gap:4px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:8px; padding:3px; }
    .filter-tab {
      padding: 5px 14px; border-radius:6px; border:none; cursor:pointer;
      font-size:12px; font-weight:600; color:var(--text-secondary);
      background:transparent; transition:all .15s; letter-spacing:.2px;
    }
    .filter-tab.active { background:var(--bg-tertiary); color:var(--text-primary); }
    .filter-tab:hover:not(.active) { color:var(--text-primary); }

    .project-block { margin-bottom:12px; border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; }
    .project-header {
      display:flex; align-items:center; gap:10px;
      padding:10px 16px; background:var(--bg-secondary);
      cursor:pointer; user-select:none; transition:background .15s;
    }
    .project-header:hover { background:var(--bg-hover); }
    .project-name { font-size:13px; font-weight:600; color:var(--text-primary); flex:1; }
    .project-count { font-size:11px; color:var(--text-secondary); background:var(--bg-tertiary); padding:2px 8px; border-radius:12px; }
    .chevron { transition:transform .2s; color:var(--text-muted); font-size:18px; width:18px; height:18px; }
    .chevron.open { transform:rotate(90deg); }

    .container-scroll { overflow-x:auto; }
    .container-list { background:var(--bg-primary); min-width:520px; }
    .container-row {
      display:grid; grid-template-columns:1fr 1.2fr 100px 1fr auto;
      align-items:center; gap:16px;
      padding:10px 16px; border-top:1px solid var(--border-subtle);
      transition:background .15s;
    }
    .container-row:hover { background:var(--bg-tertiary); }
    .col-header {
      display:grid; grid-template-columns:1fr 1.2fr 100px 1fr auto;
      gap:16px; padding:8px 16px; min-width:520px;
      background:var(--bg-secondary); border-top:1px solid var(--border-subtle);
    }
    .col-header span { font-size:10px; font-weight:600; letter-spacing:.6px; text-transform:uppercase; color:var(--text-muted); }

    .cname { font-size:13px; font-weight:500; color:var(--text-primary); font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cimage { font-size:12px; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cports { font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .actions { display:flex; gap:2px; }
    .icon-btn {
      width:30px; height:30px; border-radius:6px; border:none;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; background:transparent; color:var(--text-secondary);
      transition:all .15s;
    }
    .icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .icon-btn mat-icon { font-size:16px; width:16px; height:16px; }
    .icon-btn.danger:hover { background:rgba(248,81,73,.12); color:var(--red); }
    .icon-btn:disabled { opacity:.35; cursor:not-allowed; }

    .logs-panel {
      background:var(--bg-primary); border-top:1px solid var(--border);
      padding:12px 16px;
    }
    .logs-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .logs-title { font-size:12px; color:var(--text-secondary); font-family:monospace; display:flex; align-items:center; gap:6px; }
    .logs-body {
      height:260px; overflow-y:auto; font-family:'JetBrains Mono',monospace;
      font-size:11px; line-height:1.6; white-space:pre-wrap;
      color:#c9d1d9; background:var(--bg-primary);
    }

    .empty { text-align:center; padding:48px; color:var(--text-muted); }
    .empty mat-icon { font-size:40px; width:40px; height:40px; display:block; margin:0 auto 12px; opacity:.3; }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>inventory_2</mat-icon> Contenedores</h2>
      <div style="display:flex;gap:10px;align-items:center">
        <div class="filter-tabs">
          <button class="filter-tab" [class.active]="filter==='all'"     (click)="filter='all'">Todos</button>
          <button class="filter-tab" [class.active]="filter==='running'" (click)="filter='running'">Running</button>
          <button class="filter-tab" [class.active]="filter==='stopped'" (click)="filter='stopped'">Stopped</button>
        </div>
        <button class="icon-btn" (click)="load()" matTooltip="Refrescar" style="width:34px;height:34px;border:1px solid var(--border);border-radius:8px">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="empty"><mat-icon>inventory_2</mat-icon>Cargando contenedores...</div>
    } @else if (groups().length === 0) {
      <div class="empty"><mat-icon>inventory_2</mat-icon>No hay contenedores</div>
    } @else {
      @for (group of groups(); track group.name) {
        <div class="project-block fade-in">
          <div class="project-header" (click)="group.open = !group.open">
            <mat-icon style="color:var(--accent);font-size:18px;width:18px;height:18px">folder_open</mat-icon>
            <span class="project-name">{{ group.name }}</span>
            <span class="project-count">{{ group.containers.length }}</span>
            <mat-icon class="chevron" [class.open]="group.open">chevron_right</mat-icon>
          </div>

          @if (group.open) {
            <div class="container-scroll">
            <div class="col-header">
              <span>Nombre</span><span>Imagen</span><span>Estado</span><span>Puertos</span><span>Acciones</span>
            </div>
            <div class="container-list">
              @for (c of group.containers; track c.id) {
                <div class="container-row">
                  <div class="cname">{{ c.name }}</div>
                  <div class="cimage" [matTooltip]="c.image">{{ c.image }}</div>
                  <div><span [class]="'badge badge-' + c.state">{{ c.state }}</span></div>
                  <div class="cports">{{ c.ports.join(', ') || '—' }}</div>
                  <div class="actions">
                    <button class="icon-btn" matTooltip="Start"
                      [disabled]="c.state==='running'" (click)="action('start',c)">
                      <mat-icon>play_arrow</mat-icon>
                    </button>
                    <button class="icon-btn" matTooltip="Stop"
                      [disabled]="c.state!=='running'" (click)="action('stop',c)">
                      <mat-icon>stop</mat-icon>
                    </button>
                    <button class="icon-btn" matTooltip="Restart" (click)="action('restart',c)">
                      <mat-icon>restart_alt</mat-icon>
                    </button>
                    <button class="icon-btn" matTooltip="Logs" (click)="toggleLogs(c)"
                      [style.color]="expandedId()===c.id ? 'var(--accent)' : ''">
                      <mat-icon>article</mat-icon>
                    </button>
                    <button class="icon-btn danger" matTooltip="Eliminar" (click)="confirmRemove(c)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>

                @if (expandedId() === c.id) {
                  <div class="logs-panel">
                    <div class="logs-header">
                      <div class="logs-title">
                        <mat-icon style="font-size:14px;width:14px;height:14px;color:var(--accent)">terminal</mat-icon>
                        {{ c.name }} — logs en vivo
                      </div>
                      <button class="icon-btn" (click)="closeLogs()"><mat-icon>close</mat-icon></button>
                    </div>
                    <div class="logs-body">{{ logsText() }}</div>
                  </div>
                }
              }
            </div>
            </div>
          }
        </div>
      }
    }
  `
})
export class ContainersComponent implements OnInit, OnDestroy {
  containers = signal<Container[]>([]);
  filter = 'all';
  loading = signal(true);
  expandedId = signal('');
  logsText = signal('');

  private logsWs?: WebSocket;
  private interval?: ReturnType<typeof setInterval>;

  filtered = computed(() => {
    const list = this.containers();
    if (this.filter === 'running') return list.filter(c => c.state === 'running');
    if (this.filter === 'stopped') return list.filter(c => c.state !== 'running');
    return list;
  });

  groups = computed<ProjectGroup[]>(() => {
    const map = new Map<string, Container[]>();
    for (const c of this.filtered()) {
      const k = c.project || 'standalone';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, containers]) => ({ name, containers, open: true }));
  });

  constructor(private api: ApiService, private rt: RealtimeService) {}

  ngOnInit() { this.load(); this.interval = setInterval(() => this.load(), 10000); }

  load() {
    this.api.get<Container[]>('/api/docker/containers?all=true').subscribe({
      next: d => { this.containers.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  action(type: 'start'|'stop'|'restart', c: Container) {
    this.api.post(`/api/docker/containers/${c.id}/${type}`).subscribe({
      next: () => setTimeout(() => this.load(), 1000),
      error: err => alert(err.error?.error || 'Error')
    });
  }

  confirmRemove(c: Container) {
    if (confirm(`¿Eliminar "${c.name}"?`)) {
      this.api.delete(`/api/docker/containers/${c.id}`).subscribe({
        next: () => { this.load(); if (this.expandedId() === c.id) this.closeLogs(); },
        error: err => alert(err.error?.error || 'Error')
      });
    }
  }

  groupHasExpanded(group: ProjectGroup): boolean {
    const id = this.expandedId();
    return !!id && group.containers.findIndex(c => c.id === id) !== -1;
  }

  async toggleLogs(c: Container) {
    if (this.expandedId() === c.id) { this.closeLogs(); return; }
    this.closeLogs();
    this.expandedId.set(c.id);
    this.logsText.set('');
    this.logsWs = await this.rt.openSocket(`/ws/docker/logs/${c.id}`);
    this.logsWs.onmessage = ev => this.logsText.update(t => t + ev.data);
  }

  closeLogs() { this.logsWs?.close(); this.expandedId.set(''); this.logsText.set(''); }

  ngOnDestroy() { clearInterval(this.interval); this.logsWs?.close(); }
}
