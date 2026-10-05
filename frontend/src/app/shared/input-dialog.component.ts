import { Component, Inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface InputDialogData {
  title: string;
  label: string;
  value?: string;
  confirmLabel?: string;
  icon?: string;
}

@Component({
  selector: 'app-input-dialog',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, FormsModule],
  styles: [`
    .dlg { padding:24px; min-width:320px; max-width:440px; background:var(--bg-primary); color:var(--text-primary); }
    .dlg-header { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
    .dlg-title { font-size:15px; font-weight:700; }
    .dlg-icon { color:var(--accent); font-size:20px; width:20px; height:20px; }
    .input-wrap {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:8px; display:flex; align-items:center;
      padding:0 12px; transition:border-color .15s;
    }
    .input-wrap:focus-within { border-color:var(--accent); }
    input {
      flex:1; background:transparent; border:none; outline:none;
      color:var(--text-primary); font-size:13px; padding:10px 0;
      font-family:monospace;
    }
    .dlg-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; }
    .btn-primary {
      padding:7px 18px; border-radius:6px; border:none; cursor:pointer;
      font-size:13px; font-weight:600; background:var(--accent); color:#fff;
      transition:opacity .15s;
    }
    .btn-primary:hover:not(:disabled) { opacity:.85; }
    .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
  `],
  template: `
    <div class="dlg">
      <div class="dlg-header">
        @if (data.icon) {
          <mat-icon class="dlg-icon">{{ data.icon }}</mat-icon>
        }
        <span class="dlg-title">{{ data.title }}</span>
      </div>
      <div class="input-wrap">
        <input #inputEl
               [(ngModel)]="value"
               [placeholder]="data.label"
               (keyup.enter)="submit()"
               (keyup.escape)="ref.close(null)">
      </div>
      <div class="dlg-actions">
        <button mat-stroked-button (click)="ref.close(null)">Cancelar</button>
        <button class="btn-primary" (click)="submit()" [disabled]="!value.trim()">
          {{ data.confirmLabel ?? 'Aceptar' }}
        </button>
      </div>
    </div>
  `
})
export class InputDialogComponent implements AfterViewInit {
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  value: string;

  constructor(
    public ref: MatDialogRef<InputDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) public data: InputDialogData
  ) {
    this.value = data.value ?? '';
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.inputEl.nativeElement.focus();
      this.inputEl.nativeElement.select();
    }, 50);
  }

  submit() {
    if (this.value.trim()) this.ref.close(this.value.trim());
  }
}
