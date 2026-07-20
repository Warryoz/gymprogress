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
import { ParsedTrainingPlan, PlanDay, TrainingPlanRow, parseTrainingPlanCsv } from './training-plan';

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

interface PlanSummaryRow {
  row: TrainingPlanRow;
  sets: number;
  loadLabel: string;
  phaseShort: string;
}

interface PlanWeekBar {
  label: string;
  phase: string;
  sets: number;
  exercises: number;
  height: number;
}

interface PlanBlockShare {
  label: string;
  sets: number;
  rows: number;
  share: number;
  className: string;
}

interface PlanDaySummary {
  label: string;
  focus: string;
  sets: number;
  exercises: number;
  careRows: number;
}

type ActiveView = 'plan' | 'routineSummary' | 'progress';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  public readonly activeView = signal<ActiveView>('plan');
  public readonly csvText = signal('');
  public readonly trainingLog = signal<ParsedTrainingLog | null>(null);
  public readonly trainingPlan = signal<ParsedTrainingPlan | null>(null);
  public readonly selectedWorkout = signal('all');
  public readonly selectedExerciseKey = signal('');
  public readonly selectedPlanWeek = signal(1);
  public readonly selectedSummaryWeek = signal<number | 'all'>('all');
  public readonly selectedSummaryRoutine = signal('all');
  public readonly selectedPlanDay = signal('all');
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly planError = signal<string | null>(null);

  public readonly planWeeks = computed(() => this.trainingPlan()?.weeks ?? []);

  public readonly currentPlanWeek = computed(() => {
    const weeks = this.planWeeks();
    return weeks.find((week) => week.week === this.selectedPlanWeek()) ?? weeks[0] ?? null;
  });

  public readonly planDayOptions = computed<PlanDay[]>(() => this.currentPlanWeek()?.days ?? []);

  public readonly currentPlanWeekExerciseCount = computed(
    () => this.currentPlanWeek()?.rows.length ?? 0,
  );

  public readonly summaryRoutineOptions = computed(() => {
    const plan = this.trainingPlan();

    if (!plan) {
      return [];
    }

    return [...new Set(plan.rows.map((row) => row.day))].filter(Boolean);
  });

  public readonly summaryPlanRows = computed<PlanSummaryRow[]>(() => {
    const plan = this.trainingPlan();
    const selectedWeek = this.selectedSummaryWeek();
    const selectedRoutine = this.selectedSummaryRoutine();

    if (!plan) {
      return [];
    }

    return plan.rows
      .filter(
        (row) =>
          (selectedWeek === 'all' || row.week === selectedWeek) &&
          (selectedRoutine === 'all' || row.day === selectedRoutine),
      )
      .map((row) => ({
        row,
        sets: this.planSetCount(row.sets),
        loadLabel: row.suggestedLoad || '-',
        phaseShort: this.shortPhase(row.phase),
      }));
  });

  public readonly summaryMetricCards = computed<MetricCard[]>(() => {
    const plan = this.trainingPlan();
    const rows = this.summaryPlanRows();

    if (!plan) {
      return [];
    }

    const sets = rows.reduce((sum, item) => sum + item.sets, 0);
    const careRows = rows.filter((item) => this.isPlanCareBlock(item.row)).length;
    const weightedRows = rows.filter((item) => this.hasWeightedLoad(item.row.suggestedLoad)).length;

    return [
      {
        label: 'Vista',
        value: this.selectedSummaryWeek() === 'all' ? '8 semanas' : `Semana ${this.selectedSummaryWeek()}`,
        detail: `${this.formatInteger(rows.length)} filas de rutina`,
      },
      {
        label: 'Series',
        value: this.formatInteger(sets),
        detail: `${this.formatInteger(Math.round(sets / Math.max(rows.length, 1)))} por ejercicio`,
      },
      {
        label: 'Con peso',
        value: this.formatInteger(weightedRows),
        detail: 'carga sugerida numerica',
      },
      {
        label: 'Cuidado',
        value: this.formatInteger(careRows),
        detail: 'tendon, activacion o prehab',
      },
    ];
  });

  public readonly planWeekBars = computed<PlanWeekBar[]>(() => {
    const weeks = this.planWeeks();
    const maxSets = Math.max(...weeks.map((week) => week.sets), 1);

    return weeks.map((week) => ({
      label: `S${week.week}`,
      phase: week.phase,
      sets: week.sets,
      exercises: week.rows.length,
      height: Math.max((week.sets / maxSets) * 100, 8),
    }));
  });

  public readonly planBlockShares = computed<PlanBlockShare[]>(() => {
    const rows = this.summaryPlanRows();
    const totalSets = rows.reduce((sum, item) => sum + item.sets, 0);
    const blocks = new Map<string, PlanBlockShare>();

    rows.forEach(({ row, sets }) => {
      const label = this.blockBucket(row);
      const current =
        blocks.get(label) ??
        ({
          label,
          sets: 0,
          rows: 0,
          share: 0,
          className: this.blockBucketClass(label),
        } satisfies PlanBlockShare);

      current.sets += sets;
      current.rows += 1;
      blocks.set(label, current);
    });

    return [...blocks.values()]
      .map((block) => ({
        ...block,
        share: totalSets > 0 ? (block.sets / totalSets) * 100 : 0,
      }))
      .sort((a, b) => b.sets - a.sets || a.label.localeCompare(b.label));
  });

  public readonly planDaySummaries = computed<PlanDaySummary[]>(() => {
    const rows = this.summaryPlanRows();
    const days = new Map<string, PlanDaySummary>();

    rows.forEach(({ row, sets }) => {
      const current =
        days.get(row.day) ??
        ({
          label: row.day,
          focus: row.focus,
          sets: 0,
          exercises: 0,
          careRows: 0,
        } satisfies PlanDaySummary);

      current.sets += sets;
      current.exercises += 1;
      current.careRows += this.isPlanCareBlock(row) ? 1 : 0;
      days.set(row.day, current);
    });

    return [...days.values()].sort((a, b) => a.label.localeCompare(b.label));
  });

  public readonly selectedPlanRows = computed<TrainingPlanRow[]>(() => {
    const week = this.currentPlanWeek();

    if (!week) {
      return [];
    }

    if (this.selectedPlanDay() === 'all') {
      return week.rows;
    }

    return week.days.find((day) => day.name === this.selectedPlanDay())?.rows ?? week.rows;
  });

  public readonly selectedPlanHeading = computed(() => {
    const week = this.currentPlanWeek();

    if (!week) {
      return null;
    }

    if (this.selectedPlanDay() === 'all') {
      return {
        title: `Semana ${week.week}`,
        detail: week.phase,
        focus: `${week.days.length} dias de trabajo`,
      };
    }

    const day = week.days.find((option) => option.name === this.selectedPlanDay());

    return {
      title: `${day?.name ?? 'Dia'} · Semana ${week.week}`,
      detail: day?.focus ?? week.phase,
      focus: day?.phase ?? week.phase,
    };
  });

  public readonly planMetricCards = computed<MetricCard[]>(() => {
    const plan = this.trainingPlan();
    const week = this.currentPlanWeek();
    const rows = this.selectedPlanRows();

    if (!plan || !week) {
      return [];
    }

    return [
      {
        label: 'Plan',
        value: `${plan.weeks.length} semanas`,
        detail: `${plan.rows.length} ejercicios programados`,
      },
      {
        label: 'Esta vista',
        value: `${rows.length} ejercicios`,
        detail: `${this.formatInteger(rows.reduce((sum, row) => sum + this.planSetCount(row.sets), 0))} series base`,
      },
      {
        label: 'Tendon/prehab',
        value: `${rows.filter((row) => this.isPlanCareBlock(row)).length} bloques`,
        detail: 'Regla 24h incluida',
      },
      {
        label: 'Semana',
        value: `${week.days.length} dias`,
        detail: `${this.formatInteger(week.sets)} series base`,
      },
    ];
  });

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
    await Promise.all([this.loadSampleCsv(), this.loadTrainingPlan()]);
  }

  public setActiveView(view: ActiveView): void {
    this.activeView.set(view);
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

  public async loadTrainingPlan(): Promise<void> {
    this.planError.set(null);

    try {
      const response = await fetch('training-plan-8-weeks.csv');

      if (!response.ok) {
        throw new Error(`No se pudo cargar el plan (${response.status}).`);
      }

      const text = await response.text();
      const parsed = parseTrainingPlanCsv(text);

      if (!parsed.weeks.length) {
        throw new Error('No se encontraron semanas en el plan.');
      }

      this.trainingPlan.set(parsed);
      this.selectedPlanWeek.set(parsed.weeks[0].week);
      this.selectedSummaryWeek.set('all');
      this.selectedSummaryRoutine.set('all');
      this.selectedPlanDay.set('all');
    } catch (error) {
      this.trainingPlan.set(null);
      this.planError.set(this.errorMessage(error));
    }
  }

  public selectWorkout(workout: string): void {
    this.selectedWorkout.set(workout);
    this.selectedExerciseKey.set(this.selectedProgress()?.topMovements[0]?.key ?? '');
  }

  public selectPlanWeek(week: number): void {
    this.selectedPlanWeek.set(week);
    this.selectedPlanDay.set('all');
  }

  public selectSummaryWeek(value: string): void {
    this.selectedSummaryWeek.set(value === 'all' ? 'all' : Number(value));
  }

  public selectSummaryRoutine(value: string): void {
    this.selectedSummaryRoutine.set(value);
  }

  public selectPlanDay(day: string): void {
    this.selectedPlanDay.set(day);
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

  public planPrescription(row: TrainingPlanRow): string {
    const parts = [`${row.sets} x ${row.repsOrTime}`];

    if (row.suggestedLoad) {
      parts.push(row.suggestedLoad);
    }

    if (row.rir) {
      parts.push(row.rir);
    }

    return parts.join(' · ');
  }

  public planMeta(row: TrainingPlanRow): string {
    return [row.tempo && `tempo ${row.tempo}`, row.rest && `descanso ${row.rest}`]
      .filter(Boolean)
      .join(' · ');
  }

  public blockClass(row: TrainingPlanRow): string {
    if (this.isPlanCareBlock(row)) {
      return 'care';
    }

    if (row.block.toLowerCase().includes('principal')) {
      return 'main';
    }

    return 'support';
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

  private isPlanCareBlock(row: TrainingPlanRow): boolean {
    const block = row.block
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return block.includes('tendon') || block.includes('prehab') || block.includes('activacion');
  }

  private planSetCount(value: string): number {
    const first = value
      .split('-')
      .map((part) => Number(part.trim()))
      .find((part) => Number.isFinite(part));
    return first ?? 0;
  }

  private shortPhase(value: string): string {
    return value.split(':')[0]?.trim() || value;
  }

  private hasWeightedLoad(value: string): boolean {
    return /\d/.test(value) && !value.toLowerCase().includes('bw');
  }

  private blockBucket(row: TrainingPlanRow): string {
    const block = row.block
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (this.isPlanCareBlock(row)) {
      return 'Prehab/tendon';
    }

    if (block.includes('principal')) {
      return 'Principal';
    }

    if (block.includes('core')) {
      return 'Core';
    }

    return 'Accesorio';
  }

  private blockBucketClass(label: string): string {
    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
  }
}
