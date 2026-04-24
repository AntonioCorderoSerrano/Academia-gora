'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useConfirm } from '@/context/ConfirmContext';
import { UserCircle, Check, X as XIcon, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AprobacionesPage() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const confirm = useConfirm();
  const [pendientes, setPendientes] = useState([]);

  useEffect(() => {
    if (profile?.role !== ROLES.ADMIN) return;
    const unsub = onValue(ref(db, 'usuarios'), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .filter(([, u]) => !u.approved && (u.role === 'maestro' || u.role === 'admin'))
        .map(([uid, u]) => ({ uid, ...u }));
      setPendientes(list);
    });
    return () => unsub();
  }, [profile]);

  if (profile?.role !== ROLES.ADMIN) {
    return (
      <div className="card p-8 text-center animate-fade-up">
        <p className="text-ink-600">{t('common.sin_permiso')}</p>
      </div>
    );
  }

  const aprobar = async (u) => {
    const ok = await confirm({
      titulo: `¿Aprobar a ${u.nombre}?`,
      mensaje: `Se le dará acceso como ${u.role === 'maestro' ? 'docente' : 'admin'}.`,
    });
    if (!ok) return;
    const idToken = await user.getIdToken();
    const res = await fetch('/api/aprobaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ uid: u.uid }),
    });
    if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Error'); return; }
    toast.success('Usuario aprobado');
  };

  const rechazar = async (u) => {
    const ok = await confirm({
      titulo: `¿Rechazar a ${u.nombre}?`,
      mensaje: 'La cuenta se eliminará permanentemente.',
      peligroso: true,
    });
    if (!ok) return;
    const idToken = await user.getIdToken();
    const res = await fetch('/api/aprobaciones', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ uid: u.uid }),
    });
    if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Error'); return; }
    toast.success('Usuario rechazado');
  };

  return (
    <div>
      <div className="animate-fade-up mb-6">
        <h1 className="font-display text-3xl sm:text-4xl">{t('aprobaciones.titulo')}</h1>
        <p className="text-ink-600 text-sm sm:text-base mt-1">{t('aprobaciones.desc')}</p>
      </div>

      {pendientes.length === 0 ? (
        <div className="card p-10 text-center text-ink-500 animate-fade-up">
          <Clock size={28} className="mx-auto mb-3 text-ink-300" />
          {t('aprobaciones.sin_pendientes')}
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {pendientes.map((u, i) => (
            <div key={u.uid}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <UserCircle size={24} className="text-accent-deep shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.nombre}</p>
                  <p className="text-xs text-ink-500 truncate">
                    {u.email} · <span className="capitalize">{u.role === 'maestro' ? 'docente' : u.role}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => aprobar(u)}
                  className="btn bg-green-600 text-white hover:bg-green-700 text-sm">
                  <Check size={14} /> {t('aprobaciones.aprobar')}
                </button>
                <button onClick={() => rechazar(u)}
                  className="btn-ghost text-red-700 text-sm">
                  <XIcon size={14} /> {t('aprobaciones.rechazar')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
