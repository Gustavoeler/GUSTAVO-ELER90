import React, { useMemo, useState } from 'react';
import { calculatePlatesPerSide, estimate1RM, toNumber } from '../data/defaults';
import { Modal } from './Modal';

interface ToolsModalProps {
  open: boolean;
  onClose: () => void;
}

type ToolTab = '1rm' | 'plates';

const PERCENT_ZONES = [
  { pct: 95, reps: '2' },
  { pct: 90, reps: '3–4' },
  { pct: 85, reps: '5–6' },
  { pct: 80, reps: '7–8' },
  { pct: 75, reps: '9–10' },
  { pct: 70, reps: '11–12' },
  { pct: 65, reps: '14–15' },
];

export const ToolsModal: React.FC<ToolsModalProps> = ({ open, onClose }) => {
  const [tab, setTab] = useState<ToolTab>('1rm');

  // 1RM calculator state
  const [rmWeight, setRmWeight] = useState('80');
  const [rmReps, setRmReps] = useState('8');

  // Plate calculator state
  const [targetTotal, setTargetTotal] = useState('80');
  const [barWeight, setBarWeight] = useState('20');

  const estimatedMax = useMemo(
    () => estimate1RM(toNumber(rmWeight), toNumber(rmReps)),
    [rmWeight, rmReps]
  );

  const plateResult = useMemo(
    () => calculatePlatesPerSide(toNumber(targetTotal), toNumber(barWeight)),
    [targetTotal, barWeight]
  );

  return (
    <Modal open={open} title="Ferramentas de treino" onClose={onClose}>
      {/* Tool switcher */}
      <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-[#0c0c0c] border border-[#2d2d2d] rounded-xl">
        <button
          type="button"
          onClick={() => setTab('1rm')}
          className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-colors whitespace-nowrap ${
            tab === '1rm'
              ? 'bg-[#291315] text-[#ff303b] border border-[#ff303b]'
              : 'text-[#aaaaaa] hover:text-white border border-transparent'
          }`}
        >
          Calculadora 1RM
        </button>
        <button
          type="button"
          onClick={() => setTab('plates')}
          className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-colors whitespace-nowrap ${
            tab === 'plates'
              ? 'bg-[#291315] text-[#ff303b] border border-[#ff303b]'
              : 'text-[#aaaaaa] hover:text-white border border-transparent'
          }`}
        >
          Anilhas por lado
        </button>
      </div>

      {tab === '1rm' ? (
        <div>
          <p className="text-xs text-[#999999] mb-3">
            Estime sua carga máxima (1RM) e encontre pesos ideais para hipertrofia e força.
          </p>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">Carga usada (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={rmWeight}
                onChange={(e) => setRmWeight(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">Repetições</label>
              <input
                type="number"
                min="1"
                max="30"
                value={rmReps}
                onChange={(e) => setRmReps(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
          </div>

          <div className="bg-[#211012] border border-[#55252a] rounded-xl p-3.5 mb-3 flex items-center justify-between">
            <span className="text-xs text-[#d4d4d4] font-semibold">1RM ESTIMADO (EPLEY)</span>
            <strong className="text-2xl font-black text-[#ff303b] tabular-nums">
              {estimatedMax > 0 ? `${estimatedMax} kg` : '—'}
            </strong>
          </div>

          {estimatedMax > 0 && (
            <div className="bg-[#0e0e0e] border border-[#2b2b2b] rounded-xl px-3 py-1">
              {PERCENT_ZONES.map((z, idx) => {
                const load = Math.round((estimatedMax * z.pct) / 100 / 0.5) * 0.5;
                return (
                  <div
                    key={z.pct}
                    className={`flex items-center justify-between py-2 text-xs tabular-nums ${
                      idx < PERCENT_ZONES.length - 1 ? 'border-b border-[#242424]' : ''
                    }`}
                  >
                    <span className="text-[#999999]">{`${z.pct}% · ~${z.reps} reps`}</span>
                    <strong className="text-[#f5f5f5] font-bold">{`${load} kg`}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-xs text-[#999999] mb-3">
            Descubra exatamente quais anilhas colocar em cada lado da barra.
          </p>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">Peso total (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={targetTotal}
                onChange={(e) => setTargetTotal(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#999999] mb-1.5">Peso da barra</label>
              <select
                value={barWeight}
                onChange={(e) => setBarWeight(e.target.value)}
                className="w-full bg-[#090909] text-white border border-[#444444] focus:border-[#ff303b] rounded-[9px] p-2.5 text-sm outline-none"
              >
                <option value="20">Barra olímpica (20 kg)</option>
                <option value="12">Barra W / média (12 kg)</option>
                <option value="10">Barra reta leve (10 kg)</option>
                <option value="0">Sem barra / máquina (0 kg)</option>
              </select>
            </div>
          </div>

          <div className="bg-[#211012] border border-[#55252a] rounded-xl p-3.5 mb-3 flex items-center justify-between">
            <span className="text-xs text-[#d4d4d4] font-semibold">CARGA POR LADO</span>
            <strong className="text-2xl font-black text-[#ff303b] tabular-nums">
              {`${plateResult.perSide} kg`}
            </strong>
          </div>

          {plateResult.plates.length > 0 ? (
            <div className="bg-[#0e0e0e] border border-[#2b2b2b] rounded-xl p-3 space-y-2">
              <div className="text-[11px] text-[#999999] mb-1">Anilhas em cada lado:</div>
              <div className="flex flex-wrap gap-2">
                {plateResult.plates.map((p) => (
                  <div
                    key={p.weight}
                    className="bg-[#1b1b1b] border border-[#444444] rounded-lg px-3 py-2 text-xs font-bold text-[#f5f5f5] tabular-nums"
                  >
                    {`${p.count}× ${p.weight} kg`}
                  </div>
                ))}
              </div>
              {plateResult.remainder > 0 && (
                <div className="text-[11px] text-[#ff777f] pt-1 tabular-nums">
                  {`Diferença não fracionada: ${plateResult.remainder} kg por lado`}
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-[#999999]">
              Peso total menor ou igual ao peso da barra.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
