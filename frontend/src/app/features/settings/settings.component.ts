import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [MatIconModule],
  template: `<h2 class="page-title"><mat-icon>settings</mat-icon> Configuración</h2><p style="color:var(--text-secondary)">Cargando...</p>`
})
export class SettingsComponent {}
