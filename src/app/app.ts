import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  ExerciseProgress,
  ParsedTrainingLog,
  SessionSummary,
  TrainingProgress,
  WorkoutEntry,
  WorkoutSet,
  buildTrainingProgress,
  parseTrainingCsv,
} from './workout-progress';

interface MetricCard {
  label: string;
  value: string;
  detail: string;
}

interface ChartBar {
  label: string;
  workout: string;
  value: number;
  height: number;
}

interface TrendDot {
  x: number;
  y: number;
  value: number;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  public readonly csvText = signal('');
  public readonly trainingLog = signal<ParsedTrainingLog | null>(null);
  public readonly selectedWorkout = signal('all');
  public readonly selectedExerciseKey = signal('');
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly workoutOptions = computed(() => {
    const log = this.trainingLog();

    if (!log) {
      return [];
    }

    return [...new Set(log.sessions.map((session) => session.workout))];
  });

  public readonly selectedProgress = computed<TrainingProgress | null>(() => {
    const log = this.trainingLog();

    if (!log) {
      return null;
    }

    if (this.selectedWorkout() === 'all') {
      return buildTrainingProgress('Todos', log.entries, log.sessions);
    }

    const sessions = log.sessions.filter((session) => session.workout === this.selectedWorkout());
    const entries = sessions.flatMap((session) => session.entries);
    return buildTrainingProgress(this.selectedWorkout(), entries, sessions);
  });

  public readonly metricCards = computed<MetricCard[]>(() => {
    const progress = this.selectedProgress();

    if (!progress) {
      return [];
    }

    return [
      {
        label: 'Entrenos',
        value: this.formatInteger(progress.stats.sessions),
        detail: `${this.formatInteger(progress.stats.entries)} ejercicios`,
      },
      {
        label: 'Volumen',
        value: this.formatKg(progress.stats.totalVolumeKg),
        detail: this.formatSessionChange(progress.stats.volumeChangePct),
      },
      {
        label: 'Series',
        value: this.formatInteger(progress.stats.sets),
        detail: `${this.formatInteger(progress.stats.reps)} reps`,
      },
      {
        label: 'Mejor peso',
        value: this.formatKg(progress.stats.maxWeightKg),
        detail: `${this.formatInteger(progress.stats.exercises)} movimientos`,
      },
      {
        label: 'Mejor 1RM',
        value: this.formatKg(progress.stats.bestOneRepMaxKg),
        detail: `Promedio ${this.formatKg(progress.stats.averageSetWeightKg)}`,
      },
    ];
  });

  public readonly sessionBars = computed<ChartBar[]>(() => {
    const sessions = this.selectedProgress()?.sessionSummaries.slice(-16) ?? [];
    const max = Math.max(...sessions.map((session) => session.volumeKg), 1);

    return sessions.map((session) => ({
      label: session.label,
      workout: session.workout,
      value: session.volumeKg,
      height: Math.max((session.volumeKg / max) * 100, session.volumeKg > 0 ? 8 : 0),
    }));
  });

  public readonly selectedExercise = computed<ExerciseProgress | null>(() => {
    const movements = this.selectedProgress()?.topMovements ?? [];

    return (
      movements.find((movement) => movement.key === this.selectedExerciseKey()) ??
      movements[0] ??
      null
    );
  });

  public readonly exerciseTrendDots = computed<TrendDot[]>(() => {
    const entries = this.selectedExercise()?.entries ?? [];
    const weightedEntries = entries
      .map((entry) => ({
        label: `#${entry.sessionIndex}`,
        value: entry.maxWeightKg,
      }))
      .filter((entry) => entry.value > 0);

    if (!weightedEntries.length) {
      return [];
    }

    const max = Math.max(...weightedEntries.map((entry) => entry.value));
    const min = Math.min(...weightedEntries.map((entry) => entry.value));
    const spread = Math.max(max - min, 1);
    const width = 560;
    const height = 180;
    const pad = 22;

    return weightedEntries.map((entry, index) => {
      const x =
        weightedEntries.length === 1
          ? width / 2
          : pad + (index / (weightedEntries.length - 1)) * (width - pad * 2);
      const y = height - pad - ((entry.value - min) / spread) * (height - pad * 2);

      return {
        x,
        y,
        value: entry.value,
        label: entry.label,
      };
    });
  });

  public readonly exerciseTrendLine = computed(() =>
    this.exerciseTrendDots()
      .map((dot) => `${dot.x},${dot.y}`)
      .join(' '),
  );

  public async ngOnInit(): Promise<void> {
    await this.loadSampleCsv();
  }

  public updateCsvText(event: Event): void {
    this.csvText.set((event.target as HTMLTextAreaElement).value);
  }

  public parseCurrentText(sourceName = 'pegado'): void {
    this.parseText(this.csvText(), sourceName);
  }

  public async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    this.csvText.set(text);
    this.parseText(text, file.name);
    input.value = '';
  }

  public async loadSampleCsv(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await fetch('training-log.csv');

      if (!response.ok) {
        throw new Error(`No se pudo cargar la muestra (${response.status}).`);
      }

      const text = await response.text();
      this.csvText.set(text);
      this.parseText(text, 'training-log.csv');
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  public selectWorkout(workout: string): void {
    this.selectedWorkout.set(workout);
    this.selectedExerciseKey.set(this.selectedProgress()?.topMovements[0]?.key ?? '');
  }

  public selectExercise(key: string): void {
    this.selectedExerciseKey.set(key);
  }

  public formatInteger(value: number): string {
    return Math.round(value).toLocaleString();
  }

  public formatKg(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '-';
    }

    const digits = Math.abs(value) >= 100 ? 0 : 1;
    return `${value.toLocaleString(undefined, {
      maximumFractionDigits: digits,
      minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
    })} kg`;
  }

  public formatSignedKg(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '-';
    }

    const sign = value > 0 ? '+' : '';
    return `${sign}${this.formatKg(value)}`;
  }

  public formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '-';
    }

    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
  }

  public setSummary(entry: WorkoutEntry): string {
    return entry.sets.map((set) => this.setLabel(set)).join(' / ');
  }

  public setLabel(set: WorkoutSet): string {
    const weight =
      set.unit === 'lb'
        ? `${set.weight.toLocaleString()} lb`
        : `${set.weight.toLocaleString()} kg`;
    return `${set.reps} x ${weight}`;
  }

  public sessionTitle(session: SessionSummary): string {
    return `Entreno #${session.index}`;
  }

  private parseText(text: string, sourceName: string): void {
    this.error.set(null);

    try {
      const parsed = parseTrainingCsv(text, sourceName);

      if (!parsed.sessions.length) {
        throw new Error('No se encontraron entrenos con series validas.');
      }

      this.trainingLog.set(parsed);
      this.selectedWorkout.set('all');
      this.selectedExerciseKey.set(parsed.entries[0]?.exerciseKey ?? '');
    } catch (error) {
      this.trainingLog.set(null);
      this.error.set(this.errorMessage(error));
    }
  }

  private formatSessionChange(value: number | null): string {
    if (value === null) {
      return 'Sin comparacion previa';
    }

    return `${this.formatPercent(value)} vs entreno anterior`;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'No se pudo leer el CSV.';
  }
}
