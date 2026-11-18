import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ConfirmDialogState } from '../types';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children }) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center p-2.5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-[550px] max-h-[90vh] overflow-y-auto bg-[#151515] border border-[#444444] rounded-[17px] p-[18px] animate-tab-fade">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 id="modal-title" className="text-[17px] font-bold text-[#f5f5f5] m-0">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 bg-[#292929] hover:bg-[#353535] text-white border-0 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <span>Fechar</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ dialog, onClose }) => {
  if (!dialog) return null;

  return (
    <Modal open={Boolean(dialog)} title={dialog.title} onClose={onClose}>
      <p className="text-sm text-[#d4d4d4] mb-5 leading-relaxed">{dialog.message}</p>
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="bg-[#252525] hover:bg-[#303030] text-[#eeeeee] border border-[#444444] rounded-[10px] px-4 py-2.5 text-sm font-bold transition-colors whitespace-nowrap"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            dialog.onConfirm();
            onClose();
          }}
          className={
            dialog.danger
              ? 'bg-[#3a171a] hover:bg-[#4e1d22] text-[#ff8b91] border border-[#73333a] rounded-[10px] px-4 py-2.5 text-sm font-bold transition-colors whitespace-nowrap'
              : 'bg-[#ff303b] hover:bg-[#e62833] text-white border-0 rounded-[10px] px-4 py-2.5 text-sm font-bold transition-colors whitespace-nowrap'
          }
        >
          {dialog.confirmLabel || 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
};

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,460px)] animate-tab-fade">
      <div className="bg-[#211012] border border-[#73333a] text-[#f5f5f5] rounded-xl px-4 py-3 shadow-xl flex items-center justify-between gap-3">
        <span className="text-[13px] leading-snug">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[#ff777f] hover:text-white p-1 shrink-0"
          aria-label="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
