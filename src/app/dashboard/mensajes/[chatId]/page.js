'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Send, UserCircle } from 'lucide-react';

export default function ChatPrivado() {
  const { chatId } = useParams();
  const { user, profile } = useAuth();
  const [meta, setMeta] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const unsubMeta = onValue(ref(db, `chatsPrivados/${chatId}/meta`), (snap) => {
      setMeta(snap.val());
    });
    const unsubMsg = onValue(ref(db, `chatsPrivados/${chatId}/mensajes`), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMensajes(list);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return () => { unsubMeta(); unsubMsg(); };
  }, [chatId, user]);

  const otroUid = meta ? Object.keys(meta.participantes || {}).find((u) => u !== user.uid) : null;
  const otroNombre = meta?.nombres?.[otroUid] || 'Usuario';
  const otroRol = meta?.roles?.[otroUid] || '';

  // Bloquear si el chat no existe o no soy participante
  if (meta && !meta.participantes?.[user.uid]) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-700 font-display text-lg">No tienes acceso a este chat</p>
        <Link href="/dashboard/mensajes" className="btn-outline mt-4 inline-flex">Volver</Link>
      </div>
    );
  }

  const enviar = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    await push(ref(db, `chatsPrivados/${chatId}/mensajes`), {
      texto: texto.trim(),
      autorUid: user.uid,
      autorNombre: profile.nombre,
      createdAt: serverTimestamp(),
    });
    setTexto('');
  };

  return (
    <div>
      <Link href="/dashboard/mensajes" className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-3 sm:mb-4">
        <ArrowLeft size={16} /> Volver a mensajes
      </Link>

      <div className="card p-4 mb-3 sm:mb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
          <UserCircle size={20} className="text-accent-deep" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{otroNombre}</p>
          <p className="text-xs text-ink-500 capitalize">
            {otroRol === 'maestro' ? 'docente' : otroRol}
          </p>
        </div>
      </div>

      <div className="card flex flex-col h-[calc(100vh-260px)] min-h-[400px]">
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
          {mensajes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-ink-400 text-sm">
              Inicia la conversación
            </div>
          ) : (
            mensajes.map((m) => {
              const mio = m.autorUid === user.uid;
              return (
                <div key={m.id} className={`flex ${mio ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 ${
                    mio ? 'bg-ink-900 text-ink-50' : 'bg-ink-100 text-ink-900'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.texto}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={enviar} className="border-t border-ink-100 p-2 sm:p-3 flex gap-2">
          <input value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje…"
            className="field" />
          <button className="btn-primary shrink-0">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
