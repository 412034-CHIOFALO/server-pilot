import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth/auth.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  async openSocket(path: string): Promise<WebSocket> {
    const apiBase = environment.apiBase || '';
    const wsBase = environment.wsBase || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

    const ticketResp = await firstValueFrom(
      this.http.post<{ ticket: string }>(`${apiBase}/api/auth/ticket`, {})
    );
    const url = `${wsBase}${path}?ticket=${ticketResp.ticket}`;
    return new WebSocket(url);
  }
}
