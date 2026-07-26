import { TrainingPlanRow } from './training-plan';
import {
  RoutineShareData,
  buildRoutineShareText,
  routinePrescription,
  totalRoutineSets,
} from './routine-share-text.util';

const ROWS: TrainingPlanRow[] = [
  {
    week: 1,
    day: 'D1 Push',
    focus: 'Pecho',
    phase: 'Base / Analgesia',
    block: 'Tendón / activación',
    exercise: 'Isométrico empuje mid-range',
    sets: '3-5',
    repsOrTime: '30-45 s',
    suggestedLoad: '40-60% esfuerzo',
    rir: 'Dolor máximo: 3/10',
    tempo: '',
    rest: '60-90 s',
    objective: 'Analgesia',
    tendonRule: 'Sin empeorar al día siguiente',
    progression: '',
    notes: 'Mantén la posición',
    sourceRow: 2,
  },
  {
    week: 1,
    day: 'D1 Push',
    focus: 'Pecho',
    phase: 'Base / Analgesia',
    block: 'Principal',
    exercise: 'Incline bench press',
    sets: '4',
    repsOrTime: '8',
    suggestedLoad: '62.5',
    rir: 'RIR 3-4',
    tempo: '3-1-2',
    rest: '2-3 min',
    objective: '',
    tendonRule: '',
    progression: '',
    notes: '',
    sourceRow: 3,
  },
];

const ROUTINE: RoutineShareData = {
  title: 'D1 Push',
  week: 1,
  totalWeeks: 8,
  phase: 'Base / Analgesia',
  focus: 'Pecho',
  estimatedDuration: '50-65 min',
  rows: ROWS,
};

describe('routine share text', () => {
  it('builds a complete message from the current routine data', () => {
    const text = buildRoutineShareText(ROUTINE);

    expect(text).toContain('D1 PUSH');
    expect(text).toContain('Semana 1 de 8 · Base / Analgesia');
    expect(text).toContain('2 ejercicios · 7 series · 50-65 min');
    expect(text).toContain('1. Isométrico empuje mid-range');
    expect(text).toContain('3-5 × 30-45 s · 40-60% esfuerzo · Dolor máximo: 3/10');
    expect(text).toContain('Descanso: 2-3 min');
    expect(text).toContain('Generado con Gym Progress');
  });

  it('formats numeric loads and totals the lower prescribed set count', () => {
    expect(routinePrescription(ROWS[1])).toBe('4 × 8 · 62.5 kg · RIR 3-4');
    expect(totalRoutineSets(ROWS)).toBe(7);
  });
});
