import { describe, expect, it } from 'vitest';
import {
  ExerciseSession,
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

const sessions: ExerciseSession[] = [
  {
    id: 's1',
    exerciseKey: 'bench',
    exerciseName: 'Bench press',
    sessionIndex: 1,
    sets: [
      { weight: 80, reps: 5, unit: 'kg', rir: 2 },
      { weight: 80, reps: 4, unit: 'kg', rir: 2 },
    ],
  },
  {
    id: 's2',
    exerciseKey: 'bench',
    exerciseName: 'Bench press',
    sessionIndex: 2,
    sets: [
      { weight: 80, reps: 6, unit: 'kg', rir: 2 },
      { weight: 80, reps: 5, unit: 'kg', rir: 2 },
    ],
  },
];

describe('strength tools', () => {
  it('calculates supported 1RM formulas and RIR adjustment', () => {
    expect(calculateEstimatedOneRepMax(80, 5, 'epley')).toBe(93.3);
    expect(calculateEstimatedOneRepMax(80, 5, 'brzycki')).toBe(90);
    expect(calculateEstimatedOneRepMax(80, 5, 'lombardi')).toBe(94);
    expect(calculateOneRepMaxRange(80, 5, 2).adjusted).toBe(98.7);
  });

  it('converts units and explains percentage rounding', () => {
    expect(convertWeightUnit(100, 'kg', 'lb')).toBe(220.46);
    expect(calculatePercentageLoads(93.3, [85], 2.5)[0]).toEqual({
      percentage: 85,
      exact: 79.3,
      usable: 80,
    });
  });

  it('returns exact and alternative plate combinations', () => {
    const config = {
      unit: 'kg' as const,
      barWeight: 20,
      collarWeight: 0,
      plates: [
        { weight: 20, quantity: 4 },
        { weight: 10, quantity: 2 },
        { weight: 5, quantity: 2 },
        { weight: 2.5, quantity: 2 },
      ],
    };
    expect(calculatePlateCombination(100, config).exact?.total).toBe(100);
    const impossible = calculatePlateCombination(101, config);
    expect(impossible.exact).toBeNull();
    expect(impossible.lower.total).toBe(100);
    expect(impossible.upper?.total).toBe(105);
  });

  it('compares sessions using multiple signals', () => {
    const result = compareExerciseSessions(sessions[1], sessions[0]);
    expect(result.conclusion).toBe('Mejoraste');
    expect(result.repsChange).toBe(2);
    expect(result.volumeChange).toBe(160);
    expect(result.reasons).toContain('Añadiste una repetición en cada serie.');
  });

  it('detects stable, non-duplicated PR records', () => {
    const records = detectPersonalRecords(sessions);
    expect(records.some((record) => record.type === 'reps' && record.sessionId === 's2')).toBe(true);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
  });

  it('recalculates records after a session is edited or removed', () => {
    expect(detectPersonalRecords(sessions).some((record) => record.sessionId === 's2')).toBe(true);
    expect(detectPersonalRecords(sessions.slice(0, 1))).toEqual([]);

    const edited = [
      sessions[0],
      {
        ...sessions[1],
        sets: [
          { weight: 75, reps: 5, unit: 'kg' as const },
          { weight: 75, reps: 4, unit: 'kg' as const },
        ],
      },
    ];
    expect(detectPersonalRecords(edited).some((record) => record.sessionId === 's2')).toBe(false);
  });

  it('handles incomplete calculator and recommendation data safely', () => {
    expect(calculateEstimatedOneRepMax(0, 5)).toBe(0);
    expect(calculateEstimatedOneRepMax(80, 0)).toBe(0);
    expect(
      calculateProgressionSuggestion({
        sessions: [],
        targetMinReps: 8,
        targetMaxReps: 12,
        targetRir: 2,
        increment: 2.5,
      }).headline,
    ).toBe('Registra otra sesión');
  });

  it('normalizes effort and suggests double progression', () => {
    expect(normalizeEffortScale(8, 'rpe')).toBe(2);
    const suggestion = calculateProgressionSuggestion({
      sessions: [
        {
          ...sessions[1],
          sets: [
            { weight: 80, reps: 12, unit: 'kg', rir: 2 },
            { weight: 80, reps: 12, unit: 'kg', rir: 2 },
            { weight: 80, reps: 12, unit: 'kg', rir: 2 },
          ],
        },
      ],
      targetMinReps: 8,
      targetMaxReps: 12,
      targetRir: 2,
      increment: 2.5,
    });
    expect(suggestion.action).toBe('increase');
    expect(suggestion.suggestedWeight).toBe(82.5);
  });

  it('does not increase load when RIR is missing and uses the prescribed range', () => {
    const suggestion = calculateProgressionSuggestion({
      sessions: [
        {
          ...sessions[1],
          sets: [
            { weight: 80, reps: 8, unit: 'kg' },
            { weight: 80, reps: 8, unit: 'kg' },
            { weight: 80, reps: 8, unit: 'kg' },
            { weight: 80, reps: 8, unit: 'kg' },
          ],
        },
      ],
      targetSets: 4,
      targetMinReps: 6,
      targetMaxReps: 8,
      targetRir: 2,
      increment: 2.5,
    });
    expect(suggestion.action).toBe('maintain');
    expect(suggestion.confidence).toBe('baja');
    expect(suggestion.target).toBe('8, 8, 8, 8 repeticiones @ RIR 2');
  });
});


describe('gym plate loading', () => {
  const config = { unit: 'kg' as const, barWeight: 20, collarWeight: 0, plates: [
    { weight: 1.25, quantity: 2 }, { weight: 5, quantity: 4 },
    { weight: 20, quantity: 4 }, { weight: 10, quantity: 2 },
  ] };
  it('uses the fewest available discs and orders them from largest to smallest', () => {
    expect(calculatePlateCombination(112.5, config).exact?.perSide).toEqual([
      { weight: 20, count: 2 }, { weight: 5, count: 1 }, { weight: 1.25, count: 1 },
    ]);
  });
  it('does not invent a pair from an odd inventory or use unavailable discs', () => {
    const result = calculatePlateCombination(65, { ...config, plates: [{ weight: 20, quantity: 3 }, { weight: 2.5, quantity: 0 }] });
    expect(result.exact).toBeNull();
    expect(result.lower.total).toBe(60);
    expect(result.upper).toBeNull();
  });
  it('includes collars and supports the empty bar', () => {
    expect(calculatePlateCombination(25, { ...config, collarWeight: 5 }).exact?.perSide).toEqual([]);
    expect(calculatePlateCombination(65, { ...config, collarWeight: 5 }).exact?.perSide).toEqual([{ weight: 20, count: 1 }]);
  });
  it('does not claim an exact result below the bar or for a rounded target', () => {
    expect(calculatePlateCombination(10, config).exact).toBeNull();
    const result = calculatePlateCombination(60.01, config);
    expect(result.exact).toBeNull();
    expect(result.lower.total).toBe(60);
    expect(result.upper?.total).toBe(62.5);
  });
});


it('uses as many pairs as needed of enabled gym discs', () => {
  const result = calculatePlateCombination(180, {
    unit: 'kg', barWeight: 20, collarWeight: 0, unlimitedPlates: true,
    plates: [{ weight: 25, quantity: 0 }, { weight: 20, quantity: 2 }, { weight: 15, quantity: 0 }],
  });
  expect(result.exact?.perSide).toEqual([{ weight: 20, count: 4 }]);
  expect(result.exact?.total).toBe(180);
});
