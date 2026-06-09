import type { ConnectorMode } from '@/lib/connectors/types';

/** Publieke demo-token van mapillary/api-demo — vervang via MAPILLARY_ACCESS_TOKEN in productie */
const DEMO_ACCESS_TOKEN = 'MLY|26275324248758064|7819d63bee8179a083cdd76e20557967';

export interface StreetViewImage {
  id: string;
  lat: number;
  lng: number;
  capturedAt?: string;
  compassAngle?: number;
}

export interface StreetViewResult {
  image: StreetViewImage | null;
  distanceM?: number;
  _source: ConnectorMode;
}

function getAccessToken(): string | null {
  return (
    process.env.MAPILLARY_ACCESS_TOKEN ??
    process.env.NEXT_PUBLIC_MAPILLARY_ACCESS_TOKEN ??
    DEMO_ACCESS_TOKEN
  );
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getMapillaryAccessToken(): string {
  return getAccessToken() ?? DEMO_ACCESS_TOKEN;
}

export function getMapillaryTileUrl(): string {
  const token = getMapillaryAccessToken();
  return `https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=${token}`;
}

export async function findNearestStreetViewImage(
  lat: number,
  lng: number,
  radiusM = 50
): Promise<StreetViewResult> {
  const token = getAccessToken();
  if (!token) {
    return { image: null, _source: 'demo' };
  }

  const url = new URL('https://graph.mapillary.com/images');
  url.searchParams.set('access_token', token);
  url.searchParams.set('fields', 'id,geometry,captured_at,compass_angle');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));
  url.searchParams.set('radius', String(Math.min(radiusM, 50)));
  url.searchParams.set('limit', '1');

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
      return { image: null, _source: 'demo' };
    }

    const json = (await res.json()) as {
      data?: {
        id: string;
        geometry?: { coordinates?: [number, number] };
        captured_at?: string;
        compass_angle?: number;
      }[];
    };

    const item = json.data?.[0];
    if (!item?.geometry?.coordinates) {
      return { image: null, _source: 'live' };
    }

    const [imgLng, imgLat] = item.geometry.coordinates;
    return {
      image: {
        id: item.id,
        lat: imgLat,
        lng: imgLng,
        capturedAt: item.captured_at,
        compassAngle: item.compass_angle,
      },
      distanceM: Math.round(haversineM(lat, lng, imgLat, imgLng)),
      _source: 'live',
    };
  } catch {
    return { image: null, _source: 'demo' };
  }
}

export function streetViewEmbedUrl(imageId: string, style: 'photo' | 'split' = 'photo'): string {
  return `https://www.mapillary.com/embed?image_key=${imageId}&style=${style}`;
}
