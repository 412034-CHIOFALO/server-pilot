import { Injectable, signal } from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { RealtimeService } from '../../core/realtime.service';

export interface TerminalTab {
  id: string;
  title: string;
  terminal: Terminal;
  fitAddon: FitAddon;
  hostElement?: HTMLDivElement;
  ws?: WebSocket;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  pingInterval?: ReturnType<typeof setInterval>;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

const PING_INTERVAL_MS = 25_000;
const MAX_RECONNECT_ATTEMPTS = 5;

@Injectable({ providedIn: 'root' })
export class TerminalService {
  private _tabs = signal<TerminalTab[]>([]);
  private _activeId = signal<string | null>(null);

  readonly tabs = this._tabs.asReadonly();
  readonly activeId = this._activeId.asReadonly();

  constructor(private rt: RealtimeService) {}

  async createTab(): Promise<string> {
    const id = crypto.randomUUID();
    const n = this._tabs().length + 1;

    const terminal = new Terminal({
      theme: {
        background: '#0d1117', foreground: '#e6edf3', cursor: '#58a6ff',
        selectionBackground: 'rgba(88,166,255,.2)',
        black: '#0d1117', red: '#f85149', green: '#3fb950', yellow: '#d29922',
        blue: '#58a6ff', magenta: '#bc8cff', cyan: '#39c5cf', white: '#e6edf3',
      },
      fontFamily: "'JetBrains Mono','Cascadia Code','Fira Code',monospace",
      fontSize: 13, lineHeight: 1.4,
      cursorBlink: true, cursorStyle: 'bar',
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    const tab: TerminalTab = {
      id, title: `Terminal ${n}`, terminal, fitAddon,
      status: 'connecting', reconnectAttempts: 0,
    };

    // Ctrl+C: copy selection, or pass SIGINT if no selection.
    // Ctrl+V: paste from clipboard.
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      const ctrl = event.ctrlKey;
      const key = event.key.toLowerCase();

      if (ctrl && key === 'c') {
        if (terminal.hasSelection()) {
          navigator.clipboard.writeText(terminal.getSelection()).catch(() => {});
          return false;
        }
        return true;
      }

      if (ctrl && key === 'v') {
        navigator.clipboard.readText()
          .then(text => { if (tab.ws?.readyState === WebSocket.OPEN) tab.ws.send(text); })
          .catch(() => {});
        return false;
      }

      return true;
    });

    terminal.onData(data => {
      if (tab.ws?.readyState === WebSocket.OPEN) tab.ws.send(data);
    });

    this._tabs.update(tabs => [...tabs, tab]);
    this._activeId.set(id);

    await this.connectTab(tab);
    return id;
  }

  private async connectTab(tab: TerminalTab): Promise<void> {
    tab.status = 'connecting';
    this._tabs.update(t => [...t]);

    try {
      const ws = await this.rt.openSocket('/ws/terminal');
      tab.ws = ws;
      tab.status = 'connected';
      tab.reconnectAttempts = 0;
      this._tabs.update(t => [...t]);

      this.startPing(tab, ws);

      ws.onmessage = ev => {
        if (ev.data instanceof Blob) {
          ev.data.arrayBuffer().then(buf => tab.terminal.write(new Uint8Array(buf)));
        } else {
          tab.terminal.write(ev.data as string);
        }
      };

      ws.onclose = () => {
        this.stopPing(tab);
        tab.status = 'disconnected';
        this._tabs.update(t => [...t]);
        this.scheduleReconnect(tab.id);
      };

      ws.onerror = () => {
        this.stopPing(tab);
        tab.status = 'error';
        this._tabs.update(t => [...t]);
      };

    } catch {
      tab.status = 'error';
      tab.terminal.writeln('\r\n\x1b[31m[No se pudo establecer la conexión SSH]\x1b[0m');
      this._tabs.update(t => [...t]);
    }
  }

  private startPing(tab: TerminalTab, ws: WebSocket): void {
    this.stopPing(tab);
    tab.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(new Uint8Array([0x02])); // keepalive ping — backend ignores it
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing(tab: TerminalTab): void {
    if (tab.pingInterval !== undefined) {
      clearInterval(tab.pingInterval);
      tab.pingInterval = undefined;
    }
  }

  private scheduleReconnect(id: string): void {
    const tab = this.getTab(id);
    if (!tab) return;

    const attempts = tab.reconnectAttempts + 1;
    if (attempts > MAX_RECONNECT_ATTEMPTS) {
      tab.terminal.writeln('\r\n\x1b[31m[Reconexión fallida. Usá el botón Reconectar para reintentar.]\x1b[0m');
      this._tabs.update(t => [...t]);
      return;
    }

    tab.reconnectAttempts = attempts;
    const delayMs = Math.min(1000 * Math.pow(2, attempts - 1), 30_000); // 1s 2s 4s 8s 16s
    const secs = Math.round(delayMs / 1000);
    tab.terminal.writeln(`\r\n\x1b[33m[Desconectado. Reintentando en ${secs}s (intento ${attempts}/${MAX_RECONNECT_ATTEMPTS})...]\x1b[0m`);
    this._tabs.update(t => [...t]);

    clearTimeout(tab.reconnectTimer);
    tab.reconnectTimer = setTimeout(async () => {
      const current = this.getTab(id);
      if (!current || current.status !== 'disconnected') return;
      await this.connectTab(current);
      if (current.status === 'connected') {
        current.terminal.writeln('\r\n\x1b[32m[Reconectado]\x1b[0m');
      }
    }, delayMs);
  }

  async reconnect(id: string): Promise<void> {
    const tab = this.getTab(id);
    if (!tab) return;
    clearTimeout(tab.reconnectTimer);
    tab.reconnectAttempts = 0;
    tab.terminal.writeln('\r\n\x1b[33m[Reconectando...]\x1b[0m');
    await this.connectTab(tab);
    if (tab.status === 'connected') {
      tab.terminal.writeln('\r\n\x1b[32m[Reconectado]\x1b[0m');
    }
  }

  closeTab(id: string): void {
    const tab = this._tabs().find(t => t.id === id);
    if (!tab) return;

    this.stopPing(tab);
    clearTimeout(tab.reconnectTimer);
    tab.ws?.close();
    tab.terminal.dispose();

    const remaining = this._tabs().filter(t => t.id !== id);
    this._tabs.set(remaining);

    if (this._activeId() === id) {
      this._activeId.set(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  }

  setActive(id: string): void {
    this._activeId.set(id);
  }

  getTab(id: string): TerminalTab | undefined {
    return this._tabs().find(t => t.id === id);
  }

  resize(id: string, cols: number, rows: number): void {
    const tab = this.getTab(id);
    if (!tab?.ws || tab.ws.readyState !== WebSocket.OPEN) return;
    const encoded = new TextEncoder().encode(JSON.stringify({ cols, rows }));
    const buf = new Uint8Array(1 + encoded.length);
    buf[0] = 0x01;
    buf.set(encoded, 1);
    tab.ws.send(buf);
  }
}
