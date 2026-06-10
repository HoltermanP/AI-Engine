/**
 * Export-API: DXF-tekening en materiaallijst (Excel) per tracé.
 *
 * GET /api/export?traceId=…&type=dxf|materiaal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDemoTrace, getDemoBestaandNet } from '@/lib/db/demo-store';
import { generateTraceDxf, type DxfKlicThema } from '@/lib/drawings/dxf';
import { buildMateriaalLijst, generateMateriaalExcel } from '@/lib/calculatie/materiaal';

function naarDxfThema(thema: string): DxfKlicThema {
  const t = thema.toLowerCase();
  if (t.includes('gas')) return 'gas';
  if (t.includes('water')) return 'water';
  if (t.includes('spanning') || t.includes('elektra')) return 'elektra';
  if (t.includes('telecom') || t.includes('data')) return 'telecom';
  if (t.includes('riool')) return 'riool';
  return 'overig';
}

export async function GET(request: NextRequest) {
  const traceId = request.nextUrl.searchParams.get('traceId');
  const type = request.nextUrl.searchParams.get('type');

  if (!traceId || !type) {
    return NextResponse.json(
      { error: 'Parameters "traceId" en "type" (dxf|materiaal) zijn verplicht.' },
      { status: 400 }
    );
  }
  const trace = getDemoTrace(traceId);
  if (!trace) {
    return NextResponse.json({ error: `Tracé "${traceId}" niet gevonden.` }, { status: 404 });
  }

  if (type === 'dxf') {
    const bestaandNet = getDemoBestaandNet().map((net) => ({
      thema: naarDxfThema(net.thema),
      label: `${net.thema} (${net.beheerder})`,
      coordinaten: net.coordinates.map(([x, y]) => [x, y] as [number, number]),
    }));
    const dxf = generateTraceDxf({
      naam: `${trace.code} — ${trace.naam}`,
      centerline: trace.coordinates.map(([x, y]) => [x, y] as [number, number]),
      bestaandNet,
    });
    return new NextResponse(dxf, {
      headers: {
        'Content-Type': 'application/dxf',
        'Content-Disposition': `attachment; filename="${trace.code}.dxf"`,
      },
    });
  }

  if (type === 'materiaal') {
    const lijst = buildMateriaalLijst(trace);
    const buffer = await generateMateriaalExcel([lijst]);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${trace.code}-materiaallijst.xlsx"`,
      },
    });
  }

  return NextResponse.json(
    { error: `Onbekend exporttype "${type}" — gebruik dxf of materiaal.` },
    { status: 400 }
  );
}
