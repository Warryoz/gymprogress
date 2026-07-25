import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  SecondaryStrengthTool,
  SecondaryStrengthToolId,
} from './secondary-strength-tool';

describe('SecondaryStrengthTool', () => {
  const create = async (
    tool: SecondaryStrengthToolId,
  ): Promise<ComponentFixture<SecondaryStrengthTool>> => {
    await TestBed.configureTestingModule({ imports: [SecondaryStrengthTool] }).compileComponents();
    const fixture = TestBed.createComponent(SecondaryStrengthTool);
    fixture.componentRef.setInput('tool', tool);
    fixture.detectChanges();
    return fixture;
  };

  const fillLabel = (
    fixture: ComponentFixture<SecondaryStrengthTool>,
    labelText: string,
    value: string,
  ): void => {
    const root = fixture.nativeElement as HTMLElement;
    const label = [...root.querySelectorAll('label')].find((item) =>
      item.textContent?.includes(labelText),
    );
    const input = label?.querySelector('input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const click = (
    fixture: ComponentFixture<SecondaryStrengthTool>,
    text: string,
  ): void => {
    const root = fixture.nativeElement as HTMLElement;
    [...root.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === text)
      ?.click();
    fixture.detectChanges();
  };

  it('calculates percentage loads only after manual input', async () => {
    const fixture = await create('percentages');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Aún no hay resultado');

    fillLabel(fixture, '1RM', '120');
    fillLabel(fixture, 'Porcentaje del 1RM', '80');
    click(fixture, 'Calcular carga');

    expect(root.textContent).toContain('96 kg');
    expect(root.textContent).toContain('95 kg');
    expect(root.textContent).toContain('Enviar a discos');
  });

  it('interprets notation without presenting an initial example as a result', async () => {
    const fixture = await create('notation');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Aún no hay resultado');

    fillLabel(fixture, 'Notación de entrenamiento', '4x8 @ 70kg RIR2');
    click(fixture, 'Interpretar notación');

    expect(root.textContent).toContain('4 × 8 @ 70 kg · RIR 2');
  });

  it('calculates volume from manually added sets', async () => {
    const fixture = await create('volume');
    const root = fixture.nativeElement as HTMLElement;

    fillLabel(fixture, 'Peso', '80');
    fillLabel(fixture, 'Repeticiones', '8');
    click(fixture, 'Calcular volumen');

    expect(root.textContent).toContain('640 kg');
    expect(root.textContent).toContain('Repeticiones totales');
  });

  it('offers common rest presets', async () => {
    const fixture = await create('timer');
    const root = fixture.nativeElement as HTMLElement;

    click(fixture, '1:30 min');

    const input = root.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.value).toBe('90');
    expect(root.textContent).toContain('01:30');
  });
});
