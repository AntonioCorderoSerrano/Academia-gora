'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { ArrowUpRight, GraduationCap, Users, CalendarCheck, Wallet } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-5 gap-2 animate-fade-in">
        <Logo size="sm" className="sm:hidden" />
        <Logo size="md" className="hidden sm:inline-flex" />
        <nav className="flex items-center gap-1 sm:gap-2 md:gap-3 text-sm">
          <Link href="/login" className="btn-ghost px-2.5 sm:px-4 py-2">Entrar</Link>
          <Link href="/register" className="btn-primary px-3 sm:px-5 py-2 sm:py-2.5">
            <span className="hidden xs:inline sm:inline">Crear cuenta</span>
            <span className="xs:hidden sm:hidden">Registro</span>
            <ArrowUpRight size={16} className="hidden sm:inline" />
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-10 pb-16 sm:pb-24 md:pt-16 md:pb-32">
        <div className="grid md:grid-cols-12 gap-6 md:gap-12 items-end">
          <div className="md:col-span-8">
            <span className="chip bg-ink-900 text-accent-soft uppercase tracking-widest text-[9px] sm:text-[10px] md:text-xs animate-fade-up" style={{ animationDelay: '100ms' }}>
              Plataforma educativa
            </span>
            <h1 className="mt-4 sm:mt-5 md:mt-6 font-display text-[2rem] xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1] md:leading-[0.95] tracking-tight animate-fade-up" style={{ animationDelay: '180ms' }}>
              Enseñar, aprender y<br/>
              <em className="text-accent-deep not-italic font-normal italic">administrar</em>
              <span className="text-ink-400"> — </span>
              en un mismo lugar.
            </h1>
            <p className="mt-4 sm:mt-6 max-w-xl text-ink-600 text-sm sm:text-base md:text-lg leading-relaxed animate-fade-up" style={{ animationDelay: '280ms' }}>
              Skolium es una plataforma integral para academias: clases, alumnos, asistencia,
              calendario, pagos, clases en directo y comunicación con elegancia.
            </p>
            <div className="mt-5 sm:mt-8 flex flex-wrap gap-2 sm:gap-3 animate-fade-up" style={{ animationDelay: '380ms' }}>
              <Link href="/register" className="btn-accent flex-1 xs:flex-initial">Empezar ahora</Link>
              <Link href="/login" className="btn-outline flex-1 xs:flex-initial">Ya tengo cuenta</Link>
            </div>
          </div>

          <div className="md:col-span-4 md:pl-8 md:border-l border-ink-200 hidden md:block animate-fade-up" style={{ animationDelay: '480ms' }}>
            <p className="font-display italic text-ink-500 text-base lg:text-lg leading-snug">
              "Una herramienta hecha para quienes se toman la enseñanza en serio."
            </p>
          </div>
        </div>

        <div className="mt-12 sm:mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
          {[
            { icon: GraduationCap, title: '4 roles', desc: 'Admin, docente, alumno, tutor' },
            { icon: Users, title: 'Clases', desc: 'Inscripciones y mensajería' },
            { icon: CalendarCheck, title: 'Asistencia', desc: 'Registro y calendario' },
            { icon: Wallet, title: 'Pagos Stripe', desc: 'Suscripción + único' },
          ].map((f, i) => (
            <div key={i} className="card p-3 sm:p-5 md:p-6 animate-fade-up"
              style={{ animationDelay: `${580 + i * 80}ms` }}>
              <f.icon size={22} className="text-accent-deep sm:w-7 sm:h-7" strokeWidth={1.5} />
              <h3 className="mt-2 sm:mt-4 font-display text-base sm:text-lg md:text-xl">{f.title}</h3>
              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs md:text-sm text-ink-600 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 sm:px-6 pb-6 sm:pb-10 text-[11px] sm:text-sm text-ink-500 flex flex-col sm:flex-row justify-between gap-1 sm:gap-2">
        <span>© {new Date().getFullYear()} Skolium</span>
        <span className="font-display italic">fecit cum amore</span>
      </footer>
    </main>
  );
}
