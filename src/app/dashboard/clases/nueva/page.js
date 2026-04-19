'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { push, ref, serverTimestamp, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NuevaClasePage() {
  const { user, profile, hasRole } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '', descripcion: '', nivel: 'Principiante',
    horario: '', precio: 0, tipoCobro: 'gratis', cupoMax: 20,
  });
  const [loading, setLoading] = useState(false);

  if (!hasRole(ROLES.ADMIN, ROLES.MAESTRO)) {
    return (
      <div className="card p-8 sm:p-10 text-center">
        <p className="text-ink-600">No tienes permisos para crear clases.</p>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newRef = push(ref(db, 'clases'));
      await set(newRef, {
        ...form,
        precio: Number(form.precio),
        cupoMax: Number(form.cupoMax),
        maestroId: user.uid,
        maestroNombre: profile.nombre,
        alumnos: {},
        materiales: {},
        createdAt: serverTimestamp(),
      });
      toast.success('Clase creada');
      router.push(`/dashboard/clases/${newRef.key}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al crear la clase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/dashboard/clases" className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-4 sm:mb-6">
        <ArrowLeft size={16} /> Volver
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl mb-2">Nueva clase</h1>
      <p className="text-ink-600 mb-6 sm:mb-8 text-sm sm:text-base">Completa la información. Podrás editarla luego.</p>

      <form onSubmit={onSubmit} className="card p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 max-w-2xl">
        <div>
          <label className="text-sm text-ink-700">Nombre de la clase</label>
          <input required className="field mt-1"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>

        <div>
          <label className="text-sm text-ink-700">Descripción</label>
          <textarea rows={4} className="field mt-1"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-ink-700">Nivel</label>
            <select className="field mt-1"
              value={form.nivel}
              onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
              <option>Principiante</option>
              <option>Intermedio</option>
              <option>Avanzado</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-ink-700">Horario</label>
            <input placeholder="Lun y Mié 18:00" className="field mt-1"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-ink-700">Cupo máximo</label>
            <input type="number" min={1} className="field mt-1"
              value={form.cupoMax}
              onChange={(e) => setForm({ ...form, cupoMax: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-ink-700">Modelo de cobro</label>
            <select className="field mt-1"
              value={form.tipoCobro}
              onChange={(e) => setForm({ ...form, tipoCobro: e.target.value })}>
              <option value="gratis">Gratis (incluida en suscripción)</option>
              <option value="unico">Pago único al inscribirse</option>
            </select>
          </div>
          {form.tipoCobro === 'unico' && (
            <div>
              <label className="text-sm text-ink-700">Precio (€)</label>
              <input type="number" min={0} step="0.01" className="field mt-1"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })} />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button disabled={loading} className="btn-accent w-full sm:w-auto">
            {loading ? 'Creando…' : 'Crear clase'}
          </button>
          <Link href="/dashboard/clases" className="btn-ghost w-full sm:w-auto text-center">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
