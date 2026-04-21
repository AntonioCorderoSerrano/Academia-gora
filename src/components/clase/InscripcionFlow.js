'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import {
  TIPO_CLASE, MODALIDAD_REGULAR, cupoRestante, tieneCupo,
} from '@/lib/claseHelpers';
import { getStripe } from '@/lib/stripeClient';
import toast from 'react-hot-toast';
import { X, Loader2, AlertCircle, UserCircle, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function InscripcionFlow({ clase, onClose }) {
  const { user, profile } = useAuth();
  const [hijos, setHijos] = useState([]);
  const [hijoId, setHijoId] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [opcionId, setOpcionId] = useState('');
  const [conComedor, setConComedor] = useState(false);
  const [cantidad, setCantidad] = useState(1); // para privadas
  const [loading, setLoading] = useState(false);

  const esTutor = profile.role === ROLES.TUTOR;

  // Cargar hijos del tutor
  useEffect(() => {
    if (!esTutor || !user) return;
    const unsub = onValue(ref(db, `hijos/${user.uid}`), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, h]) => ({ id, ...h }));
      setHijos(list);
      if (list.length && !hijoId) setHijoId(list[0].id);
    });
    return () => unsub();
  }, [esTutor, user]);

  // Preseleccionar primera sede con cupo
  useEffect(() => {
    if (clase.tipo === TIPO_CLASE.CAMPAMENTO && !sedeId) {
      const primera = Object.entries(clase.sedes || {}).find(
        ([id]) => tieneCupo(clase, id)
      );
      if (primera) setSedeId(primera[0]);
    }
  }, [clase, sedeId]);

  // Preseleccionar primera opción del campamento
  useEffect(() => {
    if (clase.tipo === TIPO_CLASE.CAMPAMENTO && !opcionId) {
      const primera = Object.keys(clase.opciones || {})[0];
      if (primera) setOpcionId(primera);
    }
  }, [clase, opcionId]);

  const hijoSeleccionado = hijos.find((h) => h.id === hijoId);

  const handleInscribirse = async () => {
    // Validaciones
    if (esTutor && !hijoId) {
      toast.error('Selecciona un hijo para inscribir');
      return;
    }
    if (clase.tipo === TIPO_CLASE.CAMPAMENTO) {
      if (!sedeId) return toast.error('Selecciona una sede');
      if (!opcionId) return toast.error('Selecciona una opción');
      if (!tieneCupo(clase, sedeId)) return toast.error('Esta sede está completa');
    } else {
      if (!tieneCupo(clase)) return toast.error('La clase está completa');
    }
    if (clase.tipo === TIPO_CLASE.PRIVADA && (!cantidad || cantidad < 1)) {
      return toast.error('Indica una cantidad válida');
    }

    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      let endpoint = '';
      let body = {};

      if (clase.tipo === TIPO_CLASE.REGULAR) {
        if (clase.modalidad === MODALIDAD_REGULAR.ACADEMICA) {
          endpoint = '/api/stripe/checkout-academica';
        } else {
          endpoint = '/api/stripe/checkout-duracion';
        }
        body = { claseId: clase.id, hijoId: hijoId || null };
      } else if (clase.tipo === TIPO_CLASE.PRIVADA) {
        endpoint = '/api/stripe/checkout-privada';
        body = { claseId: clase.id, cantidad: Number(cantidad), hijoId: hijoId || null };
      } else if (clase.tipo === TIPO_CLASE.CAMPAMENTO) {
        endpoint = '/api/stripe/checkout-campamento';
        body = {
          claseId: clase.id,
          sedeId,
          opcionId,
          conComedor,
          hijoId: hijoId || null,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en el pago');

      const stripe = await getStripe();
      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (err) {
      toast.error(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular precio total para mostrar
  const calcTotal = () => {
    if (clase.tipo === TIPO_CLASE.REGULAR) {
      if (clase.modalidad === MODALIDAD_REGULAR.ACADEMICA) {
        return `${clase.precioMensual}€/mes × 10 cuotas = ${clase.precioMensual * 10}€ total`;
      }
      const p = clase.unidadDuracion === 'meses' ? clase.precioMensual : clase.precioSemanal;
      return `${p}€ × ${clase.numeroPeriodos} ${clase.unidadDuracion} = ${p * clase.numeroPeriodos}€ total`;
    }
    if (clase.tipo === TIPO_CLASE.PRIVADA) {
      return `${clase.precioUnitario}€ × ${cantidad} ${clase.unidad} = ${clase.precioUnitario * cantidad}€`;
    }
    if (clase.tipo === TIPO_CLASE.CAMPAMENTO) {
      const op = clase.opciones?.[opcionId];
      if (!op) return '';
      const base = op.precio;
      const extra = conComedor && clase.comedorDisponible ? Number(clase.precioComedor || 0) : 0;
      return `${op.label}: ${base}€${extra ? ` + Comedor ${extra}€ = ${base + extra}€` : ''}`;
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-elegant">
        <div className="sticky top-0 bg-white border-b border-ink-100 p-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Completar inscripción</h2>
          <button onClick={onClose} className="btn-ghost" aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Selector de hijo (solo tutor) */}
          {esTutor && (
            <SelectorHijo
              hijos={hijos}
              hijoId={hijoId}
              onChange={setHijoId}
              hijoSeleccionado={hijoSeleccionado}
            />
          )}

          {/* Campamento: sede + opción + comedor */}
          {clase.tipo === TIPO_CLASE.CAMPAMENTO && (
            <>
              <SelectorSede clase={clase} sedeId={sedeId} onChange={setSedeId} />
              <SelectorOpcion clase={clase} opcionId={opcionId} onChange={setOpcionId} />
              {clase.comedorDisponible && (
                <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg border border-ink-200 hover:border-ink-400">
                  <input type="checkbox" checked={conComedor} onChange={(e) => setConComedor(e.target.checked)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Incluir servicio de comedor</p>
                    <p className="text-xs text-ink-500">Suplemento: {clase.precioComedor}€</p>
                  </div>
                </label>
              )}
            </>
          )}

          {/* Privada: cantidad */}
          {clase.tipo === TIPO_CLASE.PRIVADA && (
            <div>
              <label className="text-sm text-ink-700">
                ¿Cuántas {clase.unidad} quieres contratar?
              </label>
              <input type="number" min={1} max={100} className="field mt-1 max-w-[120px]"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)} />
            </div>
          )}

          {/* Resumen de precio */}
          <div className="p-4 rounded-lg bg-ink-50 border border-ink-100">
            <p className="text-xs uppercase tracking-wider text-ink-500">Total</p>
            <p className="font-display text-lg mt-1">{calcTotal()}</p>
            {clase.tipo === TIPO_CLASE.REGULAR && (
              <p className="text-xs text-ink-500 mt-2">
                Se creará una suscripción que se cancelará automáticamente al finalizar.
                Puedes gestionar la cancelación desde tu panel de pagos.
              </p>
            )}
          </div>

          <button
            disabled={loading || (esTutor && hijos.length === 0)}
            onClick={handleInscribirse}
            className="btn-accent w-full">
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Redirigiendo a Stripe…</>
            ) : 'Pagar e inscribir'}
          </button>

          {esTutor && hijos.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                Primero añade a tu hijo/a en{' '}
                <Link href="/dashboard/hijos" className="underline font-medium">
                  Mis hijos
                </Link>{' '}
                para poder inscribirlo.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectorHijo({ hijos, hijoId, onChange, hijoSeleccionado }) {
  return (
    <div>
      <label className="text-sm text-ink-700">¿Para quién es la inscripción?</label>
      {hijos.length === 0 ? (
        <p className="text-xs text-ink-500 mt-1">No tienes perfiles de hijos creados.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {hijos.map((h) => (
            <label key={h.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                hijoId === h.id ? 'border-accent bg-accent/5' : 'border-ink-200 hover:border-ink-400'
              }`}>
              <input type="radio" name="hijo" value={h.id}
                checked={hijoId === h.id}
                onChange={() => onChange(h.id)} className="mt-1" />
              <UserCircle size={18} className="text-accent-deep mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{h.nombre} {h.apellidos}</p>
                {h.fechaNacimiento && (
                  <p className="text-xs text-ink-500">
                    {new Date(h.fechaNacimiento).toLocaleDateString('es-ES')}
                  </p>
                )}
                {h.alergias && (
                  <p className="text-xs text-amber-700 mt-1">⚠ Alergias: {h.alergias}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectorSede({ clase, sedeId, onChange }) {
  const sedes = Object.entries(clase.sedes || {});
  return (
    <div>
      <label className="text-sm text-ink-700">Sede</label>
      <div className="mt-2 space-y-2">
        {sedes.map(([id, s]) => {
          const restante = cupoRestante(clase, id);
          const disponible = restante > 0;
          return (
            <label key={id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                !disponible ? 'opacity-50 cursor-not-allowed bg-ink-50' :
                sedeId === id ? 'border-accent bg-accent/5 cursor-pointer' :
                'border-ink-200 hover:border-ink-400 cursor-pointer'
              }`}>
              <input type="radio" name="sede" value={id}
                checked={sedeId === id}
                disabled={!disponible}
                onChange={() => onChange(id)} className="mt-1" />
              <MapPin size={18} className="text-accent-deep mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{s.nombre}</p>
                <p className={`text-xs ${disponible ? 'text-ink-500' : 'text-red-700'}`}>
                  {disponible ? `${restante} plazas disponibles` : 'Completa'}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SelectorOpcion({ clase, opcionId, onChange }) {
  const opciones = Object.entries(clase.opciones || {});
  return (
    <div>
      <label className="text-sm text-ink-700">Duración de estancia</label>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opciones.map(([id, o]) => (
          <label key={id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
              opcionId === id ? 'border-accent bg-accent/5' : 'border-ink-200 hover:border-ink-400'
            }`}>
            <input type="radio" name="opcion" value={id}
              checked={opcionId === id}
              onChange={() => onChange(id)} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{o.label}</p>
              <p className="text-xs text-ink-500">{o.precio}€</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
