import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface UpdateInfo { count: number; rebootRequired: boolean; packages: string[]; }

@Component({
  selector: 'app-updates-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule],
  styles: [`
    .dialog-header {
      display:flex; align-items:center; gap:10px;
      padding:18px 24px 14px; border-bottom:1px solid var(--border);
    }
    .dialog-icon {
      width:36px; height:36px; border-radius:8px;
      background:rgba(210,153,34,.12); border:1px solid rgba(210,153,34,.2);
      display:flex; align-items:center; justify-content:center;
    }
    .dialog-icon mat-icon { color:var(--yellow); font-size:18px; width:18px; height:18px; }
    .dialog-title { font-size:16px; font-weight:600; color:var(--text-primary); }
    .dialog-body { padding:16px 24px; max-height:420px; overflow-y:auto; }
    .reboot-warn {
      display:flex; align-items:center; gap:8px; padding:10px 14px;
      background:rgba(248,81,73,.08); border:1px solid rgba(248,81,73,.2);
      border-radius:8px; margin-bottom:14px; font-size:13px; color:var(--red);
    }
    .pkg-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:4px; }
    .pkg-item {
      font-family:monospace; font-size:12px; color:#c9d1d9;
      background:var(--bg-tertiary); padding:5px 10px; border-radius:5px;
    }
    .empty { text-align:center; padding:24px; color:var(--text-muted); font-size:13px; }
    .dialog-footer {
      display:flex; justify-content:flex-end;
      padding:12px 24px 16px; border-top:1px solid var(--border);
    }
    .close-btn {
      padding:8px 18px; border-radius:8px; border:1px solid var(--border);
      background:transparent; color:var(--text-secondary); cursor:pointer;
      font-size:13px; font-weight:500; transition:all .15s;
    }
    .close-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
  `],
  template: `
    <div class="dialog-header">
      <div class="dialog-icon"><mat-icon>system_update</mat-icon></div>
      <div>
        <div class="dialog-title">Actualizaciones disponibles</div>
        <div style="font-size:12px;color:var(--text-secondary)">{{ data.count }} paquetes pendientes</div>
      </div>
    </div>
    <div class="dialog-body">
      @if (data.rebootRequired) {
        <div class="reboot-warn">
          <mat-icon style="font-size:16px;width:16px;height:16px">warning</mat-icon>
          Se requiere reinicio del sistema para aplicar actualizaciones previas.
        </div>
      }
      @if (data.packages.length === 0) {
        <div class="empty">No hay paquetes pendientes.</div>
      } @else {
        <ul class="pkg-list">
          @for (pkg of data.packages; track pkg) {
            <li class="pkg-item">{{ pkg }}</li>
          }
        </ul>
      }
    </div>
    <div class="dialog-footer">
      <button class="close-btn" (click)="dialogRef.close()">Cerrar</button>
    </div>
  `
})
export class UpdatesDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<UpdatesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UpdateInfo
  ) {}
}
