import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';

interface FileEntry {
  name: string;
  path: string;
  type: 'dir' | 'file' | 'link';
  sizeBytes: number;
  mtimeEpoch: number;
  permissions: string;
}

type ViewMode = 'list' | 'editor';

@Component({
  selector: 'app-files',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  styles: [`
    .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
    .breadcrumb { display:flex; align-items:center; gap:4px; font-size:13px; font-family:monospace; color:var(--text-secondary); flex-wrap:wrap; }
    .bc-sep { color:var(--text-muted); }
    .bc-part { cursor:pointer; color:var(--accent); }
    .bc-part:hover { text-decoration:underline; }
    .bc-current { color:var(--text-primary); }

    .btn-group { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .action-btn {
      display:flex; align-items:center; gap:6px; padding:7px 14px;
      border-radius:8px; border:1px solid var(--border); background:transparent;
      color:var(--text-secondary); cursor:pointer; font-size:12px; font-weight:500; transition:all .15s;
    }
    .action-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .action-btn mat-icon { font-size:16px; width:16px; height:16px; }
    .primary-btn {
      background:var(--accent); color:#fff; border-color:var(--accent);
    }
    .primary-btn:hover { opacity:.85; }

    .table-wrap {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-md); overflow:hidden;
    }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    thead tr { background:var(--bg-tertiary); }
    th {
      padding:9px 14px; text-align:left;
      font-size:10px; font-weight:600; letter-spacing:.6px; text-transform:uppercase;
      color:var(--text-muted); border-bottom:1px solid var(--border);
    }
    td { padding:9px 14px; border-bottom:1px solid var(--border-subtle); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:var(--bg-hover); }
    .file-name { display:flex; align-items:center; gap:8px; }
    .file-icon { font-size:18px; width:18px; height:18px; }
    .dir-icon  { color:var(--accent); }
    .file-lbl  { cursor:pointer; }
    .file-lbl:hover { color:var(--accent); text-decoration:underline; }
    .size, .date { color:var(--text-secondary); font-size:12px; font-family:monospace; }
    .row-actions { display:flex; gap:2px; }
    .icon-btn {
      width:28px; height:28px; border-radius:6px; border:none;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; background:transparent; color:var(--text-secondary); transition:all .15s;
    }
    .icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .icon-btn.danger:hover { background:rgba(248,81,73,.12); color:var(--red); }
    .icon-btn mat-icon { font-size:15px; width:15px; height:15px; }

    .editor-wrap { background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; }
    .editor-header { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid var(--border); background:var(--bg-tertiary); }
    .editor-path { font-family:monospace; font-size:12px; color:var(--text-secondary); }
    .editor-actions { display:flex; gap:8px; }
    textarea {
      width:100%; height:calc(100vh - 280px); min-height:300px;
      background:#0d1117; color:#e6edf3; border:none; outline:none; resize:none;
      padding:16px; font-family:'JetBrains Mono','Cascadia Code',monospace; font-size:12px; line-height:1.6;
    }

    .empty { text-align:center; padding:48px; color:var(--text-muted); }
    .empty mat-icon { font-size:40px; width:40px; height:40px; display:block; margin:0 auto 12px; opacity:.3; }
    .loading { text-align:center; padding:24px; color:var(--text-muted); font-size:13px; }
    .err { color:var(--red); font-size:12px; margin-top:4px; }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>folder</mat-icon> Archivos SFTP</h2>
      @if (view() === 'list') {
        <div class="btn-group">
          <label class="action-btn" style="cursor:pointer">
            <mat-icon>upload</mat-icon> Subir
            <input #uploadInput type="file" style="display:none" (change)="uploadFile($event)">
          </label>
          <button class="action-btn" (click)="promptMkdir()"><mat-icon>create_new_folder</mat-icon> Carpeta</button>
          <button class="action-btn" (click)="navigate('/')"><mat-icon>home</mat-icon></button>
          @if (currentPath() !== '/') {
            <button class="action-btn" (click)="upLevel()"><mat-icon>arrow_upward</mat-icon> Subir</button>
          }
        </div>
      }
    </div>

    <div class="breadcrumb" style="margin-bottom:16px">
      <span class="bc-part" (click)="navigate('/')">/</span>
      @for (part of breadcrumbs(); track $index) {
        <span class="bc-sep">›</span>
        @if ($last) {
          <span class="bc-current">{{ part.name }}</span>
        } @else {
          <span class="bc-part" (click)="navigate(part.path)">{{ part.name }}</span>
        }
      }
    </div>

    @if (view() === 'editor') {
      <div class="editor-wrap">
        <div class="editor-header">
          <span class="editor-path">{{ editingPath() }}</span>
          <div class="editor-actions">
            <button class="action-btn" (click)="closeEditor()"><mat-icon>close</mat-icon> Cerrar</button>
            <button class="action-btn primary-btn" (click)="saveFile()" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
        <textarea [(ngModel)]="editorContent" spellcheck="false"></textarea>
      </div>
    } @else {
      <div class="table-wrap">
        @if (loading()) {
          <div class="loading">Cargando...</div>
        } @else if (error()) {
          <div class="empty"><mat-icon>error_outline</mat-icon><p class="err">{{ error() }}</p></div>
        } @else if (entries().length === 0) {
          <div class="empty"><mat-icon>folder_open</mat-icon><p>Carpeta vacía</p></div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Tamaño</th><th>Modificado</th><th>Permisos</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (e of entries(); track e.path) {
                <tr>
                  <td>
                    <div class="file-name">
                      <mat-icon class="file-icon" [class.dir-icon]="e.type==='dir'">
                        {{ e.type === 'dir' ? 'folder' : 'description' }}
                      </mat-icon>
                      <span class="file-lbl" (click)="handleClick(e)">{{ e.name }}</span>
                    </div>
                  </td>
                  <td class="size">{{ e.type === 'dir' ? '—' : formatSize(e.sizeBytes) }}</td>
                  <td class="date">{{ formatDate(e.mtimeEpoch) }}</td>
                  <td class="size">{{ e.permissions }}</td>
                  <td>
                    <div class="row-actions">
                      @if (e.type === 'file') {
                        <button class="icon-btn" matTooltip="Descargar" (click)="downloadFile(e)">
                          <mat-icon>download</mat-icon>
                        </button>
                        <button class="icon-btn" matTooltip="Editar" (click)="openEditor(e)">
                          <mat-icon>edit</mat-icon>
                        </button>
                      }
                      <button class="icon-btn" matTooltip="Renombrar" (click)="renameEntry(e)">
                        <mat-icon>drive_file_rename_outline</mat-icon>
                      </button>
                      <button class="icon-btn danger" matTooltip="Eliminar" (click)="deleteEntry(e)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }
    <input #uploadInput type="file" style="display:none" (change)="uploadFile($event)">
  `
})
export class FilesComponent implements OnInit {
  @ViewChild('uploadInput') uploadInput!: ElementRef<HTMLInputElement>;

  currentPath = signal('/');
  entries     = signal<FileEntry[]>([]);
  loading     = signal(false);
  error       = signal('');
  saving      = signal(false);
  view        = signal<ViewMode>('list');
  editingPath = signal('');
  editorContent = '';

  breadcrumbs = computed(() => {
    const parts = this.currentPath().split('/').filter(p => p);
    const result: { name: string; path: string }[] = [];
    let acc = '';
    for (const p of parts) {
      acc += '/' + p;
      result.push({ name: p, path: acc });
    }
    return result;
  });

  constructor(private api: ApiService, private auth: AuthService, private http: HttpClient) {}

  ngOnInit() { this.navigate('/'); }

  navigate(path: string) {
    this.view.set('list');
    this.currentPath.set(path);
    this.loading.set(true);
    this.error.set('');
    this.api.get<FileEntry[]>(`/api/files?path=${encodeURIComponent(path)}`).subscribe({
      next: d => { this.entries.set(d); this.loading.set(false); },
      error: e => { this.error.set(e.error?.error || 'Error cargando directorio'); this.loading.set(false); }
    });
  }

  upLevel() {
    const p = this.currentPath();
    const parent = p.substring(0, p.lastIndexOf('/')) || '/';
    this.navigate(parent);
  }

  handleClick(e: FileEntry) {
    if (e.type === 'dir') this.navigate(e.path);
    else this.openEditor(e);
  }

  openEditor(e: FileEntry) {
    this.api.get<{ content: string }>(`/api/files/content?path=${encodeURIComponent(e.path)}`).subscribe({
      next: r => {
        this.editingPath.set(e.path);
        this.editorContent = r.content;
        this.view.set('editor');
      },
      error: err => alert(err.error?.error || 'No se pudo abrir el archivo')
    });
  }

  saveFile() {
    this.saving.set(true);
    this.api.put('/api/files/content', { path: this.editingPath(), content: this.editorContent }).subscribe({
      next: () => { this.saving.set(false); alert('Guardado'); },
      error: e => { this.saving.set(false); alert(e.error?.error || 'Error al guardar'); }
    });
  }

  closeEditor() {
    this.view.set('list');
    this.navigate(this.currentPath());
  }

  downloadFile(e: FileEntry) {
    const creds = this.auth.getCredentials();
    const base = environment.apiBase || '';
    const url = `${base}/api/files/download?path=${encodeURIComponent(e.path)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = e.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  uploadFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', this.currentPath());
    this.http.post(`${environment.apiBase}/api/files/upload`, formData).subscribe({
      next: () => { this.navigate(this.currentPath()); },
      error: e => alert(e.error?.error || 'Error al subir')
    });
    input.value = '';
  }

  promptMkdir() {
    const name = prompt('Nombre de la nueva carpeta:');
    if (!name) return;
    const path = this.currentPath().endsWith('/')
      ? this.currentPath() + name
      : this.currentPath() + '/' + name;
    this.api.post('/api/files/mkdir', { path }).subscribe({
      next: () => this.navigate(this.currentPath()),
      error: e => alert(e.error?.error || 'Error')
    });
  }

  renameEntry(e: FileEntry) {
    const newName = prompt('Nuevo nombre:', e.name);
    if (!newName || newName === e.name) return;
    const parent = e.path.substring(0, e.path.lastIndexOf('/')) || '/';
    const to = parent.endsWith('/') ? parent + newName : parent + '/' + newName;
    this.api.post('/api/files/rename', { from: e.path, to }).subscribe({
      next: () => this.navigate(this.currentPath()),
      error: err => alert(err.error?.error || 'Error al renombrar')
    });
  }

  deleteEntry(e: FileEntry) {
    if (!confirm(`¿Eliminar "${e.name}"?`)) return;
    this.api.delete(`/api/files?path=${encodeURIComponent(e.path)}`).subscribe({
      next: () => this.navigate(this.currentPath()),
      error: err => alert(err.error?.error || 'Error al eliminar')
    });
  }

  formatSize(bytes: number): string {
    if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(1) + ' GB';
    if (bytes >= 1_048_576)     return (bytes / 1_048_576).toFixed(1) + ' MB';
    if (bytes >= 1_024)         return (bytes / 1_024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  formatDate(epoch: number): string {
    return new Date(epoch).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  }
}
