'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import FooterLegal from '@/components/footer';

export default function AvisoLegalPage() {
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
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">Aviso Legal</h1>
            <p className="text-ink-500 text-sm mt-2">Última actualización: 19 de abril de 2026</p>

            <div className="space-y-6 mt-6 text-ink-700 text-sm sm:text-base">
              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">Datos identificativos</h2>
                <p>En cumplimiento con la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa que este sitio web es operado por:</p>
                <ul className="list-none pl-0 mt-3 space-y-2">
                  <li><strong>Denominación social:</strong> Academia Ágora, S.L.</li>
                  <li><strong>NIF/CIF:</strong> B-12345678</li>
                  <li><strong>Domicilio social:</strong> Calle Ejemplo, 123, 28001 Madrid, España</li>
                  <li><strong>Teléfono:</strong> +34 912 345 678</li>
                  <li><strong>Correo electrónico:</strong> <a href="mailto:info@academiaagora.com" className="text-accent-deep hover:underline">info@academiaagora.com</a></li>
                  <li><strong>Datos de inscripción:</strong> Registro Mercantil de Madrid, Tomo 12345, Folio 123, Sección 8, Hoja M-123456</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">Condiciones de uso</h2>
                <p>El acceso y uso de este sitio web atribuye la condición de usuario e implica la aceptación plena y sin reservas de todas las condiciones incluidas en este Aviso Legal.</p>
                <p className="mt-2">El usuario se compromete a hacer un uso adecuado de los contenidos y servicios, no empleándolos para actividades ilícitas o contrarias al orden público.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">Propiedad intelectual</h2>
                <p>Todos los contenidos de este sitio web (textos, imágenes, diseños, logos, iconos, software, etc.) son propiedad de Academia Ágora o de terceros que han autorizado su uso, y están protegidos por las leyes de propiedad intelectual.</p>
                <p className="mt-2">Queda prohibida la reproducción, distribución, comunicación pública o transformación de los contenidos sin autorización expresa de los titulares.</p>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">Exclusión de responsabilidad</h2>
                <p>Academia Ágora no se responsabiliza por:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Interrupciones o mal funcionamiento del servicio</li>
                  <li>Daños derivados de virus o ataques informáticos</li>
                  <li>Contenidos de sitios web de terceros enlazados desde nuestra plataforma</li>
                  <li>Uso indebido que los usuarios hagan de los contenidos</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl sm:text-2xl mb-3">Legislación aplicable</h2>
                <p>Este Aviso Legal se rige por la legislación española. Cualquier controversia será sometida a los Juzgados y Tribunales de Madrid, capital, con renuncia expresa a cualquier otro fuero que pudiera corresponder.</p>
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