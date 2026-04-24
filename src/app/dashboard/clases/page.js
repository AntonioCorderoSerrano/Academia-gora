'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { TIPO_CLASE, LABEL_TIPO, contarInscripciones } from '@/lib/claseHelpers';
import { Plus, Search, GraduationCap, User, Sun } from 'lucide-react';

const ICON_TIPO = {
  [TIPO_CLASE.REGULAR]: GraduationCap,
  [TIPO_CLASE.PRIVADA]: User,
  [TIPO_CLASE.CAMPAMENTO]: Sun,
};

export default function ClasesPage() {
  const { user, profile, hasRole } = useAuth();
  const [clases, setClases] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [tabActivo, setTabActivo] = useState('mias');

  useEffect(() => {
    if (!user || !profile) return;
    const unsub = onValue(ref(db, 'clases'), (snap) => {
      const data = snap.val() || {};
      setClases(Object.entries(data).map(([id, c]) => ({ id, ...c })));
    });
    return () => unsub();
  }, [user, profile]);

  const esTutorOAlumno = profile.role === ROLES.ALUMNO || profile.role === ROLES.TUTOR;

  const misClases = clases.filter((c) => {
    if (profile.role === ROLES.ADMIN) return true;
    if (profile.role === ROLES.MAESTRO) return c.maestroId === user.uid;
    if (profile.role === ROLES.ALUMNO) return c.alumnos && c.alumnos[user.uid];
    if (profile.role === ROLES.TUTOR) {
      if (!c.alumnos) return false;
      return Object.values(c.alumnos).some((a) => a.tutorUid === user.uid);
    }
    return false;
  });

  const disponibles = esTutorOAlumno
    ? clases.filter((c) => !misClases.some((m) => m.id === c.id))
    : [];

  const aplicarFiltro = (arr) =>
    arr.filter((c) =>
      c.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
      c.nivel?.toLowerCase().includes(filtro.toLowerCase()) ||
      LABEL_TIPO[c.tipo]?.toLowerCase().includes(filtro.toLowerCase())
    );

  const mostrar = tabActivo === 'mias' ? aplicarFiltro(misClases) : aplicarFiltro(disponibles);

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Clases</h1>
          <p className="text-ink-600 text-sm sm:text-base">
            {profile.role === ROLES.ALUMNO && 'Explora todas las clases e inscríbete a las que quieras.'}
            {profile.role === ROLES.MAESTRO && 'Clases que impartes.'}
            {profile.role === ROLES.ADMIN && 'Todas las clases de la academia.'}
            {profile.role === ROLES.TUTOR && 'Inscribe a tus hijos en clases y campamentos.'}
          </p>
        </div>

        {hasRole(ROLES.ADMIN, ROLES.MAESTRO) && (
          <Link href="/dashboard/clases/nueva" className="btn-primary">
            <Plus size={16} /> Nueva clase
          </Link>
        )}
      </header>

      {esTutorOAlumno && (
        <div className="flex gap-1 mb-5 border-b border-ink-200 overflow-x-auto scrollbar-none animate-fade-up" style={{ animationDelay: '80ms' }}>
          <button onClick={() => setTabActivo('mias')}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap transition ${
              tabActivo === 'mias' ? 'border-accent text-ink-900 font-medium' : 'border-transparent text-ink-500'
            }`}>
            Mis inscripciones ({misClases.length})
          </button>
          <button onClick={() => setTabActivo('disponibles')}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap transition ${
              tabActivo === 'disponibles' ? 'border-accent text-ink-900 font-medium' : 'border-transparent text-ink-500'
            }`}>
            Explorar ({disponibles.length})
          </button>
        </div>
      )}

      <div className="card p-2 mb-5 sm:mb-6 flex items-center animate-fade-up" style={{ animationDelay: '120ms' }}>
        <Search size={18} className="ml-3 text-ink-400 shrink-0" />
        <input placeholder="Buscar…"
          value={filtro} onChange={(e) => setFiltro(e.target.value)}
          className="bg-transparent px-3 py-2 flex-1 outline-none text-sm" />
      </div>

      {mostrar.length === 0 ? (
        <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base animate-fade-up">
          {tabActivo === 'disponibles'
            ? 'No hay más clases disponibles por ahora.'
            : esTutorOAlumno
            ? 'Aún no estás inscrito en ninguna clase. Pasa a "Explorar" para ver las disponibles.'
            : 'No hay clases que mostrar.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {mostrar.map((c, i) => (
            <div key={c.id} className="animate-fade-up" style={{ animationDelay: `${160 + i * 60}ms` }}>
              <TarjetaClase clase={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaClase({ clase }) {
  const Icon = ICON_TIPO[clase.tipo] || GraduationCap;
  const inscritos = contarInscripciones(clase);

  let precioLabel = '';
  if (clase.tipo === TIPO_CLASE.REGULAR) {
    if (clase.modalidad === 'academica') {
      precioLabel = `${clase.precioMensual}€/mes · 10 cuotas`;
    } else if (clase.modalidad === 'duracion') {
      const p = clase.unidadDuracion === 'meses' ? clase.precioMensual : clase.precioSemanal;
      precioLabel = `${p}€/${clase.unidadDuracion === 'meses' ? 'mes' : 'sem'} · ${clase.numeroPeriodos} ${clase.unidadDuracion}`;
    }
  } else if (clase.tipo === TIPO_CLASE.PRIVADA) {
    precioLabel = `${clase.precioUnitario}€/${clase.unidad === 'horas' ? 'hora' : 'día'}`;
  } else if (clase.tipo === TIPO_CLASE.CAMPAMENTO) {
    const precios = Object.values(clase.opciones || {}).map((o) => o.precio);
    if (precios.length) precioLabel = `Desde ${Math.min(...precios)}€`;
  }

  const totalCupo = clase.tipo === TIPO_CLASE.CAMPAMENTO
    ? Object.values(clase.sedes || {}).reduce((a, s) => a + (s.cupoMax || 0), 0)
    : clase.cupoMax;

  return (
    <Link href={`/dashboard/clases/${clase.id}`}
      className="card p-4 sm:p-5 group block h-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-accent-deep" strokeWidth={1.5} />
          <span className="chip bg-accent/10 text-accent-deep">
            {LABEL_TIPO[clase.tipo] || clase.nivel || 'Clase'}
          </span>
        </div>
        {precioLabel && (
          <span className="text-xs text-ink-700 font-medium text-right">{precioLabel}</span>
        )}
      </div>
      <h3 className="font-display text-lg sm:text-xl mt-3 group-hover:text-accent-deep transition break-words">
        {clase.nombre}
      </h3>
      <p className="text-sm text-ink-600 mt-2 line-clamp-2">{clase.descripcion}</p>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-ink-100 flex justify-between text-xs text-ink-500">
        <span>{inscritos}/{totalCupo || '∞'} inscritos</span>
        <span className="truncate ml-2">{clase.horario || clase.nivel || ''}</span>
      </div>
    </Link>
  );
}
