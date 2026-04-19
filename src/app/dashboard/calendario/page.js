'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['L','M','X','J','V','S','D'];

export default function CalendarioPage() {
  const { user, profile } = useAuth();
  const [clases, setClases] = useState([]);
  const [cursor, setCursor] = useState(new Date());

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

  const grid = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const primer = new Date(y, m, 1);
    const ultimo = new Date(y, m + 1, 0);
    const offset = (primer.getDay() + 6) % 7; // lunes = 0
    const dias = [];
    for (let i = 0; i < offset; i++) dias.push(null);
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(y, m, d));
    return dias;
  }, [cursor]);

  // Helper: ¿esta clase tiene sesión este día? (heurística simple basada en el horario)
  const clasesDelDia = (date) => {
    if (!date) return [];
    const dow = ['dom','lun','mar','mié','jue','vie','sáb'][date.getDay()];
    return clases.filter((c) => (c.horario || '').toLowerCase().includes(dow.slice(0, 3)));
  };

  const change = (delta) => {
    const n = new Date(cursor);
    n.setMonth(n.getMonth() + delta);
    setCursor(n);
  };

  return (
    <div>
      <h1 className="font-display text-4xl mb-2">Calendario</h1>
      <p className="text-ink-600 mb-6">Vista mensual de tus clases.</p>

      <div className="card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl capitalize">
            {MESES[cursor.getMonth()]} {cursor.getFullYear()}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => change(-1)} className="btn-ghost"><ChevronLeft size={18} /></button>
            <button onClick={() => setCursor(new Date())} className="btn-outline text-xs">Hoy</button>
            <button onClick={() => change(1)} className="btn-ghost"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-ink-500 mb-2">
          {DIAS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            const cs = clasesDelDia(d);
            const esHoy = d && d.toDateString() === new Date().toDateString();
            return (
              <div key={i} className={`min-h-[80px] p-2 rounded-lg text-left text-xs border ${
                d ? 'border-ink-100 bg-white/60' : 'border-transparent'
              } ${esHoy ? 'ring-2 ring-accent' : ''}`}>
                {d && (
                  <>
                    <div className={`font-medium mb-1 ${esHoy ? 'text-accent-deep' : 'text-ink-700'}`}>
                      {d.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {cs.slice(0, 2).map((c) => (
                        <Link
                          key={c.id}
                          href={`/dashboard/clases/${c.id}`}
                          className="block bg-accent/10 text-accent-deep px-1.5 py-0.5 rounded truncate hover:bg-accent/20"
                        >
                          {c.nombre}
                        </Link>
                      ))}
                      {cs.length > 2 && (
                        <p className="text-ink-500">+{cs.length - 2} más</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-ink-500 mt-3">
        * Las clases se muestran en los días que coinciden con su horario registrado (lun, mar, mié…).
      </p>
    </div>
  );
}
