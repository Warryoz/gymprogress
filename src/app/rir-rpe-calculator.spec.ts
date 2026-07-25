import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { RirRpeCalculator } from './rir-rpe-calculator';

describe('RirRpeCalculator', () => {
  it('starts empty and calculates a usable load from a manual 1RM', async () => {
    await TestBed.configureTestingModule({ imports: [RirRpeCalculator] }).compileComponents();
    const fixture = TestBed.createComponent(RirRpeCalculator);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('Aún no hay resultado');
    expect(root.textContent).not.toContain('0 kg');

    const loadMode = [...root.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Calcular carga desde 1RM'),
    );
    loadMode?.click();
    fixture.detectChanges();

    const inputFor = (labelText: string): HTMLInputElement => {
      const label = [...root.querySelectorAll('label')].find((item) =>
        item.textContent?.includes(labelText),
      );
      return label?.querySelector('input') as HTMLInputElement;
    };
    const fill = (input: HTMLInputElement, value: string): void => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };

    fill(inputFor('1RM conocido'), '120');
    fill(inputFor('Repeticiones objetivo'), '5');
    fill(inputFor('Esfuerzo objetivo'), '2');

    const calculate = [...root.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Calcular carga',
    );
    calculate?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('97,5 kg');
    expect(root.textContent).toContain('81,1 %');
    expect(root.textContent).toContain('Enviar a discos');
  });
});
