import { TechnicalTooltip } from './technical-tooltip';
import { technicalDescription } from './training-glossary';
import { Component, computed, input, output, signal } from '@angular/core';
import { TrainingPlanRow, formatSuggestedLoad } from './training-plan';
import { resolveBlockTwoRepdbExercise } from './repdb-exercise-media';
import { ExerciseMuscleMap } from './exercise-muscle-map';

@Component({
  selector: 'app-exercise-card',
  imports: [TechnicalTooltip, ExerciseMuscleMap],
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

      @if (repdbMedia(); as media) {
        <figure class="repdb-media" [attr.aria-label]="'Demostración de ' + media.name">
          <div class="repdb-visual" [class.animated]="media.kind === 'animated'">
            @if (media.kind === 'animated') {
              <img
                class="pose pose-start"
                [src]="media.startUrl"
                [alt]="'Posición inicial de ' + media.name"
                loading="lazy"
                decoding="async"
              />
              <img
                class="pose pose-peak"
                [src]="media.peakUrl"
                alt=""
                loading="lazy"
                decoding="async"
              />
            } @else {
              <img
                class="pose"
                [src]="media.imageUrl"
                [alt]="'Guía visual de ' + media.name"
                loading="lazy"
                decoding="async"
              />
            }
            <button
              type="button"
              class="muscle-toggle"
              [attr.aria-expanded]="musclesOpen()"
              [attr.aria-controls]="musclePanelId()"
              (click)="musclesOpen.set(!musclesOpen())"
            >
              <span aria-hidden="true">◉</span>
              Músculos
              <span class="toggle-chevron" aria-hidden="true">{{ musclesOpen() ? '−' : '+' }}</span>
            </button>
          </div>
          @if (musclesOpen()) {
            <section class="muscle-panel" [id]="musclePanelId()" aria-label="Músculos trabajados">
              <app-exercise-muscle-map
                [primary]="media.primaryMuscles"
                [secondary]="media.secondaryMuscles"
              />
              <div class="muscle-details">
                <div>
                  <span class="muscle-heading"><i></i> Principales</span>
                  <p class="muscle-list">
                    @for (muscle of media.primaryMuscles; track muscle) {
                      <span class="muscle-chip primary">{{ muscle }}</span>
                    }
                  </p>
                </div>
                @if (media.secondaryMuscles.length) {
                  <div>
                    <span class="muscle-heading secondary"><i></i> Secundarios</span>
                    <p class="muscle-list">
                      @for (muscle of media.secondaryMuscles; track muscle) {
                        <span class="muscle-chip">{{ muscle }}</span>
                      }
                    </p>
                  </div>
                }
              </div>
            </section>
          }
        </figure>
      }

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
  public readonly showRepdbMedia = input(false);
  public readonly completed = input(false);
  public readonly completedChange = output<boolean>();
  protected readonly musclesOpen = signal(false);
  protected readonly cardId = computed(() => `exercise-${this.row().sourceRow}`);
  protected readonly musclePanelId = computed(() => `${this.cardId()}-muscles`);
  protected readonly displayLoad = computed(() => formatSuggestedLoad(this.row().suggestedLoad));
  protected readonly repdbMedia = computed(() =>
    this.showRepdbMedia() ? resolveBlockTwoRepdbExercise(this.row()) : null,
  );
}
