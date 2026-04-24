import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createEvents } from 'ics';

export const runtime = 'nodejs';

// Parse simple para "Lun y Mié 18:00" → [{day: 1, hour: 18, min: 0}, ...]
function parseHorario(horarioTexto) {
  if (!horarioTexto) return [];
  const diasMap = {
    'lun': 1, 'mar': 2, 'mie': 3, 'mié': 3, 'jue': 4, 'vie': 5, 'sab': 6, 'sáb': 6, 'dom': 0,
    'lu': 1, 'ma': 2, 'mi': 3, 'ju': 4, 'vi': 5, 'sa': 6, 'do': 0,
  };
  const normalizado = horarioTexto.toLowerCase();
  const horaMatch = normalizado.match(/(\d{1,2})[:.:](\d{2})|(\d{1,2})h/);
  const hour = horaMatch ? Number(horaMatch[1] || horaMatch[3]) : 18;
  const min = horaMatch ? Number(horaMatch[2] || 0) : 0;
  const dias = [];
  for (const [abrev, num] of Object.entries(diasMap)) {
    if (normalizado.includes(abrev) && !dias.includes(num)) dias.push(num);
  }
  return dias.map((d) => ({ day: d, hour, min }));
}

function proximasFechas(horarios, semanas = 12) {
  const ahora = new Date();
  const eventos = [];
  for (let s = 0; s < semanas; s++) {
    const lunes = new Date(ahora);
    lunes.setDate(lunes.getDate() + s * 7);
    for (const h of horarios) {
      const d = new Date(lunes);
      const diff = (h.day + 7 - d.getDay()) % 7;
      d.setDate(d.getDate() + diff);
      d.setHours(h.hour, h.min, 0, 0);
      if (d > ahora) eventos.push(d);
    }
  }
  return eventos.slice(0, 50);
}

export async function GET(req, { params }) {
  try {
    const claseId = params.id;
    const snap = await adminDb.ref(`clases/${claseId}`).once('value');
    const clase = snap.val();
    if (!clase) return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });

    const horarios = parseHorario(clase.horario || '');
    const fechas = horarios.length > 0 ? proximasFechas(horarios) : [];

    // Si hay fechaInicio/fechaFin (campamentos), usa ese rango
    let eventosRaw = [];
    if (clase.fechaInicio && clase.fechaFin) {
      const inicio = new Date(clase.fechaInicio);
      const fin = new Date(clase.fechaFin);
      eventosRaw.push({
        title: `${clase.nombre} — Skolium`,
        description: clase.descripcion || '',
        start: [inicio.getFullYear(), inicio.getMonth() + 1, inicio.getDate(), 9, 0],
        end: [fin.getFullYear(), fin.getMonth() + 1, fin.getDate() + 1, 18, 0],
      });
    } else if (fechas.length > 0) {
      eventosRaw = fechas.map((f) => ({
        title: `${clase.nombre} — Skolium`,
        description: clase.descripcion || '',
        start: [f.getFullYear(), f.getMonth() + 1, f.getDate(), f.getHours(), f.getMinutes()],
        duration: { hours: 1 },
      }));
    } else {
      return NextResponse.json({ error: 'Clase sin horario definido' }, { status: 400 });
    }

    const { error, value } = createEvents(eventosRaw);
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

    return new Response(value, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="skolium-${claseId}.ics"`,
      },
    });
  } catch (err) {
    console.error('ICS:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
