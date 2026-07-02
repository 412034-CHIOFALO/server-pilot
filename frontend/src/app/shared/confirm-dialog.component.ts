import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  warning?: string;
  confirmLabel: string;
  confirmDanger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  styles: [`
    .dlg {
      padding: 24px; max-width: 400px; min-width: 300px;
      background: var(--bg-primary); color: var(--text-primary);
    }
    .dlg-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .dlg-title { font-size: 15px; font-weight: 700; line-height: 1.35; }
    .dlg-msg { margin: 0 0 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    .dlg-warn {
      margin-top: 12px;
      background: rgba(248,81,73,.08); border: 1px solid rgba(248,81,73,.25);
      border-radius: 8px; padding: 10px 12px;
      font-size: 12px; color: var(--text-secondary); line-height: 1.5;
    }
    .dlg-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .btn-danger {
      padding: 6px 18px; border-radius: 6px; border: none; cursor: pointer;
      font-size: 13px; font-weight: 600; background: #f85149; color: #fff;
      transition: opacity .15s;
    }
    .btn-danger:hover { opacity: .88; }
  `],
  template: `
    <div class="dlg">
      <div class="dlg-header">
        <mat-icon style="color:#f85149;font-size:20px;width:20px;height:20px;flex-shrink:0;margin-top:2px">
          warning_amber
        </mat-icon>
        <span class="dlg-title">{{ data.title }}</span>
      </div>
      <p class="dlg-msg">{{ data.message }}</p>
      @if (data.warning) {
        <div class="dlg-warn">{{ data.warning }}</div>
      }
      <div class="dlg-actions">
        <button mat-stroked-button (click)="ref.close(false)">Cancelar</button>
        @if (data.confirmDanger) {
          <button class="btn-danger" (click)="ref.close(true)">{{ data.confirmLabel }}</button>
        } @else {
          <button mat-flat-button color="primary" (click)="ref.close(true)">{{ data.confirmLabel }}</button>
        }
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  constructor(
    public ref: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
