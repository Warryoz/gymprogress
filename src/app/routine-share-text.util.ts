import { TrainingPlanRow, formatSuggestedLoad } from './training-plan';

export interface RoutineShareData {
  title: string;
  week: number;
  totalWeeks: number;
  phase: string;
  focus: string;
  estimatedDuration: string;
  rows: readonly TrainingPlanRow[];
  generatedAt?: Date;
}

export function buildRoutineShareText(routine: RoutineShareData): string {
  const heading = [
    routine.title.toLocaleUpperCase(),
    `Semana ${routine.week} de ${routine.totalWeeks} · ${routine.phase}`,
    `${routine.rows.length} ${routine.rows.length === 1 ? 'ejercicio' : 'ejercicios'} · ${totalRoutineSets(routine.rows)} series · ${routine.estimatedDuration}`,
  ];

  if (routine.focus && routine.focus !== routine.phase) {
    heading.push(`Enfoque: ${routine.focus}`);
  }

  const exercises = routine.rows.map((row, index) => {
    const lines = [
      `${index + 1}. ${row.exercise}`,
      routinePrescription(row),
      row.rest ? `Descanso: ${row.rest}` : '',
      ...routineNotes(row),
    ];

    return lines.filter(Boolean).join('\n');
  });

  return [...heading, ...exercises, 'Generado con Gym Progress'].join('\n\n');
}

export function routinePrescription(row: TrainingPlanRow): string {
  const parts = [`${row.sets} × ${row.repsOrTime}`];

  if (row.suggestedLoad) {
    parts.push(formatSuggestedLoad(row.suggestedLoad));
  }

  if (row.rir) {
    parts.push(row.rir);
  }

  return parts.join(' · ');
}

export function routineNotes(row: TrainingPlanRow): string[] {
  return [
    row.tempo ? `Tempo: ${row.tempo}` : '',
    row.objective ? `Objetivo: ${row.objective}` : '',
    row.notes ? `Nota: ${row.notes}` : '',
    row.tendonRule ? `Regla 24 h: ${row.tendonRule}` : '',
  ].filter(Boolean);
}

export function totalRoutineSets(rows: readonly TrainingPlanRow[]): number {
  return rows.reduce((sum, row) => sum + minimumSetCount(row.sets), 0);
}

function minimumSetCount(value: string): number {
  const match = String(value ?? '').match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : 0;
}
