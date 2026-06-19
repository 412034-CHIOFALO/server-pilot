import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, signal } from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { MatIconModule } from '@angular/material/icon';
import { RealtimeService } from '../../core/realtime.service';

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
    .status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .status-pill.connected .status-dot { background:var(--green); animation:pulse 2s infinite; }
    .status-pill.disconnected .status-dot { background:var(--red); }
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
    }
    @media (max-width: 640px) {
      .term-wrapper { height:calc(100vh - 190px); }
    }
    .term-titlebar {
      display:flex; align-items:center; gap:8px;
      padding:8px 14px; background:#161b22; border-bottom:1px solid var(--border);
    }
    .term-dot { width:12px; height:12px; border-radius:50%; }
    .term-label { font-size:12px; color:var(--text-secondary); margin-left:4px; font-family:monospace; }
    #xterm-container { height:calc(100% - 37px); padding:4px 2px; }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>terminal</mat-icon> Terminal SSH</h2>
      <div class="toolbar-actions">
        <div class="status-pill" [class]="statusClass()">
          <div class="status-dot"></div>
          {{ statusMsg() }}
        </div>
        <button class="icon-btn" (click)="reconnect()" title="Reconectar">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
    </div>

    <div class="term-wrapper">
      <div class="term-titlebar">
        <div class="term-dot" style="background:#f85149"></div>
        <div class="term-dot" style="background:#d29922"></div>
        <div class="term-dot" style="background:#3fb950"></div>
        <span class="term-label">ssh — bash</span>
      </div>
      <div #termContainer id="xterm-container"></div>
    </div>
  `
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('termContainer') termContainer!: ElementRef<HTMLDivElement>;

  statusMsg   = signal('Conectando...');
  statusClass = signal('connecting');

  private term?: Terminal;
  private fitAddon?: FitAddon;
  private ws?: WebSocket;
  private resizeObserver?: ResizeObserver;

  constructor(private rt: RealtimeService) {}

  ngAfterViewInit() { this.initTerminal(); this.connect(); }

  private initTerminal() {
    this.term = new Terminal({
      theme: {
        background: '#0d1117', foreground: '#e6edf3', cursor: '#58a6ff',
        selectionBackground: 'rgba(88,166,255,.2)',
        black: '#0d1117',  red: '#f85149',  green: '#3fb950', yellow: '#d29922',
        blue: '#58a6ff',   magenta: '#bc8cff', cyan: '#39c5cf', white: '#e6edf3',
      },
      fontFamily: "'JetBrains Mono','Cascadia Code','Fira Code',monospace",
      fontSize: 13, lineHeight: 1.4,
      cursorBlink: true, cursorStyle: 'bar',
      scrollback: 5000,
    });
    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(this.termContainer.nativeElement);
    setTimeout(() => this.fitAddon?.fit(), 50);

    this.term.onData(data => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data);
    });

    this.resizeObserver = new ResizeObserver(() => {
      setTimeout(() => this.fitAddon?.fit(), 50);
    });
    this.resizeObserver.observe(this.termContainer.nativeElement);
  }

  private async connect() {
    this.statusMsg.set('Conectando...'); this.statusClass.set('connecting');
    try {
      this.ws = await this.rt.openSocket('/ws/terminal');
      this.statusMsg.set('Conectado'); this.statusClass.set('connected');
      this.ws.onmessage = ev => {
        if (ev.data instanceof Blob) {
          ev.data.arrayBuffer().then((buf: ArrayBuffer) => this.term?.write(new Uint8Array(buf)));
        } else {
          this.term?.write(ev.data);
        }
      };
      this.ws.onclose = () => { this.statusMsg.set('Desconectado'); this.statusClass.set('disconnected'); };
      this.ws.onerror = () => { this.statusMsg.set('Error'); this.statusClass.set('disconnected'); };
    } catch {
      this.statusMsg.set('Error al conectar'); this.statusClass.set('disconnected');
      this.term?.writeln('\r\n\x1b[31m[No se pudo establecer la conexión SSH]\x1b[0m');
    }
  }

  reconnect() { this.ws?.close(); this.term?.clear(); this.connect(); }

  ngOnDestroy() { this.resizeObserver?.disconnect(); this.ws?.close(); this.term?.dispose(); }
}
