import React, { useMemo, useState } from 'react';
import { AppDB, CompletedSession, HabitRating, MuscleGroup, WorkoutRating } from '../types';
import {
  BODY_PARTS,
  calculateSessionVolume,
  calculateWeeklyStreak,
  DEFAULT_GOALS,
  evaluateDailyHabits,
  formatDateBR,
  HABIT_RATING_MAP,
  inferMuscleGroup,
  RATING_MAP,
  toNumber,
  todayISO,
} from '../data/defaults';
import { LineChart } from './LineChart';
import { MonthlyCalendar } from './MonthlyCalendar';

interface StatsTabProps {
  db: AppDB;
  onOpenWeightModal: () => void;
  onOpenMeasureModal: () => void;
  onTriggerAddPhoto: () => void;
  onDeletePhoto: (id: string) => void;
  onSelectCalendarDay: (dateIso: string, sessions: CompletedSession[]) => void;
  onNotify: (message: string) => void;
}

const PERIOD_OPTIONS = [7, 30, 60, 90] as const;
const TRACKED_MUSCLES: MuscleGroup[] = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Bíceps',
  'Tríceps',
];

const RATING_SCORE: Record<WorkoutRating, number> = {
  excelente: 5,
  bom: 4,
  ok: 3,
  ruim: 2,
  nao_completei: 1,
};

export const StatsTab: React.FC<StatsTabProps> = ({
  db,
  onOpenWeightModal,
  onOpenMeasureModal,
  onTriggerAddPhoto,
  onDeletePhoto,
  onSelectCalendarDay,
  onNotify,
}) => {
  const [period, setPeriod] = useState<number>(30);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [selectedMeasurePart, setSelectedMeasurePart] = useState<string>(BODY_PARTS[0]);
  const [photoAId, setPhotoAId] = useState<string>('');
  const [photoBId, setPhotoBId] = useState<string>('');
  const [photoCompareMode, setPhotoCompareMode] = useState<'side' | 'slider'>('side');
  const [sliderPos, setSliderPos] = useState<number>(50);

  const cutoffDate = useMemo(() => {
    const cut = new Date();
    cut.setDate(cut.getDate() - period + 1);
    cut.setHours(0, 0, 0, 0);
    return cut;
  }, [period]);

  const periodSessions = useMemo(
    () => db.sessions.filter((s) => new Date(`${s.date}T12:00:00`) >= cutoffDate),
    [db.sessions, cutoffDate]
  );

  const periodSets = useMemo(
    () => periodSessions.reduce((acc, s) => acc + s.sets, 0),
    [periodSessions]
  );

  const periodVolume = useMemo(
    () => periodSessions.reduce((acc, s) => acc + calculateSessionVolume(s), 0),
    [periodSessions]
  );

  const sortedWeightsAsc = useMemo(
    () => [...db.weights].sort((a, b) => a.date.localeCompare(b.date)),
    [db.weights]
  );

  const firstWeight = sortedWeightsAsc[0];
  const latestWeight = sortedWeightsAsc[sortedWeightsAsc.length - 1];

  const periodWeights = useMemo(
    () => sortedWeightsAsc.filter((w) => new Date(`${w.date}T12:00:00`) >= cutoffDate),
    [sortedWeightsAsc, cutoffDate]
  );

  const weeklyGoal = db.goals?.weeklyWorkouts || DEFAULT_GOALS.weeklyWorkouts;
  const freqPct = Math.round(
    (periodSessions.length / Math.max(1, period / 7) / weeklyGoal) * 100
  );
  const weeklyStreak = useMemo(
    () => calculateWeeklyStreak(db.sessions, weeklyGoal),
    [db.sessions, weeklyGoal]
  );

  const exerciseNames = useMemo(
    () => Array.from(new Set(db.sessions.flatMap((s) => s.exercises.map((e) => e.name)))),
    [db.sessions]
  );

  const loadPoints = useMemo(() => {
    if (!selectedExercise) return [];
    const pts: { date: string; v: number }[] = [];
    db.sessions.forEach((s) => {
      s.exercises.forEach((e) => {
        if (e.name === selectedExercise) {
          const vals = e.loads
            .filter((_, idx) => e.setTypes?.[idx] !== 'warmup')
            .map(toNumber)
            .filter((x) => x > 0);
          if (vals.length) {
            pts.push({ date: s.date, v: Math.max(...vals) });
          }
        }
      });
    });
    return pts;
  }, [db.sessions, selectedExercise]);

  const personalRecords = useMemo(() => {
    const best: Record<string, number> = {};
    db.sessions.forEach((s) => {
      s.exercises.forEach((e) => {
        e.loads.forEach((val, idx) => {
          if (e.setTypes?.[idx] === 'warmup') return;
          const num = toNumber(val);
          if (num > 0) {
            best[e.name] = Math.max(best[e.name] || 0, num);
          }
        });
      });
    });
    return Object.entries(best).sort((a, b) => b[1] - a[1]);
  }, [db.sessions]);

  const weeklyBars = useMemo(() => {
    const dayLetters = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      return {
        key: iso,
        label: dayLetters[d.getDay()],
        count: db.sessions.filter((s) => s.date === iso).length,
      };
    });
  }, [db.sessions]);

  // Weekly working sets by muscle group (last 7 days, excluding warm-ups)
  const weeklyMuscleSets = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const counts: Record<MuscleGroup, number> = {
      Peito: 0,
      Costas: 0,
      Pernas: 0,
      Ombros: 0,
      Bíceps: 0,
      Tríceps: 0,
      Outro: 0,
    };

    db.sessions
      .filter((s) => new Date(`${s.date}T12:00:00`) >= sevenDaysAgo)
      .forEach((s) => {
        s.exercises.forEach((e) => {
          const group = e.muscleGroup || inferMuscleGroup(e.name);
          const validDone = e.done.filter(
            (isDone, idx) => isDone && e.setTypes?.[idx] !== 'warmup'
          ).length;
          counts[group] += validDone;
        });
      });

    return TRACKED_MUSCLES.map((m) => ({
      muscle: m,
      sets: counts[m],
    }));
  }, [db.sessions]);

  // Milestones & Habit Correlations
  const insights = useMemo(() => {
    const todayStr = todayISO();
    const projectDay = Math.min(
      db.project.goal,
      Math.max(
        1,
        Math.floor(
          (new Date(`${todayStr}T12:00:00`).getTime() -
            new Date(`${db.project.start}T12:00:00`).getTime()) /
            86400000
        ) + 1
      )
    );

    const ratedSessions = db.sessions.filter((s) => Boolean(s.rating));
    const goodCount = ratedSessions.filter(
      (s) => s.rating === 'excelente' || s.rating === 'bom'
    ).length;
    const goodPct =
      ratedSessions.length > 0 ? Math.round((goodCount / ratedSessions.length) * 100) : null;

    // Sleep correlation
    const proteinGoal = db.goals?.proteinG || DEFAULT_GOALS.proteinG;
    let goodHabitScores: number[] = [];
    let otherScores: number[] = [];
    ratedSessions.forEach((s) => {
      const ck = db.checkins?.[s.date];
      const score = s.rating ? RATING_SCORE[s.rating] : 0;
      if (!ck || !score) return;
      if ((ck.sleepHours ?? 0) >= 7 || ck.proteinG >= proteinGoal * 0.85) {
        goodHabitScores.push(score);
      } else {
        otherScores.push(score);
      }
    });

    const avgGoodHabit =
      goodHabitScores.length > 0
        ? (goodHabitScores.reduce((a, b) => a + b, 0) / goodHabitScores.length).toFixed(1)
        : null;
    const avgOther =
      otherScores.length > 0
        ? (otherScores.reduce((a, b) => a + b, 0) / otherScores.length).toFixed(1)
        : null;

    const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const bestDayMap: Record<number, { sum: number; count: number }> = {};
    ratedSessions.forEach((s) => {
      const wd = new Date(`${s.date}T12:00:00`).getDay();
      if (!bestDayMap[wd]) bestDayMap[wd] = { sum: 0, count: 0 };
      bestDayMap[wd].sum += RATING_SCORE[s.rating!];
      bestDayMap[wd].count++;
    });

    let bestWeekday: string | null = null;
    let bestWeekdayAvg = 0;
    Object.entries(bestDayMap).forEach(([wdStr, info]) => {
      const avg = info.sum / info.count;
      if (avg > bestWeekdayAvg) {
        bestWeekdayAvg = avg;
        bestWeekday = weekdayNames[Number(wdStr)];
      }
    });

    const totalVolumeAll = db.sessions.reduce(
      (acc, s) => acc + calculateSessionVolume(s),
      0
    );

    return {
      projectDay,
      goodPct,
      ratedCount: ratedSessions.length,
      avgGoodHabit,
      avgOther,
      bestWeekday,
      totalVolumeAll,
    };
  }, [db.project.goal, db.project.start, db.sessions, db.checkins, db.goals?.proteinG]);

  // Habit quality breakdown (Sleep, Water, Creatine - outside workouts)
  const habitSummaryStats = useMemo(() => {
    const counts = {
      sleep: { excelente: 0, bom: 0, ruim: 0 } as Record<HabitRating, number>,
      water: { excelente: 0, bom: 0, ruim: 0 } as Record<HabitRating, number>,
      creatine: { excelente: 0, bom: 0, ruim: 0 } as Record<HabitRating, number>,
    };
    let totalDays = 0;

    Object.entries(db.checkins || {}).forEach(([dateStr, ck]) => {
      const d = new Date(`${dateStr}T12:00:00`);
      if (d < cutoffDate) return;
      if (
        !ck.sleepQuality &&
        !ck.waterQuality &&
        !ck.creatineQuality &&
        ck.waterMl === 0 &&
        !ck.creatine &&
        ck.sleepHours === undefined
      ) {
        return;
      }
      totalDays++;
      const evalH = evaluateDailyHabits(ck, db.goals);
      counts.sleep[evalH.sleep]++;
      counts.water[evalH.water]++;
      counts.creatine[evalH.creatine]++;
    });

    return { counts, totalDays };
  }, [db.checkins, db.goals, cutoffDate]);

  // Body measurement chart data
  const availableMeasureParts = useMemo(() => {
    const recorded = Array.from(new Set(db.measures.map((m) => m.name)));
    return recorded.length > 0 ? recorded : BODY_PARTS;
  }, [db.measures]);

  const activeMeasurePart = availableMeasureParts.includes(selectedMeasurePart)
    ? selectedMeasurePart
    : availableMeasureParts[0];

  const measureChartPoints = useMemo(
    () =>
      db.measures
        .filter((m) => m.name === activeMeasurePart)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [db.measures, activeMeasurePart]
  );

  // 90-day project consistency map
  const projectDaysGrid = useMemo(() => {
    const totalDays = Math.min(90, Math.max(30, db.project.goal || 90));
    const start = new Date(`${db.project.start}T12:00:00`);
    const today = todayISO();
    const sessionsByDate: Record<string, CompletedSession[]> = {};
    db.sessions.forEach((s) => {
      if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
      sessionsByDate[s.date].push(s);
    });

    return Array.from({ length: totalDays }, (_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      const daySessions = sessionsByDate[iso] || [];
      return {
        dayNumber: idx + 1,
        iso,
        isToday: iso === today,
        sessions: daySessions,
      };
    });
  }, [db.project.goal, db.project.start, db.sessions]);

  const photoA = db.photos.find((p) => p.id === photoAId);
  const photoB = db.photos.find((p) => p.id === photoBId);

  return (
    <section className="animate-tab-fade">
      {/* Header */}
      <div className="mt-4 mb-3">
        <h1 className="text-[26px] font-extrabold text-[#f5f5f5] m-0 leading-tight">
          Estatísticas
        </h1>
        <div className="text-[11px] text-[#999999] mt-0.5">SUA EVOLUÇÃO EM DADOS</div>
      </div>

      {/* Period Picker */}
      <div className="flex gap-[7px] overflow-x-auto pb-2.5 mb-1">
        {PERIOD_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setPeriod(days)}
            className={`shrink-0 rounded-[9px] px-3.5 py-2.5 text-xs font-bold border transition-colors whitespace-nowrap ${
              period === days
                ? 'text-[#ff303b] border-[#ff303b] bg-[#291315]'
                : 'bg-[#1a1a1a] text-[#aaaaaa] border-[#333333] hover:text-white'
            }`}
          >
            {`${days} dias`}
          </button>
        ))}
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
          <span className="text-[11px] text-[#999999] block">SESSÕES</span>
          <strong className="block text-[22px] font-extrabold text-[#f5f5f5] mt-1.5 tabular-nums">
            {periodSessions.length}
          </strong>
        </div>
        <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
          <span className="text-[11px] text-[#999999] block">SÉRIES</span>
          <strong className="block text-[22px] font-extrabold text-[#f5f5f5] mt-1.5 tabular-nums">
            {periodSets}
          </strong>
        </div>
        <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
          <span className="text-[11px] text-[#999999] block">VOLUME (KG)</span>
          <strong className="block text-[22px] font-extrabold text-[#ff303b] mt-1.5 tabular-nums">
            {periodVolume > 0 ? periodVolume.toLocaleString('pt-BR') : '—'}
          </strong>
        </div>
        <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
          <span className="text-[11px] text-[#999999] block">FREQUÊNCIA</span>
          <strong className="block text-[22px] font-extrabold text-[#f5f5f5] mt-1.5 tabular-nums">
            {`${freqPct}%`}
          </strong>
        </div>
      </div>

      {/* Interactive Monthly Calendar across months */}
      <MonthlyCalendar
        db={db}
        onSelectCalendarDay={onSelectCalendarDay}
        onNotify={onNotify}
      />

      {/* 90-Day Consistency Grid */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Mapa do projeto</h2>
          <span className="text-[11px] text-[#999999]">Toque em qualquer dia</span>
        </div>
        <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5">
          {projectDaysGrid.map((cell) => {
            const latestOfDay = cell.sessions[cell.sessions.length - 1];
            const latestRated = [...cell.sessions].reverse().find((s) => Boolean(s.rating));
            const ratingId = latestRated?.rating ?? db.dayRatings?.[cell.iso];
            const ratingCfg = ratingId ? RATING_MAP[ratingId] : null;
            const trained = cell.sessions.length > 0;

            const style: React.CSSProperties = ratingCfg
              ? {
                  backgroundColor: ratingCfg.cellBg,
                  borderColor: ratingCfg.cellBorder,
                  color: ratingCfg.cellText,
                }
              : trained
              ? {
                  backgroundColor: '#291315',
                  borderColor: '#ff303b',
                  color: '#ffffff',
                }
              : {
                  backgroundColor: '#1c1c1c',
                  borderColor: '#2b2b2b',
                  color: '#666666',
                };

            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => onSelectCalendarDay(cell.iso, cell.sessions)}
                style={style}
                title={
                  latestOfDay
                    ? `Dia ${cell.dayNumber} (${formatDateBR(cell.iso)}) — ${latestOfDay.name}${
                        ratingCfg ? ` (${ratingCfg.label})` : ''
                      }`
                    : `Dia ${cell.dayNumber} (${formatDateBR(cell.iso)})${
                        ratingCfg ? ` — ${ratingCfg.label}` : ''
                      }`
                }
                className={`h-7 rounded-md border text-[10px] font-bold tabular-nums flex items-center justify-center transition-transform active:scale-95 hover:brightness-110 ${
                  cell.isToday ? 'ring-1 ring-white' : ''
                }`}
              >
                {cell.dayNumber}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weekly Sets by Muscle Group */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">
            Séries na semana por músculo
          </h2>
          <span className="text-[11px] text-[#999999]">Últimos 7 dias (sem aquec.)</span>
        </div>
        <div className="space-y-2.5">
          {weeklyMuscleSets.map((item) => {
            const pct = Math.min(100, Math.round((item.sets / 16) * 100));
            return (
              <div key={item.muscle}>
                <div className="flex items-center justify-between text-xs mb-1 tabular-nums">
                  <span className="text-[#e5e5e5] font-semibold">{item.muscle}</span>
                  <span className="text-[#999999]">{`${item.sets} séries`}</span>
                </div>
                <div className="h-2 bg-[#232323] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff303b] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones & Habit Insights */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">
            Marcos &amp; Hábitos
          </h2>
          <span className="text-[11px] text-[#ff777f] font-bold tabular-nums">
            {`${weeklyStreak} ${weeklyStreak === 1 ? 'semana seguida' : 'semanas seguidas'}`}
          </span>
        </div>

        {/* 30 / 60 / 90 Phase Milestones */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[30, 60, 90].map((mark) => {
            const reached = insights.projectDay >= mark;
            const prog = Math.min(100, Math.round((insights.projectDay / mark) * 100));
            return (
              <div
                key={mark}
                className={`rounded-xl p-2.5 border ${
                  reached
                    ? 'bg-[#211012] border-[#ff303b]'
                    : 'bg-[#191919] border-[#2d2d2d]'
                }`}
              >
                <div className="text-[11px] font-bold text-[#f5f5f5] tabular-nums">
                  {`Marco ${mark}d`}
                </div>
                <div className="text-[10px] text-[#999999] mt-0.5 tabular-nums">
                  {reached ? 'Alcançado' : `${prog}%`}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5 text-xs text-[#d4d4d4]">
          <div className="flex items-center justify-between py-1.5 border-b border-[#242424]">
            <span className="text-[#999999]">Volume acumulado no projeto</span>
            <strong className="tabular-nums text-[#f5f5f5]">
              {insights.totalVolumeAll > 0
                ? `${insights.totalVolumeAll.toLocaleString('pt-BR')} kg`
                : '—'}
            </strong>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-[#242424]">
            <span className="text-[#999999]">Treinos Bom / Excelente</span>
            <strong className="tabular-nums text-[#86efac]">
              {insights.goodPct !== null
                ? `${insights.goodPct}% (${insights.ratedCount} avaliados)`
                : 'Avalie treinos para ver'}
            </strong>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-[#242424]">
            <span className="text-[#999999]">Melhor dia da semana</span>
            <strong className="text-[#f5f5f5]">
              {insights.bestWeekday || 'Sem dados suficientes'}
            </strong>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[#999999]">Nota média (sono ≥7h ou proteína)</span>
            <strong className="tabular-nums text-[#f5f5f5]">
              {insights.avgGoodHabit
                ? `${insights.avgGoodHabit}/5${
                    insights.avgOther ? ` vs ${insights.avgOther}/5` : ''
                  }`
                : 'Registre check-ins e treinos'}
            </strong>
          </div>
        </div>

        {/* Sleep, Water & Creatine Rating Breakdown (non-training) */}
        <div className="mt-3 pt-3 border-t border-[#242424]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-[#f5f5f5]">
              {`Hábitos fora do treino (${period}d)`}
            </span>
            <span className="text-[11px] text-[#999999] tabular-nums">
              {`${habitSummaryStats.totalDays} ${
                habitSummaryStats.totalDays === 1 ? 'dia registrado' : 'dias registrados'
              }`}
            </span>
          </div>
          {habitSummaryStats.totalDays > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { key: 'sleep' as const, label: 'Sono' },
                { key: 'water' as const, label: 'Água' },
                { key: 'creatine' as const, label: 'Creatina' },
              ].map((item) => {
                const c = habitSummaryStats.counts[item.key];
                return (
                  <div
                    key={item.key}
                    className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-2.5 text-xs"
                  >
                    <div className="font-bold text-[#f5f5f5] mb-1.5">{item.label}</div>
                    <div className="flex items-center justify-between text-[11px] tabular-nums">
                      <span style={{ color: HABIT_RATING_MAP.excelente.badgeText }}>
                        {`Exc: ${c.excelente}`}
                      </span>
                      <span style={{ color: HABIT_RATING_MAP.bom.badgeText }}>
                        {`Bom: ${c.bom}`}
                      </span>
                      <span style={{ color: HABIT_RATING_MAP.ruim.badgeText }}>
                        {`Ruim: ${c.ruim}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[11px] text-[#888888]">
              Registre água, sono ou creatina no Check-in de hoje para ver o resumo.
            </div>
          )}
        </div>
      </div>

      {/* Body Weight */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2.5 mb-2">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Peso corporal</h2>
          <button
            type="button"
            onClick={onOpenWeightModal}
            className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-3 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            + Registrar
          </button>
        </div>
        <LineChart
          values={periodWeights.map((w) => w.value)}
          labels={periodWeights.map((w) => formatDateBR(w.date).slice(0, 5))}
          suffix=" kg"
          emptyText="Registre seu peso para ver a evolução."
        />
        {periodWeights.length > 0 && (
          <div className="mt-2">
            {[...periodWeights]
              .reverse()
              .slice(0, 6)
              .map((w, idx, arr) => (
                <div
                  key={w.id}
                  className={`flex items-center justify-between gap-2.5 py-2.5 text-sm ${
                    idx < arr.length - 1 ? 'border-b border-[#292929]' : ''
                  }`}
                >
                  <span className="tabular-nums">{formatDateBR(w.date)}</span>
                  <b className="tabular-nums">{`${w.value.toFixed(1)} kg`}</b>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Load Evolution */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <h2 className="text-[17px] font-bold text-[#f5f5f5] mb-3">Evolução das cargas</h2>
        <div className="mb-3">
          <label className="block text-[11px] text-[#999999] mb-1.5">
            Selecionar exercício
          </label>
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
          >
            <option value="">Selecione um exercício</option>
            {exerciseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {!selectedExercise ? (
          <div className="py-5 px-2 text-center text-[#999999] text-sm">
            Selecione um exercício.
          </div>
        ) : (
          <LineChart
            values={loadPoints.map((p) => p.v)}
            labels={loadPoints.map((p) => formatDateBR(p.date).slice(0, 5))}
            suffix=" kg"
            emptyText="Sem cargas registradas neste exercício."
          />
        )}
      </div>

      {/* Personal Records */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <h2 className="text-[17px] font-bold text-[#f5f5f5] mb-3">Recordes pessoais</h2>
        {personalRecords.length > 0 ? (
          <div>
            {personalRecords.map(([name, val], idx, arr) => (
              <div
                key={name}
                className={`flex items-center justify-between gap-2.5 py-2.5 text-sm ${
                  idx < arr.length - 1 ? 'border-b border-[#292929]' : ''
                }`}
              >
                <span>{name}</span>
                <b className="text-[#ff303b] tabular-nums">{`${val} kg`}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-5 px-2 text-center text-[#999999] text-sm">
            Seus recordes aparecerão conforme registrar cargas.
          </div>
        )}
      </div>

      {/* Weekly Frequency */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <h2 className="text-[17px] font-bold text-[#f5f5f5] mb-3">Frequência semanal</h2>
        <div className="grid grid-cols-7 gap-2 pt-1">
          {weeklyBars.map((bar) => (
            <div key={bar.key} className="flex flex-col items-center gap-1.5">
              <div className="h-[85px] w-[22px] bg-[#252525] rounded-md flex items-end overflow-hidden">
                <div
                  className="w-full bg-[#ff303b] transition-all duration-300"
                  style={{ height: `${Math.min(100, bar.count * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-[#999999]">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Start vs Current Comparison */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <h2 className="text-[17px] font-bold text-[#f5f5f5] mb-3">
          Comparação: início x atual
        </h2>
        {firstWeight && latestWeight ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
                <span className="text-[11px] text-[#999999] block tabular-nums">
                  {`INÍCIO · ${formatDateBR(firstWeight.date)}`}
                </span>
                <strong className="block text-[22px] font-extrabold text-[#f5f5f5] mt-1.5 tabular-nums">
                  {`${firstWeight.value.toFixed(1)} kg`}
                </strong>
              </div>
              <div className="bg-[#191919] border border-[#303030] rounded-[15px] p-[13px]">
                <span className="text-[11px] text-[#999999] block tabular-nums">
                  {`ATUAL · ${formatDateBR(latestWeight.date)}`}
                </span>
                <strong className="block text-[22px] font-extrabold text-[#f5f5f5] mt-1.5 tabular-nums">
                  {`${latestWeight.value.toFixed(1)} kg`}
                </strong>
              </div>
            </div>
            <p className="text-[#ff303b] font-semibold text-sm mt-3 mb-0 tabular-nums">
              {`Variação: ${latestWeight.value - firstWeight.value >= 0 ? '+' : ''}${(
                latestWeight.value - firstWeight.value
              ).toFixed(1)} kg`}
            </p>
          </>
        ) : (
          <div className="py-5 px-2 text-center text-[#999999] text-sm">
            Registre pesos em datas diferentes para comparar.
          </div>
        )}
      </div>

      {/* Body Measurements + Chart */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2.5 mb-2">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Medidas corporais</h2>
          <button
            type="button"
            onClick={onOpenMeasureModal}
            className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-3 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            + Medida
          </button>
        </div>

        {db.measures.length > 0 && (
          <div className="mb-3">
            <label className="block text-[11px] text-[#999999] mb-1.5">
              Gráfico por parte do corpo
            </label>
            <select
              value={activeMeasurePart}
              onChange={(e) => setSelectedMeasurePart(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2 text-xs outline-none mb-2"
            >
              {availableMeasureParts.map((part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
            <LineChart
              values={measureChartPoints.map((m) => m.value)}
              labels={measureChartPoints.map((m) => formatDateBR(m.date).slice(0, 5))}
              suffix=" cm"
              emptyText={`Sem medidas de ${activeMeasurePart}.`}
            />
          </div>
        )}

        {db.measures.length > 0 ? (
          <div>
            {[...db.measures]
              .reverse()
              .slice(0, 12)
              .map((m, idx, arr) => (
                <div
                  key={`${m.date}-${m.name}-${idx}`}
                  className={`flex items-center justify-between gap-2.5 py-2.5 text-sm ${
                    idx < arr.length - 1 ? 'border-b border-[#292929]' : ''
                  }`}
                >
                  <span className="tabular-nums">{`${formatDateBR(m.date)} · ${m.name}`}</span>
                  <b className="tabular-nums">{`${m.value} cm`}</b>
                </div>
              ))}
          </div>
        ) : (
          <div className="py-5 px-2 text-center text-[#999999] text-sm">
            Nenhuma medida registrada.
          </div>
        )}
      </div>

      {/* Evolution Photos + Before/After Slider */}
      <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mb-3">
        <div className="flex items-center justify-between gap-2.5 mb-1.5">
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Fotos de evolução</h2>
          <button
            type="button"
            onClick={onTriggerAddPhoto}
            className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-3 py-2 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            + Foto
          </button>
        </div>
        <p className="text-[11px] text-[#999999] mb-3">
          Fotos armazenadas neste navegador, organizadas por data.
        </p>

        {db.photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {[...db.photos].reverse().map((p) => (
              <div key={p.id}>
                <img
                  src={p.data}
                  alt={`Evolução ${formatDateBR(p.date)}`}
                  className="w-full max-h-[220px] object-cover rounded-[9px]"
                />
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-[11px] text-[#999999] tabular-nums">
                    {formatDateBR(p.date)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeletePhoto(p.id)}
                    className="bg-[#3a171a] hover:bg-[#4e1d22] text-[#ff8b91] border border-[#73333a] rounded-lg px-2 py-1 text-[11px] font-bold transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-5 px-2 text-center text-[#999999] text-sm mb-3">
            Sua galeria começará com a primeira foto.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] text-[#999999] mb-1.5">Foto inicial</label>
            <select
              value={photoAId}
              onChange={(e) => setPhotoAId(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
            >
              <option value="">Selecionar foto</option>
              {db.photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDateBR(p.date)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[#999999] mb-1.5">Foto atual</label>
            <select
              value={photoBId}
              onChange={(e) => setPhotoBId(e.target.value)}
              className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
            >
              <option value="">Selecionar foto</option>
              {db.photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDateBR(p.date)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {photoA && photoB && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => setPhotoCompareMode('side')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  photoCompareMode === 'side'
                    ? 'bg-[#291315] border-[#ff303b] text-[#ff303b]'
                    : 'bg-[#191919] border-[#333333] text-[#aaaaaa]'
                }`}
              >
                Lado a lado
              </button>
              <button
                type="button"
                onClick={() => setPhotoCompareMode('slider')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  photoCompareMode === 'slider'
                    ? 'bg-[#291315] border-[#ff303b] text-[#ff303b]'
                    : 'bg-[#191919] border-[#333333] text-[#aaaaaa]'
                }`}
              >
                Deslizar (Antes × Depois)
              </button>
            </div>

            {photoCompareMode === 'side' ? (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <img
                    src={photoA.data}
                    alt={`Foto inicial ${formatDateBR(photoA.date)}`}
                    className="w-full max-h-[220px] object-cover rounded-[9px]"
                  />
                  <small className="text-[11px] text-[#999999] block mt-1 tabular-nums">
                    {formatDateBR(photoA.date)}
                  </small>
                </div>
                <div>
                  <img
                    src={photoB.data}
                    alt={`Foto atual ${formatDateBR(photoB.date)}`}
                    className="w-full max-h-[220px] object-cover rounded-[9px]"
                  />
                  <small className="text-[11px] text-[#999999] block mt-1 tabular-nums">
                    {formatDateBR(photoB.date)}
                  </small>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative w-full h-[280px] sm:h-[340px] rounded-[11px] overflow-hidden border border-[#333333] bg-[#0a0a0a] select-none">
                  <img
                    src={photoB.data}
                    alt={`Depois (${formatDateBR(photoB.date)})`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <img
                    src={photoA.data}
                    alt={`Antes (${formatDateBR(photoA.date)})`}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#ff303b] pointer-events-none"
                    style={{ left: `${sliderPos}%` }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-[10px] font-bold px-2 py-1 rounded text-white tabular-nums">
                    {`Antes: ${formatDateBR(photoA.date)}`}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-[10px] font-bold px-2 py-1 rounded text-[#ff777f] tabular-nums">
                    {`Depois: ${formatDateBR(photoB.date)}`}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  aria-label="Comparar antes e depois"
                  className="w-full mt-2 accent-[#ff303b]"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
