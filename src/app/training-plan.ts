export interface TrainingPlanRow {
  week: number;
  day: string;
  focus: string;
  phase: string;
  block: string;
  exercise: string;
  sets: string;
  repsOrTime: string;
  suggestedLoad: string;
  rir: string;
  tempo: string;
  rest: string;
  objective: string;
  tendonRule: string;
  progression: string;
  notes: string;
  sourceRow: number;
}

export interface PlanDay {
  key: string;
  week: number;
  name: string;
  focus: string;
  phase: string;
  rows: TrainingPlanRow[];
  sets: number;
  tendonRows: number;
}

export interface PlanWeek {
  week: number;
  phase: string;
  days: PlanDay[];
  rows: TrainingPlanRow[];
  sets: number;
  tendonRows: number;
}

export interface ParsedTrainingPlan {
  sourceName: string;
  rows: TrainingPlanRow[];
  weeks: PlanWeek[];
  warnings: string[];
}

export function parseTrainingPlanCsv(
  text: string,
  sourceName = 'training-plan-8-weeks.csv',
): ParsedTrainingPlan {
  const rows = parseDelimitedRows(text);
  const warnings: string[] = [];

  if (rows.length < 2) {
    return { sourceName, rows: [], weeks: [], warnings: ['El plan no tiene filas.'] };
  }

  const headers = rows[0].map(normalizeHeader);
  const parsedRows = rows
    .slice(1)
    .map((row, index) => rowToPlanRow(headers, row, index + 2, warnings))
    .filter((row): row is TrainingPlanRow => row !== null);

  return {
    sourceName,
    rows: parsedRows,
    weeks: buildWeeks(parsedRows),
    warnings,
  };
}

function rowToPlanRow(
  headers: string[],
  row: string[],
  sourceRow: number,
  warnings: string[],
): TrainingPlanRow | null {
  const get = (name: string) => cleanText(row[headers.indexOf(name)] ?? '');
  const week = Number(get('semana'));
  const exercise = get('ejercicio');

  if (!Number.isFinite(week) || !exercise) {
    warnings.push(`Fila ${sourceRow}: semana o ejercicio vacio.`);
    return null;
  }

  return {
    week,
    day: get('dia'),
    focus: get('enfoque'),
    phase: get('fase_semana'),
    block: get('bloque'),
    exercise,
    sets: get('series'),
    repsOrTime: get('reps_o_tiempo'),
    suggestedLoad: get('carga_sugerida'),
    rir: get('rpe_rir'),
    tempo: get('tempo'),
    rest: get('descanso'),
    objective: get('objetivo'),
    tendonRule: get('regla_tendon_24h'),
    progression: get('progresion'),
    notes: get('notas'),
    sourceRow,
  };
}

function buildWeeks(rows: TrainingPlanRow[]): PlanWeek[] {
  const weekMap = new Map<number, TrainingPlanRow[]>();

  rows.forEach((row) => {
    weekMap.set(row.week, [...(weekMap.get(row.week) ?? []), row]);
  });

  return [...weekMap.entries()]
    .sort(([weekA], [weekB]) => weekA - weekB)
    .map(([week, weekRows]) => {
      const days = buildDays(week, weekRows);

      return {
        week,
        phase: weekRows[0]?.phase ?? '',
        rows: weekRows,
        days,
        sets: weekRows.reduce((sum, row) => sum + setCount(row.sets), 0),
        tendonRows: weekRows.filter(isTendonOrPrehab).length,
      };
    });
}

function buildDays(week: number, rows: TrainingPlanRow[]): PlanDay[] {
  const dayMap = new Map<string, TrainingPlanRow[]>();

  rows.forEach((row) => {
    dayMap.set(row.day, [...(dayMap.get(row.day) ?? []), row]);
  });

  return [...dayMap.entries()].map(([name, dayRows]) => ({
    key: `${week}-${name}`,
    week,
    name,
    focus: dayRows[0]?.focus ?? '',
    phase: dayRows[0]?.phase ?? '',
    rows: dayRows,
    sets: dayRows.reduce((sum, row) => sum + setCount(row.sets), 0),
    tendonRows: dayRows.filter(isTendonOrPrehab).length,
  }));
}

function isTendonOrPrehab(row: TrainingPlanRow): boolean {
  const block = normalizeKey(row.block);
  return block.includes('tendon') || block.includes('prehab') || block.includes('activacion');
}

function setCount(value: string): number {
  const numbers = cleanText(value)
    .split('-')
    .map((part) => Number(part))
    .filter(Number.isFinite);

  return numbers[0] ?? 0;
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

  return counts.sort((a, b) => b.count - a.count)[0]?.delimiter ?? ',';
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

function normalizeHeader(value: string): string {
  return cleanText(value).toLowerCase();
}

function normalizeKey(value: string): string {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function cleanText(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
