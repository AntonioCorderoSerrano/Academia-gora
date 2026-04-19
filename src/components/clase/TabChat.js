'use client';

import { useEffect, useRef, useState } from 'react';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Send } from 'lucide-react';

export default function TabChat({ clase }) {
  const { user, profile } = useAuth();
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    const unsub = onValue(ref(db, `mensajes/${clase.id}`), (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMensajes(list);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return () => unsub();
  }, [clase.id]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    await push(ref(db, `mensajes/${clase.id}`), {
      texto: texto.trim(),
      autorUid: user.uid,
      autorNombre: profile.nombre,
      autorRol: profile.role,
      createdAt: serverTimestamp(),
    });
    setTexto('');
  };

  const puedeEscribir =
    clase.maestroId === user.uid ||
    profile.role === 'admin' ||
    (clase.alumnos && clase.alumnos[user.uid]);

  return (
    <div className="card flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mensajes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-ink-400">
            Inicia la conversación
          </div>
        ) : (
          mensajes.map((m) => {
            const mio = m.autorUid === user.uid;
            return (
              <div key={m.id} className={`flex ${mio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  mio ? 'bg-ink-900 text-ink-50' : 'bg-ink-100 text-ink-900'
                }`}>
                  {!mio && (
                    <p className="text-xs font-medium text-accent-deep mb-0.5">
                      {m.autorNombre}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.texto}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {puedeEscribir ? (
        <form onSubmit={enviar} className="border-t border-ink-100 p-3 flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje…"
            className="field"
          />
          <button className="btn-primary">
            <Send size={16} />
          </button>
        </form>
      ) : (
        <div className="border-t border-ink-100 p-3 text-center text-sm text-ink-500">
          Inscríbete a la clase para participar en el chat.
        </div>
      )}
    </div>
  );
}
