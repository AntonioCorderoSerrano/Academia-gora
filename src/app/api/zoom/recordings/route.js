import { NextResponse } from 'next/server';
import { getZoomRecordings } from '@/lib/zoom';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    if (!meetingId) return NextResponse.json({ error: 'Falta meetingId' }, { status: 400 });
    const data = await getZoomRecordings(meetingId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
