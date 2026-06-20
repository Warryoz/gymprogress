type WeightUnit = 'kg' | 'lb';

interface ParsedSetToken {
  reps: number;
  weight: number;
  weightKg: number;
  unit: WeightUnit;
  raw: string;
}

export interface WorkoutSet {
  index: number;
  reps: number;
  weight: number;
  weightKg: number;
  unit: WeightUnit;
  volumeKg: number;
  inferred: boolean;
  raw: string;
}

export interface WorkoutEntry {
  workout: string;
  exercise: string;
  exerciseKey: string;
  sets: WorkoutSet[];
  sessionIndex: number;
  sourceRow: number;
  totalReps: number;
  volumeKg: number;
  maxWeightKg: number;
  estimatedOneRepMaxKg: number;
}

export interface WorkoutSession {
  index: number;
  workout: string;
  entries: WorkoutEntry[];
  sourceStartRow: number;
  sets: number;
  reps: number;
  volumeKg: number;
  maxWeightKg: number | null;
  bestOneRepMaxKg: number | null;
}

export interface SessionSummary {
  key: string;
  index: number;
  label: string;
  workout: string;
  entries: number;
  sets: number;
  reps: number;
  volumeKg: number;
  maxWeightKg: number | null;
  bestOneRepMaxKg: number | null;
}

export interface WorkoutSplit {
  name: string;
  sessions: number;
  entries: number;
  sets: number;
  volumeKg: number;
  share: number;
}

export interface ExerciseProgress {
  key: string;
  name: string;
  workout: string;
  entries: WorkoutEntry[];
  sessions: number;
  totalVolumeKg: number;
  firstWeightKg: number | null;
  latestWeightKg: number | null;
  bestWeightKg: number | null;
  weightDeltaKg: number | null;
  bestOneRepMaxKg: number | null;
  latestSessionIndex: number | null;
}

export interface ProgressStats {
  entries: number;
  sessions: number;
  workouts: number;
  exercises: number;
  sets: number;
  reps: number;
  totalVolumeKg: number;
  maxWeightKg: number | null;
  bestOneRepMaxKg: number | null;
  averageSetWeightKg: number | null;
  latestSessionVolumeKg: number;
  previousSessionVolumeKg: number;
  volumeChangePct: number | null;
}

export interface TrainingProgress {
  name: string;
  entries: WorkoutEntry[];
  sessions: WorkoutSession[];
  stats: ProgressStats;
  sessionSummaries: SessionSummary[];
  workoutSplit: WorkoutSplit[];
  topMovements: ExerciseProgress[];
  recentEntries: WorkoutEntry[];
}

export interface ParsedTrainingLog {
  sourceName: string;
  sessions: WorkoutSession[];
  entries: WorkoutEntry[];
  rowsSeen: number;
  warnings: string[];
  parsedAt: Date;
}

interface SessionDraft {
  index: number;
  workout: string;
  entries: WorkoutEntry[];
  sourceStartRow: number;
}

const TARGET_SETS = 4;

const WORKOUT_ALIASES = new Map<string, string>([
  ['leg', 'Legs'],
  ['legs', 'Legs'],
  ['chest', 'Chest'],
  ['back', 'Back'],
]);

const EXERCISE_ALIASES = new Map<string, string>([
  ['peckdexk', 'peckdeck'],
]);

const EXERCISE_DISPLAY_NAMES = new Map<string, string>([
  ['peckdeck', 'Peck Deck'],
]);

export function parseTrainingCsv(text: string, sourceName = 'training-log.csv'): ParsedTrainingLog {
  const rows = parseDelimitedRows(text);
  const sessions: WorkoutSession[] = [];
  const warnings: string[] = [];
  let current: SessionDraft | null = null;

  rows.forEach((row, rowIndex) => {
    const sourceRow = rowIndex + 1;

    if (isBlankRow(row)) {
      current = closeSession(current, sessions);
      return;
    }

    const workoutCell = cleanText(row[0]);
    const exercise = cleanText(row[1]);

    if (!exercise) {
      warnings.push(`Fila ${sourceRow}: no se encontro ejercicio.`);
      return;
    }

    if (workoutCell) {
      current = closeSession(current, sessions);
      current = {
        index: sessions.length + 1,
        workout: normalizeWorkoutName(workoutCell),
        entries: [],
        sourceStartRow: sourceRow,
      };
    }

    if (!current) {
      warnings.push(`Fila ${sourceRow}: "${exercise}" no tiene entreno asociado.`);
      return;
    }

    const parsedTokens = row
      .slice(2)
      .map(cleanText)
      .filter(Boolean)
      .map((cell) => ({ cell, parsed: parseSetToken(cell) }));
    const validTokens = parsedTokens
      .map(({ parsed }) => parsed)
      .filter((set): set is ParsedSetToken => set !== null);

    parsedTokens
      .filter(({ parsed }) => parsed === null)
      .forEach(({ cell }) => warnings.push(`Fila ${sourceRow}: no se pudo leer "${cell}".`));

    if (!validTokens.length) {
      return;
    }

    current.entries.push(buildEntry(current, exercise, expandToFourSets(validTokens), sourceRow));
  });

  closeSession(current, sessions);

  return {
    sourceName,
    sessions,
    entries: sessions.flatMap((session) => session.entries),
    rowsSeen: rows.length,
    warnings,
    parsedAt: new Date(),
  };
}

export function buildTrainingProgress(
  name: string,
  entries: WorkoutEntry[],
  sessions: WorkoutSession[],
): TrainingProgress {
  const stats = buildStats(entries, sessions);

  return {
    name,
    entries,
    sessions,
    stats,
    sessionSummaries: buildSessionSummaries(sessions),
    workoutSplit: buildWorkoutSplit(sessions, stats.totalVolumeKg),
    topMovements: buildExerciseProgress(entries),
    recentEntries: [...entries].sort((a, b) => compareEntries(b, a)).slice(0, 12),
  };
}

function closeSession(
  draft: SessionDraft | null,
  sessions: WorkoutSession[],
): SessionDraft | null {
  if (draft?.entries.length) {
    sessions.push(finalizeSession(draft));
  }

  return null;
}

function finalizeSession(draft: SessionDraft): WorkoutSession {
  const sets = draft.entries.reduce((sum, entry) => sum + entry.sets.length, 0);
  const reps = draft.entries.reduce((sum, entry) => sum + entry.totalReps, 0);
  const volumeKg = draft.entries.reduce((sum, entry) => sum + entry.volumeKg, 0);

  return {
    ...draft,
    sets,
    reps,
    volumeKg,
    maxWeightKg: maxNumber(draft.entries.map((entry) => entry.maxWeightKg)),
    bestOneRepMaxKg: maxNumber(draft.entries.map((entry) => entry.estimatedOneRepMaxKg)),
  };
}

function buildEntry(
  session: SessionDraft,
  exercise: string,
  sets: WorkoutSet[],
  sourceRow: number,
): WorkoutEntry {
  const totalReps = sets.reduce((sum, set) => sum + set.reps, 0);
  const volumeKg = sets.reduce((sum, set) => sum + set.volumeKg, 0);
  const maxWeightKg = Math.max(...sets.map((set) => set.weightKg));
  const estimatedOneRepMaxKg = Math.max(
    ...sets.map((set) => estimateOneRepMax(set.weightKg, set.reps)),
  );

  return {
    workout: session.workout,
    exercise: normalizeExerciseName(exercise),
    exerciseKey: exerciseKey(exercise),
    sets,
    sessionIndex: session.index,
    sourceRow,
    totalReps,
    volumeKg,
    maxWeightKg,
    estimatedOneRepMaxKg,
  };
}

function buildStats(entries: WorkoutEntry[], sessions: WorkoutSession[]): ProgressStats {
  const weightedSets = entries.flatMap((entry) => entry.sets);
  const totalVolumeKg = entries.reduce((sum, entry) => sum + entry.volumeKg, 0);
  const latestSession = sessions[sessions.length - 1];
  const previousSession = sessions[sessions.length - 2];
  const latestSessionVolumeKg = latestSession?.volumeKg ?? 0;
  const previousSessionVolumeKg = previousSession?.volumeKg ?? 0;

  return {
    entries: entries.length,
    sessions: sessions.length,
    workouts: new Set(sessions.map((session) => session.workout)).size,
    exercises: new Set(entries.map((entry) => entry.exerciseKey)).size,
    sets: weightedSets.length,
    reps: entries.reduce((sum, entry) => sum + entry.totalReps, 0),
    totalVolumeKg,
    maxWeightKg: maxNumber(entries.map((entry) => entry.maxWeightKg)),
    bestOneRepMaxKg: maxNumber(entries.map((entry) => entry.estimatedOneRepMaxKg)),
    averageSetWeightKg: weightedSets.length
      ? weightedSets.reduce((sum, set) => sum + set.weightKg, 0) / weightedSets.length
      : null,
    latestSessionVolumeKg,
    previousSessionVolumeKg,
    volumeChangePct:
      previousSessionVolumeKg > 0
        ? (latestSessionVolumeKg - previousSessionVolumeKg) / previousSessionVolumeKg
        : null,
  };
}

function buildSessionSummaries(sessions: WorkoutSession[]): SessionSummary[] {
  return sessions.map((session) => ({
    key: `${session.workout}-${session.index}`,
    index: session.index,
    label: `#${session.index}`,
    workout: session.workout,
    entries: session.entries.length,
    sets: session.sets,
    reps: session.reps,
    volumeKg: session.volumeKg,
    maxWeightKg: session.maxWeightKg,
    bestOneRepMaxKg: session.bestOneRepMaxKg,
  }));
}

function buildWorkoutSplit(sessions: WorkoutSession[], totalVolumeKg: number): WorkoutSplit[] {
  const grouped = new Map<string, WorkoutSplit>();

  sessions.forEach((session) => {
    const summary =
      grouped.get(session.workout) ??
      ({
        name: session.workout,
        sessions: 0,
        entries: 0,
        sets: 0,
        volumeKg: 0,
        share: 0,
      } satisfies WorkoutSplit);

    summary.sessions += 1;
    summary.entries += session.entries.length;
    summary.sets += session.sets;
    summary.volumeKg += session.volumeKg;
    grouped.set(session.workout, summary);
  });

  return [...grouped.values()]
    .map((summary) => ({
      ...summary,
      share: totalVolumeKg > 0 ? (summary.volumeKg / totalVolumeKg) * 100 : 0,
    }))
    .sort((a, b) => b.volumeKg - a.volumeKg || a.name.localeCompare(b.name));
}

function buildExerciseProgress(entries: WorkoutEntry[]): ExerciseProgress[] {
  const groups = new Map<string, WorkoutEntry[]>();

  entries.forEach((entry) => {
    groups.set(entry.exerciseKey, [...(groups.get(entry.exerciseKey) ?? []), entry]);
  });

  return [...groups.entries()]
    .map(([key, groupedEntries]) => {
      const sorted = [...groupedEntries].sort(compareEntries);
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];

      return {
        key,
        name: latest.exercise,
        workout: latest.workout,
        entries: sorted,
        sessions: new Set(sorted.map((entry) => entry.sessionIndex)).size,
        totalVolumeKg: sorted.reduce((sum, entry) => sum + entry.volumeKg, 0),
        firstWeightKg: first?.maxWeightKg ?? null,
        latestWeightKg: latest?.maxWeightKg ?? null,
        bestWeightKg: maxNumber(sorted.map((entry) => entry.maxWeightKg)),
        weightDeltaKg:
          first && latest ? round(latest.maxWeightKg - first.maxWeightKg, 1) : null,
        bestOneRepMaxKg: maxNumber(sorted.map((entry) => entry.estimatedOneRepMaxKg)),
        latestSessionIndex: latest?.sessionIndex ?? null,
      } satisfies ExerciseProgress;
    })
    .sort((a, b) => {
      const deltaA = a.weightDeltaKg ?? Number.NEGATIVE_INFINITY;
      const deltaB = b.weightDeltaKg ?? Number.NEGATIVE_INFINITY;
      return deltaB - deltaA || b.totalVolumeKg - a.totalVolumeKg;
    });
}

function parseDelimitedRows(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const normalized = text.replace(/\r\n?/g, '\n').trimEnd();

  if (!normalized) {
    return [];
  }

  return normalized.split('\n').map((line) => splitDelimitedLine(line, delimiter));
}

function detectDelimiter(text: string): string {
  const candidates = ['\t', ';', ','];
  const counts = candidates.map((delimiter) => ({
    delimiter,
    count: (text.match(new RegExp(escapeRegExp(delimiter), 'g')) ?? []).length,
  }));

  return counts.sort((a, b) => b.count - a.count)[0]?.delimiter ?? '\t';
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseSetToken(raw: string): ParsedSetToken | null {
  const text = cleanText(raw).toLowerCase();

  if (!text) {
    return null;
  }

  const failure = text.match(
    /(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)\b.*(?:fallo|failure)\s*[-:]?\s*(\d+(?:[.,]\d+)?)/,
  );

  if (failure) {
    return setToken(toNumber(failure[3]), toNumber(failure[1]), failure[2], raw);
  }

  const paired = text.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)?/);

  if (paired) {
    return setToken(toNumber(paired[1]), toNumber(paired[2]), paired[3] ?? 'kg', raw);
  }

  return null;
}

function setToken(
  reps: number | null,
  weight: number | null,
  unit: string,
  raw: string,
): ParsedSetToken | null {
  if (reps === null || weight === null || reps <= 0 || weight <= 0) {
    return null;
  }

  const normalizedUnit: WeightUnit = unit.toLowerCase().startsWith('lb') ? 'lb' : 'kg';

  return {
    reps,
    weight,
    unit: normalizedUnit,
    weightKg: convertToKg(weight, normalizedUnit),
    raw,
  };
}

function expandToFourSets(tokens: ParsedSetToken[]): WorkoutSet[] {
  const sets: WorkoutSet[] = tokens.slice(0, TARGET_SETS).map((token, index) =>
    workoutSet({
      token,
      index: index + 1,
      reps: token.reps,
      inferred: false,
    }),
  );

  while (sets.length < TARGET_SETS) {
    const previous = sets[sets.length - 1];
    sets.push(
      workoutSet({
        token: previous,
        index: sets.length + 1,
        reps: Math.max(previous.reps - 1, 1),
        inferred: true,
      }),
    );
  }

  return sets;
}

function workoutSet({
  token,
  index,
  reps,
  inferred,
}: {
  token: Pick<WorkoutSet | ParsedSetToken, 'weight' | 'weightKg' | 'unit' | 'raw'>;
  index: number;
  reps: number;
  inferred: boolean;
}): WorkoutSet {
  const roundedWeightKg = round(token.weightKg, 1);

  return {
    index,
    reps,
    weight: token.weight,
    weightKg: roundedWeightKg,
    unit: token.unit,
    volumeKg: round(roundedWeightKg * reps, 1),
    inferred,
    raw: token.raw,
  };
}

function compareEntries(a: WorkoutEntry, b: WorkoutEntry): number {
  return a.sessionIndex - b.sessionIndex || a.sourceRow - b.sourceRow;
}

function estimateOneRepMax(weightKg: number, reps: number): number {
  return round(weightKg * (1 + reps / 30), 1);
}

function convertToKg(weight: number, unit: WeightUnit): number {
  return round(unit === 'lb' ? weight * 0.45359237 : weight, 1);
}

function maxNumber(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numbers.length ? Math.max(...numbers) : null;
}

function toNumber(value: string): number | null {
  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBlankRow(row: string[]): boolean {
  return row.every((cell) => cleanText(cell) === '');
}

function normalizeWorkoutName(value: string): string {
  const key = normalizeKey(value);
  return WORKOUT_ALIASES.get(key) ?? titleCase(value);
}

function normalizeExerciseName(value: string): string {
  const key = exerciseKey(value);
  return EXERCISE_DISPLAY_NAMES.get(key) ?? titleCase(cleanText(value).toLowerCase());
}

function exerciseKey(exercise: string): string {
  const key = normalizeKey(exercise);
  return EXERCISE_ALIASES.get(key) ?? key;
}

function titleCase(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cleanText(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value: string): string {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
