import type { FlatImages } from '@repdb/exercises';
import type { TrainingPlanRow } from './training-plan';

export interface RepdbExerciseMedia {
  id: string;
  name: string;
  kind: 'animated' | 'static';
  startUrl?: string;
  peakUrl?: string;
  imageUrl?: string;
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
}

interface RepdbMapping {
  id: string;
  name: string;
  images: FlatImages;
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
}

type MappingResolver = RepdbMapping | ((row: TrainingPlanRow) => RepdbMapping | null);

interface RepdbMuscleGroups {
  primary: readonly string[];
  secondary?: readonly string[];
}

const REPDB_MUSCLES: Readonly<Record<string, RepdbMuscleGroups>> = {
  'incline-bench-press': { primary: ['Pectoral mayor'], secondary: ['Deltoide anterior', 'Tríceps'] },
  'wide-grip-bench-press': {
    primary: ['Pectoral mayor'],
    secondary: ['Deltoide anterior', 'Tríceps'],
  },
  'weighted-pull-up': {
    primary: ['Dorsal ancho'],
    secondary: ['Bíceps', 'Deltoide posterior', 'Romboides', 'Trapecio'],
  },
  'barbell-row': {
    primary: ['Dorsal ancho', 'Romboides'],
    secondary: ['Bíceps', 'Deltoide posterior'],
  },
  'machine-shoulder-press': {
    primary: ['Deltoide anterior', 'Deltoide lateral'],
    secondary: ['Trapecio', 'Tríceps'],
  },
  'weighted-dips': { primary: ['Pectoral mayor', 'Tríceps'], secondary: ['Deltoide anterior'] },
  'ez-bar-overhead-extension': { primary: ['Tríceps'] },
  squat: { primary: ['Glúteo mayor', 'Cuádriceps'], secondary: ['Erectores espinales', 'Isquiotibiales'] },
  'romanian-deadlift': { primary: ['Glúteo mayor', 'Isquiotibiales'], secondary: ['Erectores espinales'] },
  'seated-leg-curl': { primary: ['Isquiotibiales'], secondary: ['Gemelos'] },
  'leg-extension': { primary: ['Cuádriceps'] },
  'pull-up': { primary: ['Dorsal ancho'], secondary: ['Bíceps', 'Deltoide posterior', 'Romboides'] },
  'lat-pulldown': { primary: ['Dorsal ancho'], secondary: ['Bíceps', 'Deltoide posterior', 'Romboides'] },
  'lateral-raise': { primary: ['Deltoide lateral'], secondary: ['Deltoide anterior'] },
  'hammer-curl': {
    primary: ['Bíceps', 'Braquial'],
    secondary: ['Flexores del antebrazo'],
  },
  'tricep-pushdown': { primary: ['Tríceps'] },
  'hack-squat': { primary: ['Glúteo mayor', 'Cuádriceps'], secondary: ['Gemelos', 'Isquiotibiales'] },
  'leg-press': { primary: ['Glúteo mayor', 'Cuádriceps'], secondary: ['Isquiotibiales'] },
  'hip-thrust': { primary: ['Glúteo mayor', 'Glúteo medio'], secondary: ['Isquiotibiales'] },
};

const animated = (id: string, name: string): RepdbMapping => {
  const muscles = REPDB_MUSCLES[id];
  return {
    id,
    name,
    images: {
      start: `images/flat/${id}-start.webp`,
      peak: `images/flat/${id}-peak.webp`,
    },
    primaryMuscles: muscles?.primary ?? [],
    secondaryMuscles: muscles?.secondary ?? [],
  };
};

// RepDB metadata stays outside the training plan so prescriptions and third-party
// presentation data can evolve independently.
const BLOCK_TWO_REPDB_MAPPING: Readonly<Record<string, MappingResolver>> = {
  'Press banca o press inclinado': (row) =>
    includesAny(row, 'inclinado')
      ? animated('incline-bench-press', 'Press en banco inclinado con barra')
      : includesAny(row, 'plano')
        ? animated('wide-grip-bench-press', 'Press de banca con agarre ancho')
        : null,
  'Dominada lastrada': animated('weighted-pull-up', 'Dominada lastrada'),
  Remo: animated('barbell-row', 'Remo con barra inclinado'),
  'Press compatible con hombro': animated('machine-shoulder-press', 'Press de hombros en máquina'),
  'Fondos lastrados': animated('weighted-dips', 'Fondos lastrados'),
  'Extensión de tríceps sobre la cabeza': animated(
    'ez-bar-overhead-extension',
    'Extensión de tríceps por encima de la cabeza con barra Z',
  ),
  Sentadilla: animated('squat', 'Sentadilla trasera con barra'),
  'Peso muerto rumano': animated('romanian-deadlift', 'Peso muerto rumano'),
  'Curl femoral': animated('seated-leg-curl', 'Curl de piernas sentado'),
  'Extensión de cuádriceps': animated('leg-extension', 'Extensión de piernas'),
  'Variante secundaria de banca': (row) =>
    includesAny(row, 'plano')
      ? animated('wide-grip-bench-press', 'Press de banca con agarre ancho')
      : includesAny(row, 'inclinado')
        ? animated('incline-bench-press', 'Press en banco inclinado con barra')
        : null,
  'Dominadas o jalón': animated('weighted-pull-up', 'Dominada lastrada'),
  'Elevaciones laterales': animated('lateral-raise', 'Elevación lateral con mancuernas'),
  Bíceps: (row) =>
    includesAny(row, 'por mano', 'mancuerna')
      ? animated('hammer-curl', 'Curl martillo con mancuernas')
      : null,
  Tríceps: (row) =>
    includesAny(row, 'polea', 'cable')
      ? animated('tricep-pushdown', 'Jalón de tríceps en cable')
      : null,
  'Variante de sentadilla': (row) =>
    includesAny(row, 'pausada', 'barra')
      ? animated('squat', 'Sentadilla trasera con barra')
      : null,
  'Hack squat o prensa': animated('leg-press', 'Prensa de piernas'),
  Glúteo: (row) =>
    includesAny(row, 'hip thrust') ? animated('hip-thrust', 'Hip thrust con barra') : null,
};

export function resolveBlockTwoRepdbExercise(row: TrainingPlanRow): RepdbExerciseMedia | null {
  if (isRehabilitation(row)) {
    return null;
  }

  const candidate = BLOCK_TWO_REPDB_MAPPING[row.exercise];
  const mapping = typeof candidate === 'function' ? candidate(row) : candidate;

  if (!mapping) {
    return null;
  }

  const { start, peak, main } = mapping.images;
  if (start && peak) {
    return {
      id: mapping.id,
      name: mapping.name,
      kind: 'animated',
      startUrl: assetUrl(start),
      peakUrl: assetUrl(peak),
      primaryMuscles: mapping.primaryMuscles,
      secondaryMuscles: mapping.secondaryMuscles,
    };
  }

  const image = main ?? peak ?? start;
  return image
    ? {
        id: mapping.id,
        name: mapping.name,
        kind: 'static',
        imageUrl: assetUrl(image),
        primaryMuscles: mapping.primaryMuscles,
        secondaryMuscles: mapping.secondaryMuscles,
      }
    : null;
}

function isRehabilitation(row: TrainingPlanRow): boolean {
  return normalize(row.block).includes('rehabilitacion') || normalize(row.exercise).includes('rehabilitacion');
}

function includesAny(row: TrainingPlanRow, ...variants: string[]): boolean {
  const configuredVariant = normalize(`${row.suggestedLoad} ${row.notes}`);
  return variants.some((variant) => configuredVariant.includes(normalize(variant)));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function assetUrl(packagePath: string): string {
  return `repdb/${packagePath}`;
}
