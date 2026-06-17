import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'sp_creds';
  readonly loggedIn = signal(false);

  constructor(private router: Router) {
    const creds = localStorage.getItem(this.STORAGE_KEY);
    this.loggedIn.set(!!creds);
  }

  login(username: string, password: string): void {
    const creds = btoa(`${username}:${password}`);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ username, password, creds }));
    this.loggedIn.set(true);
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.loggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getCredentials(): { username: string; password: string; creds: string } | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  getBasicHeader(): string {
    const c = this.getCredentials();
    return c ? `Basic ${c.creds}` : '';
  }
}
