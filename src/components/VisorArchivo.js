'use client';

import { useEffect } from 'react';
import { X, FileText, Image as ImgIcon, Lock } from 'lucide-react';

/**
 * Visor que renderiza el archivo en pantalla completa pero bloquea
 * descarga, arrastre, selección y menú contextual.
 *
 * Limitaciones honestas: técnicamente, cualquier contenido que el navegador
 * descarga para mostrarlo está accesible desde DevTools (F12 > Network).
 * Esto es una barrera práctica contra usuarios casuales, no una protección
 * criptográfica. La protección real requiere DRM (Widevine, etc).
 */
export default function VisorArchivo({ url, nombre, tipo, onClose }) {
  useEffect(() => {
    // Bloquear ESC para cerrar
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);

    // Bloquear menú contextual global mientras está abierto
    const blockMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', blockMenu);

    // Bloquear atajos de guardado/impresión
    const blockShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'S', 'p', 'P'].includes(e.key)) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', blockShortcut);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('contextmenu', blockMenu);
      document.removeEventListener('keydown', blockShortcut);
    };
  }, [onClose]);

  const esPDF = tipo?.includes('pdf') || nombre?.toLowerCase().endsWith('.pdf');
  const esImagen = tipo?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(nombre || '');
  const esVideo = tipo?.startsWith('video/') ||
    /\.(mp4|webm|mov)$/i.test(nombre || '');

  return (
    <div className="fixed inset-0 z-[60] bg-ink-900/95 flex flex-col"
      onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-ink-900 text-ink-50 border-b border-ink-800 safe-top">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={18} className="text-accent-soft shrink-0" />
          <span className="font-medium truncate">{nombre}</span>
          <span className="chip bg-ink-800 text-ink-300 text-[10px] hidden sm:inline-flex ml-2">
            <Lock size={10} /> Solo lectura
          </span>
        </div>
        <button onClick={onClose}
          className="text-ink-300 hover:text-ink-50 p-2 -mr-2"
          aria-label="Cerrar visor">
          <X size={20} />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto bg-ink-800 no-download">
        {esPDF && (
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
            className="w-full h-full"
            title={nombre}
          />
        )}

        {esImagen && (
          <div className="flex items-center justify-center min-h-full p-4">
            <img src={url} alt={nombre}
              className="max-w-full max-h-full object-contain pointer-events-none select-none"
              draggable={false} />
          </div>
        )}

        {esVideo && (
          <div className="flex items-center justify-center min-h-full p-4">
            <video src={url}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              className="max-w-full max-h-full"
              onContextMenu={(e) => e.preventDefault()} />
          </div>
        )}

        {!esPDF && !esImagen && !esVideo && (
          <div className="flex flex-col items-center justify-center min-h-full p-10 text-center text-ink-300">
            <FileText size={48} className="mb-4 text-accent-soft" strokeWidth={1.2} />
            <p className="font-display text-2xl text-ink-100">Vista previa no disponible</p>
            <p className="text-sm mt-2 max-w-md">
              Este tipo de archivo no se puede previsualizar. Por seguridad, la descarga
              está deshabilitada en esta plataforma.
            </p>
          </div>
        )}
      </div>

      <div className="bg-ink-900 text-ink-400 text-xs text-center py-2 safe-bottom">
        Solo lectura · La descarga está deshabilitada
      </div>
    </div>
  );
}
