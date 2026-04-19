'use client';

import { useState } from 'react';
import { ref, remove, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { UserMinus, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TabAlumnos({ clase, puedeGestionar }) {
  const alumnos = clase.alumnos
    ? Object.entries(clase.alumnos).map(([uid, a]) => ({ uid, ...a }))
    : [];

  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

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
          if (!u.approved) return false; // solo aprobados
          if (clase.alumnos?.[uid]) return false; // no ya inscritos
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

  const agregar = async (u) => {
    await update(ref(db, `clases/${clase.id}/alumnos/${u.uid}`), {
      nombre: u.nombre,
      email: u.email,
      inscritoEn: Date.now(),
      agregadoManual: true,
    });
    setTermino('');
    setResultados([]);
    toast.success(`${u.nombre} agregado/a`);
  };

  const quitar = async (uid) => {
    if (!confirm('¿Quitar a este alumno?')) return;
    await remove(ref(db, `clases/${clase.id}/alumnos/${uid}`));
    toast.success('Alumno retirado');
  };

  return (
    <div>
      {puedeGestionar && (
        <div className="card p-5 mb-6">
          <h3 className="font-display text-lg mb-1">Añadir alumno</h3>
          <p className="text-sm text-ink-500 mb-3">Busca por nombre o correo electrónico.</p>
          <input
            placeholder="Escribe al menos 2 letras…"
            className="field"
            value={termino}
            onChange={(e) => buscar(e.target.value)}
          />
          {buscando && <p className="text-xs text-ink-500 mt-2">Buscando…</p>}
          {resultados.length > 0 && (
            <ul className="mt-3 space-y-2">
              {resultados.map((r) => (
                <li key={r.uid} className="flex items-center justify-between p-2 rounded hover:bg-ink-50">
                  <div>
                    <p className="text-sm font-medium">{r.nombre}</p>
                    <p className="text-xs text-ink-500">{r.email}</p>
                  </div>
                  <button onClick={() => agregar(r)} className="btn-primary text-sm py-1.5">
                    Añadir
                  </button>
                </li>
              ))}
            </ul>
          )}
          {termino.length >= 2 && !buscando && resultados.length === 0 && (
            <p className="text-xs text-ink-500 mt-2">Sin resultados.</p>
          )}
        </div>
      )}

      {alumnos.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">Aún no hay alumnos inscritos.</div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {alumnos.map((a) => (
            <div key={a.uid} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{a.nombre}</p>
                <p className="text-sm text-ink-500 flex items-center gap-1">
                  <Mail size={12} /> {a.email}
                </p>
              </div>
              {puedeGestionar && (
                <button onClick={() => quitar(a.uid)} className="btn-ghost text-red-700">
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
