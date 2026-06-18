import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient, HttpRequest, HttpEventType } from '@angular/common/http';
import { ApiService } from '../../core/api.service';
import { environment } from '../../../environments/environment';

interface FileEntry {
  name: string;
  path: string;
  type: 'dir' | 'file' | 'link';
  sizeBytes: number;
  mtimeEpoch: number;
  permissions: string;
}

interface UploadItem {
  id: number;
  name: string;
  progress: number;
  done: boolean;
  error: string;
}

type ViewMode = 'list' | 'editor' | 'image' | 'binary';
type FileKind = 'image' | 'text' | 'binary';

const SHARED_PATH = '/home/nico/compartida';
const HOME_PATH   = '/home/nico';

const IMAGE_EXTS = new Set(['jpg','jpeg','png','gif','webp','bmp','svg']);
const TEXT_EXTS  = new Set([
  'txt','md','json','yml','yaml','toml','ini','conf','log','env',
  'js','ts','jsx','tsx','java','py','rb','go','rs','c','cpp','h',
  'sh','bash','zsh','fish','sql','csv','xml','html','htm','css','scss',
  'gitignore','dockerfile','makefile','nginx','htaccess',
]);

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
    .primary-btn { background:var(--accent); color:#fff; border-color:var(--accent); }
    .primary-btn:hover { opacity:.85; }
    .shared-btn { border-color:rgba(63,185,80,.4); color:var(--green); }
    .shared-btn:hover { background:var(--green-glow); color:var(--green); border-color:var(--green); }

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
    .img-icon  { color:var(--purple); }
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

    /* ── Shared viewer/editor header ── */
    .viewer-wrap { background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; }
    .viewer-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:10px 16px; border-bottom:1px solid var(--border); background:var(--bg-tertiary);
    }
    .viewer-path { font-family:monospace; font-size:12px; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:55%; }
    .viewer-actions { display:flex; gap:8px; flex-shrink:0; }
    textarea {
      width:100%; height:calc(100vh - 280px); min-height:300px;
      background:#0d1117; color:#e6edf3; border:none; outline:none; resize:none;
      padding:16px; font-family:'JetBrains Mono','Cascadia Code',monospace; font-size:12px; line-height:1.6;
    }

    /* ── Image viewer ── */
    .img-viewer {
      display:flex; align-items:center; justify-content:center;
      min-height:300px; max-height:calc(100vh - 280px);
      overflow:auto; background:#070a0d; padding:20px;
    }
    .img-viewer img {
      max-width:100%; max-height:calc(100vh - 340px);
      object-fit:contain; border-radius:4px; display:block;
      box-shadow:0 4px 24px rgba(0,0,0,.6);
    }

    /* ── Binary fallback ── */
    .binary-info {
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      padding:60px 20px; gap:14px; color:var(--text-muted);
    }
    .binary-info mat-icon { font-size:52px; width:52px; height:52px; opacity:.25; }
    .binary-info p { font-size:14px; margin:0; }

    .empty { text-align:center; padding:48px; color:var(--text-muted); }
    .empty mat-icon { font-size:40px; width:40px; height:40px; display:block; margin:0 auto 12px; opacity:.3; }
    .loading { text-align:center; padding:24px; color:var(--text-muted); font-size:13px; }
    .err { color:var(--red); font-size:12px; margin-top:4px; }

    /* ── Dropzone ── */
    .dropzone {
      margin-top:16px; border:2px dashed var(--border-subtle);
      border-radius:var(--radius-md); padding:32px 20px; text-align:center;
      cursor:default; user-select:none;
      transition:border-color .2s, background .2s, color .2s;
      display:flex; flex-direction:column; align-items:center; gap:8px;
      color:var(--text-muted);
    }
    .dropzone.dragover { border-color:var(--accent); background:var(--accent-glow); color:var(--accent); }
    .dropzone mat-icon { font-size:38px; width:38px; height:38px; transition:transform .2s; }
    .dropzone.dragover mat-icon { transform:scale(1.15); }
    .dz-title { font-size:14px; font-weight:600; }
    .dz-sub   { font-size:12px; }

    /* ── Upload progress ── */
    .upload-list { margin-top:10px; display:flex; flex-direction:column; gap:6px; }
    .upload-item {
      background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:var(--radius-sm); padding:8px 12px;
      display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:10px; font-size:12px;
    }
    .upload-name { color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .upload-progress { display:flex; align-items:center; gap:8px; min-width:160px; }
    .upload-track { flex:1; background:var(--bg-tertiary); border-radius:4px; height:4px; overflow:hidden; }
    .upload-bar { height:100%; border-radius:4px; transition:width .15s; background:var(--accent); }
    .upload-bar.done     { background:var(--green); }
    .upload-bar.err-bar  { background:var(--red); }
    .upload-pct { width:34px; text-align:right; font-family:monospace; color:var(--text-secondary); font-size:11px; }
    .u-ok  { color:var(--green); display:flex; }
    .u-err { color:var(--red);   display:flex; }
    .u-ok mat-icon, .u-err mat-icon { font-size:16px; width:16px; height:16px; }
  `],
  template: `
    <div class="toolbar">
      <h2 class="page-title" style="margin:0"><mat-icon>folder</mat-icon> Archivos SFTP</h2>
      @if (view() === 'list') {
        <div class="btn-group">
          <label class="action-btn" style="cursor:pointer">
            <mat-icon>upload</mat-icon> Subir
            <input type="file" multiple style="display:none" (change)="onFileInputChange($event)">
          </label>
          <button class="action-btn" (click)="promptMkdir()">
            <mat-icon>create_new_folder</mat-icon> Carpeta
          </button>
          <button class="action-btn shared-btn" (click)="navigate(SHARED_PATH)"
                  matTooltip="Ir a carpeta compartida">
            <mat-icon>folder_shared</mat-icon> Compartida
          </button>
          <button class="action-btn" (click)="navigate(HOME_PATH)"><mat-icon>home</mat-icon></button>
          @if (currentPath() !== '/') {
            <button class="action-btn" (click)="upLevel()">
              <mat-icon>arrow_upward</mat-icon> Subir
            </button>
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

    <!-- ── Editor de texto ── -->
    @if (view() === 'editor') {
      <div class="viewer-wrap">
        <div class="viewer-header">
          <span class="viewer-path">{{ editingPath() }}</span>
          <div class="viewer-actions">
            <button class="action-btn" (click)="closeEditor()"><mat-icon>close</mat-icon> Cerrar</button>
            <button class="action-btn primary-btn" (click)="saveFile()" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
        <textarea [(ngModel)]="editorContent" spellcheck="false"></textarea>
      </div>

    <!-- ── Visor de imagen ── -->
    } @else if (view() === 'image') {
      <div class="viewer-wrap">
        <div class="viewer-header">
          <span class="viewer-path">{{ editingPath() }}</span>
          <div class="viewer-actions">
            <button class="action-btn" (click)="downloadCurrentFile()">
              <mat-icon>download</mat-icon> Descargar
            </button>
            <button class="action-btn" (click)="closeViewer()">
              <mat-icon>close</mat-icon> Cerrar
            </button>
          </div>
        </div>
        <div class="img-viewer">
          @if (imageUrl()) {
            <img [src]="imageUrl()!" [alt]="editingPath()">
          } @else {
            <div class="loading">Cargando imagen...</div>
          }
        </div>
      </div>

    <!-- ── Binario sin vista previa ── -->
    } @else if (view() === 'binary') {
      <div class="viewer-wrap">
        <div class="viewer-header">
          <span class="viewer-path">{{ editingPath() }}</span>
          <div class="viewer-actions">
            <button class="action-btn" (click)="downloadCurrentFile()">
              <mat-icon>download</mat-icon> Descargar
            </button>
            <button class="action-btn" (click)="closeViewer()">
              <mat-icon>close</mat-icon> Cerrar
            </button>
          </div>
        </div>
        <div class="binary-info">
          <mat-icon>insert_drive_file</mat-icon>
          <p>Vista previa no disponible para este tipo de archivo.</p>
          <button class="action-btn primary-btn" (click)="downloadCurrentFile()">
            <mat-icon>download</mat-icon> Descargar archivo
          </button>
        </div>
      </div>

    <!-- ── Lista de archivos ── -->
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
                      <mat-icon class="file-icon"
                                [class.dir-icon]="e.type==='dir'"
                                [class.img-icon]="e.type!=='dir' && fileKind(e.name)==='image'">
                        {{ e.type === 'dir' ? 'folder'
                           : fileKind(e.name) === 'image' ? 'image'
                           : fileKind(e.name) === 'text'  ? 'description'
                           : 'insert_drive_file' }}
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
                        <button class="icon-btn"
                                [matTooltip]="fileKind(e.name)==='text' ? 'Editar' : 'Vista previa'"
                                (click)="openFile(e)">
                          <mat-icon>{{ fileKind(e.name) === 'image' ? 'image'
                                       : fileKind(e.name) === 'text' ? 'edit'
                                       : 'visibility' }}</mat-icon>
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

      <!-- Dropzone fijo a Carpeta Compartida -->
      <div class="dropzone" [class.dragover]="isDragOver()"
           (dragenter)="onDragEnter($event)"
           (dragover)="onDragOver($event)"
           (dragleave)="onDragLeave($event)"
           (drop)="onDrop($event)">
        <mat-icon>cloud_upload</mat-icon>
        <span class="dz-title">
          {{ isDragOver() ? 'Soltar para subir a Compartida' : 'Soltá archivos acá — se suben a la Carpeta Compartida' }}
        </span>
        <span class="dz-sub">Destino fijo: {{ SHARED_PATH }}</span>
      </div>

      @if (uploads().length > 0) {
        <div class="upload-list">
          @for (u of uploads(); track u.id) {
            <div class="upload-item">
              <span class="upload-name" [matTooltip]="u.name">{{ u.name }}</span>
              <div class="upload-progress">
                <div class="upload-track">
                  <div class="upload-bar"
                       [class.done]="u.done"
                       [class.err-bar]="!!u.error"
                       [style.width]="(u.error ? 100 : u.progress) + '%'">
                  </div>
                </div>
                <span class="upload-pct">{{ u.error ? 'Error' : (u.done ? '100%' : u.progress + '%') }}</span>
              </div>
              @if (u.done && !u.error) {
                <span class="u-ok"><mat-icon>check_circle</mat-icon></span>
              } @else if (u.error) {
                <span class="u-err" [matTooltip]="u.error"><mat-icon>error</mat-icon></span>
              } @else {
                <span style="width:16px"></span>
              }
            </div>
          }
        </div>
      }
    }
  `
})
export class FilesComponent implements OnInit, OnDestroy {
  readonly SHARED_PATH = SHARED_PATH;
  readonly HOME_PATH   = HOME_PATH;

  currentPath   = signal('/');
  entries       = signal<FileEntry[]>([]);
  loading       = signal(false);
  error         = signal('');
  saving        = signal(false);
  view          = signal<ViewMode>('list');
  editingPath   = signal('');
  editorContent = '';
  isDragOver    = signal(false);
  uploads       = signal<UploadItem[]>([]);
  imageUrl      = signal<string | null>(null);

  private currentFile: FileEntry | null = null;
  private nextId = 0;

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

  constructor(
    private api: ApiService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit()    { this.navigate(HOME_PATH); }
  ngOnDestroy() { this.revokeImageUrl(); }

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
    if (e.type === 'dir') { this.navigate(e.path); return; }
    this.openFile(e);
  }

  openFile(e: FileEntry) {
    const kind = this.fileKind(e.name);
    if      (kind === 'text')  this.openEditor(e);
    else if (kind === 'image') this.openImage(e);
    else                       this.openBinary(e);
  }

  openEditor(e: FileEntry) {
    this.api.get<{ content: string }>(`/api/files/content?path=${encodeURIComponent(e.path)}`).subscribe({
      next: r => {
        this.currentFile = e;
        this.editingPath.set(e.path);
        this.editorContent = r.content;
        this.view.set('editor');
      },
      error: err => alert(err.error?.error || 'No se pudo abrir el archivo')
    });
  }

  openImage(e: FileEntry) {
    this.currentFile = e;
    this.editingPath.set(e.path);
    this.revokeImageUrl();
    const base = environment.apiBase || '';
    this.http.get(`${base}/api/files/download?path=${encodeURIComponent(e.path)}`, { responseType: 'blob' }).subscribe({
      next: blob => {
        this.imageUrl.set(URL.createObjectURL(blob));
        this.view.set('image');
      },
      error: () => this.snackBar.open('No se pudo cargar la imagen', 'Cerrar', { duration: 5000 })
    });
  }

  openBinary(e: FileEntry) {
    this.currentFile = e;
    this.editingPath.set(e.path);
    this.view.set('binary');
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

  closeViewer() {
    this.revokeImageUrl();
    this.view.set('list');
  }

  downloadFile(e: FileEntry) {
    const base = environment.apiBase || '';
    const url  = `${base}/api/files/download?path=${encodeURIComponent(e.path)}`;
    const a    = document.createElement('a');
    a.href = url; a.download = e.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  downloadCurrentFile() {
    if (this.currentFile) this.downloadFile(this.currentFile);
  }

  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.uploadFiles(Array.from(input.files), this.currentPath());
    input.value = '';
  }

  onDragEnter(e: DragEvent) { e.preventDefault(); this.isDragOver.set(true); }
  onDragOver(e: DragEvent)  { e.preventDefault(); e.stopPropagation(); this.isDragOver.set(true); }
  onDragLeave(e: DragEvent) { e.preventDefault(); this.isDragOver.set(false); }
  onDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    this.isDragOver.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) this.uploadFiles(files, SHARED_PATH);
  }

  private uploadFiles(files: File[], destPath: string) {
    const items: UploadItem[] = files.map(f => ({
      id: this.nextId++, name: f.name, progress: 0, done: false, error: ''
    }));
    this.uploads.update(list => [...list, ...items]);

    for (const [item, file] of items.map((it, i) => [it, files[i]] as [UploadItem, File])) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', destPath);

      const req = new HttpRequest('POST', `${environment.apiBase || ''}/api/files/upload`, formData, {
        reportProgress: true
      });

      this.http.request(req).subscribe({
        next: event => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const pct = Math.round(100 * event.loaded / event.total);
            this.uploads.update(list => list.map(u => u.id === item.id ? { ...u, progress: pct } : u));
          } else if (event.type === HttpEventType.Response) {
            this.uploads.update(list => list.map(u => u.id === item.id ? { ...u, progress: 100, done: true } : u));
            if (destPath === this.currentPath()) this.navigate(this.currentPath());
            setTimeout(() => this.uploads.update(list => list.filter(u => u.id !== item.id)), 3000);
          }
        },
        error: err => {
          const raw = (err.error?.error ?? '') as string;
          const isPermission = err.status === 403
            || raw.toLowerCase().includes('permission')
            || raw.toLowerCase().includes('denied')
            || raw.toLowerCase().includes('permiso');
          const msg = isPermission
            ? 'Sin permiso para escribir en esa carpeta'
            : (raw || err.statusText || 'Error al subir el archivo');
          this.uploads.update(list => list.map(u => u.id === item.id ? { ...u, error: msg } : u));
          this.snackBar.open(`${file.name}: ${msg}`, 'Cerrar', { duration: 7000 });
        }
      });
    }
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
    const to     = parent.endsWith('/') ? parent + newName : parent + '/' + newName;
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

  fileKind(name: string): FileKind {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (IMAGE_EXTS.has(ext)) return 'image';
    if (TEXT_EXTS.has(ext))  return 'text';
    return 'binary';
  }

  private revokeImageUrl() {
    const url = this.imageUrl();
    if (url) { URL.revokeObjectURL(url); this.imageUrl.set(null); }
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
