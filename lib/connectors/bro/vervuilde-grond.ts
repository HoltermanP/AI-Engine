import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConnectorConfig } from '../config';
import sldSeedData from '@/lib/data/bro-sld-vervuilde-grond.json';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
import { getVervuildeGrondForBbox } from '@/demo/vervuilde-grond';
import { bboxIntersectsPolygon } from './gpkg-geometry';
import { BODEM_REFERENCE_WMS_SOURCES } from '../bodem/reference-wms-sources';
import {
  SAD_GPKG_URL,
  SAD_WMS_BASE,
  SLD_GPKG_URL,
  SLD_WMS_BASE,
  VERVUILDE_GROND_WMS_SOURCES,
} from './vervuilde-grond-sources';
import { classifyVervuildeGrondLocaties } from '@/lib/services/bodem-risico';
import { vervuildeGrondLabel } from '../vervuilde-grond/bron-metadata';
import {
  fetchGemeentelijkeVervuildeGrond,
  getActiveExtraSourceDefinitions,
  testExtraSources,
} from '../vervuilde-grond/gemeentelijk';

import type { VervuildeGrondLocatie, VervuildeGrondResult } from '../vervuilde-grond/types';

export type { VervuildeGrondLocatie, VervuildeGrondResult };

export type VervuildeGrondBron =
  | 'sld_bodemlocatie'
  | 'sld_aangepakt_gebied'
  | 'sld_nazorggebied'
  | 'sld_overheidsbesluit'
  | 'sld_verontreinigd_gebied'
  | 'sad_bodemonderzoek'
  | 'sad_meetpunt'
  | (string & {});

interface SeedFile {
  extractedAt: string;
  source: string;
  sourceUrl: string;
  count: number;
  locaties: VervuildeGrondLocatie[];
}

function canUseLive(): boolean {
  return !getConnectorConfig().broForceDemo;
}

function loadSldSeed(): SeedFile {
  return sldSeedData as SeedFile;
}

function loadSadSeed(): SeedFile | null {
  const path = join(process.cwd(), 'lib/data/bro-sad-vervuilde-grond.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as SeedFile;
}

function filterByBbox(locaties: VervuildeGrondLocatie[], bbox: BboxQuery): VervuildeGrondLocatie[] {
  return locaties.filter((loc) => {
    if (loc.polygon) return bboxIntersectsPolygon(bbox, loc.polygon);
    if (loc.x !== undefined && loc.y !== undefined) {
      return loc.x >= bbox.minX && loc.x <= bbox.maxX && loc.y >= bbox.minY && loc.y <= bbox.maxY;
    }
    return false;
  });
}

function dedupeLocaties(locaties: VervuildeGrondLocatie[]): VervuildeGrondLocatie[] {
  const seen = new Set<string>();
  const out: VervuildeGrondLocatie[] = [];
  for (const loc of locaties) {
    if (seen.has(loc.id)) continue;
    seen.add(loc.id);
    out.push(loc);
  }
  return out;
}

function bronnenFromLocaties(locaties: VervuildeGrondLocatie[]): string[] {
  const uniek = new Set(locaties.map((l) => vervuildeGrondLabel(l.bron)));
  return [...uniek];
}

function liveBronnen(
  sldLoaded: boolean,
  sadLoaded: boolean,
  extraBronnen: string[]
): string[] {
  const bronnen = [
    `PDOK WMS SAD (${SAD_WMS_BASE})`,
    `PDOK WMS SLD (${SLD_WMS_BASE})`,
    ...VERVUILDE_GROND_WMS_SOURCES.map((s) => s.label),
    ...BODEM_REFERENCE_WMS_SOURCES.map((s) => s.label),
  ];
  if (sldLoaded) bronnen.push(`PDOK SLD GeoPackage (${SLD_GPKG_URL})`);
  if (sadLoaded) bronnen.push(`PDOK SAD GeoPackage (${SAD_GPKG_URL})`);
  bronnen.push(...extraBronnen);
  return bronnen;
}

export const broVervuildeGrondConnector: DataConnector<BboxQuery, VervuildeGrondResult> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    const sadSeed = loadSadSeed();
    return {
      id: 'bro-vervuilde-grond',
      label: 'Vervuilde grond (BRO + gemeentelijk)',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
      note: live
        ? (() => {
            const extra = getActiveExtraSourceDefinitions();
            const extraNote =
              extra.length > 0
                ? ` + ${extra.length} extra bron(nen) (gemeentelijk + regionaal)`
                : ' (geen extra bronnen — zet VERVUILDE_GROND_EXTRA_SOURCES=all)';
            return sadSeed
              ? `SLD (${loadSldSeed().count}) + SAD (${sadSeed.count}) + BRO/Bodemloket/RIVM WMS${extraNote}`
              : `SLD seed + BRO/Bodemloket WMS${extraNote}; run npm run data:extract-sad voor SAD-vector`;
          })()
        : 'Demo-locaties nabij tracés',
    };
  },

  async fetch(query) {
    if (canUseLive()) {
      const merged: VervuildeGrondLocatie[] = [];
      let sldLoaded = false;
      let sadLoaded = false;

      try {
        const sld = loadSldSeed();
        merged.push(...filterByBbox(sld.locaties, query));
        sldLoaded = true;
      } catch {
        // SLD seed ontbreekt
      }

      const sad = loadSadSeed();
      if (sad) {
        merged.push(...filterByBbox(sad.locaties, query));
        sadLoaded = true;
      }

      const gemeentelijk = await fetchGemeentelijkeVervuildeGrond(query);
      merged.push(...gemeentelijk.locaties);

      const locaties = classifyVervuildeGrondLocaties(dedupeLocaties(merged));
      return {
        locaties,
        bronnen: liveBronnen(sldLoaded, sadLoaded, gemeentelijk.bronnen),
        _source: 'live' as const,
      };
    }

    const demo = classifyVervuildeGrondLocaties(getVervuildeGrondForBbox(query));
    return {
      locaties: demo,
      bronnen: bronnenFromLocaties(demo),
      _source: 'demo' as const,
    };
  },

  async testConnection() {
    if (!canUseLive()) return { ok: true, message: 'Lokale modus actief' };
    try {
      const sld = loadSldSeed();
      const sad = loadSadSeed();
      const parts = [`SLD: ${sld.count} locaties (${sld.extractedAt.slice(0, 10)})`];
      if (sad) parts.push(`SAD: ${sad.count} locaties (${sad.extractedAt.slice(0, 10)})`);
      else parts.push('SAD: seed ontbreekt — npm run data:extract-sad');
      parts.push(
        `WMS: ${VERVUILDE_GROND_WMS_SOURCES.length} BRO + ${BODEM_REFERENCE_WMS_SOURCES.length} referentie (Bodemloket, PFAS)`
      );
      const extraParts = await testExtraSources();
      parts.push(...extraParts);
      return { ok: true, message: parts.join(' · ') };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'BRO vervuilde-grond seed niet gevonden',
      };
    }
  },
};
