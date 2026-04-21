'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { push, ref, serverTimestamp, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import {
  TIPO_CLASE, LABEL_TIPO, MODALIDAD_REGULAR, UNIDAD_PRIVADA, UNIDAD_DURACION,
} from '@/lib/claseHelpers';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, GraduationCap, User, Sun } from 'lucide-react';
import Link from 'next/link';

const TIPOS_CARDS = [
  { value: TIPO_CLASE.REGULAR, icon: GraduationCap, label: 'Clase regular', desc: 'Curso académico o con duración' },
  { value: TIPO_CLASE.PRIVADA, icon: User, label: 'Clase privada', desc: 'Pago por horas o días' },
  { value: TIPO_CLASE.CAMPAMENTO, icon: Sun, label: 'Campamento', desc: 'Verano con varias sedes' },
];

export default function NuevaClasePage() {
  const { user, profile, hasRole } = useAuth();
  const router = useRouter();
  const [tipo, setTipo] = useState(TIPO_CLASE.REGULAR);

  // Campos comunes
  const [comun, setComun] = useState({
    nombre: '', descripcion: '', nivel: 'Principiante',
    horario: '', cupoMax: 20,
  });

  // Campos REGULAR
  const [regular, setRegular] = useState({
    modalidad: MODALIDAD_REGULAR.ACADEMICA,
    precioMensual: 50,          // para académica y duración en meses
    precioSemanal: 15,          // para duración en semanas
    unidadDuracion: UNIDAD_DURACION.MESES,
    numeroPeriodos: 3,          // ej. 3 meses o 8 semanas
  });

  // Campos PRIVADA
  const [privada, setPrivada] = useState({
    unidad: UNIDAD_PRIVADA.HORAS,
    precioUnitario: 25,         // por hora o por día
  });

  // Campos CAMPAMENTO
  const [campamento, setCampamento] = useState({
    comedorDisponible: true,
    precioComedor: 30,          // por periodo o total según tipo
    opciones: [
      { id: 'op_' + Date.now() + '_1', label: 'Una semana', precio: 80 },
      { id: 'op_' + Date.now() + '_2', label: '15 días', precio: 150 },
      { id: 'op_' + Date.now() + '_3', label: 'Un mes', precio: 280 },
      { id: 'op_' + Date.now() + '_4', label: 'Campamento completo', precio: 500 },
    ],
    sedes: [
      { id: 'sede_' + Date.now() + '_1', nombre: 'Sede principal', cupoMax: 30 },
    ],
    fechaInicio: '',
    fechaFin: '',
  });

  const [loading, setLoading] = useState(false);

  if (!hasRole(ROLES.ADMIN, ROLES.MAESTRO)) {
    return (
      <div className="card p-8 sm:p-10 text-center">
        <p className="text-ink-600">No tienes permisos para crear clases.</p>
      </div>
    );
  }

  const addOpcion = () => {
    setCampamento((c) => ({
      ...c,
      opciones: [...c.opciones, { id: 'op_' + Date.now() + '_' + Math.random(), label: 'Nueva opción', precio: 0 }],
    }));
  };

  const removeOpcion = (id) => {
    setCampamento((c) => ({ ...c, opciones: c.opciones.filter((o) => o.id !== id) }));
  };

  const updateOpcion = (id, field, value) => {
    setCampamento((c) => ({
      ...c,
      opciones: c.opciones.map((o) => o.id === id ? { ...o, [field]: value } : o),
    }));
  };

  const addSede = () => {
    setCampamento((c) => ({
      ...c,
      sedes: [...c.sedes, { id: 'sede_' + Date.now() + '_' + Math.random(), nombre: 'Nueva sede', cupoMax: 20 }],
    }));
  };

  const removeSede = (id) => {
    if (campamento.sedes.length <= 1) {
      toast.error('Debe haber al menos una sede');
      return;
    }
    setCampamento((c) => ({ ...c, sedes: c.sedes.filter((s) => s.id !== id) }));
  };

  const updateSede = (id, field, value) => {
    setCampamento((c) => ({
      ...c,
      sedes: c.sedes.map((s) => s.id === id ? { ...s, [field]: value } : s),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const base = {
        ...comun,
        cupoMax: Number(comun.cupoMax),
        tipo,
        maestroId: user.uid,
        maestroNombre: profile.nombre,
        alumnos: {},
        materiales: {},
        createdAt: serverTimestamp(),
      };

      let claseData;
      if (tipo === TIPO_CLASE.REGULAR) {
        claseData = {
          ...base,
          modalidad: regular.modalidad,
          precioMensual: Number(regular.precioMensual),
          precioSemanal: Number(regular.precioSemanal),
          unidadDuracion: regular.unidadDuracion,
          numeroPeriodos: Number(regular.numeroPeriodos),
        };
      } else if (tipo === TIPO_CLASE.PRIVADA) {
        claseData = {
          ...base,
          unidad: privada.unidad,
          precioUnitario: Number(privada.precioUnitario),
        };
      } else if (tipo === TIPO_CLASE.CAMPAMENTO) {
        if (campamento.opciones.length === 0) {
          toast.error('Añade al menos una opción de duración');
          setLoading(false);
          return;
        }
        // Convertimos arrays a objetos por id (RTDB prefiere objetos)
        const opcionesObj = {};
        campamento.opciones.forEach((o) => {
          opcionesObj[o.id] = { label: o.label, precio: Number(o.precio) };
        });
        const sedesObj = {};
        campamento.sedes.forEach((s) => {
          sedesObj[s.id] = { nombre: s.nombre, cupoMax: Number(s.cupoMax) };
        });
        claseData = {
          ...base,
          comedorDisponible: campamento.comedorDisponible,
          precioComedor: Number(campamento.precioComedor),
          opciones: opcionesObj,
          sedes: sedesObj,
          fechaInicio: campamento.fechaInicio || null,
          fechaFin: campamento.fechaFin || null,
        };
      }

      const newRef = push(ref(db, 'clases'));
      await set(newRef, claseData);
      toast.success('Clase creada');
      router.push(`/dashboard/clases/${newRef.key}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al crear la clase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/dashboard/clases" className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-4 sm:mb-6">
        <ArrowLeft size={16} /> Volver
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl mb-2">Nueva clase</h1>
      <p className="text-ink-600 mb-6 sm:mb-8 text-sm sm:text-base">
        Elige el tipo y configura los detalles.
      </p>

      {/* Selector de tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-6">
        {TIPOS_CARDS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTipo(t.value)}
            className={`card p-4 text-left transition ${
              tipo === t.value ? 'border-accent ring-2 ring-accent/30' : 'hover:shadow-elegant'
            }`}
          >
            <t.icon size={20} className="text-accent-deep" strokeWidth={1.5} />
            <p className="font-medium mt-2 text-sm">{t.label}</p>
            <p className="text-xs text-ink-500 mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="card p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 max-w-3xl">
        {/* ================ CAMPOS COMUNES ================ */}
        <div>
          <label className="text-sm text-ink-700">Nombre de la clase</label>
          <input required className="field mt-1"
            value={comun.nombre}
            onChange={(e) => setComun({ ...comun, nombre: e.target.value })} />
        </div>

        <div>
          <label className="text-sm text-ink-700">Descripción</label>
          <textarea rows={3} className="field mt-1"
            value={comun.descripcion}
            onChange={(e) => setComun({ ...comun, descripcion: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-ink-700">Nivel</label>
            <select className="field mt-1"
              value={comun.nivel}
              onChange={(e) => setComun({ ...comun, nivel: e.target.value })}>
              <option>Principiante</option><option>Intermedio</option><option>Avanzado</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-ink-700">Horario</label>
            <input placeholder="Lun y Mié 18:00" className="field mt-1"
              value={comun.horario}
              onChange={(e) => setComun({ ...comun, horario: e.target.value })} />
          </div>
          {tipo !== TIPO_CLASE.CAMPAMENTO && (
            <div>
              <label className="text-sm text-ink-700">Cupo máximo</label>
              <input type="number" min={1} className="field mt-1"
                value={comun.cupoMax}
                onChange={(e) => setComun({ ...comun, cupoMax: e.target.value })} />
            </div>
          )}
        </div>

        {/* ================ REGULAR ================ */}
        {tipo === TIPO_CLASE.REGULAR && (
          <div className="border-t border-ink-100 pt-5 space-y-4">
            <h3 className="font-display text-lg">Modalidad de cobro</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button type="button"
                onClick={() => setRegular({ ...regular, modalidad: MODALIDAD_REGULAR.ACADEMICA })}
                className={`text-left rounded-lg border p-3 transition ${
                  regular.modalidad === MODALIDAD_REGULAR.ACADEMICA
                    ? 'border-accent bg-accent/5' : 'border-ink-200'
                }`}>
                <p className="font-medium text-sm">Curso académico (sept–jun)</p>
                <p className="text-xs text-ink-500">Suscripción de 10 cuotas iguales</p>
              </button>
              <button type="button"
                onClick={() => setRegular({ ...regular, modalidad: MODALIDAD_REGULAR.DURACION })}
                className={`text-left rounded-lg border p-3 transition ${
                  regular.modalidad === MODALIDAD_REGULAR.DURACION
                    ? 'border-accent bg-accent/5' : 'border-ink-200'
                }`}>
                <p className="font-medium text-sm">Duración definida</p>
                <p className="text-xs text-ink-500">X meses o semanas</p>
              </button>
            </div>

            {regular.modalidad === MODALIDAD_REGULAR.ACADEMICA && (
              <div>
                <label className="text-sm text-ink-700">Cuota mensual (€)</label>
                <input type="number" min={0} step="0.01" className="field mt-1"
                  value={regular.precioMensual}
                  onChange={(e) => setRegular({ ...regular, precioMensual: e.target.value })} />
                <p className="text-xs text-ink-500 mt-1">Se cobrará una vez al mes de septiembre a junio (máx. 10 cuotas).</p>
              </div>
            )}

            {regular.modalidad === MODALIDAD_REGULAR.DURACION && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-ink-700">Unidad</label>
                  <select className="field mt-1"
                    value={regular.unidadDuracion}
                    onChange={(e) => setRegular({ ...regular, unidadDuracion: e.target.value })}>
                    <option value={UNIDAD_DURACION.MESES}>Meses</option>
                    <option value={UNIDAD_DURACION.SEMANAS}>Semanas</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-ink-700">Nº de {regular.unidadDuracion}</label>
                  <input type="number" min={1} className="field mt-1"
                    value={regular.numeroPeriodos}
                    onChange={(e) => setRegular({ ...regular, numeroPeriodos: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-ink-700">
                    Precio por {regular.unidadDuracion === UNIDAD_DURACION.MESES ? 'mes' : 'semana'} (€)
                  </label>
                  <input type="number" min={0} step="0.01" className="field mt-1"
                    value={regular.unidadDuracion === UNIDAD_DURACION.MESES ? regular.precioMensual : regular.precioSemanal}
                    onChange={(e) => regular.unidadDuracion === UNIDAD_DURACION.MESES
                      ? setRegular({ ...regular, precioMensual: e.target.value })
                      : setRegular({ ...regular, precioSemanal: e.target.value })
                    } />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================ PRIVADA ================ */}
        {tipo === TIPO_CLASE.PRIVADA && (
          <div className="border-t border-ink-100 pt-5 space-y-4">
            <h3 className="font-display text-lg">Tarifa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-ink-700">Cobrar por</label>
                <select className="field mt-1"
                  value={privada.unidad}
                  onChange={(e) => setPrivada({ ...privada, unidad: e.target.value })}>
                  <option value={UNIDAD_PRIVADA.HORAS}>Horas</option>
                  <option value={UNIDAD_PRIVADA.DIAS}>Días</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-ink-700">Precio por {privada.unidad === 'horas' ? 'hora' : 'día'} (€)</label>
                <input type="number" min={0} step="0.01" className="field mt-1"
                  value={privada.precioUnitario}
                  onChange={(e) => setPrivada({ ...privada, precioUnitario: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-ink-500">
              El alumno elegirá cuántas {privada.unidad} contratar al inscribirse.
            </p>
          </div>
        )}

        {/* ================ CAMPAMENTO ================ */}
        {tipo === TIPO_CLASE.CAMPAMENTO && (
          <div className="border-t border-ink-100 pt-5 space-y-5">
            <h3 className="font-display text-lg">Configuración del campamento</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-ink-700">Fecha inicio</label>
                <input type="date" className="field mt-1"
                  value={campamento.fechaInicio}
                  onChange={(e) => setCampamento({ ...campamento, fechaInicio: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-ink-700">Fecha fin</label>
                <input type="date" className="field mt-1"
                  value={campamento.fechaFin}
                  onChange={(e) => setCampamento({ ...campamento, fechaFin: e.target.value })} />
              </div>
            </div>

            {/* Opciones de duración */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-ink-700">Opciones de estancia</label>
                <button type="button" onClick={addOpcion} className="btn-ghost text-xs py-1.5">
                  <Plus size={14} /> Añadir opción
                </button>
              </div>
              <div className="space-y-2">
                {campamento.opciones.map((o) => (
                  <div key={o.id} className="flex gap-2 items-start">
                    <input className="field flex-1" placeholder="Ej: Una semana"
                      value={o.label}
                      onChange={(e) => updateOpcion(o.id, 'label', e.target.value)} />
                    <div className="relative w-32">
                      <input type="number" min={0} step="0.01" className="field"
                        value={o.precio}
                        onChange={(e) => updateOpcion(o.id, 'precio', e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">€</span>
                    </div>
                    <button type="button" onClick={() => removeOpcion(o.id)}
                      className="btn-ghost text-red-700 shrink-0 px-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sedes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-ink-700">Sedes disponibles</label>
                <button type="button" onClick={addSede} className="btn-ghost text-xs py-1.5">
                  <Plus size={14} /> Añadir sede
                </button>
              </div>
              <div className="space-y-2">
                {campamento.sedes.map((s) => (
                  <div key={s.id} className="flex gap-2 items-start">
                    <input className="field flex-1" placeholder="Ej: Colegio San José"
                      value={s.nombre}
                      onChange={(e) => updateSede(s.id, 'nombre', e.target.value)} />
                    <div className="relative w-32">
                      <input type="number" min={1} className="field pr-14"
                        value={s.cupoMax}
                        onChange={(e) => updateSede(s.id, 'cupoMax', e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">cupo</span>
                    </div>
                    <button type="button" onClick={() => removeSede(s.id)}
                      className="btn-ghost text-red-700 shrink-0 px-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Comedor */}
            <div className="border-t border-ink-100 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={campamento.comedorDisponible}
                  onChange={(e) => setCampamento({ ...campamento, comedorDisponible: e.target.checked })} />
                <span className="text-sm">Ofrecer servicio de comedor</span>
              </label>
              {campamento.comedorDisponible && (
                <div className="mt-3">
                  <label className="text-sm text-ink-700">Suplemento de comedor (€)</label>
                  <input type="number" min={0} step="0.01" className="field mt-1 max-w-[200px]"
                    value={campamento.precioComedor}
                    onChange={(e) => setCampamento({ ...campamento, precioComedor: e.target.value })} />
                  <p className="text-xs text-ink-500 mt-1">Se sumará al precio de la opción elegida.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-ink-100">
          <button disabled={loading} className="btn-accent w-full sm:w-auto">
            {loading ? 'Creando…' : `Crear ${LABEL_TIPO[tipo].toLowerCase()}`}
          </button>
          <Link href="/dashboard/clases" className="btn-ghost w-full sm:w-auto text-center">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
