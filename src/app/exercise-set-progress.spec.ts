import { describe, expect, it } from 'vitest';
import { plannedSetCount } from './exercise-set-progress';

describe('plannedSetCount', () => {
  it('reads fixed and ranged prescriptions', () => {
    expect(plannedSetCount('4')).toBe(4);
    expect(plannedSetCount('2–3')).toBe(3);
    expect(plannedSetCount('3-5')).toBe(5);
  });

  it('does not create a tracker for non-numeric rehabilitation prescriptions', () => {
    expect(plannedSetCount('Según fisio')).toBe(0);
  });
});
