import { Injectable, signal } from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { RealtimeService } from '../../core/realtime.service';

export interface TerminalTab {
  id: string;
  title: string;
  terminal: Terminal;
  fitAddon: FitAddon;
  /** The div passed to terminal.open() — owned by the service, moved into panes by the component */
  hostElement?: HTMLDivElement;
  ws?: WebSocket;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

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

    const tab: TerminalTab = { id, title: `Terminal ${n}`, terminal, fitAddon, status: 'connecting' };

    // Ctrl+C: copy selection to clipboard (don't send SIGINT), or pass SIGINT if no selection.
    // Ctrl+V: read clipboard and send to shell. Both handle Shift variants (key is uppercase).
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      const ctrl = event.ctrlKey;
      const key = event.key.toLowerCase();

      if (ctrl && key === 'c') {
        if (terminal.hasSelection()) {
          navigator.clipboard.writeText(terminal.getSelection()).catch(() => {});
          return false;
        }
        return true; // no selection → pass SIGINT to shell
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

    try {
      const ws = await this.rt.openSocket('/ws/terminal'); // resolves only after onopen
      tab.ws = ws;
      tab.status = 'connected';
      this._tabs.update(t => [...t]);

      ws.onmessage = ev => {
        if (ev.data instanceof Blob) {
          ev.data.arrayBuffer().then(buf => terminal.write(new Uint8Array(buf)));
        } else {
          terminal.write(ev.data as string);
        }
      };

      ws.onclose = () => { tab.status = 'disconnected'; this._tabs.update(t => [...t]); };
      ws.onerror = () => { tab.status = 'error'; this._tabs.update(t => [...t]); };
    } catch {
      tab.status = 'error';
      terminal.writeln('\r\n\x1b[31m[No se pudo establecer la conexión SSH]\x1b[0m');
      this._tabs.update(t => [...t]);
    }

    return id;
  }

  closeTab(id: string): void {
    const tab = this._tabs().find(t => t.id === id);
    if (!tab) return;

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
    buf[0] = 0x01; // control marker — distinguishes from keyboard input (always text)
    buf.set(encoded, 1);
    tab.ws.send(buf);
  }
}
