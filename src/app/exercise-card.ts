import { TechnicalTooltip } from './technical-tooltip';
import { technicalDescription } from './training-glossary';
import { Component, computed, input, output } from '@angular/core';
import { TrainingPlanRow, formatSuggestedLoad } from './training-plan';

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
            @if (describe(displayLoad()); as description) { <app-technical-tooltip [term]="displayLoad()" [description]="description" variant="subtle" /> } @else { <span>{{ displayLoad() }}</span> }
          }
          @if (row().rir) {
            @if (describe(row().rir); as description) { <app-technical-tooltip [term]="row().rir" [description]="description" variant="subtle" /> } @else { <span>{{ row().rir }}</span> }
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

    </article>
  `,
  styleUrl: './exercise-card.css',
})
export class ExerciseCard {
  protected readonly describe = technicalDescription;
  public readonly row = input.required<TrainingPlanRow>();
  public readonly tone = input.required<string>();
  public readonly trainingMode = input(false);
  public readonly completed = input(false);
  public readonly completedChange = output<boolean>();
  protected readonly cardId = computed(() => `exercise-${this.row().sourceRow}`);
  protected readonly displayLoad = computed(() => formatSuggestedLoad(this.row().suggestedLoad));
}
