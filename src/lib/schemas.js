import { z } from 'zod';

// Regex para evitar HTML / scripts en campos de texto
const textoSeguro = z.string().trim().refine(
  (v) => !/<[^>]*>/.test(v),
  { message: 'No se permiten etiquetas HTML' }
);

export const registerSchema = z.object({
  nombre: textoSeguro.min(2, 'Nombre mínimo 2 caracteres').max(80),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(120),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100)
    .regex(/[A-Z]/, 'Debe contener una mayúscula')
    .regex(/[a-z]/, 'Debe contener una minúscula')
    .regex(/[0-9]/, 'Debe contener un número'),
  telefono: z.string().trim().max(20).regex(/^[+\d\s\-()]*$/, 'Teléfono inválido').optional().or(z.literal('')),
  role: z.enum(['alumno', 'maestro', 'tutor']),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida').max(100),
});

export const perfilUpdateSchema = z.object({
  nombre: textoSeguro.min(2).max(80),
  telefono: z.string().trim().max(20).regex(/^[+\d\s\-()]*$/).optional().or(z.literal('')),
  locale: z.enum(['es', 'en', 'ca', 'fr', 'pt']).optional(),
});

export const passwordChangeSchema = z.object({
  nueva: z.string().min(8, 'Mínimo 8 caracteres').max(100)
    .regex(/[A-Z]/, 'Debe contener una mayúscula')
    .regex(/[a-z]/, 'Debe contener una minúscula')
    .regex(/[0-9]/, 'Debe contener un número'),
  confirmar: z.string(),
}).refine((d) => d.nueva === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
});

export const hijoSchema = z.object({
  nombre: textoSeguro.min(1, 'Nombre requerido').max(60),
  apellidos: textoSeguro.max(80).optional().or(z.literal('')),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  alergias: textoSeguro.max(500).optional().or(z.literal('')),
  medicacion: textoSeguro.max(500).optional().or(z.literal('')),
  observaciones: textoSeguro.max(1000).optional().or(z.literal('')),
  contactoEmergencia: textoSeguro.max(80).optional().or(z.literal('')),
  telefonoEmergencia: z.string().trim().max(20).regex(/^[+\d\s\-()]*$/).optional().or(z.literal('')),
});

export const vincularCodigoSchema = z.object({
  hijoId: z.string().min(1).max(80),
  codigo: z.string().trim().regex(/^\d{6}$/, 'El código son 6 dígitos'),
});

export const vincularEmailSchema = z.object({
  hijoId: z.string().min(1).max(80),
  emailAlumno: z.string().trim().toLowerCase().email('Email inválido').max(120),
});

export const mensajeSchema = z.object({
  texto: textoSeguro.min(1).max(2000),
});

export const claseCrearSchema = z.object({
  nombre: textoSeguro.min(2).max(120),
  descripcion: textoSeguro.max(2000).optional().or(z.literal('')),
  nivel: z.enum(['Principiante', 'Intermedio', 'Avanzado']),
  horario: textoSeguro.max(200).optional().or(z.literal('')),
  cupoMax: z.number().int().positive().max(500),
  tipo: z.enum(['regular', 'privada', 'campamento']),
});

// Validar y devolver un objeto seguro con errores formateados
export function validar(schema, datos) {
  const r = schema.safeParse(datos);
  if (!r.success) {
    const errores = {};
    r.error.errors.forEach((e) => {
      const field = e.path.join('.');
      errores[field] = e.message;
    });
    return { valido: false, errores };
  }
  return { valido: true, datos: r.data };
}
