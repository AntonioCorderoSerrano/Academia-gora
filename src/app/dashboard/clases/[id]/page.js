'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import {
  ArrowLeft, Users, FileText, CheckSquare, MessageSquare, Trash2, Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TabAlumnos from '@/components/clase/TabAlumnos';
import TabMateriales from '@/components/clase/TabMateriales';
import TabAsistencia from '@/components/clase/TabAsistencia';
import TabChat from '@/components/clase/TabChat';
import TabDirecto from '@/components/clase/TabDirecto';

const TABS = [
  { id: 'alumnos', label: 'Alumnos', icon: Users },
  { id: 'directo', label: 'Directo', icon: Video },
  { id: 'materiales', label: 'Materiales', icon: FileText },
  { id: 'asistencia', label: 'Asistencia', icon: CheckSquare },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

const VALID_TABS = TABS.map((t) => t.id);

export default function ClaseDetalle() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const [clase, setClase] = useState(null);
  const [estado, setEstado] = useState('loading');

  // Tab inicial según query string (p.ej. /dashboard/clases/abc?tab=chat)
  const tabParam = searchParams.get('tab');
  const initialTab = VALID_TABS.includes(tabParam) ? tabParam : 'directo';
  const [tab, setTab] = useState(initialTab);

  // Si cambia el query param, sincroniza
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const unsub = onValue(ref(db, `clases/${id}`), (snap) => {
      if (!snap.exists()) { setEstado('notfound'); setClase(null); return; }
      setClase({ id, ...snap.val() });
      setEstado('ok');
    });
    return () => unsub();
  }, [id]);

  if (estado === 'loading') {
    return <div className="card p-8 sm:p-10 text-center text-ink-500">Cargando clase…</div>;
  }
  if (estado === 'notfound' || !clase) {
    return (
      <div className="card p-8 sm:p-10 text-center">
        <p className="text-ink-700 font-display text-lg sm:text-xl">Clase no encontrada</p>
        <Link href="/dashboard/clases" className="btn-outline mt-4 inline-flex">Volver</Link>
      </div>
    );
  }

  const esMaestro = clase.maestroId === user.uid;
  const esAdmin = profile.role === ROLES.ADMIN;
  const esAlumnoInscrito = !!clase.alumnos?.[user.uid];
  const puedeGestionar = esMaestro || esAdmin;

  const puedeVer = puedeGestionar || esAlumnoInscrito || (
    profile.role === ROLES.TUTOR && profile.hijos &&
    Object.keys(profile.hijos).some((h) => clase.alumnos?.[h])
  );

  if (!puedeVer) {
    return (
      <div className="card p-8 sm:p-10 text-center">
        <p className="text-ink-700 font-display text-lg sm:text-xl">No tienes acceso a esta clase</p>
        <p className="text-ink-500 mt-2 text-sm">Si crees que es un error, contacta con tu maestro.</p>
        <Link href="/dashboard/clases" className="btn-outline mt-4 inline-flex">Volver</Link>
      </div>
    );
  }

  const eliminarClase = async () => {
    if (!confirm('Eliminar la clase para siempre. ¿Continuar?')) return;
    await remove(ref(db, `clases/${id}`));
    toast.success('Clase eliminada');
    router.push('/dashboard/clases');
  };

  const tabsVisibles = TABS.filter((t) => {
    if (t.id === 'alumnos') return puedeGestionar;
    return true;
  });

  const cambiarTab = (nuevoId) => {
    setTab(nuevoId);
    // Actualiza la URL sin recargar, para que sea compartible/volver atrás
    const url = new URL(window.location.href);
    url.searchParams.set('tab', nuevoId);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div>
      <Link href="/dashboard/clases" className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-4 sm:mb-6">
        <ArrowLeft size={16} /> Volver a clases
      </Link>

      {/* Header */}
      <div className="card p-5 sm:p-6 md:p-8 mb-5 sm:mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-accent/10 text-accent-deep">{clase.nivel}</span>
              {clase.tipoCobro === 'unico' && clase.precio > 0 && (
                <span className="chip bg-ink-900 text-ink-50">{clase.precio}€ único</span>
              )}
              {clase.tipoCobro === 'gratis' && (
                <span className="chip bg-ink-100 text-ink-700">Incluida</span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl mt-2 sm:mt-3 break-words">
              {clase.nombre}
            </h1>
            <p className="text-ink-600 mt-2 max-w-2xl text-sm sm:text-base">{clase.descripcion}</p>
            <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-ink-500 flex flex-wrap gap-3 sm:gap-4">
              <span>👤 {clase.maestroNombre}</span>
              <span>🕐 {clase.horario || 'Sin horario'}</span>
              <span>👥 {clase.alumnos ? Object.keys(clase.alumnos).length : 0}/{clase.cupoMax}</span>
            </div>
          </div>

          {puedeGestionar && (
            <button onClick={eliminarClase} className="btn-ghost text-red-700 self-start">
              <Trash2 size={16} /> <span className="hidden sm:inline">Eliminar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 sm:mb-6 border-b border-ink-200 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        {tabsVisibles.map((t) => (
          <button key={t.id} onClick={() => cambiarTab(t.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-sm border-b-2 -mb-px whitespace-nowrap transition ${
              tab === t.id
                ? 'border-accent text-ink-900 font-medium'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}>
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'alumnos' && <TabAlumnos clase={clase} puedeGestionar={puedeGestionar} />}
        {tab === 'directo' && <TabDirecto clase={clase} puedeGestionar={puedeGestionar} />}
        {tab === 'materiales' && <TabMateriales clase={clase} puedeGestionar={puedeGestionar} />}
        {tab === 'asistencia' && <TabAsistencia clase={clase} puedeGestionar={puedeGestionar} />}
        {tab === 'chat' && <TabChat clase={clase} />}
      </div>
    </div>
  );
}
