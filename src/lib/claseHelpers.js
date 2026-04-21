// Tipos de clase soportados
export const TIPO_CLASE = {
  REGULAR: 'regular',      // Clase con suscripción (sept-jun o X meses/semanas)
  PRIVADA: 'privada',      // Clase particular, pago por días u horas
  CAMPAMENTO: 'campamento' // Campamento de verano con sedes y opciones
};

export const LABEL_TIPO = {
  [TIPO_CLASE.REGULAR]: 'Clase regular',
  [TIPO_CLASE.PRIVADA]: 'Clase privada',
  [TIPO_CLASE.CAMPAMENTO]: 'Campamento',
};

// Modalidades de cobro para clases regulares
export const MODALIDAD_REGULAR = {
  ACADEMICA: 'academica',     // Sept-Jun (10 meses)
  DURACION: 'duracion',       // X meses o semanas definidos por docente
  GRATIS: 'gratis',           // Incluida en suscripción global (legacy)
};

// Unidades para clases privadas
export const UNIDAD_PRIVADA = {
  HORAS: 'horas',
  DIAS: 'dias',
};

// Unidades para duración de clases regulares
export const UNIDAD_DURACION = {
  MESES: 'meses',
  SEMANAS: 'semanas',
};

/**
 * Cuenta las inscripciones actuales de una clase.
 * Para campamentos, cuenta por sede.
 */
export function contarInscripciones(clase, sedeId = null) {
  if (!clase.alumnos) return 0;
  if (clase.tipo === TIPO_CLASE.CAMPAMENTO && sedeId) {
    return Object.values(clase.alumnos).filter((a) => a.sedeId === sedeId).length;
  }
  return Object.keys(clase.alumnos).length;
}

/**
 * Determina si una clase tiene cupo disponible.
 * En campamentos revisa el cupo de la sede concreta.
 */
export function tieneCupo(clase, sedeId = null) {
  if (clase.tipo === TIPO_CLASE.CAMPAMENTO && sedeId) {
    const sede = clase.sedes?.[sedeId];
    if (!sede) return false;
    return contarInscripciones(clase, sedeId) < (sede.cupoMax || 0);
  }
  const cupo = clase.cupoMax || 0;
  return contarInscripciones(clase) < cupo;
}

/**
 * Cupo restante (para mostrar en UI)
 */
export function cupoRestante(clase, sedeId = null) {
  if (clase.tipo === TIPO_CLASE.CAMPAMENTO && sedeId) {
    const sede = clase.sedes?.[sedeId];
    if (!sede) return 0;
    return Math.max(0, (sede.cupoMax || 0) - contarInscripciones(clase, sedeId));
  }
  return Math.max(0, (clase.cupoMax || 0) - contarInscripciones(clase));
}

/**
 * Calcula cuántas cuotas (meses) van desde hoy hasta junio del próximo año.
 * Para la suscripción académica, siempre son 10 cuotas totales (sept-jun).
 * Si alguien se inscribe en octubre, serían 9 cuotas restantes, etc.
 */
export function calcularCuotasAcademicas(fechaInicio = new Date()) {
  const d = new Date(fechaInicio);
  const año = d.getFullYear();
  const mes = d.getMonth(); // 0=enero, 8=septiembre, 5=junio

  // Determinar el junio final del curso
  let añoFin;
  if (mes >= 8) { // sept, oct, nov, dic → junio del año siguiente
    añoFin = año + 1;
  } else { // ene-ago → junio del mismo año (o siguiente si estamos en julio/agosto)
    añoFin = mes >= 6 ? año + 1 : año; // jul/ago → siguiente
  }

  // Junio = mes 5
  const finDate = new Date(añoFin, 5, 30);
  const meses = (finDate.getFullYear() - d.getFullYear()) * 12 + (finDate.getMonth() - d.getMonth()) + 1;
  return Math.max(1, Math.min(10, meses));
}

/**
 * ¿Un alumno concreto ya está inscrito en la clase?
 * Para campamentos con hijos, revisa si el hijoId está inscrito.
 */
export function estaInscrito(clase, userUid, hijoId = null) {
  if (!clase.alumnos) return false;
  if (hijoId) {
    return Object.values(clase.alumnos).some(
      (a) => a.hijoId === hijoId && a.tutorUid === userUid
    );
  }
  return !!clase.alumnos[userUid];
}
