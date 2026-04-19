'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { MessageSquare } from 'lucide-react';

export default function MensajesPage() {
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

  return (
    <div>
      <h1 className="font-display text-3xl sm:text-4xl mb-1 sm:mb-2">Mensajes</h1>
      <p className="text-ink-600 mb-6 sm:mb-8 text-sm sm:text-base">
        Selecciona una clase para abrir su chat.
      </p>

      {clases.length === 0 ? (
        <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
          No hay clases con chat disponibles.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {clases.map((c) => (
            <Link key={c.id} href={`/dashboard/clases/${c.id}?tab=chat`}
              className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-ink-50/60 transition">
              <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-accent-deep" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.nombre}</p>
                <p className="text-xs text-ink-500 truncate">
                  {c.alumnos ? Object.keys(c.alumnos).length : 0} participantes · {c.maestroNombre}
                </p>
              </div>
              <span className="text-ink-400 shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
