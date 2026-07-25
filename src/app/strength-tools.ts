export type WeightUnit = 'kg' | 'lb';
export type OneRepMaxFormula = 'epley' | 'brzycki' | 'lombardi' | 'average';
export type EffortScale = 'rir' | 'rpe';

export interface StrengthSet {
  weight: number;
  reps: number;
  unit: WeightUnit;
  rir?: number | null;
}

export interface ExerciseSession {
  id: string;
  exerciseKey: string;
  exerciseName: string;
  sessionIndex: number;
  date?: string | null;
  sets: StrengthSet[];
}

export interface OneRepMaxResult {
  formula: OneRepMaxFormula;
  direct: number;
  adjusted: number | null;
  potentialReps: number;
}

export interface PercentageLoad {
  percentage: number;
  exact: number;
  usable: number;
}

export interface PlateInventoryItem {
  weight: number;
  quantity: number;
}

export interface PlateConfiguration {
  unit: WeightUnit;
  barWeight: number;
  collarWeight: number;
  plates: PlateInventoryItem[];
}

export interface PlateSelection {
  total: number;
  perSide: Array<{ weight: number; count: number }>;
  difference: number;
}

export interface PlateCombination {
  exact: PlateSelection | null;
  lower: PlateSelection;
  upper: PlateSelection | null;
}

export interface SessionComparison {
  current: ExerciseSession;
  reference: ExerciseSession;
  maxWeightChange: number;
  repsChange: number;
  volumeChange: number;
  oneRepMaxChange: number;
  seriesChange: number;
  conclusion: 'Mejoraste' | 'Rendimiento similar' | 'Resultado mixto' | 'Posible fatiga';
  reasons: string[];
}

export type PersonalRecordType = 'weight' | 'reps' | 'oneRepMax' | 'volume' | 'bestSet';

export interface PersonalRecord {
  id: string;
  type: PersonalRecordType;
  exerciseKey: string;
  exerciseName: string;
  sessionId: string;
  sessionIndex: number;
  date?: string | null;
  value: number;
  previousValue: number | null;
  weight?: number;
  reps?: number;
  unit: WeightUnit;
}

export interface ProgressionSuggestion {
  action: 'increase' | 'maintain' | 'reduce';
  suggestedWeight: number;
  headline: string;
  target: string;
  reason: string;
  confidence: 'alta' | 'media' | 'baja';
}

export function calculateEstimatedOneRepMax(
  weight: number,
  reps: number,
  formula: OneRepMaxFormula = 'epley',
): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps < 1 || reps > 30) {
    return 0;
  }

  if (reps === 1) {
    return round(weight, 1);
  }

  const formulas = {
    epley: weight * (1 + reps / 30),
    brzycki: weight * (36 / (37 - reps)),
    lombardi: weight * reps ** 0.1,
  };
  const value =
    formula === 'average'
      ? (formulas.epley + formulas.brzycki + formulas.lombardi) / 3
      : formulas[formula];
  return round(value, 1);
}

export function calculateOneRepMaxRange(
  weight: number,
  reps: number,
  rir: number | null,
  formula: OneRepMaxFormula = 'epley',
): OneRepMaxResult {
  const safeRir =
    rir === null || !Number.isFinite(rir) || rir < 0 || rir > 5 ? null : Math.round(rir * 2) / 2;
  const potentialReps = reps + (safeRir ?? 0);

  return {
    formula,
    direct: calculateEstimatedOneRepMax(weight, reps, formula),
    adjusted:
      safeRir === null ? null : calculateEstimatedOneRepMax(weight, potentialReps, formula),
    potentialReps,
  };
}

export function roundToAvailableIncrement(value: number, increment: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(increment) || increment <= 0) {
    return 0;
  }

  return round(Math.round(value / increment) * increment, 2);
}

export function calculatePercentageLoads(
  oneRepMax: number,
  percentages: number[],
  increment: number,
): PercentageLoad[] {
  return percentages.map((percentage) => {
    const exact = round(oneRepMax * (percentage / 100), 2);
    return {
      percentage,
      exact,
      usable: roundToAvailableIncrement(exact, increment),
    };
  });
}

export function convertWeightUnit(value: number, from: WeightUnit, to: WeightUnit): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (from === to) {
    return round(value, 2);
  }

  return round(from === 'kg' ? value * 2.20462262 : value * 0.45359237, 2);
}

export function calculatePlateCombination(
  targetWeight: number,
  configuration: PlateConfiguration,
): PlateCombination {
  const baseWeight = Math.max(configuration.barWeight + configuration.collarWeight, 0);
  const targetPerSide = Math.max((targetWeight - baseWeight) / 2, 0);
  const scale = 100;
  const targetUnits = Math.round(targetPerSide * scale);
  const maxPlate = Math.max(...configuration.plates.map((plate) => plate.weight), 0);
  const limit = targetUnits + Math.round(maxPlate * scale);
  let combinations = new Map<number, Array<{ weight: number; count: number }>>([[0, []]]);

  configuration.plates
    .filter((plate) => plate.weight > 0 && plate.quantity > 0)
    .sort((a, b) => b.weight - a.weight)
    .forEach((plate) => {
      const plateUnits = Math.round(plate.weight * scale);
      const quantityPerSide = Math.floor(plate.quantity / 2);
      const next = new Map(combinations);

      combinations.forEach((combination, sum) => {
        for (let count = 1; count <= quantityPerSide; count += 1) {
          const candidate = sum + plateUnits * count;
          if (candidate > limit) break;
          const existing = next.get(candidate);
          const proposed = [...combination, { weight: plate.weight, count }];
          if (!existing || plateCount(proposed) < plateCount(existing)) {
            next.set(candidate, proposed);
          }
        }
      });
      combinations = next;
    });

  const sums = [...combinations.keys()].sort((a, b) => a - b);
  const lowerUnits = [...sums].reverse().find((sum) => sum <= targetUnits) ?? 0;
  const upperUnits = sums.find((sum) => sum >= targetUnits) ?? null;
  const selection = (sum: number): PlateSelection => {
    const total = round(baseWeight + (sum / scale) * 2, 2);
    return {
      total,
      perSide: combinations.get(sum) ?? [],
      difference: round(total - targetWeight, 2),
    };
  };

  return {
    exact: combinations.has(targetUnits) ? selection(targetUnits) : null,
    lower: selection(lowerUnits),
    upper: upperUnits === null ? null : selection(upperUnits),
  };
}

export function compareExerciseSessions(
  current: ExerciseSession,
  reference: ExerciseSession,
): SessionComparison {
  const currentMetrics = sessionMetrics(current);
  const referenceMetrics = sessionMetrics(reference);
  const maxWeightChange = round(currentMetrics.maxWeight - referenceMetrics.maxWeight, 1);
  const repsChange = currentMetrics.reps - referenceMetrics.reps;
  const volumeChange = round(currentMetrics.volume - referenceMetrics.volume, 1);
  const oneRepMaxChange = round(currentMetrics.oneRepMax - referenceMetrics.oneRepMax, 1);
  const seriesChange = current.sets.length - reference.sets.length;
  const reasons: string[] = [];
  let positive = 0;
  let negative = 0;
  const setRepChanges = current.sets.map(
    (set, index) => set.reps - (reference.sets[index]?.reps ?? set.reps),
  );
  const sameSetLoads =
    current.sets.length === reference.sets.length &&
    current.sets.every((set, index) => {
      const previous = reference.sets[index];
      return (
        previous &&
        Math.abs(
          convertWeightUnit(set.weight, set.unit, 'kg') -
            convertWeightUnit(previous.weight, previous.unit, 'kg'),
        ) < 0.05
      );
    });

  if (maxWeightChange > 0) {
    reasons.push(`+${formatNumber(maxWeightChange)} de carga máxima.`);
    positive += 1;
  } else if (maxWeightChange < 0) {
    reasons.push(`${formatNumber(maxWeightChange)} de carga máxima.`);
    negative += 1;
  } else {
    reasons.push('Mantuviste la misma carga máxima.');
  }
  if (
    sameSetLoads &&
    setRepChanges.length > 0 &&
    setRepChanges.every((change) => change === setRepChanges[0] && change > 0)
  ) {
    reasons.push(
      setRepChanges[0] === 1
        ? 'Añadiste una repetición en cada serie.'
        : `Añadiste ${setRepChanges[0]} repeticiones en cada serie.`,
    );
    positive += 1;
  } else if (repsChange > 0) {
    reasons.push(`+${repsChange} repeticiones totales.`);
    positive += 1;
  } else if (repsChange < 0) {
    reasons.push(`${repsChange} repeticiones totales.`);
    negative += 1;
  }
  if (volumeChange !== 0) {
    reasons.push(
      `El volumen ${volumeChange > 0 ? 'aumentó' : 'disminuyó'} ${formatNumber(Math.abs(volumeChange))}.`,
    );
  } else {
    reasons.push('El volumen no cambió.');
  }
  if (Math.abs(oneRepMaxChange) < 1) {
    reasons.push('1RM estimado similar.');
  } else if (oneRepMaxChange > 0) {
    reasons.push(`+${formatNumber(oneRepMaxChange)} de 1RM estimado.`);
    positive += 1;
  } else {
    reasons.push(`${formatNumber(oneRepMaxChange)} de 1RM estimado.`);
    negative += 1;
  }
  reasons.push(
    seriesChange === 0
      ? 'El número de series no cambió.'
      : `${seriesChange > 0 ? 'Añadiste' : 'Realizaste'} ${Math.abs(seriesChange)} ${
          Math.abs(seriesChange) === 1 ? 'serie' : 'series'
        }${seriesChange < 0 ? ' menos' : ''}.`,
  );

  const conclusion =
    positive >= 2 && negative === 0
      ? 'Mejoraste'
      : negative >= 2 && positive === 0
        ? 'Posible fatiga'
        : positive === 0 && negative === 0
          ? 'Rendimiento similar'
          : 'Resultado mixto';

  return {
    current,
    reference,
    maxWeightChange,
    repsChange,
    volumeChange,
    oneRepMaxChange,
    seriesChange,
    conclusion,
    reasons,
  };
}

export function detectPersonalRecords(sessions: ExerciseSession[]): PersonalRecord[] {
  const bestByExercise = new Map<
    string,
    { weight: number; oneRepMax: number; volume: number; repsByWeight: Map<string, number> }
  >();
  const records: PersonalRecord[] = [];

  [...sessions]
    .sort((a, b) => a.sessionIndex - b.sessionIndex)
    .forEach((session) => {
      if (!session.exerciseKey || !session.sets.length) return;
      const metrics = sessionMetrics(session);
      const best =
        bestByExercise.get(session.exerciseKey) ??
        { weight: 0, oneRepMax: 0, volume: 0, repsByWeight: new Map<string, number>() };
      const bestSet = [...session.sets].sort(
        (a, b) =>
          calculateEstimatedOneRepMax(b.weight, b.reps) -
          calculateEstimatedOneRepMax(a.weight, a.reps),
      )[0];

      if (best.weight > 0 && metrics.maxWeight > best.weight) {
        records.push(record(session, 'weight', metrics.maxWeight, best.weight || null, bestSet));
      }
      if (metrics.maxWeight > best.weight) {
        best.weight = metrics.maxWeight;
      }
      if (best.oneRepMax > 0 && metrics.oneRepMax > best.oneRepMax + 0.1) {
        records.push(
          record(session, 'oneRepMax', metrics.oneRepMax, best.oneRepMax || null, bestSet),
        );
      }
      if (metrics.oneRepMax > best.oneRepMax) {
        best.oneRepMax = metrics.oneRepMax;
      }
      if (best.volume > 0 && metrics.volume > best.volume + 0.1) {
        records.push(record(session, 'volume', metrics.volume, best.volume || null, bestSet));
      }
      if (metrics.volume > best.volume) {
        best.volume = metrics.volume;
      }
      session.sets.forEach((set) => {
        const weightKg = convertWeightUnit(set.weight, set.unit, 'kg');
        const key = weightKg.toFixed(2);
        const previousReps = best.repsByWeight.get(key) ?? 0;
        if (set.reps > previousReps) {
          if (previousReps > 0) {
            records.push(record(session, 'reps', set.reps, previousReps, set));
          }
          best.repsByWeight.set(key, set.reps);
        }
      });
      bestByExercise.set(session.exerciseKey, best);
    });

  return records.filter(
    (item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index,
  );
}

export function normalizeEffortScale(value: number | null, scale: EffortScale): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const rir = scale === 'rpe' ? 10 - value : value;
  return rir >= 0 && rir <= 5 ? round(rir, 1) : null;
}

export function calculateProgressionSuggestion({
  sessions,
  targetMinReps,
  targetMaxReps,
  targetRir,
  increment,
  targetSets,
}: {
  sessions: ExerciseSession[];
  targetMinReps: number;
  targetMaxReps: number;
  targetRir: number;
  increment: number;
  targetSets?: number;
}): ProgressionSuggestion {
  const recent = [...sessions].sort((a, b) => b.sessionIndex - a.sessionIndex).slice(0, 3);
  const latest = recent[0];
  const latestWeight = latest ? Math.max(...latest.sets.map((set) => set.weight), 0) : 0;
  const reps = latest?.sets.map((set) => set.reps) ?? [];
  const knownRir = latest?.sets.map((set) => set.rir).filter((rir): rir is number => rir != null) ?? [];
  const averageRir = knownRir.length
    ? knownRir.reduce((sum, rir) => sum + rir, 0) / knownRir.length
    : null;
  const confidence = knownRir.length === 0 ? 'baja' : recent.length >= 3 ? 'alta' : 'media';
  const prescribedSets = Math.max(targetSets ?? reps.length, 1);

  if (!latest || !reps.length) {
    return {
      action: 'maintain',
      suggestedWeight: 0,
      headline: 'Registra otra sesión',
      target: 'Completa una sesión comparable',
      reason: 'Faltan datos para sugerir una próxima carga.',
      confidence: 'baja',
    };
  }

  if (
    reps.length >= prescribedSets &&
    reps.slice(0, prescribedSets).every((value) => value >= targetMaxReps) &&
    averageRir !== null &&
    averageRir >= targetRir
  ) {
    const suggestedWeight = roundToAvailableIncrement(latestWeight + increment, increment);
    return {
      action: 'increase',
      suggestedWeight,
      headline: `Podrías probar ${formatNumber(suggestedWeight)}`,
      target: `${prescribedSets} × ${targetMinReps} @ RIR ${targetRir}`,
      reason: 'Completaste el máximo del rango en todas las series sin superar el esfuerzo objetivo.',
      confidence,
    };
  }

  if (reps.some((value) => value < targetMinReps) && averageRir !== null && averageRir <= 1) {
    const suggestedWeight = roundToAvailableIncrement(Math.max(latestWeight - increment, increment), increment);
    return {
      action: 'reduce',
      suggestedWeight,
      headline: `Podrías reducir a ${formatNumber(suggestedWeight)}`,
      target: `${prescribedSets} × ${targetMinReps}–${targetMaxReps} @ RIR ${targetRir}`,
      reason: 'Quedaste por debajo del rango y muy cerca del fallo.',
      confidence,
    };
  }

  const nextReps = Array.from({ length: prescribedSets }, (_, index) =>
    Math.min(Math.max((reps[index] ?? targetMinReps) + 1, targetMinReps), targetMaxReps),
  );

  return {
    action: 'maintain',
    suggestedWeight: latestWeight,
    headline: `Mantén ${formatNumber(latestWeight)}`,
    target: `${nextReps.join(', ')} repeticiones @ RIR ${targetRir}`,
    reason:
      recent.length === 1
        ? 'Una sesión aislada no determina una pérdida de fuerza.'
        : 'Todavía no completaste el máximo del rango en todas las series.',
    confidence,
  };
}

function sessionMetrics(session: ExerciseSession): {
  maxWeight: number;
  reps: number;
  volume: number;
  oneRepMax: number;
} {
  const normalized = session.sets.map((set) => ({
    ...set,
    weightKg: convertWeightUnit(set.weight, set.unit, 'kg'),
  }));
  return {
    maxWeight: Math.max(...normalized.map((set) => set.weightKg), 0),
    reps: normalized.reduce((sum, set) => sum + set.reps, 0),
    volume: round(normalized.reduce((sum, set) => sum + set.weightKg * set.reps, 0), 1),
    oneRepMax: Math.max(
      ...normalized.map((set) => calculateEstimatedOneRepMax(set.weightKg, set.reps)),
      0,
    ),
  };
}

function record(
  session: ExerciseSession,
  type: PersonalRecordType,
  value: number,
  previousValue: number | null,
  set: StrengthSet,
): PersonalRecord {
  return {
    id: `${session.exerciseKey}-${session.id}-${type}-${round(value, 2)}`,
    type,
    exerciseKey: session.exerciseKey,
    exerciseName: session.exerciseName,
    sessionId: session.id,
    sessionIndex: session.sessionIndex,
    date: session.date ?? null,
    value: round(value, 1),
    previousValue: previousValue === null ? null : round(previousValue, 1),
    weight: set.weight,
    reps: set.reps,
    unit: set.unit,
  };
}

function plateCount(plates: Array<{ count: number }>): number {
  return plates.reduce((sum, plate) => sum + plate.count, 0);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
