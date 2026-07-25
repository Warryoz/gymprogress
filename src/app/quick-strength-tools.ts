import {
  OneRepMaxFormula,
  WeightUnit,
  calculateEstimatedOneRepMax,
  convertWeightUnit,
  roundToAvailableIncrement,
} from './strength-tools';

export type QuickToolId =
  | 'effort'
  | 'notation'
  | 'targetLoad'
  | 'equivalences'
  | 'warmup'
  | 'progression'
  | 'volume'
  | 'effortComparison'
  | 'timer'
  | 'converter';

export interface TrainingNotation {
  sets: number | null;
  repsOrTime: string;
  load: number | null;
  unit: WeightUnit | null;
  effortScale: 'rir' | 'rpe' | null;
  effort: number | null;
  percentage: number | null;
  tempo: string;
  rest: string;
}

export interface ParsedTrainingNotation extends TrainingNotation {
  raw: string;
  normalized: string;
  valid: boolean;
  ambiguous: boolean;
  message: string | null;
}

export interface TargetLoadEstimate {
  estimated: number;
  lower: number;
  upper: number;
  oneRepMax: number;
}

export interface OneRepMaxLoadEstimate {
  calculated: number;
  usable: number;
  lower: number;
  upper: number;
  percentage: number;
}

export interface EquivalentPerformance {
  reps: number;
  weight: number;
  unit: WeightUnit;
}

export interface WarmupSet {
  id: string;
  weight: number;
  reps: number;
  unit: WeightUnit;
  label: string;
}

export interface ProgressionResult {
  action: 'increase' | 'maintain' | 'reduce';
  suggestedWeight: number;
  recommendation: string;
  reason: string;
  target: string;
  confidence: 'alta' | 'media' | 'baja';
}

export interface VolumeSet {
  weight: number;
  reps: number;
  unit: WeightUnit;
}

export interface VolumeResult {
  totalVolume: number;
  totalReps: number;
  averageWeight: number;
  maxWeight: number;
  setCount: number;
  volumeBySet: number[];
  unit: WeightUnit;
}

export interface EffortSeries {
  weight: number;
  reps: number;
  rir: number;
  unit: WeightUnit;
}

export interface EffortComparison {
  status:
    | 'Rendimiento superior'
    | 'Rendimiento similar'
    | 'Mayor volumen'
    | 'Mayor intensidad'
    | 'Mayor esfuerzo'
    | 'Resultado mixto';
  summary: string;
  adjustedOneRepMaxA: number;
  adjustedOneRepMaxB: number;
  volumeA: number;
  volumeB: number;
  intensityA: number;
  intensityB: number;
}

export function convertRirToRpe(rir: number): number | null {
  return Number.isFinite(rir) && rir >= 0 && rir <= 5 ? round(10 - rir, 1) : null;
}

export function convertRpeToRir(rpe: number): number | null {
  return Number.isFinite(rpe) && rpe >= 5 && rpe <= 10 ? round(10 - rpe, 1) : null;
}

export function calculateAdjustedReps(reps: number, rir: number): number {
  if (!Number.isFinite(reps) || !Number.isFinite(rir) || reps < 0 || rir < 0 || rir > 5) {
    return 0;
  }
  return round(reps + rir, 1);
}

export function calculateRirAdjustedOneRepMax(
  weight: number,
  reps: number,
  rir: number,
  formula: OneRepMaxFormula = 'epley',
): number {
  const adjustedReps = calculateAdjustedReps(reps, rir);
  return adjustedReps > 0
    ? calculateEstimatedOneRepMax(weight, adjustedReps, formula)
    : 0;
}

export function parseTrainingNotation(raw: string): ParsedTrainingNotation {
  const source = raw.trim();
  const compact = source.replace(/,/g, '.').replace(/\s+/g, ' ');
  const prescription = compact.match(
    /^\s*(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(s|sec|seg|min)?/i,
  );
  const load = compact.match(/(?:@|\s)\s*(\d+(?:\.\d+)?)\s*(kg|lb)\b/i);
  const effort = compact.match(/(?:@|\s)\s*(RIR|RPE)\s*(\d+(?:\.\d+)?)/i);
  const percentage = compact.match(/@\s*(\d+(?:\.\d+)?)\s*%/i);
  const tempo = compact.match(/\btempo\s*([0-9xX-]+)/i);
  const rest = compact.match(/\b(?:descanso|rest)\s*([0-9.]+\s*(?:s|sec|min))/i);
  const ambiguousAt = compact.match(/@\s*(\d+(?:\.\d+)?)\s*$/);
  const effortScale = effort?.[1]?.toLowerCase() as 'rir' | 'rpe' | undefined;
  const effortValue = effort ? Number(effort[2]) : null;
  const invalidEffort =
    effortScale === 'rir'
      ? effortValue === null || effortValue < 0 || effortValue > 5
      : effortScale === 'rpe'
        ? effortValue === null || effortValue < 5 || effortValue > 10
        : false;
  const notation: TrainingNotation = {
    sets: prescription ? Number(prescription[1]) : null,
    repsOrTime: prescription
      ? `${prescription[2]}${prescription[3] ? ` ${normalizeTimeUnit(prescription[3])}` : ''}`
      : '',
    load: load ? Number(load[1]) : null,
    unit: load ? (load[2].toLowerCase() as WeightUnit) : null,
    effortScale: effortScale ?? null,
    effort: effortValue,
    percentage: percentage ? Number(percentage[1]) : null,
    tempo: tempo?.[1] ?? '',
    rest: rest?.[1] ?? '',
  };
  const ambiguous = Boolean(ambiguousAt && !load && !effort && !percentage);
  const valid = Boolean(prescription) && !ambiguous && !invalidEffort;
  const message = ambiguous
    ? `¿El valor ${ambiguousAt?.[1]} representa RPE, kg, lb, RIR o porcentaje?`
    : invalidEffort
      ? effortScale === 'rir'
        ? 'El RIR debe estar entre 0 y 5.'
        : 'El RPE debe estar entre 5 y 10.'
      : !prescription
        ? 'Escribe series y repeticiones, por ejemplo: 4x8 @ 70kg.'
        : null;

  return {
    ...notation,
    raw,
    normalized: valid ? formatTrainingNotation(notation) : '',
    valid,
    ambiguous,
    message,
  };
}

export function formatTrainingNotation(notation: TrainingNotation): string {
  if (!notation.sets || !notation.repsOrTime.trim()) return '';
  const parts = [`${notation.sets} × ${notation.repsOrTime.trim()}`];
  if (notation.load !== null && notation.unit) {
    parts[0] += ` @ ${formatNumber(notation.load)} ${notation.unit}`;
  } else if (notation.percentage !== null) {
    parts[0] += ` @ ${formatNumber(notation.percentage)}%`;
  } else if (notation.effortScale && notation.effort !== null) {
    parts[0] += ` @ ${notation.effortScale.toUpperCase()} ${formatNumber(notation.effort)}`;
  }
  if (
    notation.effortScale &&
    notation.effort !== null &&
    (notation.load !== null || notation.percentage !== null)
  ) {
    parts.push(`${notation.effortScale.toUpperCase()} ${formatNumber(notation.effort)}`);
  }
  if (notation.tempo.trim()) parts.push(`tempo ${notation.tempo.trim()}`);
  if (notation.rest.trim()) parts.push(`descanso ${notation.rest.trim()}`);
  return parts.join(' · ');
}

export function estimateTargetLoadByRir({
  currentWeight,
  currentReps,
  currentRir,
  targetReps,
  targetRir,
  increment,
}: {
  currentWeight: number;
  currentReps: number;
  currentRir: number;
  targetReps: number;
  targetRir: number;
  increment: number;
}): TargetLoadEstimate {
  const oneRepMax = calculateRirAdjustedOneRepMax(currentWeight, currentReps, currentRir);
  if (
    oneRepMax <= 0 ||
    targetReps < 1 ||
    targetRir < 0 ||
    targetRir > 5 ||
    increment <= 0
  ) {
    return { estimated: 0, lower: 0, upper: 0, oneRepMax: 0 };
  }
  const raw = oneRepMax / (1 + (targetReps + targetRir) / 30);
  const estimated = roundToAvailableIncrement(raw, increment);
  return {
    estimated,
    lower: roundToAvailableIncrement(Math.max(raw - increment, increment), increment),
    upper: roundToAvailableIncrement(raw + increment, increment),
    oneRepMax,
  };
}

export function estimateLoadFromOneRepMax({
  oneRepMax,
  targetReps,
  targetRir,
  increment,
}: {
  oneRepMax: number;
  targetReps: number;
  targetRir: number;
  increment: number;
}): OneRepMaxLoadEstimate {
  if (
    !Number.isFinite(oneRepMax) ||
    oneRepMax <= 0 ||
    !Number.isFinite(targetReps) ||
    targetReps < 1 ||
    targetReps > 20 ||
    !Number.isFinite(targetRir) ||
    targetRir < 0 ||
    targetRir > 5 ||
    !Number.isFinite(increment) ||
    increment <= 0
  ) {
    return { calculated: 0, usable: 0, lower: 0, upper: 0, percentage: 0 };
  }

  const calculated = oneRepMax / (1 + (targetReps + targetRir) / 30);
  return {
    calculated: round(calculated, 1),
    usable: roundToAvailableIncrement(calculated, increment),
    lower: roundToAvailableIncrement(Math.max(calculated - increment, increment), increment),
    upper: roundToAvailableIncrement(calculated + increment, increment),
    percentage: round((calculated / oneRepMax) * 100, 1),
  };
}

export function calculateEquivalentPerformances({
  weight,
  reps,
  rir = 0,
  targetReps,
  increment,
  unit,
  formula = 'epley',
}: {
  weight: number;
  reps: number;
  rir?: number;
  targetReps: number[];
  increment: number;
  unit: WeightUnit;
  formula?: OneRepMaxFormula;
}): EquivalentPerformance[] {
  const oneRepMax = calculateRirAdjustedOneRepMax(weight, reps, rir, formula);
  if (oneRepMax <= 0 || increment <= 0) return [];
  return targetReps
    .filter((target) => target >= 1 && target <= 20)
    .map((target) => ({
      reps: target,
      weight: roundToAvailableIncrement(oneRepMax / (1 + target / 30), increment),
      unit,
    }));
}

export function generateWarmupSets({
  workingWeight,
  barWeight,
  unit,
  level,
  accessory,
  increment,
}: {
  workingWeight: number;
  barWeight: number;
  unit: WeightUnit;
  level: 'short' | 'normal' | 'extensive';
  accessory: boolean;
  increment: number;
}): WarmupSet[] {
  if (workingWeight <= 0 || barWeight < 0 || increment <= 0) return [];
  const schemes = {
    short: [
      [0, 10],
      [0.6, 5],
      [0.82, 2],
    ],
    normal: [
      [0, 10],
      [0.4, 8],
      [0.6, 5],
      [0.75, 3],
      [0.9, 1],
    ],
    extensive: [
      [0, 12],
      [0.3, 8],
      [0.5, 6],
      [0.65, 4],
      [0.78, 2],
      [0.9, 1],
    ],
  } as const;
  const scheme = accessory ? schemes.short.slice(0, 2) : schemes[level];
  const seen = new Set<number>();
  return scheme
    .map(([percentage, reps], index) => {
      const weight =
        percentage === 0
          ? barWeight
          : Math.max(barWeight, roundToAvailableIncrement(workingWeight * percentage, increment));
      return { id: `warmup-${index}-${weight}`, weight, reps, unit, label: percentage === 0 ? 'Barra' : `${Math.round(percentage * 100)}%` };
    })
    .filter((set) => set.weight < workingWeight && !seen.has(set.weight) && seen.add(set.weight));
}

export function calculateDoubleProgression({
  weight,
  reps,
  recordedRir,
  targetMinReps,
  targetMaxReps,
  targetRir,
  increment,
  comparableSessions = 1,
}: {
  weight: number;
  reps: number[];
  recordedRir: number | null;
  targetMinReps: number;
  targetMaxReps: number;
  targetRir: number;
  increment: number;
  comparableSessions?: number;
}): ProgressionResult {
  const confidence =
    recordedRir === null
      ? 'baja'
      : comparableSessions >= 3
        ? 'alta'
        : comparableSessions >= 2
          ? 'media'
          : 'baja';
  if (!reps.length || weight <= 0) {
    return {
      action: 'maintain',
      suggestedWeight: 0,
      recommendation: 'Añade resultados válidos',
      reason: 'Faltan series comparables.',
      target: 'Registra peso, repeticiones y RIR.',
      confidence: 'baja',
    };
  }
  if (
    reps.every((value) => value >= targetMaxReps) &&
    (recordedRir === null || recordedRir >= targetRir)
  ) {
    const next = roundToAvailableIncrement(weight + increment, increment);
    return {
      action: 'increase',
      suggestedWeight: next,
      recommendation: `Sube a ${formatNumber(next)} y vuelve al rango inferior.`,
      reason: 'Completaste el máximo del rango manteniendo el esfuerzo objetivo.',
      target: `${reps.length} × ${targetMinReps} @ RIR ${targetRir}`,
      confidence,
    };
  }
  if (reps.some((value) => value < targetMinReps) && recordedRir !== null && recordedRir <= 1) {
    const next = roundToAvailableIncrement(Math.max(weight - increment, increment), increment);
    return {
      action: 'reduce',
      suggestedWeight: next,
      recommendation: `Mantén o prueba ${formatNumber(next)}.`,
      reason: 'El esfuerzo fue mayor de lo programado y faltaron repeticiones.',
      target: `${reps.length} × ${targetMinReps}–${targetMaxReps} @ RIR ${targetRir}`,
      confidence,
    };
  }
  return {
    action: 'maintain',
    suggestedWeight: weight,
    recommendation: `Mantén ${formatNumber(weight)}.`,
    reason: 'Todavía no completaste el máximo del rango con el RIR objetivo.',
    target: `Añade repeticiones hasta ${targetMaxReps} por serie.`,
    confidence,
  };
}

export function calculateTrainingVolume(
  sets: VolumeSet[],
  outputUnit: WeightUnit = 'kg',
): VolumeResult {
  const valid = sets.filter((set) => set.weight > 0 && set.reps > 0);
  const normalized = valid.map((set) => ({
    weight: convertWeightUnit(set.weight, set.unit, outputUnit),
    reps: set.reps,
  }));
  const totalReps = normalized.reduce((sum, set) => sum + set.reps, 0);
  const volumeBySet = normalized.map((set) => round(set.weight * set.reps, 2));
  const totalVolume = round(volumeBySet.reduce((sum, volume) => sum + volume, 0), 2);
  return {
    totalVolume,
    totalReps,
    averageWeight: totalReps ? round(totalVolume / totalReps, 2) : 0,
    maxWeight: Math.max(...normalized.map((set) => set.weight), 0),
    setCount: normalized.length,
    volumeBySet,
    unit: outputUnit,
  };
}

export function compareSetEffort(a: EffortSeries, b: EffortSeries): EffortComparison {
  const weightA = convertWeightUnit(a.weight, a.unit, 'kg');
  const weightB = convertWeightUnit(b.weight, b.unit, 'kg');
  const adjustedOneRepMaxA = calculateRirAdjustedOneRepMax(weightA, a.reps, a.rir);
  const adjustedOneRepMaxB = calculateRirAdjustedOneRepMax(weightB, b.reps, b.rir);
  const volumeA = round(weightA * a.reps, 1);
  const volumeB = round(weightB * b.reps, 1);
  const sharedMax = Math.max(adjustedOneRepMaxA, adjustedOneRepMaxB, 1);
  const intensityA = round((weightA / sharedMax) * 100, 1);
  const intensityB = round((weightB / sharedMax) * 100, 1);
  const performanceDelta = adjustedOneRepMaxB - adjustedOneRepMaxA;
  const similar = Math.abs(performanceDelta) < Math.max(sharedMax * 0.025, 1);
  let status: EffortComparison['status'] = 'Resultado mixto';
  let summary = 'Las señales son mixtas; carga, repeticiones y esfuerzo cambiaron a la vez.';
  if (similar) {
    status = 'Rendimiento similar';
    summary = 'Ambas series representan un rendimiento estimado similar.';
  } else if (performanceDelta > 0 && b.rir <= a.rir) {
    status = 'Rendimiento superior';
    summary = 'La serie B produjo una estimación mayor con un esfuerzo igual o superior.';
  } else if (volumeB > volumeA * 1.05) {
    status = 'Mayor volumen';
    summary = 'La serie B acumuló más volumen, sin que eso implique por sí solo mayor calidad.';
  } else if (weightB > weightA) {
    status = 'Mayor intensidad';
    summary = 'La serie B utilizó más carga relativa.';
  } else if (b.rir < a.rir) {
    status = 'Mayor esfuerzo';
    summary = 'La serie B terminó más cerca del fallo.';
  }
  return {
    status,
    summary,
    adjustedOneRepMaxA,
    adjustedOneRepMaxB,
    volumeA,
    volumeB,
    intensityA,
    intensityB,
  };
}

export { convertWeightUnit, roundToAvailableIncrement };

function normalizeTimeUnit(unit: string): string {
  return unit.toLowerCase() === 'min' ? 'min' : 's';
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
