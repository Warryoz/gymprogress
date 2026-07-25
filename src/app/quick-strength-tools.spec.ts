import { describe, expect, it } from 'vitest';
import {
  calculateDoubleProgression,
  calculateEquivalentPerformances,
  calculateRirAdjustedOneRepMax,
  calculateTrainingVolume,
  compareSetEffort,
  convertRirToRpe,
  convertRpeToRir,
  estimateLoadFromOneRepMax,
  estimateTargetLoadByRir,
  formatTrainingNotation,
  generateWarmupSets,
  parseTrainingNotation,
} from './quick-strength-tools';

describe('quick strength tools', () => {
  it('converts valid RIR and RPE values and rejects invalid ranges', () => {
    expect(convertRirToRpe(2)).toBe(8);
    expect(convertRpeToRir(8)).toBe(2);
    expect(convertRirToRpe(6)).toBeNull();
    expect(convertRpeToRir(4)).toBeNull();
  });

  it('calculates direct effort-adjusted 1RM', () => {
    expect(calculateRirAdjustedOneRepMax(80, 8, 2)).toBe(106.7);
  });

  it('estimates a usable load from a manually entered 1RM and target effort', () => {
    expect(
      estimateLoadFromOneRepMax({
        oneRepMax: 120,
        targetReps: 5,
        targetRir: 2,
        increment: 2.5,
      }),
    ).toMatchObject({
      calculated: 97.3,
      usable: 97.5,
      lower: 95,
      upper: 100,
      percentage: 81.1,
    });
  });

  it('parses and normalizes load and RIR notation', () => {
    expect(parseTrainingNotation('4x8 @ 70kg').normalized).toBe('4 × 8 @ 70 kg');
    expect(parseTrainingNotation('3 × 10 @ RIR 2').normalized).toBe('3 × 10 @ RIR 2');
    expect(parseTrainingNotation('4x8 @ 70kg RIR2').normalized).toBe(
      '4 × 8 @ 70 kg · RIR 2',
    );
  });

  it('flags context-free @ values as ambiguous', () => {
    const parsed = parseTrainingNotation('5x5 @8');
    expect(parsed.ambiguous).toBe(true);
    expect(parsed.valid).toBe(false);
  });

  it('formats generated notation with optional details', () => {
    expect(
      formatTrainingNotation({
        sets: 4,
        repsOrTime: '8',
        load: 70,
        unit: 'kg',
        effortScale: 'rir',
        effort: 2,
        percentage: null,
        tempo: '3-1-1',
        rest: '2 min',
      }),
    ).toBe('4 × 8 @ 70 kg · RIR 2 · tempo 3-1-1 · descanso 2 min');
  });

  it('estimates a practical target load range from RIR', () => {
    const estimate = estimateTargetLoadByRir({
      currentWeight: 80,
      currentReps: 8,
      currentRir: 3,
      targetReps: 8,
      targetRir: 1,
      increment: 2.5,
    });
    expect(estimate.estimated).toBeGreaterThan(80);
    expect(estimate.lower).toBeLessThanOrEqual(estimate.estimated);
    expect(estimate.upper).toBeGreaterThanOrEqual(estimate.estimated);
  });

  it('calculates equivalent performances rounded to the available increment', () => {
    const equivalents = calculateEquivalentPerformances({
      weight: 80,
      reps: 8,
      targetReps: [6, 4, 10],
      increment: 2.5,
      unit: 'kg',
    });
    expect(equivalents.map((item) => item.reps)).toEqual([6, 4, 10]);
    expect(equivalents.every((item) => item.weight % 2.5 === 0)).toBe(true);
  });

  it('generates fatigue-conscious warmup sets below the working weight', () => {
    const warmup = generateWarmupSets({
      workingWeight: 100,
      barWeight: 20,
      unit: 'kg',
      level: 'normal',
      accessory: false,
      increment: 2.5,
    });
    expect(warmup[0]).toMatchObject({ weight: 20, reps: 10 });
    expect(warmup.every((set) => set.weight < 100)).toBe(true);
    expect(warmup.at(-1)?.reps).toBe(1);
  });

  it('applies double progression rules', () => {
    const result = calculateDoubleProgression({
      weight: 80,
      reps: [12, 12, 12],
      recordedRir: 2,
      targetMinReps: 8,
      targetMaxReps: 12,
      targetRir: 2,
      increment: 2.5,
      comparableSessions: 3,
    });
    expect(result.action).toBe('increase');
    expect(result.suggestedWeight).toBe(82.5);
    expect(result.confidence).toBe('alta');
  });

  it('calculates volume for mixed loads', () => {
    expect(
      calculateTrainingVolume([
        { weight: 80, reps: 8, unit: 'kg' },
        { weight: 80, reps: 7, unit: 'kg' },
        { weight: 75, reps: 9, unit: 'kg' },
      ]),
    ).toMatchObject({
      totalVolume: 1875,
      totalReps: 24,
      maxWeight: 80,
      setCount: 3,
    });
  });

  it('compares effort without forcing a better/worse conclusion', () => {
    const comparison = compareSetEffort(
      { weight: 80, reps: 8, rir: 2, unit: 'kg' },
      { weight: 85, reps: 6, rir: 1, unit: 'kg' },
    );
    expect(comparison.status).toBeTruthy();
    expect(comparison.adjustedOneRepMaxA).toBeGreaterThan(0);
    expect(comparison.adjustedOneRepMaxB).toBeGreaterThan(0);
  });

  it('handles empty and invalid inputs safely', () => {
    expect(parseTrainingNotation('').valid).toBe(false);
    expect(calculateTrainingVolume([]).totalVolume).toBe(0);
    expect(
      generateWarmupSets({
        workingWeight: 0,
        barWeight: 20,
        unit: 'kg',
        level: 'normal',
        accessory: false,
        increment: 2.5,
      }),
    ).toEqual([]);
  });
});
