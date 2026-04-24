export const TIPO_CLASE = {
  REGULAR: 'regular',
  PRIVADA: 'privada',
  CAMPAMENTO: 'campamento',
};

export const LABEL_TIPO = {
  [TIPO_CLASE.REGULAR]: 'Clase regular',
  [TIPO_CLASE.PRIVADA]: 'Clase privada',
  [TIPO_CLASE.CAMPAMENTO]: 'Campamento',
};

export const MODALIDAD_REGULAR = {
  ACADEMICA: 'academica',
  DURACION: 'duracion',
  GRATIS: 'gratis',
};

export const UNIDAD_PRIVADA = { HORAS: 'horas', DIAS: 'dias' };
export const UNIDAD_DURACION = { MESES: 'meses', SEMANAS: 'semanas' };

/**
 * Cuenta inscripciones (la lista viene de la tabla `inscripciones`).
 * Se le pasa el array de inscripciones de la clase.
 */
export function contarInscripciones(inscripciones, sedeId = null) {
  if (!inscripciones?.length) return 0;
  if (sedeId) return inscripciones.filter((a) => a.sede_id === sedeId).length;
  return inscripciones.length;
}

export function tieneCupo(clase, inscripciones, sedeId = null) {
  if (clase.tipo === TIPO_CLASE.CAMPAMENTO && sedeId) {
    const sede = clase.sedes?.[sedeId];
    if (!sede) return false;
    return contarInscripciones(inscripciones, sedeId) < (sede.cupoMax || 0);
  }
  return contarInscripciones(inscripciones) < (clase.cupo_max || 0);
}

export function cupoRestante(clase, inscripciones, sedeId = null) {
  if (clase.tipo === TIPO_CLASE.CAMPAMENTO && sedeId) {
    const sede = clase.sedes?.[sedeId];
    if (!sede) return 0;
    return Math.max(0, (sede.cupoMax || 0) - contarInscripciones(inscripciones, sedeId));
  }
  return Math.max(0, (clase.cupo_max || 0) - contarInscripciones(inscripciones));
}

export function calcularCuotasAcademicas(fechaInicio = new Date()) {
  const d = new Date(fechaInicio);
  const año = d.getFullYear();
  const mes = d.getMonth();
  let añoFin;
  if (mes >= 8) añoFin = año + 1;
  else añoFin = mes >= 6 ? año + 1 : año;
  const finDate = new Date(añoFin, 5, 30);
  const meses = (finDate.getFullYear() - d.getFullYear()) * 12 + (finDate.getMonth() - d.getMonth()) + 1;
  return Math.max(1, Math.min(10, meses));
}

export function estaInscritoPorMi(inscripciones, userUid) {
  if (!inscripciones?.length) return false;
  return inscripciones.some(
    (i) => i.alumno_uid === userUid || i.tutor_uid === userUid || i.vinculado_con_uid === userUid
  );
}

export function hijosInscritosEn(inscripciones, tutorUid) {
  if (!inscripciones?.length) return [];
  return inscripciones.filter((i) => i.tutor_uid === tutorUid);
}

export function hijosNoInscritos(inscripciones, hijos, tutorUid) {
  const inscritosHijoIds = new Set(
    (inscripciones || [])
      .filter((i) => i.tutor_uid === tutorUid && i.hijo_id)
      .map((i) => i.hijo_id)
  );
  const inscritosVinculados = new Set(
    (inscripciones || []).map((i) => i.vinculado_con_uid).filter(Boolean)
  );
  return hijos.filter((h) => {
    if (inscritosHijoIds.has(h.id)) return false;
    if (h.vinculado_con_uid && inscritosVinculados.has(h.vinculado_con_uid)) return false;
    return true;
  });
}

export function puedeVerClase(clase, inscripciones, user, profile) {
  if (!user || !profile) return false;
  if (profile.role === 'admin') return true;
  if (clase.maestro_id === user.id) return true;
  if (!inscripciones?.length) return false;
  return inscripciones.some(
    (i) => i.alumno_uid === user.id || i.tutor_uid === user.id || i.vinculado_con_uid === user.id
  );
}
