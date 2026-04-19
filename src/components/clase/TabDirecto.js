'use client';

import { useState } from 'react';
import { ref, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Video, Play, Film, Calendar, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TabDirecto({ clase, puedeGestionar }) {
  const { user } = useAuth();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [grabaciones, setGrabaciones] = useState(null);
  const [form, setForm] = useState({
    topic: clase.nombre,
    start_time: '',
    duration: 60,
  });

  const meeting = clase.zoomMeeting;

  const crearReunion = async (e) => {
    e.preventDefault();
    setLoadingCreate(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/zoom/create-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          claseId: clase.id,
          topic: form.topic,
          start_time: form.start_time ? new Date(form.start_time).toISOString() : undefined,
          duration: Number(form.duration),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear reunión');
      toast.success('Reunión creada');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingCreate(false);
    }
  };

  const cargarGrabaciones = async () => {
    if (!meeting?.id) return;
    setLoadingRecs(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/zoom/recordings?meetingId=${meeting.id}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando grabaciones');
      setGrabaciones(data.recording_files || []);
    } catch (err) {
      toast.error(err.message);
      setGrabaciones([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  const borrarReunion = async () => {
    if (!confirm('¿Eliminar la reunión de Zoom de esta clase?')) return;
    await remove(ref(db, `clases/${clase.id}/zoomMeeting`));
    toast.success('Reunión desvinculada');
  };

  // Vista alumno
  if (!puedeGestionar) {
    return (
      <div className="space-y-5 sm:space-y-6">
        {meeting ? (
          <div className="card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-accent/15 flex items-center justify-center">
                <Video size={18} className="text-accent-deep" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg sm:text-xl">{meeting.topic}</h3>
                {meeting.start_time && (
                  <p className="text-xs sm:text-sm text-ink-500">
                    {new Date(meeting.start_time).toLocaleString('es-ES')}
                    {meeting.duration ? ` · ${meeting.duration} min` : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
              <a href={meeting.join_url} target="_blank" rel="noreferrer" className="btn-accent w-full sm:w-auto">
                <Play size={16} /> Entrar al directo
              </a>
              <button onClick={cargarGrabaciones} className="btn-outline w-full sm:w-auto">
                <Film size={16} /> Ver diferido
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
            Tu maestro aún no ha programado la clase en directo.
          </div>
        )}

        <GrabacionesList loading={loadingRecs} items={grabaciones} />
      </div>
    );
  }

  // Vista maestro
  return (
    <div className="space-y-5 sm:space-y-6">
      {meeting ? (
        <div className="card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg sm:text-xl break-words">{meeting.topic}</h3>
              {meeting.start_time && (
                <p className="text-xs sm:text-sm text-ink-500 flex items-center gap-1 mt-1">
                  <Calendar size={14} />
                  {new Date(meeting.start_time).toLocaleString('es-ES')} · {meeting.duration} min
                </p>
              )}
              <p className="text-xs text-ink-500 mt-2 break-all">
                ID: <span className="font-mono">{meeting.id}</span>
              </p>
            </div>
            <button onClick={borrarReunion} className="btn-ghost text-red-700 self-start">
              <Trash2 size={16} />
            </button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
            <a href={meeting.start_url} target="_blank" rel="noreferrer" className="btn-accent w-full sm:w-auto">
              <Play size={16} /> Iniciar como host
            </a>
            <a href={meeting.join_url} target="_blank" rel="noreferrer" className="btn-outline w-full sm:w-auto">
              <ExternalLink size={16} /> Enlace alumno
            </a>
            <button onClick={cargarGrabaciones} className="btn-outline w-full sm:w-auto">
              {loadingRecs ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
              Ver grabaciones
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-lg sm:text-xl mb-1">Programar clase en directo</h3>
          <p className="text-xs sm:text-sm text-ink-500 mb-4">
            Se creará una reunión de Zoom con grabación en la nube activada.
          </p>
          <form onSubmit={crearReunion} className="space-y-4">
            <div>
              <label className="text-sm text-ink-700">Título</label>
              <input required className="field mt-1"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-ink-700">Fecha y hora (opcional)</label>
                <input type="datetime-local" className="field mt-1"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                <p className="text-xs text-ink-500 mt-1">Si se deja vacío → reunión instantánea.</p>
              </div>
              <div>
                <label className="text-sm text-ink-700">Duración (min)</label>
                <input type="number" min={15} max={480} className="field mt-1"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
            </div>
            <button disabled={loadingCreate} className="btn-primary w-full sm:w-auto">
              {loadingCreate ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
              Crear reunión
            </button>
          </form>
        </div>
      )}

      <GrabacionesList loading={loadingRecs} items={grabaciones} />
    </div>
  );
}

function GrabacionesList({ loading, items }) {
  if (items === null) return null;
  if (loading) return <p className="text-sm text-ink-500">Cargando grabaciones…</p>;
  if (!items?.length) {
    return (
      <div className="card p-5 sm:p-6 text-center text-ink-500 text-sm">
        Aún no hay grabaciones disponibles.
      </div>
    );
  }
  return (
    <div>
      <h3 className="font-display text-lg mb-3">Grabaciones</h3>
      <div className="card divide-y divide-ink-100">
        {items.map((r) => (
          <div key={r.id} className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <Film size={18} className="text-accent-deep shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm sm:text-base truncate">{r.recording_type || 'Grabación'}</p>
              <p className="text-xs text-ink-500">
                {r.recording_start && new Date(r.recording_start).toLocaleString('es-ES')}
                {r.file_size ? ` · ${(r.file_size / 1048576).toFixed(1)} MB` : ''}
              </p>
            </div>
            <a href={r.play_url} target="_blank" rel="noreferrer" className="btn-outline text-sm shrink-0">
              <Play size={14} /> Ver
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
