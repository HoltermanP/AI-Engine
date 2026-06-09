/**
 * Extraheert BRO SAD (Milieuhygiënisch bodemonderzoek) van PDOK naar JSON.
 * Vereist: curl, ogr2ogr (GDAL) en voldoende schijfruimte (~2,6 GB download).
 *
 * Gebruik: npm run data:extract-sad
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  pointFromGeoJsonGeometry,
  polygonFromGeoJsonGeometry,
} from '../lib/connectors/bro/gpkg-geometry';

const GPKG_URL =
  'https://service.pdok.nl/tno/bro-milieuhygienisch-bodemonderzoek/atom/downloads/brosadvolledigeset.gpkg';
const TMP_GPKG = '/tmp/brosad-extract.gpkg';
const OUT_PATH = join(process.cwd(), 'lib/data/bro-sad-vervuilde-grond.json');

type SadBron = 'sad_bodemonderzoek' | 'sad_meetpunt';

interface SadLocatie {
  id: string;
  bron: SadBron;
  naam: string;
  status: string;
  polygon?: [number, number][];
  x?: number;
  y?: number;
}

interface OgrLayerInfo {
  name: string;
  geometryFields?: { name: string; type: string }[];
}

function ensureGpkg() {
  if (!existsSync(TMP_GPKG)) {
    console.log('Download BRO SAD GeoPackage (~2,6 GB)…');
    execSync(`curl -sL "${GPKG_URL}" -o "${TMP_GPKG}"`, { stdio: 'inherit' });
  }
}

function geometryLayers(): string[] {
  const raw = execSync(`ogrinfo -q -json "${TMP_GPKG}"`, { encoding: 'utf8' });
  const info = JSON.parse(raw) as { layers?: OgrLayerInfo[] };
  return (info.layers ?? [])
    .filter((l) => (l.geometryFields?.length ?? 0) > 0)
    .map((l) => l.name)
    .filter((name) => {
      const n = name.toLowerCase();
      return (
        n.includes('investigation') ||
        n.includes('assessment') ||
        n.includes('onderzoek') ||
        n.includes('measurement') ||
        n.includes('meetpunt') ||
        n.includes('site') ||
        n === 'sad'
      );
    });
}

function bronForLayer(layer: string): SadBron {
  const n = layer.toLowerCase();
  if (n.includes('measurement') || n.includes('meetpunt') || n.includes('point')) {
    return 'sad_meetpunt';
  }
  return 'sad_bodemonderzoek';
}

function pickNaam(props: Record<string, unknown>): string {
  const keys = [
    'naam',
    'name',
    'title',
    'onderzoeksnaam',
    'projectnaam',
    'bro_id',
    'identificatie',
  ];
  for (const k of keys) {
    const v = props[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return 'Bodemonderzoek';
}

function pickStatus(props: Record<string, unknown>): string {
  const keys = ['status', 'onderzoekstatus', 'conclusie', 'resultaat'];
  for (const k of keys) {
    const v = props[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function pickId(props: Record<string, unknown>, fallback: string): string {
  const keys = ['bro_id', 'id', 'identificatie', 'sikb_identificatie'];
  for (const k of keys) {
    const v = props[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return fallback;
}

function main() {
  ensureGpkg();

  let layers = geometryLayers();
  if (layers.length === 0) {
    console.warn('Geen SAD-geometrylagen gevonden via filter — exporteer alle geometrielagen.');
    const raw = execSync(`ogrinfo -q -json "${TMP_GPKG}"`, { encoding: 'utf8' });
    const info = JSON.parse(raw) as { layers?: OgrLayerInfo[] };
    layers = (info.layers ?? [])
      .filter((l) => (l.geometryFields?.length ?? 0) > 0)
      .map((l) => l.name);
  }

  console.log('SLD/SAD lagen:', layers.join(', '));

  const locaties: SadLocatie[] = [];
  const seen = new Set<string>();

  for (const layer of layers) {
    const tmpGeo = `/tmp/brosad-${layer}.json`;
    execSync(`ogr2ogr -f GeoJSON "${tmpGeo}" "${TMP_GPKG}" "${layer}"`, { stdio: 'inherit' });
    const fc = JSON.parse(readFileSync(tmpGeo, 'utf8')) as GeoJSON.FeatureCollection;
    const bron = bronForLayer(layer);

    for (const [i, feature] of (fc.features ?? []).entries()) {
      if (!feature.geometry) continue;
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const id = pickId(props, `SAD-${layer}-${i}`);
      if (seen.has(id)) continue;
      seen.add(id);

      const base = {
        id,
        bron,
        naam: pickNaam(props),
        status: pickStatus(props),
      };

      if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
        const pt = pointFromGeoJsonGeometry(feature.geometry);
        if (!pt) continue;
        locaties.push({ ...base, x: pt[0], y: pt[1] });
        continue;
      }

      const polygon = polygonFromGeoJsonGeometry(feature.geometry);
      if (polygon.length >= 4) {
        locaties.push({ ...base, polygon });
      } else {
        const pt = pointFromGeoJsonGeometry(feature.geometry);
        if (pt) locaties.push({ ...base, x: pt[0], y: pt[1] });
      }
    }
  }

  mkdirSync(join(process.cwd(), 'lib/data'), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        extractedAt: new Date().toISOString(),
        source: 'PDOK BRO Milieuhygiënisch bodemonderzoek (SAD)',
        sourceUrl: GPKG_URL,
        count: locaties.length,
        locaties,
      },
      null,
      2
    )
  );

  console.log(`Geschreven: ${OUT_PATH} (${locaties.length} locaties)`);
}

main();
