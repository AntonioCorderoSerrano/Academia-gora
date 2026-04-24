'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { Check, X as XIcon, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function hoy() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export default function TabAsistencia({ clase, puedeGestionar, hijosEn = [] }) {
  const { user, profile } = useAuth();
  const [fecha, setFecha] = useState(hoy());
  const [asistencia, setAsistencia] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(db, `clases/${clase.id}/asistencia/${fecha}`), (snap) => {
      setAsistencia(snap.val() || {});
    });
    return () => unsub();
  }, [clase.id, fecha]);

  const esTutor = profile.role === ROLES.TUTOR;
  const esAlumnoInscrito = !!clase.alumnos?.[user.uid];

  const marcar = async (alumnoUid, presente) => {
    try {
      await set(ref(db, `clases/${clase.id}/asistencia/${fecha}/${alumnoUid}`), {
        presente,
        marcadoPor: user.uid,
        marcadoEn: serverTimestamp(),
      });
      toast.success(presente ? 'Asistencia confirmada' : 'Ausencia marcada');
    } catch (err) {
      toast.error('No se pudo guardar');
    }
  };

  // VISTA TUTOR: un bloque por cada hijo para que marque presente/ausente
  if (esTutor && hijosEn.length > 0) {
    return (
      <div>
        <div className="mb-4">
          <label className="text-sm text-ink-700">Fecha</label>
          <input type="date" value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="field mt-1 max-w-[200px]" />
        </div>

        <p className="text-sm text-ink-600 mb-3">
          Marca la asistencia de tus hijos a la clase del día seleccionado.
        </p>

        <div className="space-y-3">
          {hijosEn.map((h) => {
            const a = asistencia[h.uid];
            return (
              <div key={h.uid} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-up">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center">
                    <UserCircle size={20} className="text-accent-deep" />
                  </div>
                  <div>
                    <p className="font-medium">{h.nombre}</p>
                    {a && (
                      <p className="text-xs text-ink-500">
                        {a.presente ? '✓ Asistió' : '✗ No asistió'} ·{' '}
                        {new Date(a.marcadoEn || Date.now()).toLocaleString('es-ES')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => marcar(h.uid, true)}
                    className={`btn text-sm ${a?.presente === true
                      ? 'bg-green-600 text-white'
                      : 'bg-ink-100 text-ink-700 hover:bg-green-100'}`}>
                    <Check size={14} /> Asistió
                  </button>
                  <button
                    onClick={() => marcar(h.uid, false)}
                    className={`btn text-sm ${a?.presente === false
                      ? 'bg-red-700 text-white'
                      : 'bg-ink-100 text-ink-700 hover:bg-red-100'}`}>
                    <XIcon size={14} /> No asistió
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // VISTA ALUMNO: marca su propia asistencia
  if (esAlumnoInscrito && !puedeGestionar) {
    const a = asistencia[user.uid];
    return (
      <div>
        <div className="mb-4">
          <label className="text-sm text-ink-700">Fecha</label>
          <input type="date" value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="field mt-1 max-w-[200px]" />
        </div>

        <div className="card p-5 animate-fade-up">
          <p className="text-sm text-ink-600 mb-3">Confirma si has asistido a la clase:</p>
          <div className="flex gap-2">
            <button
              onClick={() => marcar(user.uid, true)}
              className={`btn ${a?.presente === true
                ? 'bg-green-600 text-white'
                : 'bg-ink-100 text-ink-700 hover:bg-green-100'}`}>
              <Check size={16} /> Asistí
            </button>
            <button
              onClick={() => marcar(user.uid, false)}
              className={`btn ${a?.presente === false
                ? 'bg-red-700 text-white'
                : 'bg-ink-100 text-ink-700 hover:bg-red-100'}`}>
              <XIcon size={16} /> No asistí
            </button>
          </div>
          {a && (
            <p className="text-xs text-ink-500 mt-3">
              Última marca: {a.presente ? 'Asistió' : 'No asistió'} el{' '}
              {new Date(a.marcadoEn || Date.now()).toLocaleString('es-ES')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // VISTA DOCENTE/ADMIN: ve todos los alumnos con sus marcas
  const alumnos = clase.alumnos
    ? Object.entries(clase.alumnos).map(([uid, a]) => ({ uid, ...a }))
    : [];

  return (
    <div>
      <div className="mb-4">
        <label className="text-sm text-ink-700">Fecha</label>
        <input type="date" value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="field mt-1 max-w-[200px]" />
      </div>

      {alumnos.length === 0 ? (
        <div className="card p-8 text-center text-ink-500">Sin alumnos inscritos.</div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {alumnos.map((a, i) => {
            const as = asistencia[a.uid];
            return (
              <div key={a.uid} className="p-3 sm:p-4 flex items-center justify-between gap-3 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.nombre}</p>
                  {a.tutorNombre && (
                    <p className="text-xs text-ink-500 truncate">Tutor: {a.tutorNombre}</p>
                  )}
                </div>
                {puedeGestionar ? (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => marcar(a.uid, true)}
                      className={`btn text-sm py-1.5 ${as?.presente === true
                        ? 'bg-green-600 text-white'
                        : 'bg-ink-100 text-ink-700 hover:bg-green-100'}`}>
                      <Check size={14} />
                    </button>
                    <button onClick={() => marcar(a.uid, false)}
                      className={`btn text-sm py-1.5 ${as?.presente === false
                        ? 'bg-red-700 text-white'
                        : 'bg-ink-100 text-ink-700 hover:bg-red-100'}`}>
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="chip bg-ink-100 text-ink-700">
                    {as?.presente === true ? 'Presente' : as?.presente === false ? 'Ausente' : '—'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
