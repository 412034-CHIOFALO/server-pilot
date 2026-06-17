import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-files',
  standalone: true,
  imports: [MatIconModule],
  template: `<h2 class="page-title"><mat-icon>folder</mat-icon> Archivos</h2><p style="color:var(--text-secondary)">Cargando...</p>`
})
export class FilesComponent {}
