'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';

export default function AsistenciaPage() {
  const { user, profile } = useAuth();
  const [clases, setClases] = useState([]);

  useEffect(() => {
    const unsub = onValue(ref(db, 'clases'), (snap) => {
      const data = snap.val() || {};
      const all = Object.entries(data).map(([id, c]) => ({ id, ...c }));
      let list = all;
      if (profile.role === ROLES.MAESTRO)
        list = all.filter((c) => c.maestroId === user.uid);
      else if (profile.role === ROLES.ALUMNO)
        list = all.filter((c) => c.alumnos && c.alumnos[user.uid]);
      setClases(list);
    });
    return () => unsub();
  }, [user, profile]);

  // Para alumno: calcular resumen propio
  const resumenAlumno = (clase) => {
    if (!clase.asistencia) return { presente: 0, ausente: 0, total: 0 };
    let presente = 0, ausente = 0;
    Object.values(clase.asistencia).forEach((dia) => {
      const mio = dia[user.uid];
      if (mio?.estado === 'presente') presente++;
      else if (mio?.estado === 'ausente') ausente++;
    });
    return { presente, ausente, total: presente + ausente };
  };

  return (
    <div>
      <h1 className="font-display text-4xl mb-2">Asistencia</h1>
      <p className="text-ink-600 mb-8">
        {profile.role === ROLES.ALUMNO ? 'Tu historial por clase' : 'Gestiona la asistencia de cada clase'}
      </p>

      {clases.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">No hay clases.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {clases.map((c) => {
            const r = profile.role === ROLES.ALUMNO ? resumenAlumno(c) : null;
            return (
              <Link
                key={c.id}
                href={`/dashboard/clases/${c.id}`}
                className="card p-5 hover:shadow-elegant transition"
              >
                <p className="text-xs uppercase tracking-wider text-accent-deep">{c.nivel}</p>
                <h3 className="font-display text-xl mt-1">{c.nombre}</h3>
                {r ? (
                  <div className="mt-4 flex gap-4 text-sm">
                    <span className="text-green-700">{r.presente} presente</span>
                    <span className="text-red-700">{r.ausente} ausente</span>
                    {r.total > 0 && (
                      <span className="text-ink-500">
                        {Math.round((r.presente / r.total) * 100)}%
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-500">
                    Ir a la pestaña asistencia en la clase →
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
