import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [MatIconModule],
  template: `<h2 class="page-title"><mat-icon>memory</mat-icon> Procesos</h2><p style="color:var(--text-secondary)">Cargando...</p>`
})
export class ProcessesComponent {}
