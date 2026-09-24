import { Component, computed, input } from '@angular/core';
import { PlateSelection, WeightUnit } from './strength-tools';

@Component({
  selector: 'app-barbell-visual',
  template: `
    <div class="drawing" role="img" [attr.aria-label]="description()">
      <div class="bar">
        <div class="side left" aria-hidden="true">
          @for (weight of discs(); track $index) {
            <span class="disc" [style.height.px]="height(weight)">{{ weight }}</span>
          }
        </div>
        <span class="shaft" aria-hidden="true"></span>
        <div class="side" aria-hidden="true">
          @for (weight of discs(); track $index) {
            <span class="disc" [style.height.px]="height(weight)">{{ weight }}</span>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host{display:block;min-width:0}.drawing{overflow-x:auto;padding:8px 2px;border-radius:14px;background:var(--surface-elevated)}
    .bar{display:flex;align-items:center;justify-content:center;min-width:max-content;padding:0 2px;min-height:126px}
    .side{position:relative;display:flex;align-items:center;gap:2px;padding:0 3px;background:linear-gradient(transparent calc(50% - 6px),#9299a6 calc(50% - 6px),#9299a6 calc(50% + 6px),transparent calc(50% + 6px))}
    .left{flex-direction:row-reverse}.disc{z-index:1;display:flex;align-items:center;justify-content:center;width:36px;flex-shrink:0;border:2px solid #a995f1;border-radius:6px;background:#39304e;color:#fff;font-size:14px;font-weight:850;font-variant-numeric:tabular-nums}
    .shaft{width:clamp(32px,9vw,90px);flex-shrink:0;height:14px;background:linear-gradient(#d2d6de,#7e8796);border-inline:5px solid #e6e8ed;border-radius:3px}
  `,
})
export class BarbellVisual {
  readonly selection = input.required<PlateSelection>();
  readonly unit = input<WeightUnit>('kg');
  readonly ordered = computed(() => [...this.selection().perSide].sort((a, b) => b.weight - a.weight));
  readonly discs = computed(() => this.ordered().flatMap(p => Array<number>(p.count).fill(p.weight)));
  readonly description = computed(() => `Barra de ${this.selection().total} ${this.unit()}. En cada lado: ${this.ordered().map(p => `${p.count} discos de ${p.weight} ${this.unit()}`).join(', ') || 'sin discos'}.`);
  height(weight: number): number { return 46 + 76 * Math.sqrt(weight / (this.unit() === 'kg' ? 25 : 45)); }
}
