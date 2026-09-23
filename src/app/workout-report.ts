import { TrainingPlanRow, formatSuggestedLoad } from './training-plan';
import { plannedSetCount } from './exercise-set-progress';

export interface WorkoutReportExercise {
  name: string;
  completedSets: number;
  estimatedReps: number;
  estimatedVolumeKg: number;
}

export interface WorkoutReportData {
  title: string;
  block: string;
  week: number;
  phase: string;
  completedAt: Date;
  durationSeconds: number;
  exercisesCompleted: number;
  totalExercises: number;
  setsCompleted: number;
  estimatedReps: number;
  estimatedVolumeKg: number;
  averageVolumePerSetKg: number;
  completionRate: number;
  exercises: readonly WorkoutReportExercise[];
}

export interface WorkoutReportSource {
  title: string;
  block: string;
  week: number;
  phase: string;
  completedAt: Date;
  durationSeconds: number;
  rows: readonly TrainingPlanRow[];
  completedRows: ReadonlySet<number>;
  completedSetsByRow: ReadonlyMap<number, ReadonlySet<number>>;
}

export function buildWorkoutReport(source: WorkoutReportSource): WorkoutReportData {
  const exercises = source.rows
    .filter((row) => source.completedRows.has(row.sourceRow))
    .map((row) => {
      const trackedSets = source.completedSetsByRow.get(row.sourceRow)?.size ?? 0;
      const completedSets = trackedSets || plannedSetCount(row.sets);
      const repsPerSet = representativeReps(row.repsOrTime);
      const loadKg = representativeLoadKg(row.suggestedLoad);
      const estimatedReps = repsPerSet > 0 ? Math.round(repsPerSet * completedSets) : 0;
      const estimatedVolumeKg =
        loadKg > 0 && repsPerSet > 0
          ? round(loadKg * repsPerSet * completedSets)
          : 0;

      return {
        name: row.exercise,
        completedSets,
        estimatedReps,
        estimatedVolumeKg,
      };
    });

  const setsCompleted = exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0);
  const estimatedReps = exercises.reduce((sum, exercise) => sum + exercise.estimatedReps, 0);
  const estimatedVolumeKg = round(
    exercises.reduce((sum, exercise) => sum + exercise.estimatedVolumeKg, 0),
  );

  return {
    title: source.title,
    block: source.block,
    week: source.week,
    phase: source.phase,
    completedAt: source.completedAt,
    durationSeconds: Math.max(0, Math.round(source.durationSeconds)),
    exercisesCompleted: exercises.length,
    totalExercises: source.rows.length,
    setsCompleted,
    estimatedReps,
    estimatedVolumeKg,
    averageVolumePerSetKg: setsCompleted ? round(estimatedVolumeKg / setsCompleted) : 0,
    completionRate: source.rows.length
      ? Math.round((exercises.length / source.rows.length) * 100)
      : 0,
    exercises,
  };
}

export function buildWorkoutReportText(report: WorkoutReportData): string {
  const lines = [
    `🏆 ${report.title} completado`,
    `${report.block} · Semana ${report.week}`,
    '',
    `✓ ${report.exercisesCompleted}/${report.totalExercises} ejercicios`,
    `✓ ${report.setsCompleted} series`,
    `⏱ ${formatWorkoutDuration(report.durationSeconds)}`,
  ];

  if (report.estimatedVolumeKg > 0) {
    lines.push(`⚡ ${formatReportNumber(report.estimatedVolumeKg)} kg de volumen estimado`);
  }
  if (report.estimatedReps > 0) {
    lines.push(`↻ ${formatReportNumber(report.estimatedReps)} repeticiones estimadas`);
  }

  lines.push('', 'Entreno registrado con gerogym');
  return lines.join('\n');
}

export function formatWorkoutDuration(seconds: number): string {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

export function formatReportNumber(value: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value);
}

function representativeReps(value: string): number {
  if (/\b(?:seg(?:undos?)?|min(?:utos?)?|s)\b/i.test(value)) return 0;
  return representativeNumber(value);
}

function representativeLoadKg(value: string): number {
  const formatted = formatSuggestedLoad(value);
  if (/\b(?:bw|peso corporal|seg[uú]n)\b/i.test(formatted)) return 0;
  return representativeNumber(formatted);
}

function representativeNumber(value: string): number {
  const range = value.match(/(\d+(?:[.,]\d+)?)\s*[–—-]\s*(\d+(?:[.,]\d+)?)/);
  if (range) {
    return (toNumber(range[1]) + toNumber(range[2])) / 2;
  }
  const match = value.match(/\d+(?:[.,]\d+)?/);
  return match ? toNumber(match[0]) : 0;
}

function toNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
