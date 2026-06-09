import type { BboxQuery } from '../types';

const BRO_BASE = 'https://publiek.broservices.nl';

interface BroCptFeature {
  broId?: string;
  id?: string;
  cptStandardized?: { conePenetrationTest?: { location?: { coordinates?: number[] } } };
  deliveriedocument?: { conePenetrationTest?: { location?: { coordinates?: number[] } } };
}

export async function fetchBroCptLive(bbox: BboxQuery) {
  const url = new URL(`${BRO_BASE}/sr/catalogus/v1/cpt`);
  url.searchParams.set('registratiestatus', 'geregistreerd');
  url.searchParams.set('page', '0');
  url.searchParams.set('size', '200');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`BRO CPT API: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { _embedded?: { cpt?: BroCptFeature[] } };
  const features = data._embedded?.cpt ?? [];

  return features
    .map((f) => {
      const coords =
        f.cptStandardized?.conePenetrationTest?.location?.coordinates ??
        f.deliveriedocument?.conePenetrationTest?.location?.coordinates;
      if (!coords || coords.length < 2) return null;
      const [x, y] = coords;
      if (x < bbox.minX || x > bbox.maxX || y < bbox.minY || y > bbox.maxY) return null;
      return {
        id: f.broId ?? f.id ?? `bro-${x}-${y}`,
        x,
        y,
        diepte: 10,
        qc: 10,
        grondsoort: 'onbekend',
        lagen: [] as { van: number; tot: number; grondsoort: string; qc: number }[],
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

interface BroGwFeature {
  broId?: string;
  id?: string;
  groundwaterMonitoringTube?: { location?: { coordinates?: number[] } };
}

export async function fetchBroGrondwaterLive(bbox: BboxQuery) {
  const url = new URL(`${BRO_BASE}/sr/catalogus/v1/gmw`);
  url.searchParams.set('registratiestatus', 'geregistreerd');
  url.searchParams.set('page', '0');
  url.searchParams.set('size', '200');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`BRO Grondwater API: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { _embedded?: { gmw?: BroGwFeature[] } };
  const features = data._embedded?.gmw ?? [];

  return features
    .map((f) => {
      const coords = f.groundwaterMonitoringTube?.location?.coordinates;
      if (!coords || coords.length < 2) return null;
      const [x, y] = coords;
      if (x < bbox.minX || x > bbox.maxX || y < bbox.minY || y > bbox.maxY) return null;
      return {
        id: f.broId ?? f.id ?? `gw-${x}-${y}`,
        x,
        y,
        standNap: -0.5,
        meetdatum: new Date().toISOString().slice(0, 10),
      };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);
}
