'use client';

import { useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { UserMinus, Mail, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TabAlumnos({ clase, puedeGestionar }) {
  const { user } = useAuth();
  const alumnos = clase.alumnos
    ? Object.entries(clase.alumnos).map(([uid, a]) => ({ uid, ...a }))
    : [];

  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [procesando, setProcesando] = useState(null);

  const buscar = async (q) => {
    setTermino(q);
    if (!q || q.length < 2) return setResultados([]);
    setBuscando(true);
    try {
      const snap = await get(ref(db, 'usuarios'));
      const data = snap.val() || {};
      const qLower = q.toLowerCase();
      const found = Object.entries(data)
        .filter(([uid, u]) => {
          if (u.role !== 'alumno') return false;
          if (!u.approved) return false;
          if (clase.alumnos?.[uid]) return false;
          return (
            u.email?.toLowerCase().includes(qLower) ||
            u.nombre?.toLowerCase().includes(qLower)
          );
        })
        .slice(0, 6)
        .map(([uid, u]) => ({ uid, ...u }));
      setResultados(found);
    } finally {
      setBuscando(false);
    }
  };

  const agregar = async (alumnoUid) => {
    setProcesando(alumnoUid);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/clases/alumnos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ claseId: clase.id, alumnoUid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success('Alumno añadido');
      setTermino('');
      setResultados([]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(null);
    }
  };

  const quitar = async (alumnoUid) => {
    if (!confirm('¿Quitar a este alumno? Esto no reembolsa automáticamente ningún pago.')) return;
    setProcesando(alumnoUid);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/clases/alumnos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ claseId: clase.id, alumnoUid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success('Alumno retirado');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div>
      {puedeGestionar && (
        <div className="card p-4 sm:p-5 mb-5 sm:mb-6">
          <h3 className="font-display text-base sm:text-lg mb-1">Añadir alumno manualmente</h3>
          <p className="text-xs sm:text-sm text-ink-500 mb-3">
            Busca por nombre o correo. Solo aparecen alumnos aprobados.
          </p>
          <input placeholder="Escribe al menos 2 letras…" className="field"
            value={termino} onChange={(e) => buscar(e.target.value)} />
          {buscando && <p className="text-xs text-ink-500 mt-2">Buscando…</p>}
          {resultados.length > 0 && (
            <ul className="mt-3 space-y-2">
              {resultados.map((r) => (
                <li key={r.uid} className="flex items-center justify-between p-2 rounded hover:bg-ink-50 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.nombre}</p>
                    <p className="text-xs text-ink-500 truncate">{r.email}</p>
                  </div>
                  <button
                    onClick={() => agregar(r.uid)}
                    disabled={procesando === r.uid}
                    className="btn-primary text-sm py-1.5 shrink-0">
                    {procesando === r.uid ? '…' : 'Añadir'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {termino.length >= 2 && !buscando && resultados.length === 0 && (
            <p className="text-xs text-ink-500 mt-2">Sin resultados.</p>
          )}
          <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>Añadir manualmente no cobra nada. Úsalo solo para inscripciones de cortesía o casos excepcionales.</span>
          </div>
        </div>
      )}

      {alumnos.length === 0 ? (
        <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
          Aún no hay alumnos inscritos.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {alumnos.map((a) => (
            <div key={a.uid} className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.nombre}</p>
                <p className="text-xs sm:text-sm text-ink-500 flex items-center gap-1 truncate">
                  <Mail size={12} className="shrink-0" /> <span className="truncate">{a.email}</span>
                </p>
                {a.hijoId && a.tutorNombre && (
                  <p className="text-[11px] text-ink-500 mt-0.5 truncate">
                    Inscrito por su tutor/a: {a.tutorNombre}
                  </p>
                )}
                {a.alergias && (
                  <p className="text-[11px] text-amber-700 mt-0.5 truncate">⚠ {a.alergias}</p>
                )}
              </div>
              {puedeGestionar && (
                <button
                  onClick={() => quitar(a.uid)}
                  disabled={procesando === a.uid}
                  className="btn-ghost text-red-700 shrink-0"
                  aria-label="Quitar alumno">
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
