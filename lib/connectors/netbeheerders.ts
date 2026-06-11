import type { DemoBestaandNet } from '@/demo/klic';
import { looksLikeRdNl, wgs84ToRd } from '@/lib/geo';

/**
 * K&L-bronnenregister voor netbeheerders en waterbedrijven.
 *
 * Per bron is een open-data-API instelbaar via een omgevingsvariabele
 * (GeoJSON-endpoint, bijv. ArcGIS FeatureServer `…/query?f=geojson`).
 * Nederland kent nog geen brede open liggingsdata voor K&L (WIBON/KLIC is
 * aanvraag-gebonden); waar een beheerder wél open data publiceert, vul je de
 * variabele — anders blijft de laag beschikbaar via GeoJSON-upload.
 */

export interface NetbeheerderBron {
  id: string;
  beheerder: string;
  thema: string;
  label: string;
  /** Omgevingsvariabele met GeoJSON-endpoint (optioneel) */
  envVar: string;
  /** Standaard openbaar endpoint indien bekend */
  defaultApiUrl?: string;
  toelichting: string;
}

export const NETBEHEERDER_BRONNEN: NetbeheerderBron[] = [
  {
    id: 'liander-elektra',
    beheerder: 'Liander',
    thema: 'elektra',
    label: 'Liander — elektriciteitsnet',
    envVar: 'NETDATA_LIANDER_ELEKTRA_URL',
    toelichting: 'Geen open liggingsdata; ligging via KLIC-melding of upload (GeoJSON).',
  },
  {
    id: 'liander-gas',
    beheerder: 'Liander',
    thema: 'gas',
    label: 'Liander — gasnet',
    envVar: 'NETDATA_LIANDER_GAS_URL',
    toelichting: 'Geen open liggingsdata; ligging via KLIC-melding of upload (GeoJSON).',
  },
  {
    id: 'enexis-elektra',
    beheerder: 'Enexis',
    thema: 'elektra',
    label: 'Enexis — elektriciteitsnet',
    envVar: 'NETDATA_ENEXIS_ELEKTRA_URL',
    toelichting: 'Geen open liggingsdata; upload of KLIC.',
  },
  {
    id: 'stedin-elektra',
    beheerder: 'Stedin',
    thema: 'elektra',
    label: 'Stedin — elektriciteitsnet',
    envVar: 'NETDATA_STEDIN_ELEKTRA_URL',
    toelichting: 'Geen open liggingsdata; upload of KLIC.',
  },
  {
    id: 'tennet-hoogspanning',
    beheerder: 'TenneT',
    thema: 'elektra',
    label: 'TenneT — hoogspanningsnet',
    envVar: 'NETDATA_TENNET_URL',
    toelichting: 'TenneT publiceert het hoogspanningsnet als open data (ArcGIS).',
  },
  {
    id: 'gasunie-leidingen',
    beheerder: 'Gasunie/GTS',
    thema: 'gas',
    label: 'Gasunie — transportleidingen',
    envVar: 'NETDATA_GASUNIE_URL',
    toelichting: 'Buisleidingen ook zichtbaar via Risicokaart/REV; endpoint instelbaar.',
  },
  {
    id: 'vitens-water',
    beheerder: 'Vitens',
    thema: 'water',
    label: 'Vitens — drinkwaternet',
    envVar: 'NETDATA_VITENS_URL',
    toelichting: 'Geen open liggingsdata; upload of KLIC.',
  },
  {
    id: 'evides-water',
    beheerder: 'Evides',
    thema: 'water',
    label: 'Evides — drinkwaternet',
    envVar: 'NETDATA_EVIDES_URL',
    toelichting: 'Geen open liggingsdata; upload of KLIC.',
  },
];

export function bronApiUrl(bron: NetbeheerderBron): string | null {
  return process.env[bron.envVar] ?? bron.defaultApiUrl ?? null;
}

function naarRd(coord: number[]): [number, number] {
  const [a, b] = coord;
  if (looksLikeRdNl(a, b)) return [a, b];
  return wgs84ToRd(a, b);
}

function lineStrings(geom: GeoJSON.Geometry): [number, number][][] {
  if (geom.type === 'LineString') {
    return [geom.coordinates.map(naarRd)];
  }
  if (geom.type === 'MultiLineString') {
    return geom.coordinates.map((line) => line.map(naarRd));
  }
  return [];
}

/** Zet een GeoJSON FeatureCollection om naar bestaand-net-items voor de kaartlaag en de toetsing. */
export function geojsonNaarNetItems(
  fc: GeoJSON.FeatureCollection,
  bron: Pick<NetbeheerderBron, 'id' | 'beheerder' | 'thema'>
): DemoBestaandNet[] {
  const items: DemoBestaandNet[] = [];
  let volgnr = 0;

  for (const feature of fc.features ?? []) {
    if (!feature.geometry) continue;
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    for (const line of lineStrings(feature.geometry)) {
      if (line.length < 2) continue;
      volgnr++;
      items.push({
        id: `${bron.id}-${volgnr}`,
        thema: ((props.thema as string) ?? bron.thema).toLowerCase(),
        beheerder: (props.beheerder as string) ?? bron.beheerder,
        spanningOfDiameter:
          (props.spanning as string) ?? (props.diameter as string) ?? (props.spanningOfDiameter as string) ?? '',
        materiaal: (props.materiaal as string) ?? 'onbekend',
        nauwkeurigheid: 'geschat',
        diepte: typeof props.diepte === 'number' ? props.diepte : -1.0,
        vrijTeHoudenAfstand:
          typeof props.vrijTeHoudenAfstand === 'number' ? props.vrijTeHoudenAfstand : 1.0,
        coordinates: line.map(([x, y]) => [x, y, -1.0] as [number, number, number]),
      });
    }
  }
  return items;
}

const FETCH_TIMEOUT_MS = 15_000;

/** Haal een K&L-laag via het geconfigureerde open-data-endpoint (GeoJSON). */
export async function fetchNetbeheerderLaag(bron: NetbeheerderBron): Promise<DemoBestaandNet[]> {
  const url = bronApiUrl(bron);
  if (!url) throw new Error(`Geen API geconfigureerd voor ${bron.label} (zet ${bron.envVar})`);

  const res = await fetch(url, {
    headers: { Accept: 'application/geo+json, application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${bron.label}: ${res.status} ${res.statusText}`);

  const fc = (await res.json()) as GeoJSON.FeatureCollection;
  if (fc.type !== 'FeatureCollection') {
    throw new Error(`${bron.label}: antwoord is geen GeoJSON FeatureCollection`);
  }
  return geojsonNaarNetItems(fc, bron);
}
