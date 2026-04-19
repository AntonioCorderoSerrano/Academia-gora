'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  { id: 'directo', label: 'Clase en directo', icon: Video },
  { id: 'materiales', label: 'Materiales', icon: FileText },
  { id: 'asistencia', label: 'Asistencia', icon: CheckSquare },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

export default function ClaseDetalle() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [clase, setClase] = useState(null);
  const [estado, setEstado] = useState('loading');
  const [tab, setTab] = useState('directo');

  useEffect(() => {
    const unsub = onValue(ref(db, `clases/${id}`), (snap) => {
      if (!snap.exists()) {
        setEstado('notfound');
        setClase(null);
        return;
      }
      setClase({ id, ...snap.val() });
      setEstado('ok');
    });
    return () => unsub();
  }, [id]);

  if (estado === 'loading') {
    return <div className="card p-10 text-center text-ink-500">Cargando clase…</div>;
  }
  if (estado === 'notfound' || !clase) {
    return (
      <div className="card p-10 text-center">
        <p className="text-ink-700 font-display text-xl">Clase no encontrada</p>
        <Link href="/dashboard/clases" className="btn-outline mt-4 inline-flex">
          Volver
        </Link>
      </div>
    );
  }

  const esMaestro = clase.maestroId === user.uid;
  const esAdmin = profile.role === ROLES.ADMIN;
  const esAlumnoInscrito = !!clase.alumnos?.[user.uid];
  const puedeGestionar = esMaestro || esAdmin;

  // Guard: si no es admin/maestro de la clase ni alumno inscrito → sin acceso
  const puedeVer = puedeGestionar || esAlumnoInscrito || (
    profile.role === ROLES.TUTOR && profile.hijos &&
    Object.keys(profile.hijos).some((h) => clase.alumnos?.[h])
  );

  if (!puedeVer) {
    return (
      <div className="card p-10 text-center">
        <p className="text-ink-700 font-display text-xl">No tienes acceso a esta clase</p>
        <p className="text-ink-500 mt-2 text-sm">
          Si crees que es un error, contacta con tu maestro.
        </p>
        <Link href="/dashboard/clases" className="btn-outline mt-4 inline-flex">
          Volver
        </Link>
      </div>
    );
  }

  const eliminarClase = async () => {
    if (!confirm('Eliminar la clase para siempre. ¿Continuar?')) return;
    await remove(ref(db, `clases/${id}`));
    toast.success('Clase eliminada');
    router.push('/dashboard/clases');
  };

  // Filtrar tabs según rol
  const tabsVisibles = TABS.filter((t) => {
    if (t.id === 'alumnos') return puedeGestionar; // alumnos no ven el listado completo
    return true;
  });

  return (
    <div>
      <Link href="/dashboard/clases" className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-6">
        <ArrowLeft size={16} /> Volver a clases
      </Link>

      <div className="card p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-accent/10 text-accent-deep">{clase.nivel}</span>
              {clase.tipoCobro === 'unico' && clase.precio > 0 && (
                <span className="chip bg-ink-900 text-ink-50">{clase.precio}€ único</span>
              )}
              {clase.tipoCobro === 'gratis' && (
                <span className="chip bg-ink-100 text-ink-700">Incluida en suscripción</span>
              )}
            </div>
            <h1 className="font-display text-4xl mt-3">{clase.nombre}</h1>
            <p className="text-ink-600 mt-2 max-w-2xl">{clase.descripcion}</p>
            <div className="mt-4 text-sm text-ink-500 flex flex-wrap gap-4">
              <span>👤 {clase.maestroNombre}</span>
              <span>🕐 {clase.horario || 'Sin horario'}</span>
              <span>👥 {clase.alumnos ? Object.keys(clase.alumnos).length : 0}/{clase.cupoMax}</span>
            </div>
          </div>

          {puedeGestionar && (
            <button onClick={eliminarClase} className="btn-ghost text-red-700">
              <Trash2 size={16} /> Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-ink-200 overflow-x-auto">
        {tabsVisibles.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px whitespace-nowrap transition ${
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
