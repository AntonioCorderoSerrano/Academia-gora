'use client';

import { useState } from 'react';
import { ref as dbRef, push, remove, set, serverTimestamp } from 'firebase/database';
import {
  ref as stRef, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const formatBytes = (b) => {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
};

export default function TabMateriales({ clase, puedeGestionar }) {
  const { user, profile } = useAuth();
  const [subiendo, setSubiendo] = useState(false);

  const materiales = clase.materiales
    ? Object.entries(clase.materiales).map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    : [];

  const onUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Archivo demasiado grande (máx. 20 MB)');
      return;
    }
    setSubiendo(true);
    try {
      const path = `clases/${clase.id}/${Date.now()}_${file.name}`;
      const fileRef = stRef(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const newRef = push(dbRef(db, `clases/${clase.id}/materiales`));
      await set(newRef, {
        nombre: file.name,
        tipo: file.type,
        tamaño: file.size,
        url,
        storagePath: path,
        subidoPor: profile.nombre,
        subidoPorUid: user.uid,
        createdAt: serverTimestamp(),
      });
      toast.success('Archivo subido');
    } catch (err) {
      console.error(err);
      toast.error('Error al subir');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  const eliminar = async (m) => {
    if (!confirm(`¿Eliminar "${m.nombre}"?`)) return;
    try {
      if (m.storagePath) await deleteObject(stRef(storage, m.storagePath));
    } catch (e) {
      // si el archivo ya no existe en Storage, seguimos
    }
    await remove(dbRef(db, `clases/${clase.id}/materiales/${m.id}`));
    toast.success('Archivo eliminado');
  };

  return (
    <div>
      {puedeGestionar && (
        <label className="card p-6 mb-6 flex items-center justify-center cursor-pointer border-dashed border-2 border-ink-200 hover:border-accent transition block">
          <input type="file" className="hidden" onChange={onUpload} disabled={subiendo} />
          <div className="text-center">
            <Upload size={28} className="mx-auto text-accent-deep" strokeWidth={1.5} />
            <p className="font-medium mt-2">
              {subiendo ? 'Subiendo…' : 'Subir material'}
            </p>
            <p className="text-xs text-ink-500">PDF, imágenes, docs — máx. 20 MB</p>
          </div>
        </label>
      )}

      {materiales.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">
          Aún no hay materiales.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {materiales.map((m) => (
            <div key={m.id} className="p-4 flex items-center gap-4">
              <FileText size={20} className="text-accent-deep shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{m.nombre}</p>
                <p className="text-xs text-ink-500">
                  {formatBytes(m.tamaño || 0)} · Subido por {m.subidoPor}
                </p>
              </div>
              <a href={m.url} target="_blank" rel="noreferrer" className="btn-ghost">
                <Download size={16} />
              </a>
              {(puedeGestionar || m.subidoPorUid === user.uid) && (
                <button onClick={() => eliminar(m)} className="btn-ghost text-red-700">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
