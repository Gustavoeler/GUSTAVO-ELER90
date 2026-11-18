import React from 'react';
import { Check, Copy, Trash2 } from 'lucide-react';
import { CompletedSession, WorkoutRating } from '../types';
import {
  calculateSessionVolume,
  DAY_NAMES_BY_PLAN_DAY,
  formatDateBR,
  formatSessionSummaryText,
  SET_TYPE_CONFIG,
  toNumber,
  WORKOUT_RATINGS,
} from '../data/defaults';
import { Modal } from './Modal';

interface SessionDetailModalProps {
  session: CompletedSession | null;
  onClose: () => void;
  onUpdateRating: (sessionId: string, rating: WorkoutRating | undefined) => void;
  onDeleteSession: (id: string) => void;
  onCopied: (message: string) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  onClose,
  onUpdateRating,
  onDeleteSession,
  onCopied,
}) => {
  if (!session) return null;

  const volume = calculateSessionVolume(session);
  const totalExercises = session.exercises.length;
  const completedExercises = session.exercises.filter(
    (e) => e.done.length > 0 && e.done.every(Boolean)
  ).length;

  const handleCopy = async () => {
    const text = formatSessionSummaryText(session);
    try {
      await navigator.clipboard.writeText(text);
      onCopied('Resumo do treino copiado para a área de transferência.');
    } catch {
      onCopied('Não foi possível copiar automaticamente.');
    }
  };

  return (
    <Modal open={Boolean(session)} title={session.name} onClose={onClose}>
      <div className="space-y-4">
        {/* Session metadata & summary */}
        <div className="text-xs text-[#999999] tabular-nums">
          {`${formatDateBR(session.date)} · ${
            DAY_NAMES_BY_PLAN_DAY[session.day] || 'Treino'
          } · ${completedExercises}/${totalExercises} exercícios completos`}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#191919] border border-[#303030] rounded-xl p-3">
            <span className="text-[10px] text-[#999999] block">DURAÇÃO</span>
            <strong className="text-lg font-extrabold text-[#f5f5f5] tabular-nums">
              {`${session.duration} min`}
            </strong>
          </div>
          <div className="bg-[#191919] border border-[#303030] rounded-xl p-3">
            <span className="text-[10px] text-[#999999] block">SÉRIES</span>
            <strong className="text-lg font-extrabold text-[#f5f5f5] tabular-nums">
              {session.sets}
            </strong>
          </div>
          <div className="bg-[#191919] border border-[#303030] rounded-xl p-3">
            <span className="text-[10px] text-[#999999] block">VOLUME</span>
            <strong className="text-lg font-extrabold text-[#ff303b] tabular-nums">
              {volume > 0 ? `${volume.toLocaleString('pt-BR')} kg` : '—'}
            </strong>
          </div>
        </div>

        {/* Workout Rating Selector */}
        <div className="bg-[#111111] border border-[#2c2c2c] rounded-xl p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-[#f5f5f5]">Como foi o treino?</span>
            {session.rating && (
              <button
                type="button"
                onClick={() => onUpdateRating(session.id, undefined)}
                className="text-[11px] text-[#999999] hover:text-white underline"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WORKOUT_RATINGS.map((r) => {
              const selected = session.rating === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onUpdateRating(session.id, r.id)}
                  style={
                    selected
                      ? {
                          backgroundColor: r.cellBg,
                          borderColor: r.cellBorder,
                          color: r.cellText,
                        }
                      : undefined
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border transition-all whitespace-nowrap ${
                    selected
                      ? 'ring-1 ring-white/80'
                      : 'bg-[#191919] border-[#333333] text-[#d4d4d4] hover:border-[#555555]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: selected ? r.cellText : r.swatchHex,
                    }}
                  />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-2.5">
          {session.exercises.map((ex, idx) => {
            const loads = ex.loads
              .filter((_, sIdx) => ex.setTypes?.[sIdx] !== 'warmup')
              .map(toNumber)
              .filter((v) => v > 0);
            const maxLoad = loads.length > 0 ? Math.max(...loads) : 0;

            return (
              <div
                key={`${ex.name}-${idx}`}
                className="bg-[#0e0e0e] border border-[#2b2b2b] rounded-xl p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <strong className="text-sm text-[#f5f5f5] font-bold">{ex.name}</strong>
                  {maxLoad > 0 && (
                    <span className="text-xs font-bold text-[#ff303b] tabular-nums whitespace-nowrap">
                      {`Máx ${maxLoad} kg`}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {ex.done.map((isDone, setIdx) => {
                    const load = ex.loads[setIdx];
                    const reps = ex.reps?.[setIdx];
                    const setType = ex.setTypes?.[setIdx] || 'work';
                    const typeCfg = SET_TYPE_CONFIG[setType];
                    const rir = ex.rirs?.[setIdx];

                    return (
                      <div
                        key={setIdx}
                        className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-lg bg-[#161616] tabular-nums"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#999999] font-mono">{`S${setIdx + 1}`}</span>
                          {setType !== 'work' && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                              style={{
                                backgroundColor: typeCfg.bg,
                                borderColor: typeCfg.border,
                                color: typeCfg.text,
                              }}
                            >
                              {setType === 'warmup' ? 'Aquec.' : 'Drop'}
                            </span>
                          )}
                        </div>
                        <span className="text-[#f5f5f5] font-medium">
                          {load ? `${load} kg` : 'Sem carga'}
                          {reps ? ` × ${reps} reps` : ''}
                          {rir ? ` · ${rir === '0' ? 'Falha' : `${rir} RIR`}` : ''}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            isDone ? 'text-[#ff777f]' : 'text-[#666666]'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Feita</span>
                            </>
                          ) : (
                            <span>Pendente</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {ex.note && ex.note.trim() !== '' && (
                  <div className="mt-2 pt-2 border-t border-[#242424] text-xs text-[#b5b5b5]">
                    <span className="text-[#888888]">Obs: </span>
                    {ex.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#292929]">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-3.5 py-2.5 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar resumo</span>
          </button>
          <button
            type="button"
            onClick={() => onDeleteSession(session.id)}
            className="inline-flex items-center gap-1.5 bg-[#3a171a] hover:bg-[#4e1d22] text-[#ff8b91] border border-[#73333a] rounded-[10px] px-3.5 py-2.5 text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir sessão</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
