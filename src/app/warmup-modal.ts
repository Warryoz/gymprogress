import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, computed, input, output, signal, viewChild } from '@angular/core';
import { TechnicalTooltip } from './technical-tooltip';
import { generateWarmupSets } from './quick-strength-tools';
import { WeightUnit, convertWeightUnit } from './strength-tools';

@Component({
  selector: 'app-warmup-modal',
  imports: [TechnicalTooltip],
  template: `
    <dialog #dialog aria-labelledby="warmup-title" (cancel)="dismiss($event)">
      <header><div><small>ANTES DE EMPEZAR</small><h2 id="warmup-title">Calentar</h2></div><button type="button" aria-label="Cerrar calentamiento" (click)="close.emit()">×</button></header>
      <p class="exercise">{{ exercise() }}</p>
      <div class="intro"><strong>Series de aproximación</strong><app-technical-tooltip term="Cómo calentar" [iconOnly]="true" description="Pesos orientativos para practicar el movimiento antes de las series de trabajo. Ajusta la carga a tu equipo y sensaciones. Estas series no cuentan como entrenamiento completado. Usa la misma referencia de peso que en tu ejercicio: total con barra o por mancuerna." /></div>
      <div class="fields">
        <label>Peso de trabajo<input autofocus type="number" min="0" step="0.5" placeholder="Tu carga" [value]="weight() || ''" (input)="weight.set(value($event))" /></label>
        <label>Unidad<select [value]="unit()" (change)="changeUnit($event)"><option value="kg">kg</option><option value="lb">lb</option></select></label>
        @if (barbell()) { <label>Barra vacía ({{ unit() }})<input type="number" min="0" step="0.5" [value]="bar()" (input)="bar.set(value($event))" /></label> }
      </div>
      @if (valid()) {
        <ol aria-label="Series de calentamiento">
          @for (set of sets(); track set.id; let index = $index) {
            <li><span class="step">{{ index + 1 }}</span><div><strong>{{ set.weight }} {{ unit() }}</strong><small>{{ barbell() && set.weight === bar() ? 'Barra vacía' : 'Aproximación' }}</small></div><span class="reps">{{ set.reps }} reps</span></li>
          } @empty { <li>Practica el movimiento sin carga o con una carga más ligera antes de empezar.</li> }
        </ol>
        <div class="ready"><span>Después, tus series de trabajo</span><strong>{{ weight() }} {{ unit() }}</strong></div>
      } @else { <p class="empty" role="status">Introduce tu peso de trabajo{{ barbell() ? ' y un peso de barra válido, igual o menor' : '' }} para ver la aproximación.</p> }
      <button class="done" type="button" (click)="close.emit()">Volver al ejercicio</button>
    </dialog>
  `,
  styles: `
    dialog{box-sizing:border-box;width:min(500px,calc(100% - 24px));max-height:90dvh;overflow:auto;padding:24px;border:1px solid var(--border);border-radius:20px;background:var(--surface);color:var(--text-primary);box-shadow:0 24px 80px #0006}dialog::backdrop{background:#000a;backdrop-filter:blur(4px)}header,.intro{display:flex;align-items:center;justify-content:space-between;gap:12px}h2{margin:4px 0;font-size:1.5rem}small,.empty{color:var(--text-secondary)}header small{font-size:.7rem;letter-spacing:.1em}.exercise{margin:12px 0;font-weight:700}.fields{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin:12px 0}label{display:grid;gap:6px;font-size:.85rem}button,input,select{box-sizing:border-box;min-height:44px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--surface-elevated);color:var(--text-primary);font:inherit}input,select{width:100%;min-width:0}button{cursor:pointer}header button{font-size:24px}ol{list-style:none;padding:0;margin:20px 0}li{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)}li small{display:block;margin-top:4px;font-size:.75rem}.step{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#ad641522;color:var(--text-primary)}.reps{margin-left:auto;font-weight:700}.ready{display:flex;justify-content:space-between;gap:16px;padding:16px;background:var(--surface-elevated);border-radius:12px;font-size:.85rem}.done{width:100%;margin-top:20px;background:#98500c;color:#fff;font-weight:750}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.empty{line-height:1.5}
  `,
})
export class WarmupModal implements OnInit, AfterViewInit, OnDestroy {
  readonly exercise = input.required<string>();
  readonly suggestedLoad = input('');
  readonly barbell = input(false);
  readonly close = output<void>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly weight = signal(0);
  readonly unit = signal<WeightUnit>('kg');
  readonly bar = signal(20);
  readonly valid = computed(() => Number.isFinite(this.weight()) && this.weight() > 0 && (!this.barbell() || (Number.isFinite(this.bar()) && this.bar() >= 0 && this.bar() <= this.weight())));
  readonly sets = computed(() => this.valid() ? generateWarmupSets({ workingWeight: this.weight(), barWeight: this.barbell() ? this.bar() : 0, unit: this.unit(), level: 'short', accessory: false, increment: this.unit() === 'kg' ? 2.5 : 5 }).filter(set => set.weight > 0) : []);
  private previousFocus: HTMLElement | null = null;
  ngOnInit(): void {
    const load = this.suggestedLoad().match(/^\s*(\d+(?:[.,]\d+)?)(?:\s*(kg|lb)\b|(?=\s*$))/i);
    this.unit.set(load?.[2]?.toLowerCase() === 'lb' ? 'lb' : 'kg');
    this.bar.set(this.unit() === 'kg' ? 20 : 45);
    this.weight.set(load ? Number(load[1].replace(',', '.')) : 0);
  }
  ngAfterViewInit(): void { this.previousFocus = document.activeElement as HTMLElement; this.dialog().nativeElement.showModal(); }
  ngOnDestroy(): void { if (this.previousFocus) { this.dialog().nativeElement.close(); this.previousFocus.focus(); } }
  value(event: Event): number { return (event.target as HTMLInputElement).valueAsNumber; }
  changeUnit(event: Event): void {
    const next = (event.target as HTMLSelectElement).value as WeightUnit;
    this.weight.set(Math.round(convertWeightUnit(this.weight(), this.unit(), next) * 10) / 10);
    this.bar.set(Math.round(convertWeightUnit(this.bar(), this.unit(), next) * 10) / 10);
    this.unit.set(next);
  }
  dismiss(event: Event): void { event.preventDefault(); this.close.emit(); }
}
