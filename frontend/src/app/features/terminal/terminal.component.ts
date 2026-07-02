import {
  Component, AfterViewInit, OnDestroy, ViewChildren, ViewChild,
  QueryList, ElementRef, computed
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TerminalService } from './terminal.service';

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
    .status-pill {
      display:flex; align-items:center; gap:6px; padding:4px 12px;
      border-radius:20px; font-size:12px; font-weight:500;
      border:1px solid; transition:all .3s;
    }
    .status-pill.connected { background:rgba(63,185,80,.08); color:var(--green); border-color:rgba(63,185,80,.25); }
    .status-pill.disconnected { background:rgba(248,81,73,.08); color:var(--red); border-color:rgba(248,81,73,.25); }
    .status-pill.connecting { background:rgba(210,153,34,.08); color:var(--yellow); border-color:rgba(210,153,34,.25); }
    .status-pill.error { background:rgba(248,81,73,.08); color:var(--red); border-color:rgba(248,81,73,.25); }
    .status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .status-pill.connected .status-dot { background:var(--green); animation:pulse 2s infinite; }
    .status-pill.disconnected .status-dot,
    .status-pill.error .status-dot { background:var(--red); }
    .status-pill.connecting .status-dot { background:var(--yellow); }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    .toolbar-actions { display:flex; align-items:center; gap:8px; }
    .icon-btn {
      width:32px; height:32px; border-radius:8px; border:1px solid var(--border);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; background:transparent; color:var(--text-secondary);
      transition:all .15s;
    }
    .icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .icon-btn mat-icon { font-size:16px; width:16px; height:16px; }

    .term-wrapper {
      border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;
      background:#0d1117; height:calc(100vh - 200px);
      display:flex; flex-direction:column;
    }
    @media (max-width:640px) { .term-wrapper { height:calc(100vh - 190px); } }

    .term-titlebar {
      flex-shrink:0; display:flex; align-items:center; gap:0;
      background:#161b22; border-bottom:1px solid var(--border); height:38px;
    }
    .term-dots { display:flex; align-items:center; gap:6px; padding:0 12px; flex-shrink:0; }
    .term-dot { width:12px; height:12px; border-radius:50%; }

    .tabs-bar {
      display:flex; align-items:stretch; flex:1; overflow-x:auto; min-width:0;
      scrollbar-width:none;
    }
    .tabs-bar::-webkit-scrollbar { display:none; }

    .tab {
      display:flex; align-items:center; gap:6px; padding:0 10px;
      cursor:pointer; font-size:12px; color:var(--text-secondary);
      border-right:1px solid var(--border); white-space:nowrap;
      transition:background .15s; min-width:100px; max-width:160px;
      font-family:monospace;
    }
    .tab.active { color:var(--text-primary); background:#0d1117; }
    .tab:not(.active):hover { background:rgba(255,255,255,.04); }

    .tab-status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .tab-status-dot.connected { background:var(--green); }
    .tab-status-dot.connecting { background:var(--yellow); }
    .tab-status-dot.disconnected,
    .tab-status-dot.error { background:var(--red); }

    .tab-label { flex:1; overflow:hidden; text-overflow:ellipsis; }

    .tab-close {
      display:flex; align-items:center; justify-content:center;
      width:16px; height:16px; border:none; background:transparent;
      color:var(--text-secondary); cursor:pointer; border-radius:3px;
      opacity:0; transition:opacity .15s, background .15s; flex-shrink:0; padding:0;
    }
    .tab:hover .tab-close,
    .tab.active .tab-close { opacity:1; }
    .tab-close:hover { background:rgba(248,81,73,.2); color:#f85149; }
    .tab-close mat-icon { font-size:13px; width:13px; height:13px; line-height:13px; }

    .tab-new {
      display:flex; align-items:center; justify-content:center;
      width:34px; min-width:34px; border:none; background:transparent;
      color:var(--text-secondary); cursor:pointer; border-right:1px solid var(--border);
      transition:all .15s;
    }
    .tab-new:hover { background:rgba(255,255,255,.06); color:var(--text-primary); }
    .tab-new mat-icon { font-size:18px; width:18px; height:18px; }

    .term-pane { flex:1; min-height:0; overflow:hidden; }

    .term-empty {
      flex:1; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      color:var(--text-secondary); gap:14px;
    }
    .term-empty mat-icon { font-size:48px; width:48px; height:48px; opacity:.3; }
    .term-empty p { margin:0; font-size:14px; }
    .btn-open {
      padding:8px 18px; border-radius:8px; border:1px solid var(--border);
      background:transparent; color:var(--text-primary); cursor:pointer;
      font-size:13px; transition:all .15s;
    }
    .btn-open:hover { background:var(--bg-hover); }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>terminal</mat-icon> Terminal SSH</h2>
      <div class="toolbar-actions">
        @if (activeTab()) {
          <div class="status-pill" [class]="activeTab()!.status">
            <div class="status-dot"></div>
            {{ statusLabel(activeTab()!.status) }}
          </div>
          <button class="icon-btn" (click)="clearActive()" title="Limpiar terminal">
            <mat-icon>cleaning_services</mat-icon>
          </button>
        }
      </div>
    </div>

    <div class="term-wrapper" #termWrapper>
      <div class="term-titlebar">
        <div class="term-dots">
          <div class="term-dot" style="background:#f85149"></div>
          <div class="term-dot" style="background:#d29922"></div>
          <div class="term-dot" style="background:#3fb950"></div>
        </div>
        <div class="tabs-bar">
          @for (tab of svc.tabs(); track tab.id) {
            <div class="tab" [class.active]="svc.activeId() === tab.id" (click)="switchTab(tab.id)">
              <span class="tab-status-dot" [class]="tab.status"></span>
              <span class="tab-label">{{ tab.title }}</span>
              <button class="tab-close"
                      (click)="$event.stopPropagation(); svc.closeTab(tab.id)"
                      title="Cerrar">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
          <button class="tab-new" (click)="newTab()" title="Nueva terminal">
            <mat-icon>add</mat-icon>
          </button>
        </div>
      </div>

      @for (tab of svc.tabs(); track tab.id) {
        <div class="term-pane"
             [style.display]="svc.activeId() === tab.id ? 'block' : 'none'"
             #termPane>
        </div>
      }

      @if (svc.tabs().length === 0) {
        <div class="term-empty">
          <mat-icon>terminal</mat-icon>
          <p>Sin sesiones activas</p>
          <button class="btn-open" (click)="newTab()">Abrir terminal</button>
        </div>
      }
    </div>
  `
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('termPane') panes!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChild('termWrapper') termWrapper!: ElementRef<HTMLDivElement>;

  activeTab = computed(() => {
    const id = this.svc.activeId();
    return id ? this.svc.getTab(id) : null;
  });

  private panesSub?: { unsubscribe(): void };
  private resizeObs?: ResizeObserver;

  constructor(public svc: TerminalService) {}

  ngAfterViewInit() {
    if (this.svc.tabs().length === 0) {
      this.svc.createTab();
    } else {
      this.attachAll();
    }

    this.panesSub = this.panes.changes.subscribe(() => this.attachAll());
    this.setupResize();
  }

  private attachAll() {
    const tabs = this.svc.tabs();
    const paneEls = this.panes.toArray();

    tabs.forEach((tab, i) => {
      const paneEl = paneEls[i]?.nativeElement;
      if (!paneEl) return;

      if (tab.hostElement) {
        // Move the live DOM subtree (hostEl + xterm internals) — buffer, WS and _parent stay intact
        if (!paneEl.contains(tab.hostElement)) {
          paneEl.appendChild(tab.hostElement);
        }
      } else {
        // First mount: create host div in real DOM so xterm renderer initializes correctly
        const hostEl = document.createElement('div');
        hostEl.style.cssText = 'height:100%;width:100%;';
        paneEl.appendChild(hostEl);
        tab.terminal.open(hostEl);
        tab.hostElement = hostEl;
      }
    });

    const id = this.svc.activeId();
    if (id) {
      const t = this.svc.getTab(id);
      setTimeout(() => {
        t?.fitAddon.fit();
        t?.terminal.focus();
      }, 100);
    }
  }

  private setupResize() {
    this.resizeObs = new ResizeObserver(() => {
      const id = this.svc.activeId();
      if (id) setTimeout(() => this.svc.getTab(id)?.fitAddon.fit(), 50);
    });
    this.resizeObs.observe(this.termWrapper.nativeElement);
  }

  switchTab(id: string) {
    this.svc.setActive(id);
    setTimeout(() => {
      const t = this.svc.getTab(id);
      t?.fitAddon.fit();
      t?.terminal.focus();
    }, 50);
  }

  newTab() {
    this.svc.createTab();
  }

  clearActive() {
    const id = this.svc.activeId();
    if (id) this.svc.getTab(id)?.terminal.clear();
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      connecting: 'Conectando...', connected: 'Conectado',
      disconnected: 'Desconectado', error: 'Error',
    };
    return labels[status] ?? status;
  }

  ngOnDestroy() {
    this.panesSub?.unsubscribe();
    this.resizeObs?.disconnect();
    // Sessions live in TerminalService — don't close WS or dispose terminals here
  }
}
