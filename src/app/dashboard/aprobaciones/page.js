'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { Check, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AprobacionesPage() {
  const { hasRole } = useAuth();
  const [pendientes, setPendientes] = useState([]);

  useEffect(() => {
    const unsub = onValue(ref(db, 'usuarios'), (snap) => {
      const data = snap.val() || {};
      setPendientes(
        Object.entries(data)
          .map(([uid, u]) => ({ uid, ...u }))
          .filter((u) => !u.approved && u.role !== 'admin')
      );
    });
    return () => unsub();
  }, []);

  if (!hasRole(ROLES.ADMIN)) {
    return <div className="card p-10 text-center text-ink-500">Solo administradores.</div>;
  }

  const aprobar = async (uid) => {
    await update(ref(db, `usuarios/${uid}`), {
      approved: true,
      approvedAt: Date.now(),
    });
    toast.success('Cuenta aprobada');
  };

  const rechazar = async (uid) => {
    if (!confirm('¿Rechazar y eliminar esta cuenta? El usuario perderá acceso.')) return;
    await remove(ref(db, `usuarios/${uid}`));
    toast.success('Cuenta rechazada');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="text-accent-deep" />
        <h1 className="font-display text-4xl">Aprobaciones</h1>
      </div>
      <p className="text-ink-600 mb-8">
        Cuentas pendientes de validación ({pendientes.length}).
      </p>

      {pendientes.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">
          No hay cuentas pendientes ✨
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {pendientes.map((u) => (
            <div key={u.uid} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-medium">{u.nombre}</p>
                <p className="text-sm text-ink-500">{u.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className="chip bg-accent/10 text-accent-deep capitalize">{u.role}</span>
                  {u.sinCobro && <span className="chip bg-ink-100 text-ink-700">Exento de pago</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => aprobar(u.uid)} className="btn-accent text-sm">
                  <Check size={16} /> Aprobar
                </button>
                <button onClick={() => rechazar(u.uid)} className="btn-ghost text-red-700 text-sm">
                  <X size={16} /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
