import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

interface Runbook { id?: string; name: string; description: string; command: string; confirm: boolean; }

@Component({
  selector: 'app-runbook-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatCheckboxModule, MatButtonModule, MatIconModule],
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
    .dialog-body { padding:20px 24px; display:flex; flex-direction:column; gap:12px; min-width:380px; }
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
      <div class="dialog-icon"><mat-icon>bolt</mat-icon></div>
      <div class="dialog-title">{{ data ? 'Editar acción' : 'Nueva acción' }}</div>
    </div>
    <form [formGroup]="form" class="dialog-body">
      <mat-form-field appearance="outline">
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="name">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Descripción</mat-label>
        <input matInput formControlName="description">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Comando</mat-label>
        <input matInput formControlName="command" placeholder="df -h">
      </mat-form-field>
      <mat-checkbox formControlName="confirm" color="primary">Requerir confirmación antes de ejecutar</mat-checkbox>
    </form>
    <div class="dialog-footer">
      <button class="cancel-btn" (click)="dialogRef.close()">Cancelar</button>
      <button class="save-btn" (click)="submit()" [disabled]="form.invalid">Guardar</button>
    </div>
  `
})
export class RunbookDialogComponent {
  form = this.fb.group({
    name:        [this.data?.name        ?? '', Validators.required],
    description: [this.data?.description ?? ''],
    command:     [this.data?.command     ?? '', Validators.required],
    confirm:     [this.data?.confirm     ?? false]
  });

  constructor(
    public dialogRef: MatDialogRef<RunbookDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Runbook | null,
    private fb: FormBuilder
  ) {}

  submit() { if (this.form.valid) this.dialogRef.close(this.form.value); }
}
