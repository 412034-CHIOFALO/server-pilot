import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WsStatusService {
  readonly connected = signal(false);
  setConnected(v: boolean) { this.connected.set(v); }
}
