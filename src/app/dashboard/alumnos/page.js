'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { UserCircle, Mail, BookOpen } from 'lucide-react';

function etiqueta(role) {
  if (role === 'maestro') return 'docente';
  return role;
}

export default function AlumnosPage() {
  const { user, profile, hasRole } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [clases, setClases] = useState([]);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    const unsubU = onValue(ref(db, 'usuarios'), (snap) => {
      const data = snap.val() || {};
      setUsuarios(Object.entries(data).map(([uid, u]) => ({ uid, ...u })));
    });
    const unsubC = onValue(ref(db, 'clases'), (snap) => {
      const data = snap.val() || {};
      setClases(Object.entries(data).map(([id, c]) => ({ id, ...c })));
    });
    return () => { unsubU(); unsubC(); };
  }, []);

  if (!hasRole(ROLES.ADMIN, ROLES.MAESTRO)) {
    return <div className="card p-8 sm:p-10 text-center text-ink-500">Sin permisos.</div>;
  }

  // DOCENTE: solo ve alumnos de sus clases + sus tutores asociados.
  // ADMIN: ve todos.
  const esAdmin = hasRole(ROLES.ADMIN);

  const { usuariosVisibles, clasesPorUsuario } = useMemo(() => {
    if (esAdmin) {
      // Admin ve todos; para cada uno, las clases donde esté inscrito
      const map = {};
      clases.forEach((c) => {
        if (!c.alumnos) return;
        Object.entries(c.alumnos).forEach(([alumnoUid, a]) => {
          (map[alumnoUid] ||= []).push(c);
          if (a.tutorUid) (map[a.tutorUid] ||= []).push(c);
        });
      });
      return { usuariosVisibles: usuarios, clasesPorUsuario: map };
    }

    // Docente: solo alumnos de sus clases + tutores de esos alumnos
    const misClases = clases.filter((c) => c.maestroId === user.uid);
    const uidsVisibles = new Set();
    const map = {};

    misClases.forEach((c) => {
      if (!c.alumnos) return;
      Object.entries(c.alumnos).forEach(([alumnoUid, a]) => {
        uidsVisibles.add(alumnoUid);
        (map[alumnoUid] ||= []).push(c);
        if (a.tutorUid) {
          uidsVisibles.add(a.tutorUid);
          (map[a.tutorUid] ||= []).push(c);
        }
      });
    });

    return {
      usuariosVisibles: usuarios.filter((u) => uidsVisibles.has(u.uid)),
      clasesPorUsuario: map,
    };
  }, [usuarios, clases, esAdmin, user.uid]);

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

  const filtrosAdmin = [
    { v: 'todos', label: 'todos' },
    { v: 'alumno', label: 'alumnos' },
    { v: 'maestro', label: 'docentes' },
    { v: 'tutor', label: 'tutores' },
    { v: 'admin', label: 'admins' },
  ];
  const filtrosDocente = [
    { v: 'todos', label: 'todos' },
    { v: 'alumno', label: 'alumnos' },
    { v: 'tutor', label: 'tutores' },
  ];
  const filtros = esAdmin ? filtrosAdmin : filtrosDocente;

  const list = filtro === 'todos'
    ? usuariosVisibles
    : usuariosVisibles.filter((u) => u.role === filtro);

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl sm:text-4xl mb-1 sm:mb-2">
        {esAdmin ? 'Usuarios' : 'Mis alumnos'}
      </h1>
      <p className="text-ink-600 mb-5 sm:mb-6 text-sm sm:text-base">
        {esAdmin
          ? 'Gestiona todos los usuarios de la plataforma.'
          : 'Alumnos inscritos en tus clases y sus tutores.'}
      </p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {filtros.map((f) => (
          <button key={f.v} onClick={() => setFiltro(f.v)}
            className={`chip capitalize cursor-pointer transition-all ${
              filtro === f.v
                ? 'bg-ink-900 text-ink-50 scale-[1.03]'
                : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
          {esAdmin ? 'No hay usuarios.' : 'Aún no tienes alumnos en tus clases.'}
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {list.map((u, i) => {
            const relacionadas = clasesPorUsuario[u.uid] || [];
            return (
              <div key={u.uid}
                className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <UserCircle size={20} className="text-accent-deep" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{u.nombre}</p>
                    <p className="text-xs text-ink-500 truncate flex items-center gap-1">
                      <Mail size={11} className="shrink-0" /> {u.email}
                    </p>
                    {!esAdmin && relacionadas.length > 0 && (
                      <p className="text-[11px] text-accent-deep mt-1 flex items-center gap-1">
                        <BookOpen size={11} />
                        {relacionadas.map((c) => c.nombre).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {esAdmin ? (
                    <>
                      <select value={u.role}
                        onChange={(e) => cambiarRol(u.uid, e.target.value)}
                        className="field py-1 text-sm flex-1 sm:flex-initial sm:max-w-[140px]">
                        <option value="alumno">Alumno</option>
                        <option value="maestro">Docente</option>
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
                    <span className="chip bg-accent/10 text-accent-deep capitalize">{etiqueta(u.role)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
