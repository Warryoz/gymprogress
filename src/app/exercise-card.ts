import { Component, computed, input, output, signal } from '@angular/core';
import { TrainingPlanRow, formatSuggestedLoad } from './training-plan';
import { TechnicalTooltip } from './technical-tooltip';

@Component({
  selector: 'app-exercise-card',
  imports: [TechnicalTooltip],
  template: `
    <article
      class="exercise-card"
      [class]="tone()"
      [class.completed]="completed()"
      [id]="cardId()"
    >
      <div class="exercise-main">
        <div class="exercise-title">
          <span class="block-label">
            {{ row().block }}
            @if (completed()) {
              <em>✓ Completado</em>
            }
          </span>
          <h3>{{ row().exercise }}</h3>
        </div>

        <p class="prescription">
          <strong>{{ row().sets }} × {{ row().repsOrTime }}</strong>
          @if (row().suggestedLoad) {
            <span>{{ displayLoad() }}</span>
          }
          @if (row().rir) {
            <app-technical-tooltip
              [term]="row().rir"
              [description]="effortDescription()"
              variant="subtle"
            />
          }
        </p>

        @if (row().rest) {
          <p class="rest">Descanso: {{ row().rest }}</p>
        }
      </div>

      @if (trainingMode()) {
        <button
          type="button"
          class="complete-action"
          [class.completed]="completed()"
          [attr.aria-pressed]="completed()"
          (click)="completedChange.emit(!completed())"
        >
          <span aria-hidden="true">{{ completed() ? '✓' : '○' }}</span>
          {{ completed() ? 'Ejercicio completado' : 'Marcar ejercicio como completado' }}
        </button>
      }

      <button
        type="button"
        class="details-toggle"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="detailsId()"
        (click)="expanded.set(!expanded())"
      >
        {{ expanded() ? 'Ocultar detalles' : 'Ver detalles' }}
        <span aria-hidden="true">{{ expanded() ? '−' : '+' }}</span>
      </button>

      <div class="exercise-details" [id]="detailsId()" [hidden]="!expanded()">
        @if (row().tempo) {
          <div>
            <app-technical-tooltip
              term="Tempo"
              description="Orden de segundos para bajar, pausar y subir el peso en cada repetición."
              variant="subtle"
            />
            <p>{{ row().tempo }}</p>
          </div>
        }
        @if (row().objective) {
          <div>
            <span>Objetivo</span>
            <p>{{ row().objective }}</p>
          </div>
        }
        @if (row().progression) {
          <div>
            <span>Progresión</span>
            <p>{{ row().progression }}</p>
          </div>
        }
        @if (row().notes) {
          <div>
            <span>Nota técnica</span>
            <p>{{ row().notes }}</p>
          </div>
        }
        @if (row().tendonRule) {
          <div>
            <app-technical-tooltip
              term="Regla 24 h"
              description="El dolor debe mantenerse entre 0 y 3 sobre 10 y no empeorar al día siguiente."
              variant="subtle"
            />
            <p>{{ row().tendonRule }}</p>
          </div>
        }
      </div>
    </article>
  `,
  styleUrl: './exercise-card.css',
})
export class ExerciseCard {
  public readonly row = input.required<TrainingPlanRow>();
  public readonly tone = input.required<string>();
  public readonly trainingMode = input(false);
  public readonly completed = input(false);
  public readonly completedChange = output<boolean>();
  protected readonly expanded = signal(false);
  protected readonly detailsId = computed(() => `exercise-details-${this.row().sourceRow}`);
  protected readonly cardId = computed(() => `exercise-${this.row().sourceRow}`);
  protected readonly displayLoad = computed(() => formatSuggestedLoad(this.row().suggestedLoad));
  protected readonly effortDescription = computed(() =>
    this.row().rir.toLocaleLowerCase().includes('dolor')
      ? 'Mantén el dolor entre 0 y 3 sobre 10 y comprueba que no empeore al día siguiente.'
      : 'Repeticiones en reserva. RIR 2 significa terminar sintiendo que podrías hacer unas dos repeticiones más.',
  );
}
