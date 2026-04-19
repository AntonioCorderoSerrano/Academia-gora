'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import FooterLegal from '@/components/footer';

export default function CookiesPage() {
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
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">Política de Cookies</h1>
            <p className="text-ink-500 text-sm mt-2">Última actualización: 19 de abril de 2026</p>

            <div className="space-y-6 mt-6 text-ink-700 text-sm sm:text-base">
              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">1. ¿Qué son las cookies?</h2>
                <p>Las cookies son pequeños archivos de texto que los sitios web instalan en tu navegador o dispositivo cuando los visitas. Permiten recordar información sobre tu visita, como tus preferencias de idioma, mantener tu sesión activa o analizar cómo interactúas con el sitio.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">2. Tipos de cookies que utilizamos</h2>
                <p>En Academia Ágora utilizamos los siguientes tipos de cookies:</p>
                
                <div className="mt-4 space-y-3">
                  <div className="bg-ink-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-ink-900">Cookies técnicas (obligatorias)</h3>
                    <p className="text-sm mt-1">Necesarias para el funcionamiento básico de la plataforma: autenticación, seguridad, navegación. No pueden desactivarse.</p>
                  </div>
                  
                  <div className="bg-ink-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-ink-900">Cookies de preferencias</h3>
                    <p className="text-sm mt-1">Recuerdan tus elecciones (idioma, tema visual, etc.).</p>
                  </div>
                  
                  <div className="bg-ink-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-ink-900">Cookies analíticas</h3>
                    <p className="text-sm mt-1">Nos ayudan a entender cómo usas la plataforma (páginas visitadas, tiempo de navegación) para mejorar nuestros servicios. Utilizamos herramientas como Google Analytics.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">3. Cookies de terceros</h2>
                <p>Algunas cookies son establecidas por servicios externos que utilizamos:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>Google Analytics:</strong> Para análisis de tráfico y comportamiento de usuarios</li>
                  <li><strong>Firebase (Google):</strong> Para autenticación y servicios en tiempo real</li>
                </ul>
                <p className="mt-2">Estos terceros pueden tener sus propias políticas de privacidad. Puedes consultarlas en sus sitios web.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">4. Duración de las cookies</h2>
                <p>Utilizamos:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>Cookies de sesión:</strong> Temporales, se eliminan al cerrar el navegador</li>
                  <li><strong>Cookies persistentes:</strong> Permanecen en tu dispositivo hasta su fecha de expiración (máximo 2 años) o hasta que las elimines</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">5. Gestión de cookies</h2>
                <p>Puedes configurar tu navegador para bloquear o eliminar cookies. Sin embargo, deshabilitar cookies técnicas puede afectar el funcionamiento de la plataforma e impedir tu acceso.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">6. Consentimiento</h2>
                <p>Al acceder a nuestra plataforma, te mostramos un aviso de cookies donde puedes aceptar o configurar tus preferencias. El consentimiento es revocable en cualquier momento desde el panel de configuración de cookies.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">7. Contacto</h2>
                <p>Si tienes preguntas sobre nuestra política de cookies, contáctanos en: <a href="mailto:legal@academiaagora.com" className="text-accent-deep hover:underline">legal@academiaagora.com</a></p>
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