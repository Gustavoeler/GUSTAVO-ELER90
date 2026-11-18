export type TabId = 'home' | 'training' | 'stats';

export type WorkoutRating = 'excelente' | 'bom' | 'ok' | 'ruim' | 'nao_completei';

export type HabitRating = 'ruim' | 'bom' | 'excelente';

export type SetType = 'work' | 'warmup' | 'drop';

export type MuscleGroup =
  | 'Peito'
  | 'Costas'
  | 'Pernas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Outro';

export interface ProjectConfig {
  start: string;
  name: string;
  goal: number;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  sets: number;
  rest: number;
  targetReps?: number;
  muscleGroup?: MuscleGroup;
  video?: string;
  notes?: string;
}

export interface DayPlan {
  day: number; // 1 = Seg .. 7 = Dom
  name: string;
  ex: ExerciseTemplate[];
}

export interface PlanPhase {
  id: string;
  name: string;
  plan: DayPlan[];
}

export interface SessionExercise extends ExerciseTemplate {
  done: boolean[];
  loads: string[];
  reps: string[];
  setTypes?: SetType[];
  rirs?: string[];
  note: string;
}

export interface ActiveSession {
  day: number;
  exercises: SessionExercise[];
  start: number;
}

export interface CompletedSessionExercise {
  name: string;
  done: boolean[];
  loads: string[];
  reps: string[];
  setTypes?: SetType[];
  rirs?: string[];
  targetReps?: number;
  muscleGroup?: MuscleGroup;
  note: string;
  rest: number;
}

export interface CompletedSession {
  id: string;
  day: number;
  name: string;
  date: string;
  duration: number;
  sets: number;
  rating?: WorkoutRating;
  exercises: CompletedSessionExercise[];
}

export interface WeightRecord {
  id: string;
  date: string;
  value: number;
}

export interface MeasureRecord {
  id?: string;
  name: string;
  value: number;
  date: string;
}

export interface PhotoRecord {
  id: string;
  date: string;
  data: string;
}

export interface DailyCheckin {
  date: string;
  waterMl: number;
  proteinG: number;
  creatine: boolean;
  cardioMin: number;
  sleepHours?: number;
  energy?: number;
  sleepQuality?: HabitRating;
  waterQuality?: HabitRating;
  creatineQuality?: HabitRating;
}

export interface DailyGoals {
  waterMl: number;
  proteinG: number;
  weeklyWorkouts?: number;
  sleepHours?: number;
  remindersEnabled?: boolean;
}

export interface AppDB {
  project: ProjectConfig;
  plan: DayPlan[];
  phases?: PlanPhase[];
  activePhaseId?: string;
  sessions: CompletedSession[];
  weights: WeightRecord[];
  measures: MeasureRecord[];
  photos: PhotoRecord[];
  selectedDay: number;
  activeSession?: ActiveSession | null;
  checkins?: Record<string, DailyCheckin>;
  goals?: DailyGoals;
  dayRatings?: Record<string, WorkoutRating>;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}
