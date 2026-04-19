'use client';

import Link from 'next/link';
import { ArrowUpRight, GraduationCap, Users, CalendarCheck, Wallet } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      {/* NAV */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-ink-900 flex items-center justify-center">
            <span className="text-accent-soft font-display font-bold">A</span>
          </div>
          <span className="font-display text-xl tracking-tight">Academia</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/register" className="btn-primary">Crear cuenta <ArrowUpRight size={16} /></Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-24 md:pt-20 md:pb-32">
        <div className="grid md:grid-cols-12 gap-12 items-end">
          <div className="md:col-span-8">
            <span className="chip bg-ink-900 text-accent-soft uppercase tracking-widest">
              Plataforma educativa
            </span>
            <h1 className="mt-6 font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
              Enseñar, aprender y<br/>
              <em className="text-accent-deep not-italic font-normal italic">administrar</em>
              <span className="text-ink-400"> — </span>
              en un mismo lugar.
            </h1>
            <p className="mt-6 max-w-xl text-ink-600 text-lg leading-relaxed">
              Una plataforma integral para academias: gestiona clases, alumnos,
              asistencia, calendario, pagos y comunicación con elegancia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-accent">Empezar ahora</Link>
              <Link href="/login" className="btn-outline">Ya tengo cuenta</Link>
            </div>
          </div>

          <div className="md:col-span-4 md:pl-8 md:border-l border-ink-200">
            <p className="font-display italic text-ink-500 text-lg leading-snug">
              "Una herramienta hecha para quienes se toman la enseñanza en serio."
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-4 gap-6">
          {[
            { icon: GraduationCap, title: '4 roles', desc: 'Admin, maestro, alumno y tutor' },
            { icon: Users, title: 'Clases', desc: 'Inscripciones, materiales y chat' },
            { icon: CalendarCheck, title: 'Asistencia', desc: 'Registro y calendario' },
            { icon: Wallet, title: 'Pagos Stripe', desc: 'Suscripción y pagos únicos' },
          ].map((f, i) => (
            <div key={i} className="card p-6">
              <f.icon size={28} className="text-accent-deep" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-xl">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-sm text-ink-500 flex justify-between">
        <span>© {new Date().getFullYear()} Academia</span>
        <span className="font-display italic">fecit cum amore</span>
      </footer>
    </main>
  );
}
