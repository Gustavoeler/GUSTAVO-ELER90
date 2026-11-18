import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, Home, LayoutGrid } from 'lucide-react';
import {
  ActiveSession,
  AppDB,
  CompletedSession,
  ConfirmDialogState,
  DailyCheckin,
  DayPlan,
  ExerciseTemplate,
  HabitRating,
  MuscleGroup,
  PlanPhase,
  SetType,
  TabId,
  WorkoutRating,
} from './types';
import {
  BODY_PARTS,
  compressImage,
  createEmptyCheckin,
  createFreshDB,
  DEFAULT_GOALS,
  DEFAULT_TARGET_REPS,
  evaluateDailyHabits,
  formatDateBR,
  getExerciseAlternatives,
  getHabitReminders,
  getPlanForDay,
  HABIT_RATINGS,
  inferMuscleGroup,
  loadDB,
  MUSCLE_GROUPS,
  normalizeDB,
  playTimerBeep,
  RATING_MAP,
  saveDB,
  todayISO,
  toNumber,
  uid,
  WORKOUT_RATINGS,
} from './data/defaults';
import { HomeTab } from './components/HomeTab';
import { TrainingTab } from './components/TrainingTab';
import { StatsTab } from './components/StatsTab';
import { ConfirmModal, Modal, Toast } from './components/Modal';
import { SessionDetailModal } from './components/SessionDetailModal';
import { ToolsModal } from './components/ToolsModal';

type ActiveModal =
  | { type: 'none' }
  | { type: 'project' }
  | { type: 'weight' }
  | { type: 'measure' }
  | { type: 'addExercise' }
  | { type: 'editSessionExercise'; index: number }
  | { type: 'swapExercise'; index: number }
  | { type: 'editPlan' }
  | { type: 'editPlanExercise'; index: number }
  | { type: 'phases' }
  | { type: 'adjustTimer' }
  | { type: 'settings' };

const syncPlanWithActivePhase = (prev: AppDB, updatedPlan: DayPlan[]): AppDB => {
  const activeId = prev.activePhaseId;
  const phases = (prev.phases || []).map((ph) =>
    ph.id === activeId ? { ...ph, plan: updatedPlan } : ph
  );
  return { ...prev, plan: updatedPlan, phases };
};

export default function App() {
  const [db, setDb] = useState<AppDB>(() => loadDB());
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [modal, setModal] = useState<ActiveModal>({ type: 'none' });
  const [selectedSession, setSelectedSession] = useState<CompletedSession | null>(null);
  const [sessionRating, setSessionRating] = useState<WorkoutRating | null>(null);
  const [finishRatingOpen, setFinishRatingOpen] = useState(false);
  const [calendarDayModal, setCalendarDayModal] = useState<{
    dateIso: string;
    sessions: CompletedSession[];
  } | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Rest timer state
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [timerTotal, setTimerTotal] = useState<number>(0);
  const [timerPaused, setTimerPaused] = useState<boolean>(true);
  const [timerSound, setTimerSound] = useState<boolean>(true);

  // Modal form states
  const [projectName, setProjectName] = useState('');
  const [projectStart, setProjectStart] = useState('');
  const [projectGoal, setProjectGoal] = useState('90');
  const [goalWaterMl, setGoalWaterMl] = useState('3000');
  const [goalProteinG, setGoalProteinG] = useState('160');
  const [goalWeeklyWorkouts, setGoalWeeklyWorkouts] = useState('5');
  const [goalSleepHours, setGoalSleepHours] = useState('7');
  const [goalRemindersEnabled, setGoalRemindersEnabled] = useState(true);

  const [weightDate, setWeightDate] = useState(todayISO());
  const [weightValue, setWeightValue] = useState('');

  const [measurePart, setMeasurePart] = useState(BODY_PARTS[0]);
  const [measureValue, setMeasureValue] = useState('');
  const [measureDate, setMeasureDate] = useState(todayISO());

  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('3');
  const [exRest, setExRest] = useState('90');
  const [exTargetReps, setExTargetReps] = useState(String(DEFAULT_TARGET_REPS));
  const [exMuscleGroup, setExMuscleGroup] = useState<MuscleGroup>('Peito');
  const [exVideo, setExVideo] = useState('');

  const [swapCustomName, setSwapCustomName] = useState('');
  const [newPhaseName, setNewPhaseName] = useState('');
  const [cloneCurrentPhase, setCloneCurrentPhase] = useState(true);

  const [planDayTitle, setPlanDayTitle] = useState('');
  const [timerInput, setTimerInput] = useState('60');

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const dbRef = useRef<AppDB>(db);
  dbRef.current = db;
  const soundRef = useRef<boolean>(timerSound);
  soundRef.current = timerSound;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Persist DB to localStorage
  useEffect(() => {
    const ok = saveDB(db);
    if (!ok) {
      showToast('Armazenamento cheio. Exporte um backup e remova fotos antigas.');
    }
  }, [db, showToast]);

  useEffect(() => {
    const persistNow = () => {
      saveDB(dbRef.current);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') persistNow();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', persistNow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', persistNow);
    };
  }, []);

  // Rest timer countdown
  useEffect(() => {
    if (timerPaused || timerRemaining <= 0) return;
    const id = window.setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          setTimerPaused(true);
          if (soundRef.current) {
            playTimerBeep();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerPaused, timerRemaining]);

  const runTimer = useCallback((sec: number) => {
    const safeSec = Math.max(0, Math.floor(sec));
    setTimerTotal(safeSec);
    setTimerRemaining(safeSec);
    setTimerPaused(safeSec === 0);
  }, []);

  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  // Periodic habit reminder check (every 30 min, throttled to at most once every 90 min)
  useEffect(() => {
    const checkReminders = () => {
      const currentDb = dbRef.current;
      if (currentDb.goals?.remindersEnabled === false) return;
      const rems = getHabitReminders(currentDb);
      if (rems.length === 0) return;

      const lastNotifiedKey = 'ge_last_habit_notif_ts';
      const now = Date.now();
      let lastTs = 0;
      try {
        lastTs = Number(localStorage.getItem(lastNotifiedKey) || 0);
      } catch {
        lastTs = 0;
      }
      if (now - lastTs < 90 * 60 * 1000) return;

      const top = rems[0];
      try {
        localStorage.setItem(lastNotifiedKey, String(now));
      } catch {
        // Ignore storage errors
      }

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(`GustavoEler — ${top.title}`, {
            body: top.message,
          });
        } catch {
          showToast(`${top.title}: ${top.message}`);
        }
      } else {
        showToast(`${top.title}: ${top.message}`);
      }
    };

    const initialTimer = window.setTimeout(checkReminders, 5000);
    const interval = window.setInterval(checkReminders, 30 * 60 * 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [showToast]);

  const handleUpdateCheckinByDate = useCallback(
    (dateIso: string, updater: (prev: DailyCheckin) => DailyCheckin) => {
      setDb((prev) => {
        const existing = prev.checkins?.[dateIso] ?? createEmptyCheckin(dateIso);
        const updated = updater(existing);
        return {
          ...prev,
          checkins: {
            ...(prev.checkins || {}),
            [dateIso]: updated,
          },
        };
      });
    },
    []
  );

  const handleUpdateTodayCheckin = useCallback(
    (updater: (prev: DailyCheckin) => DailyCheckin) => {
      handleUpdateCheckinByDate(todayISO(), updater);
    },
    [handleUpdateCheckinByDate]
  );
  // End handleUpdateTodayCheckin

  const startSessionForDay = useCallback(
    (day: number, skipConfirm = false) => {
      const doStart = () => {
        const plan = getPlanForDay(dbRef.current, day);
        const newSession: ActiveSession = {
          day,
          exercises: plan.ex.map((e) => ({
            ...e,
            targetReps: e.targetReps || DEFAULT_TARGET_REPS,
            muscleGroup: e.muscleGroup || inferMuscleGroup(e.name),
            done: Array(e.sets).fill(false),
            loads: Array(e.sets).fill(''),
            reps: Array(e.sets).fill(''),
            setTypes: Array(e.sets).fill('work' as SetType),
            rirs: Array(e.sets).fill(''),
            note: e.notes || '',
          })),
          start: Date.now(),
        };
        setDb((prev) => ({
          ...prev,
          selectedDay: day,
          activeSession: newSession,
        }));
        setSessionRating(null);
        setTimerRemaining(0);
        setTimerTotal(0);
        setTimerPaused(true);
        switchTab('training');
      };

      if (!skipConfirm && db.activeSession && db.activeSession.day === day) {
        setConfirmDialog({
          title: 'Reiniciar sessão',
          message: 'Reiniciar a sessão atual? As séries e cargas não finalizadas serão perdidas.',
          confirmLabel: 'Reiniciar',
          danger: true,
          onConfirm: doStart,
        });
        return;
      }
      doStart();
    },
    [db.activeSession, switchTab]
  );

  const handleSelectDay = useCallback(
    (day: number) => {
      if (db.activeSession && db.activeSession.day !== day) {
        setConfirmDialog({
          title: 'Trocar dia de treino',
          message: 'Trocar o dia descartará a sessão não finalizada. Continuar?',
          confirmLabel: 'Continuar',
          danger: true,
          onConfirm: () => {
            setDb((prev) => ({ ...prev, selectedDay: day, activeSession: null }));
            setSessionRating(null);
            setTimerRemaining(0);
            setTimerTotal(0);
            setTimerPaused(true);
          },
        });
        return;
      }
      setDb((prev) => ({
        ...prev,
        selectedDay: day,
        activeSession: prev.activeSession?.day === day ? prev.activeSession : null,
      }));
      if (db.activeSession?.day !== day) {
        setSessionRating(null);
        setTimerRemaining(0);
        setTimerTotal(0);
        setTimerPaused(true);
      }
    },
    [db.activeSession]
  );

  // Active session field updates
  const handleUpdateLoad = useCallback((exIdx: number, setIdx: number, value: string) => {
    setDb((prev) => {
      if (!prev.activeSession) return prev;
      const exercises = prev.activeSession.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const loads = [...e.loads];
        loads[setIdx] = value;
        return { ...e, loads };
      });
      return { ...prev, activeSession: { ...prev.activeSession, exercises } };
    });
  }, []);

  const handleUpdateReps = useCallback((exIdx: number, setIdx: number, value: string) => {
    setDb((prev) => {
      if (!prev.activeSession) return prev;
      const exercises = prev.activeSession.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const reps = [...e.reps];
        reps[setIdx] = value;
        return { ...e, reps };
      });
      return { ...prev, activeSession: { ...prev.activeSession, exercises } };
    });
  }, []);

  const handleUpdateNote = useCallback((exIdx: number, value: string) => {
    setDb((prev) => {
      if (!prev.activeSession) return prev;
      const exercises = prev.activeSession.exercises.map((e, i) =>
        i === exIdx ? { ...e, note: value } : e
      );
      return { ...prev, activeSession: { ...prev.activeSession, exercises } };
    });
  }, []);

  const handleCycleSetType = useCallback((exIdx: number, setIdx: number) => {
    const order: SetType[] = ['work', 'warmup', 'drop'];
    setDb((prev) => {
      if (!prev.activeSession) return prev;
      const exercises = prev.activeSession.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const setTypes = Array.from({ length: e.sets }, (_, j) => e.setTypes?.[j] || 'work');
        const current = setTypes[setIdx] || 'work';
        const nextType = order[(order.indexOf(current) + 1) % order.length];
        setTypes[setIdx] = nextType;
        return { ...e, setTypes };
      });
      return { ...prev, activeSession: { ...prev.activeSession, exercises } };
    });
  }, []);

  const handleUpdateRir = useCallback((exIdx: number, setIdx: number, value: string) => {
    setDb((prev) => {
      if (!prev.activeSession) return prev;
      const exercises = prev.activeSession.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const rirs = Array.from({ length: e.sets }, (_, j) => e.rirs?.[j] || '');
        rirs[setIdx] = value;
        return { ...e, rirs };
      });
      return { ...prev, activeSession: { ...prev.activeSession, exercises } };
    });
  }, []);

  const handleAddSetToExercise = useCallback((exIdx: number) => {
    setDb((prev) => {
      if (!prev.activeSession) return prev;
      const exercises = prev.activeSession.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        if (e.sets >= 20) return e;
        const lastLoad = e.loads[e.loads.length - 1] ?? '';
        const lastRep = e.reps[e.reps.length - 1] ?? '';
        const curTypes = Array.from({ length: e.sets }, (_, j) => e.setTypes?.[j] || 'work');
        const curRirs = Array.from({ length: e.sets }, (_, j) => e.rirs?.[j] || '');
        return {
          ...e,
          sets: e.sets + 1,
          done: [...e.done, false],
          loads: [...e.loads, lastLoad],
          reps: [...e.reps, lastRep],
          setTypes: [...curTypes, 'work' as SetType],
          rirs: [...curRirs, ''],
        };
      });
      return { ...prev, activeSession: { ...prev.activeSession, exercises } };
    });
  }, []);

  const handleCopyPreviousLoads = useCallback(
    (exIdx: number, prevLoads: string[], prevReps: string[]) => {
      setDb((prev) => {
        if (!prev.activeSession) return prev;
        const exercises = prev.activeSession.exercises.map((e, i) => {
          if (i !== exIdx) return e;
          return {
            ...e,
            loads: e.loads.map((cur, sIdx) => cur || prevLoads[sIdx] || prevLoads[0] || ''),
            reps: e.reps.map((cur, sIdx) => cur || prevReps[sIdx] || prevReps[0] || ''),
          };
        });
        return { ...prev, activeSession: { ...prev.activeSession, exercises } };
      });
      showToast('Cargas anteriores copiadas.');
    },
    [showToast]
  );

  const handleToggleSet = useCallback(
    (exIdx: number, setIdx: number) => {
      const currentEx = db.activeSession?.exercises[exIdx];
      if (!currentEx) return;
      const willBeDone = !currentEx.done[setIdx];

      setDb((prev) => {
        if (!prev.activeSession) return prev;
        const exercises = prev.activeSession.exercises.map((e, i) => {
          if (i !== exIdx) return e;
          const done = [...e.done];
          done[setIdx] = !done[setIdx];
          return { ...e, done };
        });
        return { ...prev, activeSession: { ...prev.activeSession, exercises } };
      });

      if (willBeDone) {
        runTimer(currentEx.rest);
      }
    },
    [db.activeSession, runTimer]
  );

  const finalizeAndSaveSession = useCallback(
    (chosenRating: WorkoutRating | undefined) => {
      const sess = dbRef.current.activeSession;
      if (!sess) return;

      let doneSets = 0;
      let exDone = 0;
      sess.exercises.forEach((e) => {
        const c = e.done.filter(Boolean).length;
        doneSets += c;
        if (c === e.sets && e.sets > 0) exDone++;
      });

      const dur = Math.max(1, Math.round((Date.now() - sess.start) / 60000));
      const plan = getPlanForDay(dbRef.current, sess.day);
      const todayStr = todayISO();

      setDb((prev) => ({
        ...prev,
        sessions: [
          ...prev.sessions,
          {
            id: uid(),
            day: sess.day,
            name: plan.name,
            date: todayStr,
            duration: dur,
            sets: doneSets,
            rating: chosenRating,
            exercises: sess.exercises.map((e) => ({
              name: e.name,
              done: e.done,
              loads: e.loads,
              reps: e.reps || [],
              setTypes: e.setTypes,
              rirs: e.rirs,
              targetReps: e.targetReps || DEFAULT_TARGET_REPS,
              muscleGroup: e.muscleGroup || inferMuscleGroup(e.name),
              note: e.note,
              rest: e.rest,
            })),
          },
        ],
        activeSession: null,
      }));
      setSessionRating(null);
      setFinishRatingOpen(false);
      setTimerRemaining(0);
      setTimerTotal(0);
      setTimerPaused(true);
      showToast(
        `Treino finalizado! ${exDone} exercícios completos, ${doneSets} séries e ${dur} minutos.`
      );
    },
    [showToast]
  );

  const handleFinishWorkout = useCallback(() => {
    const sess = db.activeSession;
    if (!sess) return;

    if (sessionRating) {
      const doneSets = sess.exercises.reduce(
        (acc, e) => acc + e.done.filter(Boolean).length,
        0
      );
      if (doneSets === 0) {
        setConfirmDialog({
          title: 'Finalizar sem séries concluídas',
          message: 'Nenhuma série concluída. Deseja salvar o treino mesmo assim?',
          confirmLabel: 'Salvar mesmo assim',
          onConfirm: () => finalizeAndSaveSession(sessionRating),
        });
        return;
      }
      finalizeAndSaveSession(sessionRating);
      return;
    }

    setFinishRatingOpen(true);
  }, [db.activeSession, sessionRating, finalizeAndSaveSession]);

  const handleUpdateSessionRating = useCallback(
    (sessionId: string, rating: WorkoutRating | undefined) => {
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === sessionId ? { ...s, rating } : s
        ),
      }));
      setSelectedSession((prev) =>
        prev && prev.id === sessionId ? { ...prev, rating } : prev
      );
      showToast(
        rating
          ? `Avaliação atualizada para ${RATING_MAP[rating].label}.`
          : 'Avaliação removida da sessão.'
      );
    },
    [showToast]
  );

  const handleUpdateDayRating = useCallback(
    (dateIso: string, rating: WorkoutRating | null) => {
      setDb((prev) => {
        const nextDayRatings = { ...(prev.dayRatings || {}) };
        if (rating) {
          nextDayRatings[dateIso] = rating;
        } else {
          delete nextDayRatings[dateIso];
        }
        return {
          ...prev,
          dayRatings: nextDayRatings,
        };
      });
      showToast(
        rating
          ? `Dia ${formatDateBR(dateIso)} marcado como ${RATING_MAP[rating].label}.`
          : `Marcação do dia ${formatDateBR(dateIso)} removida.`
      );
    },
    [showToast]
  );

  const handleSelectCalendarDay = useCallback(
    (dateIso: string, daySessions: CompletedSession[]) => {
      setCalendarDayModal({ dateIso, sessions: daySessions });
    },
    []
  );

  const handleDeleteCompletedSession = useCallback(
    (id: string) => {
      setConfirmDialog({
        title: 'Excluir sessão concluída',
        message:
          'Deseja remover esta sessão do histórico? Isso atualizará seus recordes e estatísticas.',
        confirmLabel: 'Excluir',
        danger: true,
        onConfirm: () => {
          setDb((prev) => ({
            ...prev,
            sessions: prev.sessions.filter((s) => s.id !== id),
          }));
          setSelectedSession(null);
          showToast('Sessão removida do histórico.');
        },
      });
    },
    [showToast]
  );

  // Modal Openers
  const openProjectModal = () => {
    setProjectName(db.project.name);
    setProjectStart(db.project.start);
    setProjectGoal(String(db.project.goal));
    setGoalWaterMl(String(db.goals?.waterMl || DEFAULT_GOALS.waterMl));
    setGoalProteinG(String(db.goals?.proteinG || DEFAULT_GOALS.proteinG));
    setGoalWeeklyWorkouts(String(db.goals?.weeklyWorkouts || DEFAULT_GOALS.weeklyWorkouts));
    setGoalSleepHours(String(db.goals?.sleepHours || DEFAULT_GOALS.sleepHours));
    setGoalRemindersEnabled(db.goals?.remindersEnabled !== false);
    setModal({ type: 'project' });
  };

  const openWeightModal = () => {
    setWeightDate(todayISO());
    setWeightValue('');
    setModal({ type: 'weight' });
  };

  const openMeasureModal = () => {
    setMeasurePart(BODY_PARTS[0]);
    setMeasureValue('');
    setMeasureDate(todayISO());
    setModal({ type: 'measure' });
  };

  const openAddExerciseModal = () => {
    setExName('');
    setExSets('3');
    setExRest('90');
    setExTargetReps(String(DEFAULT_TARGET_REPS));
    setExMuscleGroup('Peito');
    setExVideo('');
    setModal({ type: 'addExercise' });
  };

  const openEditPlanModal = () => {
    const plan = getPlanForDay(db, db.selectedDay);
    setPlanDayTitle(plan.name);
    setModal({ type: 'editPlan' });
  };

  const openPhasesModal = () => {
    const count = (db.phases?.length || 1) + 1;
    setNewPhaseName(`Fase ${count}`);
    setCloneCurrentPhase(true);
    setModal({ type: 'phases' });
  };

  const openEditSessionExerciseModal = (index: number) => {
    const e = db.activeSession?.exercises[index];
    if (!e) return;
    setExName(e.name);
    setExSets(String(e.sets));
    setExRest(String(e.rest));
    setExTargetReps(String(e.targetReps || DEFAULT_TARGET_REPS));
    setExMuscleGroup(e.muscleGroup || inferMuscleGroup(e.name));
    setExVideo(e.video || '');
    setModal({ type: 'editSessionExercise', index });
  };

  const openSwapExerciseModal = (index: number) => {
    setSwapCustomName('');
    setModal({ type: 'swapExercise', index });
  };

  const openEditPlanExerciseModal = (index: number) => {
    const plan = getPlanForDay(db, db.selectedDay);
    const e = plan.ex[index];
    if (!e) return;
    setExName(e.name);
    setExSets(String(e.sets));
    setExRest(String(e.rest));
    setExTargetReps(String(e.targetReps || DEFAULT_TARGET_REPS));
    setExMuscleGroup(e.muscleGroup || inferMuscleGroup(e.name));
    setExVideo(e.video || '');
    setModal({ type: 'editPlanExercise', index });
  };

  const openAdjustTimerModal = () => {
    setTimerInput(String(timerRemaining));
    setModal({ type: 'adjustTimer' });
  };

  // Modal Handlers
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    setDb((prev) => ({
      ...prev,
      project: {
        name: projectName.trim() || 'Projeto de transformação',
        start: projectStart || todayISO(),
        goal: Math.max(1, Math.min(365, toNumber(projectGoal) || 90)),
      },
      goals: {
        waterMl: Math.max(500, toNumber(goalWaterMl) || DEFAULT_GOALS.waterMl),
        proteinG: Math.max(20, toNumber(goalProteinG) || DEFAULT_GOALS.proteinG),
        weeklyWorkouts: Math.max(
          1,
          Math.min(7, toNumber(goalWeeklyWorkouts) || DEFAULT_GOALS.weeklyWorkouts)
        ),
        sleepHours: Math.max(4, Math.min(12, toNumber(goalSleepHours) || DEFAULT_GOALS.sleepHours)),
        remindersEnabled: goalRemindersEnabled,
      },
    }));
    setModal({ type: 'none' });
    showToast('Configurações do projeto atualizadas.');
  };

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = toNumber(weightValue);
    if (val <= 0) {
      showToast('Informe um peso válido.');
      return;
    }
    setDb((prev) => ({
      ...prev,
      weights: [...prev.weights, { id: uid(), date: weightDate || todayISO(), value: val }],
    }));
    setModal({ type: 'none' });
    showToast('Peso registrado.');
  };

  const handleSaveMeasure = (e: React.FormEvent) => {
    e.preventDefault();
    const val = toNumber(measureValue);
    if (val <= 0) {
      showToast('Informe uma medida válida.');
      return;
    }
    setDb((prev) => ({
      ...prev,
      measures: [
        ...prev.measures,
        { id: uid(), name: measurePart, value: val, date: measureDate || todayISO() },
      ],
    }));
    setModal({ type: 'none' });
    showToast('Medida registrada.');
  };

  const handleSaveNewExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = exName.trim();
    if (!trimmed) {
      showToast('Informe o nome do exercício.');
      return;
    }
    const setsCount = Math.max(1, Math.min(20, toNumber(exSets) || 3));
    const restSec = Math.max(0, toNumber(exRest));
    const targetRepsVal = Math.max(1, Math.min(50, toNumber(exTargetReps) || DEFAULT_TARGET_REPS));
    const newEx: ExerciseTemplate = {
      id: uid(),
      name: trimmed,
      sets: setsCount,
      rest: restSec,
      targetReps: targetRepsVal,
      muscleGroup: exMuscleGroup || inferMuscleGroup(trimmed),
      video: exVideo.trim(),
      notes: '',
    };

    setDb((prev) => {
      const exists = prev.plan.some((p) => p.day === prev.selectedDay);
      const updatedPlan = exists
        ? prev.plan.map((p) =>
            p.day === prev.selectedDay ? { ...p, ex: [...p.ex, newEx] } : p
          )
        : [
            ...prev.plan,
            { day: prev.selectedDay, name: 'Treino personalizado', ex: [newEx] },
          ];

      const updatedSession =
        prev.activeSession && prev.activeSession.day === prev.selectedDay
          ? {
              ...prev.activeSession,
              exercises: [
                ...prev.activeSession.exercises,
                {
                  ...newEx,
                  done: Array(newEx.sets).fill(false),
                  loads: Array(newEx.sets).fill(''),
                  reps: Array(newEx.sets).fill(''),
                  setTypes: Array(newEx.sets).fill('work' as SetType),
                  rirs: Array(newEx.sets).fill(''),
                  note: '',
                },
              ],
            }
          : prev.activeSession;

      return { ...syncPlanWithActivePhase(prev, updatedPlan), activeSession: updatedSession };
    });

    setModal({ type: 'none' });
    showToast('Exercício adicionado.');
  };

  const handleSaveSessionExercise = (e: React.FormEvent, index: number) => {
    e.preventDefault();
    const setsCount = Math.max(1, Math.min(20, toNumber(exSets) || 1));
    const restSec = Math.max(0, toNumber(exRest));
    const targetRepsVal = Math.max(1, Math.min(50, toNumber(exTargetReps) || DEFAULT_TARGET_REPS));
    setDb((prev) => {
      if (!prev.activeSession) return prev;
      const exercises = prev.activeSession.exercises.map((ex, i) => {
        if (i !== index) return ex;
        return {
          ...ex,
          name: exName.trim() || ex.name,
          sets: setsCount,
          rest: restSec,
          targetReps: targetRepsVal,
          muscleGroup: exMuscleGroup,
          video: exVideo.trim(),
          done: Array.from({ length: setsCount }, (_, j) => ex.done[j] || false),
          loads: Array.from({ length: setsCount }, (_, j) => ex.loads[j] || ''),
          reps: Array.from({ length: setsCount }, (_, j) => ex.reps?.[j] || ''),
          setTypes: Array.from({ length: setsCount }, (_, j) => ex.setTypes?.[j] || 'work'),
          rirs: Array.from({ length: setsCount }, (_, j) => ex.rirs?.[j] || ''),
        };
      });
      return { ...prev, activeSession: { ...prev.activeSession, exercises } };
    });
    setModal({ type: 'none' });
  };

  const handleSwapSessionExercise = (index: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('Informe o nome do exercício substituto.');
      return;
    }
    setDb((prev) => {
      if (!prev.activeSession) return prev;
      const exercises = prev.activeSession.exercises.map((ex, i) => {
        if (i !== index) return ex;
        return {
          ...ex,
          name: trimmed,
          muscleGroup: ex.muscleGroup || inferMuscleGroup(trimmed),
        };
      });
      return { ...prev, activeSession: { ...prev.activeSession, exercises } };
    });
    setModal({ type: 'none' });
    showToast(`Substituído hoje por "${trimmed}" (ficha base mantida).`);
  };

  const handleDeleteSessionExercise = (index: number) => {
    setConfirmDialog({
      title: 'Excluir exercício',
      message: 'Deseja remover este exercício da sessão atual?',
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => {
        setDb((prev) => {
          if (!prev.activeSession) return prev;
          return {
            ...prev,
            activeSession: {
              ...prev.activeSession,
              exercises: prev.activeSession.exercises.filter((_, i) => i !== index),
            },
          };
        });
        setModal({ type: 'none' });
      },
    });
  };

  const handleSavePlanDayName = (newName: string) => {
    const trimmed = newName.trim() || 'Treino personalizado';
    setDb((prev) => {
      const exists = prev.plan.some((p) => p.day === prev.selectedDay);
      const updatedPlan = exists
        ? prev.plan.map((p) => (p.day === prev.selectedDay ? { ...p, name: trimmed } : p))
        : [...prev.plan, { day: prev.selectedDay, name: trimmed, ex: [] }];
      return syncPlanWithActivePhase(prev, updatedPlan);
    });
  };

  const handleMovePlanExercise = (index: number, direction: -1 | 1) => {
    setDb((prev) => {
      const updatedPlan = prev.plan.map((p) => {
        if (p.day !== prev.selectedDay) return p;
        const target = index + direction;
        if (target < 0 || target >= p.ex.length) return p;
        const copy = [...p.ex];
        const [item] = copy.splice(index, 1);
        copy.splice(target, 0, item);
        return { ...p, ex: copy };
      });
      return syncPlanWithActivePhase(prev, updatedPlan);
    });
  };

  const handleSavePlanExercise = (e: React.FormEvent, index: number) => {
    e.preventDefault();
    const setsCount = Math.max(1, Math.min(20, toNumber(exSets) || 1));
    const restSec = Math.max(0, toNumber(exRest));
    const targetRepsVal = Math.max(1, Math.min(50, toNumber(exTargetReps) || DEFAULT_TARGET_REPS));
    setDb((prev) => {
      const updatedPlan = prev.plan.map((p) => {
        if (p.day !== prev.selectedDay) return p;
        return {
          ...p,
          ex: p.ex.map((ex, i) =>
            i === index
              ? {
                  ...ex,
                  name: exName.trim() || ex.name,
                  sets: setsCount,
                  rest: restSec,
                  targetReps: targetRepsVal,
                  muscleGroup: exMuscleGroup,
                  video: exVideo.trim(),
                }
              : ex
          ),
        };
      });
      return syncPlanWithActivePhase(prev, updatedPlan);
    });
    setModal({ type: 'editPlan' });
  };

  const handleDeletePlanExercise = (index: number) => {
    setConfirmDialog({
      title: 'Excluir da ficha',
      message: 'Deseja remover este exercício da ficha de treinos?',
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => {
        setDb((prev) => {
          const updatedPlan = prev.plan.map((p) =>
            p.day === prev.selectedDay
              ? { ...p, ex: p.ex.filter((_, i) => i !== index) }
              : p
          );
          return syncPlanWithActivePhase(prev, updatedPlan);
        });
        setModal({ type: 'editPlan' });
      },
    });
  };

  // Phases Management
  const handleSwitchPhase = (phaseId: string) => {
    const target = (db.phases || []).find((ph) => ph.id === phaseId);
    if (!target || target.id === db.activePhaseId) return;

    const doSwitch = () => {
      setDb((prev) => {
        const chosen = (prev.phases || []).find((ph) => ph.id === phaseId);
        if (!chosen) return prev;
        return {
          ...prev,
          activePhaseId: chosen.id,
          plan: chosen.plan,
          activeSession: null,
        };
      });
      setSessionRating(null);
      setTimerRemaining(0);
      setTimerTotal(0);
      setTimerPaused(true);
      setModal({ type: 'none' });
      showToast(`Fase alterada para "${target.name}".`);
    };

    if (db.activeSession) {
      setConfirmDialog({
        title: 'Trocar de fase',
        message: 'Há uma sessão em andamento. Trocar de fase descartará a sessão atual. Continuar?',
        confirmLabel: 'Trocar fase',
        danger: true,
        onConfirm: doSwitch,
      });
      return;
    }

    doSwitch();
  };

  const handleCreatePhase = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPhaseName.trim();
    if (!trimmed) {
      showToast('Informe o nome da nova fase.');
      return;
    }

    const doCreate = () => {
      const clonedPlan: DayPlan[] = cloneCurrentPhase
        ? dbRef.current.plan.map((d) => ({
            day: d.day,
            name: d.name,
            ex: d.ex.map((ex) => ({ ...ex, id: uid() })),
          }))
        : [1, 2, 3, 4, 5].map((day) => ({
            day,
            name: `Treino ${day}`,
            ex: [],
          }));

      const created: PlanPhase = {
        id: `phase-${uid()}`,
        name: trimmed,
        plan: clonedPlan,
      };

      setDb((prev) => ({
        ...prev,
        phases: [...(prev.phases || []), created],
        activePhaseId: created.id,
        plan: created.plan,
        activeSession: null,
      }));
      setNewPhaseName('');
      setSessionRating(null);
      setModal({ type: 'none' });
      showToast(`Nova fase "${trimmed}" criada e ativada.`);
    };

    if (db.activeSession) {
      setConfirmDialog({
        title: 'Criar e ativar fase',
        message: 'Isso encerrará a sessão em andamento sem salvar. Continuar?',
        confirmLabel: 'Continuar',
        danger: true,
        onConfirm: doCreate,
      });
      return;
    }

    doCreate();
  };

  const handleDeletePhase = (phaseId: string) => {
    if ((db.phases?.length || 0) <= 1) {
      showToast('Mantenha pelo menos uma fase ativa.');
      return;
    }
    const target = db.phases?.find((ph) => ph.id === phaseId);
    setConfirmDialog({
      title: 'Excluir fase',
      message: `Remover a fase "${target?.name || ''}"? Suas sessões concluídas no histórico permanecem intactas.`,
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => {
        setDb((prev) => {
          const remaining = (prev.phases || []).filter((ph) => ph.id !== phaseId);
          if (remaining.length === 0) return prev;
          const needSwitch = prev.activePhaseId === phaseId;
          const nextActive = needSwitch ? remaining[0] : null;
          return {
            ...prev,
            phases: remaining,
            activePhaseId: nextActive ? nextActive.id : prev.activePhaseId,
            plan: nextActive ? nextActive.plan : prev.plan,
            activeSession: needSwitch ? null : prev.activeSession,
          };
        });
        showToast('Fase removida.');
      },
    });
  };

  // Photos
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await compressImage(file);
      setDb((prev) => ({
        ...prev,
        photos: [...prev.photos, { id: uid(), date: todayISO(), data }],
      }));
      showToast('Foto adicionada à galeria.');
    } catch {
      showToast('Não foi possível processar a foto.');
    }
  };

  const handleDeletePhoto = (id: string) => {
    setConfirmDialog({
      title: 'Excluir foto',
      message: 'Deseja remover esta foto da galeria de evolução?',
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => {
        setDb((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }));
        showToast('Foto removida.');
      },
    });
  };

  // Backup Export / Import / Reset
  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gustavoeler-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exportado.');
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.project || !Array.isArray(parsed.plan) || !Array.isArray(parsed.sessions)) {
        throw new Error('Formato inválido');
      }
      setConfirmDialog({
        title: 'Importar backup',
        message: 'O backup substituirá os dados atuais. Continuar?',
        confirmLabel: 'Substituir dados',
        danger: true,
        onConfirm: () => {
          const normalized = normalizeDB(parsed);
          setDb({ ...normalized, activeSession: null });
          setTimerRemaining(0);
          setTimerTotal(0);
          setTimerPaused(true);
          showToast('Backup importado com sucesso.');
        },
      });
    } catch {
      showToast('Backup inválido. Os dados atuais foram preservados.');
    }
  };

  const handleResetAll = () => {
    setConfirmDialog({
      title: 'Apagar todos os dados',
      message:
        'Isso apagará ficha, histórico, medidas e fotos deste dispositivo. Tem certeza?',
      confirmLabel: 'Apagar tudo',
      danger: true,
      onConfirm: () => {
        setDb(createFreshDB());
        setTimerRemaining(0);
        setTimerTotal(0);
        setTimerPaused(true);
        setModal({ type: 'none' });
        showToast('Todos os dados foram apagados.');
      },
    });
  };

  const currentDayPlan = getPlanForDay(db, db.selectedDay);

  return (
    <div className="min-h-screen bg-[#080808] text-[#f5f5f5]">
      <Toast message={toast} onDismiss={() => setToast(null)} />

      <div className="max-w-[1050px] mx-auto px-[17px] md:px-[28px] pt-5 md:pt-[25px] pb-[105px] md:pb-[110px]">
        {/* Header */}
        <header className="flex items-center justify-between gap-2.5">
          <div>
            <div className="text-[22px] font-black tracking-[-1px] leading-none">
              GUSTAVO<span className="text-[#ff303b]">ELER</span>
            </div>
            <div className="text-[11px] text-[#999999] mt-1">
              PROJETO 90 DIAS · HIPERTROFIA &amp; EVOLUÇÃO
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModal({ type: 'settings' })}
            aria-label="Configurações e backup"
            className="bg-[#1b1b1b] hover:bg-[#252525] text-[#ff303b] border border-[#444444] rounded-xl w-10 h-10 font-black text-sm flex items-center justify-center transition-colors shrink-0"
          >
            GE
          </button>
        </header>

        {/* Tabs */}
        {activeTab === 'home' && (
          <HomeTab
            db={db}
            onOpenProjectModal={openProjectModal}
            onOpenWeightModal={openWeightModal}
            onOpenToolsModal={() => setToolsOpen(true)}
            onSelectSession={(s) => setSelectedSession(s)}
            onUpdateCheckin={handleUpdateTodayCheckin}
            onStartDay={(day) => startSessionForDay(day, true)}
            onSwitchTab={switchTab}
            onNotify={showToast}
          />
        )}

        {activeTab === 'training' && (
          <TrainingTab
            db={db}
            selectedDay={db.selectedDay}
            session={db.activeSession ?? null}
            timer={{
              remaining: timerRemaining,
              total: timerTotal,
              paused: timerPaused,
              soundEnabled: timerSound,
            }}
            onSelectDay={handleSelectDay}
            onStartSession={(day) => startSessionForDay(day)}
            onEditPlan={openEditPlanModal}
            onOpenPhasesModal={openPhasesModal}
            onAddExercise={openAddExerciseModal}
            onEditSessionExercise={openEditSessionExerciseModal}
            onOpenSwapExercise={openSwapExerciseModal}
            onAddSetToExercise={handleAddSetToExercise}
            onCopyPreviousLoads={handleCopyPreviousLoads}
            onUpdateLoad={handleUpdateLoad}
            onUpdateReps={handleUpdateReps}
            onCycleSetType={handleCycleSetType}
            onUpdateRir={handleUpdateRir}
            onUpdateNote={handleUpdateNote}
            onToggleSet={handleToggleSet}
            sessionRating={sessionRating}
            onChangeSessionRating={setSessionRating}
            onFinishWorkout={handleFinishWorkout}
            onTimerTogglePause={() => {
              setTimerPaused((prev) => {
                const nextPaused = !prev;
                if (!nextPaused && timerRemaining === 0) {
                  setTimerRemaining(timerTotal);
                }
                return nextPaused;
              });
            }}
            onTimerReset={() => {
              setTimerRemaining(timerTotal);
              setTimerPaused(true);
            }}
            onTimerAdjustDelta={(delta) => {
              const next = Math.max(0, timerRemaining + delta);
              setTimerRemaining(next);
              setTimerTotal((prev) => Math.max(prev, next));
              if (next === 0) setTimerPaused(true);
            }}
            onTimerStartPreset={(sec) => runTimer(sec)}
            onTimerToggleSound={() => setTimerSound((prev) => !prev)}
            onTimerOpenAdjust={openAdjustTimerModal}
            onOpenToolsModal={() => setToolsOpen(true)}
            onSelectCompletedSession={(s) => setSelectedSession(s)}
          />
        )}

        {activeTab === 'stats' && (
          <StatsTab
            db={db}
            onOpenWeightModal={openWeightModal}
            onOpenMeasureModal={openMeasureModal}
            onTriggerAddPhoto={() => photoInputRef.current?.click()}
            onDeletePhoto={handleDeletePhoto}
            onSelectCalendarDay={handleSelectCalendarDay}
            onNotify={showToast}
          />
        )}

        <footer className="text-center text-[#666666] text-[10px] py-4 mt-2">
          GUSTAVOELER · SEU PROJETO, SUA EVOLUÇÃO.
        </footer>
      </div>

      {/* Bottom Navigation */}
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:bottom-2.5 md:w-[min(650px,90%)] z-40 bg-[#101010] border-t md:border border-[#333333] md:rounded-[14px] grid grid-cols-3 px-1.5 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => switchTab('home')}
          className={`flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors ${
            activeTab === 'home' ? 'text-[#ff303b]' : 'text-[#999999] hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" strokeWidth={activeTab === 'home' ? 2.4 : 1.8} />
          <span>Início</span>
        </button>
        <button
          type="button"
          onClick={() => switchTab('training')}
          className={`flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors ${
            activeTab === 'training' ? 'text-[#ff303b]' : 'text-[#999999] hover:text-white'
          }`}
        >
          <LayoutGrid className="w-5 h-5" strokeWidth={activeTab === 'training' ? 2.4 : 1.8} />
          <span>Treinos</span>
        </button>
        <button
          type="button"
          onClick={() => switchTab('stats')}
          className={`flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors ${
            activeTab === 'stats' ? 'text-[#ff303b]' : 'text-[#999999] hover:text-white'
          }`}
        >
          <BarChart3 className="w-5 h-5" strokeWidth={activeTab === 'stats' ? 2.4 : 1.8} />
          <span>Estatísticas</span>
        </button>
      </nav>

      {/* Hidden File Inputs */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFileChange}
        className="hidden"
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* Completed Session Detail Modal */}
      <SessionDetailModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onUpdateRating={handleUpdateSessionRating}
        onDeleteSession={handleDeleteCompletedSession}
        onCopied={showToast}
      />

      {/* Finish Workout Rating Prompt Modal */}
      <Modal
        open={finishRatingOpen}
        title="Como foi o treino?"
        onClose={() => setFinishRatingOpen(false)}
      >
        <p className="text-xs text-[#999999] mb-3.5 leading-relaxed">
          Escolha uma avaliação para registrar no calendário e finalizar a sessão.
        </p>
        <div className="grid grid-cols-1 gap-2 mb-4">
          {WORKOUT_RATINGS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => finalizeAndSaveSession(r.id)}
              style={{
                backgroundColor: r.cellBg,
                borderColor: r.cellBorder,
                color: r.cellText,
              }}
              className="w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-extrabold transition-transform active:scale-[0.99] hover:brightness-110"
            >
              <span>{r.label}</span>
              <span
                className="w-3 h-3 rounded-full border border-white/40"
                style={{ backgroundColor: r.swatchHex }}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => finalizeAndSaveSession(undefined)}
          className="w-full bg-[#252525] hover:bg-[#303030] text-[#dddddd] border border-[#444444] rounded-[10px] px-4 py-2.5 text-xs font-bold transition-colors"
        >
          Salvar sem avaliar
        </button>
      </Modal>

      {/* Calendar Day Rating / Multiple Sessions Modal */}
      <Modal
        open={Boolean(calendarDayModal)}
        title={calendarDayModal ? `Dia ${formatDateBR(calendarDayModal.dateIso)}` : 'Dia'}
        onClose={() => setCalendarDayModal(null)}
      >
        {calendarDayModal && (
          <div className="space-y-4">
            {calendarDayModal.sessions.length > 0 && (
              <div>
                <div className="text-xs font-bold text-[#f5f5f5] mb-2">
                  Sessões registradas neste dia
                </div>
                <div className="space-y-2">
                  {calendarDayModal.sessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setCalendarDayModal(null);
                        setSelectedSession(s);
                      }}
                      className="w-full text-left flex items-center justify-between gap-2 bg-[#1a1a1a] hover:bg-[#242424] border border-[#333333] rounded-xl p-3 transition-colors"
                    >
                      <div>
                        <b className="text-sm text-[#f5f5f5] block">{s.name}</b>
                        <span className="text-[11px] text-[#999999] tabular-nums">
                          {`${s.sets} séries · ${s.duration} min`}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#ff303b]">Abrir</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-[#f5f5f5]">
                  Avaliação do dia no calendário
                </span>
                {db.dayRatings?.[calendarDayModal.dateIso] && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateDayRating(calendarDayModal.dateIso, null);
                      setCalendarDayModal(null);
                    }}
                    className="text-[11px] text-[#999999] hover:text-white underline"
                  >
                    Remover marcação
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {WORKOUT_RATINGS.map((r) => {
                  const isSelected = db.dayRatings?.[calendarDayModal.dateIso] === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        handleUpdateDayRating(calendarDayModal.dateIso, r.id);
                        setCalendarDayModal(null);
                      }}
                      style={{
                        backgroundColor: r.cellBg,
                        borderColor: r.cellBorder,
                        color: r.cellText,
                      }}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-extrabold transition-transform active:scale-[0.99] hover:brightness-110 ${
                        isSelected ? 'ring-2 ring-white' : ''
                      }`}
                    >
                      <span>{r.label}</span>
                      {isSelected && <span className="text-xs">Selecionado</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Habits of the Day (Non-Training: Sleep, Water, Creatine) */}
            {(() => {
              const dayCk =
                db.checkins?.[calendarDayModal.dateIso] ??
                createEmptyCheckin(calendarDayModal.dateIso);
              const evalH = evaluateDailyHabits(dayCk, db.goals);
              const habitRows: {
                key: 'sleep' | 'water' | 'creatine';
                label: string;
                detail: string;
                current: HabitRating;
              }[] = [
                {
                  key: 'sleep',
                  label: 'Sono',
                  detail: `${(dayCk.sleepHours ?? 7).toFixed(1).replace('.', ',')}h`,
                  current: evalH.sleep,
                },
                {
                  key: 'water',
                  label: 'Água',
                  detail: `${(dayCk.waterMl / 1000).toFixed(2).replace('.', ',')}L`,
                  current: evalH.water,
                },
                {
                  key: 'creatine',
                  label: 'Creatina',
                  detail: dayCk.creatine ? 'Tomada' : 'Não marcada',
                  current: evalH.creatine,
                },
              ];

              return (
                <div className="pt-3 border-t border-[#292929]">
                  <div className="text-xs font-bold text-[#f5f5f5] mb-2">
                    Hábitos do dia (fora o treino)
                  </div>
                  <div className="space-y-2">
                    {habitRows.map((row) => (
                      <div
                        key={row.key}
                        className="flex flex-wrap items-center justify-between gap-2 bg-[#181818] border border-[#2c2c2c] rounded-xl px-3 py-2"
                      >
                        <div className="text-xs">
                          <b className="text-[#f5f5f5]">{row.label}</b>
                          <span className="text-[#999999] ml-1.5 tabular-nums">{row.detail}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {HABIT_RATINGS.map((hr) => {
                            const active = row.current === hr.id;
                            return (
                              <button
                                key={hr.id}
                                type="button"
                                onClick={() => {
                                  handleUpdateCheckinByDate(calendarDayModal.dateIso, (prev) => {
                                    if (row.key === 'sleep') {
                                      return { ...prev, sleepQuality: hr.id };
                                    }
                                    if (row.key === 'water') {
                                      return { ...prev, waterQuality: hr.id };
                                    }
                                    return {
                                      ...prev,
                                      creatine: hr.id !== 'ruim',
                                      creatineQuality: hr.id,
                                    };
                                  });
                                  showToast(
                                    `${row.label} em ${formatDateBR(calendarDayModal.dateIso)}: ${hr.label}.`
                                  );
                                }}
                                style={
                                  active
                                    ? {
                                        backgroundColor: hr.cellBg,
                                        borderColor: hr.cellBorder,
                                        color: hr.cellText,
                                      }
                                    : undefined
                                }
                                className={`px-2 py-1 rounded-md text-[10px] font-extrabold border transition-colors ${
                                  active
                                    ? ''
                                    : 'bg-[#121212] border-[#333333] text-[#999999] hover:text-white'
                                }`}
                              >
                                {hr.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Gym Tools Modal (1RM & Plate Calculator) */}
      <ToolsModal open={toolsOpen} onClose={() => setToolsOpen(false)} />

      {/* Project Config Modal */}
      <Modal
        open={modal.type === 'project'}
        title="Configurar projeto"
        onClose={() => setModal({ type: 'none' })}
      >
        <form onSubmit={handleSaveProject}>
          <div className="mb-3">
            <label className="block text-[11px] text-[#999999] mb-1.5">Nome</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">Data de início</label>
              <input
                type="date"
                value={projectStart}
                onChange={(e) => setProjectStart(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">Duração em dias</label>
              <input
                type="number"
                min={1}
                max={365}
                value={projectGoal}
                onChange={(e) => setProjectGoal(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">Meta água (ml)</label>
              <input
                type="number"
                min={500}
                step={250}
                value={goalWaterMl}
                onChange={(e) => setGoalWaterMl(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">
                Proteína (g)
              </label>
              <input
                type="number"
                min={20}
                step={5}
                value={goalProteinG}
                onChange={(e) => setGoalProteinG(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">
                Treinos/sem
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={goalWeeklyWorkouts}
                onChange={(e) => setGoalWeeklyWorkouts(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4 items-center">
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">
                Meta de sono (horas)
              </label>
              <input
                type="number"
                min={4}
                max={12}
                step={0.5}
                value={goalSleepHours}
                onChange={(e) => setGoalSleepHours(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[#dddddd] pt-3 sm:pt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={goalRemindersEnabled}
                onChange={(e) => setGoalRemindersEnabled(e.target.checked)}
                className="accent-[#ff303b]"
              />
              <span>Ativar lembretes de sono, água e creatina</span>
            </label>
          </div>
          <button
            type="submit"
            className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
          >
            Salvar
          </button>
        </form>
      </Modal>

      {/* Weight Modal */}
      <Modal
        open={modal.type === 'weight'}
        title="Registrar peso corporal"
        onClose={() => setModal({ type: 'none' })}
      >
        <form onSubmit={handleSaveWeight}>
          <div className="mb-3">
            <label className="block text-[11px] text-[#999999] mb-1.5">Data</label>
            <input
              type="date"
              value={weightDate}
              onChange={(e) => setWeightDate(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-[11px] text-[#999999] mb-1.5">Peso (kg)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Ex.: 75,5"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
            />
          </div>
          <button
            type="submit"
            className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
          >
            Salvar peso
          </button>
        </form>
      </Modal>

      {/* Measure Modal */}
      <Modal
        open={modal.type === 'measure'}
        title="Registrar medida corporal"
        onClose={() => setModal({ type: 'none' })}
      >
        <form onSubmit={handleSaveMeasure}>
          <div className="mb-3">
            <label className="block text-[11px] text-[#999999] mb-1.5">Parte do corpo</label>
            <select
              value={measurePart}
              onChange={(e) => setMeasurePart(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
            >
              {BODY_PARTS.map((part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-[11px] text-[#999999] mb-1.5">Medida (cm)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Ex.: 38,5"
              value={measureValue}
              onChange={(e) => setMeasureValue(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
            />
          </div>
          <div className="mb-4">
            <label className="block text-[11px] text-[#999999] mb-1.5">Data</label>
            <input
              type="date"
              value={measureDate}
              onChange={(e) => setMeasureDate(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
          >
            Salvar medida
          </button>
        </form>
      </Modal>

      {/* Add Exercise Modal */}
      <Modal
        open={modal.type === 'addExercise'}
        title="Adicionar exercício"
        onClose={() => setModal({ type: 'none' })}
      >
        <form onSubmit={handleSaveNewExercise}>
          <div className="mb-3">
            <label className="block text-[11px] text-[#999999] mb-1.5">Nome</label>
            <input
              type="text"
              value={exName}
              onChange={(e) => {
                setExName(e.target.value);
                setExMuscleGroup(inferMuscleGroup(e.target.value));
              }}
              placeholder="Ex.: Supino reto"
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">Séries</label>
              <input
                type="number"
                min={1}
                max={20}
                value={exSets}
                onChange={(e) => setExSets(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">
                Descanso (segundos)
              </label>
              <input
                type="number"
                min={0}
                value={exRest}
                onChange={(e) => setExRest(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">
                Topo de reps (progressão)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={exTargetReps}
                onChange={(e) => setExTargetReps(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">Grupo muscular</label>
              <select
                value={exMuscleGroup}
                onChange={(e) => setExMuscleGroup(e.target.value as MuscleGroup)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
              >
                {MUSCLE_GROUPS.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[11px] text-[#999999] mb-1.5">
              Vídeo demonstrativo (URL)
            </label>
            <input
              type="url"
              value={exVideo}
              onChange={(e) => setExVideo(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
          >
            Adicionar exercício
          </button>
        </form>
      </Modal>

      {/* Edit Session Exercise Modal */}
      <Modal
        open={modal.type === 'editSessionExercise'}
        title="Editar exercício"
        onClose={() => setModal({ type: 'none' })}
      >
        {modal.type === 'editSessionExercise' && (
          <form onSubmit={(e) => handleSaveSessionExercise(e, modal.index)}>
            <div className="mb-3">
              <label className="block text-[11px] text-[#999999] mb-1.5">Nome</label>
              <input
                type="text"
                value={exName}
                onChange={(e) => setExName(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className="block text-[11px] text-[#999999] mb-1.5">Séries</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={exSets}
                  onChange={(e) => setExSets(e.target.value)}
                  className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#999999] mb-1.5">
                  Descanso (segundos)
                </label>
                <input
                  type="number"
                  min={0}
                  value={exRest}
                  onChange={(e) => setExRest(e.target.value)}
                  className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className="block text-[11px] text-[#999999] mb-1.5">
                  Topo de reps (progressão)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={exTargetReps}
                  onChange={(e) => setExTargetReps(e.target.value)}
                  className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#999999] mb-1.5">Grupo muscular</label>
                <select
                  value={exMuscleGroup}
                  onChange={(e) => setExMuscleGroup(e.target.value as MuscleGroup)}
                  className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
                >
                  {MUSCLE_GROUPS.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] text-[#999999] mb-1.5">
                Vídeo demonstrativo (URL)
              </label>
              <input
                type="url"
                value={exVideo}
                onChange={(e) => setExVideo(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-2.5">
              <button
                type="submit"
                className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSessionExercise(modal.index)}
                className="bg-[#3a171a] hover:bg-[#4e1d22] text-[#ff8b91] border border-[#73333a] rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
              >
                Excluir
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Quick Swap Exercise Modal (only for today's session) */}
      <Modal
        open={modal.type === 'swapExercise'}
        title="Trocar exercício hoje"
        onClose={() => setModal({ type: 'none' })}
      >
        {modal.type === 'swapExercise' && (() => {
          const targetEx = db.activeSession?.exercises[modal.index];
          if (!targetEx) return null;
          const suggestions = getExerciseAlternatives(targetEx.name, targetEx.muscleGroup);
          return (
            <div className="space-y-4">
              <div className="text-xs text-[#999999] leading-relaxed">
                Substitua <b className="text-[#f5f5f5]">{targetEx.name}</b> somente na sessão de hoje. Sua ficha fixa não será alterada.
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#999999] mb-2">
                  Sugestões equivalentes ({targetEx.muscleGroup || inferMuscleGroup(targetEx.name)})
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {suggestions.map((alt) => (
                    <button
                      key={alt}
                      type="button"
                      onClick={() => handleSwapSessionExercise(modal.index, alt)}
                      className="w-full text-left bg-[#181818] hover:bg-[#242424] border border-[#333333] hover:border-[#ff303b]/60 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#f5f5f5] transition-colors flex items-center justify-between gap-2"
                    >
                      <span>{alt}</span>
                      <span className="text-[11px] text-[#ff303b] font-extrabold whitespace-nowrap">
                        Escolher
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSwapSessionExercise(modal.index, swapCustomName);
                }}
                className="pt-2 border-t border-[#292929]"
              >
                <label className="block text-[11px] text-[#999999] mb-1.5">
                  Ou digite outro exercício
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={swapCustomName}
                    onChange={(e) => setSwapCustomName(e.target.value)}
                    placeholder="Nome do substituto..."
                    className="flex-1 bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[9px] px-4 py-2.5 text-xs font-extrabold whitespace-nowrap"
                  >
                    Trocar
                  </button>
                </div>
              </form>
            </div>
          );
        })()}
      </Modal>

      {/* Edit Plan Modal (with rename day + reorder exercises) */}
      <Modal
        open={modal.type === 'editPlan'}
        title="Editar ficha"
        onClose={() => setModal({ type: 'none' })}
      >
        <div className="mb-4">
          <label className="block text-[11px] text-[#999999] mb-1.5">Nome do treino do dia</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={planDayTitle}
              onChange={(e) => setPlanDayTitle(e.target.value)}
              className="flex-1 bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                handleSavePlanDayName(planDayTitle);
                showToast('Nome do treino atualizado.');
              }}
              className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[9px] px-3 py-2 text-xs font-extrabold whitespace-nowrap"
            >
              Salvar nome
            </button>
          </div>
        </div>

        <div className="mb-4">
          {currentDayPlan.ex.length > 0 ? (
            currentDayPlan.ex.map((ex, idx, arr) => (
              <div
                key={ex.id}
                className={`flex items-center justify-between gap-2 py-2.5 ${
                  idx < arr.length - 1 ? 'border-b border-[#292929]' : ''
                }`}
              >
                <div className="min-w-0">
                  <span className="text-sm text-[#f5f5f5] block truncate">{ex.name}</span>
                  <small className="text-[11px] text-[#999999] block tabular-nums">
                    {`${ex.sets} séries · ${ex.rest}s`}
                  </small>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMovePlanExercise(idx, -1)}
                    aria-label="Mover para cima"
                    className="bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-30 text-[#cccccc] border border-[#3a3a3a] rounded-lg p-1.5"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === arr.length - 1}
                    onClick={() => handleMovePlanExercise(idx, 1)}
                    aria-label="Mover para baixo"
                    className="bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-30 text-[#cccccc] border border-[#3a3a3a] rounded-lg p-1.5"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditPlanExerciseModal(idx)}
                    className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-3 py-1.5 text-xs font-extrabold transition-colors whitespace-nowrap"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-5 px-2 text-center text-[#999999] text-sm">
              Nenhum exercício cadastrado para este dia.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={openAddExerciseModal}
          className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
        >
          + Adicionar exercício
        </button>
      </Modal>

      {/* Edit Plan Exercise Modal */}
      <Modal
        open={modal.type === 'editPlanExercise'}
        title="Editar exercício da ficha"
        onClose={() => setModal({ type: 'editPlan' })}
      >
        {modal.type === 'editPlanExercise' && (
          <form onSubmit={(e) => handleSavePlanExercise(e, modal.index)}>
            <div className="mb-3">
              <label className="block text-[11px] text-[#999999] mb-1.5">Nome</label>
              <input
                type="text"
                value={exName}
                onChange={(e) => setExName(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className="block text-[11px] text-[#999999] mb-1.5">Séries</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={exSets}
                  onChange={(e) => setExSets(e.target.value)}
                  className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#999999] mb-1.5">
                  Descanso (segundos)
                </label>
                <input
                  type="number"
                  min={0}
                  value={exRest}
                  onChange={(e) => setExRest(e.target.value)}
                  className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className="block text-[11px] text-[#999999] mb-1.5">
                  Topo de reps (progressão)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={exTargetReps}
                  onChange={(e) => setExTargetReps(e.target.value)}
                  className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#999999] mb-1.5">Grupo muscular</label>
                <select
                  value={exMuscleGroup}
                  onChange={(e) => setExMuscleGroup(e.target.value as MuscleGroup)}
                  className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
                >
                  {MUSCLE_GROUPS.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] text-[#999999] mb-1.5">
                Vídeo demonstrativo (URL)
              </label>
              <input
                type="url"
                value={exVideo}
                onChange={(e) => setExVideo(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-2.5">
              <button
                type="submit"
                className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => handleDeletePlanExercise(modal.index)}
                className="bg-[#3a171a] hover:bg-[#4e1d22] text-[#ff8b91] border border-[#73333a] rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
              >
                Excluir
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Training Phases Modal */}
      <Modal
        open={modal.type === 'phases'}
        title="Fases e periodização"
        onClose={() => setModal({ type: 'none' })}
      >
        <div className="space-y-4">
          <div className="text-xs text-[#999999] leading-relaxed">
            Alterne entre blocos de treino (ex.: Fase 1 Base, Fase 2 Intensificação, Deload) mantendo todo seu histórico de cargas.
          </div>

          <div className="space-y-2">
            {(db.phases || []).map((ph) => {
              const isCurrent = ph.id === db.activePhaseId;
              const totalExercises = ph.plan.reduce((acc, d) => acc + d.ex.length, 0);
              return (
                <div
                  key={ph.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                    isCurrent
                      ? 'bg-[#211012] border-[#ff303b]'
                      : 'bg-[#181818] border-[#333333]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <b className="text-sm text-[#f5f5f5] truncate">{ph.name}</b>
                      {isCurrent && (
                        <span className="text-[10px] font-extrabold text-[#ff303b] uppercase">
                          Ativa
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#999999] tabular-nums">
                      {`${ph.plan.filter((d) => d.ex.length > 0).length} dias · ${totalExercises} exercícios`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleSwitchPhase(ph.id)}
                        className="bg-[#ff303b] hover:bg-[#e62833] text-white rounded-lg px-3 py-1.5 text-xs font-extrabold whitespace-nowrap"
                      >
                        Ativar
                      </button>
                    )}
                    {(db.phases?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhase(ph.id)}
                        className="bg-[#2a1416] hover:bg-[#3f191d] text-[#ff8b91] border border-[#61272d] rounded-lg px-2.5 py-1.5 text-xs font-bold whitespace-nowrap"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleCreatePhase} className="pt-3 border-t border-[#292929] space-y-3">
            <div className="text-xs font-bold text-[#f5f5f5]">Criar nova fase</div>
            <input
              type="text"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              placeholder="Ex.: Fase 2 (Intensificação)"
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
            />
            <label className="flex items-center gap-2 text-xs text-[#cccccc] cursor-pointer">
              <input
                type="checkbox"
                checked={cloneCurrentPhase}
                onChange={(e) => setCloneCurrentPhase(e.target.checked)}
                className="accent-[#ff303b]"
              />
              <span>Copiar exercícios da ficha atual como ponto de partida</span>
            </label>
            <button
              type="submit"
              className="w-full bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-4 py-2.5 text-xs font-extrabold transition-colors"
            >
              + Criar e ativar fase
            </button>
          </form>
        </div>
      </Modal>

      {/* Adjust Timer Modal */}
      <Modal
        open={modal.type === 'adjustTimer'}
        title="Ajustar cronômetro"
        onClose={() => setModal({ type: 'none' })}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runTimer(Math.max(0, toNumber(timerInput)));
            setModal({ type: 'none' });
          }}
        >
          <div className="mb-4">
            <label className="block text-[11px] text-[#999999] mb-1.5">Segundos</label>
            <input
              type="number"
              min={0}
              value={timerInput}
              onChange={(e) => setTimerInput(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
            />
          </div>
          <button
            type="submit"
            className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors"
          >
            Aplicar e iniciar
          </button>
        </form>
      </Modal>

      {/* Settings & Backup Modal */}
      <Modal
        open={modal.type === 'settings'}
        title="Configurações e backup"
        onClose={() => setModal({ type: 'none' })}
      >
        <div className="bg-[#211012] border border-[#55252a] rounded-[9px] p-3 text-xs text-[#e5e5e5] mb-3 leading-relaxed">
          Os dados ficam salvos localmente neste navegador e dispositivo. Não há login nem
          sincronização automática entre dispositivos. Faça backups regulares.
        </div>
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="w-full bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-3 text-sm font-extrabold transition-colors"
          >
            Exportar backup JSON
          </button>
          <button
            type="button"
            onClick={() => {
              setModal({ type: 'none' });
              importInputRef.current?.click();
            }}
            className="w-full bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-4 py-3 text-sm font-extrabold transition-colors"
          >
            Importar backup JSON
          </button>
          <button
            type="button"
            onClick={openProjectModal}
            className="w-full bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-4 py-3 text-sm font-extrabold transition-colors"
          >
            Configurar projeto e metas
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            className="w-full bg-[#3a171a] hover:bg-[#4e1d22] text-[#ff8b91] border border-[#73333a] rounded-[10px] px-4 py-3 text-sm font-extrabold transition-colors"
          >
            Apagar todos os dados
          </button>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
