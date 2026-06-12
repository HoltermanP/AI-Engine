/**
 * Export-API: DXF-tekeningen en materiaallijst (Excel) per tracé.
 *
 * GET /api/export?traceId=…&type=dxf|materiaal
 *   &variant=situatie|lengteprofiel|dwarsprofiel|kruising|boorplan|boorprofiel|werktekening (default situatie)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDemoTrace } from '@/lib/db/demo-store';
import { getDemoNetontwerp } from '@/lib/db/netontwerp-store';
import { dxfVariant } from '@/lib/export/dxf-varianten';
import { buildMateriaalLijst, generateMateriaalExcel } from '@/lib/calculatie/materiaal';

export async function GET(request: NextRequest) {
  const traceId = request.nextUrl.searchParams.get('traceId');
  const type = request.nextUrl.searchParams.get('type');
  const variant = request.nextUrl.searchParams.get('variant') ?? 'situatie';

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
    const resultaat = dxfVariant(trace, variant);
    if (!resultaat) {
      return NextResponse.json(
        {
          error: `Onbekende of niet-beschikbare DXF-variant "${variant}" — gebruik situatie|lengteprofiel|dwarsprofiel|kruising|boorplan|boorprofiel|werktekening.`,
        },
        { status: 400 }
      );
    }
    return new NextResponse(resultaat.dxf, {
      headers: {
        'Content-Type': 'application/dxf',
        'Content-Disposition': `attachment; filename="${trace.code}${resultaat.suffix}.dxf"`,
      },
    });
  }

  if (type === 'materiaal') {
    const ontwerp = getDemoNetontwerp(trace.projectId);
    const traceMoffen = (ontwerp?.assets ?? []).filter(
      (a) => a.type === 'mof' && a.gekoppeldeTraceIds.includes(trace.id),
    );
    const telling =
      traceMoffen.length > 0
        ? {
            verbindingsmoffen: traceMoffen.filter((a) => a.subtype === 'verbindingsmof').length,
            eindmoffen: traceMoffen.filter((a) => a.subtype === 'eindmof').length,
            overgangsmoffen: traceMoffen.filter((a) => a.subtype === 'overgangsmof').length,
          }
        : undefined;
    const lijst = buildMateriaalLijst(trace, telling);
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
