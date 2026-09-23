import { describe, expect, it } from 'vitest';
import { TrainingPlanRow } from './training-plan';
import { buildWorkoutReport, buildWorkoutReportText, formatWorkoutDuration } from './workout-report';

const row = (overrides: Partial<TrainingPlanRow>): TrainingPlanRow => ({
  week: 1,
  day: 'D1',
  focus: 'Fuerza',
  phase: 'Base',
  block: 'Principal',
  exercise: 'Press banca',
  sets: '4',
  repsOrTime: '6–8',
  suggestedLoad: '75 kg',
  rir: 'RIR 3',
  tempo: 'Controlado',
  rest: '2 min',
  objective: '',
  tendonRule: '',
  progression: '',
  notes: '',
  sourceRow: 10,
  ...overrides,
});

describe('workout report', () => {
  it('calculates completed work and estimated volume from the prescription', () => {
    const report = buildWorkoutReport({
      title: 'D1 Upper',
      block: 'Bloque 2',
      week: 1,
      phase: 'Fuerza',
      completedAt: new Date('2026-09-23T12:00:00Z'),
      durationSeconds: 3900,
      rows: [row({}), row({ exercise: 'Dominadas', sourceRow: 11, sets: '3', suggestedLoad: 'BW + 10 kg' })],
      completedRows: new Set([10, 11]),
      completedSetsByRow: new Map([[10, new Set([1, 2, 3, 4])], [11, new Set([1, 2, 3])]]),
    });

    expect(report).toMatchObject({
      exercisesCompleted: 2,
      setsCompleted: 7,
      estimatedReps: 49,
      estimatedVolumeKg: 2100,
      completionRate: 100,
    });
    expect(formatWorkoutDuration(report.durationSeconds)).toBe('1 h 5 min');
    expect(buildWorkoutReportText(report)).toContain('2/2 ejercicios');
    expect(buildWorkoutReportText(report)).not.toContain('1 h 5 min');
  });

  it('excludes timed work and non-numeric loads from volume', () => {
    const report = buildWorkoutReport({
      title: 'Rehabilitación',
      block: 'Bloque 2',
      week: 1,
      phase: 'Base',
      completedAt: new Date(),
      durationSeconds: 600,
      rows: [row({ repsOrTime: '30 s', suggestedLoad: 'Según fisio' })],
      completedRows: new Set([10]),
      completedSetsByRow: new Map([[10, new Set([1, 2, 3, 4])]]),
    });
    expect(report.estimatedReps).toBe(0);
    expect(report.estimatedVolumeKg).toBe(0);
  });
});
