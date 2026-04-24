'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

const ConfirmContext = createContext({});
export const useConfirm = () => useContext(ConfirmContext).confirm;

export function ConfirmProvider({ children }) {
  const { t } = useLocale();
  const [dialog, setDialog] = useState(null);

  // Uso: const ok = await confirm({ titulo, mensaje, peligroso });
  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setDialog({
        titulo: opts.titulo || t('modal.confirmar_titulo'),
        mensaje: opts.mensaje || '',
        textoConfirmar: opts.textoConfirmar || t('common.confirmar'),
        textoCancelar: opts.textoCancelar || t('common.cancelar'),
        peligroso: !!opts.peligroso,
        onResolve: resolve,
      });
    });
  }, [t]);

  const close = (valor) => {
    if (dialog?.onResolve) dialog.onResolve(valor);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => close(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-elegant animate-pop"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                {dialog.peligroso && (
                  <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-red-700" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg sm:text-xl text-ink-900">{dialog.titulo}</h3>
                  {dialog.mensaje && (
                    <p className="text-sm text-ink-600 mt-2">{dialog.mensaje}</p>
                  )}
                </div>
                <button onClick={() => close(false)}
                  className="text-ink-400 hover:text-ink-700 -mt-1 -mr-1"
                  aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="border-t border-ink-100 px-5 sm:px-6 py-3 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button onClick={() => close(false)} className="btn-ghost">
                {dialog.textoCancelar}
              </button>
              <button onClick={() => close(true)}
                className={dialog.peligroso
                  ? 'btn bg-red-700 text-white hover:bg-red-800'
                  : 'btn-accent'}>
                {dialog.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
