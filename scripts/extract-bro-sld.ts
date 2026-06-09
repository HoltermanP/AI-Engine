/**
 * Extraheert BRO SLD (Overheidsbesluit bodemverontreiniging) van PDOK naar JSON.
 * Vereist: curl, sqlite3 en ogr2ogr (GDAL) lokaal geïnstalleerd.
 *
 * Gebruik: npx tsx scripts/extract-bro-sld.ts
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { polygonFromGeoJsonGeometry } from '../lib/connectors/bro/gpkg-geometry';

const GPKG_URL =
  'https://service.pdok.nl/tno/bro-overheidsbesluit-bodemverontreiniging/atom/downloads/brosldvolledigeset.gpkg';
const TMP_GPKG = '/tmp/brosld-extract.gpkg';
const TMP_GEOJSON = '/tmp/brosld-extract.json';
const OUT_PATH = join(process.cwd(), 'lib/data/bro-sld-vervuilde-grond.json');

interface SldMetaRow {
  bro_id: string;
  naam: string;
  bron: string;
  status: string;
}

interface VervuildeGrondLocatie {
  id: string;
  bron:
    | 'sld_bodemlocatie'
    | 'sld_aangepakt_gebied'
    | 'sld_nazorggebied'
    | 'sld_verontreinigd_gebied'
    | 'sld_overheidsbesluit';
  naam: string;
  status: string;
  polygon: [number, number][];
}

function bronToType(bron: string): VervuildeGrondLocatie['bron'] {
  if (bron === 'bodemlocatie') return 'sld_bodemlocatie';
  if (bron === 'aangepakt_gebied') return 'sld_aangepakt_gebied';
  if (bron === 'nazorggebied') return 'sld_nazorggebied';
  if (bron === 'verontreinigd_gebied') return 'sld_verontreinigd_gebied';
  return 'sld_overheidsbesluit';
}

function main() {
  console.log('Download BRO SLD GeoPackage…');
  execSync(`curl -sL "${GPKG_URL}" -o "${TMP_GPKG}"`, { stdio: 'inherit' });

  console.log('Exporteer geometrie naar GeoJSON…');
  execSync(`ogr2ogr -f GeoJSON "${TMP_GEOJSON}" "${TMP_GPKG}" soil_legal_decision`, {
    stdio: 'inherit',
  });

  console.log('Haal metadata op…');
  const metaJson = execSync(
    `sqlite3 "${TMP_GPKG}" -json "SELECT s.bro_id, COALESCE(bl.naam,'Onbekende locatie') as naam, CASE WHEN EXISTS(SELECT 1 FROM verontreinigd_gebied_vw vg WHERE vg.soil_legal_decision_fk=s.soil_legal_decision_pk) THEN 'verontreinigd_gebied' WHEN EXISTS(SELECT 1 FROM nazorggebied_vw nz WHERE nz.soil_legal_decision_fk=s.soil_legal_decision_pk) THEN 'nazorggebied' WHEN bl.soil_location_pk IS NOT NULL THEN 'bodemlocatie' WHEN EXISTS(SELECT 1 FROM aangepakt_gebied_vw ha WHERE ha.soil_legal_decision_fk=s.soil_legal_decision_pk) THEN 'aangepakt_gebied' ELSE 'overheidsbesluit' END as bron, COALESCE(bl.vervolgactie,'') as status FROM soil_legal_decision s LEFT JOIN bodemlocatie_vw bl ON bl.soil_legal_decision_fk=s.soil_legal_decision_pk"`,
    { encoding: 'utf8' }
  );

  const metaRows = JSON.parse(metaJson) as SldMetaRow[];
  const metaById = new Map(metaRows.map((r) => [r.bro_id, r]));

  const fc = JSON.parse(readFileSync(TMP_GEOJSON, 'utf8')) as GeoJSON.FeatureCollection;
  const locaties: VervuildeGrondLocatie[] = [];

  for (const feature of fc.features) {
    const broId = (feature.properties?.bro_id as string) ?? '';
    const meta = metaById.get(broId);
    if (!feature.geometry) continue;
    const polygon = polygonFromGeoJsonGeometry(feature.geometry);
    if (polygon.length < 4) continue;
    locaties.push({
      id: broId,
      bron: bronToType(meta?.bron ?? 'overheidsbesluit'),
      naam: meta?.naam ?? 'Onbekende locatie',
      status: meta?.status ?? '',
      polygon,
    });
  }

  mkdirSync(join(process.cwd(), 'lib/data'), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        extractedAt: new Date().toISOString(),
        source: 'PDOK BRO Overheidsbesluit bodemverontreiniging (SLD)',
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
