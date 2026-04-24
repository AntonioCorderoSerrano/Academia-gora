'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ref, onValue, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { Users, Plus, Search, X, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MensajesPage() {
  const { user, profile } = useAuth();
  const [clases, setClases] = useState([]);
  const [chats, setChats] = useState([]);
  const [showNuevo, setShowNuevo] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    const unsubClases = onValue(ref(db, 'clases'), (snap) => {
      const data = snap.val() || {};
      const all = Object.entries(data).map(([id, c]) => ({ id, ...c }));
      let list = all;
      if (profile.role === ROLES.MAESTRO) list = all.filter((c) => c.maestroId === user.uid);
      else if (profile.role === ROLES.ALUMNO) list = all.filter((c) => c.alumnos && c.alumnos[user.uid]);
      else if (profile.role === ROLES.TUTOR) {
        list = all.filter((c) => c.alumnos && Object.values(c.alumnos).some((a) => a.tutorUid === user.uid));
      }
      setClases(list);
    });

    const unsubChats = onValue(ref(db, 'chatsPrivados'), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .filter(([_, c]) => c.meta?.participantes?.[user.uid])
        .map(([id, c]) => ({ id, ...c.meta }));
      setChats(list);
    });

    return () => { unsubClases(); unsubChats(); };
  }, [user, profile]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Mensajes</h1>
          <p className="text-ink-600 text-sm sm:text-base mt-1">
            Chats de clase y conversaciones privadas.
          </p>
        </div>
        <button onClick={() => setShowNuevo(true)} className="btn-accent">
          <Plus size={16} /> Nuevo chat privado
        </button>
      </div>

      {chats.length > 0 && (
        <section className="mb-6 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <h2 className="font-display text-xl mb-3">Conversaciones privadas</h2>
          <div className="card divide-y divide-ink-100">
            {chats.map((c, i) => {
              const otroUid = Object.keys(c.participantes || {}).find((u) => u !== user.uid);
              const otroNombre = c.nombres?.[otroUid] || 'Usuario';
              const otroRol = c.roles?.[otroUid] || '';
              return (
                <Link key={c.id} href={`/dashboard/mensajes/${c.id}`}
                  className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-ink-50/60 transition animate-fade-up"
                  style={{ animationDelay: `${100 + i * 40}ms` }}>
                  <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <UserCircle size={20} className="text-accent-deep" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{otroNombre}</p>
                    <p className="text-xs text-ink-500 capitalize">
                      {otroRol === 'maestro' ? 'docente' : otroRol}
                    </p>
                  </div>
                  <span className="text-ink-400 shrink-0">→</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="animate-fade-up" style={{ animationDelay: '140ms' }}>
        <h2 className="font-display text-xl mb-3">Chats de clase</h2>
        {clases.length === 0 ? (
          <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
            No hay clases con chat disponibles.
          </div>
        ) : (
          <div className="card divide-y divide-ink-100">
            {clases.map((c, i) => (
              <Link key={c.id} href={`/dashboard/clases/${c.id}?tab=chat`}
                className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-ink-50/60 transition animate-fade-up"
                style={{ animationDelay: `${180 + i * 40}ms` }}>
                <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-accent-deep" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.nombre}</p>
                  <p className="text-xs text-ink-500 truncate">
                    {c.alumnos ? Object.keys(c.alumnos).length : 0} participantes · {c.maestroNombre}
                  </p>
                </div>
                <span className="text-ink-400 shrink-0">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {showNuevo && <NuevoChat onClose={() => setShowNuevo(false)} />}
    </div>
  );
}

function NuevoChat({ onClose }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [iniciando, setIniciando] = useState(null);

  const buscar = async (q) => {
    setTermino(q);
    if (!q || q.length < 2) return setResultados([]);

    const qLower = q.toLowerCase();
    const usuariosSnap = await get(ref(db, 'usuarios'));
    const clasesSnap = await get(ref(db, 'clases'));
    const usuarios = usuariosSnap.val() || {};
    const clases = clasesSnap.val() || {};

    const candidatos = new Set();

    if (profile.role === 'admin') {
      Object.keys(usuarios).forEach((uid) => { if (uid !== user.uid) candidatos.add(uid); });
    } else if (profile.role === 'maestro') {
      Object.values(clases).forEach((c) => {
        if (c.maestroId !== user.uid || !c.alumnos) return;
        Object.entries(c.alumnos).forEach(([alumnoUid, a]) => {
          if (a.tutorUid) candidatos.add(a.tutorUid);
          else candidatos.add(alumnoUid);
        });
      });
    } else if (profile.role === 'alumno') {
      Object.values(clases).forEach((c) => {
        if (c.alumnos?.[user.uid] && c.maestroId) candidatos.add(c.maestroId);
      });
    } else if (profile.role === 'tutor') {
      Object.values(clases).forEach((c) => {
        if (!c.alumnos) return;
        const haymio = Object.values(c.alumnos).some((a) => a.tutorUid === user.uid);
        if (haymio && c.maestroId) candidatos.add(c.maestroId);
      });
    }

    const list = [];
    candidatos.forEach((uid) => {
      const u = usuarios[uid];
      if (!u) return;
      const matches =
        u.nombre?.toLowerCase().includes(qLower) ||
        u.email?.toLowerCase().includes(qLower);
      if (matches) list.push({ uid, ...u });
    });

    setResultados(list.slice(0, 8));
  };

  const iniciar = async (otroUid) => {
    setIniciando(otroUid);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ otroUid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      router.push(`/dashboard/mensajes/${data.chatId}`);
    } catch (err) {
      toast.error(err.message);
      setIniciando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-elegant animate-slide-up sm:animate-pop">
        <div className="border-b border-ink-100 p-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Nueva conversación</h2>
          <button onClick={onClose} className="btn-ghost" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="p-4 border-b border-ink-100">
          <div className="flex items-center bg-ink-50 rounded-lg">
            <Search size={16} className="ml-3 text-ink-400" />
            <input className="bg-transparent px-3 py-2 flex-1 outline-none text-sm"
              placeholder="Buscar por nombre o correo…"
              value={termino} onChange={(e) => buscar(e.target.value)} />
          </div>
          <p className="text-xs text-ink-500 mt-2">
            Solo aparecen personas con las que tienes vínculo.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {resultados.length === 0 && termino.length >= 2 && (
            <p className="text-center text-sm text-ink-500 py-6">Sin resultados.</p>
          )}
          {resultados.map((r, i) => (
            <button key={r.uid} onClick={() => iniciar(r.uid)}
              disabled={iniciando === r.uid}
              className="w-full text-left p-3 rounded-lg hover:bg-ink-50 flex items-center gap-3 transition animate-fade-up"
              style={{ animationDelay: `${i * 30}ms` }}>
              <UserCircle size={20} className="text-accent-deep shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{r.nombre}</p>
                <p className="text-xs text-ink-500 truncate">
                  {r.role === 'maestro' ? 'docente' : r.role} · {r.email}
                </p>
              </div>
              <span className="text-xs text-accent-deep">{iniciando === r.uid ? '…' : 'Chatear'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
