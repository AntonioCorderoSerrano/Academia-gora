'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, push, set, remove, update, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { Plus, Trash2, Edit2, X, UserCircle, Link2, Link2Off } from 'lucide-react';
import toast from 'react-hot-toast';

const VACIO = {
  nombre: '', apellidos: '', fechaNacimiento: '',
  alergias: '', medicacion: '', observaciones: '',
  contactoEmergencia: '', telefonoEmergencia: '',
  emailAlumno: '', // Opcional: si el hijo ya tiene cuenta propia
};

export default function HijosPage() {
  const { user, profile } = useAuth();
  const [hijos, setHijos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `hijos/${user.uid}`), (snap) => {
      const data = snap.val() || {};
      setHijos(Object.entries(data).map(([id, h]) => ({ id, ...h })));
    });
    return () => unsub();
  }, [user]);

  if (profile.role !== ROLES.TUTOR && profile.role !== ROLES.ADMIN) {
    return (
      <div className="card p-8 sm:p-10 text-center animate-fade-up">
        <p className="text-ink-600">Solo los tutores pueden gestionar perfiles de hijos.</p>
      </div>
    );
  }

  const abrirNuevo = () => { setForm(VACIO); setEditando('nuevo'); };
  const abrirEditar = (h) => {
    setForm({
      nombre: h.nombre || '', apellidos: h.apellidos || '',
      fechaNacimiento: h.fechaNacimiento || '',
      alergias: h.alergias || '', medicacion: h.medicacion || '',
      observaciones: h.observaciones || '',
      contactoEmergencia: h.contactoEmergencia || '',
      telefonoEmergencia: h.telefonoEmergencia || '',
      emailAlumno: h.vinculadoConEmail || '',
    });
    setEditando(h.id);
  };
  const cerrar = () => { setEditando(null); setForm(VACIO); };

  // Vincula o desvincula vía endpoint server-side
  const sincronizarVinculacion = async (hijoId, emailAlumno) => {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/hijos/vincular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ hijoId, emailAlumno }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al vincular');
    return data;
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }

    setGuardando(true);
    try {
      const datosBase = {
        nombre: form.nombre,
        apellidos: form.apellidos,
        fechaNacimiento: form.fechaNacimiento,
        alergias: form.alergias,
        medicacion: form.medicacion,
        observaciones: form.observaciones,
        contactoEmergencia: form.contactoEmergencia,
        telefonoEmergencia: form.telefonoEmergencia,
      };

      let hijoId;
      if (editando === 'nuevo') {
        const nuevoRef = push(ref(db, `hijos/${user.uid}`));
        await set(nuevoRef, { ...datosBase, createdAt: serverTimestamp() });
        hijoId = nuevoRef.key;
      } else {
        hijoId = editando;
        await update(ref(db, `hijos/${user.uid}/${editando}`), {
          ...datosBase, updatedAt: serverTimestamp(),
        });
      }

      // Vincular/desvincular si cambió
      const emailNuevo = form.emailAlumno?.trim().toLowerCase() || '';
      const hijoExistente = hijos.find((h) => h.id === editando);
      const emailAnterior = hijoExistente?.vinculadoConEmail || '';

      if (emailNuevo !== emailAnterior) {
        try {
          const result = await sincronizarVinculacion(hijoId, emailNuevo);
          if (result.vinculado) {
            toast.success(`Vinculado con ${result.alumnoNombre}`);
          } else if (emailAnterior) {
            toast.success('Desvinculado');
          }
        } catch (err) {
          toast.error(err.message);
          // No abortamos: el resto se guardó bien
        }
      }

      toast.success('Guardado');
      cerrar();
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este perfil? Sus inscripciones existentes no se borran.')) return;
    await remove(ref(db, `hijos/${user.uid}/${id}`));
    toast.success('Perfil eliminado');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Mis hijos</h1>
          <p className="text-ink-600 text-sm sm:text-base mt-1">
            Gestiona los perfiles que usarás para inscribir a clases y campamentos.
          </p>
        </div>
        {!editando && (
          <button onClick={abrirNuevo} className="btn-accent">
            <Plus size={16} /> Añadir hijo/a
          </button>
        )}
      </div>

      {editando && (
        <form onSubmit={guardar} className="card p-5 sm:p-6 mb-6 space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">
              {editando === 'nuevo' ? 'Nuevo perfil' : 'Editar perfil'}
            </h2>
            <button type="button" onClick={cerrar} className="btn-ghost" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-ink-700">Nombre *</label>
              <input required className="field mt-1"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-ink-700">Apellidos</label>
              <input className="field mt-1"
                value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm text-ink-700">Fecha de nacimiento</label>
            <input type="date" className="field mt-1 max-w-xs"
              value={form.fechaNacimiento}
              onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} />
          </div>

          {/* Vinculación con cuenta de alumno */}
          <div className="p-3 sm:p-4 rounded-lg bg-accent/5 border border-accent/20">
            <label className="text-sm text-ink-700 font-medium flex items-center gap-2">
              <Link2 size={14} className="text-accent-deep" />
              Vincular con cuenta de alumno (opcional)
            </label>
            <input type="email" className="field mt-2"
              placeholder="email@del-alumno.com"
              value={form.emailAlumno}
              onChange={(e) => setForm({ ...form, emailAlumno: e.target.value })} />
            <p className="text-xs text-ink-500 mt-2">
              Si tu hijo/a ya tiene cuenta propia en Skolium, introduce su email aquí.
              Las inscripciones que hagas en su nombre se asociarán a su cuenta — no se duplicará.
              Déjalo vacío si no tiene cuenta propia.
            </p>
          </div>

          <div>
            <label className="text-sm text-ink-700">Alergias</label>
            <textarea rows={2} className="field mt-1"
              placeholder="Ej. frutos secos, lactosa, polen…"
              value={form.alergias}
              onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
          </div>

          <div>
            <label className="text-sm text-ink-700">Medicación habitual</label>
            <textarea rows={2} className="field mt-1"
              value={form.medicacion}
              onChange={(e) => setForm({ ...form, medicacion: e.target.value })} />
          </div>

          <div>
            <label className="text-sm text-ink-700">Observaciones</label>
            <textarea rows={3} className="field mt-1"
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-ink-700">Contacto de emergencia</label>
              <input className="field mt-1" placeholder="Nombre de un familiar"
                value={form.contactoEmergencia}
                onChange={(e) => setForm({ ...form, contactoEmergencia: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-ink-700">Teléfono de emergencia</label>
              <input type="tel" className="field mt-1"
                value={form.telefonoEmergencia}
                onChange={(e) => setForm({ ...form, telefonoEmergencia: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button disabled={guardando} className="btn-accent">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={cerrar} className="btn-ghost">Cancelar</button>
          </div>
        </form>
      )}

      {hijos.length === 0 && !editando ? (
        <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base animate-fade-up">
          Aún no has añadido ningún perfil. Añade uno para poder inscribirlo a clases y campamentos.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {hijos.map((h, i) => (
            <div key={h.id}
              className="card p-4 sm:p-5 animate-fade-up"
              style={{ animationDelay: `${60 + i * 60}ms` }}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <UserCircle size={22} className="text-accent-deep" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{h.nombre} {h.apellidos}</p>
                  {h.fechaNacimiento && (
                    <p className="text-xs text-ink-500">
                      {new Date(h.fechaNacimiento).toLocaleDateString('es-ES')}
                    </p>
                  )}
                  {h.vinculadoConUid ? (
                    <p className="text-[11px] text-accent-deep mt-1.5 flex items-center gap-1">
                      <Link2 size={11} /> Vinculado: {h.vinculadoConEmail}
                    </p>
                  ) : (
                    <p className="text-[11px] text-ink-400 mt-1.5 flex items-center gap-1">
                      <Link2Off size={11} /> Sin cuenta propia
                    </p>
                  )}
                  {h.alergias && (
                    <p className="text-xs text-amber-700 mt-2">⚠ {h.alergias}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4 border-t border-ink-100 pt-3">
                <button onClick={() => abrirEditar(h)} className="btn-outline text-sm flex-1">
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => eliminar(h.id)} className="btn-ghost text-red-700 text-sm">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
