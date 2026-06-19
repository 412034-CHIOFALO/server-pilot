import { Injectable, signal } from '@angular/core';
import { RealtimeService } from './realtime.service';

export interface MetricsSnapshot {
  cpu: { usagePercent: number };
  ram: { totalMB: number; usedMB: number; freeMB: number; usagePercent: number };
  disks: Array<{ path: string; totalGB: number; usedGB: number; freeGB: number; usagePercent: number }>;
  net: Array<{ name: string; rxBytesPerSec: number; txBytesPerSec: number }>;
  uptimeSeconds: number;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class MetricsStore {
  readonly metrics   = signal<MetricsSnapshot | null>(null);
  readonly connected = signal(false);

  private ws?: WebSocket;
  private reconnectDelay = 2000;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(private rt: RealtimeService) {
    this.connect();
  }

  private async connect() {
    try {
      this.ws = await this.rt.openSocket('/ws/metrics');
      this.ws.onopen    = () => { this.connected.set(true); this.reconnectDelay = 2000; };
      this.ws.onmessage = (ev) => { this.connected.set(true); this.metrics.set(JSON.parse(ev.data)); };
      this.ws.onerror   = () => { this.connected.set(false); };
      this.ws.onclose   = () => { this.connected.set(false); this.scheduleReconnect(); };
    } catch {
      this.connected.set(false);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }
}
