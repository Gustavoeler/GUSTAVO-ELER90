import {
  AppDB,
  CompletedSession,
  DailyCheckin,
  DailyGoals,
  DayPlan,
  HabitRating,
  MuscleGroup,
  PlanPhase,
  SetType,
  WorkoutRating,
} from '../types';

export const STORAGE_KEY = 'gustavoeler_black_red_v1';

export const DEFAULT_TARGET_REPS = 10;

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Outro',
];

export const SET_TYPE_CONFIG: Record<
  SetType,
  { short: string; label: string; bg: string; border: string; text: string }
> = {
  work: {
    short: 'T',
    label: 'Trabalho (Válida)',
    bg: '#1c1c1c',
    border: '#444444',
    text: '#f5f5f5',
  },
  warmup: {
    short: 'A',
    label: 'Aquecimento',
    bg: '#1c1917',
    border: '#78716c',
    text: '#d6d3d1',
  },
  drop: {
    short: 'D',
    label: 'Drop-set',
    bg: '#291315',
    border: '#73333a',
    text: '#ff8b91',
  },
};

export const RIR_OPTIONS = [
  { value: '', label: 'RIR' },
  { value: '0', label: 'Falha' },
  { value: '1', label: '1 RIR' },
  { value: '2', label: '2 RIR' },
  { value: '3+', label: '3+ RIR' },
];

export interface RatingConfig {
  id: WorkoutRating;
  label: string;
  shortLabel: string;
  cellBg: string;
  cellBorder: string;
  cellText: string;
  swatchHex: string;
  badgeText: string;
}

export const WORKOUT_RATINGS: RatingConfig[] = [
  {
    id: 'excelente',
    label: 'Excelente',
    shortLabel: 'Excelente',
    cellBg: '#166534',
    cellBorder: '#22c55e',
    cellText: '#ffffff',
    swatchHex: '#166534',
    badgeText: '#86efac',
  },
  {
    id: 'bom',
    label: 'Bom',
    shortLabel: 'Bom',
    cellBg: '#4ade80',
    cellBorder: '#22c55e',
    cellText: '#052e16',
    swatchHex: '#4ade80',
    badgeText: '#4ade80',
  },
  {
    id: 'ok',
    label: 'Ok',
    shortLabel: 'Ok',
    cellBg: '#facc15',
    cellBorder: '#eab308',
    cellText: '#422006',
    swatchHex: '#facc15',
    badgeText: '#facc15',
  },
  {
    id: 'ruim',
    label: 'Ruim',
    shortLabel: 'Ruim',
    cellBg: '#dc2626',
    cellBorder: '#f87171',
    cellText: '#ffffff',
    swatchHex: '#dc2626',
    badgeText: '#f87171',
  },
  {
    id: 'nao_completei',
    label: 'Não completei',
    shortLabel: 'Não completei',
    cellBg: '#6b1115',
    cellBorder: '#991b1b',
    cellText: '#fecaca',
    swatchHex: '#6b1115',
    badgeText: '#fca5a5',
  },
];

export const RATING_MAP: Record<WorkoutRating, RatingConfig> = WORKOUT_RATINGS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<WorkoutRating, RatingConfig>
);

export const isValidRating = (val: unknown): val is WorkoutRating =>
  typeof val === 'string' && val in RATING_MAP;

export interface HabitRatingConfig {
  id: HabitRating;
  label: string;
  cellBg: string;
  cellBorder: string;
  cellText: string;
  badgeText: string;
  swatchHex: string;
}

export const HABIT_RATINGS: HabitRatingConfig[] = [
  {
    id: 'ruim',
    label: 'Ruim',
    cellBg: '#dc2626',
    cellBorder: '#f87171',
    cellText: '#ffffff',
    badgeText: '#f87171',
    swatchHex: '#dc2626',
  },
  {
    id: 'bom',
    label: 'Bom',
    cellBg: '#4ade80',
    cellBorder: '#22c55e',
    cellText: '#052e16',
    badgeText: '#4ade80',
    swatchHex: '#4ade80',
  },
  {
    id: 'excelente',
    label: 'Excelente',
    cellBg: '#166534',
    cellBorder: '#22c55e',
    cellText: '#ffffff',
    badgeText: '#86efac',
    swatchHex: '#166534',
  },
];

export const HABIT_RATING_MAP: Record<HabitRating, HabitRatingConfig> = HABIT_RATINGS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<HabitRating, HabitRatingConfig>
);

export const DAY_NAMES_BY_JS_DAY = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const DAY_NAMES_BY_PLAN_DAY: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  7: 'Domingo',
};

export const DAY_SHORT_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const BODY_PARTS = [
  'Cintura',
  'Peito',
  'Braço direito',
  'Braço esquerdo',
  'Abdômen',
  'Quadril',
  'Coxa direita',
  'Coxa esquerda',
  'Panturrilha',
];

export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const todayISO = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const yesterdayISO = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatDateBR = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const parsed = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR');
};

export const toNumber = (value: unknown): number => {
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const inferMuscleGroup = (name: string): MuscleGroup => {
  const s = name.toLowerCase();
  if (
    s.includes('supino') ||
    s.includes('crossover') ||
    s.includes('peck') ||
    s.includes('flexão de braço') ||
    (s.includes('crucifixo') && !s.includes('inverso'))
  ) {
    return 'Peito';
  }
  if (
    s.includes('puxada') ||
    s.includes('remada') ||
    s.includes('pulldown') ||
    s.includes('barra fixa') ||
    s.includes('encolhimento') ||
    s.includes('serrote')
  ) {
    return 'Costas';
  }
  if (
    s.includes('agachamento') ||
    s.includes('leg press') ||
    s.includes('extensora') ||
    s.includes('flexora') ||
    s.includes('stiff') ||
    s.includes('panturrilha') ||
    s.includes('afundo') ||
    s.includes('búlgaro') ||
    s.includes('elevação pélvica') ||
    s.includes('terra') ||
    s.includes('adutora') ||
    s.includes('abdutora')
  ) {
    return 'Pernas';
  }
  if (
    s.includes('elevação lateral') ||
    s.includes('elevação frontal') ||
    s.includes('desenvolvimento') ||
    s.includes('crucifixo inverso') ||
    s.includes('face pull') ||
    s.includes('ombro')
  ) {
    return 'Ombros';
  }
  if (s.includes('rosca') || s.includes('bíceps')) {
    return 'Bíceps';
  }
  if (s.includes('tríceps') || s.includes('testa') || s.includes('francês') || s.includes('paralela')) {
    return 'Tríceps';
  }
  return 'Outro';
};

const ALTERNATIVES_BY_GROUP: Record<MuscleGroup, string[]> = {
  Peito: [
    'Supino reto na máquina',
    'Supino inclinado na máquina',
    'Supino reto com halteres',
    'Crucifixo com halteres',
    'Crossover na polia',
    'Peck deck',
  ],
  Costas: [
    'Puxada neutra',
    'Puxada triângulo',
    'Remada máquina articulada',
    'Remada unilateral com halter (Serrote)',
    'Remada cavalinho',
    'Pulldown na polia',
  ],
  Pernas: [
    'Leg press 45°',
    'Agachamento no Smith',
    'Cadeira extensora',
    'Mesa flexora',
    'Cadeira flexora',
    'Stiff com barra',
    'Panturrilha sentado',
  ],
  Ombros: [
    'Desenvolvimento na máquina',
    'Elevação lateral na polia',
    'Elevação lateral com halteres',
    'Crucifixo inverso na máquina',
    'Face pull na corda',
  ],
  Bíceps: [
    'Rosca direta na polia',
    'Rosca alternada com halteres',
    'Rosca martelo com corda',
    'Rosca Scott máquina',
    'Rosca inclinada 45°',
  ],
  Tríceps: [
    'Tríceps barra reta na polia',
    'Tríceps francês com halter',
    'Tríceps testa com barra W',
    'Tríceps corda',
    'Tríceps na máquina (mergulho)',
  ],
  Outro: [
    'Abdominal infra',
    'Abdominal na polia',
    'Prancha isométrica',
    'Hiperextensão lombar',
  ],
};

export const getExerciseAlternatives = (
  currentName: string,
  group?: MuscleGroup
): string[] => {
  const resolved = group || inferMuscleGroup(currentName);
  return ALTERNATIVES_BY_GROUP[resolved].filter(
    (item) => item.toLowerCase() !== currentName.trim().toLowerCase()
  );
};

type TemplateTuple = [string, [string, number, number][]];

const DEFAULT_TEMPLATES: TemplateTuple[] = [
  [
    'Peito e tríceps',
    [
      ['Supino inclinado com halteres', 3, 120],
      ['Supino reto com barra', 3, 120],
      ['Crucifixo na máquina', 2, 75],
      ['Crossover', 2, 75],
      ['Tríceps na corda', 3, 75],
      ['Tríceps unilateral', 2, 75],
    ],
  ],
  [
    'Costas e bíceps',
    [
      ['Puxada alta aberta', 3, 120],
      ['Remada baixa', 3, 120],
      ['Remada articulada', 2, 120],
      ['Pulldown', 2, 75],
      ['Rosca direta', 3, 75],
      ['Rosca martelo', 2, 75],
      ['Encolhimento', 2, 75],
    ],
  ],
  [
    'Pernas completas',
    [
      ['Agachamento hack', 3, 120],
      ['Leg press', 3, 120],
      ['Cadeira extensora', 2, 75],
      ['Mesa flexora', 3, 75],
      ['Stiff com halteres', 2, 120],
      ['Panturrilha em pé', 3, 75],
    ],
  ],
  [
    'Peito, costas e ombros',
    [
      ['Supino inclinado na máquina', 3, 120],
      ['Crossover', 2, 75],
      ['Puxada neutra', 3, 120],
      ['Remada com apoio no peito', 3, 120],
      ['Elevação lateral', 3, 75],
      ['Crucifixo inverso', 2, 75],
    ],
  ],
  [
    'Braços e ombros',
    [
      ['Rosca Scott', 3, 75],
      ['Rosca na polia', 2, 75],
      ['Tríceps unilateral', 3, 75],
      ['Tríceps coice', 2, 75],
      ['Desenvolvimento com halteres', 2, 120],
      ['Elevação lateral', 2, 75],
    ],
  ],
];

export const DEFAULT_GOALS: Required<DailyGoals> = {
  waterMl: 3000,
  proteinG: 160,
  weeklyWorkouts: 5,
  sleepHours: 7,
  remindersEnabled: true,
};

export const createEmptyCheckin = (date = todayISO()): DailyCheckin => ({
  date,
  waterMl: 0,
  proteinG: 0,
  creatine: false,
  cardioMin: 0,
  sleepHours: 7,
  energy: 0,
});

export const createFreshDB = (): AppDB => {
  const plan: DayPlan[] = DEFAULT_TEMPLATES.map(([name, exercises], index) => ({
    day: index + 1,
    name,
    ex: exercises.map(([exName, sets, rest]) => ({
      id: uid(),
      name: exName,
      sets,
      rest,
      targetReps: DEFAULT_TARGET_REPS,
      muscleGroup: inferMuscleGroup(exName),
      video: '',
      notes: '',
    })),
  }));

  const phase1: PlanPhase = {
    id: 'phase-1',
    name: 'Fase 1 (Base)',
    plan,
  };

  return {
    project: {
      start: todayISO(),
      name: 'Projeto de transformação',
      goal: 90,
    },
    plan,
    phases: [phase1],
    activePhaseId: phase1.id,
    sessions: [],
    weights: [],
    measures: [],
    photos: [],
    selectedDay: 1,
    activeSession: null,
    checkins: {},
    goals: { ...DEFAULT_GOALS },
    dayRatings: {},
  };
};

export const getPlanForDay = (db: AppDB, day: number): DayPlan => {
  const found = db.plan.find((p) => p.day === day);
  if (found) return found;
  return {
    day,
    name: 'Dia de descanso',
    ex: [],
  };
};

export const normalizeDB = (raw: unknown): AppDB => {
  const fallback = createFreshDB();
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Partial<AppDB>;
  if (!obj.project || !Array.isArray(obj.plan) || !Array.isArray(obj.sessions)) {
    return fallback;
  }

  const normalizedPlan: DayPlan[] = obj.plan.map((p) => ({
    ...p,
    ex: (p.ex || []).map((e) => ({
      ...e,
      targetReps: e.targetReps || DEFAULT_TARGET_REPS,
      muscleGroup: e.muscleGroup || inferMuscleGroup(e.name),
    })),
  }));

  let activeSession = obj.activeSession ?? null;
  if (activeSession && Array.isArray(activeSession.exercises)) {
    activeSession = {
      ...activeSession,
      exercises: activeSession.exercises.map((e) => ({
        ...e,
        targetReps: e.targetReps || DEFAULT_TARGET_REPS,
        muscleGroup: e.muscleGroup || inferMuscleGroup(e.name),
        done: Array.isArray(e.done) ? e.done : Array(e.sets).fill(false),
        loads: Array.isArray(e.loads) ? e.loads : Array(e.sets).fill(''),
        reps: Array.isArray(e.reps) ? e.reps : Array(e.sets).fill(''),
        setTypes: Array.isArray(e.setTypes) ? e.setTypes : Array(e.sets).fill('work'),
        rirs: Array.isArray(e.rirs) ? e.rirs : Array(e.sets).fill(''),
        note: e.note ?? '',
      })),
    };
  }

  const cleanDayRatings: Record<string, WorkoutRating> = {};
  if (obj.dayRatings && typeof obj.dayRatings === 'object') {
    Object.entries(obj.dayRatings).forEach(([k, v]) => {
      if (isValidRating(v)) {
        cleanDayRatings[k] = v;
      }
    });
  }

  const phases: PlanPhase[] =
    Array.isArray(obj.phases) && obj.phases.length > 0
      ? obj.phases
      : [{ id: 'phase-1', name: 'Fase 1 (Base)', plan: normalizedPlan }];

  const activePhaseId =
    obj.activePhaseId && phases.some((ph) => ph.id === obj.activePhaseId)
      ? obj.activePhaseId
      : phases[0].id;

  return {
    project: {
      start: obj.project.start || todayISO(),
      name: obj.project.name || 'Projeto de transformação',
      goal: Math.max(1, toNumber(obj.project.goal) || 90),
    },
    plan: normalizedPlan,
    phases,
    activePhaseId,
    sessions: obj.sessions,
    weights: Array.isArray(obj.weights) ? obj.weights : [],
    measures: Array.isArray(obj.measures) ? obj.measures : [],
    photos: Array.isArray(obj.photos) ? obj.photos : [],
    selectedDay: obj.selectedDay && obj.selectedDay >= 1 && obj.selectedDay <= 7 ? obj.selectedDay : 1,
    activeSession,
    checkins: obj.checkins && typeof obj.checkins === 'object' ? obj.checkins : {},
    goals: {
      waterMl: Math.max(500, toNumber(obj.goals?.waterMl) || DEFAULT_GOALS.waterMl),
      proteinG: Math.max(20, toNumber(obj.goals?.proteinG) || DEFAULT_GOALS.proteinG),
      weeklyWorkouts: Math.min(
        7,
        Math.max(1, toNumber(obj.goals?.weeklyWorkouts) || DEFAULT_GOALS.weeklyWorkouts)
      ),
      sleepHours: Math.min(
        12,
        Math.max(4, toNumber(obj.goals?.sleepHours) || DEFAULT_GOALS.sleepHours)
      ),
      remindersEnabled: obj.goals?.remindersEnabled !== false,
    },
    dayRatings: cleanDayRatings,
  };
};

export interface EvaluatedHabits {
  sleep: HabitRating;
  water: HabitRating;
  creatine: HabitRating;
  overall: HabitRating;
  isSleepManual: boolean;
  isWaterManual: boolean;
  isCreatineManual: boolean;
}

export const evaluateDailyHabits = (
  checkin: DailyCheckin,
  goals?: DailyGoals
): EvaluatedHabits => {
  const waterGoal = goals?.waterMl || DEFAULT_GOALS.waterMl;
  const sleepGoal = goals?.sleepHours || DEFAULT_GOALS.sleepHours;
  const sleepHrs = checkin.sleepHours ?? 7;

  const autoSleep: HabitRating =
    sleepHrs >= sleepGoal + 0.5 ? 'excelente' : sleepHrs >= sleepGoal - 0.5 ? 'bom' : 'ruim';

  const autoWater: HabitRating =
    checkin.waterMl >= waterGoal
      ? 'excelente'
      : checkin.waterMl >= waterGoal * 0.65
      ? 'bom'
      : 'ruim';

  const autoCreatine: HabitRating = checkin.creatine ? 'excelente' : 'ruim';

  const sleep = checkin.sleepQuality ?? autoSleep;
  const water = checkin.waterQuality ?? autoWater;
  const creatine = checkin.creatineQuality ?? autoCreatine;

  const scores: Record<HabitRating, number> = { ruim: 1, bom: 2, excelente: 3 };
  const list = [sleep, water, creatine];
  const minScore = Math.min(...list.map((r) => scores[r]));
  const avg = list.reduce((acc, r) => acc + scores[r], 0) / 3;
  const overall: HabitRating =
    minScore === 1 || avg < 1.8 ? 'ruim' : avg >= 2.65 ? 'excelente' : 'bom';

  return {
    sleep,
    water,
    creatine,
    overall,
    isSleepManual: Boolean(checkin.sleepQuality),
    isWaterManual: Boolean(checkin.waterQuality),
    isCreatineManual: Boolean(checkin.creatineQuality),
  };
};

export interface HabitReminder {
  id: string;
  category: 'sleep' | 'water' | 'creatine';
  severity: 'danger' | 'warn';
  title: string;
  message: string;
  actionType?: 'addWater' | 'markCreatine' | 'addSleep';
  actionLabel?: string;
}

export const getHabitReminders = (db: AppDB, now = new Date()): HabitReminder[] => {
  if (db.goals?.remindersEnabled === false) return [];

  const today = todayISO();
  const yesterday = yesterdayISO();
  const hour = now.getHours();

  const waterGoal = db.goals?.waterMl || DEFAULT_GOALS.waterMl;
  const sleepGoal = db.goals?.sleepHours || DEFAULT_GOALS.sleepHours;

  const todayCk = db.checkins?.[today] ?? createEmptyCheckin(today);
  const yesterdayCk = db.checkins?.[yesterday];
  const todayEval = evaluateDailyHabits(todayCk, db.goals);
  const yesterdayEval = yesterdayCk ? evaluateDailyHabits(yesterdayCk, db.goals) : null;

  const reminders: HabitReminder[] = [];

  // 1. Sono
  const sleepHours = todayCk.sleepHours ?? 7;
  if (todayEval.sleep === 'ruim') {
    reminders.push({
      id: 'sleep-bad-today',
      category: 'sleep',
      severity: 'danger',
      title: 'Lembrete de sono',
      message: `Sono avaliado como Ruim (${sleepHours.toFixed(1).replace('.', ',')}h). Evite cafeína à tarde e mire dormir ${sleepGoal}h+ hoje.`,
      actionType: 'addSleep',
      actionLabel: '+0,5h sono',
    });
  } else if (yesterdayEval && yesterdayEval.sleep === 'ruim' && !todayCk.sleepQuality) {
    reminders.push({
      id: 'sleep-recover-yesterday',
      category: 'sleep',
      severity: 'warn',
      title: 'Recuperar sono de ontem',
      message: `Ontem seu sono foi Ruim. Priorize deitar mais cedo hoje para bater ${sleepGoal}h.`,
    });
  }

  // 2. Água
  const waterRemaining = Math.max(0, waterGoal - todayCk.waterMl);
  const waterPct = waterGoal > 0 ? todayCk.waterMl / waterGoal : 0;
  const behindWaterSchedule =
    (hour >= 11 && waterPct < 0.35) ||
    (hour >= 15 && waterPct < 0.65) ||
    (hour >= 19 && waterPct < 0.9);

  if (todayCk.waterQuality === 'ruim') {
    reminders.push({
      id: 'water-bad-today',
      category: 'water',
      severity: 'danger',
      title: 'Hidratação baixa',
      message: `Água marcada como Ruim hoje. Beba um copo agora (faltam ${waterRemaining} ml para a meta).`,
      actionType: 'addWater',
      actionLabel: '+250ml agora',
    });
  } else if (waterRemaining > 0 && behindWaterSchedule) {
    reminders.push({
      id: 'water-behind',
      category: 'water',
      severity: hour >= 19 ? 'danger' : 'warn',
      title: 'Hora de beber água',
      message: `Faltam ${waterRemaining} ml para bater sua meta de ${(waterGoal / 1000)
        .toFixed(1)
        .replace('.', ',')}L hoje.`,
      actionType: 'addWater',
      actionLabel: '+250ml agora',
    });
  } else if (yesterdayEval && yesterdayEval.water === 'ruim' && waterPct < 0.5) {
    reminders.push({
      id: 'water-yesterday-miss',
      category: 'water',
      severity: 'warn',
      title: 'Atenção à água hoje',
      message: `Ontem a hidratação foi Ruim. Deixe uma garrafa cheia perto de você hoje.`,
      actionType: 'addWater',
      actionLabel: '+250ml agora',
    });
  }

  // 3. Creatina
  if (todayCk.creatineQuality === 'ruim') {
    reminders.push({
      id: 'creatine-bad-today',
      category: 'creatine',
      severity: 'danger',
      title: 'Creatina pendente',
      message: 'Creatina marcada como Ruim hoje. Tome sua dose diária assim que possível.',
      actionType: 'markCreatine',
      actionLabel: 'Tomar creatina',
    });
  } else if (!todayCk.creatine && hour >= 9) {
    const missedYesterday = Boolean(
      yesterdayCk && (!yesterdayCk.creatine || yesterdayCk.creatineQuality === 'ruim')
    );
    reminders.push({
      id: 'creatine-pending',
      category: 'creatine',
      severity: missedYesterday || hour >= 18 ? 'danger' : 'warn',
      title: 'Lembrete de creatina',
      message: missedYesterday
        ? 'Você não tomou creatina ontem e ainda não marcou hoje. Tome 3–5g agora!'
        : 'Você ainda não marcou sua creatina de hoje.',
      actionType: 'markCreatine',
      actionLabel: 'Marcar tomada',
    });
  } else if (
    yesterdayCk &&
    (!yesterdayCk.creatine || yesterdayCk.creatineQuality === 'ruim') &&
    !todayCk.creatine
  ) {
    reminders.push({
      id: 'creatine-yesterday',
      category: 'creatine',
      severity: 'warn',
      title: 'Não esqueça da creatina',
      message: 'Ontem ficou sem creatina. Garanta a dose de hoje para manter a saturação.',
      actionType: 'markCreatine',
      actionLabel: 'Marcar tomada',
    });
  }

  return reminders;
};

export const loadDB = (): AppDB => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createFreshDB();
    return normalizeDB(JSON.parse(raw));
  } catch {
    return createFreshDB();
  }
};

export const saveDB = (db: AppDB): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
};

export const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas indisponível'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });

export const calculateExercisesVolume = (
  exercises: {
    done: boolean[];
    loads: string[];
    reps?: string[];
    setTypes?: SetType[];
  }[]
): number => {
  let total = 0;
  exercises.forEach((ex) => {
    ex.loads.forEach((loadVal, idx) => {
      if (ex.setTypes?.[idx] === 'warmup') return;
      const load = toNumber(loadVal);
      if (load <= 0) return;
      const reps = toNumber(ex.reps?.[idx]);
      const isDone = ex.done?.[idx];
      if (isDone && reps > 0) {
        total += load * reps;
      }
    });
  });
  return Math.round(total);
};

export const calculateSessionVolume = (session: CompletedSession): number =>
  calculateExercisesVolume(session.exercises);

export const isReadyToProgress = (
  exercise: {
    done: boolean[];
    loads: string[];
    reps?: string[];
    setTypes?: SetType[];
    targetReps?: number;
  },
  fallbackTarget = DEFAULT_TARGET_REPS
): { ready: boolean; topReps: number; maxLoad: number } => {
  const target = Math.max(1, exercise.targetReps || fallbackTarget);
  const workIndices = exercise.done
    .map((_, idx) => idx)
    .filter((idx) => exercise.setTypes?.[idx] !== 'warmup');

  if (workIndices.length === 0) {
    return { ready: false, topReps: target, maxLoad: 0 };
  }

  const allCompleted = workIndices.every((idx) => Boolean(exercise.done[idx]));
  const allHitTarget = workIndices.every(
    (idx) => toNumber(exercise.reps?.[idx]) >= target
  );
  const loads = workIndices
    .map((idx) => toNumber(exercise.loads[idx]))
    .filter((v) => v > 0);
  const maxLoad = loads.length > 0 ? Math.max(...loads) : 0;

  return {
    ready: allCompleted && allHitTarget && maxLoad > 0,
    topReps: target,
    maxLoad,
  };
};

export const getMondayWeekKey = (dateStr: string): string => {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const calculateWeeklyStreak = (
  sessions: CompletedSession[],
  weeklyGoal: number
): number => {
  if (!sessions.length) return 0;
  const countsByWeek: Record<string, number> = {};
  sessions.forEach((s) => {
    const wk = getMondayWeekKey(s.date);
    countsByWeek[wk] = (countsByWeek[wk] || 0) + 1;
  });

  const currentWeek = getMondayWeekKey(todayISO());
  const cursor = new Date(`${currentWeek}T12:00:00`);
  let streak = 0;

  if ((countsByWeek[currentWeek] || 0) >= weeklyGoal) {
    streak++;
  }

  for (let i = 0; i < 60; i++) {
    cursor.setDate(cursor.getDate() - 7);
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    const wk = `${y}-${m}-${dd}`;
    if ((countsByWeek[wk] || 0) >= weeklyGoal) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

export const estimate1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

export const calculatePlatesPerSide = (
  totalWeight: number,
  barWeight: number,
  availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25]
): { perSide: number; plates: { weight: number; count: number }[]; remainder: number } => {
  const load = Math.max(0, totalWeight - barWeight);
  let remainingPerSide = load / 2;
  const plates: { weight: number; count: number }[] = [];

  for (const plate of availablePlates) {
    if (remainingPerSide + 1e-6 >= plate) {
      const count = Math.floor((remainingPerSide + 1e-6) / plate);
      if (count > 0) {
        plates.push({ weight: plate, count });
        remainingPerSide = Math.round((remainingPerSide - count * plate) * 100) / 100;
      }
    }
  }

  return {
    perSide: Math.round((load / 2) * 100) / 100,
    plates,
    remainder: Math.max(0, remainingPerSide),
  };
};

export const formatSessionSummaryText = (session: CompletedSession): string => {
  const volume = calculateSessionVolume(session);
  const ratingInfo = session.rating ? RATING_MAP[session.rating] : null;
  const lines = [
    `GUSTAVOELER — ${session.name}`,
    `Data: ${formatDateBR(session.date)} · ${session.duration} min · ${session.sets} séries${
      volume > 0 ? ` · ${volume.toLocaleString('pt-BR')} kg vol.` : ''
    }${ratingInfo ? ` · Avaliação: ${ratingInfo.label}` : ''}`,
    '',
  ];

  session.exercises.forEach((ex) => {
    const setsText = ex.done
      .map((done, idx) => {
        const tag =
          ex.setTypes?.[idx] === 'warmup'
            ? '[A] '
            : ex.setTypes?.[idx] === 'drop'
            ? '[D] '
            : '';
        const load = ex.loads[idx] ? `${ex.loads[idx]}kg` : '—';
        const reps = ex.reps?.[idx] ? `${ex.reps[idx]}r` : '';
        return `${tag}${done ? '✓' : '○'} ${load}${reps ? `×${reps}` : ''}`;
      })
      .join(' | ');
    lines.push(`• ${ex.name}: ${setsText}`);
    if (ex.note?.trim()) {
      lines.push(`  Obs: ${ex.note.trim()}`);
    }
  });

  return lines.join('\n');
};

export const downloadShareSummaryCard = (
  db: AppDB,
  year: number,
  month: number
): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const W = 900;
    const H = 1040;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Background
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, W, H);

    // Subtle Hero Top Gradient
    const grad = ctx.createLinearGradient(0, 0, W, 280);
    grad.addColorStop(0, '#2a1114');
    grad.addColorStop(1, '#0d0d0d');
    ctx.fillStyle = grad;
    ctx.fillRect(36, 36, W - 72, 200);
    ctx.strokeStyle = '#55252a';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, W - 72, 200);

    // Brand
    ctx.fillStyle = '#f5f5f5';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('GUSTAVO', 68, 92);
    const wGustavo = ctx.measureText('GUSTAVO').width;
    ctx.fillStyle = '#ff303b';
    ctx.fillText('ELER', 68 + wGustavo, 92);

    ctx.fillStyle = '#999999';
    ctx.font = '600 16px sans-serif';
    ctx.fillText(`${db.project.name.toUpperCase()} · RESUMO MENSAL`, 68, 122);

    const monthTitle = `${MONTH_NAMES_PT[month].toUpperCase()} ${year}`;
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 38px sans-serif';
    ctx.fillText(monthTitle, 68, 185);

    const mmStr = String(month + 1).padStart(2, '0');
    const monthPrefix = `${year}-${mmStr}-`;
    const monthSessions = db.sessions.filter((s) => s.date.startsWith(monthPrefix));
    const monthSets = monthSessions.reduce((a, s) => a + s.sets, 0);
    const monthVol = monthSessions.reduce((a, s) => a + calculateSessionVolume(s), 0);

    // 3 KPI Boxes
    const kpis = [
      { label: 'TREINOS NO MÊS', value: String(monthSessions.length) },
      { label: 'SÉRIES CONCLUÍDAS', value: String(monthSets) },
      { label: 'VOLUME TOTAL', value: `${monthVol.toLocaleString('pt-BR')} kg` },
    ];

    kpis.forEach((k, idx) => {
      const boxW = (W - 72 - 24) / 3;
      const x = 36 + idx * (boxW + 12);
      const y = 256;
      ctx.fillStyle = '#151515';
      ctx.fillRect(x, y, boxW, 108);
      ctx.strokeStyle = '#303030';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, boxW, 108);

      ctx.fillStyle = '#999999';
      ctx.font = '700 14px sans-serif';
      ctx.fillText(k.label, x + 22, y + 38);

      ctx.fillStyle = idx === 2 ? '#ff303b' : '#ffffff';
      ctx.font = '800 32px sans-serif';
      ctx.fillText(k.value, x + 22, y + 82);
    });

    // Monthly Calendar Grid inside Canvas
    ctx.fillStyle = '#111111';
    ctx.fillRect(36, 386, W - 72, 530);
    ctx.strokeStyle = '#303030';
    ctx.strokeRect(36, 386, W - 72, 530);

    const weekHeaders = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const cellW = (W - 120 - 6 * 10) / 7;
    const cellH = 60;

    weekHeaders.forEach((h, idx) => {
      const cx = 60 + idx * (cellW + 10) + cellW / 2;
      ctx.fillStyle = '#888888';
      ctx.font = '700 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(h, cx, 424);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const sessionsByDate: Record<string, CompletedSession[]> = {};
    monthSessions.forEach((s) => {
      if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
      sessionsByDate[s.date].push(s);
    });

    for (let d = 1; d <= totalDays; d++) {
      const slot = firstDay + (d - 1);
      const col = slot % 7;
      const row = Math.floor(slot / 7);
      const x = 60 + col * (cellW + 10);
      const y = 442 + row * (cellH + 10);
      const iso = `${monthPrefix}${String(d).padStart(2, '0')}`;
      const daySess = sessionsByDate[iso] || [];
      const rated = [...daySess].reverse().find((s) => Boolean(s.rating));
      const ratingId = rated?.rating ?? db.dayRatings?.[iso];
      const cfg = ratingId ? RATING_MAP[ratingId] : null;

      ctx.fillStyle = cfg ? cfg.cellBg : daySess.length > 0 ? '#291315' : '#1a1a1a';
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = cfg ? cfg.cellBorder : daySess.length > 0 ? '#ff303b' : '#2e2e2e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, cellW, cellH);

      ctx.fillStyle = cfg ? cfg.cellText : daySess.length > 0 ? '#ffffff' : '#888888';
      ctx.font = '800 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(d), x + cellW / 2, y + 37);
    }

    // Legend at bottom of card
    ctx.textAlign = 'left';
    let lx = 48;
    const ly = 966;
    WORKOUT_RATINGS.forEach((r) => {
      ctx.fillStyle = r.cellBg;
      ctx.fillRect(lx, ly - 15, 18, 18);
      ctx.strokeStyle = r.cellBorder;
      ctx.strokeRect(lx, ly - 15, 18, 18);
      ctx.fillStyle = '#d4d4d4';
      ctx.font = '700 15px sans-serif';
      ctx.fillText(r.label, lx + 26, ly);
      lx += 34 + ctx.measureText(r.label).width + 24;
    });

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `gustavoeler-${year}-${mmStr}.png`;
    a.click();
    return true;
  } catch {
    return false;
  }
};

export const playTimerBeep = (): void => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [0, 0.2].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(offset === 0 ? 784 : 1046.5, now + offset);
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.17);
    });

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore audio context blocks
  }

  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([120, 60, 120]);
    }
  } catch {
    // Ignore vibration unsupported
  }
};
