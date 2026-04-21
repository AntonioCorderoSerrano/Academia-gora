'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import {
  TIPO_CLASE, LABEL_TIPO, MODALIDAD_REGULAR,
  contarInscripciones, tieneCupo, cupoRestante, estaInscrito,
} from '@/lib/claseHelpers';
import {
  ArrowLeft, Users, FileText, CheckSquare, MessageSquare, Trash2, Video,
  Calendar as CalIcon, Euro,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TabAlumnos from '@/components/clase/TabAlumnos';
import TabMateriales from '@/components/clase/TabMateriales';
import TabAsistencia from '@/components/clase/TabAsistencia';
import TabChat from '@/components/clase/TabChat';
import TabDirecto from '@/components/clase/TabDirecto';
import InscripcionFlow from '@/components/clase/InscripcionFlow';

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

  const tabParam = searchParams.get('tab');
  const initialTab = VALID_TABS.includes(tabParam) ? tabParam : 'directo';
  const [tab, setTab] = useState(initialTab);
  const [showInscripcion, setShowInscripcion] = useState(false);

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) setTab(tabParam);
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

  // Tutor: comprobar si tiene hijos inscritos
  const tieneHijoInscrito = profile.role === ROLES.TUTOR && clase.alumnos
    ? Object.values(clase.alumnos).some((a) => a.tutorUid === user.uid)
    : false;

  const puedeVer = puedeGestionar || esAlumnoInscrito || tieneHijoInscrito;
  const puedeInscribirse = !puedeGestionar && !esAlumnoInscrito;
  const hayCupo = tieneCupo(clase);

  // VISTA: no inscrito + puede inscribirse → pantalla de inscripción
  if (!puedeVer && puedeInscribirse) {
    return (
      <ClaseVistaPublica
        clase={clase}
        hayCupo={hayCupo}
        onInscribirse={() => setShowInscripcion(true)}
        showInscripcion={showInscripcion}
        onCloseInscripcion={() => setShowInscripcion(false)}
      />
    );
  }

  if (!puedeVer) {
    return (
      <div className="card p-8 sm:p-10 text-center">
        <p className="text-ink-700 font-display text-lg sm:text-xl">No tienes acceso</p>
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
    const url = new URL(window.location.href);
    url.searchParams.set('tab', nuevoId);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div>
      <Link href="/dashboard/clases" className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-4 sm:mb-6">
        <ArrowLeft size={16} /> Volver a clases
      </Link>

      <CabeceraClase clase={clase} puedeGestionar={puedeGestionar} onDelete={eliminarClase} />

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

// Vista para usuarios NO inscritos que pueden inscribirse
function ClaseVistaPublica({ clase, hayCupo, onInscribirse, showInscripcion, onCloseInscripcion }) {
  return (
    <div>
      <Link href="/dashboard/clases" className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-4 sm:mb-6">
        <ArrowLeft size={16} /> Volver a clases
      </Link>

      <CabeceraClase clase={clase} puedeGestionar={false} />

      {/* Info de inscripción */}
      <div className="card p-5 sm:p-6 md:p-8">
        <h2 className="font-display text-xl sm:text-2xl mb-3">Inscripción</h2>
        <ResumenPrecio clase={clase} />

        {!hayCupo && clase.tipo !== TIPO_CLASE.CAMPAMENTO ? (
          <div className="mt-5 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            Esta clase está completa. No se admiten más inscripciones por ahora.
          </div>
        ) : (
          <button onClick={onInscribirse} className="btn-accent mt-5 w-full sm:w-auto">
            Inscribirme
          </button>
        )}
      </div>

      {showInscripcion && <InscripcionFlow clase={clase} onClose={onCloseInscripcion} />}
    </div>
  );
}

function CabeceraClase({ clase, puedeGestionar, onDelete }) {
  return (
    <div className="card p-5 sm:p-6 md:p-8 mb-5 sm:mb-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-accent/10 text-accent-deep">{LABEL_TIPO[clase.tipo] || 'Clase'}</span>
            {clase.nivel && <span className="chip bg-ink-100 text-ink-700">{clase.nivel}</span>}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl mt-2 sm:mt-3 break-words">
            {clase.nombre}
          </h1>
          <p className="text-ink-600 mt-2 max-w-2xl text-sm sm:text-base">{clase.descripcion}</p>
          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-ink-500 flex flex-wrap gap-3 sm:gap-4">
            <span>👤 {clase.maestroNombre}</span>
            {clase.horario && <span>🕐 {clase.horario}</span>}
            {clase.fechaInicio && clase.fechaFin && (
              <span className="inline-flex items-center gap-1">
                <CalIcon size={14} />
                {new Date(clase.fechaInicio).toLocaleDateString('es-ES')} – {new Date(clase.fechaFin).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>
        </div>

        {puedeGestionar && onDelete && (
          <button onClick={onDelete} className="btn-ghost text-red-700 self-start">
            <Trash2 size={16} /> <span className="hidden sm:inline">Eliminar</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ResumenPrecio({ clase }) {
  if (clase.tipo === TIPO_CLASE.REGULAR) {
    if (clase.modalidad === MODALIDAD_REGULAR.ACADEMICA) {
      return (
        <div className="flex items-baseline gap-2">
          <Euro size={18} className="text-accent-deep" />
          <span className="font-display text-2xl">{clase.precioMensual}€</span>
          <span className="text-sm text-ink-500">al mes · 10 cuotas (septiembre–junio)</span>
        </div>
      );
    }
    if (clase.modalidad === MODALIDAD_REGULAR.DURACION) {
      const p = clase.unidadDuracion === 'meses' ? clase.precioMensual : clase.precioSemanal;
      return (
        <div>
          <div className="flex items-baseline gap-2">
            <Euro size={18} className="text-accent-deep" />
            <span className="font-display text-2xl">{p}€</span>
            <span className="text-sm text-ink-500">
              /{clase.unidadDuracion === 'meses' ? 'mes' : 'semana'} · durante {clase.numeroPeriodos} {clase.unidadDuracion}
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-2">
            Total: {p * clase.numeroPeriodos}€ divididos en {clase.numeroPeriodos} pagos.
          </p>
        </div>
      );
    }
  }
  if (clase.tipo === TIPO_CLASE.PRIVADA) {
    return (
      <div className="flex items-baseline gap-2">
        <Euro size={18} className="text-accent-deep" />
        <span className="font-display text-2xl">{clase.precioUnitario}€</span>
        <span className="text-sm text-ink-500">
          /{clase.unidad === 'horas' ? 'hora' : 'día'}
        </span>
      </div>
    );
  }
  if (clase.tipo === TIPO_CLASE.CAMPAMENTO) {
    return (
      <div>
        <p className="text-sm text-ink-600 mb-2">Opciones disponibles:</p>
        <ul className="space-y-1">
          {Object.entries(clase.opciones || {}).map(([id, o]) => (
            <li key={id} className="flex justify-between text-sm">
              <span>{o.label}</span>
              <span className="font-medium">{o.precio}€</span>
            </li>
          ))}
          {clase.comedorDisponible && (
            <li className="flex justify-between text-sm pt-2 border-t border-ink-100">
              <span className="text-ink-500">+ Comedor (opcional)</span>
              <span className="font-medium">{clase.precioComedor}€</span>
            </li>
          )}
        </ul>
      </div>
    );
  }
  return null;
}
