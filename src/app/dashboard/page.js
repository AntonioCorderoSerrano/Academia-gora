'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { BookOpen, Users, ShieldCheck, Wallet, Plus, AlertCircle } from 'lucide-react';

function etiquetaRol(role) {
  if (role === ROLES.MAESTRO) return 'docente';
  if (role === ROLES.ALUMNO) return 'alumno/a';
  if (role === ROLES.TUTOR) return 'tutor';
  if (role === ROLES.ADMIN) return 'admin';
  return role;
}

export default function DashboardHome() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ clases: 0, alumnos: 0, pendientesAprobar: 0 });
  const [misClases, setMisClases] = useState([]);

  useEffect(() => {
    if (!user || !profile) return;

    const unsubClases = onValue(ref(db, 'clases'), (snap) => {
      const data = snap.val() || {};
      const all = Object.entries(data).map(([id, c]) => ({ id, ...c }));

      let relevant = [];
      if (profile.role === ROLES.ADMIN) relevant = all;
      else if (profile.role === ROLES.MAESTRO)
        relevant = all.filter((c) => c.maestroId === user.uid);
      else if (profile.role === ROLES.ALUMNO)
        relevant = all.filter((c) => c.alumnos && c.alumnos[user.uid]);
      else if (profile.role === ROLES.TUTOR) {
        const hijos = profile.hijos ? Object.keys(profile.hijos) : [];
        relevant = all.filter((c) => c.alumnos && hijos.some((h) => c.alumnos[h]));
      }

      setMisClases(relevant.slice(0, 4));

      // Alumnos únicos (para docentes/admin: total real)
      const alumnosSet = new Set();
      relevant.forEach((c) => {
        if (c.alumnos) Object.keys(c.alumnos).forEach((uid) => alumnosSet.add(uid));
      });

      setStats((s) => ({
        ...s,
        clases: relevant.length,
        alumnos: alumnosSet.size,
      }));
    });

    let unsubUsers = () => {};
    if (profile.role === ROLES.ADMIN) {
      unsubUsers = onValue(ref(db, 'usuarios'), (snap) => {
        const data = snap.val() || {};
        const pendientes = Object.values(data).filter(
          (u) => !u.approved && u.role !== 'admin'
        ).length;
        setStats((s) => ({ ...s, pendientesAprobar: pendientes }));
      });
    }

    return () => { unsubClases(); unsubUsers(); };
  }, [user, profile]);

  // ¿Debe mostrar aviso de suscripción como CTA?
  const necesitaSuscripcion =
    !profile.sinCobro &&
    profile.role !== ROLES.ADMIN &&
    profile.role !== ROLES.MAESTRO &&
    !profile.suscripcionActiva;

  // Labels por rol
  const labelClases =
    profile.role === ROLES.MAESTRO ? 'Mis clases' :
    profile.role === ROLES.ALUMNO ? 'Clases inscritas' :
    profile.role === ROLES.TUTOR ? 'Clases de tus hijos' :
    'Clases activas';

  const labelAlumnos =
    profile.role === ROLES.MAESTRO ? 'Alumnos totales' :
    profile.role === ROLES.ADMIN ? 'Alumnos en la academia' :
    profile.role === ROLES.ALUMNO ? 'Compañeros' :
    'Alumnos';

  // Construimos las tarjetas dinámicamente según rol
  const cards = [
    { icon: BookOpen, label: labelClases, value: stats.clases, key: 'clases' },
  ];

  if (profile.role === ROLES.ADMIN) {
    cards.push({
      icon: ShieldCheck,
      label: 'Pendientes de aprobar',
      value: stats.pendientesAprobar,
      warn: stats.pendientesAprobar > 0,
      key: 'aprobar',
    });
    cards.push({
      icon: Users,
      label: labelAlumnos,
      value: stats.alumnos,
      key: 'alumnos',
    });
  } else if (profile.role === ROLES.MAESTRO) {
    // Para docentes: SIN tarjeta de pago, mostramos clases + alumnos totales
    cards.push({
      icon: Users,
      label: labelAlumnos,
      value: stats.alumnos,
      key: 'alumnos',
    });
  } else {
    // Alumno / Tutor: muestran clases + compañeros + pago
    cards.push({
      icon: Users,
      label: labelAlumnos,
      value: stats.alumnos,
      key: 'alumnos',
    });
    cards.push({
      icon: Wallet,
      label: 'Estado pago',
      value: profile.sinCobro ? 'Exento' :
             profile.suscripcionActiva ? 'Al día' : 'Pendiente',
      warn: necesitaSuscripcion,
      key: 'pago',
    });
  }

  // Grid dinámica: 1 tarjeta → 1 col, 2 → 2 cols, 3 → 3 cols (en sm+)
  const gridCols =
    cards.length === 1 ? 'grid-cols-1' :
    cards.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
    'grid-cols-1 sm:grid-cols-3';

  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="text-xs sm:text-sm uppercase tracking-widest text-accent-deep">
            {etiquetaRol(profile.role)}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl mt-1 break-words">
            Hola, <em className="italic text-accent-deep">{profile.nombre.split(' ')[0]}</em>
          </h1>
          <p className="text-ink-600 mt-2 text-sm sm:text-base">
            Este es el resumen de tu actividad.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.role === ROLES.MAESTRO && (
            <Link href="/dashboard/clases/nueva" className="btn-primary">
              <Plus size={16} /> Nueva clase
            </Link>
          )}
          {necesitaSuscripcion && (
            <Link href="/dashboard/pagos" className="btn-accent">Activar suscripción</Link>
          )}
          {profile.role === ROLES.ADMIN && stats.pendientesAprobar > 0 && (
            <Link href="/dashboard/aprobaciones" className="btn-accent">
              <ShieldCheck size={16} />
              {stats.pendientesAprobar} pendiente{stats.pendientesAprobar !== 1 ? 's' : ''}
            </Link>
          )}
        </div>
      </header>

      <div className={`grid ${gridCols} gap-3 sm:gap-4`}>
        {cards.map((c) => (
          <StatCard key={c.key} icon={c.icon} label={c.label} value={c.value} warn={c.warn} />
        ))}
      </div>

      <section className="mt-8 sm:mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl sm:text-2xl">
            {profile.role === ROLES.MAESTRO || profile.role === ROLES.ALUMNO
              ? 'Tus clases' : 'Clases recientes'}
          </h2>
          <Link href="/dashboard/clases" className="text-sm text-accent-deep hover:underline">
            Ver todas →
          </Link>
        </div>

        {misClases.length === 0 ? (
          <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
            {profile.role === ROLES.ALUMNO ? 'Aún no estás inscrito en ninguna clase.'
              : profile.role === ROLES.MAESTRO ? 'Aún no has creado ninguna clase.'
              : 'Aún no hay clases.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {misClases.map((c) => (
              <Link key={c.id} href={`/dashboard/clases/${c.id}`}
                className="card p-4 sm:p-5 hover:shadow-elegant transition">
                <p className="text-xs uppercase tracking-wider text-accent-deep">{c.nivel || 'Clase'}</p>
                <h3 className="font-display text-lg sm:text-xl mt-1 break-words">{c.nombre}</h3>
                <p className="text-sm text-ink-600 mt-2 line-clamp-2">{c.descripcion}</p>
                <div className="mt-3 sm:mt-4 flex items-center gap-3 text-xs text-ink-500">
                  <span>{c.alumnos ? Object.keys(c.alumnos).length : 0} alumnos</span>
                  {c.precio > 0 && c.tipoCobro === 'unico' && <span>· {c.precio}€</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, warn }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-ink-600">{label}</p>
        <Icon size={18} className="text-accent-deep shrink-0" strokeWidth={1.5} />
      </div>
      <p className={`mt-2 sm:mt-3 font-display text-2xl sm:text-3xl ${warn ? 'text-red-700' : ''}`}>
        {value}
        {warn && <AlertCircle className="inline-block ml-2 text-red-700" size={18} />}
      </p>
    </div>
  );
}
