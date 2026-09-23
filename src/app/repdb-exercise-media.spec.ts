import { describe, expect, it } from 'vitest';
import { getExercise } from '@repdb/exercises';
import { resolveBlockTwoRepdbExercise } from './repdb-exercise-media';
import type { TrainingPlanRow } from './training-plan';

function row(exercise: string, suggestedLoad: string, block = 'Accesorio'): TrainingPlanRow {
  return {
    week: 1,
    day: 'D3 Upper volumen',
    focus: '',
    phase: '',
    block,
    exercise,
    sets: '3',
    repsOrTime: '8',
    suggestedLoad,
    rir: 'RIR 3',
    tempo: 'Controlado',
    rest: '2 min',
    objective: '',
    tendonRule: '',
    progression: '',
    notes: '',
    sourceRow: 1,
  };
}

describe('resolveBlockTwoRepdbExercise', () => {
  it('resolves a configured generic bench variant to the concrete RepDB exercise', () => {
    const flat = resolveBlockTwoRepdbExercise(row('Variante secundaria de banca', '65 kg (plano)'));
    const incline = resolveBlockTwoRepdbExercise(
      row('Press banca o press inclinado', '75 kg (inclinado)'),
    );

    expect(flat?.id).toBe('bench-press');
    expect(incline?.id).toBe('incline-bench-press');
    expect(flat?.kind).toBe('animated');
    expect(flat?.primaryMuscles).toContain('Pectoral mayor');
    expect(flat?.secondaryMuscles).toContain('Tríceps');
  });

  it('only exposes mappings backed by real RepDB records with media', () => {
    const media = resolveBlockTwoRepdbExercise(row('Peso muerto rumano', '70 kg'));
    const repdbExercise = media ? getExercise(media.id) : undefined;

    expect(repdbExercise).toBeDefined();
    expect(repdbExercise?.images.flat.start).toBeTruthy();
    expect(repdbExercise?.images.flat.peak).toBeTruthy();
  });

  it('uses the configured Block 2 exercise variants', () => {
    expect(resolveBlockTwoRepdbExercise(row('Remo', '54 kg'))?.id).toBe('barbell-row');
    expect(resolveBlockTwoRepdbExercise(row('Press compatible con hombro', '36 kg'))?.id).toBe(
      'ohp',
    );
    expect(resolveBlockTwoRepdbExercise(row('Curl femoral', '45 kg'))?.id).toBe(
      'seated-leg-curl',
    );
    expect(resolveBlockTwoRepdbExercise(row('Bíceps', '10 kg por mano'))?.id).toBe('hammer-curl');
  });

  it('does not map rehabilitation or unresolved generic exercises', () => {
    expect(
      resolveBlockTwoRepdbExercise(
        row('Rehabilitación de cadera y rodilla', 'Según fisio', 'Rehabilitación'),
      ),
    ).toBeNull();
  });
});
