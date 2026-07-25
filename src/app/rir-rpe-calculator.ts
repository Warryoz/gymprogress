import { Component, OnInit, computed, input, output, signal } from '@angular/core';
import { CalculatorHeader } from './calculator-header';
import { CalculatorInstructions } from './calculator-instructions';
import {
  calculateAdjustedReps,
  convertRirToRpe,
  convertRpeToRir,
  estimateLoadFromOneRepMax,
} from './quick-strength-tools';
import { TechnicalTooltip } from './technical-tooltip';
import { WeightUnit } from './strength-tools';

export interface RirHistorySet {
  exercise: string;
  sessionIndex: number;
  weight: number;
  reps: number;
  unit: WeightUnit;
  rir: number | null;
}

export interface StoredOneRepMax {
  exercise: string;
  sessionIndex: number;
  value: number;
  unit: WeightUnit;
}

type RirMode = 'interpret' | 'load';
type EffortScale = 'rir' | 'rpe';
type DataSource = 'manual' | 'history';

@Component({
  selector: 'app-rir-rpe-calculator',
  imports: [CalculatorHeader, CalculatorInstructions, TechnicalTooltip],
  templateUrl: './rir-rpe-calculator.html',
  styleUrl: './rir-rpe-calculator.css',
})
export class RirRpeCalculator implements OnInit {
  public readonly historySet = input<RirHistorySet | null>(null);
  public readonly storedOneRepMax = input<StoredOneRepMax | null>(null);
  public readonly initialUnit = input<WeightUnit>('kg');
  public readonly sendToPlates = output<{ weight: number; unit: WeightUnit }>();

  protected readonly mode = signal<RirMode>('interpret');
  protected readonly dataSource = signal<DataSource>('manual');
  protected readonly calculated = signal(false);
  protected readonly attempted = signal(false);
  protected readonly weight = signal<number | null>(null);
  protected readonly reps = signal<number | null>(null);
  protected readonly effortScale = signal<EffortScale>('rir');
  protected readonly effort = signal<number | null>(null);
  protected readonly targetEffort = signal<number | null>(null);
  protected readonly oneRepMax = signal<number | null>(null);
  protected readonly increment = signal<number>(2.5);
  protected readonly unit = signal<WeightUnit>('kg');

  protected readonly normalizedRir = computed(() => {
    const effort = this.effort();
    if (effort === null) return null;
    return this.effortScale() === 'rir' ? effort : convertRpeToRir(effort);
  });

  protected readonly normalizedTargetRir = computed(() => {
    const effort = this.targetEffort();
    if (effort === null) return null;
    return this.effortScale() === 'rir' ? effort : convertRpeToRir(effort);
  });

  protected readonly validation = computed(() => {
    if (this.mode() === 'interpret') {
      if ((this.weight() ?? 0) <= 0) return 'Introduce un peso mayor que cero.';
      if ((this.reps() ?? 0) < 1 || (this.reps() ?? 0) > 20) {
        return 'Las repeticiones deben estar entre 1 y 20.';
      }
      if (this.normalizedRir() === null) {
        return this.effortScale() === 'rir'
          ? 'El RIR debe estar entre 0 y 5.'
          : 'El RPE debe estar entre 5 y 10.';
      }
      if (this.targetEffort() !== null && this.normalizedTargetRir() === null) {
        return 'El esfuerzo objetivo no está dentro del rango válido.';
      }
      return null;
    }

    if ((this.oneRepMax() ?? 0) <= 0) return 'Introduce un 1RM mayor que cero.';
    if ((this.reps() ?? 0) < 1 || (this.reps() ?? 0) > 20) {
      return 'Las repeticiones deben estar entre 1 y 20.';
    }
    if (this.normalizedRir() === null) {
      return this.effortScale() === 'rir'
        ? 'El RIR objetivo debe estar entre 0 y 5.'
        : 'El RPE objetivo debe estar entre 5 y 10.';
    }
    if (!Number.isFinite(this.increment()) || this.increment() <= 0) {
      return 'El incremento debe ser mayor que cero.';
    }
    return null;
  });

  protected readonly interpretation = computed(() => {
    const rir = this.normalizedRir();
    if (rir === null || this.reps() === null) return null;
    const description =
      rir === 0
        ? 'Esfuerzo máximo: terminaste sin repeticiones disponibles.'
        : rir <= 1
          ? 'Esfuerzo muy alto: estabas muy cerca del fallo.'
          : rir <= 2
            ? 'Esfuerzo alto y normalmente útil para trabajo de fuerza.'
            : rir <= 3
              ? 'Esfuerzo moderado: todavía conservabas margen.'
              : 'Esfuerzo controlado: la serie dejó bastante margen.';
    const target = this.normalizedTargetRir();
    const difference =
      target === null
        ? 'No definiste un esfuerzo objetivo.'
        : Math.abs(rir - target) < 0.05
          ? 'El esfuerzo coincidió con el objetivo.'
          : rir < target
            ? `La serie fue ${this.format(target - rir)} RIR más exigente que el objetivo.`
            : `La serie dejó ${this.format(rir - target)} repeticiones más de margen.`;
    return {
      rir,
      rpe: convertRirToRpe(rir),
      potentialReps: calculateAdjustedReps(this.reps() ?? 0, rir),
      description,
      difference,
    };
  });

  protected readonly loadEstimate = computed(() =>
    estimateLoadFromOneRepMax({
      oneRepMax: this.oneRepMax() ?? 0,
      targetReps: this.reps() ?? 0,
      targetRir: this.normalizedRir() ?? -1,
      increment: this.increment(),
    }),
  );

  public ngOnInit(): void {
    this.unit.set(this.initialUnit());
    this.increment.set(this.initialUnit() === 'kg' ? 2.5 : 5);
  }

  protected setMode(mode: RirMode): void {
    this.mode.set(mode);
    this.returnToManual();
  }

  protected calculate(): void {
    this.attempted.set(true);
    this.calculated.set(this.validation() === null);
  }

  protected useHistorySeries(): void {
    const set = this.historySet();
    if (!set) return;
    this.mode.set('interpret');
    this.weight.set(set.weight);
    this.reps.set(set.reps);
    this.unit.set(set.unit);
    this.effortScale.set('rir');
    this.effort.set(set.rir);
    this.targetEffort.set(null);
    this.dataSource.set('history');
    this.resetResult();
  }

  protected useStoredMaximum(): void {
    const maximum = this.storedOneRepMax();
    if (!maximum) return;
    this.mode.set('load');
    this.oneRepMax.set(maximum.value);
    this.unit.set(maximum.unit);
    this.dataSource.set('history');
    this.resetResult();
  }

  protected returnToManual(): void {
    this.dataSource.set('manual');
    this.weight.set(null);
    this.reps.set(null);
    this.effort.set(null);
    this.targetEffort.set(null);
    this.oneRepMax.set(null);
    this.unit.set(this.initialUnit());
    this.increment.set(this.initialUnit() === 'kg' ? 2.5 : 5);
    this.resetResult();
  }

  protected setScale(scale: EffortScale): void {
    this.effortScale.set(scale);
    this.effort.set(null);
    this.targetEffort.set(null);
    this.resetResult();
  }

  protected setUnit(unit: WeightUnit): void {
    this.unit.set(unit);
    this.increment.set(unit === 'kg' ? 2.5 : 5);
    this.dataSource.set('manual');
    this.resetResult();
  }

  protected inputNumber(target: ReturnType<typeof signal<number | null>>, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    target.set(raw === '' ? null : Number(raw));
    this.dataSource.set('manual');
    this.resetResult();
  }

  protected inputIncrement(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.increment.set(raw === '' ? 0 : Number(raw));
    this.resetResult();
  }

  protected format(value: number | null): string {
    return value === null || !Number.isFinite(value)
      ? '—'
      : value.toLocaleString('es-CO', { maximumFractionDigits: 1 });
  }

  protected applyToPlates(): void {
    const result = this.loadEstimate();
    if (this.calculated() && result.usable > 0) {
      this.sendToPlates.emit({ weight: result.usable, unit: this.unit() });
    }
  }

  private resetResult(): void {
    this.attempted.set(false);
    this.calculated.set(false);
  }
}
