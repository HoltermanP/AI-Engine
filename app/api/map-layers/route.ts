import { NextResponse } from 'next/server';
import type { BboxQuery } from '@/lib/connectors/types';
import { isFetchableMapLayer } from '@/lib/map/fetchable-layers';
import { fetchMapLayer } from '@/lib/services/fetch-map-layer';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      layerId?: string;
      bbox?: BboxQuery;
      traceId?: string;
    };

    const { layerId, bbox, traceId } = body;

    if (!layerId || !bbox) {
      return NextResponse.json(
        { error: 'layerId en bbox zijn verplicht' },
        { status: 400 }
      );
    }

    if (!isFetchableMapLayer(layerId)) {
      return NextResponse.json(
        { error: `Laag "${layerId}" kan niet live worden opgehaald` },
        { status: 400 }
      );
    }

    const result = await fetchMapLayer(layerId, bbox, traceId);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/map-layers]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ophalen mislukt' },
      { status: 500 }
    );
  }
}
