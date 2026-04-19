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
    if (!user || !profile) return;
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
      <h1 className="font-display text-3xl sm:text-4xl mb-1 sm:mb-2">Asistencia</h1>
      <p className="text-ink-600 mb-6 sm:mb-8 text-sm sm:text-base">
        {profile.role === ROLES.ALUMNO
          ? 'Toca una clase para revisar tu historial y confirmar asistencia.'
          : 'Toca una clase para registrar la asistencia de tus alumnos.'}
      </p>

      {clases.length === 0 ? (
        <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
          No hay clases.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {clases.map((c) => {
            const r = profile.role === ROLES.ALUMNO ? resumenAlumno(c) : null;
            return (
              <Link key={c.id} href={`/dashboard/clases/${c.id}?tab=asistencia`}
                className="card p-4 sm:p-5 hover:shadow-elegant transition">
                <p className="text-xs uppercase tracking-wider text-accent-deep">{c.nivel}</p>
                <h3 className="font-display text-lg sm:text-xl mt-1 break-words">{c.nombre}</h3>
                {r ? (
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="text-green-700">{r.presente} presente</span>
                    <span className="text-red-700">{r.ausente} ausente</span>
                    {r.total > 0 && (
                      <span className="text-ink-500">
                        {Math.round((r.presente / r.total) * 100)}%
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-500">Registrar asistencia →</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
