import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

export interface DialogData {
  mode: 'create' | 'edit';
  service?: { id: string; name: string; host: string; port: number };
}

@Component({
  selector: 'app-service-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatButtonModule, MatIconModule],
  styles: [`
    .dialog-header {
      display:flex; align-items:center; gap:10px;
      padding:20px 24px 16px; border-bottom:1px solid var(--border);
    }
    .dialog-icon {
      width:36px; height:36px; border-radius:8px;
      background:rgba(88,166,255,.12); border:1px solid rgba(88,166,255,.2);
      display:flex; align-items:center; justify-content:center;
    }
    .dialog-icon mat-icon { color:var(--accent); font-size:18px; width:18px; height:18px; }
    .dialog-title { font-size:16px; font-weight:600; color:var(--text-primary); }
    .dialog-body { padding:20px 24px; display:flex; flex-direction:column; gap:12px; min-width:min(340px, calc(90vw - 48px)); }
    mat-form-field { width:100%; }
    .dialog-footer {
      display:flex; justify-content:flex-end; gap:8px;
      padding:12px 24px 16px; border-top:1px solid var(--border);
    }
    .cancel-btn {
      padding:8px 16px; border-radius:8px; border:1px solid var(--border);
      background:transparent; color:var(--text-secondary); cursor:pointer;
      font-size:13px; font-weight:500; transition:all .15s;
    }
    .cancel-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .save-btn {
      padding:8px 20px; border-radius:8px; border:none;
      background:var(--accent); color:#fff; cursor:pointer;
      font-size:13px; font-weight:600; transition:opacity .15s;
    }
    .save-btn:disabled { opacity:.4; cursor:not-allowed; }
    .save-btn:hover:not(:disabled) { opacity:.85; }
  `],
  template: `
    <div class="dialog-header">
      <div class="dialog-icon"><mat-icon>{{ data.mode === 'create' ? 'add' : 'edit' }}</mat-icon></div>
      <div class="dialog-title">{{ data.mode === 'create' ? 'Agregar servicio' : 'Editar servicio' }}</div>
    </div>

    <form [formGroup]="form" class="dialog-body">
      <mat-form-field appearance="outline">
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="name" placeholder="Mi servicio">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Host / IP</mat-label>
        <input matInput formControlName="host" placeholder="192.168.1.10">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Puerto</mat-label>
        <input matInput type="number" formControlName="port">
        @if (form.get('port')?.invalid && form.get('port')?.touched) {
          <mat-error>Puerto entre 1 y 65535</mat-error>
        }
      </mat-form-field>
    </form>

    <div class="dialog-footer">
      <button class="cancel-btn" (click)="dialogRef.close()">Cancelar</button>
      <button class="save-btn" (click)="submit()" [disabled]="form.invalid">Guardar</button>
    </div>
  `
})
export class ServiceDialogComponent {
  form = this.fb.group({
    name: [this.data.service?.name ?? '', Validators.required],
    host: [this.data.service?.host ?? '', Validators.required],
    port: [this.data.service?.port ?? 80, [Validators.required, Validators.min(1), Validators.max(65535)]]
  });

  constructor(
    public dialogRef: MatDialogRef<ServiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder
  ) {}

  submit() { if (this.form.valid) this.dialogRef.close(this.form.value); }
}
