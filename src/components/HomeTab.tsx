import React, { useMemo, useState } from 'react';
import {
  BatteryCharging,
  BellRing,
  Calculator,
  Check,
  ChevronRight,
  Droplets,
  Flame,
  Moon,
} from 'lucide-react';
import {
  AppDB,
  CompletedSession,
  DailyCheckin,
  HabitRating,
  TabId,
} from '../types';
import {
  calculateSessionVolume,
  calculateWeeklyStreak,
  createEmptyCheckin,
  DAY_NAMES_BY_JS_DAY,
  DEFAULT_GOALS,
  evaluateDailyHabits,
  formatDateBR,
  getHabitReminders,
  getMondayWeekKey,
  HABIT_RATING_MAP,
  HABIT_RATINGS,
  RATING_MAP,
  todayISO,
} from '../data/defaults';
import { LineChart } from './LineChart';

interface HomeTabProps {
  db: AppDB;
  onOpenProjectModal: () => void;
  onOpenWeightModal: () => void;
  onOpenToolsModal: () => void;
  onSelectSession: (session: CompletedSession) => void;
  onUpdateCheckin: (updater: (prev: DailyCheckin) => DailyCheckin) => void;
  onStartDay: (day: number) => void;
  onSwitchTab: (tab: TabId) => void;
  onNotify: (message: string) => void;
}

const renderHabitSegment = (
  current: HabitRating,
  isManual: boolean,
  onSelect: (rating: HabitRating) => void
) => (
  <div className="flex items-center gap-1 mt-2">
    <span className="text-[10px] text-[#888888] mr-1">
      {isManual ? 'Avaliado:' : 'Auto:'}
    </span>
    {HABIT_RATINGS.map((hr) => {
      const active = current === hr.id;
      return (
        <button
          key={hr.id}
          type="button"
          onClick={() => onSelect(hr.id)}
          style={
            active
              ? {
                  backgroundColor: hr.cellBg,
                  borderColor: hr.cellBorder,
                  color: hr.cellText,
                }
              : undefined
          }
          className={`px-2 py-1 rounded-md text-[10px] font-extrabold border transition-colors whitespace-nowrap ${
            active
              ? ''
              : 'bg-[#141414] border-[#303030] text-[#999999] hover:text-white hover:border-[#4a4a4a]'
          }`}
        >
          {hr.label}
        </button>
      );
    })}
  </div>
);

export const HomeTab: React.FC<HomeTabProps> = ({
  db,
  onOpenProjectModal,
  onOpenWeightModal,
  onOpenToolsModal,
  onSelectSession,
  onUpdateCheckin,
  onStartDay,
  onSwitchTab,
  onNotify,
}) => {
  const [notifPerm, setNotifPerm] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const todayStr = todayISO();
  const diffDays = Math.max(
    0,
    Math.floor(
      (new Date(`${todayStr}T12:00:00`).getTime() -
        new Date(`${db.project.start}T12:00:00`).getTime()) /
        86400000
    )
  );
  const currentDay = Math.min(db.project.goal, diffDays + 1);
  const pct = Math.min(100, Math.round((currentDay / db.project.goal) * 100));

  const totalWorkouts = db.sessions.length;
  const totalSets = db.sessions.reduce((acc, s) => acc + s.sets, 0);

  const sortedWeightsDesc = [...db.weights].sort((a, b) => b.date.localeCompare(a.date));
  const latestWeight = sortedWeightsDesc[0];

  const weeklyGoal = db.goals?.weeklyWorkouts || DEFAULT_GOALS.weeklyWorkouts;
  const currentWeekKey = getMondayWeekKey(todayStr);
  const thisWeekCount = db.sessions.filter(
    (s) => getMondayWeekKey(s.date) === currentWeekKey
  ).length;
  const weeklyStreak = calculateWeeklyStreak(db.sessions, weeklyGoal);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const workoutsLast7 = db.sessions.filter(
    (s) => new Date(`${s.date}T12:00:00`) >= sevenDaysAgo
  ).length;
  const freqPct = Math.round((workoutsLast7 / weeklyGoal) * 100);

  const jsDay = new Date().getDay();
  const todayPlan = jsDay >= 1 && jsDay <= 5 ? db.plan.find((p) => p.day === jsDay) : undefined;
  const lastSession = db.sessions[db.sessions.length - 1];
  const lastSessionVol = lastSession ? calculateSessionVolume(lastSession) : 0;

  const recentWeights = [...db.weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10);

  const todayCheckin = db.checkins?.[todayStr] ?? createEmptyCheckin(todayStr);
  const waterGoal = db.goals?.waterMl || DEFAULT_GOALS.waterMl;
  const proteinGoal = db.goals?.proteinG || DEFAULT_GOALS.proteinG;
  const waterPct = Math.min(100, Math.round((todayCheckin.waterMl / waterGoal) * 100));
  const proteinPct = Math.min(100, Math.round((todayCheckin.proteinG / proteinGoal) * 100));
  const sleepHours = todayCheckin.sleepHours ?? 7;
  const energy = todayCheckin.energy ?? 0;

  const habitEval = useMemo(
    () => evaluateDailyHabits(todayCheckin, db.goals),
    [todayCheckin, db.goals]
  );

  const reminders = useMemo(() => getHabitReminders(db), [db]);

  const handleRequestNotifications = async () => {
    if (typeof Notification === 'undefined') {
      onNotify('Este navegador não suporta notificações do sistema.');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setNotifPerm(res);
      if (res === 'granted') {
        onNotify('Notificações de lembrete ativadas neste navegador.');
      } else {
        onNotify('Permissão de notificação não concedida.');
      }
    } catch {
      onNotify('Não foi possível solicitar permissão de notificação.');
    }
  };

  const handleReminderQuickAction = (actionType?: 'addWater' | 'markCreatine' | 'addSleep') => {
    if (actionType === 'addWater') {
      onUpdateCheckin((prev) => ({ ...prev, waterMl: prev.waterMl + 250, waterQuality: undefined }));
      onNotify('+250ml de água adicionados.');
    } else if (actionType === 'markCreatine') {
      onUpdateCheckin((prev) => ({
        ...prev,
        creatine: true,
        creatineQuality: 'excelente',
      }));
      onNotify('Creatina marcada como tomada!');
    } else if (actionType === 'addSleep') {
      onUpdateCheckin((prev) => ({
        ...prev,
        sleepHours: Math.min(16, (prev.sleepHours ?? 7) + 0.5),
        sleepQuality: undefined,
      }));
      onNotify('+0,5h de sono adicionado.');
    }
  };

  return (
    <section className="animate-tab-fade">
      {/* Hero */}
      <div
        className="rounded-[18px] p-5 mt-5 mb-3.5 border border-[#55252a]"
        style={{ background: 'linear-gradient(135deg, #211012, #101010 75%)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-[#999999] tracking-wide uppercase">
            {db.project.name || 'SEU PROJETO DE TRANSFORMAÇÃO'}
          </div>
          <div className="text-[11px] font-bold text-[#ff777f] tabular-nums">
            {`Meta semanal: ${thisWeekCount}/${weeklyGoal} · ${weeklyStreak} ${
              weeklyStreak === 1 ? 'semana' : 'semanas'
            } seguidas`}
          </div>
        </div>
        <h1 className="text-[25px] font-extrabold text-[#f5f5f5] my-1.5 tracking-tight">
          Vamos evoluir.
        </h1>
        <div className="text-[38px] font-black text-[#ff303b] tracking-[-2px] leading-none font-mono tabular-nums">
          {`DIA ${currentDay}/${db.project.goal}`}
        </div>
        <div className="h-[7px] bg-[#303030] rounded-full overflow-hidden my-3">
          <div
            className="h-full bg-[#ff303b] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-[11px] text-[#999999] tabular-nums">{`${pct}% do projeto`}</span>
          <button
            type="button"
            onClick={onOpenProjectModal}
            className="bg-transparent border border-[#73333a] hover:bg-[#351518] text-[#ff6a72] rounded-[10px] px-2.5 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            Configurar projeto
          </button>
        </div>
      </div>

      {/* 4 Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
          <span className="text-[11px] text-[#999999] block">PESO ATUAL</span>
          <strong className="block text-[22px] font-extrabold text-[#f5f5f5] my-1.5 tabular-nums">
            {latestWeight ? latestWeight.value.toFixed(1).replace('.', ',') : '—'}
          </strong>
          <span className="text-[11px] text-[#999999]">kg</span>
        </div>
        <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
          <span className="text-[11px] text-[#999999] block">TREINOS</span>
          <strong className="block text-[22px] font-extrabold text-[#f5f5f5] my-1.5 tabular-nums">
            {totalWorkouts}
          </strong>
          <span className="text-[11px] text-[#999999]">registrados</span>
        </div>
        <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
          <span className="text-[11px] text-[#999999] block">FREQUÊNCIA</span>
          <strong className="block text-[22px] font-extrabold text-[#f5f5f5] my-1.5 tabular-nums">
            {`${freqPct}%`}
          </strong>
          <span className="text-[11px] text-[#999999]">últimos 7 dias</span>
        </div>
        <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
          <span className="text-[11px] text-[#999999] block">SÉRIES</span>
          <strong className="block text-[22px] font-extrabold text-[#f5f5f5] my-1.5 tabular-nums">
            {totalSets}
          </strong>
          <span className="text-[11px] text-[#999999]">concluídas</span>
        </div>
      </div>

      {/* Scheduled Workout */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mt-3 mb-3">
        <div className="flex items-center justify-between gap-2.5 mb-2">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Treino programado</h2>
          <span className="text-[11px] font-semibold text-[#ff777f] uppercase tracking-wide">
            {DAY_NAMES_BY_JS_DAY[jsDay]}
          </span>
        </div>
        <h3 className="text-[14px] font-bold text-[#f5f5f5] mb-1.5">
          {todayPlan ? todayPlan.name : 'Dia de descanso'}
        </h3>
        <p className="text-[11px] text-[#999999] mb-3.5">
          {todayPlan
            ? `${todayPlan.ex.length} exercícios programados.`
            : 'Recuperação também faz parte da evolução.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => (todayPlan ? onStartDay(todayPlan.day) : onSwitchTab('training'))}
            className="bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-extrabold transition-colors whitespace-nowrap"
          >
            {todayPlan ? 'Iniciar treino' : 'Ver ficha de treinos'}
          </button>
          <button
            type="button"
            onClick={onOpenToolsModal}
            className="inline-flex items-center gap-1.5 bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-3.5 py-2.5 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            <Calculator className="w-3.5 h-3.5 text-[#ff303b]" />
            <span>1RM &amp; Anilhas</span>
          </button>
        </div>
      </div>

      {/* Smart Habit Reminders (Sleep, Water, Creatine) */}
      {reminders.length > 0 && (
        <div className="bg-[#211012] border border-[#6b262d] rounded-[15px] p-[14px] mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#ff8b91]">
              <BellRing className="w-4 h-4 text-[#ff303b]" />
              <span>Lembretes de hábitos (Sono · Água · Creatina)</span>
            </div>
            {notifPerm === 'default' && (
              <button
                type="button"
                onClick={handleRequestNotifications}
                className="bg-[#2e1619] hover:bg-[#3d1c20] text-[#ffb3b7] border border-[#73333a] rounded-lg px-2.5 py-1 text-[10px] font-extrabold whitespace-nowrap"
              >
                Ativar alertas no navegador
              </button>
            )}
          </div>
          <div className="space-y-2">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                  rem.severity === 'danger'
                    ? 'bg-[#2a1215] border-[#8b2c35]'
                    : 'bg-[#1a1612] border-[#5b4823]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <b className="text-[#f5f5f5] block text-[11px]">{rem.title}</b>
                  <span className="text-[#d4d4d4] text-[11px] leading-snug block">
                    {rem.message}
                  </span>
                </div>
                {rem.actionType && rem.actionLabel && (
                  <button
                    type="button"
                    onClick={() => handleReminderQuickAction(rem.actionType)}
                    className="bg-[#ff303b] hover:bg-[#e62833] text-white rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold whitespace-nowrap shrink-0"
                  >
                    {rem.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Check-in: Water, Protein, Creatine, Cardio, Sleep & Energy + Ruim/Bom/Excelente */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Check-in de hoje</h2>
            <div className="text-[11px] text-[#999999] mt-0.5">
              Avalie sono, água e creatina como Ruim, Bom ou Excelente
            </div>
          </div>
          <span className="text-[11px] text-[#999999] tabular-nums">{formatDateBR(todayStr)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {/* Water */}
          <div className="bg-[#191919] border border-[#2d2d2d] rounded-xl p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#f5f5f5]">
                <Droplets className="w-3.5 h-3.5 text-[#ff303b]" />
                <span>Água</span>
                <span
                  className="text-[10px] font-extrabold"
                  style={{ color: HABIT_RATING_MAP[habitEval.water].badgeText }}
                >
                  {`· ${HABIT_RATING_MAP[habitEval.water].label}`}
                </span>
              </span>
              <span className="text-[#999999] tabular-nums">
                {`${(todayCheckin.waterMl / 1000).toFixed(2).replace('.', ',')} / ${(
                  waterGoal / 1000
                )
                  .toFixed(1)
                  .replace('.', ',')} L`}
              </span>
            </div>
            <div className="h-1.5 bg-[#303030] rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full bg-[#ff303b] transition-all duration-200"
                style={{ width: `${waterPct}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateCheckin((prev) => ({
                    ...prev,
                    waterMl: Math.max(0, prev.waterMl - 250),
                  }))
                }
                className="bg-[#252525] hover:bg-[#303030] text-[#cccccc] border border-[#444444] rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums"
              >
                -250ml
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCheckin((prev) => ({ ...prev, waterMl: prev.waterMl + 250 }))
                }
                className="bg-[#252525] hover:bg-[#303030] text-[#f5f5f5] border border-[#444444] rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums"
              >
                +250ml
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCheckin((prev) => ({ ...prev, waterMl: prev.waterMl + 500 }))
                }
                className="bg-[#291315] hover:bg-[#3a171a] text-[#ff777f] border border-[#73333a] rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums"
              >
                +500ml
              </button>
            </div>
            {renderHabitSegment(habitEval.water, habitEval.isWaterManual, (rating) =>
              onUpdateCheckin((prev) => ({
                ...prev,
                waterQuality: prev.waterQuality === rating ? undefined : rating,
              }))
            )}
          </div>

          {/* Protein */}
          <div className="bg-[#191919] border border-[#2d2d2d] rounded-xl p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#f5f5f5]">
                <Flame className="w-3.5 h-3.5 text-[#ff303b]" />
                <span>Proteína</span>
              </span>
              <span className="text-[#999999] tabular-nums">
                {`${todayCheckin.proteinG} / ${proteinGoal} g`}
              </span>
            </div>
            <div className="h-1.5 bg-[#303030] rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full bg-[#ff303b] transition-all duration-200"
                style={{ width: `${proteinPct}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateCheckin((prev) => ({
                    ...prev,
                    proteinG: Math.max(0, prev.proteinG - 20),
                  }))
                }
                className="bg-[#252525] hover:bg-[#303030] text-[#cccccc] border border-[#444444] rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums"
              >
                -20g
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCheckin((prev) => ({ ...prev, proteinG: prev.proteinG + 25 }))
                }
                className="bg-[#252525] hover:bg-[#303030] text-[#f5f5f5] border border-[#444444] rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums"
              >
                +25g
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCheckin((prev) => ({ ...prev, proteinG: prev.proteinG + 40 }))
                }
                className="bg-[#291315] hover:bg-[#3a171a] text-[#ff777f] border border-[#73333a] rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums"
              >
                +40g
              </button>
            </div>
          </div>
        </div>

        {/* Creatine & Cardio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-[#252525]">
          <div className="bg-[#191919] border border-[#2d2d2d] rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateCheckin((prev) => {
                    const nextTaken = !prev.creatine;
                    return {
                      ...prev,
                      creatine: nextTaken,
                      creatineQuality: nextTaken ? 'excelente' : 'ruim',
                    };
                  })
                }
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors ${
                  todayCheckin.creatine
                    ? 'bg-[#291315] border-[#ff303b] text-[#ff777f]'
                    : 'bg-[#141414] border-[#333333] text-[#aaaaaa] hover:text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{todayCheckin.creatine ? 'Creatina tomada' : 'Marcar creatina'}</span>
              </button>
              <span
                className="text-[11px] font-extrabold"
                style={{ color: HABIT_RATING_MAP[habitEval.creatine].badgeText }}
              >
                {HABIT_RATING_MAP[habitEval.creatine].label}
              </span>
            </div>
            {renderHabitSegment(habitEval.creatine, habitEval.isCreatineManual, (rating) =>
              onUpdateCheckin((prev) => ({
                ...prev,
                creatine: rating !== 'ruim',
                creatineQuality: prev.creatineQuality === rating ? undefined : rating,
              }))
            )}
          </div>

          <div className="bg-[#191919] border border-[#2d2d2d] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#d4d4d4] tabular-nums">
              {`Cardio: ${todayCheckin.cardioMin} min`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateCheckin((prev) => ({
                    ...prev,
                    cardioMin: Math.max(0, prev.cardioMin - 10),
                  }))
                }
                className="bg-[#252525] hover:bg-[#303030] text-[#cccccc] border border-[#444444] rounded-lg px-2 py-1.5 text-xs font-bold tabular-nums"
              >
                -10m
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCheckin((prev) => ({ ...prev, cardioMin: prev.cardioMin + 15 }))
                }
                className="bg-[#252525] hover:bg-[#303030] text-[#f5f5f5] border border-[#444444] rounded-lg px-2 py-1.5 text-xs font-bold tabular-nums"
              >
                +15m
              </button>
            </div>
          </div>
        </div>

        {/* Sleep & Pre-workout Energy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
          <div className="bg-[#191919] border border-[#2d2d2d] rounded-xl p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-[#ff303b]" />
                <span className="text-xs text-[#f5f5f5] font-bold tabular-nums">
                  {`Sono: ${sleepHours.toFixed(1).replace('.', ',')}h`}
                </span>
                <span
                  className="text-[10px] font-extrabold"
                  style={{ color: HABIT_RATING_MAP[habitEval.sleep].badgeText }}
                >
                  {`· ${HABIT_RATING_MAP[habitEval.sleep].label}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCheckin((prev) => ({
                      ...prev,
                      sleepHours: Math.max(0, (prev.sleepHours ?? 7) - 0.5),
                    }))
                  }
                  className="bg-[#252525] hover:bg-[#303030] text-[#cccccc] border border-[#444444] rounded-lg px-2 py-1 text-xs font-bold tabular-nums"
                >
                  -0,5h
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCheckin((prev) => ({
                      ...prev,
                      sleepHours: Math.min(16, (prev.sleepHours ?? 7) + 0.5),
                    }))
                  }
                  className="bg-[#252525] hover:bg-[#303030] text-[#f5f5f5] border border-[#444444] rounded-lg px-2 py-1 text-xs font-bold tabular-nums"
                >
                  +0,5h
                </button>
              </div>
            </div>
            {renderHabitSegment(habitEval.sleep, habitEval.isSleepManual, (rating) =>
              onUpdateCheckin((prev) => ({
                ...prev,
                sleepQuality: prev.sleepQuality === rating ? undefined : rating,
              }))
            )}
          </div>

          <div className="bg-[#191919] border border-[#2d2d2d] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-[#ff303b]" />
              <span className="text-xs text-[#d4d4d4] font-semibold">Disposição:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const active = energy === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      onUpdateCheckin((prev) => ({
                        ...prev,
                        energy: prev.energy === lvl ? 0 : lvl,
                      }))
                    }
                    className={`w-7 h-7 rounded-lg text-xs font-extrabold border tabular-nums transition-colors ${
                      active
                        ? 'bg-[#ff303b] border-[#ff303b] text-white'
                        : 'bg-[#141414] border-[#333333] text-[#aaaaaa] hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Daily Habits Non-Training Summary */}
        <div className="mt-3 pt-2.5 border-t border-[#252525] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-[#999999]">Hábitos fora do treino hoje:</span>
          <div className="flex flex-wrap items-center gap-2 font-bold">
            <span style={{ color: HABIT_RATING_MAP[habitEval.sleep].badgeText }}>
              {`Sono: ${HABIT_RATING_MAP[habitEval.sleep].label}`}
            </span>
            <span className="text-[#444444]">·</span>
            <span style={{ color: HABIT_RATING_MAP[habitEval.water].badgeText }}>
              {`Água: ${HABIT_RATING_MAP[habitEval.water].label}`}
            </span>
            <span className="text-[#444444]">·</span>
            <span style={{ color: HABIT_RATING_MAP[habitEval.creatine].badgeText }}>
              {`Creatina: ${HABIT_RATING_MAP[habitEval.creatine].label}`}
            </span>
          </div>
        </div>
      </div>

      {/* Last Activity (Clickable to inspect completed session) */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2.5 mb-2.5">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Última atividade</h2>
          <span className="text-[11px] text-[#999999] tabular-nums">
            {lastSession ? formatDateBR(lastSession.date) : 'Ainda sem atividade'}
          </span>
        </div>
        {lastSession ? (
          <button
            type="button"
            onClick={() => onSelectSession(lastSession)}
            className="w-full text-left flex items-center justify-between gap-2 bg-[#181818] hover:bg-[#202020] border border-[#2c2c2c] rounded-xl p-3 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <b className="text-[#f5f5f5] text-sm">{lastSession.name}</b>
                {lastSession.rating && RATING_MAP[lastSession.rating] && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold"
                    style={{ color: RATING_MAP[lastSession.rating].badgeText }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: RATING_MAP[lastSession.rating].swatchHex }}
                    />
                    <span>{RATING_MAP[lastSession.rating].label}</span>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#999999] mt-1 tabular-nums">
                {`${lastSession.sets} séries · ${lastSession.duration} minutos${
                  lastSessionVol > 0 ? ` · ${lastSessionVol.toLocaleString('pt-BR')} kg vol.` : ''
                }`}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#ff303b] shrink-0">
              <span>Ver treino</span>
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        ) : (
          <div className="py-5 px-2 text-center text-[#999999] text-sm">
            Seus treinos concluídos aparecerão aqui.
          </div>
        )}
      </div>

      {/* Weight Evolution */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2.5 mb-2">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Evolução do peso</h2>
          <span className="text-[11px] text-[#999999]">kg</span>
        </div>
        <LineChart
          values={recentWeights.map((w) => w.value)}
          labels={recentWeights.map((w) => formatDateBR(w.date).slice(0, 5))}
          suffix=" kg"
          emptyText="Registre seu peso para acompanhar."
        />
        <div className="mt-2">
          <button
            type="button"
            onClick={onOpenWeightModal}
            className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-3 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            + Registrar peso
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onSwitchTab('training')}
          className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-4 py-3 text-sm font-extrabold transition-colors whitespace-nowrap"
        >
          Abrir treinos ↗
        </button>
        <button
          type="button"
          onClick={() => onSwitchTab('stats')}
          className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-4 py-3 text-sm font-extrabold transition-colors whitespace-nowrap"
        >
          Ver estatísticas ↗
        </button>
      </div>
    </section>
  );
};
