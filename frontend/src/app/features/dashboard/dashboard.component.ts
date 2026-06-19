import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../core/api.service';
import { MetricsStore, MetricsSnapshot } from '../../core/metrics-store.service';
import { UpdatesDialogComponent } from './updates-dialog.component';

Chart.register(...registerables);

interface HistorySample { ts: number; cpu: number; ram: number; disk: number; }
interface UpdateInfo { count: number; rebootRequired: boolean; packages: string[]; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule],
  styles: [`
    .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    @media(max-width:1100px) { .grid-4 { grid-template-columns:1fr 1fr; } }
    @media(max-width:700px)  { .grid-4,.grid-2 { grid-template-columns:1fr; } }

    .metric-card {
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 18px 20px;
      transition: border-color .2s, box-shadow .2s; position: relative; overflow: hidden;
    }
    .metric-card:hover { border-color: #444c56; box-shadow: var(--shadow-md); }
    .metric-card .accent-line {
      position: absolute; top:0; left:0; right:0; height:2px;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .card-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .8px;
      color: var(--text-secondary); display: flex; align-items: center; gap: 6px;
    }
    .card-label mat-icon { font-size: 14px; width:14px; height:14px; }
    .card-pct { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .pct-blue  { background: rgba(88,166,255,.12); color: var(--accent); }
    .pct-green { background: rgba(63,185,80,.12);  color: var(--green); }
    .pct-yellow{ background: rgba(210,153,34,.12); color: var(--yellow); }
    .pct-purple{ background: rgba(188,140,255,.12);color: var(--purple); }
    .metric-value { font-size: 28px; font-weight: 700; letter-spacing:-1px; color: var(--text-primary); line-height:1; }
    .metric-sub { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
    .prog-track { background: var(--bg-tertiary); border-radius:4px; height:5px; margin-top:14px; overflow:hidden; }
    .prog-bar   { height:100%; border-radius:4px; transition: width .5s ease; }
    .net-row { display:flex; align-items:center; gap:8px; font-size:13px; margin-top:6px; }
    .net-icon { font-size:14px; width:14px; height:14px; }

    .chart-card {
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 18px 20px;
    }
    .chart-title {
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .8px;
      color: var(--text-secondary); margin-bottom: 14px; display:flex; align-items:center; gap:6px;
    }
    .uptime-badge {
      display:inline-flex; align-items:center; gap:5px;
      background: rgba(188,140,255,.1); color: var(--purple);
      border: 1px solid rgba(188,140,255,.2);
      padding: 3px 10px; border-radius: 20px; font-size:11px; font-weight:600;
    }
    .updates-card {
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 14px 20px; margin-bottom: 16px;
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    .accent-line-h {
      position:absolute; top:0; left:0; bottom:0; width:3px;
      border-radius:var(--radius-md) 0 0 var(--radius-md);
    }
    .updates-info { flex:1; display:flex; align-items:center; gap:12px; }
    .updates-count { font-size:22px; font-weight:700; color:var(--text-primary); }
    .updates-label { font-size:12px; color:var(--text-secondary); }
    .reboot-badge {
      font-size:11px; font-weight:600; padding:2px 10px; border-radius:20px;
      background:rgba(248,81,73,.1); color:var(--red); border:1px solid rgba(248,81,73,.25);
    }
    .updates-btn {
      padding:7px 14px; border-radius:8px; border:1px solid var(--border);
      background:transparent; color:var(--text-secondary); cursor:pointer;
      font-size:12px; font-weight:500; transition:all .15s; display:flex; align-items:center; gap:5px;
    }
    .updates-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .updates-btn mat-icon { font-size:14px; width:14px; height:14px; }
    .updates-loading { font-size:12px; color:var(--text-muted); }

    .range-btn {
      padding:4px 12px; border-radius:6px; cursor:pointer;
      font-size:12px; font-weight:500; transition:all .15s;
    }
    .range-btn.active   { background:var(--accent-glow); color:var(--accent); border:1px solid rgba(88,166,255,.4); }
    .range-btn.inactive { color:var(--text-secondary); border:1px solid var(--border); background:transparent; }
    .range-btn.inactive:hover { background:var(--bg-hover); }
  `],
  template: `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <h2 class="page-title" style="margin:0"><mat-icon>dashboard</mat-icon> Dashboard</h2>
      <div class="uptime-badge">
        <mat-icon style="font-size:13px;width:13px;height:13px">schedule</mat-icon>
        Uptime: {{ formatUptime(uptime()) }}
      </div>
    </div>

    <div class="grid-4">
      <div class="metric-card">
        <div class="accent-line" style="background:linear-gradient(90deg,#1f6feb,#58a6ff)"></div>
        <div class="card-header">
          <div class="card-label"><mat-icon>memory</mat-icon> CPU</div>
          <div class="card-pct pct-blue">{{ cpu() | number:'1.1-1' }}%</div>
        </div>
        <div class="metric-value">{{ cpu() | number:'1.0-0' }}<span style="font-size:16px;color:var(--text-secondary)">%</span></div>
        <div class="metric-sub">uso del procesador</div>
        <div class="prog-track"><div class="prog-bar" style="background:linear-gradient(90deg,#1f6feb,#58a6ff)" [style.width]="cpu() + '%'"></div></div>
      </div>

      <div class="metric-card">
        <div class="accent-line" style="background:linear-gradient(90deg,#238636,#3fb950)"></div>
        <div class="card-header">
          <div class="card-label"><mat-icon>storage</mat-icon> RAM</div>
          <div class="card-pct pct-green">{{ ramPct() | number:'1.0-0' }}%</div>
        </div>
        <div class="metric-value">{{ (ramUsed() / 1024) | number:'1.1-1' }}<span style="font-size:16px;color:var(--text-secondary)"> GB</span></div>
        <div class="metric-sub">de {{ (ramTotal() / 1024) | number:'1.1-1' }} GB usados</div>
        <div class="prog-track"><div class="prog-bar" style="background:linear-gradient(90deg,#238636,#3fb950)" [style.width]="ramPct() + '%'"></div></div>
      </div>

      <div class="metric-card">
        <div class="accent-line" style="background:linear-gradient(90deg,#9e6a03,#d29922)"></div>
        <div class="card-header">
          <div class="card-label"><mat-icon>folder</mat-icon> Disco</div>
          @if (mainDisk()) { <div class="card-pct pct-yellow">{{ mainDisk()!.usagePercent | number:'1.0-0' }}%</div> }
        </div>
        @if (mainDisk()) {
          <div class="metric-value">{{ mainDisk()!.usedGB | number:'1.0-0' }}<span style="font-size:16px;color:var(--text-secondary)"> GB</span></div>
          <div class="metric-sub">de {{ mainDisk()!.totalGB | number:'1.0-0' }} GB en {{ mainDisk()!.path }}</div>
          <div class="prog-track"><div class="prog-bar" style="background:linear-gradient(90deg,#9e6a03,#d29922)" [style.width]="mainDisk()!.usagePercent + '%'"></div></div>
        } @else { <div class="metric-sub">Sin datos</div> }
      </div>

      <div class="metric-card">
        <div class="accent-line" style="background:linear-gradient(90deg,#6e40c9,#bc8cff)"></div>
        <div class="card-header">
          <div class="card-label"><mat-icon>wifi</mat-icon> Red</div>
          @if (mainNet()) { <div class="card-pct pct-purple">{{ mainNet()!.name }}</div> }
        </div>
        @if (mainNet()) {
          <div class="net-row" style="margin-top:4px">
            <mat-icon class="net-icon" style="color:var(--green)">arrow_downward</mat-icon>
            <span style="color:var(--green);font-weight:600;font-size:16px">{{ formatBytes(mainNet()!.rxBytesPerSec) }}</span>
          </div>
          <div class="net-row">
            <mat-icon class="net-icon" style="color:var(--accent)">arrow_upward</mat-icon>
            <span style="color:var(--accent);font-weight:600;font-size:16px">{{ formatBytes(mainNet()!.txBytesPerSec) }}</span>
          </div>
        } @else { <div class="metric-sub" style="margin-top:8px">Sin datos</div> }
      </div>
    </div>

    <div class="updates-card" style="position:relative">
      <div class="accent-line-h" style="background:linear-gradient(180deg,#d29922,#f0883e)"></div>
      <mat-icon style="color:var(--yellow);margin-left:8px">system_update</mat-icon>
      @if (updatesLoading()) {
        <span class="updates-loading">Verificando actualizaciones…</span>
      } @else if (updatesError()) {
        <span class="updates-loading" style="color:var(--text-muted)">SSH no disponible</span>
      } @else if (updates()) {
        <div class="updates-info">
          <div>
            <div class="updates-count">{{ updates()!.count }}</div>
            <div class="updates-label">paquetes actualizables</div>
          </div>
          @if (updates()!.rebootRequired) { <span class="reboot-badge">⚠ reinicio requerido</span> }
        </div>
        <button class="updates-btn" (click)="showUpdates()"><mat-icon>list</mat-icon> Ver paquetes</button>
        <button class="updates-btn" (click)="loadUpdates()"><mat-icon>refresh</mat-icon></button>
      }
    </div>

    <!-- Live charts -->
    <div class="grid-2" style="margin-bottom:16px">
      <div class="chart-card">
        <div class="chart-title">
          <mat-icon style="font-size:14px;width:14px;height:14px;color:var(--accent)">show_chart</mat-icon>
          CPU % — últimas muestras
        </div>
        <canvas #cpuChart style="max-height:160px"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">
          <mat-icon style="font-size:14px;width:14px;height:14px;color:var(--green)">show_chart</mat-icon>
          RAM % — últimas muestras
        </div>
        <canvas #ramChart style="max-height:160px"></canvas>
      </div>
    </div>

    <!-- History charts -->
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text-secondary);display:flex;align-items:center;gap:6px">
          <mat-icon style="font-size:14px;width:14px;height:14px">history</mat-icon>
          Historial de métricas
        </div>
        <div style="display:flex;gap:6px">
          @for (r of ranges; track r) {
            <button class="range-btn" [class.active]="range()===r" [class.inactive]="range()!==r"
              (click)="loadHistory(r)">{{ r }}</button>
          }
        </div>
      </div>
      <div class="grid-2">
        <div class="chart-card">
          <div class="chart-title">
            <mat-icon style="font-size:14px;width:14px;height:14px;color:var(--accent)">show_chart</mat-icon>
            CPU % — {{ range() }}
            @if (historyLoading()) { <span style="font-size:10px;color:var(--text-muted);margin-left:4px">cargando…</span> }
          </div>
          <canvas #cpuHistCanvas style="max-height:160px"></canvas>
        </div>
        <div class="chart-card">
          <div class="chart-title">
            <mat-icon style="font-size:14px;width:14px;height:14px;color:var(--green)">show_chart</mat-icon>
            RAM % — {{ range() }}
            @if (historyLoading()) { <span style="font-size:10px;color:var(--text-muted);margin-left:4px">cargando…</span> }
          </div>
          <canvas #ramHistCanvas style="max-height:160px"></canvas>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cpuChart')     cpuChartEl!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('ramChart')     ramChartEl!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('cpuHistCanvas') cpuHistEl!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('ramHistCanvas') ramHistEl!:  ElementRef<HTMLCanvasElement>;

  private cpuChart?:     Chart;
  private ramChart?:     Chart;
  private cpuHistChart?: Chart;
  private ramHistChart?: Chart;
  private liveHistory:   MetricsSnapshot[] = [];
  private readonly MAX_POINTS = 60;

  cpu      = computed(() => this.store.metrics()?.cpu.usagePercent ?? 0);
  ramUsed  = computed(() => this.store.metrics()?.ram.usedMB ?? 0);
  ramTotal = computed(() => this.store.metrics()?.ram.totalMB ?? 1);
  ramPct   = computed(() => this.store.metrics()?.ram.usagePercent ?? 0);
  mainDisk = computed(() => this.store.metrics()?.disks?.[0] ?? null);
  mainNet  = computed(() => this.store.metrics()?.net?.[0] ?? null);
  uptime   = computed(() => this.store.metrics()?.uptimeSeconds ?? 0);

  updates        = signal<UpdateInfo | null>(null);
  updatesLoading = signal(false);
  updatesError   = signal(false);
  range          = signal<'1h'|'24h'|'7d'>('1h');
  historyLoading = signal(false);

  readonly ranges: Array<'1h'|'24h'|'7d'> = ['1h', '24h', '7d'];

  constructor(public store: MetricsStore, private api: ApiService, private dialog: MatDialog) {
    effect(() => {
      const m = this.store.metrics();
      if (!m) return;
      this.liveHistory.push(m);
      if (this.liveHistory.length > this.MAX_POINTS) this.liveHistory.shift();
      this.updateLiveCharts();
    });
  }

  ngOnInit() { this.loadUpdates(); }
  ngAfterViewInit() { this.initLiveCharts(); this.initHistoryCharts(); }

  loadUpdates() {
    this.updatesLoading.set(true); this.updatesError.set(false);
    this.api.get<UpdateInfo>('/api/updates').subscribe({
      next: d => { this.updates.set(d); this.updatesLoading.set(false); },
      error: () => { this.updatesError.set(true); this.updatesLoading.set(false); }
    });
  }

  showUpdates() {
    this.dialog.open(UpdatesDialogComponent, { data: this.updates(), width: '520px' });
  }

  loadHistory(r: '1h'|'24h'|'7d' = '1h') {
    this.range.set(r); this.historyLoading.set(true);
    this.api.get<HistorySample[]>(`/api/metrics/history?range=${r}`).subscribe({
      next: data => { this.historyLoading.set(false); this.updateHistoryCharts(data); },
      error: ()   => { this.historyLoading.set(false); }
    });
  }

  private initLiveCharts() {
    const mk = (c: string) => ({
      data: [] as number[], borderColor: c,
      backgroundColor: c.replace(')', ', 0.08)').replace('rgb', 'rgba'),
      borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4
    });
    const liveOpts = (c: string) => ({
      responsive: true, maintainAspectRatio: true, animation: false as const,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, grid: { color: 'rgba(48,54,61,.5)' }, ticks: { color: '#8b949e', font: { size: 11 }, maxTicksLimit: 5 } },
        x: { display: false }
      }
    });
    this.cpuChart = new Chart(this.cpuChartEl.nativeElement, { type: 'line', data: { labels: [], datasets: [mk('#58a6ff')] }, options: liveOpts('#58a6ff') });
    this.ramChart = new Chart(this.ramChartEl.nativeElement, { type: 'line', data: { labels: [], datasets: [mk('#3fb950')] }, options: liveOpts('#3fb950') });
  }

  private initHistoryCharts() {
    const mk = (c: string) => ({
      data: [] as number[], borderColor: c,
      backgroundColor: c.replace(')', ', 0.08)').replace('rgb', 'rgba'),
      borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4
    });
    const histOpts = (c: string) => ({
      responsive: true, maintainAspectRatio: true, animation: false as const,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, grid: { color: 'rgba(48,54,61,.5)' }, ticks: { color: '#8b949e', font: { size: 11 }, maxTicksLimit: 5 } },
        x: { ticks: { color: '#8b949e', font: { size: 10 }, maxTicksLimit: 8, maxRotation: 0 } }
      }
    });
    this.cpuHistChart = new Chart(this.cpuHistEl.nativeElement, { type: 'line', data: { labels: [], datasets: [mk('#58a6ff')] }, options: histOpts('#58a6ff') });
    this.ramHistChart = new Chart(this.ramHistEl.nativeElement, { type: 'line', data: { labels: [], datasets: [mk('#3fb950')] }, options: histOpts('#3fb950') });
    this.loadHistory('1h');
  }

  private updateLiveCharts() {
    if (!this.cpuChart || !this.ramChart) return;
    const labels = this.liveHistory.map(() => '');
    this.cpuChart.data.labels = labels;
    this.cpuChart.data.datasets[0].data = this.liveHistory.map(s => s.cpu.usagePercent);
    this.cpuChart.update('none');
    this.ramChart.data.labels = labels;
    this.ramChart.data.datasets[0].data = this.liveHistory.map(s => s.ram.usagePercent);
    this.ramChart.update('none');
  }

  private updateHistoryCharts(data: HistorySample[]) {
    if (!this.cpuHistChart || !this.ramHistChart) return;
    const labels = data.map(s => this.formatTime(s.ts));
    this.cpuHistChart.data.labels = labels;
    this.cpuHistChart.data.datasets[0].data = data.map(s => s.cpu);
    this.cpuHistChart.update('none');
    this.ramHistChart.data.labels = labels;
    this.ramHistChart.data.datasets[0].data = data.map(s => s.ram);
    this.ramHistChart.update('none');
  }

  private formatTime(ts: number): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (this.range() === '7d') return `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
    return `${hh}:${mm}`;
  }

  formatUptime(s: number): string {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }

  formatBytes(b: number): string {
    if (b >= 1_000_000) return (b / 1_000_000).toFixed(1) + ' MB/s';
    if (b >= 1_000)     return (b / 1_000).toFixed(1) + ' KB/s';
    return b + ' B/s';
  }

  ngOnDestroy() {
    this.cpuChart?.destroy(); this.ramChart?.destroy();
    this.cpuHistChart?.destroy(); this.ramHistChart?.destroy();
  }
}
