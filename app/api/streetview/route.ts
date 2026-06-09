import { NextRequest, NextResponse } from 'next/server';
import { findNearestStreetViewImage } from '@/lib/connectors/mapillary/streetview';

export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get('lat') ?? '');
  const lng = parseFloat(request.nextUrl.searchParams.get('lng') ?? '');
  const radius = parseInt(request.nextUrl.searchParams.get('radius') ?? '50', 10);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat en lng zijn verplicht' }, { status: 400 });
  }

  const result = await findNearestStreetViewImage(lat, lng, radius);
  return NextResponse.json(result);
}
