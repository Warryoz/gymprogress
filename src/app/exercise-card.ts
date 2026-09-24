import { WarmupModal } from './warmup-modal';
import { TechnicalTooltip } from './technical-tooltip';
import { technicalDescription } from './training-glossary';
import { Component, computed, input, output, signal } from '@angular/core';
import { TrainingPlanRow, formatSuggestedLoad } from './training-plan';
import { resolveBlockTwoRepdbExercise } from './repdb-exercise-media';
import { ExerciseMuscleMap } from './exercise-muscle-map';
import { plannedSetCount } from './exercise-set-progress';

@Component({
  selector: 'app-exercise-card',
  imports: [WarmupModal, TechnicalTooltip, ExerciseMuscleMap],
  template: `
    <article
      class="exercise-card"
      tabindex="-1"
      [class]="tone()"
      [class.completed]="completed()"
      [id]="cardId()"
    >
      @if (firstExercise() && !repdbMedia()) { <button type="button" class="warmup-action" (click)="warmupOpen.set(true)">♨ Calentar</button> }
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

        @if (usesBarbell() && !repdbMedia()) {
          <button type="button" class="mount-bar" (click)="mountBar.emit()">Ver barra montada</button>
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
            @if (usesBarbell()) {
              <button type="button" class="mount-bar image-action" (click)="mountBar.emit()" aria-label="Ver barra montada">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 5v14M3 8v8M17 5v14M21 8v8M7 12h10M1 12h2M21 12h2" /></svg>
                Montar barra
              </button>
            }
            @if (firstExercise()) { <button type="button" class="warmup-action on-image" (click)="warmupOpen.set(true)">♨ Calentar</button> }
            <button type="button" class="muscle-toggle"
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
        @if (totalSets() > 0) {
          <section class="set-tracker" [class.finished]="allSetsCompleted()">
            <button
              type="button"
              class="set-tracker-toggle"
              [attr.aria-expanded]="setsOpen()"
              [attr.aria-controls]="setPanelId()"
              (click)="setsOpen.set(!setsOpen())"
            >
              <span class="set-tracker-copy">
                <span>Series</span>
                <strong>{{ completedSetCount() }} de {{ totalSets() }}</strong>
              </span>
              <span class="set-progress" aria-hidden="true">
                @for (setNumber of setNumbers(); track setNumber) {
                  <i [class.done]="isSetCompleted(setNumber)"></i>
                }
              </span>
              <span class="set-tracker-hint">
                {{ allSetsCompleted() ? 'Listas' : 'Registrar' }}
                <span aria-hidden="true">{{ setsOpen() ? '−' : '+' }}</span>
              </span>
            </button>

            @if (setsOpen()) {
              <div class="set-list" [id]="setPanelId()">
                @for (setNumber of setNumbers(); track setNumber) {
                  <button
                    type="button"
                    class="set-row"
                    [class.done]="isSetCompleted(setNumber)"
                    [attr.aria-pressed]="isSetCompleted(setNumber)"
                    (click)="toggleSet(setNumber)"
                  >
                    <span class="set-number">{{ setNumber }}</span>
                    <span class="set-prescription">
                      <strong>Serie {{ setNumber }}</strong>
                    </span>
                    <span class="set-status">
                      {{ isSetCompleted(setNumber) ? 'Hecha' : 'Confirmar' }}
                      <i aria-hidden="true">{{ isSetCompleted(setNumber) ? '✓' : '○' }}</i>
                    </span>
                  </button>
                }
              </div>
            }
          </section>
        }

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
    @if (firstExercise() && warmupOpen()) { <app-warmup-modal [exercise]="row().exercise" [suggestedLoad]="row().suggestedLoad" [barbell]="usesBarbell()" (close)="warmupOpen.set(false)" /> }
  `,
  styleUrl: './exercise-card.css',
})
export class ExerciseCard {
  readonly firstExercise = input(false);
  protected readonly warmupOpen = signal(false);
  readonly mountBar = output<void>();
  protected readonly usesBarbell = computed(() => {
    const row = this.row();
    const name = row.exercise.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/mancuerna|dumbbell|maquina|machine|polea|cable|goblet|hack|prensa|dominada|pull.up/.test(name)) return false;
    if (this.showRepdbMedia()) {
      const media = resolveBlockTwoRepdbExercise(row);
      if (media) return ['incline-bench-press', 'wide-grip-bench-press', 'barbell-row', 'ez-bar-overhead-extension', 'squat', 'romanian-deadlift', 'hip-thrust'].includes(media.id);
    }
    return /barra|barbell|bench press|press (?:de )?banca|press inclinado|sentadilla|squat|peso muerto|deadlift|hip thrust|press militar|overhead press/.test(name);
  });
  protected readonly describe = technicalDescription;
  public readonly row = input.required<TrainingPlanRow>();
  public readonly tone = input.required<string>();
  public readonly trainingMode = input(false);
  public readonly showRepdbMedia = input(false);
  public readonly completed = input(false);
  public readonly completedSets = input<ReadonlySet<number>>(new Set<number>());
  public readonly completedChange = output<boolean>();
  public readonly setCompletedChange = output<{ setNumber: number; completed: boolean }>();
  protected readonly musclesOpen = signal(false);
  protected readonly setsOpen = signal(false);
  protected readonly cardId = computed(() => `exercise-${this.row().sourceRow}`);
  protected readonly musclePanelId = computed(() => `${this.cardId()}-muscles`);
  protected readonly setPanelId = computed(() => `${this.cardId()}-sets`);
  protected readonly displayLoad = computed(() => formatSuggestedLoad(this.row().suggestedLoad));
  protected readonly totalSets = computed(() => plannedSetCount(this.row().sets));
  protected readonly setNumbers = computed(() =>
    Array.from({ length: this.totalSets() }, (_, index) => index + 1),
  );
  protected readonly completedSetCount = computed(() =>
    this.setNumbers().filter((setNumber) => this.completedSets().has(setNumber)).length,
  );
  protected readonly allSetsCompleted = computed(
    () => this.totalSets() > 0 && this.completedSetCount() === this.totalSets(),
  );
  protected readonly repdbMedia = computed(() =>
    this.showRepdbMedia() ? resolveBlockTwoRepdbExercise(this.row()) : null,
  );

  protected isSetCompleted(setNumber: number): boolean {
    return this.completedSets().has(setNumber);
  }

  protected toggleSet(setNumber: number): void {
    this.setCompletedChange.emit({
      setNumber,
      completed: !this.isSetCompleted(setNumber),
    });
  }
}
