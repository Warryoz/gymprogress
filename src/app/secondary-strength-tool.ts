import { Component, OnDestroy, OnInit, WritableSignal, computed, input, output, signal } from '@angular/core';
import { CalculatorHeader } from './calculator-header';
import { CalculatorInstructions } from './calculator-instructions';
import {
  WarmupSet,
  calculateTrainingVolume,
  calculateEquivalentPerformances,
  generateWarmupSets,
  parseTrainingNotation,
} from './quick-strength-tools';
import { TechnicalTooltip } from './technical-tooltip';
import { WeightUnit, roundToAvailableIncrement } from './strength-tools';

export type SecondaryStrengthToolId =
  | 'percentages'
  | 'equivalences'
  | 'notation'
  | 'warmup'
  | 'timer'
  | 'volume';

interface ManualVolumeSet {
  id: number;
  weight: number | null;
  reps: number | null;
}

@Component({
  selector: 'app-secondary-strength-tool',
  imports: [CalculatorHeader, CalculatorInstructions, TechnicalTooltip],
  templateUrl: './secondary-strength-tool.html',
  styleUrl: './secondary-strength-tool.css',
})
export class SecondaryStrengthTool implements OnInit, OnDestroy {
  public readonly tool = input.required<SecondaryStrengthToolId>();
  public readonly initialUnit = input<WeightUnit>('kg');
  public readonly sendToPlates = output<{ weight: number; unit: WeightUnit }>();

  protected readonly unit = signal<WeightUnit>('kg');
  protected readonly increment = signal(2.5);
  protected readonly attempted = signal(false);
  protected readonly calculated = signal(false);

  protected readonly oneRepMax = signal<number | null>(null);
  protected readonly percentage = signal<number | null>(null);

  protected readonly sourceWeight = signal<number | null>(null);
  protected readonly sourceReps = signal<number | null>(null);
  protected readonly sourceRir = signal<number | null>(null);
  protected readonly targetReps = signal<number | null>(null);

  protected readonly notationRaw = signal('');

  protected readonly workingWeight = signal<number | null>(null);
  protected readonly barWeight = signal<number | null>(null);
  protected readonly warmupLevel = signal<'short' | 'normal' | 'extensive'>('normal');
  protected readonly warmupAccessory = signal(false);
  protected readonly warmupSets = signal<WarmupSet[]>([]);

  protected readonly timerSeconds = signal<number | null>(null);
  protected readonly timerRemaining = signal(0);
  protected readonly timerRunning = signal(false);
  protected readonly volumeSets = signal<ManualVolumeSet[]>([{ id: 1, weight: null, reps: null }]);
  private nextVolumeSetId = 2;
  private timerId: ReturnType<typeof setInterval> | null = null;

  protected readonly metadata = computed(() => {
    const data: Record<SecondaryStrengthToolId, { category: string; title: string; description: string }> = {
      percentages: {
        category: 'Fuerza · Cálculo manual',
        title: 'Cargas por porcentaje',
        description: 'Convierte un 1RM introducido manualmente en una carga de entrenamiento.',
      },
      equivalences: {
        category: 'Fuerza · Cálculo manual',
        title: 'Equivalencia de repeticiones',
        description: 'Estima qué peso usar para cambiar el número de repeticiones.',
      },
      notation: {
        category: 'Esfuerzo · Interpretación',
        title: 'Notación @',
        description: 'Traduce una prescripción compacta a datos fáciles de entender.',
      },
      warmup: {
        category: 'Preparación · Cálculo manual',
        title: 'Calentamiento',
        description: 'Genera series progresivas antes de tu peso de trabajo.',
      },
      timer: {
        category: 'Preparación',
        title: 'Temporizador de descanso',
        description: 'Controla el descanso entre series sin salir del entrenamiento.',
      },
      volume: {
        category: 'Seguimiento · Cálculo manual',
        title: 'Volumen de entrenamiento',
        description: 'Suma series × repeticiones × peso para una sesión.',
      },
    };
    return data[this.tool()];
  });

  protected readonly validation = computed(() => {
    switch (this.tool()) {
      case 'percentages':
        if ((this.oneRepMax() ?? 0) <= 0) return 'Introduce un 1RM mayor que cero.';
        if ((this.percentage() ?? 0) < 1 || (this.percentage() ?? 0) > 100) {
          return 'El porcentaje debe estar entre 1 y 100.';
        }
        return null;
      case 'equivalences':
        if ((this.sourceWeight() ?? 0) <= 0) return 'Introduce un peso mayor que cero.';
        if ((this.sourceReps() ?? 0) < 1 || (this.sourceReps() ?? 0) > 20) {
          return 'Las repeticiones actuales deben estar entre 1 y 20.';
        }
        if ((this.sourceRir() ?? -1) < 0 || (this.sourceRir() ?? -1) > 5) {
          return 'El RIR debe estar entre 0 y 5.';
        }
        if ((this.targetReps() ?? 0) < 1 || (this.targetReps() ?? 0) > 20) {
          return 'Las repeticiones objetivo deben estar entre 1 y 20.';
        }
        return null;
      case 'notation':
        return parseTrainingNotation(this.notationRaw()).valid
          ? null
          : parseTrainingNotation(this.notationRaw()).message ?? 'Revisa la notación.';
      case 'warmup':
        if ((this.workingWeight() ?? 0) <= 0) return 'Introduce un peso de trabajo mayor que cero.';
        if ((this.barWeight() ?? 0) < 0) return 'El peso de la barra no puede ser negativo.';
        if ((this.barWeight() ?? 0) > (this.workingWeight() ?? 0)) {
          return 'La barra no puede pesar más que el peso de trabajo.';
        }
        return null;
      case 'timer':
        return (this.timerSeconds() ?? 0) > 0
          ? null
          : 'Introduce una duración mayor que cero.';
      case 'volume':
        return this.volumeSets().length > 0 &&
          this.volumeSets().every((set) => (set.weight ?? 0) > 0 && (set.reps ?? 0) > 0)
          ? null
          : 'Completa el peso y las repeticiones de todas las series.';
    }
  });

  protected readonly percentageResult = computed(() => {
    const calculated = (this.oneRepMax() ?? 0) * ((this.percentage() ?? 0) / 100);
    return {
      calculated,
      usable: roundToAvailableIncrement(calculated, this.increment()),
    };
  });

  protected readonly equivalentResult = computed(() =>
    calculateEquivalentPerformances({
      weight: this.sourceWeight() ?? 0,
      reps: this.sourceReps() ?? 0,
      rir: this.sourceRir() ?? 0,
      targetReps: [this.targetReps() ?? 0],
      increment: this.increment(),
      unit: this.unit(),
    }).at(0) ?? null,
  );

  protected readonly parsedNotation = computed(() => parseTrainingNotation(this.notationRaw()));

  protected readonly volumeResult = computed(() =>
    calculateTrainingVolume(
      this.volumeSets().map((set) => ({
        weight: set.weight ?? 0,
        reps: set.reps ?? 0,
        unit: this.unit(),
      })),
    ),
  );

  protected readonly timerLabel = computed(() => {
    if (this.timerSeconds() === null) return '--:--';
    const seconds = Math.max(this.timerRemaining(), 0);
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60)
      .toString()
      .padStart(2, '0')}`;
  });

  public ngOnInit(): void {
    this.unit.set(this.initialUnit());
    this.increment.set(this.initialUnit() === 'kg' ? 2.5 : 5);
  }

  public ngOnDestroy(): void {
    this.stopTimer();
  }

  protected calculate(): void {
    this.attempted.set(true);
    if (this.validation()) {
      this.calculated.set(false);
      return;
    }
    if (this.tool() === 'warmup') {
      this.warmupSets.set(
        generateWarmupSets({
          workingWeight: this.workingWeight() ?? 0,
          barWeight: this.barWeight() ?? 0,
          unit: this.unit(),
          level: this.warmupLevel(),
          accessory: this.warmupAccessory(),
          increment: this.increment(),
        }),
      );
    }
    this.calculated.set(true);
  }

  protected startTimer(): void {
    this.attempted.set(true);
    if (this.validation()) return;
    if (this.timerRemaining() <= 0) this.timerRemaining.set(this.timerSeconds() ?? 0);
    if (this.timerRunning()) return;
    this.timerRunning.set(true);
    this.calculated.set(true);
    this.timerId = setInterval(() => {
      this.timerRemaining.update((remaining) => Math.max(remaining - 1, 0));
      if (this.timerRemaining() === 0) this.stopTimer();
    }, 1000);
  }

  protected pauseTimer(): void {
    this.stopTimer();
  }

  protected resetTimer(): void {
    this.stopTimer();
    this.timerRemaining.set(this.timerSeconds() ?? 0);
    this.calculated.set(false);
  }

  protected setUnit(unit: WeightUnit): void {
    this.unit.set(unit);
    this.increment.set(unit === 'kg' ? 2.5 : 5);
    this.resetCalculation();
  }

  protected inputNumber(target: WritableSignal<number | null>, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    target.set(raw === '' ? null : Number(raw));
    if (target === this.timerSeconds) this.timerRemaining.set(raw === '' ? 0 : Number(raw));
    this.resetCalculation();
  }

  protected inputNotation(event: Event): void {
    this.notationRaw.set((event.target as HTMLInputElement).value);
    this.resetCalculation();
  }

  protected inputIncrement(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.increment.set(raw === '' ? 0 : Number(raw));
    this.resetCalculation();
  }

  protected updateVolumeSet(id: number, field: 'weight' | 'reps', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? null : Number(raw);
    this.volumeSets.update((sets) =>
      sets.map((set) => (set.id === id ? { ...set, [field]: value } : set)),
    );
    this.resetCalculation();
  }

  protected addVolumeSet(): void {
    this.volumeSets.update((sets) => [
      ...sets,
      { id: this.nextVolumeSetId++, weight: null, reps: null },
    ]);
    this.resetCalculation();
  }

  protected removeVolumeSet(id: number): void {
    this.volumeSets.update((sets) => sets.filter((set) => set.id !== id));
    this.resetCalculation();
  }

  protected format(value: number): string {
    return Number.isFinite(value)
      ? value.toLocaleString('es-CO', { maximumFractionDigits: 1 })
      : '—';
  }

  protected sendWeight(weight: number): void {
    if (this.calculated() && weight > 0) this.sendToPlates.emit({ weight, unit: this.unit() });
  }

  protected resetCalculation(): void {
    if (this.tool() === 'timer') this.stopTimer();
    this.attempted.set(false);
    this.calculated.set(false);
  }

  private stopTimer(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this.timerRunning.set(false);
  }
}
