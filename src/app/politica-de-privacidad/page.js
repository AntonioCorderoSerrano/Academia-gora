'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import FooterLegal from '@/components/footer';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Logo size="sm" href="/" />
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="card p-5 sm:p-8 md:p-10">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">Política de Privacidad</h1>
            <p className="text-ink-500 text-sm mt-2">Última actualización: 19 de abril de 2026</p>

            <div className="space-y-6 mt-6 text-ink-700 text-sm sm:text-base">
              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">1. Responsable del tratamiento</h2>
                <p>Academia Ágora, S.L., con CIF B-12345678 y domicilio en Calle Ejemplo, 123, 28001 Madrid, es la responsable del tratamiento de tus datos personales.</p>
                <p className="mt-2">Puedes contactar con nuestro Delegado de Protección de Datos en: <a href="mailto:dpd@academiaagora.com" className="text-accent-deep hover:underline">dpd@academiaagora.com</a></p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">2. Datos que recogemos</h2>
                <p>Podemos recoger los siguientes datos personales:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Nombre completo y datos de contacto (correo electrónico, teléfono)</li>
                  <li>Credenciales de acceso (usuario y contraseña cifrada)</li>
                  <li>Rol en la plataforma (alumno, docente, tutor)</li>
                  <li>Información académica (progreso, calificaciones, asistencia)</li>
                  <li>Datos de uso de la plataforma (accesos, actividades realizadas)</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">3. Finalidad del tratamiento</h2>
                <p>Tus datos se utilizan para:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Gestionar tu registro y acceso a la plataforma</li>
                  <li>Proporcionar los servicios educativos contratados</li>
                  <li>Comunicarte información relevante sobre tus clases</li>
                  <li>Mejorar nuestros servicios y la experiencia de usuario</li>
                  <li>Cumplir con obligaciones legales</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">4. Base legal del tratamiento</h2>
                <p>La base legal para tratar tus datos es:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Ejecución de la relación académica/contractual</li>
                  <li>Consentimiento explícito (para comunicaciones comerciales)</li>
                  <li>Cumplimiento de obligaciones legales</li>
                  <li>Interés legítimo (mejora de servicios)</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">5. Conservación de datos</h2>
                <p>Conservaremos tus datos durante el tiempo necesario para cumplir con las finalidades descritas y mientras no solicites su supresión. Una vez finalizada la relación, los datos se bloquearán para atender posibles responsabilidades legales durante los plazos previstos por la ley.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">6. Cesión de datos</h2>
                <p>No compartimos tus datos con terceros, excepto:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Proveedores de servicios tecnológicos (hosting, email, etc.) bajo acuerdos de confidencialidad</li>
                  <li>Obligación legal requerida por autoridades</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">7. Derechos de los usuarios</h2>
                <p>Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad enviando un escrito a nuestra dirección postal o a <a href="mailto:dpd@academiaagora.com" className="text-accent-deep hover:underline">dpd@academiaagora.com</a>, adjuntando copia de tu DNI o documento identificativo.</p>
                <p className="mt-2">También tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">8. Seguridad de los datos</h2>
                <p>Implementamos medidas técnicas y organizativas apropiadas para proteger tus datos contra acceso no autorizado, alteración, pérdida o destrucción.</p>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t border-ink-200">
              <Link href="/" className="btn-outline inline-flex">
                ← Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </main>

      <FooterLegal />
    </div>
  );
}