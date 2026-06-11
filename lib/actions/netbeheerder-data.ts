'use server';

import {
  NETBEHEERDER_BRONNEN,
  bronApiUrl,
  fetchNetbeheerderLaag,
  geojsonNaarNetItems,
} from '@/lib/connectors/netbeheerders';
import {
  getDemoExterneNetLagen,
  setDemoExterneNetLaag,
} from '@/lib/db/demo-store';

export interface NetBronStatus {
  id: string;
  label: string;
  beheerder: string;
  thema: string;
  toelichting: string;
  envVar: string;
  apiBeschikbaar: boolean;
  geladenItems: number;
}

export async function listNetBronnenAction(): Promise<NetBronStatus[]> {
  const geladen = new Map(getDemoExterneNetLagen().map((l) => [l.bronId, l.aantal]));
  return NETBEHEERDER_BRONNEN.map((bron) => ({
    id: bron.id,
    label: bron.label,
    beheerder: bron.beheerder,
    thema: bron.thema,
    toelichting: bron.toelichting,
    envVar: bron.envVar,
    apiBeschikbaar: bronApiUrl(bron) !== null,
    geladenItems: geladen.get(bron.id) ?? 0,
  }));
}

export async function loadNetBronViaApiAction(
  bronId: string
): Promise<{ ok: true; aantal: number } | { ok: false; error: string }> {
  const bron = NETBEHEERDER_BRONNEN.find((b) => b.id === bronId);
  if (!bron) return { ok: false, error: 'Onbekende bron' };
  try {
    const items = await fetchNetbeheerderLaag(bron);
    if (items.length === 0) return { ok: false, error: 'API gaf geen lijngeometrieën terug' };
    setDemoExterneNetLaag(bron.id, items);
    return { ok: true, aantal: items.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Ophalen mislukt' };
  }
}

export async function uploadNetLaagAction(
  bronId: string,
  geojsonText: string
): Promise<{ ok: true; aantal: number } | { ok: false; error: string }> {
  const bron = NETBEHEERDER_BRONNEN.find((b) => b.id === bronId);
  if (!bron) return { ok: false, error: 'Onbekende bron' };

  let fc: GeoJSON.FeatureCollection;
  try {
    fc = JSON.parse(geojsonText) as GeoJSON.FeatureCollection;
  } catch {
    return { ok: false, error: 'Bestand is geen geldige JSON' };
  }
  if (fc?.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
    return { ok: false, error: 'Bestand is geen GeoJSON FeatureCollection' };
  }

  const items = geojsonNaarNetItems(fc, bron);
  if (items.length === 0) {
    return {
      ok: false,
      error: 'Geen LineString/MultiLineString-geometrieën gevonden (RD of WGS84)',
    };
  }
  setDemoExterneNetLaag(bron.id, items);
  return { ok: true, aantal: items.length };
}
