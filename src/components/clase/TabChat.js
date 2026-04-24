'use client';

import { useEffect, useRef, useState } from 'react';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { Send, UserCircle } from 'lucide-react';

export default function TabChat({ clase, hijosEn = [] }) {
  const { user, profile } = useAuth();
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [hijoHablando, setHijoHablando] = useState(
    hijosEn.length > 0 ? hijosEn[0].uid : null
  );
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

  const esTutor = profile.role === ROLES.TUTOR;

  const enviar = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;

    let autorLabel = profile.nombre;
    let extra = {};

    // Si es tutor hablando por un hijo concreto
    if (esTutor && hijoHablando) {
      const hijo = hijosEn.find((h) => h.uid === hijoHablando);
      if (hijo) {
        autorLabel = `${profile.nombre} (tutor/a de ${hijo.nombre})`;
        extra = { enNombreDe: hijo.uid, enNombreDeNombre: hijo.nombre };
      }
    }

    await push(ref(db, `mensajes/${clase.id}`), {
      texto: texto.trim(),
      autorUid: user.uid,
      autorNombre: autorLabel,
      autorRol: profile.role,
      createdAt: serverTimestamp(),
      ...extra,
    });
    setTexto('');
  };

  return (
    <div className="card flex flex-col h-[calc(100vh-300px)] min-h-[400px]">
      {esTutor && hijosEn.length > 1 && (
        <div className="border-b border-ink-100 p-3 flex items-center gap-2 text-sm bg-accent/5">
          <span className="text-ink-600 shrink-0">Hablando como tutor/a de:</span>
          <select value={hijoHablando || ''}
            onChange={(e) => setHijoHablando(e.target.value)}
            className="bg-white border border-ink-200 rounded px-2 py-1 text-sm">
            {hijosEn.map((h) => (
              <option key={h.uid} value={h.uid}>{h.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
        {mensajes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-ink-400 text-sm">
            Inicia la conversación de clase
          </div>
        ) : (
          mensajes.map((m) => {
            const mio = m.autorUid === user.uid;
            return (
              <div key={m.id} className={`flex ${mio ? 'justify-end' : 'justify-start'} animate-fade-up`}>
                <div className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 ${
                  mio ? 'bg-ink-900 text-ink-50' : 'bg-ink-100 text-ink-900'
                }`}>
                  {!mio && (
                    <p className={`text-[10px] font-medium mb-0.5 ${
                      m.autorRol === 'maestro' ? 'text-accent-deep' : 'text-ink-500'
                    }`}>
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
  );
}
