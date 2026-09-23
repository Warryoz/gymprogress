import { Component, input } from '@angular/core';
import {
  WorkoutReportData,
  formatReportNumber,
  formatWorkoutDuration,
} from './workout-report';

@Component({
  selector: 'app-workout-report-card',
  template: `
    <article class="report-card" data-workout-report-export [class.export-card]="exportMode()">
      <header>
        <div class="brand"><span>GG</span><strong>gerogym</strong></div>
        <div class="completed-pill"><span aria-hidden="true">✓</span> ENTRENAMIENTO COMPLETADO</div>
        <h2>{{ report().title }}</h2>
        <div class="context">
          <span>{{ report().block }}</span><i></i><span>Semana {{ report().week }}</span><i></i>
          <time>{{ report().completedAt.toLocaleDateString('es-CO') }}</time>
        </div>
      </header>

      <section class="hero-stat" aria-label="Resultado principal">
        <span>{{ primaryMetricLabel() }}</span>
        <strong>{{ primaryMetricValue() }}</strong>
        <p>{{ achievementTitle() }}</p>
      </section>

      <section class="metrics" aria-label="Métricas del entrenamiento">
        <div><strong>{{ report().exercisesCompleted }}</strong><span>Ejercicios</span></div>
        <div><strong>{{ report().setsCompleted }}</strong><span>Series</span></div>
        <div><strong>{{ duration(report().durationSeconds) }}</strong><span>Duración</span></div>
        <div><strong>{{ report().completionRate }}%</strong><span>Completado</span></div>
      </section>

      <section class="insight">
        <span aria-hidden="true">↗</span><strong>{{ insightTitle() }}</strong>
      </section>

      <footer><span>Disciplina acumulada. Progreso en marcha.</span><strong>gerogym</strong></footer>
    </article>
  `,
  styleUrl: './workout-report-achievement.css',
})
export class WorkoutReportCard {
  public readonly report = input.required<WorkoutReportData>();
  public readonly exportMode = input(false);
  protected readonly duration = formatWorkoutDuration;

  protected primaryMetricLabel(): string {
    return this.report().estimatedVolumeKg > 0 ? 'VOLUMEN ESTIMADO' : 'SERIES COMPLETADAS';
  }

  protected primaryMetricValue(): string {
    return this.report().estimatedVolumeKg > 0
      ? `${formatReportNumber(this.report().estimatedVolumeKg)} kg`
      : String(this.report().setsCompleted);
  }

  protected achievementTitle(): string {
    const sets = this.report().setsCompleted;
    if (sets >= 20) return 'Sesión de gran volumen';
    if (sets >= 12) return 'Trabajo sólido';
    return 'Misión cumplida';
  }

  protected insightTitle(): string {
    const report = this.report();
    return report.estimatedReps > 0
      ? `${formatReportNumber(report.estimatedReps)} repeticiones estimadas`
      : `${report.setsCompleted} series completadas`;
  }

}
