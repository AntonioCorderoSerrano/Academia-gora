'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { getStripe } from '@/lib/stripeClient';
import toast from 'react-hot-toast';
import { Check, CreditCard, Receipt } from 'lucide-react';

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

  const suscribirse = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stripe/checkout-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, email: profile.email, nombre: profile.nombre }),
      });
      const { sessionId, error } = await res.json();
      if (error) throw new Error(error);
      const stripe = await getStripe();
      await stripe.redirectToCheckout({ sessionId });
    } catch (err) {
      toast.error('Error al iniciar la suscripción');
    } finally {
      setLoading(false);
    }
  };

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
      toast.error('No se pudo abrir el portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl sm:text-4xl mb-1 sm:mb-2">Pagos y suscripción</h1>
      <p className="text-ink-600 mb-6 sm:mb-8 text-sm sm:text-base">
        Gestiona tu membresía y consulta tu historial.
      </p>

      <div className="card p-5 sm:p-6 md:p-8 mb-6 sm:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-widest text-accent-deep">
              Suscripción mensual
            </p>
            <h2 className="font-display text-2xl sm:text-3xl mt-1">
              {profile.suscripcionActiva ? 'Membresía activa' : 'Sin membresía'}
            </h2>
            <p className="text-ink-600 mt-2 text-sm sm:text-base">
              Acceso a todas las clases incluidas. Las premium se pagan aparte.
            </p>
            {profile.suscripcionActiva && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-green-700">
                <Check size={16} /> Tu membresía está al día
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            {!profile.suscripcionActiva ? (
              <button onClick={suscribirse} disabled={loading} className="btn-accent w-full md:w-auto">
                <CreditCard size={16} />
                {loading ? 'Redirigiendo…' : 'Suscribirme'}
              </button>
            ) : (
              <button onClick={abrirPortal} disabled={loading} className="btn-outline w-full md:w-auto">
                Gestionar suscripción
              </button>
            )}
          </div>
        </div>
      </div>

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
