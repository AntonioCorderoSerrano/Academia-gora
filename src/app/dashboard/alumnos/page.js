'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function AlumnosPage() {
  const { hasRole } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    const unsub = onValue(ref(db, 'usuarios'), (snap) => {
      const data = snap.val() || {};
      setUsuarios(Object.entries(data).map(([uid, u]) => ({ uid, ...u })));
    });
    return () => unsub();
  }, []);

  if (!hasRole(ROLES.ADMIN, ROLES.MAESTRO)) {
    return <div className="card p-10 text-center text-ink-500">Sin permisos.</div>;
  }

  const cambiarRol = async (uid, nuevoRol) => {
    await update(ref(db, `usuarios/${uid}`), {
      role: nuevoRol,
      sinCobro: nuevoRol === 'maestro' || nuevoRol === 'admin',
    });
    toast.success('Rol actualizado');
  };

  const toggleSinCobro = async (uid, valor) => {
    await update(ref(db, `usuarios/${uid}`), { sinCobro: valor });
    toast.success(valor ? 'Exento de pago' : 'Sujeto a pago');
  };

  const list = filtro === 'todos' ? usuarios : usuarios.filter((u) => u.role === filtro);

  return (
    <div>
      <h1 className="font-display text-4xl mb-2">Usuarios</h1>
      <p className="text-ink-600 mb-6">Gestiona los usuarios de la plataforma.</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['todos', 'alumno', 'maestro', 'tutor', 'admin'].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`chip capitalize cursor-pointer ${
              filtro === f ? 'bg-ink-900 text-ink-50' : 'bg-ink-100 text-ink-700'
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-ink-100">
        {list.map((u) => (
          <div key={u.uid} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="font-medium">
                {u.nombre}
                {!u.approved && <span className="chip bg-amber-100 text-amber-800 ml-2 text-[10px]">pendiente</span>}
              </p>
              <p className="text-xs text-ink-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {hasRole(ROLES.ADMIN) ? (
                <>
                  <select value={u.role}
                    onChange={(e) => cambiarRol(u.uid, e.target.value)}
                    className="field py-1 text-sm max-w-[140px]">
                    <option value="alumno">Alumno</option>
                    <option value="maestro">Maestro</option>
                    <option value="tutor">Tutor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-ink-600 cursor-pointer">
                    <input type="checkbox" checked={!!u.sinCobro}
                      onChange={(e) => toggleSinCobro(u.uid, e.target.checked)} />
                    Exento
                  </label>
                </>
              ) : (
                <span className="chip bg-accent/10 text-accent-deep capitalize">{u.role}</span>
              )}
              <span className={`chip ${u.suscripcionActiva || u.sinCobro ? 'bg-green-100 text-green-800' : 'bg-ink-100 text-ink-600'}`}>
                {u.sinCobro ? 'Exento' : u.suscripcionActiva ? 'Al día' : 'Sin suscripción'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
