import { Component, computed, signal } from '@angular/core';
import { TRAINING_TERMS } from './training-glossary';
@Component({
 selector: 'app-training-dictionary',
 template: `
 <header><p class="eyebrow">Consulta</p><h1>Diccionario</h1><p>Términos del entrenamiento.</p></header>
 <label class="search">Buscar término<input type="search" placeholder="BW, RIR, tempo…" [value]="query()" (input)="query.set($any($event.target).value)" /></label>
 <div class="terms">
 @for (item of filtered(); track item.term) {
  <article><span class="term">{{ item.term }}</span><h2>{{ item.name }}</h2><p>{{ item.description }}</p></article>
 } @empty { <p role="status">No se encontraron términos.</p> }
 </div>
 `,
 styles: `
 :host { display: block; max-width: 1000px; margin: auto; }
 * { box-sizing: border-box; }
 header { margin-bottom: 24px; }
 h1 { margin: 4px 0 8px; font-size: clamp(1.8rem, 5vw, 2.5rem); }
 p { color: var(--text-secondary); line-height: 1.6; margin: 8px 0 0; }
 .eyebrow { color: var(--accent); font-size: .75rem; text-transform: uppercase; letter-spacing: .1em; }
 .search { display: grid; gap: 8px; margin-bottom: 24px; font-size: .9rem; }
 input { width: 100%; min-height: 48px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); color: var(--text-primary); padding: 12px 16px; font: inherit; font-size: 16px; }
 input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
 .terms { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 16px; }
 article { min-width: 0; padding: 20px; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); overflow-wrap: anywhere; }
 .term { display: inline-block; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); padding: 6px 10px; border-radius: 8px; font-weight: 750; }
 h2 { font-size: 1rem; margin: 16px 0 0; }
 `
})
export class TrainingDictionary {
 readonly query = signal('');
 readonly filtered = computed(() => {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/×/g, 'x').replace(/[-\s]+/g, ' ');
  const query = normalize(this.query().trim());
  return TRAINING_TERMS.filter(item => normalize(item.term + ' ' + item.name + ' ' + item.description).includes(query));
 });
}
