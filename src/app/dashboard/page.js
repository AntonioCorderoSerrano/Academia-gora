'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { BookOpen, Users, Plus, AlertCircle, Wallet, Bell, X } from 'lucide-react';

export default function DashboardHome() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const [stats, setStats] = useState({ clases: 0, alumnos: 0 });
  const [misClases, setMisClases] = useState([]);
  const [notifs, setNotifs] = useState([]);

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
        relevant = all.filter((c) =>
          c.alumnos && Object.values(c.alumnos).some((a) => a.tutorUid === user.uid)
        );
      }
      setMisClases(relevant.slice(0, 4));

      const alumnosSet = new Set();
      relevant.forEach((c) => {
        if (c.alumnos) Object.keys(c.alumnos).forEach((uid) => alumnosSet.add(uid));
      });
      setStats({ clases: relevant.length, alumnos: alumnosSet.size });
    });

    const unsubNotifs = onValue(ref(db, `notificaciones/${user.uid}`), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, n]) => ({ id, ...n }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5);
      setNotifs(list);
    });

    return () => { unsubClases(); unsubNotifs(); };
  }, [user, profile]);

  const marcarLeida = (id) => remove(ref(db, `notificaciones/${user.uid}/${id}`));

  const necesitaSuscripcion = !profile.sinCobro
    && profile.role !== ROLES.ADMIN
    && profile.role !== ROLES.MAESTRO
    && !profile.suscripcionActiva;

  const esTutor = profile.role === ROLES.TUTOR;

  const labelClases = esTutor ? t('home.stat_clases_tutor')
    : profile.role === ROLES.ALUMNO ? t('home.mis_clases')
    : t('home.stat_clases');

  const resumen = esTutor ? t('home.resumen_tutor') : t('home.resumen');

  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent-deep capitalize">
            {profile.role === 'maestro' ? 'docente' : profile.role}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl mt-1 break-words">
            {t('home.hola')} <em className="italic text-accent-deep">{profile.nombre.split(' ')[0]}</em>
          </h1>
          <p className="text-ink-600 mt-2 text-sm sm:text-base">{resumen}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.role === ROLES.MAESTRO && (
            <Link href="/dashboard/clases/nueva" className="btn-primary">
              <Plus size={16} /> {t('home.nueva_clase')}
            </Link>
          )}
          {necesitaSuscripcion && (
            <Link href="/dashboard/pagos" className="btn-accent">{t('home.activar_sub')}</Link>
          )}
        </div>
      </header>

      {/* Notificaciones */}
      {notifs.length > 0 && (
        <div className="card p-4 mb-6 animate-fade-up border-accent/30 bg-accent/5">
          <h2 className="flex items-center gap-2 font-medium mb-3 text-sm">
            <Bell size={16} className="text-accent-deep" /> Novedades
          </h2>
          <div className="space-y-2">
            {notifs.map((n) => (
              <div key={n.id} className="flex items-start gap-2 bg-white rounded-lg p-3 text-sm">
                <div className="flex-1 min-w-0">
                  {n.tipo === 'hijo_inscrito' && (
                    <p>
                      <span className="font-medium">{n.hijoNombre}</span> {t('tutor.hijo_inscrito_en')}{' '}
                      <Link href={`/dashboard/clases/${n.claseId}`} className="text-accent-deep hover:underline">
                        {n.claseNombre}
                      </Link>
                    </p>
                  )}
                  {n.tipo === 'inscrito_por_tutor' && (
                    <p>
                      <span className="font-medium">{n.tutorNombre}</span> te ha inscrito en{' '}
                      <Link href={`/dashboard/clases/${n.claseId}`} className="text-accent-deep hover:underline">
                        {n.claseNombre}
                      </Link>
                    </p>
                  )}
                  <p className="text-xs text-ink-500 mt-0.5">
                    {new Date(n.createdAt).toLocaleString('es-ES')}
                  </p>
                </div>
                <button onClick={() => marcarLeida(n.id)} className="text-ink-400 hover:text-ink-700"
                  aria-label="Cerrar">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
          <StatCard icon={BookOpen} label={labelClases} value={stats.clases} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
          <StatCard icon={Users}
            label={esTutor ? 'Hijos/as con inscripciones' : t('home.stat_alumnos')}
            value={stats.alumnos} />
        </div>
        {profile.role !== ROLES.ADMIN && profile.role !== ROLES.MAESTRO && (
          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            <StatCard icon={Wallet} label={t('home.stat_pago')}
              value={profile.sinCobro ? t('home.exento')
                : profile.suscripcionActiva ? t('home.al_dia') : t('home.pendiente')}
              warn={necesitaSuscripcion} />
          </div>
        )}
      </div>

      <section className="mt-8 sm:mt-10">
        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <h2 className="font-display text-xl sm:text-2xl">
            {esTutor ? t('home.clases_hijos')
              : profile.role === ROLES.ALUMNO || profile.role === ROLES.MAESTRO ? t('home.mis_clases')
              : t('home.clases_recientes')}
          </h2>
          <Link href="/dashboard/clases" className="text-sm text-accent-deep hover:underline">
            {t('home.ver_todas')} →
          </Link>
        </div>

        {misClases.length === 0 ? (
          <div className="card p-8 text-center text-ink-500 text-sm animate-fade-up">
            {esTutor ? t('home.sin_clases_tutor')
              : profile.role === ROLES.ALUMNO ? t('home.sin_clases_alumno')
              : profile.role === ROLES.MAESTRO ? t('home.sin_clases_maestro')
              : 'Aún no hay clases.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {misClases.map((c, i) => (
              <Link key={c.id} href={`/dashboard/clases/${c.id}`}
                className="card p-4 sm:p-5 animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}>
                <p className="text-xs uppercase tracking-wider text-accent-deep">{c.nivel || 'Clase'}</p>
                <h3 className="font-display text-lg sm:text-xl mt-1 break-words">{c.nombre}</h3>
                <p className="text-sm text-ink-600 mt-2 line-clamp-2">{c.descripcion}</p>
                <div className="mt-3 pt-3 border-t border-ink-100 text-xs text-ink-500">
                  {c.alumnos ? Object.keys(c.alumnos).length : 0} {t('clases.alumnos_inscritos')}
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
    <div className="card p-4 sm:p-5 h-full">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-ink-600">{label}</p>
        <Icon size={18} className="text-accent-deep shrink-0" strokeWidth={1.5} />
      </div>
      <p className={`mt-2 font-display text-2xl sm:text-3xl ${warn ? 'text-red-700' : ''}`}>
        {value}
        {warn && <AlertCircle className="inline-block ml-2 text-red-700" size={18} />}
      </p>
    </div>
  );
}
