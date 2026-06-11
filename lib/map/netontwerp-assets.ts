/**
 * Netontwerp-assets → render-klare GeoJSON voor de kaart.
 * Chainage-gebonden assets (moffen, mantelbuizen) worden hier naar
 * RD-coördinaten geresolved en daarna naar WGS84 omgezet.
 */

import { rdToWgs84 } from '@/lib/geo';
import { puntOpChainage, lijnLengteM } from '@/lib/netontwerp/chainage';
import type { NetontwerpAsset } from '@/lib/netontwerp/types';
import type { TraceLines } from '@/lib/trace-edit';

export interface MapAssetCollecties {
  punten: GeoJSON.Feature[];
  lijnen: GeoJSON.Feature[];
}

const ASSET_KLEUREN: Record<string, string> = {
  station: '#9333EA',
  mof: '#F59E0B',
  mantelbuis: '#0EA5E9',
  aansluiting: '#10B981',
};

function puntFeature(
  asset: NetontwerpAsset,
  x: number,
  y: number,
): GeoJSON.Feature {
  const [lng, lat] = rdToWgs84(x, y);
  return {
    type: 'Feature',
    properties: {
      id: asset.id,
      assetType: asset.type,
      subtype: asset.subtype,
      naam: asset.naam,
      bron: asset.bron,
      kleur: ASSET_KLEUREN[asset.type] ?? '#64748B',
    },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  };
}

/** Aansluitingen (belastingpunten) als kaartfeatures — groen, met kVA-label. */
export function aansluitingenNaarFeatures(
  aansluitingen: {
    id: string;
    naam: string;
    aantal: number;
    kVAPerStuk: number;
    gelijktijdigheid: number;
    x: number;
    y: number;
  }[],
): GeoJSON.Feature[] {
  return aansluitingen.map((a) => {
    const [lng, lat] = rdToWgs84(a.x, a.y);
    const kva = Math.round(a.aantal * a.kVAPerStuk * a.gelijktijdigheid);
    return {
      type: 'Feature',
      properties: {
        id: a.id,
        assetType: 'aansluiting',
        subtype: 'belasting',
        naam: `${a.naam} (${kva} kVA)`,
        bron: 'handmatig',
        kleur: ASSET_KLEUREN.aansluiting,
      },
      geometry: { type: 'Point', coordinates: [lng, lat] },
    };
  });
}

export function assetsNaarGeoJSON(
  assets: NetontwerpAsset[],
  traceLinesById: Record<string, TraceLines>,
): MapAssetCollecties {
  const punten: GeoJSON.Feature[] = [];
  const lijnen: GeoJSON.Feature[] = [];

  for (const asset of assets) {
    const pos = asset.positie;
    if (pos.binding === 'punt') {
      punten.push(puntFeature(asset, pos.x, pos.y));
      continue;
    }

    const lines = traceLinesById[pos.traceId];
    const line = lines?.[pos.lijnIndex];
    if (!line || line.length < 2) continue;

    if (pos.binding === 'chainage') {
      const punt = puntOpChainage(line, pos.chainageM);
      if (punt) punten.push(puntFeature(asset, punt.x, punt.y));
      continue;
    }

    // chainage_bereik → lijnstuk gesampled langs het tracé
    const totaal = lijnLengteM(line);
    const van = Math.max(0, Math.min(pos.vanM, pos.totM));
    const tot = Math.min(totaal, Math.max(pos.vanM, pos.totM));
    if (tot - van < 0.5) continue;
    const stap = Math.max(2, (tot - van) / 16);
    const coords: [number, number][] = [];
    for (let m = van; m <= tot + 0.01; m += stap) {
      const punt = puntOpChainage(line, Math.min(m, tot));
      if (punt) coords.push(rdToWgs84(punt.x, punt.y));
    }
    if (coords.length >= 2) {
      lijnen.push({
        type: 'Feature',
        properties: {
          id: asset.id,
          assetType: asset.type,
          subtype: asset.subtype,
          naam: asset.naam,
          bron: asset.bron,
          kleur: ASSET_KLEUREN[asset.type] ?? '#64748B',
        },
        geometry: { type: 'LineString', coordinates: coords },
      });
    }
  }

  return { punten, lijnen };
}
