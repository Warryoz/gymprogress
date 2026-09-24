import { TechnicalTooltip } from './technical-tooltip';
import { AfterViewInit, Component, ElementRef, OnDestroy, computed, input, output, viewChild } from '@angular/core';
import { BarbellVisual } from './barbell-visual';
import { PlateConfiguration, WeightUnit, calculatePlateCombination } from './strength-tools';

@Component({
  selector: 'app-barbell-modal',
  imports: [BarbellVisual, TechnicalTooltip],
  template: `
    <dialog #dialog aria-labelledby="barbell-title" (cancel)="dismiss($event)" (click)="backdrop($event)">
      <header><div><div class="title-info"><small>Montar la barra</small><app-technical-tooltip term="Montar la barra" [iconOnly]="true" description="El peso total incluye la barra y los discos de ambos lados. Comprueba cuánto pesa tu barra, especialmente si es Z o corta. Activa los discos de tu gimnasio: se usarán las parejas necesarias con el menor número de discos." /></div><h2 id="barbell-title">{{ exercise() }}</h2></div><button autofocus type="button" aria-label="Cerrar montaje de barra" (click)="close.emit()">×</button></header>
      <div class="fields">
        <label>Peso total ({{ unit() }})<input type="number" min="0" step="0.5" [value]="target() || ''" (input)="targetChange.emit(value($event))" /></label>
        <label>Barra ({{ unit() }})<input type="number" min="0" step="0.5" [value]="configuration().barWeight" (input)="barChange.emit(value($event))" /></label>
      </div>
      @if (error(); as message) { <p role="status">{{ message }}</p> }
      @else {
        @if (result().exact; as exact) {
          <section class="total-info" aria-live="polite">
            <strong class="total">{{ exact.total }} {{ unit() }}</strong>
            <app-technical-tooltip term="Desglose del peso" [iconOnly]="true" [description]="configuration().barWeight + ' ' + unit() + ' de barra + ' + discTotal() + ' ' + unit() + ' de discos (ambos lados).'" />
          </section>
          <app-barbell-visual [selection]="exact" [unit]="unit()" />
        } @else {
          <p role="status">No se puede montar {{ target() }} {{ unit() }} con estos discos. Elige una alternativa:</p>
          <div class="alternatives">
            <button type="button" (click)="targetChange.emit(result().lower.total)">{{ result().lower.total }} {{ unit() }} · {{ result().lower.difference }}</button>
            @if (result().upper; as upper) { <button type="button" (click)="targetChange.emit(upper.total)">{{ upper.total }} {{ unit() }} · +{{ upper.difference }}</button> }
          </div>
          <app-barbell-visual [selection]="result().lower" [unit]="unit()" />
          <p class="note">Vista de la alternativa inferior: {{ result().lower.total }} {{ unit() }}.</p>
        }
      }
      <details open><summary>Discos de mi gimnasio</summary>
        <div class="inventory">@for (plate of configuration().plates; track plate.weight) {
          <button type="button" class="plate-toggle" role="switch" [attr.aria-checked]="plate.quantity > 0" [class.active]="plate.quantity > 0" (click)="inventoryChange.emit({weight: plate.weight, enabled: plate.quantity === 0})">
            <span>{{ plate.weight }} {{ unit() }}</span><i aria-hidden="true"></i>
          </button>
        }</div>
      </details>
    </dialog>
  `,
  styles: `
    dialog{box-sizing:border-box;width:min(620px,calc(100% - 24px));max-height:90dvh;overflow:auto;border:1px solid var(--border);border-radius:20px;padding:24px;color:var(--text-primary);background:var(--surface);box-shadow:0 24px 80px #0006}dialog::backdrop{background:#000a;backdrop-filter:blur(4px)}
    .title-info{display:flex;align-items:center;gap:8px}.plate-toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.85rem;cursor:pointer}.plate-toggle.active{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--surface-elevated))}.plate-toggle i{display:block;flex-shrink:0;width:28px;height:16px;border-radius:20px;background:var(--border);padding:2px;box-sizing:border-box}.plate-toggle i::after{content:'';display:block;width:12px;height:12px;background:var(--text-secondary);border-radius:50%;transition:transform .15s}.plate-toggle.active i{background:var(--accent)}.plate-toggle.active i::after{background:#fff;transform:translateX(12px)}
    header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px}h2{margin:5px 0;font-size:1.25rem}small,.note,section p{color:var(--text-secondary)}button,input{box-sizing:border-box;min-height:44px;border:1px solid var(--border);border-radius:9px;background:var(--surface-elevated);color:var(--text-primary);padding:8px 12px;font:inherit}header button{font-size:24px}label{display:grid;gap:7px;font-size:.85rem}input{width:100%}.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.note,section p{font-size:.8rem;line-height:1.5}.total{display:block;color:var(--accent);font-size:2.5rem;margin-top:20px}.inventory{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}details{margin-top:24px;border-top:1px solid var(--border);padding-top:16px}summary{cursor:pointer;font-weight:700;min-height:32px}.alternatives{display:flex;gap:8px;margin-bottom:16px}button:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
    @media(max-width:400px){.inventory{grid-template-columns:repeat(2,1fr)}}
    .total-info{display:flex;align-items:center;gap:8px;margin:16px 0 12px}.total-info .total{margin:0}
  `,
})
export class BarbellModal implements AfterViewInit, OnDestroy {
  readonly exercise = input.required<string>();
  readonly target = input.required<number>();
  readonly configuration = input.required<PlateConfiguration>();
  readonly unit = computed<WeightUnit>(() => this.configuration().unit);
  readonly close = output<void>();
  readonly targetChange = output<number>();
  readonly barChange = output<number>();
  readonly inventoryChange = output<{weight: number; enabled: boolean}>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly result = computed(() => calculatePlateCombination(this.target(), this.configuration()));
  readonly discTotal = computed(() => Math.round((this.target() - this.configuration().barWeight) * 100) / 100);
  readonly error = computed(() => {
    const {barWeight} = this.configuration();
    if (!Number.isFinite(this.target()) || this.target() <= 0) return 'Introduce el peso total que quieres montar.';
    if (!Number.isFinite(barWeight) || barWeight < 0) return 'Revisa el peso de la barra.';
    return this.target() < barWeight ? 'El peso total es menor que la barra.' : null;
  });
  private previousFocus: HTMLElement | null = null;
  ngAfterViewInit(): void { this.previousFocus = document.activeElement as HTMLElement; this.dialog().nativeElement.showModal(); }
  ngOnDestroy(): void { this.dialog().nativeElement.close(); this.previousFocus?.focus(); }
  value(event: Event): number { return (event.target as HTMLInputElement).valueAsNumber; }
  dismiss(event: Event): void { event.preventDefault(); this.close.emit(); }
  backdrop(event: MouseEvent): void {
    const rect = this.dialog().nativeElement.getBoundingClientRect();
    if (event.target === this.dialog().nativeElement && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) this.close.emit();
  }
}
