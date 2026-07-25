import { describe, expect, it } from 'vitest';
import { buildTrainingProgress, estimateOneRepMax, parseTrainingCsv } from './workout-progress';

const SAMPLE = `legs	squat		6x83kg
	isquio		10x41kg

chest	incline bench press		9x70kg
	peck deck		5x60kg

leg	squat		7x83kg
	isquio		8x45kg
	panto		12x25lb

back	supine		8x72kg
	gironda

legs	squat	3x100kg	6x90kg
	isquio		10x41kg
	panto

chest	incline bench press		5x80	4x75kg
	peck deck		6x60kg

legs	squat		6x100kg
	isquio		12x41kg

back	pull up lastrada		2x40kg	3x35kg	3x30kg	3x25kg
	supine pull up		11x63kg
	gironda		10x54kg

legs	squat		7x100kg
	isquio		10x50kg
	panto		15x15kg

chest	incline bench press		5x80kg	3x80kg	4x75kg	3x75kg
	peck dexk		10x70kg
	dips		20kg al fallo-19

back	Pull up con peso		6x73kg	4x73kg	3x76kg
	gironda		10x54kg
	dips		20x20kg`;

describe('parseTrainingCsv', () => {
  it('parses tab-separated workout blocks as ordered sessions', () => {
    const parsed = parseTrainingCsv(SAMPLE, 'sample.csv');

    expect(parsed.sessions).toHaveLength(11);
    expect(parsed.entries).toHaveLength(26);
    expect(parsed.sessions.map((session) => session.workout)).toEqual([
      'Legs',
      'Chest',
      'Legs',
      'Back',
      'Legs',
      'Chest',
      'Legs',
      'Back',
      'Legs',
      'Chest',
      'Back',
    ]);
  });

  it('expands a single set marker into four descending sets', () => {
    const parsed = parseTrainingCsv(SAMPLE, 'sample.csv');
    const firstSquat = parsed.entries.find((entry) => entry.exercise === 'Squat');

    expect(firstSquat?.sets.map((set) => set.reps)).toEqual([6, 5, 4, 3]);
    expect(firstSquat?.sets.map((set) => set.weightKg)).toEqual([83, 83, 83, 83]);
    expect(firstSquat?.sets.map((set) => set.inferred)).toEqual([false, true, true, true]);
  });

  it('keeps explicit sets and infers only the missing ones', () => {
    const parsed = parseTrainingCsv(SAMPLE, 'sample.csv');
    const backOffSquat = parsed.entries.find(
      (entry) => entry.exercise === 'Squat' && entry.sessionIndex === 5,
    );

    expect(backOffSquat?.sets.map((set) => `${set.reps}x${set.weightKg}`)).toEqual([
      '3x100',
      '6x90',
      '5x90',
      '4x90',
    ]);
  });

  it('handles lb and failure notation', () => {
    const parsed = parseTrainingCsv(SAMPLE, 'sample.csv');
    const panto = parsed.entries.find((entry) => entry.exercise === 'Panto');
    const failureDips = parsed.entries.find(
      (entry) => entry.exercise === 'Dips' && entry.sessionIndex === 10,
    );

    expect(panto?.sets[0].weightKg).toBe(11.3);
    expect(failureDips?.sets.map((set) => `${set.reps}x${set.weightKg}`)).toEqual([
      '19x20',
      '18x20',
      '17x20',
      '16x20',
    ]);
  });

  it('builds progress without week or month assumptions', () => {
    const parsed = parseTrainingCsv(SAMPLE, 'sample.csv');
    const legsSessions = parsed.sessions.filter((session) => session.workout === 'Legs');
    const progress = buildTrainingProgress(
      'Legs',
      legsSessions.flatMap((session) => session.entries),
      legsSessions,
    );

    expect(progress.stats.sessions).toBe(5);
    expect(progress.sessionSummaries.map((session) => session.label)).toEqual([
      '#1',
      '#3',
      '#5',
      '#7',
      '#9',
    ]);
    expect(progress.topMovements[0].latestSessionIndex).toBeGreaterThan(0);
  });
});

describe('estimateOneRepMax', () => {
  it('keeps a true single at the lifted weight', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it('uses the Epley estimate for multi-rep sets', () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
  });

  it('rejects invalid inputs', () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});
