import { TestBed } from '@angular/core/testing';
import { WarmupModal } from './warmup-modal';

describe('WarmupModal', () => {
  function create(load: string, barbell = true) {
    const fixture = TestBed.createComponent(WarmupModal);
    fixture.componentRef.setInput('exercise', 'Press banca');
    fixture.componentRef.setInput('suggestedLoad', load);
    fixture.componentRef.setInput('barbell', barbell);
    fixture.componentInstance.ngOnInit();
    return fixture.componentInstance;
  }

  it('keeps approximations ascending and below the working weight', () => {
    const modal = create('62,5 kg');
    const weights = modal.sets().map(set => set.weight);
    expect(weights).toEqual([20, 37.5, 52.5]);
    expect(weights.every(weight => weight < modal.weight())).toBe(true);
  });

  it('does not mistake percentages or descriptive loads for absolute weights', () => {
    expect(create('70% 1RM').valid()).toBe(false);
    expect(create('Peso corporal').sets()).toEqual([]);
  });

  it('avoids empty-bar loads for dumbbells and duplicate light loads', () => {
    const modal = create('5 kg', false);
    expect(modal.sets().map(set => set.weight)).toEqual([2.5]);
  });

  it('rejects invalid weights and a bar heavier than the working load', () => {
    const modal = create('10 kg');
    expect(modal.valid()).toBe(false);
    modal.weight.set(Number.NaN);
    expect(modal.sets()).toEqual([]);
  });
});
