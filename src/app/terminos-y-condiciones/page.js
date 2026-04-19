'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import FooterLegal from '@/components/footer';

export default function TerminosPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header con logo */}
      <header className="border-b border-ink-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Logo size="sm" href="/" />
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="card p-5 sm:p-8 md:p-10">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">Términos y Condiciones</h1>
            <p className="text-ink-500 text-sm mt-2">Última actualización: 19 de abril de 2026</p>

            <div className="space-y-6 mt-6 text-ink-700 text-sm sm:text-base">
              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">1. Aceptación de los términos</h2>
                <p>Al acceder y utilizar la intranet de Academia Ágora, aceptas cumplir con estos Términos y Condiciones. Si no estás de acuerdo, por favor no utilices nuestros servicios.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">2. Descripción del servicio</h2>
                <p>La plataforma ofrece acceso a materiales educativos, comunicación con profesores y compañeros, seguimiento del progreso académico y gestión de actividades relacionadas con la formación impartida por Academia Ágora.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">3. Registro y cuenta</h2>
                <p>Para acceder a nuestros servicios debes registrarte proporcionando información veraz y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades realizadas en tu cuenta.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">4. Verificación y aprobación</h2>
                <p>Todas las cuentas requieren verificación por correo electrónico y aprobación por parte del equipo administrativo antes de su activación. Nos reservamos el derecho de rechazar solicitudes de registro.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">5. Uso aceptable</h2>
                <p>Te comprometes a utilizar la plataforma de manera respetuosa y conforme a la ley. Queda prohibido:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Compartir tus credenciales con terceros</li>
                  <li>Utilizar la plataforma para fines ilegales o no autorizados</li>
                  <li>Publicar contenido ofensivo, discriminatorio o inapropiado</li>
                  <li>Intentar acceder a cuentas de otros usuarios</li>
                  <li>Realizar actividades que puedan dañar la infraestructura técnica</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">6. Propiedad intelectual</h2>
                <p>Todo el contenido de la plataforma (materiales didácticos, diseños, logos, textos, etc.) es propiedad de Academia Ágora o de sus licenciantes. No está permitida la reproducción, distribución o modificación sin autorización expresa.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">7. Suspensión y cancelación</h2>
                <p>Nos reservamos el derecho de suspender o cancelar cuentas que incumplan estos términos, sin previo aviso. Puedes solicitar la cancelación de tu cuenta contactando con administración.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">8. Modificaciones</h2>
                <p>Podemos actualizar estos términos periódicamente. Te notificaremos los cambios significativos a través de la plataforma o por correo electrónico.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">9. Contacto</h2>
                <p>Para cualquier consulta sobre estos términos, escríbenos a: <a href="mailto:legal@academiaagora.com" className="text-accent-deep hover:underline">legal@academiaagora.com</a></p>
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