import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  WritableSignal,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { OneRepMaxFormula, WeightUnit, calculateEstimatedOneRepMax } from './strength-tools';
import {
  QuickToolId,
  VolumeSet,
  WarmupSet,
  calculateAdjustedReps,
  calculateDoubleProgression,
  calculateEquivalentPerformances,
  calculateRirAdjustedOneRepMax,
  calculateTrainingVolume,
  compareSetEffort,
  convertRirToRpe,
  convertRpeToRir,
  convertWeightUnit,
  estimateTargetLoadByRir,
  formatTrainingNotation,
  generateWarmupSets,
  parseTrainingNotation,
} from './quick-strength-tools';
import { TechnicalTooltip } from './technical-tooltip';

export interface QuickLastSet {
  weight: number;
  reps: number;
  unit: WeightUnit;
  rir?: number | null;
}

@Component({
  selector: 'app-quick-tools-drawer',
  imports: [TechnicalTooltip],
  templateUrl: './quick-tools-drawer.html',
  styleUrl: './quick-tools-drawer.css',
})
export class QuickToolsDrawer implements AfterViewInit, OnDestroy {
  public readonly selectedExercise = input('');
  public readonly lastSet = input<QuickLastSet | null>(null);
  public readonly unit = input.required<WeightUnit>();
  public readonly increment = input(2.5);
  public readonly barWeight = input(20);
  public readonly close = output<void>();
  public readonly sendToPlates = output<number>();
  public readonly applyWeight = output<number>();
  public readonly applyConverted = output<{ value: number; unit: WeightUnit }>();
  public readonly applyNotation = output<string>();

  protected readonly selectedTool = signal<QuickToolId | null>(null);
  protected readonly announcement = signal('');

  protected readonly weight = signal(80);
  protected readonly reps = signal(8);
  protected readonly effortScale = signal<'rir' | 'rpe'>('rir');
  protected readonly effortValue = signal(2);
  protected readonly targetRir = signal(2);
  protected readonly formula = signal<OneRepMaxFormula>('epley');

  protected readonly notationRaw = signal('4x8 @ 70kg RIR2');
  protected readonly notationSets = signal(4);
  protected readonly notationReps = signal('8');
  protected readonly notationLoad = signal(70);
  protected readonly notationEffort = signal(2);
  protected readonly notationTempo = signal('');
  protected readonly notationRest = signal('');

  protected readonly targetReps = signal(8);
  protected readonly targetCurrentRir = signal(3);
  protected readonly targetEffort = signal(1);
  protected readonly equivalentRir = signal(0);

  protected readonly warmupLevel = signal<'short' | 'normal' | 'extensive'>('normal');
  protected readonly warmupAccessory = signal(false);
  protected readonly warmupSets = signal<WarmupSet[]>([]);

  protected readonly progressionSets = signal(3);
  protected readonly progressionMin = signal(8);
  protected readonly progressionMax = signal(12);
  protected readonly progressionRir = signal(2);
  protected readonly progressionRecordedRir = signal(2);
  protected readonly progressionResults = signal('12, 11, 10');

  protected readonly volumeSets = signal<VolumeSet[]>([
    { weight: 80, reps: 8, unit: 'kg' },
    { weight: 80, reps: 7, unit: 'kg' },
    { weight: 75, reps: 9, unit: 'kg' },
  ]);

  protected readonly compareAWeight = signal(80);
  protected readonly compareAReps = signal(8);
  protected readonly compareARir = signal(2);
  protected readonly compareBWeight = signal(85);
  protected readonly compareBReps = signal(6);
  protected readonly compareBRir = signal(1);

  protected readonly timerPreset = signal(90);
  protected readonly timerCustom = signal(150);
  protected readonly timerCategory = signal<'main' | 'accessory' | 'activation' | 'isometric'>(
    'main',
  );
  protected readonly timerRemaining = signal(90);
  protected readonly timerRunning = signal(false);
  protected readonly timerNotify = signal(false);
  private timerId: ReturnType<typeof setInterval> | null = null;

  protected readonly converterValue = signal(100);
  protected readonly converterFrom = signal<WeightUnit>('kg');

  public constructor(private readonly host: ElementRef<HTMLElement>) {
    this.loadTimerPreference('main');
  }

  public ngAfterViewInit(): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLButtonElement>('.close-button')?.focus(), 0);
  }

  protected readonly tools: Array<{
    id: QuickToolId;
    icon: string;
    title: string;
    description: string;
  }> = [
    { id: 'effort', icon: 'R', title: 'RIR y RPE', description: 'Interpreta el esfuerzo de una serie.' },
    { id: 'notation', icon: '@', title: 'Notación @', description: 'Lee y genera prescripciones compactas.' },
    { id: 'targetLoad', icon: '↗', title: 'Carga objetivo', description: 'Estima un peso para otro RIR.' },
    { id: 'equivalences', icon: '≈', title: 'Equivalencias', description: 'Compara rendimientos por repeticiones.' },
    { id: 'warmup', icon: 'W', title: 'Calentamiento', description: 'Genera series de aproximación.' },
    { id: 'progression', icon: '+', title: 'Progresión', description: 'Aplica doble progresión y RIR.' },
    { id: 'volume', icon: 'Σ', title: 'Volumen', description: 'Resume el trabajo de varias series.' },
    { id: 'effortComparison', icon: '⇄', title: 'Comparar esfuerzo', description: 'Contrasta dos series sin simplificar.' },
    { id: 'timer', icon: '◷', title: 'Temporizador', description: 'Controla tu descanso entre series.' },
    { id: 'converter', icon: 'kg', title: 'kg / lb', description: 'Convierte pesos sin perder precisión.' },
  ];

  protected readonly normalizedRir = computed(() =>
    this.effortScale() === 'rir'
      ? validRange(this.effortValue(), 0, 5)
      : convertRpeToRir(this.effortValue()),
  );

  protected readonly effortResult = computed(() => {
    const rir = this.normalizedRir();
    const direct = calculateEstimatedOneRepMax(this.weight(), this.reps(), this.formula());
    return {
      rir,
      rpe: rir === null ? null : convertRirToRpe(rir),
      potentialReps: rir === null ? 0 : calculateAdjustedReps(this.reps(), rir),
      direct,
      adjusted:
        rir === null
          ? 0
          : calculateRirAdjustedOneRepMax(this.weight(), this.reps(), rir, this.formula()),
      interpretation:
        rir === null
          ? 'Introduce un esfuerzo válido.'
          : rir < this.targetRir()
            ? 'Terminaste más cerca del fallo de lo programado.'
            : rir > this.targetRir()
              ? 'El esfuerzo fue menor que el objetivo; podrías aumentar repeticiones o carga.'
              : 'Serie exigente, pero dentro del esfuerzo objetivo.',
    };
  });

  protected readonly parsedNotation = computed(() => parseTrainingNotation(this.notationRaw()));

  protected readonly generatedNotation = computed(() =>
    formatTrainingNotation({
      sets: this.notationSets(),
      repsOrTime: this.notationReps(),
      load: this.notationLoad(),
      unit: this.unit(),
      effortScale: 'rir',
      effort: this.notationEffort(),
      percentage: null,
      tempo: this.notationTempo(),
      rest: this.notationRest(),
    }),
  );

  protected readonly targetLoad = computed(() =>
    estimateTargetLoadByRir({
      currentWeight: this.weight(),
      currentReps: this.reps(),
      currentRir: this.targetCurrentRir(),
      targetReps: this.targetReps(),
      targetRir: this.targetEffort(),
      increment: this.increment(),
    }),
  );

  protected readonly equivalents = computed(() =>
    calculateEquivalentPerformances({
      weight: this.weight(),
      reps: this.reps(),
      rir: this.equivalentRir(),
      targetReps: [2, 4, 6, 8, 10, 12],
      increment: this.increment(),
      unit: this.unit(),
      formula: this.formula(),
    }),
  );

  protected readonly progression = computed(() =>
    calculateDoubleProgression({
      weight: this.weight(),
      reps: this.progressionResults()
        .split(/[,;\s]+/)
        .map(Number)
        .filter((value) => Number.isFinite(value) && value > 0)
        .slice(0, this.progressionSets()),
      recordedRir: validRange(this.progressionRecordedRir(), 0, 5),
      targetMinReps: this.progressionMin(),
      targetMaxReps: this.progressionMax(),
      targetRir: this.progressionRir(),
      increment: this.increment(),
    }),
  );

  protected readonly volume = computed(() =>
    calculateTrainingVolume(this.volumeSets(), this.unit()),
  );

  protected readonly effortComparison = computed(() =>
    compareSetEffort(
      {
        weight: this.compareAWeight(),
        reps: this.compareAReps(),
        rir: this.compareARir(),
        unit: this.unit(),
      },
      {
        weight: this.compareBWeight(),
        reps: this.compareBReps(),
        rir: this.compareBRir(),
        unit: this.unit(),
      },
    ),
  );

  protected readonly convertedWeight = computed(() =>
    convertWeightUnit(
      this.converterValue(),
      this.converterFrom(),
      this.converterFrom() === 'kg' ? 'lb' : 'kg',
    ),
  );

  protected readonly timerLabel = computed(() => {
    const minutes = Math.floor(this.timerRemaining() / 60);
    const seconds = this.timerRemaining() % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  public ngOnDestroy(): void {
    this.clearTimer();
  }

  @HostListener('document:keydown.escape')
  protected closeWithEscape(): void {
    if (this.selectedTool()) {
      this.selectedTool.set(null);
    } else {
      this.close.emit();
    }
  }

  protected selectTool(id: QuickToolId): void {
    this.selectedTool.set(id);
    if (id === 'volume') {
      this.volumeSets.update((sets) =>
        sets.map((set) => ({
          ...set,
          weight: convertWeightUnit(set.weight, set.unit, this.unit()),
          unit: this.unit(),
        })),
      );
    }
    this.announcement.set(`${this.toolTitle(id)} abierta.`);
  }

  protected toolTitle(id: QuickToolId): string {
    return this.tools.find((tool) => tool.id === id)?.title ?? '';
  }

  protected useLastSeries(): void {
    const last = this.lastSet();
    if (!last) {
      this.announcement.set('No hay una última serie disponible.');
      return;
    }
    const weight = convertWeightUnit(last.weight, last.unit, this.unit());
    this.weight.set(weight);
    this.reps.set(last.reps);
    if (last.rir != null) {
      this.effortScale.set('rir');
      this.effortValue.set(last.rir);
      this.targetCurrentRir.set(last.rir);
      this.equivalentRir.set(last.rir);
      this.progressionRecordedRir.set(last.rir);
    }
    this.announcement.set('Última serie aplicada.');
  }

  protected generateWarmup(): void {
    this.warmupSets.set(
      generateWarmupSets({
        workingWeight: this.weight(),
        barWeight: this.barWeight(),
        unit: this.unit(),
        level: this.warmupLevel(),
        accessory: this.warmupAccessory(),
        increment: this.increment(),
      }),
    );
  }

  protected updateWarmup(index: number, field: 'weight' | 'reps', event: Event): void {
    const value = numberFrom(event);
    this.warmupSets.update((sets) =>
      sets.map((set, itemIndex) => (itemIndex === index ? { ...set, [field]: value } : set)),
    );
  }

  protected removeWarmup(index: number): void {
    this.warmupSets.update((sets) => sets.filter((_, itemIndex) => itemIndex !== index));
  }

  protected addVolumeSet(): void {
    this.volumeSets.update((sets) => [
      ...sets,
      { weight: this.weight(), reps: this.reps(), unit: this.unit() },
    ]);
  }

  protected updateVolumeSet(index: number, field: 'weight' | 'reps', event: Event): void {
    const value = numberFrom(event);
    this.volumeSets.update((sets) =>
      sets.map((set, itemIndex) =>
        itemIndex === index ? { ...set, [field]: value, unit: this.unit() } : set,
      ),
    );
  }

  protected removeVolumeSet(index: number): void {
    this.volumeSets.update((sets) => sets.filter((_, itemIndex) => itemIndex !== index));
  }

  protected setTimer(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 1) return;
    this.pauseTimer();
    const rounded = Math.round(seconds);
    this.timerPreset.set(rounded);
    this.timerRemaining.set(rounded);
    try {
      localStorage.setItem(`gym-progress-rest-${this.timerCategory()}`, String(rounded));
    } catch {
      // The timer remains functional without persistence.
    }
  }

  protected setTimerCategory(value: string): void {
    const category = value as 'main' | 'accessory' | 'activation' | 'isometric';
    this.timerCategory.set(category);
    this.loadTimerPreference(category);
  }

  protected startTimer(): void {
    if (this.timerRemaining() <= 0) this.timerRemaining.set(this.timerPreset());
    if (this.timerId) return;
    this.timerRunning.set(true);
    this.timerId = setInterval(() => {
      const next = Math.max(this.timerRemaining() - 1, 0);
      this.timerRemaining.set(next);
      if (next === 0) {
        this.pauseTimer();
        this.announcement.set('Descanso terminado.');
        if (this.timerNotify() && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(180);
        }
        if (
          this.timerNotify() &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          new Notification('Gym Progress', { body: 'Tu descanso terminó.' });
        }
      }
    }, 1000);
  }

  protected pauseTimer(): void {
    this.clearTimer();
    this.timerRunning.set(false);
  }

  protected resetTimer(): void {
    this.pauseTimer();
    this.timerRemaining.set(this.timerPreset());
  }

  protected addTimerSeconds(seconds = 30): void {
    this.timerRemaining.update((value) => value + seconds);
  }

  protected async toggleTimerNotifications(): Promise<void> {
    if (!this.timerNotify() && typeof Notification !== 'undefined') {
      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      this.timerNotify.set(permission === 'granted');
      this.announcement.set(
        permission === 'granted'
          ? 'Avisos del temporizador activados.'
          : 'No se activaron las notificaciones.',
      );
      return;
    }
    this.timerNotify.update((value) => !value);
  }

  protected async copyNotation(value: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.announcement.set('Notación copiada.');
    } catch {
      this.announcement.set('No se pudo copiar automáticamente.');
    }
  }

  protected sendLoad(weight: number): void {
    if (weight <= 0) return;
    this.sendToPlates.emit(weight);
  }

  protected applyConvertedValue(): void {
    const targetUnit = this.converterFrom() === 'kg' ? 'lb' : 'kg';
    this.applyConverted.emit({ value: this.convertedWeight(), unit: targetUnit });
    this.announcement.set('Peso convertido aplicado.');
  }

  protected inputNumber(target: WritableSignal<number>, event: Event): void {
    target.set(numberFrom(event));
  }

  protected setEffortScale(value: string): void {
    this.effortScale.set(value as 'rir' | 'rpe');
    this.effortValue.set(value === 'rir' ? 2 : 8);
  }

  protected format(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private loadTimerPreference(
    category: 'main' | 'accessory' | 'activation' | 'isometric',
  ): void {
    const defaults = { main: 180, accessory: 90, activation: 45, isometric: 60 };
    let seconds = defaults[category];
    try {
      const stored = Number(localStorage.getItem(`gym-progress-rest-${category}`));
      if (Number.isFinite(stored) && stored > 0) seconds = stored;
    } catch {
      // Use the category default.
    }
    this.pauseTimer();
    this.timerPreset.set(seconds);
    this.timerRemaining.set(seconds);
  }
}

function numberFrom(event: Event): number {
  const value = Number((event.target as HTMLInputElement).value);
  return Number.isFinite(value) ? value : 0;
}

function validRange(value: number, min: number, max: number): number | null {
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}
