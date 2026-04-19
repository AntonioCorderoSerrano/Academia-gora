'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';

const hoy = () => new Date().toISOString().split('T')[0];

export default function TabAsistencia({ clase, puedeGestionar }) {
  const { user } = useAuth();
  const [fecha, setFecha] = useState(hoy());
  const [registros, setRegistros] = useState({});

  useEffect(() => {
    const unsub = onValue(
      ref(db, `clases/${clase.id}/asistencia/${fecha}`),
      (snap) => setRegistros(snap.val() || {})
    );
    return () => unsub();
  }, [clase.id, fecha]);

  const alumnos = clase.alumnos
    ? Object.entries(clase.alumnos).map(([uid, a]) => ({ uid, ...a }))
    : [];

  const marcar = async (uid, estado) => {
    await set(
      ref(db, `clases/${clase.id}/asistencia/${fecha}/${uid}`),
      { estado, markedAt: serverTimestamp(), markedBy: user.uid }
    );
  };

  const miEstado = registros[user.uid]?.estado;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <h3 className="font-display text-lg sm:text-xl">Asistencia</h3>
          <p className="text-xs sm:text-sm text-ink-500">
            {puedeGestionar ? 'Registra la asistencia de tus alumnos' : 'Confirma tu asistencia'}
          </p>
        </div>
        <input type="date" className="field sm:max-w-xs"
          value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>

      {!puedeGestionar && clase.alumnos?.[user.uid] && (
        <div className="card p-5 sm:p-6 mb-5 sm:mb-6">
          <p className="text-ink-600 text-sm">
            Estado de hoy:{' '}
            <span className={`font-medium ${
              miEstado === 'presente' ? 'text-green-700' :
              miEstado === 'ausente' ? 'text-red-700' : 'text-ink-500'
            }`}>
              {miEstado || 'sin registrar'}
            </span>
          </p>
          <div className="mt-3">
            <button onClick={() => { marcar(user.uid, 'presente'); toast.success('Confirmada'); }}
              className="btn-accent text-sm w-full sm:w-auto">
              <Check size={16} /> Estoy presente
            </button>
          </div>
        </div>
      )}

      {puedeGestionar && (
        alumnos.length === 0 ? (
          <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
            No hay alumnos inscritos.
          </div>
        ) : (
          <div className="card divide-y divide-ink-100">
            {alumnos.map((a) => {
              const est = registros[a.uid]?.estado;
              return (
                <div key={a.uid} className="p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.nombre}</p>
                    <p className="text-xs text-ink-500 truncate">{a.email}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => marcar(a.uid, 'presente')}
                      aria-label="Presente"
                      className={`p-2 rounded-lg transition ${
                        est === 'presente' ? 'bg-green-600 text-white' : 'bg-ink-100 hover:bg-green-100'
                      }`}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => marcar(a.uid, 'ausente')}
                      aria-label="Ausente"
                      className={`p-2 rounded-lg transition ${
                        est === 'ausente' ? 'bg-red-600 text-white' : 'bg-ink-100 hover:bg-red-100'
                      }`}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
