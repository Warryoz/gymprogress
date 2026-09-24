import { Component, computed, input, output } from '@angular/core';
import { TrainingPlanRow } from './training-plan';

@Component({
  selector: 'app-workout-exercise-navigation',
  template: `
    <section aria-labelledby="exercise-navigation-title">
      <div class="heading">
        <h2 id="exercise-navigation-title">Ejercicios</h2>
        <span aria-live="polite">{{ currentIndex() + 1 }} de {{ rows().length }}</span>
      </div>
      <nav aria-label="Navegar entre ejercicios">
        @for (row of rows(); track row.sourceRow; let index = $index) {
          <button type="button" [class.current]="current() === row.sourceRow"
            [class.done]="completed().has(row.sourceRow)"
            [attr.aria-current]="current() === row.sourceRow ? 'step' : null"
            [attr.aria-label]="'Ejercicio ' + (index + 1) + ': ' + row.exercise + (completed().has(row.sourceRow) ? ', completado' : ', pendiente')"
            [title]="row.exercise" (click)="selected.emit(row.sourceRow)">
            {{ index + 1 }}
            @if (completed().has(row.sourceRow)) { <i aria-hidden="true">✓</i> }
          </button>
        }
      </nav>
      <details>
        <summary>Ver listado de ejercicios</summary>
        <ol>@for (row of rows(); track row.sourceRow) { <li>{{ row.exercise }}</li> }</ol>
      </details>
    </section>
  `,
  styles: `
    details{margin-top:12px;font-size:.8rem;color:var(--text-secondary)}summary{cursor:pointer;min-height:32px;display:list-item;align-content:center}ol{margin:8px 0 0;padding-left:24px;line-height:1.6}li{padding:3px 0}summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
    :host{display:block;margin-bottom:16px}section{padding:16px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
    .heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}h2{margin:0;font-size:1rem}.heading span,p{font-size:.78rem;color:var(--text-secondary)}
    nav{display:flex;flex-wrap:wrap;gap:10px}button{position:relative;min-width:44px;height:44px;border:1px solid var(--border);border-radius:12px;background:var(--surface-elevated);color:var(--text-primary);font:inherit;font-weight:800;cursor:pointer}
    button.done{color:var(--success);border-color:var(--success)}button.current{background:var(--accent);color:var(--accent-contrast);border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 20%,transparent)}
    i{position:absolute;right:-4px;top:-5px;border-radius:50%;background:var(--success);color:var(--surface);width:17px;height:17px;line-height:17px;font-style:normal;font-size:11px}p{margin:12px 0 0;line-height:1.5}button:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
  `,
})
export class WorkoutExerciseNavigation {
  readonly rows = input.required<TrainingPlanRow[]>();
  readonly current = input<number | null>(null);
  readonly completed = input<ReadonlySet<number>>(new Set());
  readonly selected = output<number>();
  readonly currentIndex = computed(() => this.rows().findIndex(row => row.sourceRow === this.current()));
}
