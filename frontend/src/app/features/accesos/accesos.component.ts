import { Component, OnInit, signal, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../core/api.service';

interface QuickLink { id: string; name: string; url: string; color: string; icon: string; sortOrder: number; }
interface QuickLinkSuggestion { name: string; url: string; }
interface DialogData { link: QuickLink | null; }

const PRESET_COLORS = [
  { value: '#58a6ff', label: 'Azul' },
  { value: '#3fb950', label: 'Verde' },
  { value: '#d29922', label: 'Naranja' },
  { value: '#f85149', label: 'Rojo' },
  { value: '#bc8cff', label: 'Violeta' },
  { value: '#39d353', label: 'Lima' },
  { value: '#79c0ff', label: 'Celeste' },
  { value: '#8b949e', label: 'Gris' },
];

const PRESET_ICONS = [
  'link', 'web', 'apps', 'cloud', 'storage', 'dns', 'router',
  'analytics', 'api', 'monitor', 'computer', 'hub', 'home',
  'smart_toy', 'code', 'dashboard', 'settings', 'terminal',
];

@Component({
  selector: 'app-ql-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatTooltipModule,
  ],
  styles: [`
    .dialog-title { font-size:16px; font-weight:600; color:#e6edf3; margin:0 0 16px; }
    .field { width:100%; margin-bottom:12px; }
    .color-grid { display:flex; flex-wrap:wrap; gap:8px; margin:4px 0 12px; }
    .color-swatch {
      width:32px; height:32px; border-radius:8px; cursor:pointer;
      border:2px solid transparent; transition:all .15s;
      display:flex; align-items:center; justify-content:center;
    }
    .color-swatch.selected { border-color:#e6edf3; }
    .color-swatch:hover { transform:scale(1.1); }
    .icon-grid { display:flex; flex-wrap:wrap; gap:6px; margin:4px 0 12px; }
    .icon-chip {
      display:flex; align-items:center; justify-content:center;
      width:36px; height:36px; border-radius:8px; cursor:pointer;
      border:1px solid #30363d; background:#161b22; transition:all .15s;
    }
    .icon-chip.selected { border-color:#58a6ff; background:rgba(88,166,255,.12); }
    .icon-chip:hover { border-color:#8b949e; }
    .icon-chip mat-icon { font-size:18px; width:18px; height:18px; color:#8b949e; }
    .icon-chip.selected mat-icon { color:#58a6ff; }
    .label { font-size:11px; color:#8b949e; margin-bottom:6px; font-weight:600; letter-spacing:.3px; text-transform:uppercase; }
    .preview-card {
      display:flex; align-items:center; gap:10px; padding:12px 14px;
      border-radius:10px; margin-bottom:16px;
      border:1px solid #30363d; background:#161b22;
    }
    .preview-icon {
      width:40px; height:40px; border-radius:10px;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .preview-icon mat-icon { font-size:22px; width:22px; height:22px; color:#fff; }
    .preview-name { font-size:14px; font-weight:600; color:#e6edf3; }
    .preview-url { font-size:11px; color:#8b949e; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
  `],
  template: `
    <div style="padding:20px;min-width:360px;max-width:460px;background:#0d1117;border-radius:12px;">
      <div class="dialog-title">{{ data.link ? 'Editar acceso' : 'Nuevo acceso' }}</div>

      <div class="preview-card">
        <div class="preview-icon" [style.background]="form.color">
          <mat-icon>{{ form.icon || 'link' }}</mat-icon>
        </div>
        <div style="overflow:hidden">
          <div class="preview-name">{{ form.name || 'Nombre del servicio' }}</div>
          <div class="preview-url">{{ form.url || 'http://…' }}</div>
        </div>
      </div>

      <mat-form-field class="field" appearance="outline">
        <mat-label>Nombre</mat-label>
        <input matInput [(ngModel)]="form.name" placeholder="Mi Servicio" />
      </mat-form-field>

      <mat-form-field class="field" appearance="outline">
        <mat-label>URL</mat-label>
        <input matInput [(ngModel)]="form.url" placeholder="http://192.168.1.10:8080" />
      </mat-form-field>

      <div class="label">Color</div>
      <div class="color-grid">
        @for (c of colors; track c.value) {
          <div class="color-swatch" [class.selected]="form.color === c.value"
               [style.background]="c.value" [matTooltip]="c.label"
               (click)="form.color = c.value">
            @if (form.color === c.value) {
              <mat-icon style="font-size:16px;width:16px;height:16px;color:#fff">check</mat-icon>
            }
          </div>
        }
      </div>

      <div class="label">Ícono</div>
      <div class="icon-grid">
        @for (i of icons; track i) {
          <div class="icon-chip" [class.selected]="form.icon === i"
               [matTooltip]="i" (click)="form.icon = i">
            <mat-icon>{{ i }}</mat-icon>
          </div>
        }
      </div>

      <div class="actions">
        <button mat-stroked-button (click)="cancel()">Cancelar</button>
        <button mat-flat-button [style.background]="form.color"
                [disabled]="!form.name.trim() || !form.url.trim()"
                (click)="save()">
          {{ data.link ? 'Guardar' : 'Agregar' }}
        </button>
      </div>
    </div>
  `
})
export class QuickLinkDialogComponent {
  form = {
    name:      this.data.link?.name      ?? '',
    url:       this.data.link?.url       ?? '',
    color:     this.data.link?.color     ?? '#58a6ff',
    icon:      this.data.link?.icon      ?? 'link',
    sortOrder: this.data.link?.sortOrder ?? 0,
  };

  colors = PRESET_COLORS;
  icons  = PRESET_ICONS;

  constructor(
    public dialogRef: MatDialogRef<QuickLinkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  save()   { if (this.form.name.trim() && this.form.url.trim()) this.dialogRef.close(this.form); }
  cancel() { this.dialogRef.close(); }
}

@Component({
  selector: 'app-accesos',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatDialogModule],
  styles: [`
    .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:8px; }

    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-bottom:32px; }

    .card {
      position:relative; border-radius:12px; border:1px solid var(--border);
      background:var(--bg-secondary); overflow:hidden;
      cursor:pointer; transition:all .2s;
      display:flex; flex-direction:column; align-items:center;
      padding:20px 16px 16px; gap:10px;
      min-height:120px;
    }
    .card:hover { border-color:var(--accent); transform:translateY(-2px); box-shadow:0 4px 20px rgba(0,0,0,.3); }
    .card-icon {
      width:52px; height:52px; border-radius:14px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    .card-icon mat-icon { font-size:26px; width:26px; height:26px; color:#fff; }
    .card-name { font-size:13px; font-weight:600; color:var(--text-primary); text-align:center; word-break:break-word; }
    .card-url { font-size:10px; color:var(--text-muted); text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; }
    .card-actions {
      position:absolute; top:6px; right:6px;
      display:none; gap:2px;
    }
    .card:hover .card-actions { display:flex; }
    .mini-btn {
      width:26px; height:26px; border-radius:6px; border:none;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; background:rgba(0,0,0,.4); color:var(--text-secondary);
      transition:all .15s;
    }
    .mini-btn:hover { background:rgba(0,0,0,.7); color:var(--text-primary); }
    .mini-btn.danger:hover { background:rgba(248,81,73,.3); color:var(--red); }
    .mini-btn mat-icon { font-size:14px; width:14px; height:14px; }

    .section-title {
      font-size:12px; font-weight:600; letter-spacing:.8px; text-transform:uppercase;
      color:var(--text-muted); margin:0 0 14px; display:flex; align-items:center; gap:8px;
    }
    .section-title mat-icon { font-size:16px; width:16px; height:16px; color:var(--text-muted); }

    .sugg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:8px; }
    .sugg-card {
      display:flex; align-items:center; gap:10px;
      padding:10px 12px; border-radius:8px; border:1px solid var(--border);
      background:var(--bg-secondary); transition:background .15s;
    }
    .sugg-card:hover { background:var(--bg-hover); }
    .sugg-dot {
      width:10px; height:10px; border-radius:50%;
      background:#3fb950; flex-shrink:0;
    }
    .sugg-info { flex:1; overflow:hidden; }
    .sugg-name { font-size:13px; font-weight:500; color:var(--text-primary); }
    .sugg-url { font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .sugg-add {
      width:30px; height:30px; border-radius:6px; border:1px solid var(--border);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; background:transparent; color:var(--text-secondary);
      transition:all .15s; flex-shrink:0;
    }
    .sugg-add:hover { background:rgba(88,166,255,.12); border-color:var(--accent); color:var(--accent); }
    .sugg-add mat-icon { font-size:18px; width:18px; height:18px; }

    .empty { text-align:center; padding:48px; color:var(--text-muted); }
    .empty mat-icon { font-size:40px; width:40px; height:40px; display:block; margin:0 auto 12px; opacity:.3; }
    .empty p { margin:0; font-size:13px; }

    @media (max-width:600px) {
      .grid { grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); }
      .sugg-grid { grid-template-columns:1fr; }
    }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>apps</mat-icon> Accesos rápidos</h2>
      <button mat-flat-button color="primary" (click)="openAdd()">
        <mat-icon>add</mat-icon> Agregar acceso
      </button>
    </div>

    @if (loading()) {
      <div class="empty"><mat-icon>apps</mat-icon><p>Cargando...</p></div>
    } @else if (links().length === 0) {
      <div class="empty">
        <mat-icon>apps</mat-icon>
        <p>No hay accesos guardados. ¡Agregá el primero!</p>
      </div>
    } @else {
      <div class="grid">
        @for (link of links(); track link.id) {
          <div class="card fade-in" (click)="open(link.url)">
            <div class="card-actions" (click)="$event.stopPropagation()">
              <button class="mini-btn" matTooltip="Editar" (click)="openEdit(link)">
                <mat-icon>edit</mat-icon>
              </button>
              <button class="mini-btn danger" matTooltip="Eliminar" (click)="deleteLink(link)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <div class="card-icon" [style.background]="link.color">
              <mat-icon>{{ link.icon || 'link' }}</mat-icon>
            </div>
            <div class="card-name">{{ link.name }}</div>
            <div class="card-url" [matTooltip]="link.url">{{ link.url }}</div>
          </div>
        }
      </div>
    }

    @if (suggestions().length > 0) {
      <div class="section-title">
        <mat-icon>auto_awesome</mat-icon>
        Sugeridos desde Docker
      </div>
      <div class="sugg-grid">
        @for (s of suggestions(); track s.url) {
          <div class="sugg-card">
            <div class="sugg-dot"></div>
            <div class="sugg-info">
              <div class="sugg-name">{{ s.name }}</div>
              <div class="sugg-url">{{ s.url }}</div>
            </div>
            <button class="sugg-add" matTooltip="Agregar a accesos" (click)="addSuggestion(s)">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        }
      </div>
    }
  `
})
export class AccesosComponent implements OnInit {
  links       = signal<QuickLink[]>([]);
  suggestions = signal<QuickLinkSuggestion[]>([]);
  loading     = signal(true);

  private api    = inject(ApiService);
  private dialog = inject(MatDialog);

  ngOnInit() {
    this.load();
    this.loadSuggestions();
  }

  load() {
    this.api.get<QuickLink[]>('/api/quicklinks').subscribe({
      next: d => { this.links.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadSuggestions() {
    this.api.get<QuickLinkSuggestion[]>('/api/quicklinks/suggestions').subscribe({
      next: d => this.suggestions.set(d),
      error: () => {},
    });
  }

  openAdd() {
    const ref = this.dialog.open(QuickLinkDialogComponent, {
      data: { link: null },
      panelClass: 'dark-dialog',
      backdropClass: 'dialog-backdrop',
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.api.post<QuickLink>('/api/quicklinks', result).subscribe(() => this.load());
    });
  }

  openEdit(link: QuickLink) {
    const ref = this.dialog.open(QuickLinkDialogComponent, {
      data: { link },
      panelClass: 'dark-dialog',
      backdropClass: 'dialog-backdrop',
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.api.put<QuickLink>(`/api/quicklinks/${link.id}`, result).subscribe(() => this.load());
    });
  }

  deleteLink(link: QuickLink) {
    if (!confirm(`¿Eliminar "${link.name}"?`)) return;
    this.api.delete(`/api/quicklinks/${link.id}`).subscribe(() => this.load());
  }

  addSuggestion(s: QuickLinkSuggestion) {
    const link = { name: s.name, url: s.url, color: '#58a6ff', icon: 'web', sortOrder: 0 };
    this.api.post<QuickLink>('/api/quicklinks', link).subscribe(() => this.load());
  }

  open(url: string) { window.open(url, '_blank', 'noopener'); }
}
