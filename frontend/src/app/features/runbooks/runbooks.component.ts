import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-runbooks',
  standalone: true,
  imports: [MatIconModule],
  template: `<h2 class="page-title"><mat-icon>bolt</mat-icon> Acciones</h2><p style="color:var(--text-secondary)">Cargando...</p>`
})
export class RunbooksComponent {}
