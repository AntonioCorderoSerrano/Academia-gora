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
  const [diaSel, setDiaSel] = useState(null); // para vista móvil

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

  const grid = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const primer = new Date(y, m, 1);
    const ultimo = new Date(y, m + 1, 0);
    const offset = (primer.getDay() + 6) % 7;
    const dias = [];
    for (let i = 0; i < offset; i++) dias.push(null);
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(y, m, d));
    return dias;
  }, [cursor]);

  const clasesDelDia = (date) => {
    if (!date) return [];
    const dow = ['dom','lun','mar','mié','jue','vie','sáb'][date.getDay()];
    return clases.filter((c) => (c.horario || '').toLowerCase().includes(dow.slice(0, 3)));
  };

  const change = (delta) => {
    const n = new Date(cursor);
    n.setMonth(n.getMonth() + delta);
    setCursor(n);
    setDiaSel(null);
  };

  return (
    <div>
      <h1 className="font-display text-3xl sm:text-4xl mb-1 sm:mb-2">Calendario</h1>
      <p className="text-ink-600 mb-5 sm:mb-6 text-sm sm:text-base">Vista mensual de tus clases.</p>

      <div className="card p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg sm:text-2xl capitalize">
            {MESES[cursor.getMonth()]} <span className="text-ink-500 font-normal">{cursor.getFullYear()}</span>
          </h2>
          <div className="flex gap-1">
            <button onClick={() => change(-1)} className="btn-ghost p-2" aria-label="Mes anterior">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => { setCursor(new Date()); setDiaSel(null); }}
              className="btn-outline text-xs px-3 py-2">Hoy</button>
            <button onClick={() => change(1)} className="btn-ghost p-2" aria-label="Mes siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs text-ink-500 mb-2">
          {DIAS.map((d) => <div key={d} className="py-1 sm:py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {grid.map((d, i) => {
            const cs = d ? clasesDelDia(d) : [];
            const esHoy = d && d.toDateString() === new Date().toDateString();
            const seleccionado = diaSel && d && d.toDateString() === diaSel.toDateString();
            return (
              <button
                key={i}
                type="button"
                disabled={!d}
                onClick={() => d && setDiaSel(d)}
                className={`min-h-[44px] sm:min-h-[80px] p-1 sm:p-2 rounded-lg text-left text-[10px] sm:text-xs border transition ${
                  d ? 'border-ink-100 bg-white/60 hover:bg-white cursor-pointer' : 'border-transparent'
                } ${esHoy ? 'ring-2 ring-accent' : ''} ${seleccionado ? 'bg-accent/10 border-accent' : ''}`}
              >
                {d && (
                  <>
                    <div className={`font-medium mb-0.5 sm:mb-1 text-xs ${esHoy ? 'text-accent-deep' : 'text-ink-700'}`}>
                      {d.getDate()}
                    </div>
                    {/* Desktop: muestra nombre */}
                    <div className="hidden sm:block space-y-0.5">
                      {cs.slice(0, 2).map((c) => (
                        <div key={c.id}
                          className="bg-accent/10 text-accent-deep px-1.5 py-0.5 rounded truncate">
                          {c.nombre}
                        </div>
                      ))}
                      {cs.length > 2 && <p className="text-ink-500">+{cs.length - 2}</p>}
                    </div>
                    {/* Móvil: puntitos */}
                    <div className="sm:hidden flex gap-0.5 justify-center">
                      {cs.slice(0, 3).map((c) => (
                        <span key={c.id} className="h-1 w-1 rounded-full bg-accent-deep" />
                      ))}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista del día seleccionado (mayormente útil en móvil) */}
      {diaSel && (
        <div className="mt-4 sm:mt-6">
          <h3 className="font-display text-lg mb-3">
            {diaSel.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          {clasesDelDia(diaSel).length === 0 ? (
            <div className="card p-6 text-center text-ink-500 text-sm">Sin clases este día.</div>
          ) : (
            <div className="card divide-y divide-ink-100">
              {clasesDelDia(diaSel).map((c) => (
                <Link key={c.id} href={`/dashboard/clases/${c.id}`}
                  className="p-4 flex items-center justify-between hover:bg-ink-50/60 transition">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.nombre}</p>
                    <p className="text-xs text-ink-500">{c.horario}</p>
                  </div>
                  <span className="text-ink-400 shrink-0 ml-2">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-ink-500 mt-3">
        * Las clases aparecen en días que coinciden con su horario registrado.
      </p>
    </div>
  );
}
