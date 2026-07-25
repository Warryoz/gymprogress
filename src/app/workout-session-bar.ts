import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-workout-session-bar',
  template: `
    <section class="session-bar" aria-label="Asistente de entrenamiento">
      <div class="session-meta">
        <span class="live-indicator"><i aria-hidden="true"></i> En curso</span>
        <strong>{{ workoutName() }}</strong>
        <small>{{ formatTime(elapsedSeconds()) }} · {{ completed() }}/{{ total() }} ejercicios</small>
      </div>

      @if (restDuration() > 0) {
        <div
          class="rest-timer"
          [class.finished]="restFinished()"
          role="timer"
          aria-live="polite"
        >
          <span
            class="timer-ring"
            [style.--timer-progress]="restProgress() + '%'"
            aria-hidden="true"
          ></span>
          <div>
            <small>{{ restFinished() ? 'Descanso listo' : restPaused() ? 'En pausa' : 'Descanso' }}</small>
            <strong>{{ restFinished() ? '¡Vamos!' : formatTime(restRemaining()) }}</strong>
          </div>
          @if (!restFinished()) {
            <button type="button" class="timer-action" (click)="toggleRest.emit()">
              {{ restPaused() ? 'Reanudar' : 'Pausar' }}
            </button>
            <button type="button" class="timer-action" (click)="addRest.emit()">+30 s</button>
          }
          <button type="button" class="timer-action dismiss" (click)="dismissRest.emit()">
            {{ restFinished() ? 'Listo' : 'Saltar' }}
          </button>
        </div>
      } @else {
        <div class="next-up">
          <small>{{ allCompleted() ? 'Sesión completa' : 'Siguiente ejercicio' }}</small>
          <strong>{{ allCompleted() ? 'Buen trabajo. Toca cerrar la sesión.' : nextExercise() }}</strong>
        </div>
      }

      <div class="session-actions">
        <button type="button" class="quiet-action" (click)="exitFocus.emit()">
          Salir de enfoque
        </button>
        <button type="button" class="next-action" (click)="primaryAction.emit()">
          {{ allCompleted() ? 'Finalizar' : 'Siguiente' }}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  `,
  styleUrl: './workout-session-bar.css',
})
export class WorkoutSessionBar {
  public readonly workoutName = input.required<string>();
  public readonly nextExercise = input('');
  public readonly completed = input(0);
  public readonly total = input(0);
  public readonly elapsedSeconds = input(0);
  public readonly restRemaining = input(0);
  public readonly restDuration = input(0);
  public readonly restPaused = input(false);
  public readonly restFinished = input(false);
  public readonly allCompleted = input(false);

  public readonly exitFocus = output<void>();
  public readonly primaryAction = output<void>();
  public readonly toggleRest = output<void>();
  public readonly addRest = output<void>();
  public readonly dismissRest = output<void>();

  protected readonly restProgress = computed(() => {
    const duration = this.restDuration();
    if (!duration || this.restFinished()) return 100;
    return Math.max(0, Math.min(100, ((duration - this.restRemaining()) / duration) * 100));
  });

  protected formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }
}
