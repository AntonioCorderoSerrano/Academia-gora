'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Receipt, Settings as SettingsIcon } from 'lucide-react';

export default function PagosPage() {
  const { user, profile } = useAuth();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `pagos/${user.uid}`), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPagos(list);
    });
    return () => unsub();
  }, [user]);

  const abrirPortal = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      toast.error('No se pudo abrir el portal de pagos');
    } finally {
      setLoading(false);
    }
  };

  // Suscripciones activas (deducidas del historial de pagos)
  const suscripcionesActivas = pagos
    .filter((p) => p.stripeSubscriptionId && (p.tipo === 'inscripcion_academica' || p.tipo === 'inscripcion_duracion'))
    .reduce((acc, p) => {
      if (!acc[p.stripeSubscriptionId]) acc[p.stripeSubscriptionId] = p;
      return acc;
    }, {});

  const suscripcionesList = Object.values(suscripcionesActivas);

  return (
    <div>
      <h1 className="font-display text-3xl sm:text-4xl mb-1 sm:mb-2">Pagos y suscripciones</h1>
      <p className="text-ink-600 mb-6 sm:mb-8 text-sm sm:text-base">
        Gestiona tus suscripciones activas y consulta el historial.
      </p>

      {suscripcionesList.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl sm:text-2xl">Suscripciones activas</h2>
            {profile.stripeCustomerId && (
              <button onClick={abrirPortal} disabled={loading} className="btn-outline text-sm">
                <SettingsIcon size={14} /> Gestionar
              </button>
            )}
          </div>
          <div className="card divide-y divide-ink-100">
            {suscripcionesList.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.concepto}</p>
                  <p className="text-xs text-ink-500">
                    Desde {new Date(s.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <span className="chip bg-green-100 text-green-800 shrink-0">Activa</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-xl sm:text-2xl mb-3 sm:mb-4 flex items-center gap-2">
        <Receipt size={20} className="text-accent-deep" /> Historial
      </h2>
      {pagos.length === 0 ? (
        <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
          Aún no hay movimientos.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {pagos.map((p) => (
            <div key={p.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.concepto || 'Pago'}</p>
                <p className="text-xs text-ink-500">
                  {new Date(p.createdAt || Date.now()).toLocaleString('es-ES')}
                  {p.claseId && (
                    <> · <Link href={`/dashboard/clases/${p.claseId}`} className="hover:underline">Ver clase</Link></>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-base sm:text-lg">
                  {((p.amount || 0) / 100).toFixed(2)} €
                </p>
                <p className={`text-xs ${p.status === 'paid' ? 'text-green-700' : 'text-ink-500'}`}>
                  {p.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
