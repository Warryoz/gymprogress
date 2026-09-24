import { BarbellVisual } from './barbell-visual';
import { BarbellModal } from './barbell-modal';
import { TrainingDictionary } from './training-dictionary';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { AppHeader } from './app-header';
import { ExerciseCard } from './exercise-card';
import { plannedSetCount } from './exercise-set-progress';
import { RoutineShareButton } from './routine-share-button';
import { RoutineShareData } from './routine-share-text.util';
import { WorkoutSessionBar } from './workout-session-bar';
import { WorkoutReportModal } from './workout-report-modal';
import { WorkoutReportData, buildWorkoutReport } from './workout-report';
import { TechnicalTooltip } from './technical-tooltip';
import {
  StrengthToolsHome,
  TrackingStrengthDestination,
} from './strength-tools-home';
import { CalculatorHeader } from './calculator-header';
import { CalculatorInstructions } from './calculator-instructions';
import {
  RirHistorySet,
  RirRpeCalculator,
  StoredOneRepMax,
} from './rir-rpe-calculator';
import {
  SecondaryStrengthTool,
  SecondaryStrengthToolId,
} from './secondary-strength-tool';
import type { QuickLastSet } from './quick-tools-drawer';
import { parseTrainingNotation } from './quick-strength-tools';
import { buildBlockTwoPlan } from './block-two-plan';
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
import {
  ParsedTrainingPlan,
  PlanDay,
  TrainingPlanRow,
  formatSuggestedLoad,
  parseTrainingPlanCsv,
} from './training-plan';
import {
  EffortScale,
  ExerciseSession,
  OneRepMaxFormula,
  PersonalRecord,
  PlateInventoryItem,
  PlateSelection,
  SessionComparison,
  WeightUnit,
  calculateEstimatedOneRepMax,
  calculateOneRepMaxRange,
  calculatePercentageLoads,
  calculatePlateCombination,
  calculateProgressionSuggestion,
  compareExerciseSessions,
  convertWeightUnit,
  detectPersonalRecords,
  normalizeEffortScale,
} from './strength-tools';

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

interface ChartGridLine {
  y: number;
  value: number;
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

interface TrainingLoad {
  percentage: number;
  exact: number;
  usable: number;
  load: number;
  use: string;
}

interface ComparisonSetRow {
  index: number;
  reference: string;
  current: string;
  change: string;
}

interface CurrentRecordCard {
  type: PersonalRecord['type'];
  label: string;
  value: string;
  sessionIndex: number;
}

interface StrengthPrescription {
  sets: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  label: string;
}

type StrengthTab = 'calculate' | 'compare' | 'records' | 'history';
type HistoryMetric = 'maxWeight' | 'oneRepMax' | 'reps' | 'volume';
type StrengthCalculatorPage =
  | 'home'
  | 'oneRm'
  | 'rirRpe'
  | 'plates'
  | SecondaryStrengthToolId;
type CalculatorDataSource = 'manual' | 'history';

interface StoredWorkoutSession {
  version: 1;
  block?: TrainingBlockId;
  week: number;
  day: string;
  completedRows: number[];
  completedSets?: Array<[number, number[]]>;
  startedAt: number | null;
  inProgress: boolean;
  completed: boolean;
  restTimerEndsAt: number | null;
  restTimerPausedSeconds: number;
  restTimerDuration: number;
}

const WORKOUT_SESSION_STORAGE_KEY = 'gym-progress-workout-session';
const ACTIVE_TRAINING_BLOCK_STORAGE_KEY = 'gym-progress-active-training-block';

export type TrainingBlockId = 'block1' | 'block2';

interface TrainingBlockOption {
  id: TrainingBlockId;
  label: string;
  title: string;
  description: string;
}

const DEFAULT_PLATE_INVENTORIES: Record<WeightUnit, PlateInventoryItem[]> = {
  kg: [
    { weight: 25, quantity: 0 },
    { weight: 20, quantity: 4 },
    { weight: 15, quantity: 0 },
    { weight: 10, quantity: 4 },
    { weight: 5, quantity: 4 },
    { weight: 2.5, quantity: 4 },
    { weight: 1.25, quantity: 4 },
  ],
  lb: [
    { weight: 45, quantity: 4 },
    { weight: 35, quantity: 2 },
    { weight: 25, quantity: 2 },
    { weight: 10, quantity: 4 },
    { weight: 5, quantity: 4 },
    { weight: 2.5, quantity: 4 },
  ],
};

export type ActiveView = 'plan' | 'routineSummary' | 'progress' | 'calculator' | 'dictionary';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    BarbellVisual,
    BarbellModal,
    AppHeader,
    ExerciseCard,
    RoutineShareButton,
    WorkoutSessionBar,
    WorkoutReportModal,
    TechnicalTooltip,
    TrainingDictionary,
    StrengthToolsHome,
    CalculatorHeader,
    CalculatorInstructions,
    RirRpeCalculator,
    SecondaryStrengthTool,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css', './plan-picker.css'],
})
export class App implements OnInit, OnDestroy {
  public readonly activeView = signal<ActiveView>('plan');
  public readonly csvText = signal('');
  public readonly trainingLog = signal<ParsedTrainingLog | null>(null);
  public readonly trainingPlans = signal<Partial<Record<TrainingBlockId, ParsedTrainingPlan>>>({});
  public readonly activeTrainingBlock = signal<TrainingBlockId>('block1');
  public readonly trainingPlan = computed(
    () => this.trainingPlans()[this.activeTrainingBlock()] ?? null,
  );
  public readonly trainingBlocks: readonly TrainingBlockOption[] = [
    {
      id: 'block1',
      label: 'Bloque 1',
      title: 'Hipertrofia y rehabilitación',
      description: 'Base de 8 semanas con tempo controlado y tolerancia tendinosa.',
    },
    {
      id: 'block2',
      label: 'Bloque 2',
      title: 'Transición hacia fuerza',
      description: '8 semanas de intensidad progresiva, deload y evaluación submáxima.',
    },
  ];
  public readonly selectedWorkout = signal('all');
  public readonly selectedExerciseKey = signal('');
  public readonly selectedPlanWeek = signal(1);
  public readonly selectedSummaryWeek = signal<number | 'all'>('all');
  public readonly selectedSummaryRoutine = signal('all');
  public readonly selectedPlanDay = signal('all');
  public readonly planPickerOpen = signal(true);
  public readonly routineChosen = signal(true);

  public choosePlanWeek(week: number): void {
    if (week !== this.selectedPlanWeek()) this.selectPlanWeek(week);
    this.routineChosen.set(false);
    this.planPickerOpen.set(false);
    this.planMode.set('overview');
    setTimeout(() => document.querySelector('#main-content')?.scrollIntoView({ block: 'start' }), 0);
  }

  public showPlanPicker(): void {
    this.planPickerOpen.set(true);
    this.planMode.set('overview');
    setTimeout(() => document.querySelector('#main-content')?.scrollIntoView({ block: 'start' }), 0);
  }

  public readonly planMode = signal<'overview' | 'workout'>('overview');
  public readonly weekOverviewOpen = signal(false);
  public readonly trainingInProgress = signal(false);
  public readonly trainingCompleted = signal(false);
  public readonly workoutReportOpen = signal(false);
  public readonly workoutCompletedAt = signal<number | null>(null);
  public readonly completedExerciseRows = signal<ReadonlySet<number>>(new Set<number>());
  public readonly completedSetsByRow = signal<ReadonlyMap<number, ReadonlySet<number>>>(
    new Map<number, ReadonlySet<number>>(),
  );
  public readonly workoutStartedAt = signal<number | null>(null);
  public readonly clockNow = signal(Date.now());
  public readonly restTimerEndsAt = signal<number | null>(null);
  public readonly restTimerPausedSeconds = signal(0);
  public readonly restTimerDuration = signal(0);
  public readonly restTimerFinished = signal(false);
  public readonly showMoreStats = signal(false);
  public readonly advancedTableOpen = signal(false);
  public readonly importPanelOpen = signal(false);
  public readonly exerciseSearch = signal('');
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly planError = signal<string | null>(null);
  public readonly rmWeight = signal(0);
  public readonly rmReps = signal(0);
  public readonly calculatorUnit = signal<WeightUnit>('kg');
  public readonly strengthTab = signal<StrengthTab>('calculate');
  public readonly strengthCalculatorPage = signal<StrengthCalculatorPage>('home');
  public readonly calculatorDataSource = signal<CalculatorDataSource>('manual');
  public readonly calculatorAttempted = signal(false);
  public readonly oneRmCalculated = signal(false);
  public readonly compareCalculatorHistory = signal(false);
  public readonly platesAttempted = signal(false);
  public readonly platesCalculated = signal(false);
  public readonly plateResultMessage = signal<string | null>(null);
  public readonly rmFormula = signal<OneRepMaxFormula>('epley');
  public readonly effortScale = signal<EffortScale>('rir');
  public readonly effortValue = signal<number | null>(null);
  public readonly calculatorOptionsOpen = signal(false);
  public readonly plateConfigurationOpen = signal(false);
  public readonly rememberStrengthSettings = signal(false);
  public readonly roundingIncrement = signal(2.5);
  public readonly selectedPercentage = signal<number | null>(null);
  public readonly appliedLoadMessage = signal<string | null>(null);
  public readonly selectedStrengthExerciseKey = signal('');
  public readonly historyMetric = signal<HistoryMetric>('maxWeight');
  public readonly recordHistoryOpen = signal(false);
  public readonly comparisonCurrentSessionId = signal('');
  public readonly comparisonReferenceSessionId = signal('');
  public readonly quickObjective = signal<string | null>(null);
  public readonly quickObjectiveMessage = signal<string | null>(null);
  public readonly targetBarWeight = signal(0);
  public readonly emptyBarWeight = signal(20);
  public readonly barbellExercise = signal<TrainingPlanRow | null>(null);
  public readonly collarWeight = signal(0);
  public readonly plateInventories = signal<Record<WeightUnit, PlateInventoryItem[]>>({
    kg: DEFAULT_PLATE_INVENTORIES.kg.map((plate) => ({ ...plate })),
    lb: DEFAULT_PLATE_INVENTORIES.lb.map((plate) => ({ ...plate })),
  });
  public readonly targetMinReps = signal(8);
  public readonly targetMaxReps = signal(12);
  public readonly targetRir = signal(2);

  public readonly estimatedOneRepMax = computed(() =>
    calculateEstimatedOneRepMax(this.rmWeight(), this.rmReps(), this.rmFormula()),
  );

  public readonly normalizedRir = computed(() =>
    normalizeEffortScale(this.effortValue(), this.effortScale()),
  );

  public readonly oneRepMaxResult = computed(() =>
    calculateOneRepMaxRange(
      this.rmWeight(),
      this.rmReps(),
      this.normalizedRir(),
      this.rmFormula(),
    ),
  );

  public readonly calculatorValidation = computed(() => {
    if (!Number.isFinite(this.rmWeight()) || this.rmWeight() <= 0) {
      return 'Introduce un peso mayor que cero.';
    }
    if (!Number.isFinite(this.rmReps()) || this.rmReps() < 1 || this.rmReps() > 20) {
      return 'Las repeticiones deben estar entre 1 y 20.';
    }
    if (this.effortValue() !== null && this.normalizedRir() === null) {
      return this.effortScale() === 'rir'
        ? 'El RIR debe estar entre 0 y 5.'
        : 'El RPE debe estar entre 5 y 10.';
    }
    return null;
  });

  public readonly trainingLoads = computed<TrainingLoad[]>(() => {
    const uses = new Map([
      [95, '1–2 reps'],
      [90, '3–4 reps'],
      [85, '5–6 reps'],
      [80, '7–8 reps'],
      [75, '9–10 reps'],
      [70, '10–12 reps'],
      [65, '12–15 reps'],
      [60, 'Técnica'],
    ]);

    return calculatePercentageLoads(
      this.estimatedOneRepMax(),
      [...uses.keys()],
      this.roundingIncrement(),
    ).map((load) => ({
      ...load,
      load: load.usable,
      use: uses.get(load.percentage) ?? '',
    }));
  });

  public readonly plateConfiguration = computed(() => ({
    unit: this.calculatorUnit(),
    barWeight: this.emptyBarWeight(),
    collarWeight: 0,
    unlimitedPlates: true,
    plates: this.plateInventories()[this.calculatorUnit()],
  }));

  public readonly plateCombination = computed(() =>
    calculatePlateCombination(this.targetBarWeight(), this.plateConfiguration()),
  );

  public readonly plateValidation = computed(() => {
    if (!Number.isFinite(this.targetBarWeight()) || this.targetBarWeight() <= 0) {
      return 'Introduce un peso objetivo mayor que cero.';
    }
    if (!Number.isFinite(this.emptyBarWeight()) || this.emptyBarWeight() < 0) {
      return 'El peso de la barra no puede ser negativo.';
    }
    if (!Number.isFinite(this.collarWeight()) || this.collarWeight() < 0) {
      return 'El peso de los seguros no puede ser negativo.';
    }
    if (
      this.targetBarWeight() <
      Math.max(this.emptyBarWeight(), 0) + Math.max(this.collarWeight(), 0)
    ) {
      return 'El peso objetivo es menor que la barra y los seguros.';
    }
    return null;
  });

  public readonly plateLoad = computed(() => {
    const selection = this.plateCombination().exact ?? this.plateCombination().lower;
    return {
      plates: selection.perSide,
      loaded: selection.total,
      difference: Math.max(this.targetBarWeight() - selection.total, 0),
    };
  });

  private clockInterval: ReturnType<typeof setInterval> | null = null;

  public constructor() {
    this.activeTrainingBlock.set(this.readStoredTrainingBlock() ?? 'block1');
    this.loadStrengthSettings();
    this.applyTheme();
  }

  public readonly planWeeks = computed(() => this.trainingPlan()?.weeks ?? []);

  public readonly activeTrainingBlockDetails = computed(
    () =>
      this.trainingBlocks.find((block) => block.id === this.activeTrainingBlock()) ??
      this.trainingBlocks[0],
  );

  public readonly currentPlanWeek = computed(() => {
    const weeks = this.planWeeks();
    return weeks.find((week) => week.week === this.selectedPlanWeek()) ?? weeks[0] ?? null;
  });

  public readonly planDayOptions = computed<PlanDay[]>(() => this.currentPlanWeek()?.days ?? []);

  public readonly currentWorkoutDay = computed<PlanDay | null>(() => {
    const days = this.planDayOptions();
    return days.find((day) => day.name === this.selectedPlanDay()) ?? days[0] ?? null;
  });

  public readonly routineShareData = computed<RoutineShareData | null>(() => {
    const week = this.currentPlanWeek();
    const day = this.currentWorkoutDay();

    if (!week || !day) {
      return null;
    }

    return {
      title: day.name,
      week: week.week,
      totalWeeks: this.planWeeks().length,
      phase: day.phase || week.phase,
      focus: day.focus,
      estimatedDuration: this.estimatedWorkoutDuration(day),
      rows: day.rows,
      generatedAt: new Date(),
    };
  });

  public readonly workoutReport = computed<WorkoutReportData | null>(() => {
    const week = this.currentPlanWeek();
    const day = this.currentWorkoutDay();
    const completedAt = this.workoutCompletedAt();
    const startedAt = this.workoutStartedAt();
    if (!week || !day || completedAt === null || startedAt === null) return null;

    return buildWorkoutReport({
      title: day.name,
      block: this.activeTrainingBlockDetails().label,
      week: week.week,
      phase: day.phase || week.phase,
      completedAt: new Date(completedAt),
      durationSeconds: Math.max(0, Math.floor((completedAt - startedAt) / 1000)),
      rows: day.rows,
      completedRows: this.completedExerciseRows(),
      completedSetsByRow: this.completedSetsByRow(),
    });
  });

  public readonly currentPlanWeekIndex = computed(() =>
    this.planWeeks().findIndex((week) => week.week === this.selectedPlanWeek()),
  );

  public readonly currentWorkoutProgress = computed(() => {
    const rows = this.currentWorkoutDay()?.rows ?? [];
    const completed = rows.filter((row) => this.completedExerciseRows().has(row.sourceRow)).length;

    return {
      completed,
      total: rows.length,
      percentage: rows.length ? Math.round((completed / rows.length) * 100) : 0,
      allCompleted: rows.length > 0 && completed === rows.length,
    };
  });

  public readonly workoutElapsedSeconds = computed(() => {
    const startedAt = this.workoutStartedAt();
    return startedAt ? Math.max(0, Math.floor((this.clockNow() - startedAt) / 1000)) : 0;
  });

  public readonly nextWorkoutExercise = computed(
    () =>
      this.currentWorkoutDay()?.rows.find(
        (row) => !this.completedExerciseRows().has(row.sourceRow),
      )?.exercise ?? '',
  );

  public readonly restTimerRemaining = computed(() => {
    const endsAt = this.restTimerEndsAt();
    if (endsAt === null) return this.restTimerPausedSeconds();
    return Math.max(0, Math.ceil((endsAt - this.clockNow()) / 1000));
  });

  public readonly restTimerPaused = computed(
    () => this.restTimerEndsAt() === null && this.restTimerPausedSeconds() > 0,
  );

  public readonly workoutActionLabel = computed(() => {
    if (this.trainingInProgress() && this.currentWorkoutProgress().allCompleted) {
      return 'Finalizar entrenamiento';
    }

    if (this.trainingInProgress()) {
      return 'Ir al siguiente ejercicio';
    }

    if (this.trainingCompleted()) {
      return 'Repetir entrenamiento';
    }

    return 'Empezar entrenamiento';
  });

  public readonly mobileTrainLabel = computed(() => {
    if (this.trainingInProgress() && this.currentWorkoutProgress().allCompleted) {
      return 'Finalizar';
    }
    if (this.trainingInProgress()) {
      return this.planMode() === 'workout' ? 'Entreno' : 'Continuar';
    }
    if (this.trainingCompleted()) {
      return 'Repetir';
    }
    return 'Entrenar';
  });

  public readonly strengthCalculatorTitle = computed(
    () =>
      ({
        home: 'Todas las herramientas',
        oneRm: 'Estimar 1RM',
        rirRpe: 'RIR y RPE',
        plates: 'Montar la barra',
        percentages: 'Cargas por porcentaje',
        equivalences: 'Equivalencia de repeticiones',
        notation: 'Notación de entrenamiento',
        warmup: 'Calentamiento',
        timer: 'Temporizador',
        volume: 'Volumen de entrenamiento',
      })[this.strengthCalculatorPage()],
  );

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
    const search = this.exerciseSearch().trim().toLocaleLowerCase();

    if (!plan) {
      return [];
    }

    return plan.rows
      .filter(
        (row) =>
          (selectedWeek === 'all' || row.week === selectedWeek) &&
          (selectedRoutine === 'all' || row.day === selectedRoutine) &&
          (!search || row.exercise.toLocaleLowerCase().includes(search)),
      )
      .map((row) => ({
        row,
        sets: this.planSetCount(row.sets),
        loadLabel: formatSuggestedLoad(row.suggestedLoad),
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
    const careExercises = rows.filter((item) => this.isPlanCareBlock(item.row)).length;
    const weightedExercises = rows.filter((item) =>
      this.hasWeightedLoad(item.row.suggestedLoad),
    ).length;
    const days = new Set(rows.map((item) => `${item.row.week}-${item.row.day}`)).size;

    return [
      {
        label: 'Periodo',
        value:
          this.selectedSummaryWeek() === 'all'
            ? `${plan.weeks.length} semanas`
            : `Semana ${this.selectedSummaryWeek()}`,
        detail: `${this.formatInteger(days)} sesiones planificadas`,
      },
      {
        label: 'Series',
        value: this.formatInteger(sets),
        detail: `${this.formatInteger(Math.round(sets / Math.max(days, 1)))} por sesión`,
      },
      {
        label: 'Ejercicios',
        value: this.formatInteger(rows.length),
        detail: `${this.formatInteger(weightedExercises)} con carga sugerida`,
      },
      {
        label: 'Prehab',
        value: this.formatInteger(careExercises),
        detail: 'activación, tendón y recuperación',
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
    const selected = movements.find((movement) => movement.key === this.selectedExerciseKey());
    if (selected) return selected;
    const log = this.trainingLog();
    const allMovements = log
      ? buildTrainingProgress('Todos', log.entries, log.sessions).topMovements
      : [];

    return (
      allMovements.find((movement) => movement.key === this.selectedExerciseKey()) ??
      movements[0] ??
      null
    );
  });

  public readonly strengthSessions = computed<ExerciseSession[]>(() =>
    (this.trainingLog()?.entries ?? []).map((entry) => ({
      id: `${entry.exerciseKey}-${entry.sessionIndex}-${entry.sourceRow}`,
      exerciseKey: entry.exerciseKey,
      exerciseName: entry.exercise,
      sessionIndex: entry.sessionIndex,
      sets: entry.sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
        unit: set.unit,
      })),
    })),
  );

  public readonly strengthExerciseOptions = computed(() => {
    const options = new Map<string, string>();
    this.strengthSessions().forEach((session) =>
      options.set(session.exerciseKey, session.exerciseName),
    );
    return [...options.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  public readonly selectedStrengthExerciseName = computed(
    () =>
      this.strengthExerciseOptions().find(
        (exercise) => exercise.key === this.selectedStrengthExerciseKey(),
      )?.name ?? '',
  );

  public readonly selectedStrengthSessions = computed(() =>
    this.strengthSessions()
      .filter((session) => session.exerciseKey === this.selectedStrengthExerciseKey())
      .sort((a, b) => a.sessionIndex - b.sessionIndex),
  );

  public readonly quickLastSet = computed<QuickLastSet | null>(() => {
    const latest = this.selectedStrengthSessions().at(-1);
    const set = latest?.sets.at(-1);
    return set
      ? {
          weight: set.weight,
          reps: set.reps,
          unit: set.unit,
          rir: set.rir ?? null,
        }
      : null;
  });

  public readonly rirHistorySet = computed<RirHistorySet | null>(() => {
    const latest = this.selectedStrengthSessions().at(-1);
    const set = latest?.sets.at(-1);
    return latest && set
      ? {
          exercise: latest.exerciseName,
          sessionIndex: latest.sessionIndex,
          weight: set.weight,
          reps: set.reps,
          unit: set.unit,
          rir: set.rir ?? null,
        }
      : null;
  });

  public readonly storedOneRepMax = computed<StoredOneRepMax | null>(() => {
    const estimateSession = (session: ExerciseSession): number =>
      Math.max(
        ...session.sets.map((set) =>
          calculateEstimatedOneRepMax(
            convertWeightUnit(set.weight, set.unit, this.calculatorUnit()),
            set.reps,
          ),
        ),
        0,
      );
    const best = this.selectedStrengthSessions().reduce<ExerciseSession | null>(
      (current, session) =>
        !current || estimateSession(session) > estimateSession(current)
          ? session
          : current,
      null,
    );
    return best
      ? {
          exercise: best.exerciseName,
          sessionIndex: best.sessionIndex,
          value: estimateSession(best),
          unit: this.calculatorUnit(),
        }
      : null;
  });

  public readonly comparisonCurrentSession = computed(() => {
    const sessions = this.selectedStrengthSessions();
    return (
      sessions.find((session) => session.id === this.comparisonCurrentSessionId()) ??
      sessions.at(-1) ??
      null
    );
  });

  public readonly comparisonReferenceSession = computed(() => {
    const sessions = this.selectedStrengthSessions();
    const current = this.comparisonCurrentSession();
    return (
      sessions.find(
        (session) =>
          session.id === this.comparisonReferenceSessionId() && session.id !== current?.id,
      ) ??
      [...sessions].reverse().find((session) => session.id !== current?.id) ??
      null
    );
  });

  public readonly sessionComparison = computed(() => {
    const current = this.comparisonCurrentSession();
    const reference = this.comparisonReferenceSession();
    return current && reference ? compareExerciseSessions(current, reference) : null;
  });

  public readonly comparisonSetRows = computed<ComparisonSetRow[]>(() => {
    const comparison = this.sessionComparison();
    if (!comparison) {
      return [];
    }
    const length = Math.max(comparison.current.sets.length, comparison.reference.sets.length);
    return Array.from({ length }, (_, index) => {
      const current = comparison.current.sets[index];
      const reference = comparison.reference.sets[index];
      const delta =
        current && reference
          ? current.weight === reference.weight
            ? `${current.reps - reference.reps >= 0 ? '+' : ''}${current.reps - reference.reps} reps`
            : `${current.weight - reference.weight >= 0 ? '+' : ''}${this.formatNumber(current.weight - reference.weight)} ${current.unit}`
          : current
            ? 'Serie añadida'
            : 'Serie no realizada';
      return {
        index: index + 1,
        reference: reference ? this.formatStrengthSet(reference) : '—',
        current: current ? this.formatStrengthSet(current) : '—',
        change: delta,
      };
    });
  });

  public readonly personalRecords = computed<PersonalRecord[]>(() =>
    detectPersonalRecords(this.strengthSessions()).reverse(),
  );

  public readonly selectedPersonalRecords = computed(() =>
    this.personalRecords().filter(
      (record) =>
        !this.selectedStrengthExerciseKey() ||
        record.exerciseKey === this.selectedStrengthExerciseKey(),
    ),
  );

  public readonly currentPersonalRecords = computed<CurrentRecordCard[]>(() => {
    const sessions = this.selectedStrengthSessions();
    if (!sessions.length) return [];
    const sets = sessions.flatMap((session) =>
      session.sets.map((set) => ({
        ...set,
        sessionIndex: session.sessionIndex,
        weightKg: convertWeightUnit(set.weight, set.unit, 'kg'),
      })),
    );
    const weightRecord = [...sets].sort((a, b) => b.weightKg - a.weightKg)[0];
    const oneRepMaxRecord = [...sets].sort(
      (a, b) =>
        calculateEstimatedOneRepMax(b.weightKg, b.reps) -
        calculateEstimatedOneRepMax(a.weightKg, a.reps),
    )[0];
    const latestRepRecord = this.selectedPersonalRecords().find(
      (record) => record.type === 'reps',
    );
    const fallbackRepRecord = [...sets].sort(
      (a, b) => b.reps - a.reps || b.weightKg - a.weightKg,
    )[0];
    const volumeRecord = sessions
      .map((session) => ({
        sessionIndex: session.sessionIndex,
        value: session.sets.reduce(
          (sum, set) => sum + convertWeightUnit(set.weight, set.unit, 'kg') * set.reps,
          0,
        ),
      }))
      .sort((a, b) => b.value - a.value)[0];

    const records: Array<CurrentRecordCard | null> = [
      weightRecord
        ? {
            type: 'weight',
            label: 'Peso máximo',
            value: this.formatKg(weightRecord.weightKg),
            sessionIndex: weightRecord.sessionIndex,
          }
        : null,
      latestRepRecord || fallbackRepRecord
        ? {
            type: 'reps',
            label: 'Repeticiones',
            value: latestRepRecord
              ? this.recordValue(latestRepRecord)
              : `${this.formatKg(fallbackRepRecord.weightKg)} × ${fallbackRepRecord.reps}`,
            sessionIndex: latestRepRecord?.sessionIndex ?? fallbackRepRecord.sessionIndex,
          }
        : null,
      oneRepMaxRecord
        ? {
            type: 'oneRepMax',
            label: '1RM estimado',
            value: this.formatKg(
              calculateEstimatedOneRepMax(oneRepMaxRecord.weightKg, oneRepMaxRecord.reps),
            ),
            sessionIndex: oneRepMaxRecord.sessionIndex,
          }
        : null,
      volumeRecord
        ? {
            type: 'volume',
            label: 'Volumen',
            value: this.formatKg(volumeRecord.value),
            sessionIndex: volumeRecord.sessionIndex,
          }
        : null,
    ];
    return records.filter((record): record is CurrentRecordCard => record !== null);
  });

  public readonly historicalPersonalRecords = computed(() => {
    const currentIds = new Set(
      (['weight', 'reps', 'oneRepMax', 'volume'] as const)
        .map((type) => this.selectedPersonalRecords().find((record) => record.type === type)?.id)
        .filter((id): id is string => Boolean(id)),
    );
    return this.selectedPersonalRecords().filter((record) => !currentIds.has(record.id));
  });

  public readonly selectedStrengthPrescription = computed<StrengthPrescription | null>(() => {
    const saved = this.quickObjective();
    if (saved) {
      const parsed = parseTrainingNotation(saved);
      const savedReps = Number.parseFloat(parsed.repsOrTime);
      const savedRir =
        parsed.effortScale === 'rpe' && parsed.effort !== null
          ? 10 - parsed.effort
          : parsed.effort;
      if (
        parsed.valid &&
        parsed.sets &&
        Number.isFinite(savedReps) &&
        savedRir !== null &&
        Number.isFinite(savedRir)
      ) {
        return {
          sets: parsed.sets,
          minReps: savedReps,
          maxReps: savedReps,
          targetRir: savedRir,
          label: `${parsed.sets} × ${savedReps} @ RIR ${savedRir}`,
        };
      }
    }
    const exerciseName = this.strengthExerciseOptions().find(
      (exercise) => exercise.key === this.selectedStrengthExerciseKey(),
    )?.name;
    if (!exerciseName) return null;
    const row = this.trainingPlan()?.rows.find(
      (item) => this.exerciseIdentity(item.exercise) === this.exerciseIdentity(exerciseName),
    );
    if (!row) return null;
    const reps = [...row.repsOrTime.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) =>
      Number(match[0].replace(',', '.')),
    );
    const rir = row.rir.match(/(?:RIR|RPE)\s*(\d+(?:[.,]\d+)?)/i);
    const targetRir = rir ? (row.rir.toUpperCase().includes('RPE') ? 10 - Number(rir[1]) : Number(rir[1])) : NaN;
    const sets = this.planSetCount(row.sets);
    if (!sets || !reps.length || !Number.isFinite(targetRir)) return null;
    const minReps = Math.min(...reps);
    const maxReps = Math.max(...reps);
    return {
      sets,
      minReps,
      maxReps,
      targetRir,
      label: `${sets} × ${minReps}${maxReps !== minReps ? `–${maxReps}` : ''} @ RIR ${targetRir}`,
    };
  });

  public readonly progressionSuggestion = computed(() => {
    const prescription = this.selectedStrengthPrescription();
    if (!prescription || !this.selectedStrengthSessions().length) return null;
    return calculateProgressionSuggestion({
      sessions: this.selectedStrengthSessions(),
      targetSets: prescription.sets,
      targetMinReps: prescription.minReps,
      targetMaxReps: prescription.maxReps,
      targetRir: prescription.targetRir,
      increment: this.roundingIncrement(),
    });
  });

  public readonly progressionConfidenceExplanation = computed(() => {
    const suggestion = this.progressionSuggestion();
    if (!suggestion) return 'No hay suficientes datos para sugerir una próxima carga.';
    if (suggestion.confidence === 'baja') {
      return 'Faltan registros de RIR en las sesiones recientes.';
    }
    if (suggestion.confidence === 'media') {
      return 'Solo existen dos sesiones comparables con datos de esfuerzo.';
    }
    return 'Hay tres sesiones recientes consistentes con datos de esfuerzo.';
  });

  public readonly latestStrengthResult = computed(() => {
    const latest = this.selectedStrengthSessions().at(-1);
    if (!latest?.sets.length) return 'Sin resultado reciente';
    const reps = latest.sets.map((set) => set.reps).join(', ');
    const knownRir = latest.sets
      .map((set) => set.rir)
      .filter((rir): rir is number => rir != null);
    return `${reps} repeticiones @ ${
      knownRir.length
        ? `RIR ${this.formatNumber(
            knownRir.reduce((sum, rir) => sum + rir, 0) / knownRir.length,
          )}`
        : 'RIR desconocido'
    }`;
  });

  public readonly calculatorHistoryContext = computed(() => {
    const key = this.selectedStrengthExerciseKey();
    const movement = this.selectedProgress()?.topMovements.find((item) => item.key === key);
    if (!movement?.bestOneRepMaxKg) {
      return null;
    }
    const bestEntry = [...movement.entries].sort(
      (a, b) => b.estimatedOneRepMaxKg - a.estimatedOneRepMaxKg,
    )[0];
    const estimateKg = convertWeightUnit(
      this.estimatedOneRepMax(),
      this.calculatorUnit(),
      'kg',
    );
    return {
      exercise: movement.name,
      best: movement.bestOneRepMaxKg,
      bestSession: bestEntry?.sessionIndex ?? null,
      current: estimateKg,
      difference: Math.round((estimateKg - movement.bestOneRepMaxKg) * 10) / 10,
    };
  });

  public readonly exerciseTrendDots = computed<TrendDot[]>(() => {
    const entries = this.selectedExercise()?.entries ?? [];
    const metric = this.historyMetric();
    const metricEntries = entries
      .map((entry) => ({
        label: `#${entry.sessionIndex}`,
        value:
          metric === 'maxWeight'
            ? entry.maxWeightKg
            : metric === 'oneRepMax'
              ? entry.estimatedOneRepMaxKg
              : metric === 'reps'
                ? entry.totalReps
                : entry.volumeKg,
      }))
      .filter((entry) => entry.value > 0);

    if (!metricEntries.length) {
      return [];
    }

    const max = Math.max(...metricEntries.map((entry) => entry.value));
    const min = Math.min(...metricEntries.map((entry) => entry.value));
    const spread = Math.max(max - min, 1);
    const left = 64;
    const right = 574;
    const top = 20;
    const bottom = 174;

    return metricEntries.map((entry, index) => {
      const x =
        metricEntries.length === 1
          ? (left + right) / 2
          : left + (index / (metricEntries.length - 1)) * (right - left);
      const y = bottom - ((entry.value - min) / spread) * (bottom - top);

      return {
        x,
        y,
        value: entry.value,
        label: entry.label,
      };
    });
  });

  public readonly historyChartGrid = computed<ChartGridLine[]>(() => {
    const values = this.exerciseTrendDots().map((dot) => dot.value);
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = Math.max(max - min, 1);
    return Array.from({ length: 4 }, (_, index) => {
      const ratio = index / 3;
      return {
        y: 174 - ratio * 154,
        value: min + ratio * spread,
      };
    }).reverse();
  });

  public readonly exerciseTrendLine = computed(() =>
    this.exerciseTrendDots()
      .map((dot) => `${dot.x},${dot.y}`)
      .join(' '),
  );

  public readonly historyMetricLabel = computed(
    () =>
      ({
        maxWeight: 'Carga máxima',
        oneRepMax: '1RM estimado',
        reps: 'Repeticiones',
        volume: 'Volumen',
      })[this.historyMetric()],
  );

  public async ngOnInit(): Promise<void> {
    this.clockInterval = setInterval(() => {
      this.clockNow.set(Date.now());
      if (
        this.restTimerEndsAt() !== null &&
        this.restTimerRemaining() <= 0 &&
        !this.restTimerFinished()
      ) {
        this.restTimerEndsAt.set(null);
        this.restTimerPausedSeconds.set(0);
        this.restTimerFinished.set(true);
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate([120, 80, 120]);
        }
        this.persistWorkoutSession();
      }
    }, 1000);
    await Promise.all([this.loadSampleCsv(), this.loadTrainingPlan()]);
  }

  public ngOnDestroy(): void {
    if (this.clockInterval !== null) {
      clearInterval(this.clockInterval);
    }
  }

  public setActiveView(view: ActiveView): void {
    this.activeView.set(view);
    if (view === 'plan') {
      if (this.trainingCompleted() && this.trainingPlan()) this.restoreBlockProgress(this.trainingPlan()!);
      this.planMode.set('overview');
      setTimeout(
        () =>
          document.querySelector('#main-content')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          }),
        0,
      );
    } else if (view === 'dictionary') {
      setTimeout(() => document.querySelector('#main-content')?.scrollIntoView({ block: 'start' }), 0);
    } else if (view === 'calculator') {
      this.scrollStrengthIntoView();
    }
  }

  public startTraining(): void {
    this.planPickerOpen.set(false);
    this.activeView.set('plan');
    this.planMode.set('workout');
    const day = this.currentWorkoutDay();

    if (!day) {
      return;
    }

    if (this.trainingInProgress() && this.currentWorkoutProgress().allCompleted) {
      const completedAt = Date.now();
      this.clockNow.set(completedAt);
      this.workoutCompletedAt.set(completedAt);
      this.trainingInProgress.set(false);
      this.trainingCompleted.set(true);
      this.workoutReportOpen.set(true);
      this.saveBlockCompletion();
      this.planMode.set('overview');
      this.dismissRestTimer();
      this.persistWorkoutSession();
      document.querySelector('#current-workout')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!this.trainingInProgress()) {
      const rows = new Set(day.rows.map((row) => row.sourceRow));
      const remaining = new Set(
        [...this.completedExerciseRows()].filter((sourceRow) => !rows.has(sourceRow)),
      );
      this.completedExerciseRows.set(remaining);
      this.completedSetsByRow.set(
        new Map(
          [...this.completedSetsByRow()].filter(([sourceRow]) => !rows.has(sourceRow)),
        ),
      );
      this.trainingCompleted.set(false);
      this.workoutCompletedAt.set(null);
      this.workoutReportOpen.set(false);
      this.workoutStartedAt.set(Date.now());
      this.dismissRestTimer();
    }

    this.selectedPlanDay.set(day.name);
    this.trainingInProgress.set(true);
    this.persistWorkoutSession();
    setTimeout(() => this.scrollToNextExercise(), 0);
  }

  public leaveWorkoutFocus(): void {
    this.planMode.set('overview');
    this.persistWorkoutSession();
    document.querySelector('#current-workout')?.scrollIntoView({ behavior: 'smooth' });
  }

  public completedSetsFor(sourceRow: number): ReadonlySet<number> {
    return this.completedSetsByRow().get(sourceRow) ?? new Set<number>();
  }

  public setSeriesCompleted(sourceRow: number, setNumber: number, completed: boolean): void {
    const row = this.currentWorkoutDay()?.rows.find((item) => item.sourceRow === sourceRow);
    const totalSets = row ? plannedSetCount(row.sets) : 0;
    if (!row || setNumber < 1 || setNumber > totalSets) return;

    const completedSets = new Set(this.completedSetsFor(sourceRow));
    if (completed) completedSets.add(setNumber);
    else completedSets.delete(setNumber);

    const nextByRow = new Map(this.completedSetsByRow());
    if (completedSets.size) nextByRow.set(sourceRow, completedSets);
    else nextByRow.delete(sourceRow);
    this.completedSetsByRow.set(nextByRow);

    const exerciseCompleted = completedSets.size === totalSets;
    if (exerciseCompleted !== this.completedExerciseRows().has(sourceRow)) {
      this.setExerciseCompleted(sourceRow, exerciseCompleted, false);
    } else {
      this.persistWorkoutSession();
    }
  }

  public setExerciseCompleted(
    sourceRow: number,
    completed: boolean,
    synchronizeSets = true,
  ): void {
    const next = new Set(this.completedExerciseRows());

    if (completed) {
      next.add(sourceRow);
    } else {
      next.delete(sourceRow);
    }

    this.completedExerciseRows.set(next);

    if (synchronizeSets) {
      const row = this.currentWorkoutDay()?.rows.find((item) => item.sourceRow === sourceRow);
      const totalSets = row ? plannedSetCount(row.sets) : 0;
      const nextByRow = new Map(this.completedSetsByRow());
      if (completed && totalSets > 0) {
        nextByRow.set(
          sourceRow,
          new Set(Array.from({ length: totalSets }, (_, index) => index + 1)),
        );
      } else {
        nextByRow.delete(sourceRow);
      }
      this.completedSetsByRow.set(nextByRow);
    }

    if (completed) {
      const row = this.currentWorkoutDay()?.rows.find((item) => item.sourceRow === sourceRow);
      if (!this.currentWorkoutProgress().allCompleted) {
        this.startRestTimer(row?.rest ?? '');
      } else {
        this.dismissRestTimer();
      }
      setTimeout(() => this.scrollToNextExercise(), 180);
    } else {
      this.dismissRestTimer();
    }

    this.persistWorkoutSession();
  }

  public toggleRestTimer(): void {
    const endsAt = this.restTimerEndsAt();
    if (endsAt !== null) {
      this.restTimerPausedSeconds.set(
        Math.max(1, Math.ceil((endsAt - Date.now()) / 1000)),
      );
      this.restTimerEndsAt.set(null);
    } else if (this.restTimerPausedSeconds() > 0) {
      this.restTimerEndsAt.set(Date.now() + this.restTimerPausedSeconds() * 1000);
      this.restTimerPausedSeconds.set(0);
    }
    this.clockNow.set(Date.now());
    this.persistWorkoutSession();
  }

  public addRestTime(seconds = 30): void {
    if (this.restTimerFinished()) {
      this.restTimerFinished.set(false);
      this.restTimerDuration.set(seconds);
      this.restTimerEndsAt.set(Date.now() + seconds * 1000);
    } else if (this.restTimerEndsAt() !== null) {
      this.restTimerEndsAt.update((endsAt) => (endsAt ?? Date.now()) + seconds * 1000);
      this.restTimerDuration.update((duration) => duration + seconds);
    } else if (this.restTimerPausedSeconds() > 0) {
      this.restTimerPausedSeconds.update((remaining) => remaining + seconds);
      this.restTimerDuration.update((duration) => duration + seconds);
    }
    this.clockNow.set(Date.now());
    this.persistWorkoutSession();
  }

  public dismissRestTimer(): void {
    this.restTimerEndsAt.set(null);
    this.restTimerPausedSeconds.set(0);
    this.restTimerDuration.set(0);
    this.restTimerFinished.set(false);
    this.persistWorkoutSession();
  }

  public scrollToNextExercise(): void {
    const next = this.currentWorkoutDay()?.rows.find(
      (row) => !this.completedExerciseRows().has(row.sourceRow),
    );
    const target = next ? document.querySelector(`#exercise-${next.sourceRow}`) : null;
    (target ?? document.querySelector('#current-workout'))?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  public selectAdjacentWeek(direction: -1 | 1): void {
    const weeks = this.planWeeks();
    const next = weeks[this.currentPlanWeekIndex() + direction];

    if (next) {
      this.selectPlanWeek(next.week);
    }
  }

  public toggleWeekOverview(): void {
    this.weekOverviewOpen.update((open) => !open);
  }

  @HostListener('document:keydown.escape')
  public closeOverlays(): void {
    this.weekOverviewOpen.set(false);
    this.calculatorOptionsOpen.set(false);
    this.plateConfigurationOpen.set(false);
  }

  public estimatedWorkoutDuration(day: PlanDay): string {
    const lower = Math.max(35, Math.round((day.sets * 2.5) / 5) * 5);
    return `${lower}–${lower + 15} min`;
  }

  public dayStatus(day: PlanDay): string {
    if (day.name === this.selectedPlanDay() && this.trainingInProgress()) return 'En curso';
    if (this.finishedRoutines().some(item => item?.week === this.selectedPlanWeek() && item?.day === day.name)) return 'Completada';
    if (day.name === this.selectedPlanDay()) {
      return this.trainingInProgress() ? 'En curso' : 'Actual';
    }

    return 'Pendiente';
  }

  public updateRmWeight(event: Event): void {
    this.rmWeight.set(this.numberInput(event, 0));
    this.calculatorDataSource.set('manual');
    this.oneRmCalculated.set(false);
    this.compareCalculatorHistory.set(false);
  }

  public updateRmReps(event: Event): void {
    this.rmReps.set(Math.round(this.numberInput(event, 0)));
    this.calculatorDataSource.set('manual');
    this.oneRmCalculated.set(false);
    this.compareCalculatorHistory.set(false);
  }

  public setStrengthTab(tab: StrengthTab): void {
    this.strengthTab.set(tab);
    if (tab === 'calculate') {
      this.strengthCalculatorPage.set('home');
    }
    this.scrollStrengthIntoView();
  }

  public openStrengthCalculator(
    page: StrengthCalculatorPage | TrackingStrengthDestination,
  ): void {
    if (page === 'progression' || page === 'compareSessions') {
      this.strengthTab.set('compare');
      this.scrollStrengthIntoView();
      return;
    }
    this.strengthCalculatorPage.set(page);
    this.appliedLoadMessage.set(null);
    if (page === 'oneRm') {
      this.calculatorAttempted.set(false);
      this.oneRmCalculated.set(false);
    }
    if (page === 'plates') {
      this.platesAttempted.set(false);
      this.platesCalculated.set(false);
    }
    this.scrollStrengthIntoView('#strength-tool-context');
  }

  public calculateOneRm(): void {
    this.calculatorAttempted.set(true);
    this.oneRmCalculated.set(this.calculatorValidation() === null);
  }

  public useLatestHistorySet(): void {
    const latest = this.quickLastSet();
    if (!latest) return;
    if (latest.unit !== this.calculatorUnit()) {
      this.updateCalculatorUnit(latest.unit);
    }
    this.rmWeight.set(latest.weight);
    this.rmReps.set(latest.reps);
    this.effortScale.set('rir');
    this.effortValue.set(latest.rir ?? null);
    this.calculatorDataSource.set('history');
    this.calculatorAttempted.set(false);
    this.oneRmCalculated.set(false);
    this.compareCalculatorHistory.set(false);
  }

  public returnToManualOneRm(): void {
    this.calculatorDataSource.set('manual');
    this.rmWeight.set(0);
    this.rmReps.set(0);
    this.effortValue.set(null);
    this.calculatorAttempted.set(false);
    this.oneRmCalculated.set(false);
    this.compareCalculatorHistory.set(false);
  }

  public sendOneRmToPlates(): void {
    if (!this.oneRmCalculated()) return;
    this.targetBarWeight.set(this.oneRepMaxResult().direct);
    this.strengthCalculatorPage.set('plates');
    this.platesAttempted.set(false);
    this.platesCalculated.set(false);
    this.appliedLoadMessage.set(
      `${this.formatCalculatorWeight(this.oneRepMaxResult().direct)} recibidos desde 1RM.`,
    );
    this.scrollStrengthIntoView('#strength-tool-context');
  }

  public sendRirLoadToPlates(result: { weight: number; unit: WeightUnit }): void {
    if (!Number.isFinite(result.weight) || result.weight <= 0) return;
    if (result.unit !== this.calculatorUnit()) {
      this.updateCalculatorUnit(result.unit);
    }
    this.targetBarWeight.set(result.weight);
    this.strengthCalculatorPage.set('plates');
    this.platesAttempted.set(false);
    this.platesCalculated.set(false);
    this.appliedLoadMessage.set(
      `${this.formatCalculatorWeight(result.weight)} recibidos desde RIR/RPE.`,
    );
    this.scrollStrengthIntoView('#strength-tool-context');
  }

  public openExerciseBarbell(row: TrainingPlanRow): void {
    const load = row.suggestedLoad.match(/^\s*(\d+(?:[.,]\d+)?)(?:\s*(kg|lb)\b|(?=\s*$))/i);
    const unit: WeightUnit = load?.[2]?.toLowerCase() === 'lb' ? 'lb' : 'kg';
    this.updateCalculatorUnit(unit);
    this.targetBarWeight.set(load ? Number(load[1].replace(',', '.')) : 0);
    this.barbellExercise.set(row);
  }

  public closeExerciseBarbell(): void {
    this.barbellExercise.set(null);
    if (!this.plateValidation()) this.persistStrengthSettings();
  }

  public calculatePlates(): void {
    this.platesAttempted.set(true);
    this.platesCalculated.set(this.plateValidation() === null);
    this.plateResultMessage.set(null);
  }

  public updateRmFormula(event: Event): void {
    this.rmFormula.set((event.target as HTMLSelectElement).value as OneRepMaxFormula);
    this.oneRmCalculated.set(false);
    this.persistStrengthSettings();
  }

  public updateEffortScale(event: Event): void {
    this.effortScale.set((event.target as HTMLSelectElement).value as EffortScale);
    this.effortValue.set(null);
    this.oneRmCalculated.set(false);
  }

  public updateEffortValue(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.effortValue.set(raw === '' ? null : Number(raw));
    this.oneRmCalculated.set(false);
  }

  public updateRoundingIncrement(event: Event): void {
    const increment = Number((event.target as HTMLSelectElement).value);
    if (Number.isFinite(increment) && increment > 0) {
      this.roundingIncrement.set(increment);
      this.persistStrengthSettings();
    }
  }

  public updateRememberStrengthSettings(event: Event): void {
    const remember = (event.target as HTMLInputElement).checked;
    this.rememberStrengthSettings.set(remember);
    if (remember) {
      this.persistStrengthSettings();
      return;
    }
    try {
      localStorage.removeItem('gym-progress-strength-settings');
    } catch {
      // Preferences remain usable for the current session.
    }
  }

  public updateCalculatorUnit(unit: WeightUnit): void {
    if (unit === this.calculatorUnit()) {
      return;
    }

    this.rmWeight.set(convertWeightUnit(this.rmWeight(), this.calculatorUnit(), unit));
    this.targetBarWeight.set(
      convertWeightUnit(this.targetBarWeight(), this.calculatorUnit(), unit),
    );
    this.collarWeight.set(convertWeightUnit(this.collarWeight(), this.calculatorUnit(), unit));
    this.emptyBarWeight.set(
      this.emptyBarWeight() > 0
        ? convertWeightUnit(this.emptyBarWeight(), this.calculatorUnit(), unit)
        : 0,
    );
    this.roundingIncrement.set(unit === 'lb' ? 5 : 2.5);
    this.calculatorUnit.set(unit);
    this.oneRmCalculated.set(false);
    this.platesCalculated.set(false);
  }

  public updateTargetBarWeight(event: Event): void {
    this.targetBarWeight.set(this.numberInput(event, 0));
    this.platesCalculated.set(false);
    this.plateResultMessage.set(null);
  }

  public updateEmptyBarWeight(event: Event): void {
    this.emptyBarWeight.set(this.numberInput(event, 0));
    this.platesCalculated.set(false);
    this.plateResultMessage.set(null);
    this.persistStrengthSettings();
  }

  public updateCollarWeight(event: Event): void {
    this.collarWeight.set(this.numberInput(event, 0));
    this.platesCalculated.set(false);
    this.plateResultMessage.set(null);
    this.persistStrengthSettings();
  }

  public togglePlate(weight: number, enabled: boolean): void {
    const quantity = enabled ? 2 : 0;
    const unit = this.calculatorUnit();
    this.plateInventories.update((inventories) => ({
      ...inventories,
      [unit]: inventories[unit].map((plate) =>
        plate.weight === weight ? { ...plate, quantity } : plate,
      ),
    }));
    this.platesCalculated.set(false);
    this.plateResultMessage.set(null);
    this.persistStrengthSettings();
  }

  public useTrainingLoad(load: TrainingLoad): void {
    this.targetBarWeight.set(load.usable);
    this.strengthCalculatorPage.set('plates');
    this.platesCalculated.set(false);
    this.platesAttempted.set(false);
    this.selectedPercentage.set(load.percentage);
    this.appliedLoadMessage.set(
      `${this.formatCalculatorWeight(load.usable)} enviados a la calculadora de discos · ${load.percentage} %.`,
    );
    setTimeout(
      () =>
        document.querySelector('#plate-calculator')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        }),
      0,
    );
  }

  public choosePlateAlternative(total: number): void {
    this.targetBarWeight.set(total);
    this.platesCalculated.set(true);
    this.plateResultMessage.set('Alternativa aplicada como nuevo peso objetivo.');
  }

  public resetPlateCalculation(): void {
    this.targetBarWeight.set(0);
    this.platesAttempted.set(false);
    this.platesCalculated.set(false);
    this.appliedLoadMessage.set(null);
    this.plateResultMessage.set(null);
  }

  public plateVisualLabel(selection: PlateSelection): string {
    const plates = selection.perSide.length
      ? selection.perSide
          .map(
            (plate) =>
              `${plate.count} ${plate.count === 1 ? 'disco' : 'discos'} de ${plate.weight} ${this.calculatorUnit()}`,
          )
          .join(', ')
      : 'sin discos';
    return `Barra simétrica de ${this.formatCalculatorWeight(selection.total)}; por cada lado: ${plates}.`;
  }

  public async copyPlateBreakdown(selection: PlateSelection): Promise<void> {
    const perSide = selection.perSide.length
      ? selection.perSide
          .map((plate) => `${plate.count} × ${plate.weight} ${this.calculatorUnit()}`)
          .join(', ')
      : 'Sin discos';
    const text = [
      `Peso total: ${this.formatCalculatorWeight(selection.total)}`,
      `Barra: ${this.formatCalculatorWeight(this.emptyBarWeight())}`,
      `Discos por lado: ${perSide}`,
      `Discos ambos lados: ${this.formatCalculatorWeight(this.plateDiscTotal(selection.total))}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.plateResultMessage.set('Desglose copiado.');
    } catch {
      this.plateResultMessage.set('No fue posible copiar el desglose.');
    }
  }

  public plateCopies(count: number): number[] {
    return Array.from({ length: Math.max(Math.round(count), 0) }, (_, index) => index);
  }

  public plateDiscTotal(total: number): number {
    return Math.max(total - this.emptyBarWeight() - this.collarWeight(), 0);
  }

  public saveQuickObjective(notation: string): void {
    if (!notation) return;
    const key = this.selectedStrengthExerciseKey() || 'general';
    try {
      localStorage.setItem(`gym-progress-objective-${key}`, notation);
    } catch {
      // The confirmed objective remains visible even when storage is unavailable.
    }
    this.quickObjective.set(notation);
    this.quickObjectiveMessage.set(`Objetivo guardado: ${notation}`);
  }

  public selectStrengthExercise(key: string): void {
    this.selectedStrengthExerciseKey.set(key);
    this.selectedExerciseKey.set(key);
    this.comparisonCurrentSessionId.set('');
    this.comparisonReferenceSessionId.set('');
    this.loadQuickObjective(key);
  }

  public selectComparisonCurrent(id: string): void {
    this.comparisonCurrentSessionId.set(id);
    if (id === this.comparisonReferenceSessionId() || id === this.comparisonReferenceSession()?.id) {
      const alternative = [...this.selectedStrengthSessions()]
        .reverse()
        .find((session) => session.id !== id);
      this.comparisonReferenceSessionId.set(alternative?.id ?? '');
    }
  }

  public selectComparisonReference(id: string): void {
    this.comparisonReferenceSessionId.set(id);
    if (id === this.comparisonCurrentSession()?.id) {
      const alternative = [...this.selectedStrengthSessions()]
        .reverse()
        .find((session) => session.id !== id);
      this.comparisonCurrentSessionId.set(alternative?.id ?? '');
    }
  }

  public comparisonMetric(value: number, unit = ''): string {
    if (Math.abs(value) < 0.05) return 'Sin cambio';
    return `${value > 0 ? '+' : ''}${this.formatNumber(value)}${unit ? ` ${unit}` : ''}`;
  }

  public comparisonHeadline(comparison: SessionComparison): string {
    if (comparison.conclusion === 'Mejoraste' && Math.abs(comparison.maxWeightChange) < 0.05) {
      return 'Mejoraste manteniendo la misma carga';
    }
    return comparison.conclusion;
  }

  public strengthSessionLabel(session: ExerciseSession | null): string {
    if (!session) return 'Sin sesión';
    return `${session.date ?? 'Sin fecha'} · Entrenamiento #${session.sessionIndex}`;
  }

  public formulaLabel(formula: OneRepMaxFormula): string {
    return {
      epley: 'Epley',
      brzycki: 'Brzycki',
      lombardi: 'Lombardi',
      average: 'Promedio',
    }[formula];
  }

  public recordLabel(record: PersonalRecord): string {
    return {
      weight: 'Nuevo PR de peso',
      reps: 'Nuevo PR de repeticiones',
      oneRepMax: 'Nuevo PR de 1RM estimado',
      volume: 'Nuevo PR de volumen',
      bestSet: 'Mejor serie',
    }[record.type];
  }

  public recordValue(record: PersonalRecord): string {
    if (record.type === 'volume') {
      return `${this.formatNumber(record.value)} kg de volumen`;
    }
    if (record.type === 'reps') {
      return `${this.formatNumber(record.weight ?? 0)} ${record.unit} × ${record.reps}`;
    }
    return `${this.formatNumber(record.value)} ${record.type === 'weight' ? record.unit : 'kg'}`;
  }

  public previousRecordValue(record: PersonalRecord): string {
    const value = record.previousValue ?? 0;
    if (record.type === 'reps') {
      return `${this.formatNumber(record.weight ?? 0)} ${record.unit} × ${this.formatNumber(value)}`;
    }
    if (record.type === 'volume') {
      return `${this.formatNumber(value)} kg de volumen`;
    }
    return `${this.formatNumber(value)} ${record.type === 'weight' ? record.unit : 'kg'}`;
  }

  public formatStrengthSet(set: { weight: number; reps: number; unit: WeightUnit }): string {
    return `${this.formatNumber(set.weight)} ${set.unit} × ${set.reps}`;
  }

  public formatNumber(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  public formatCalculatorWeight(value: number): string {
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${this.calculatorUnit()}`;
  }

  public formatSignedCalculatorWeight(value: number): string {
    if (Math.abs(value) < 0.05) return 'Sin diferencia';
    return `${value > 0 ? '+' : ''}${this.formatCalculatorWeight(value)}`;
  }

  public updateCsvText(event: Event): void {
    this.csvText.set((event.target as HTMLTextAreaElement).value);
  }

  public updateExerciseSearch(event: Event): void {
    this.exerciseSearch.set((event.target as HTMLInputElement).value);
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

      const blockTwo = buildBlockTwoPlan();
      this.trainingPlans.set({ block1: parsed, block2: blockTwo });
      const activePlan = this.trainingPlan() ?? parsed;
      this.initializePlanSelection(activePlan);
      this.restoreWorkoutSession(activePlan);
    } catch (error) {
      this.trainingPlans.set({});
      this.planError.set(this.errorMessage(error));
    }
  }

  public selectTrainingBlock(block: TrainingBlockId): void {
    if (block === this.activeTrainingBlock()) {
      return;
    }

    this.persistWorkoutSession();
    this.activeTrainingBlock.set(block);
    this.storeActiveTrainingBlock(block);
    this.resetWorkoutState();

    const plan = this.trainingPlan();
    if (!plan) {
      return;
    }

    this.initializePlanSelection(plan);
    this.restoreWorkoutSession(plan);
  }

  public selectWorkout(workout: string): void {
    this.selectedWorkout.set(workout);
    const key = this.selectedProgress()?.topMovements[0]?.key ?? '';
    this.selectedExerciseKey.set(key);
    this.selectedStrengthExerciseKey.set(key);
    this.loadQuickObjective(key);
  }

  public selectPlanWeek(week: number): void {
    this.selectedPlanWeek.set(week);
    const selected = this.planWeeks().find((option) => option.week === week);
    this.selectedPlanDay.set(selected?.days[0]?.name ?? 'all');
    this.weekOverviewOpen.set(false);
    this.trainingInProgress.set(false);
    this.trainingCompleted.set(false);
    this.workoutReportOpen.set(false);
    this.workoutCompletedAt.set(null);
    this.workoutStartedAt.set(null);
    this.dismissRestTimer();
    this.persistWorkoutSession();
  }

  public selectSummaryWeek(value: string): void {
    this.selectedSummaryWeek.set(value === 'all' ? 'all' : Number(value));
  }

  public selectSummaryRoutine(value: string): void {
    this.selectedSummaryRoutine.set(value);
  }

  public selectPlanDay(day: string): void {
    this.selectedPlanDay.set(day);
    this.routineChosen.set(true);
  }

  public selectExercise(key: string): void {
    this.selectedExerciseKey.set(key);
    this.selectedStrengthExerciseKey.set(key);
    this.loadQuickObjective(key);
  }

  public updateHistoryMetric(value: string): void {
    this.historyMetric.set(value as HistoryMetric);
  }

  public formatHistoryMetric(value: number): string {
    if (this.historyMetric() === 'reps') {
      return `${this.formatInteger(value)} reps`;
    }
    return this.formatKg(value);
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
      this.selectedStrengthExerciseKey.set(parsed.entries[0]?.exerciseKey ?? '');
      this.loadQuickObjective(parsed.entries[0]?.exerciseKey ?? '');
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

  private numberInput(event: Event, fallback: number): number {
    const value = Number((event.target as HTMLInputElement).value);
    return Number.isFinite(value) ? value : fallback;
  }

  private readStoredTrainingBlock(): TrainingBlockId | null {
    try {
      const value = localStorage.getItem(ACTIVE_TRAINING_BLOCK_STORAGE_KEY);
      return value === 'block1' || value === 'block2' ? value : null;
    } catch {
      return null;
    }
  }

  private storeActiveTrainingBlock(block: TrainingBlockId): void {
    try {
      localStorage.setItem(ACTIVE_TRAINING_BLOCK_STORAGE_KEY, block);
    } catch {
      // Block switching remains available when storage is unavailable.
    }
  }

  private initializePlanSelection(plan: ParsedTrainingPlan): void {
    this.selectedPlanWeek.set(plan.weeks[0]?.week ?? 1);
    this.selectedSummaryWeek.set('all');
    this.selectedSummaryRoutine.set('all');
    this.selectedPlanDay.set(plan.weeks[0]?.days[0]?.name ?? 'all');
    this.weekOverviewOpen.set(false);
  }

  private resetWorkoutState(): void {
    this.planMode.set('overview');
    this.trainingInProgress.set(false);
    this.trainingCompleted.set(false);
    this.workoutReportOpen.set(false);
    this.workoutCompletedAt.set(null);
    this.completedExerciseRows.set(new Set<number>());
    this.completedSetsByRow.set(new Map<number, ReadonlySet<number>>());
    this.workoutStartedAt.set(null);
    this.restTimerEndsAt.set(null);
    this.restTimerPausedSeconds.set(0);
    this.restTimerDuration.set(0);
    this.restTimerFinished.set(false);
  }

  private startRestTimer(rest: string): void {
    const duration = this.parseRestDurationSeconds(rest);
    if (!duration) {
      this.dismissRestTimer();
      return;
    }

    this.restTimerDuration.set(duration);
    this.restTimerPausedSeconds.set(0);
    this.restTimerFinished.set(false);
    this.restTimerEndsAt.set(Date.now() + duration * 1000);
    this.clockNow.set(Date.now());
  }

  private scrollStrengthIntoView(selector = '#strength-workspace'): void {
    setTimeout(
      () =>
        document.querySelector(selector)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      0,
    );
  }

  private parseRestDurationSeconds(rest: string): number {
    const values = [...rest.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) =>
      Number(match[0].replace(',', '.')),
    );
    if (!values.length) return 0;

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const usesMinutes = /min/i.test(rest);
    return Math.max(15, Math.round(average * (usesMinutes ? 60 : 1)));
  }

  private persistWorkoutSession(): void {
    try {
      const session: StoredWorkoutSession = {
        version: 1,
        block: this.activeTrainingBlock(),
        week: this.selectedPlanWeek(),
        day: this.selectedPlanDay(),
        completedRows: [...this.completedExerciseRows()],
        completedSets: [...this.completedSetsByRow()].map(([sourceRow, sets]) => [
          sourceRow,
          [...sets].sort((left, right) => left - right),
        ]),
        startedAt: this.workoutStartedAt(),
        inProgress: this.trainingInProgress(),
        completed: this.trainingCompleted(),
        restTimerEndsAt: this.restTimerEndsAt(),
        restTimerPausedSeconds: this.restTimerPausedSeconds(),
        restTimerDuration: this.restTimerDuration(),
      };
      const serialized = JSON.stringify(session);
      localStorage.setItem(this.workoutSessionStorageKey(), serialized);
      if (this.activeTrainingBlock() === 'block1') {
        localStorage.setItem(WORKOUT_SESSION_STORAGE_KEY, serialized);
      }
    } catch {
      // Training remains fully usable when storage is unavailable.
    }
  }

  private restoreWorkoutSession(plan: ParsedTrainingPlan): void {
    this.restoreBlockProgress(plan);
    try {
      const raw =
        localStorage.getItem(this.workoutSessionStorageKey()) ??
        (this.activeTrainingBlock() === 'block1'
          ? localStorage.getItem(WORKOUT_SESSION_STORAGE_KEY)
          : null);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<StoredWorkoutSession>;
      if (
        stored.version !== 1 ||
        !stored.inProgress ||
        (stored.block !== undefined && stored.block !== this.activeTrainingBlock())
      ) {
        return;
      }

      const week = plan.weeks.find((item) => item.week === stored.week);
      const day = week?.days.find((item) => item.name === stored.day);
      if (!week || !day) return;

      const validRows = new Set(day.rows.map((row) => row.sourceRow));
      this.selectedPlanWeek.set(week.week);
      this.selectedPlanDay.set(day.name);
      this.completedExerciseRows.set(
        new Set((stored.completedRows ?? []).filter((row) => validRows.has(row))),
      );
      const restoredSets = new Map<number, ReadonlySet<number>>();
      const storedSets = Array.isArray(stored.completedSets) ? stored.completedSets : [];
      for (const entry of storedSets) {
        if (!Array.isArray(entry) || entry.length !== 2) continue;
        const [sourceRow, sets] = entry;
        const row = day.rows.find((item) => item.sourceRow === sourceRow);
        const totalSets = row ? plannedSetCount(row.sets) : 0;
        if (!validRows.has(sourceRow) || !Array.isArray(sets) || totalSets === 0) continue;
        const validSets = sets.filter(
          (setNumber) => Number.isInteger(setNumber) && setNumber >= 1 && setNumber <= totalSets,
        );
        if (validSets.length) restoredSets.set(sourceRow, new Set(validSets));
      }
      for (const sourceRow of this.completedExerciseRows()) {
        if (restoredSets.has(sourceRow)) continue;
        const row = day.rows.find((item) => item.sourceRow === sourceRow);
        const totalSets = row ? plannedSetCount(row.sets) : 0;
        if (totalSets > 0) {
          restoredSets.set(
            sourceRow,
            new Set(Array.from({ length: totalSets }, (_, index) => index + 1)),
          );
        }
      }
      this.completedSetsByRow.set(restoredSets);
      this.workoutStartedAt.set(
        typeof stored.startedAt === 'number' ? stored.startedAt : Date.now(),
      );
      this.trainingInProgress.set(true);
      this.trainingCompleted.set(false);
      this.planMode.set('workout');
      this.planPickerOpen.set(false);

      const duration = Math.max(0, Number(stored.restTimerDuration) || 0);
      const paused = Math.max(0, Number(stored.restTimerPausedSeconds) || 0);
      const endsAt =
        typeof stored.restTimerEndsAt === 'number' ? stored.restTimerEndsAt : null;
      this.restTimerDuration.set(duration);
      if (endsAt !== null && endsAt > Date.now()) {
        this.restTimerEndsAt.set(endsAt);
        this.restTimerPausedSeconds.set(0);
      } else if (paused > 0) {
        this.restTimerEndsAt.set(null);
        this.restTimerPausedSeconds.set(paused);
      } else if (duration > 0) {
        this.restTimerFinished.set(true);
      }
      this.clockNow.set(Date.now());
    } catch {
      // Ignore malformed session data and start with a clean plan.
    }
  }

  private readonly finishedRoutines = signal<Array<{week: number; day: string}>>([]);

  private saveBlockCompletion(): void {
    try {
      const key = 'gym-progress-block-history-' + this.activeTrainingBlock();
      const raw = localStorage.getItem(key);
      const history: Array<{week: number; day: string}> = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) return;
      history.push({ week: this.selectedPlanWeek(), day: this.selectedPlanDay() });
      localStorage.setItem(key, JSON.stringify(history));
      this.finishedRoutines.set(history);
    } catch { /* Keep the current session usable if storage is unavailable. */ }
  }

  private restoreBlockProgress(plan: ParsedTrainingPlan): void {
    this.finishedRoutines.set([]);
    try {
      const history = JSON.parse(localStorage.getItem('gym-progress-block-history-' + this.activeTrainingBlock()) ?? '[]');
      this.finishedRoutines.set(Array.isArray(history) ? history : []);
      if (!Array.isArray(history) || !history.length) return;
      const last = history[history.length - 1];
      const days = plan.weeks.flatMap(week => week.days.map(day => ({ week: week.week, day })));
      const index = days.findIndex(item => item.week === last.week && item.day.name === last.day);
      if (index < 0) return;
      const next = days[index + 1];
      const target = next ?? days[index];
      this.selectedPlanWeek.set(target.week);
      this.selectedPlanDay.set(target.day.name);
      this.trainingCompleted.set(!next);
      this.completedExerciseRows.set(new Set(next ? [] : target.day.rows.map(row => row.sourceRow)));
      this.completedSetsByRow.set(new Map<number, ReadonlySet<number>>());
    } catch { /* Ignore invalid saved progress. */ }
  }

  private workoutSessionStorageKey(block = this.activeTrainingBlock()): string {
    return `${WORKOUT_SESSION_STORAGE_KEY}-${block}`;
  }

  private loadStrengthSettings(): void {
    try {
      const raw = localStorage.getItem('gym-progress-strength-settings');
      if (!raw) return;
      const settings = JSON.parse(raw) as {
        remember?: boolean;
        collarWeight?: number;
        emptyBarWeight?: number;
        roundingIncrement?: number;
        rmFormula?: OneRepMaxFormula;
        plateInventories?: Record<WeightUnit, PlateInventoryItem[]>;
      };
      if (!settings.remember) return;
      this.rememberStrengthSettings.set(true);
      if (Number.isFinite(settings.collarWeight) && (settings.collarWeight ?? 0) >= 0) {
        this.collarWeight.set(0);
      }
      if (
        Number.isFinite(settings.roundingIncrement) &&
        (settings.roundingIncrement ?? 0) > 0
      ) {
        this.roundingIncrement.set(settings.roundingIncrement ?? 2.5);
      }
      if (Number.isFinite(settings.emptyBarWeight) && (settings.emptyBarWeight ?? 0) >= 0) {
        this.emptyBarWeight.set(settings.emptyBarWeight ?? 0);
      }
      if (
        settings.rmFormula === 'epley' ||
        settings.rmFormula === 'brzycki' ||
        settings.rmFormula === 'lombardi' ||
        settings.rmFormula === 'average'
      ) {
        this.rmFormula.set(settings.rmFormula);
      }
      if (settings.plateInventories?.kg?.length && settings.plateInventories.lb?.length) {
        this.plateInventories.set(settings.plateInventories);
      }
    } catch {
      // Default plate settings remain available when storage is unavailable or invalid.
    }
  }

  private persistStrengthSettings(): void {
    if (!this.rememberStrengthSettings()) return;
    try {
      localStorage.setItem(
        'gym-progress-strength-settings',
        JSON.stringify({
          remember: true,
          collarWeight: this.collarWeight(),
          emptyBarWeight: this.emptyBarWeight(),
          roundingIncrement: this.roundingIncrement(),
          rmFormula: this.rmFormula(),
          plateInventories: this.plateInventories(),
        }),
      );
    } catch {
      // The calculator remains usable without persistence.
    }
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset['theme'] = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }

  private loadQuickObjective(key: string): void {
    try {
      const notation = localStorage.getItem(`gym-progress-objective-${key || 'general'}`);
      this.quickObjective.set(notation);
      this.quickObjectiveMessage.set(notation ? `Objetivo guardado: ${notation}` : null);
    } catch {
      this.quickObjective.set(null);
      this.quickObjectiveMessage.set(null);
    }
  }

  private roundToPlate(value: number): number {
    const increment = this.calculatorUnit() === 'kg' ? 2.5 : 5;
    return Math.round(value / increment) * increment;
  }

  private roundToHalf(value: number): number {
    return Math.round(value * 2) / 2;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'No se pudo leer el CSV.';
  }

  private exerciseIdentity(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
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

  public shortPhase(value: string): string {
    const phase = value.toLocaleLowerCase();
    const labels: Array<[string, string]> = [
      ['vuelta del deload', 'Retomar fuerza'],
      ['base + volumen', 'Volumen suave'],
      ['base/analgesia', 'Base'],
      ['volumen alto', 'Más volumen'],
      ['carga moderada', 'Carga moderada'],
      ['deload', 'Descarga'],
      ['reacumulación', 'Retomar cargas'],
      ['pesada submáxima', 'Fuerza'],
      ['consolidación/test', 'Evaluación'],
      ['adaptación', 'Adaptación'],
      ['pequeño aumento', 'Subir carga'],
      ['aumento de intensidad', 'Más intensidad'],
      ['consolidación de cargas', 'Consolidación'],
      ['fuerza submáxima', 'Fuerza'],
      ['evaluación', 'Evaluación'],
    ];
    return labels.find(([key]) => phase.includes(key))?.[1]
      ?? value.split(/[.:·]/)[0]?.trim()
      ?? value;
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
