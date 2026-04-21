'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue, push, set, remove, update, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { Plus, Trash2, Edit2, X, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const VACIO = {
  nombre: '',
  apellidos: '',
  fechaNacimiento: '',
  alergias: '',
  medicacion: '',
  observaciones: '',
  contactoEmergencia: '',
  telefonoEmergencia: '',
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
      <div className="card p-8 sm:p-10 text-center">
        <p className="text-ink-600">Solo los tutores pueden gestionar perfiles de hijos.</p>
      </div>
    );
  }

  const abrirNuevo = () => {
    setForm(VACIO);
    setEditando('nuevo');
  };

  const abrirEditar = (h) => {
    setForm({
      nombre: h.nombre || '',
      apellidos: h.apellidos || '',
      fechaNacimiento: h.fechaNacimiento || '',
      alergias: h.alergias || '',
      medicacion: h.medicacion || '',
      observaciones: h.observaciones || '',
      contactoEmergencia: h.contactoEmergencia || '',
      telefonoEmergencia: h.telefonoEmergencia || '',
    });
    setEditando(h.id);
  };

  const cerrar = () => { setEditando(null); setForm(VACIO); };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      if (editando === 'nuevo') {
        const nuevoRef = push(ref(db, `hijos/${user.uid}`));
        await set(nuevoRef, { ...form, createdAt: serverTimestamp() });
      } else {
        await update(ref(db, `hijos/${user.uid}/${editando}`), {
          ...form, updatedAt: serverTimestamp(),
        });
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
    if (!confirm('¿Eliminar este perfil? Sus inscripciones existentes no se borran, pero no podrás inscribirlo a nuevas clases.')) return;
    await remove(ref(db, `hijos/${user.uid}/${id}`));
    toast.success('Perfil eliminado');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
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
        <form onSubmit={guardar} className="card p-5 sm:p-6 mb-6 space-y-4">
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

          <div>
            <label className="text-sm text-ink-700">Alergias alimentarias o medicamentosas</label>
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
            <label className="text-sm text-ink-700">Observaciones médicas o de comportamiento</label>
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
        <div className="card p-8 sm:p-10 text-center text-ink-500 text-sm sm:text-base">
          Aún no has añadido ningún perfil. Añade uno para poder inscribirlo a clases y campamentos.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {hijos.map((h) => (
            <div key={h.id} className="card p-4 sm:p-5">
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
