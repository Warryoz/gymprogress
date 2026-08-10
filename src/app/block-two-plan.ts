import {
  ParsedTrainingPlan,
  TrainingPlanRow,
  createTrainingPlan,
} from './training-plan';

interface WeekPrescription {
  phase: string;
  objective: string;
  basicSets: string;
  basicReps: string;
  basicRir: string;
  accessorySets: string;
  accessoryReps: string;
  accessoryRir: string;
  load: string;
}

interface ExerciseTemplate {
  day: string;
  focus: string;
  block: string;
  exercise: string;
  kind: 'basic' | 'accessory' | 'rehab';
  reps?: string;
  sets?: string;
  rir?: string;
  fixedPrescription?: boolean;
  rest: string;
  objective: string;
  notes: string;
}

const TENDON_RULE =
  '0–2/10: continúa normal. 3/10: no aumentes carga. 4+/10: reduce carga o volumen un 10–20%. La respuesta del día siguiente debe ser igual o mejor.';

const PROGRESSION =
  'Si completas todas las series con el RIR previsto y sin empeoramiento relevante: tren superior +1 a 2.5 kg; tren inferior +2.5 a 5 kg. Si el RIR fue menor, mantén el peso.';

const WEEKS: WeekPrescription[] = [
  {
    phase: 'Adaptación al nuevo bloque',
    objective: 'Adaptarse al nuevo bloque manteniendo margen y técnica.',
    basicSets: '4',
    basicReps: '6',
    basicRir: 'RIR 3',
    accessorySets: '3',
    accessoryReps: '8–12',
    accessoryRir: 'RIR 3',
    load: 'Carga inicial por RIR',
  },
  {
    phase: 'Pequeño aumento de carga',
    objective: 'Aumentar ligeramente la carga sin perder el RIR previsto.',
    basicSets: '4',
    basicReps: '6',
    basicRir: 'RIR 2–3',
    accessorySets: '3',
    accessoryReps: '8–12',
    accessoryRir: 'RIR 2–3',
    load: '+ carga si regla 24 h OK',
  },
  {
    phase: 'Aumento de intensidad',
    objective: 'Empezar a desplazar el estímulo hacia fuerza submáxima.',
    basicSets: '4',
    basicReps: '5',
    basicRir: 'RIR 2',
    accessorySets: '3',
    accessoryReps: '8–10',
    accessoryRir: 'RIR 2–3',
    load: '+ carga si regla 24 h OK',
  },
  {
    phase: 'Consolidación de cargas',
    objective: 'Consolidar las nuevas cargas con repeticiones limpias.',
    basicSets: '4',
    basicReps: '5',
    basicRir: 'RIR 2',
    accessorySets: '3',
    accessoryReps: '8–10',
    accessoryRir: 'RIR 2',
    load: '+ carga si regla 24 h OK',
  },
  {
    phase: 'DELOAD · descarga muscular y tendinosa',
    objective: 'Reducir fatiga muscular y tendinosa.',
    basicSets: '3',
    basicReps: '5',
    basicRir: 'RIR 4–5',
    accessorySets: '2',
    accessoryReps: '8–10',
    accessoryRir: 'RIR 4 aprox.',
    load: '−10–15% vs. semana 4',
  },
  {
    phase: 'Vuelta del deload · entrada en fuerza',
    objective: 'Retomar la carga y entrar más claramente en fuerza.',
    basicSets: '4',
    basicReps: '5',
    basicRir: 'RIR 2–3',
    accessorySets: '3',
    accessoryReps: '6–10',
    accessoryRir: 'RIR 2–3',
    load: 'Carga de semana 4 o ligeramente mayor',
  },
  {
    phase: 'Fuerza submáxima',
    objective: 'Practicar fuerza submáxima sin grinders ni fallo.',
    basicSets: '4',
    basicReps: '4',
    basicRir: 'RIR 2',
    accessorySets: '3',
    accessoryReps: '6–10',
    accessoryRir: 'RIR 2',
    load: '+ carga si regla 24 h OK',
  },
  {
    phase: 'Evaluación sin test de 1RM',
    objective: 'Evaluar el progreso sin hacer un test máximo ni llegar al fallo.',
    basicSets: '4',
    basicReps: '4 · 1 top set + 3 back-off',
    basicRir: 'Top RIR 1–2 · back-off RIR 2–3',
    accessorySets: '2–3',
    accessoryReps: '6–10',
    accessoryRir: 'RIR 2–3',
    load: 'Top set; luego 5–10% menos',
  },
];

const EXERCISES: ExerciseTemplate[] = [
  {
    day: 'D1 Upper fuerza',
    focus: 'Fuerza de tren superior y tolerancia de hombro, codo y muñeca',
    block: 'Básico',
    exercise: 'Press banca o press inclinado',
    kind: 'basic',
    rest: '2–4 min',
    objective: 'Progresar el patrón de empuje principal con técnica estable.',
    notes:
      'Empieza en 75 kg. Como el disco mínimo es de 2.5 kg por lado, aumenta 5 kg totales solo cuando mantengas el RIR y la regla de 24 h.',
  },
  {
    day: 'D1 Upper fuerza',
    focus: 'Fuerza de tren superior y tolerancia de hombro, codo y muñeca',
    block: 'Principal de tracción',
    exercise: 'Dominada lastrada',
    kind: 'accessory',
    reps: '6–8',
    rest: '2–3 min',
    objective: 'Desarrollar fuerza de tracción vertical con control.',
    notes:
      'Carga inicial real: 10 kg de lastre. Mantén el peso si el RIR baja o aumenta la molestia.',
  },
  {
    day: 'D1 Upper fuerza',
    focus: 'Fuerza de tren superior y tolerancia de hombro, codo y muñeca',
    block: 'Accesorio',
    exercise: 'Remo',
    kind: 'accessory',
    reps: '8–10',
    rest: '90–120 s',
    objective: 'Aportar volumen de espalda y estabilidad escapular.',
    notes: 'Evita tirones y mantén el tronco estable.',
  },
  {
    day: 'D1 Upper fuerza',
    focus: 'Fuerza de tren superior y tolerancia de hombro, codo y muñeca',
    block: 'Accesorio compatible',
    exercise: 'Press compatible con hombro',
    kind: 'accessory',
    sets: '2–3',
    reps: '8',
    rir: 'RIR 3',
    rest: '90–120 s',
    objective: 'Mantener volumen de empuje sin irritar el hombro.',
    notes: 'Mancuernas, máquina o landmine según tolerancia.',
  },
  {
    day: 'D1 Upper fuerza',
    focus: 'Fuerza de tren superior y tolerancia de hombro, codo y muñeca',
    block: 'Accesorio',
    exercise: 'Fondos lastrados',
    kind: 'accessory',
    sets: '2',
    reps: '10',
    fixedPrescription: true,
    rest: '2 min',
    objective: 'Añadir dos series de fondos manteniendo técnica y margen.',
    notes: 'Dos series de 10 con 20 kg de lastre como punto de partida. No llegar al fallo.',
  },
  {
    day: 'D1 Upper fuerza',
    focus: 'Fuerza de tren superior y tolerancia de hombro, codo y muñeca',
    block: 'Accesorio',
    exercise: 'Extensión de tríceps sobre la cabeza',
    kind: 'accessory',
    sets: '2',
    reps: '10–15',
    rest: '60–90 s',
    objective: 'Mantener volumen de tríceps con buena tolerancia de codo.',
    notes: 'Carga inicial recalculada desde los 14 kg realizados sobre la cabeza.',
  },
  {
    day: 'D1 Upper fuerza',
    focus: 'Fuerza de tren superior y tolerancia de hombro, codo y muñeca',
    block: 'Rehabilitación',
    exercise: 'Rehabilitación de hombro, codo y muñeca',
    kind: 'rehab',
    rest: 'Según fisioterapia',
    objective: 'Cumplir el trabajo indicado por fisioterapia.',
    notes: 'Los ejercicios y límites específicos de fisioterapia tienen prioridad.',
  },
  {
    day: 'D2 Lower fuerza',
    focus: 'Fuerza de tren inferior y tolerancia de cadera y rodilla',
    block: 'Básico',
    exercise: 'Sentadilla',
    kind: 'basic',
    rest: '2–4 min',
    objective: 'Progresar el patrón principal de sentadilla sin grinders.',
    notes: 'Usa la profundidad y variante que toleren bien cadera y rodilla.',
  },
  {
    day: 'D2 Lower fuerza',
    focus: 'Fuerza de tren inferior y tolerancia de cadera y rodilla',
    block: 'Principal accesorio',
    exercise: 'Peso muerto rumano',
    kind: 'accessory',
    reps: '6–8',
    rest: '2–3 min',
    objective: 'Desarrollar cadena posterior con control de cadera.',
    notes: 'Mantén tensión y detén el recorrido antes de perder posición.',
  },
  {
    day: 'D2 Lower fuerza',
    focus: 'Fuerza de tren inferior y tolerancia de cadera y rodilla',
    block: 'Accesorio',
    exercise: 'Curl femoral',
    kind: 'accessory',
    reps: '8–12',
    rest: '90–120 s',
    objective: 'Mantener volumen directo de isquios.',
    notes: 'Controla la excéntrica y evita rebotes.',
  },
  {
    day: 'D2 Lower fuerza',
    focus: 'Fuerza de tren inferior y tolerancia de cadera y rodilla',
    block: 'Accesorio',
    exercise: 'Extensión de cuádriceps',
    kind: 'accessory',
    sets: '2–3',
    reps: '10–15',
    rest: '60–90 s',
    objective: 'Aumentar tolerancia y volumen de cuádriceps.',
    notes: 'Usa un rango cómodo y evita bloquear agresivamente.',
  },
  {
    day: 'D2 Lower fuerza',
    focus: 'Fuerza de tren inferior y tolerancia de cadera y rodilla',
    block: 'Rehabilitación',
    exercise: 'Rehabilitación de cadera y rodilla',
    kind: 'rehab',
    rest: 'Según fisioterapia',
    objective: 'Cumplir el trabajo indicado por fisioterapia.',
    notes: 'Los ejercicios y límites específicos de fisioterapia tienen prioridad.',
  },
  {
    day: 'D3 Upper volumen',
    focus: 'Hipertrofia de tren superior con fatiga controlada',
    block: 'Secundario',
    exercise: 'Variante secundaria de banca',
    kind: 'accessory',
    reps: '8',
    rir: 'RIR 3',
    rest: '2 min',
    objective: 'Mantener volumen de banca con una variante complementaria.',
    notes: 'Si el principal es banca plana, usa inclinada; si es inclinada, usa plana.',
  },
  {
    day: 'D3 Upper volumen',
    focus: 'Hipertrofia de tren superior con fatiga controlada',
    block: 'Accesorio',
    exercise: 'Dominadas o jalón',
    kind: 'accessory',
    reps: '8–10',
    rest: '90–120 s',
    objective: 'Acumular volumen de tracción vertical.',
    notes: 'Elige agarre y variante tolerables para codo y hombro.',
  },
  {
    day: 'D3 Upper volumen',
    focus: 'Hipertrofia de tren superior con fatiga controlada',
    block: 'Accesorio',
    exercise: 'Remo',
    kind: 'accessory',
    reps: '10',
    rest: '90–120 s',
    objective: 'Acumular volumen de espalda media.',
    notes: 'Pausa brevemente en contracción y evita impulso.',
  },
  {
    day: 'D3 Upper volumen',
    focus: 'Hipertrofia de tren superior con fatiga controlada',
    block: 'Accesorio',
    exercise: 'Elevaciones laterales',
    kind: 'accessory',
    sets: '2–3',
    reps: '12–20',
    rest: '60–90 s',
    objective: 'Mantener estímulo de deltoide lateral.',
    notes: 'Movimiento controlado, sin balanceo ni dolor articular.',
  },
  {
    day: 'D3 Upper volumen',
    focus: 'Hipertrofia de tren superior con fatiga controlada',
    block: 'Accesorio',
    exercise: 'Bíceps',
    kind: 'accessory',
    sets: '2',
    reps: '10–15',
    rest: '60–90 s',
    objective: 'Mantener volumen de bíceps con tolerancia de codo.',
    notes: 'Usa agarre neutro o pronado si resulta más cómodo.',
  },
  {
    day: 'D3 Upper volumen',
    focus: 'Hipertrofia de tren superior con fatiga controlada',
    block: 'Accesorio',
    exercise: 'Tríceps',
    kind: 'accessory',
    sets: '2',
    reps: '10–15',
    rest: '60–90 s',
    objective: 'Mantener volumen de tríceps sin irritación.',
    notes: 'Escoge la variante mejor tolerada por el codo.',
  },
  {
    day: 'D3 Upper volumen',
    focus: 'Hipertrofia de tren superior con fatiga controlada',
    block: 'Rehabilitación',
    exercise: 'Rehabilitación de hombro, codo y muñeca',
    kind: 'rehab',
    rest: 'Según fisioterapia',
    objective: 'Cumplir el trabajo indicado por fisioterapia.',
    notes: 'Los ejercicios y límites específicos de fisioterapia tienen prioridad.',
  },
  {
    day: 'D4 Lower volumen',
    focus: 'Hipertrofia de tren inferior con variantes bien toleradas',
    block: 'Secundario',
    exercise: 'Variante de sentadilla',
    kind: 'accessory',
    reps: '8',
    rir: 'RIR 3',
    rest: '2–3 min',
    objective: 'Mantener volumen del patrón de sentadilla con menor especificidad.',
    notes: 'Usa una variante que tolere bien la cadera y la rodilla.',
  },
  {
    day: 'D4 Lower volumen',
    focus: 'Hipertrofia de tren inferior con variantes bien toleradas',
    block: 'Principal accesorio',
    exercise: 'Hack squat o prensa',
    kind: 'accessory',
    reps: '8–12',
    rest: '2 min',
    objective: 'Acumular volumen de cuádriceps con estabilidad.',
    notes: 'Ajusta pies y recorrido según tolerancia de rodilla y cadera.',
  },
  {
    day: 'D4 Lower volumen',
    focus: 'Hipertrofia de tren inferior con variantes bien toleradas',
    block: 'Accesorio',
    exercise: 'Curl femoral',
    kind: 'accessory',
    reps: '10–12',
    rest: '90–120 s',
    objective: 'Acumular volumen de isquios.',
    notes: 'Controla todo el recorrido.',
  },
  {
    day: 'D4 Lower volumen',
    focus: 'Hipertrofia de tren inferior con variantes bien toleradas',
    block: 'Accesorio',
    exercise: 'Glúteo',
    kind: 'accessory',
    sets: '2–3',
    reps: '8–12',
    rest: '90–120 s',
    objective: 'Mantener volumen de extensión de cadera.',
    notes: 'Elige hip thrust, puente o variante cómoda.',
  },
  {
    day: 'D4 Lower volumen',
    focus: 'Hipertrofia de tren inferior con variantes bien toleradas',
    block: 'Accesorio',
    exercise: 'Pantorrilla',
    kind: 'accessory',
    reps: '10–15',
    rest: '60–90 s',
    objective: 'Mantener hipertrofia y tolerancia de pantorrilla.',
    notes: 'Pausa en estiramiento tolerable y evita rebotes.',
  },
  {
    day: 'D4 Lower volumen',
    focus: 'Hipertrofia de tren inferior con variantes bien toleradas',
    block: 'Rehabilitación',
    exercise: 'Rehabilitación de cadera y rodilla',
    kind: 'rehab',
    rest: 'Según fisioterapia',
    objective: 'Cumplir el trabajo indicado por fisioterapia.',
    notes: 'Los ejercicios y límites específicos de fisioterapia tienen prioridad.',
  },
];

const LOADS_BY_EXERCISE: Record<string, readonly string[]> = {
  'D1 Upper fuerza|Press banca o press inclinado': [
    '75 kg (inclinado)',
    '75 kg (inclinado)',
    '80 kg (inclinado)',
    '80 kg (inclinado)',
    '70 kg (inclinado)',
    '80 kg (inclinado)',
    '85 kg (inclinado)',
    'Top: 90 kg · back-off: 80 o 85 kg',
  ],
  'D1 Upper fuerza|Dominada lastrada': [
    'BW + 10 kg',
    'BW + 12.5 kg',
    'BW + 12.5 kg',
    'BW + 15 kg',
    'BW + 12.5 kg',
    'BW + 15 kg',
    'BW + 17.5 kg',
    'BW + 15 kg',
  ],
  'D1 Upper fuerza|Remo': [
    '54 kg',
    '56 kg',
    '56 kg',
    '58 kg',
    '50 kg',
    '58 kg',
    '60 kg',
    '58 kg',
  ],
  'D1 Upper fuerza|Press compatible con hombro': [
    '36 kg',
    '38 kg',
    '38 kg',
    '40 kg',
    '34 kg',
    '40 kg',
    '41 kg',
    '38 kg',
  ],
  'D1 Upper fuerza|Fondos lastrados': [
    'BW + 20 kg',
    'BW + 20 kg',
    'BW + 22.5 kg',
    'BW + 22.5 kg',
    'BW + 17.5 kg',
    'BW + 22.5 kg',
    'BW + 25 kg',
    'BW + 20 kg',
  ],
  'D1 Upper fuerza|Extensión de tríceps sobre la cabeza': [
    '14 kg',
    '14 kg',
    '16 kg',
    '16 kg',
    '12 kg',
    '16 kg',
    '18 kg',
    '16 kg',
  ],
  'D2 Lower fuerza|Sentadilla': [
    '92.5 kg',
    '95 kg',
    '100 kg',
    '102.5 kg',
    '87.5–90 kg',
    '102.5 kg',
    '105 kg',
    'Top: 107.5 kg · back-off: 97.5–102.5 kg',
  ],
  'D2 Lower fuerza|Peso muerto rumano': [
    '70 kg',
    '75 kg',
    '77.5 kg',
    '80 kg',
    '70 kg',
    '80 kg',
    '82.5 kg',
    '80 kg',
  ],
  'D2 Lower fuerza|Curl femoral': [
    '45 kg',
    '47.5 kg',
    '50 kg',
    '50 kg',
    '42.5 kg',
    '50 kg',
    '52.5 kg',
    '50 kg',
  ],
  'D2 Lower fuerza|Extensión de cuádriceps': [
    '55 kg',
    '57.5 kg',
    '60 kg',
    '62.5 kg',
    '52.5 kg',
    '62.5 kg',
    '65 kg',
    '60 kg',
  ],
  'D3 Upper volumen|Variante secundaria de banca': [
    '65 kg (plano)',
    '67.5 kg (plano)',
    '67.5 kg (plano)',
    '70 kg (plano)',
    '60 kg (plano)',
    '70 kg (plano)',
    '72.5 kg (plano)',
    '67.5 kg (plano)',
  ],
  'D3 Upper volumen|Dominadas o jalón': [
    'BW + 2.5 kg · jalón 55 kg',
    'BW + 5 kg · jalón 57.5 kg',
    'BW + 5 kg · jalón 57.5 kg',
    'BW + 7.5 kg · jalón 60 kg',
    'BW · jalón 50 kg',
    'BW + 7.5 kg · jalón 60 kg',
    'BW + 10 kg · jalón 62.5 kg',
    'BW + 5 kg · jalón 57.5 kg',
  ],
  'D3 Upper volumen|Remo': [
    '52 kg',
    '54 kg',
    '54 kg',
    '56 kg',
    '47.5 kg',
    '56 kg',
    '58 kg',
    '54 kg',
  ],
  'D3 Upper volumen|Elevaciones laterales': [
    '8 kg por mano',
    '8 kg por mano',
    '9 kg por mano',
    '9 kg por mano',
    '7 kg por mano',
    '9 kg por mano',
    '10 kg por mano',
    '9 kg por mano',
  ],
  'D3 Upper volumen|Bíceps': [
    '10 kg por mano',
    '10 kg por mano',
    '12 kg por mano',
    '12 kg por mano',
    '8 kg por mano',
    '12 kg por mano',
    '12 kg por mano',
    '10 kg por mano',
  ],
  'D3 Upper volumen|Tríceps': [
    '25 kg en polea',
    '27.5 kg en polea',
    '27.5 kg en polea',
    '30 kg en polea',
    '25 kg en polea',
    '30 kg en polea',
    '32.5 kg en polea',
    '30 kg en polea',
  ],
  'D4 Lower volumen|Variante de sentadilla': [
    '70 kg (pausada)',
    '72.5 kg (pausada)',
    '75 kg (pausada)',
    '77.5 kg (pausada)',
    '65 kg (pausada)',
    '77.5 kg (pausada)',
    '80 kg (pausada)',
    '75 kg (pausada)',
  ],
  'D4 Lower volumen|Hack squat o prensa': [
    '95 kg en hack',
    '100 kg en hack',
    '100 kg en hack',
    '105 kg en hack',
    '90 kg en hack',
    '105 kg en hack',
    '110 kg en hack',
    '100 kg en hack',
  ],
  'D4 Lower volumen|Curl femoral': [
    '45 kg',
    '47.5 kg',
    '50 kg',
    '50 kg',
    '42.5 kg',
    '50 kg',
    '52.5 kg',
    '50 kg',
  ],
  'D4 Lower volumen|Glúteo': [
    '80 kg en hip thrust',
    '85 kg en hip thrust',
    '90 kg en hip thrust',
    '95 kg en hip thrust',
    '80 kg en hip thrust',
    '95 kg en hip thrust',
    '100 kg en hip thrust',
    '90 kg en hip thrust',
  ],
  'D4 Lower volumen|Pantorrilla': [
    '20 kg',
    '22.5 kg',
    '25 kg',
    '25 kg',
    '20 kg',
    '25 kg',
    '27.5 kg',
    '25 kg',
  ],
};

export function buildBlockTwoPlan(): ParsedTrainingPlan {
  const rows = WEEKS.flatMap((week, weekIndex) =>
    EXERCISES.map((exercise, exerciseIndex) =>
      buildRow(week, weekIndex + 1, exercise, exerciseIndex),
    ),
  );

  return createTrainingPlan(rows, 'bloque-2-fuerza-8-semanas');
}

function buildRow(
  week: WeekPrescription,
  weekNumber: number,
  exercise: ExerciseTemplate,
  exerciseIndex: number,
): TrainingPlanRow {
  if (exercise.kind === 'rehab') {
    return {
      week: weekNumber,
      day: exercise.day,
      focus: exercise.focus,
      phase: week.phase,
      block: exercise.block,
      exercise: exercise.exercise,
      sets: 'Según fisio',
      repsOrTime: 'Según fisio',
      suggestedLoad: 'Según fisio',
      rir: 'Sin agravar síntomas',
      tempo: 'Según fisio',
      rest: exercise.rest,
      objective: exercise.objective,
      tendonRule: TENDON_RULE,
      progression: 'La indicación de fisioterapia tiene prioridad sobre la progresión general.',
      notes: exercise.notes,
      sourceRow: 20_000 + weekNumber * 100 + exerciseIndex,
    };
  }

  const isBasic = exercise.kind === 'basic';
  const deload = weekNumber === 5;
  const evaluation = weekNumber === 8;
  const suggestedLoad =
    LOADS_BY_EXERCISE[`${exercise.day}|${exercise.exercise}`]?.[weekNumber - 1] ?? week.load;

  return {
    week: weekNumber,
    day: exercise.day,
    focus: exercise.focus,
    phase: `${week.phase}. ${week.objective}`,
    block: exercise.block,
    exercise: exercise.exercise,
    sets: isBasic
      ? week.basicSets
      : exercise.fixedPrescription
        ? exercise.sets ?? week.accessorySets
        : deload
          ? week.accessorySets
          : evaluation
            ? week.accessorySets
            : exercise.sets ?? week.accessorySets,
    repsOrTime: isBasic
      ? week.basicReps
      : exercise.fixedPrescription
        ? exercise.reps ?? week.accessoryReps
        : deload || evaluation
          ? week.accessoryReps
          : exercise.reps ?? week.accessoryReps,
    suggestedLoad,
    rir: isBasic
      ? week.basicRir
      : deload || evaluation
        ? week.accessoryRir
        : exercise.rir ?? week.accessoryRir,
    tempo: 'Controlado',
    rest: exercise.rest,
    objective: exercise.objective,
    tendonRule: TENDON_RULE,
    progression: PROGRESSION,
    notes: exercise.notes,
    sourceRow: 20_000 + weekNumber * 100 + exerciseIndex,
  };
}
