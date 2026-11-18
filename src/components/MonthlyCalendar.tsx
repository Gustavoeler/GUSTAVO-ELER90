import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { AppDB, CompletedSession, HabitRating, WorkoutRating } from '../types';
import {
  downloadShareSummaryCard,
  evaluateDailyHabits,
  formatDateBR,
  HABIT_RATING_MAP,
  MONTH_NAMES_PT,
  RATING_MAP,
  todayISO,
  WORKOUT_RATINGS,
} from '../data/defaults';

interface MonthlyCalendarProps {
  db: AppDB;
  onSelectCalendarDay: (dateIso: string, sessions: CompletedSession[]) => void;
  onNotify?: (message: string) => void;
}

const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  db,
  onSelectCalendarDay,
  onNotify,
}) => {
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth()); // 0..11

  const today = todayISO();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const sessionsByDate = useMemo(() => {
    const map: Record<string, CompletedSession[]> = {};
    db.sessions.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [db.sessions]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0=Dom..6=Sab
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: {
      key: string;
      dayNum: number | null;
      iso: string | null;
      sessions: CompletedSession[];
      rating: WorkoutRating | null;
      habitOverall: HabitRating | null;
      habitSummary: string | null;
    }[] = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({
        key: `pad-start-${i}`,
        dayNum: null,
        iso: null,
        sessions: [],
        rating: null,
        habitOverall: null,
        habitSummary: null,
      });
    }

    const mm = String(viewMonth + 1).padStart(2, '0');
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = String(d).padStart(2, '0');
      const iso = `${viewYear}-${mm}-${dd}`;
      const daySessions = sessionsByDate[iso] || [];
      const latestRatedSession = [...daySessions]
        .reverse()
        .find((s) => Boolean(s.rating));
      const rating: WorkoutRating | null =
        latestRatedSession?.rating ?? db.dayRatings?.[iso] ?? null;

      const ck = db.checkins?.[iso];
      let habitOverall: HabitRating | null = null;
      let habitSummary: string | null = null;
      if (
        ck &&
        (ck.sleepQuality ||
          ck.waterQuality ||
          ck.creatineQuality ||
          ck.waterMl > 0 ||
          ck.creatine ||
          ck.sleepHours !== undefined)
      ) {
        const evalH = evaluateDailyHabits(ck, db.goals);
        habitOverall = evalH.overall;
        habitSummary = `Sono ${HABIT_RATING_MAP[evalH.sleep].label} · Água ${HABIT_RATING_MAP[evalH.water].label} · Creatina ${HABIT_RATING_MAP[evalH.creatine].label}`;
      }

      cells.push({
        key: iso,
        dayNum: d,
        iso,
        sessions: daySessions,
        rating,
        habitOverall,
        habitSummary,
      });
    }

    return cells;
  }, [viewYear, viewMonth, sessionsByDate, db.dayRatings, db.checkins, db.goals]);

  const monthCounts = useMemo(() => {
    const counts: Record<WorkoutRating, number> = {
      excelente: 0,
      bom: 0,
      ok: 0,
      ruim: 0,
      nao_completei: 0,
    };
    let trainedDays = 0;

    calendarCells.forEach((cell) => {
      if (!cell.iso) return;
      if (cell.sessions.length > 0) trainedDays++;
      if (cell.rating) {
        counts[cell.rating]++;
      }
    });

    return { counts, trainedDays };
  }, [calendarCells]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const handleDownloadCard = () => {
    const ok = downloadShareSummaryCard(db, viewYear, viewMonth);
    onNotify?.(
      ok
        ? 'Card resumo do mês baixado em PNG.'
        : 'Não foi possível gerar o card neste navegador.'
    );
  };

  return (
    <div className="bg-[#111111] border border-[#303030] rounded-[15px] p-[15px] mt-3 mb-3">
      {/* Calendar Header with Month Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-[17px] font-bold text-[#f5f5f5] m-0">Calendário de treinos</h2>
          <div className="text-[11px] text-[#999999] mt-0.5">
            Toque em qualquer dia para ver o treino ou avaliar
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap"
            >
              Hoje
            </button>
          )}
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Mês anterior"
            className="bg-[#1a1a1a] hover:bg-[#262626] text-[#f5f5f5] border border-[#383838] rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[122px] text-center text-xs font-extrabold text-[#f5f5f5] capitalize tabular-nums">
            {`${MONTH_NAMES_PT[viewMonth]} ${viewYear}`}
          </span>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Próximo mês"
            className="bg-[#1a1a1a] hover:bg-[#262626] text-[#f5f5f5] border border-[#383838] rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDownloadCard}
            title="Baixar imagem resumo do mês"
            className="inline-flex items-center gap-1 bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#ff303b]" />
            <span>Card</span>
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAY_HEADERS.map((wd) => (
          <div
            key={wd}
            className="text-center text-[10px] font-bold text-[#888888] uppercase tracking-wide py-1"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarCells.map((cell) => {
          if (!cell.iso || cell.dayNum === null) {
            return <div key={cell.key} className="h-10 sm:h-11 rounded-lg" />;
          }

          const isToday = cell.iso === today;
          const ratingCfg = cell.rating ? RATING_MAP[cell.rating] : null;
          const hasUnratedSession = !ratingCfg && cell.sessions.length > 0;

          const style: React.CSSProperties = ratingCfg
            ? {
                backgroundColor: ratingCfg.cellBg,
                borderColor: ratingCfg.cellBorder,
                color: ratingCfg.cellText,
              }
            : hasUnratedSession
            ? {
                backgroundColor: '#291315',
                borderColor: '#ff303b',
                color: '#f5f5f5',
              }
            : {
                backgroundColor: '#171717',
                borderColor: '#2a2a2a',
                color: '#a3a3a3',
              };

          const titleParts = [formatDateBR(cell.iso)];
          if (ratingCfg) titleParts.push(`Treino: ${ratingCfg.label}`);
          if (cell.habitSummary) titleParts.push(cell.habitSummary);
          if (cell.sessions.length > 0) {
            titleParts.push(cell.sessions.map((s) => s.name).join(', '));
          }

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectCalendarDay(cell.iso!, cell.sessions)}
              title={titleParts.join(' · ')}
              style={style}
              className={`relative h-10 sm:h-11 rounded-lg border text-xs font-extrabold tabular-nums flex flex-col items-center justify-center transition-transform active:scale-95 hover:brightness-110 ${
                isToday ? 'ring-2 ring-white ring-offset-1 ring-offset-[#111111]' : ''
              }`}
            >
              {cell.habitOverall && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full border border-black/40"
                  style={{ backgroundColor: HABIT_RATING_MAP[cell.habitOverall].swatchHex }}
                />
              )}
              <span>{cell.dayNum}</span>
              {cell.sessions.length > 0 && (
                <span
                  className="w-1.5 h-1.5 rounded-full mt-0.5"
                  style={{
                    backgroundColor: ratingCfg ? ratingCfg.cellText : '#ff303b',
                    opacity: 0.9,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Month Rating Breakdown */}
      <div className="mt-3 pt-3 border-t border-[#262626]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <span className="text-[11px] text-[#999999] tabular-nums">
            {`Resumo do mês · ${monthCounts.trainedDays} ${
              monthCounts.trainedDays === 1 ? 'dia com treino' : 'dias com treino'
            }`}
          </span>
        </div>

        {/* Legend + Counts */}
        <div className="flex flex-wrap gap-x-3.5 gap-y-2">
          {WORKOUT_RATINGS.map((r) => (
            <div key={r.id} className="inline-flex items-center gap-1.5 text-[11px]">
              <span
                className="w-3 h-3 rounded-sm border shrink-0"
                style={{
                  backgroundColor: r.cellBg,
                  borderColor: r.cellBorder,
                }}
              />
              <span className="text-[#d4d4d4]">{r.label}</span>
              <strong className="text-[#f5f5f5] tabular-nums">
                {`(${monthCounts.counts[r.id]})`}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
