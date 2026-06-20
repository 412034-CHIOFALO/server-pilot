import {
  Component, Input, Output, EventEmitter,
  AfterViewInit, OnDestroy, ViewChild, ElementRef, signal
} from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { MatIconModule } from '@angular/material/icon';
import { RealtimeService } from '../../core/realtime.service';

@Component({
  selector: 'app-container-console',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.65);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
    }
    .modal {
      width: min(960px, 96vw); height: 75vh;
      background: var(--bg-primary); border: 1px solid var(--border);
      border-radius: var(--radius-md); display: flex; flex-direction: column;
      overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,.5);
    }
    .titlebar {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; background: #161b22;
      border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .dots { display: flex; gap: 6px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .title {
      font-size: 12px; color: var(--text-secondary);
      font-family: monospace; flex: 1; margin-left: 4px;
    }
    .status-pill {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; padding: 3px 10px; border-radius: 12px;
      border: 1px solid; font-weight: 500;
    }
    .status-pill.connected    { background: rgba(63,185,80,.08);  color: var(--green);  border-color: rgba(63,185,80,.25); }
    .status-pill.connecting   { background: rgba(210,153,34,.08); color: var(--yellow); border-color: rgba(210,153,34,.25); }
    .status-pill.disconnected { background: rgba(248,81,73,.08);  color: var(--red);    border-color: rgba(248,81,73,.25); }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-pill.connected .status-dot    { background: var(--green);  animation: pulse 2s infinite; }
    .status-pill.connecting .status-dot   { background: var(--yellow); }
    .status-pill.disconnected .status-dot { background: var(--red); }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    .icon-btn {
      width: 28px; height: 28px; border-radius: 6px; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; background: transparent; color: var(--text-secondary);
      transition: all .15s;
    }
    .icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .icon-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .term-body { flex: 1; position: relative; min-height: 0; background: #0d1117; }
    .term-container { width: 100%; height: 100%; padding: 4px 2px; }
    .scroll-btn {
      position: absolute; bottom: 16px; right: 16px; z-index: 10;
      display: flex; align-items: center; gap: 4px;
      padding: 5px 12px; border-radius: 20px;
      background: var(--accent); color: #fff; border: none; cursor: pointer;
      font-size: 12px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,.4);
      transition: opacity .15s, transform .15s;
    }
    .scroll-btn:hover { opacity: .9; transform: translateY(-1px); }
  `],
  template: `
    <div class="overlay" (click)="onOverlayClick($event)">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="titlebar">
          <div class="dots">
            <div class="dot" style="background:#f85149"></div>
            <div class="dot" style="background:#d29922"></div>
            <div class="dot" style="background:#3fb950"></div>
          </div>
          <span class="title">
            <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:middle;margin-right:4px">terminal</mat-icon>
            {{ containerName }}
          </span>
          <div class="status-pill" [class]="statusClass()">
            <div class="status-dot"></div>{{ statusMsg() }}
          </div>
          <button class="icon-btn" (click)="closed.emit()" title="Cerrar">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="term-body">
          <div #termContainer class="term-container"></div>
          @if (showScrollBtn()) {
            <button class="scroll-btn" (click)="scrollToBottom()">↓ Ir al final</button>
          }
        </div>
      </div>
    </div>
  `
})
export class ContainerConsoleComponent implements AfterViewInit, OnDestroy {
  @Input() containerId!: string;
  @Input() containerName!: string;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('termContainer') termContainer!: ElementRef<HTMLDivElement>;

  statusMsg   = signal('Conectando...');
  statusClass = signal('connecting');
  showScrollBtn = signal(false);

  private term?: Terminal;
  private fitAddon?: FitAddon;
  private ws?: WebSocket;
  private resizeObserver?: ResizeObserver;
  private atBottom = true;

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
    setTimeout(() => { this.fitAddon?.fit(); this.term?.scrollToBottom(); }, 50);

    this.term.onData(data => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data);
    });

    this.term.onScroll(() => {
      if (!this.term) return;
      const buf = this.term.buffer.active;
      this.atBottom = buf.viewportY >= buf.length - this.term.rows;
      this.showScrollBtn.set(!this.atBottom);
    });

    this.resizeObserver = new ResizeObserver(() => {
      setTimeout(() => this.fitAddon?.fit(), 50);
    });
    this.resizeObserver.observe(this.termContainer.nativeElement);
  }

  private async connect() {
    this.statusMsg.set('Conectando...'); this.statusClass.set('connecting');
    try {
      this.ws = await this.rt.openSocket(`/ws/docker/exec/${this.containerId}`);
      this.statusMsg.set('Conectado'); this.statusClass.set('connected');
      this.atBottom = true;
      this.term?.scrollToBottom();
      this.ws.onmessage = ev => {
        if (ev.data instanceof Blob) {
          ev.data.arrayBuffer().then((buf: ArrayBuffer) => {
            this.term?.write(new Uint8Array(buf));
            if (this.atBottom) this.term?.scrollToBottom();
          });
        } else {
          this.term?.write(ev.data);
          if (this.atBottom) this.term?.scrollToBottom();
        }
      };
      this.ws.onclose = () => {
        this.statusMsg.set('Desconectado'); this.statusClass.set('disconnected');
        this.term?.writeln('\r\n\x1b[33m[Sesión terminada]\x1b[0m');
      };
      this.ws.onerror = () => { this.statusMsg.set('Error'); this.statusClass.set('disconnected'); };
    } catch {
      this.statusMsg.set('Error'); this.statusClass.set('disconnected');
      this.term?.writeln('\r\n\x1b[31m[No se pudo conectar al contenedor]\x1b[0m');
    }
  }

  scrollToBottom() {
    this.term?.scrollToBottom();
    this.atBottom = true;
    this.showScrollBtn.set(false);
  }

  onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this.closed.emit();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.ws?.close();
    this.term?.dispose();
  }
}
