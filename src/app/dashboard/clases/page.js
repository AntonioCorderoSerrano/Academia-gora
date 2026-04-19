'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { Plus, Search } from 'lucide-react';

export default function ClasesPage() {
  const { user, profile, hasRole } = useAuth();
  const [clases, setClases] = useState([]);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    if (!user || !profile) return;
    const unsub = onValue(ref(db, 'clases'), (snap) => {
      const data = snap.val() || {};
      const all = Object.entries(data).map(([id, c]) => ({ id, ...c }));

      let list = [];
      if (profile.role === ROLES.ADMIN) {
        list = all;
      } else if (profile.role === ROLES.MAESTRO) {
        list = all.filter((c) => c.maestroId === user.uid);
      } else if (profile.role === ROLES.ALUMNO) {
        // Solo clases donde el alumno está inscrito
        list = all.filter((c) => c.alumnos && c.alumnos[user.uid]);
      } else if (profile.role === ROLES.TUTOR) {
        // Tutor ve clases de sus hijos
        const hijos = profile.hijos ? Object.keys(profile.hijos) : [];
        list = all.filter((c) =>
          c.alumnos && hijos.some((h) => c.alumnos[h])
        );
      }
      setClases(list);
    });
    return () => unsub();
  }, [user, profile]);

  const filtered = clases.filter((c) =>
    c.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    c.nivel?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl">Mis clases</h1>
          <p className="text-ink-600">
            {profile.role === ROLES.ALUMNO && 'Clases en las que estás inscrito.'}
            {profile.role === ROLES.MAESTRO && 'Clases que impartes.'}
            {profile.role === ROLES.ADMIN && 'Todas las clases de la academia.'}
            {profile.role === ROLES.TUTOR && 'Clases de las personas a tu cargo.'}
          </p>
        </div>

        {hasRole(ROLES.ADMIN, ROLES.MAESTRO) && (
          <Link href="/dashboard/clases/nueva" className="btn-primary">
            <Plus size={16} /> Nueva clase
          </Link>
        )}
      </header>

      <div className="card p-2 mb-6 flex items-center">
        <Search size={18} className="ml-3 text-ink-400" />
        <input placeholder="Buscar por nombre o nivel…"
          value={filtro} onChange={(e) => setFiltro(e.target.value)}
          className="bg-transparent px-3 py-2 flex-1 outline-none text-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">
          {profile.role === ROLES.ALUMNO
            ? 'Aún no estás inscrito en ninguna clase. Pide a tu maestro que te añada.'
            : 'No hay clases que mostrar.'}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link key={c.id} href={`/dashboard/clases/${c.id}`}
              className="card p-5 hover:shadow-elegant transition group">
              <div className="flex items-start justify-between">
                <span className="chip bg-accent/10 text-accent-deep">{c.nivel || 'Clase'}</span>
                {c.precio > 0 && c.tipoCobro === 'unico' && (
                  <span className="font-display text-ink-700">{c.precio}€</span>
                )}
              </div>
              <h3 className="font-display text-xl mt-3 group-hover:text-accent-deep transition">
                {c.nombre}
              </h3>
              <p className="text-sm text-ink-600 mt-2 line-clamp-2">{c.descripcion}</p>
              <div className="mt-4 pt-4 border-t border-ink-100 flex justify-between text-xs text-ink-500">
                <span>{c.alumnos ? Object.keys(c.alumnos).length : 0} alumnos</span>
                <span>{c.horario || 'Sin horario'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
