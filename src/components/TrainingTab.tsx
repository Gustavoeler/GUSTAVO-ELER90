import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Calculator,
  ChevronRight,
  CopyCheck,
  Layers,
  Plus,
  Search,
  Smartphone,
  TrendingUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ActiveSession,
  AppDB,
  CompletedSession,
  SetType,
  WorkoutRating,
} from '../types';
import {
  calculateExercisesVolume,
  calculateSessionVolume,
  DAY_NAMES_BY_PLAN_DAY,
  DAY_SHORT_LABELS,
  DEFAULT_TARGET_REPS,
  formatDateBR,
  getPlanForDay,
  isReadyToProgress,
  RATING_MAP,
  RIR_OPTIONS,
  SET_TYPE_CONFIG,
  toNumber,
  WORKOUT_RATINGS,
} from '../data/defaults';

interface TimerState {
  remaining: number;
  total: number;
  paused: boolean;
  soundEnabled: boolean;
}

interface TrainingTabProps {
  db: AppDB;
  selectedDay: number;
  session: ActiveSession | null;
  timer: TimerState;
  onSelectDay: (day: number) => void;
  onStartSession: (day: number) => void;
  onEditPlan: () => void;
  onOpenPhasesModal: () => void;
  onAddExercise: () => void;
  onEditSessionExercise: (index: number) => void;
  onOpenSwapExercise: (index: number) => void;
  onAddSetToExercise: (exIndex: number) => void;
  onCopyPreviousLoads: (exIndex: number, loads: string[], reps: string[]) => void;
  onUpdateLoad: (exIndex: number, setIndex: number, value: string) => void;
  onUpdateReps: (exIndex: number, setIndex: number, value: string) => void;
  onCycleSetType: (exIndex: number, setIndex: number) => void;
  onUpdateRir: (exIndex: number, setIndex: number, value: string) => void;
  onUpdateNote: (exIndex: number, value: string) => void;
  onToggleSet: (exIndex: number, setIndex: number) => void;
  sessionRating: WorkoutRating | null;
  onChangeSessionRating: (rating: WorkoutRating | null) => void;
  onFinishWorkout: () => void;
  onTimerTogglePause: () => void;
  onTimerReset: () => void;
  onTimerAdjustDelta: (deltaSeconds: number) => void;
  onTimerStartPreset: (seconds: number) => void;
  onTimerToggleSound: () => void;
  onTimerOpenAdjust: () => void;
  onOpenToolsModal: () => void;
  onSelectCompletedSession: (session: CompletedSession) => void;
}

export const TrainingTab: React.FC<TrainingTabProps> = ({
  db,
  selectedDay,
  session,
  timer,
  onSelectDay,
  onStartSession,
  onEditPlan,
  onOpenPhasesModal,
  onAddExercise,
  onEditSessionExercise,
  onOpenSwapExercise,
  onAddSetToExercise,
  onCopyPreviousLoads,
  onUpdateLoad,
  onUpdateReps,
  onCycleSetType,
  onUpdateRir,
  onUpdateNote,
  onToggleSet,
  sessionRating,
  onChangeSessionRating,
  onFinishWorkout,
  onTimerTogglePause,
  onTimerReset,
  onTimerAdjustDelta,
  onTimerStartPreset,
  onTimerToggleSound,
  onTimerOpenAdjust,
  onOpenToolsModal,
  onSelectCompletedSession,
}) => {
  const plan = getPlanForDay(db, selectedDay);
  const isSessionActiveForDay = Boolean(session && session.day === selectedDay);
  const activePhaseName =
    db.phases?.find((ph) => ph.id === db.activePhaseId)?.name || 'Fase 1 (Base)';

  const [historyQuery, setHistoryQuery] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wakeLockOn, setWakeLockOn] = useState(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!isSessionActiveForDay || !session) {
      setElapsedSeconds(0);
      return;
    }
    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - session.start) / 1000)));
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [isSessionActiveForDay, session]);

  useEffect(() => {
    return () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  const toggleWakeLock = async () => {
    if (wakeLockOn) {
      try {
        await wakeLockRef.current?.release();
      } catch {
        // Ignore
      }
      wakeLockRef.current = null;
      setWakeLockOn(false);
      return;
    }

    try {
      const nav = navigator as unknown as {
        wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
      };
      if (!nav.wakeLock) {
        setWakeLockOn(false);
        return;
      }
      const sentinel = await nav.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockOn(true);
    } catch {
      setWakeLockOn(false);
    }
  };

  const sessionCounts = useMemo(() => {
    if (!session || session.day !== selectedDay) {
      return { sets: 0, done: 0, exDone: 0, volume: 0 };
    }
    let sets = 0;
    let done = 0;
    let exDone = 0;
    session.exercises.forEach((e) => {
      sets += e.sets;
      const completed = e.done.filter(Boolean).length;
      done += completed;
      if (completed === e.sets && e.sets > 0) exDone++;
    });
    const volume = calculateExercisesVolume(session.exercises);
    return { sets, done, exDone, volume };
  }, [session, selectedDay]);

  // Lookup last recorded performance + 10-rep progression status for each exercise
  const lastByExerciseName = useMemo(() => {
    const map: Record<
      string,
      {
        date: string;
        loads: string[];
        reps: string[];
        summary: string;
        readyToProgress: boolean;
        topReps: number;
      }
    > = {};
    const sorted = [...db.sessions].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((s) => {
      s.exercises.forEach((ex) => {
        const pairs = ex.loads
          .map((l, idx) => {
            if (ex.setTypes?.[idx] === 'warmup') return null;
            const loadNum = toNumber(l);
            const repNum = toNumber(ex.reps?.[idx]);
            if (loadNum <= 0 && repNum <= 0) return null;
            return `${loadNum > 0 ? `${loadNum}kg` : '—'}${repNum > 0 ? `×${repNum}` : ''}`;
          })
          .filter(Boolean);
        if (pairs.length > 0) {
          const prog = isReadyToProgress(ex, ex.targetReps || DEFAULT_TARGET_REPS);
          map[ex.name.toLowerCase()] = {
            date: s.date,
            loads: ex.loads,
            reps: ex.reps || [],
            summary: pairs.join(' · '),
            readyToProgress: prog.ready,
            topReps: prog.topReps,
          };
        }
      });
    });
    return map;
  }, [db.sessions]);

  const progressionAlerts = useMemo(() => {
    const byName: Record<string, { date: string; load: number }[]> = {};
    db.sessions.forEach((s) => {
      s.exercises.forEach((e) => {
        const vals = (e.loads || [])
          .filter((_, idx) => e.setTypes?.[idx] !== 'warmup')
          .map(toNumber)
          .filter((v) => v > 0);
        if (!vals.length) return;
        if (!byName[e.name]) byName[e.name] = [];
        byName[e.name].push({ date: s.date, load: Math.max(...vals) });
      });
    });

    const plateauAlerts: { name: string; load: number; days: number }[] = [];
    Object.entries(byName).forEach(([name, items]) => {
      items.sort((a, b) => a.date.localeCompare(b.date));
      const last = items[items.length - 1];
      const same = items.filter((x) => x.load === last.load);
      if (same.length >= 2) {
        const first = same[0];
        const days = Math.floor(
          (new Date(`${last.date}T12:00:00`).getTime() -
            new Date(`${first.date}T12:00:00`).getTime()) /
            86400000
        );
        if (days >= 14) {
          plateauAlerts.push({ name, load: last.load, days });
        }
      }
    });

    const readyNames = plan.ex
      .filter((ex) => lastByExerciseName[ex.name.toLowerCase()]?.readyToProgress)
      .map((ex) => ({
        name: ex.name,
        topReps: ex.targetReps || DEFAULT_TARGET_REPS,
      }));

    return { plateauAlerts, readyNames };
  }, [db.sessions, plan.ex, lastByExerciseName]);

  const filteredSessions = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    const ordered = [...db.sessions].reverse();
    if (!q) return ordered;
    return ordered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        formatDateBR(s.date).includes(q) ||
        s.exercises.some((e) => e.name.toLowerCase().includes(q))
    );
  }, [db.sessions, historyQuery]);

  const visibleSessions = showAllHistory ? filteredSessions : filteredSessions.slice(0, 15);

  const mm = String(Math.floor(timer.remaining / 60)).padStart(2, '0');
  const ss = String(timer.remaining % 60).padStart(2, '0');
  const elapsedMin = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const elapsedSec = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <section className="animate-tab-fade">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-4 mb-3">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#f5f5f5] m-0 leading-tight">
            Treinos
          </h1>
          <div className="text-[11px] text-[#999999] mt-0.5">
            {`${activePhaseName.toUpperCase()} · META TOPO ${DEFAULT_TARGET_REPS} REPS`}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {isSessionActiveForDay && (
            <button
              type="button"
              onClick={toggleWakeLock}
              className={`inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-xs font-bold border transition-colors whitespace-nowrap ${
                wakeLockOn
                  ? 'bg-[#291315] border-[#ff303b] text-[#ff777f]'
                  : 'bg-[#1b1b1b] hover:bg-[#252525] text-[#eeeeee] border-[#444444]'
              }`}
              title="Manter tela ligada durante o treino"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{wakeLockOn ? 'Tela acesa' : 'Manter tela'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenToolsModal}
            className="inline-flex items-center gap-1.5 bg-[#1b1b1b] hover:bg-[#252525] text-[#eeeeee] border border-[#444444] rounded-[10px] px-2.5 py-2 text-xs font-bold transition-colors whitespace-nowrap"
          >
            <Calculator className="w-3.5 h-3.5 text-[#ff303b]" />
            <span>1RM / Anilhas</span>
          </button>
          <button
            type="button"
            onClick={onAddExercise}
            className="bg-transparent border border-[#73333a] hover:bg-[#351518] text-[#ff6a72] rounded-[10px] px-3 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            + Exercício
          </button>
        </div>
      </div>

      {/* Day Picker */}
      <div className="flex gap-[7px] overflow-x-auto pb-2.5 mb-1">
        {DAY_SHORT_LABELS.map((label, idx) => {
          const dayNum = idx + 1;
          const active = selectedDay === dayNum;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectDay(dayNum)}
              className={`shrink-0 rounded-[9px] px-3.5 py-2.5 text-xs font-bold border transition-colors ${
                active
                  ? 'text-[#ff303b] border-[#ff303b] bg-[#291315]'
                  : 'bg-[#1a1a1a] text-[#aaaaaa] border-[#333333] hover:text-white'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Workout Intro Card */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-[#999999]">{DAY_NAMES_BY_PLAN_DAY[selectedDay]}</div>
          {isSessionActiveForDay && (
            <div className="text-[11px] font-mono font-bold text-[#ff777f] tabular-nums">
              {`Tempo: ${elapsedMin}:${elapsedSec}${
                sessionCounts.volume > 0
                  ? ` · ${sessionCounts.volume.toLocaleString('pt-BR')} kg`
                  : ''
              }`}
            </div>
          )}
        </div>
        <h2 className="text-[17px] font-bold text-[#f5f5f5] mt-1 mb-1">{plan.name}</h2>
        <span className="text-[11px] text-[#999999] tabular-nums">
          {`${plan.ex.length} exercícios programados`}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <button
            type="button"
            onClick={() => onStartSession(selectedDay)}
            disabled={plan.ex.length === 0}
            className="bg-[#ff303b] hover:bg-[#e62833] disabled:opacity-40 disabled:cursor-not-allowed text-white border-0 rounded-[10px] px-3.5 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            {isSessionActiveForDay ? 'Reiniciar sessão' : 'Iniciar sessão'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPhasesModal}
              className="inline-flex items-center gap-1.5 bg-[#1b1b1b] hover:bg-[#262626] text-[#d4d4d4] border border-[#3a3a3a] rounded-[10px] px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-[#ff303b]" />
              <span>Fases</span>
            </button>
            <button
              type="button"
              onClick={onEditPlan}
              className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-3.5 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
            >
              Editar ficha
            </button>
          </div>
        </div>
      </div>

      {/* Double Progression (10+ reps) & Plateau Alerts */}
      {progressionAlerts.readyNames.length > 0 && (
        <div className="bg-[#0f2417] border border-[#22c55e]/50 rounded-[10px] p-3 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-[#86efac] font-extrabold mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Hora de aumentar a carga hoje!</span>
          </div>
          <div className="text-[#dcfce7] leading-relaxed">
            Você atingiu o topo de repetições nas séries válidas do último treino em:{' '}
            <b>
              {progressionAlerts.readyNames
                .map((item) => `${item.name} (${item.topReps}+ reps)`)
                .join(', ')}
            </b>
            . Experimente subir o peso hoje.
          </div>
        </div>
      )}

      {progressionAlerts.plateauAlerts.length > 0 ? (
        <div className="bg-[#211012] border border-[#55252a] rounded-[9px] p-3 text-xs mb-3">
          <b className="text-[#f5f5f5] block">Hora de reavaliar suas cargas</b>
          {progressionAlerts.plateauAlerts.map((a) => (
            <div key={a.name} className="mt-2 text-[#e5e5e5] leading-relaxed">
              <b>{a.name}</b>: você repetiu {a.load} kg por {a.days} dias. Se estiver completando
              as séries com boa técnica e sem esforço excessivo, experimente aumentar um pouco a
              carga.
            </div>
          ))}
        </div>
      ) : (
        progressionAlerts.readyNames.length === 0 && (
          <div className="text-[11px] text-[#999999] mb-3">
            Ao bater 10+ reps nas séries válidas (ou 14+ dias na mesma carga), o app avisa para
            aumentar o peso.
          </div>
        )
      )}

      {/* Rest Timer */}
      {isSessionActiveForDay && (
        <div className="bg-[#211012] border border-[#71333a] rounded-[14px] p-[15px] mb-3.5">
          <div className="flex items-center justify-between gap-2.5 mb-2.5">
            <div>
              <div className="text-[11px] text-[#999999]">TEMPO DE DESCANSO</div>
              <strong className="text-[38px] font-black text-[#ff303b] font-mono tabular-nums leading-tight block">
                {`${mm}:${ss}`}
              </strong>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#ff777f] uppercase tracking-wide">
                {timer.total === 0
                  ? 'PRONTO'
                  : timer.paused
                  ? 'PAUSADO'
                  : timer.remaining > 0
                  ? 'EM ANDAMENTO'
                  : 'CONCLUÍDO'}
              </span>
              <button
                type="button"
                onClick={onTimerToggleSound}
                className="inline-flex items-center gap-1 text-[11px] text-[#d4d4d4] hover:text-white bg-[#170b0d] border border-[#55252a] rounded-lg px-2 py-1"
                title={timer.soundEnabled ? 'Som ativado' : 'Som desativado'}
              >
                {timer.soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#ff303b]" />
                    <span>Som ativo</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-[#888888]" />
                    <span>Sem som</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <button
              type="button"
              onClick={onTimerTogglePause}
              disabled={timer.total === 0}
              className="bg-[#ff303b] hover:bg-[#e62833] disabled:opacity-40 text-white border-0 rounded-[10px] px-3 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
            >
              {timer.paused ? 'Continuar' : 'Pausar'}
            </button>
            <button
              type="button"
              onClick={onTimerReset}
              disabled={timer.total === 0}
              className="bg-[#252525] hover:bg-[#303030] disabled:opacity-40 text-[#eeeeee] border border-[#444444] rounded-[10px] px-3 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
            >
              Reiniciar
            </button>
            <button
              type="button"
              onClick={() => onTimerAdjustDelta(-15)}
              className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-2.5 py-2 text-xs font-bold tabular-nums"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => onTimerAdjustDelta(15)}
              className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-2.5 py-2 text-xs font-bold tabular-nums"
            >
              +15s
            </button>
            <button
              type="button"
              onClick={onTimerOpenAdjust}
              className="bg-transparent border border-[#73333a] hover:bg-[#351518] text-[#ff6a72] rounded-[10px] px-3 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
            >
              Ajustar
            </button>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-[#3b1b1f]">
            <span className="text-[11px] text-[#999999] mr-1">Início rápido:</span>
            {[60, 90, 120, 180].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onTimerStartPreset(sec)}
                className="bg-[#170b0d] hover:bg-[#2f1519] text-[#f5f5f5] border border-[#55252a] rounded-lg px-2.5 py-1 text-[11px] font-bold tabular-nums"
              >
                {`${sec}s`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exercises Section Header */}
      <div className="flex items-center justify-between gap-2.5 mb-2.5">
        <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Exercícios</h2>
        <span className="text-[11px] text-[#999999] tabular-nums">
          {isSessionActiveForDay
            ? `${sessionCounts.done}/${sessionCounts.sets} séries concluídas`
            : 'Sessão não iniciada'}
        </span>
      </div>

      {/* Exercise List */}
      {!isSessionActiveForDay || !session ? (
        <div className="py-6 px-2 text-center text-[#999999] text-sm mb-3">
          {plan.ex.length === 0
            ? 'Dia de descanso. Use "+ Exercício" se quiser montar um treino para este dia.'
            : 'Inicie sua sessão para registrar cargas e concluir séries.'}
        </div>
      ) : (
        <>
          <div className="text-[11px] text-[#888888] mb-2">
            Tipo da série: <b className="text-[#d4d4d4]">T</b> Trabalho ·{' '}
            <b className="text-[#d6d3d1]">A</b> Aquecimento (não entra no volume/recordes) ·{' '}
            <b className="text-[#ff8b91]">D</b> Drop-set
          </div>

          <div className="space-y-2.5 mb-3">
            {session.exercises.map((ex, exIdx) => {
              const allDone = ex.done.length > 0 && ex.done.every(Boolean);
              const targetReps = ex.targetReps || DEFAULT_TARGET_REPS;
              const prevPerf = lastByExerciseName[ex.name.toLowerCase()];
              const liveProgress = isReadyToProgress(ex, targetReps);

              return (
                <div
                  key={`${ex.id}-${exIdx}`}
                  className={`bg-[#111111] border rounded-[15px] p-[15px] transition-colors ${
                    allDone ? 'border-[#7d3339]' : 'border-[#303030]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-[#f5f5f5] text-sm">{ex.name}</div>
                      <div className="text-[11px] text-[#999999] mt-0.5 tabular-nums">
                        {`${ex.sets} séries · ${ex.rest}s descanso · Topo ${targetReps} reps`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenSwapExercise(exIdx)}
                        className="inline-flex items-center gap-1 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#dddddd] border border-[#3c3c3c] rounded-[9px] px-2 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap"
                        title="Trocar exercício apenas hoje"
                      >
                        <ArrowLeftRight className="w-3 h-3 text-[#ff303b]" />
                        <span>Trocar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddSetToExercise(exIdx)}
                        className="inline-flex items-center gap-1 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#dddddd] border border-[#3c3c3c] rounded-[9px] px-2 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap"
                        title="Adicionar mais uma série"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Série</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditSessionExercise(exIdx)}
                        className="bg-transparent border border-[#73333a] hover:bg-[#351518] text-[#ff6a72] rounded-[10px] px-2.5 py-1.5 text-xs font-extrabold transition-colors whitespace-nowrap"
                      >
                        Editar
                      </button>
                    </div>
                  </div>

                  {/* Double progression banner (either hit in live workout or in last workout) */}
                  {liveProgress.ready ? (
                    <div className="mt-2 flex items-center gap-1.5 bg-[#0f2417] border border-[#22c55e]/60 text-[#86efac] rounded-lg px-2.5 py-1.5 text-[11px] font-bold">
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {`Bateu ${targetReps}+ reps nas séries válidas! Aumente a carga no próximo treino.`}
                      </span>
                    </div>
                  ) : (
                    prevPerf?.readyToProgress && (
                      <div className="mt-2 flex items-center gap-1.5 bg-[#0f2417] border border-[#22c55e]/50 text-[#86efac] rounded-lg px-2.5 py-1.5 text-[11px] font-bold">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {`Você bateu ${prevPerf.topReps}+ reps na última vez! Aumente a carga hoje.`}
                        </span>
                      </div>
                    )
                  )}

                  {/* Previous session performance */}
                  {prevPerf && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 bg-[#171717] border border-[#292929] rounded-lg px-2.5 py-1.5">
                      <span className="text-[11px] text-[#aaaaaa] tabular-nums">
                        {`Última vez (${formatDateBR(prevPerf.date).slice(0, 5)}): ${prevPerf.summary}`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onCopyPreviousLoads(exIdx, prevPerf.loads, prevPerf.reps)
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff777f] hover:text-white whitespace-nowrap"
                      >
                        <CopyCheck className="w-3.5 h-3.5" />
                        <span>Copiar cargas</span>
                      </button>
                    </div>
                  )}

                  {/* Sets */}
                  <div className="grid gap-[7px] mt-3">
                    {ex.done.map((isDone, setIdx) => {
                      const setType: SetType = ex.setTypes?.[setIdx] || 'work';
                      const typeCfg = SET_TYPE_CONFIG[setType];
                      const rirVal = ex.rirs?.[setIdx] ?? '';

                      return (
                        <div
                          key={setIdx}
                          className="grid grid-cols-[54px_minmax(52px,1fr)_minmax(46px,0.75fr)_68px_32px] gap-1.5 items-center bg-[#090909] p-[7px] rounded-lg"
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#999999] font-mono tabular-nums">
                              {`S${setIdx + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => onCycleSetType(exIdx, setIdx)}
                              title={`Tipo: ${typeCfg.label} (toque para alternar)`}
                              style={{
                                backgroundColor: typeCfg.bg,
                                borderColor: typeCfg.border,
                                color: typeCfg.text,
                              }}
                              className="w-6 h-6 rounded border text-[10px] font-extrabold flex items-center justify-center shrink-0"
                            >
                              {typeCfg.short}
                            </button>
                          </div>

                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Carga"
                            value={ex.loads[setIdx] ?? ''}
                            onChange={(e) => onUpdateLoad(exIdx, setIdx, e.target.value)}
                            className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] py-2 px-1.5 text-center text-sm outline-none tabular-nums"
                          />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Reps"
                            value={ex.reps[setIdx] ?? ''}
                            onChange={(e) => onUpdateReps(exIdx, setIdx, e.target.value)}
                            className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] py-2 px-1.5 text-center text-sm outline-none tabular-nums"
                          />
                          <select
                            value={rirVal}
                            onChange={(e) => onUpdateRir(exIdx, setIdx, e.target.value)}
                            aria-label={`RIR da série ${setIdx + 1}`}
                            className="w-full bg-[#121212] text-[#d4d4d4] border border-[#3a3a3a] focus:border-[#ff303b] rounded-[9px] py-2 px-1 text-[11px] outline-none"
                          >
                            {RIR_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => onToggleSet(exIdx, setIdx)}
                            aria-label={isDone ? 'Desmarcar série' : 'Concluir série'}
                            className={`w-8 h-8 rounded-[7px] border flex items-center justify-center text-sm font-bold transition-colors ${
                              isDone
                                ? 'bg-[#ff303b] border-[#ff303b] text-white'
                                : 'bg-[#222222] border-[#555555] text-[#ff303b] hover:border-[#ff303b]'
                            }`}
                          >
                            {isDone ? '✓' : '○'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes */}
                  <div className="mt-2.5">
                    <label className="block text-[11px] text-[#999999] mb-1.5">
                      Observações
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Anotações..."
                      value={ex.note || ''}
                      onChange={(e) => onUpdateNote(exIdx, e.target.value)}
                      className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none resize-y"
                    />
                  </div>

                  {ex.video && (
                    <a
                      href={ex.video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs font-semibold text-[#ff303b] hover:underline"
                    >
                      Vídeo demonstrativo ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Finish Workout Card */}
          <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
            <h3 className="text-[14px] font-bold text-[#f5f5f5] mb-1.5">Finalizar sessão</h3>
            <p className="text-[11px] text-[#999999] mb-3">
              Avalie como foi o treino para marcar no seu calendário e salve no histórico.
            </p>

            <div className="mb-3.5">
              <div className="text-[11px] text-[#aaaaaa] font-semibold mb-2">
                Como foi o treino hoje?
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WORKOUT_RATINGS.map((r) => {
                  const active = sessionRating === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onChangeSessionRating(active ? null : r.id)}
                      style={
                        active
                          ? {
                              backgroundColor: r.cellBg,
                              borderColor: r.cellBorder,
                              color: r.cellText,
                            }
                          : undefined
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold border transition-all whitespace-nowrap ${
                        active
                          ? 'ring-1 ring-white/80'
                          : 'bg-[#191919] border-[#333333] text-[#d4d4d4] hover:border-[#555555]'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: active ? r.cellText : r.swatchHex,
                        }}
                      />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={onFinishWorkout}
              className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors whitespace-nowrap"
            >
              Finalizar treino
            </button>
          </div>
        </>
      )}

      {/* Training History (Clickable sessions + Search + Show All) */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Histórico de sessões</h2>
          {db.sessions.length > 0 && (
            <span className="text-[11px] text-[#999999] tabular-nums">
              {`${db.sessions.length} ${db.sessions.length === 1 ? 'treino' : 'treinos'}`}
            </span>
          )}
        </div>

        {db.sessions.length > 0 && (
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Buscar por treino, exercício ou data..."
              className="w-full bg-[#090909] text-white border border-[#383838] focus:border-[#ff303b] rounded-[9px] pl-8 pr-3 py-2 text-xs outline-none"
            />
          </div>
        )}

        {visibleSessions.length > 0 ? (
          <div>
            {visibleSessions.map((s, idx) => {
              const vol = calculateSessionVolume(s);
              const ratingCfg = s.rating ? RATING_MAP[s.rating] : null;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectCompletedSession(s)}
                  className={`w-full text-left flex items-center justify-between gap-2.5 py-2.5 px-2 -mx-2 rounded-lg hover:bg-[#191919] transition-colors ${
                    idx < visibleSessions.length - 1 ? 'border-b border-[#292929]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <b className="text-[#f5f5f5] text-sm truncate">{s.name}</b>
                      {ratingCfg && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0"
                          style={{ color: ratingCfg.badgeText }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: ratingCfg.swatchHex }}
                          />
                          <span>{ratingCfg.label}</span>
                        </span>
                      )}
                    </div>
                    <small className="text-[11px] text-[#999999] block tabular-nums mt-0.5">
                      {`${formatDateBR(s.date)} · ${s.exercises.length} exercícios · ${
                        s.sets
                      } séries${vol > 0 ? ` · ${vol.toLocaleString('pt-BR')} kg` : ''}`}
                    </small>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <b className="text-xs text-[#f5f5f5] tabular-nums whitespace-nowrap">
                      {`${s.duration} min`}
                    </b>
                    <ChevronRight className="w-4 h-4 text-[#ff303b]" />
                  </div>
                </button>
              );
            })}

            {filteredSessions.length > 15 && (
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllHistory((prev) => !prev)}
                  className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-3.5 py-2 text-xs font-extrabold transition-colors"
                >
                  {showAllHistory
                    ? 'Mostrar últimos 15'
                    : `Ver todas (${filteredSessions.length})`}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-5 px-2 text-center text-[#999999] text-sm">
            {db.sessions.length === 0
              ? 'Nenhum treino concluído ainda.'
              : 'Nenhuma sessão encontrada para essa busca.'}
          </div>
        )}
      </div>
    </section>
  );
};
