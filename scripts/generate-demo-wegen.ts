/**
 * Genereer demo/wegen-data.ts uit PDOK NWB.
 * Run: npx tsx scripts/generate-demo-wegen.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { WEGEN_CONFIG } from '../demo/wegen-config';
import { fetchPdokWfs, PDOK_WFS_PATHS } from '../lib/connectors/pdok/wfs-client';
import { chainNwbSegments } from '../lib/demo/nwb-centerline';

async function extractNwbCenterline(
  cfg: (typeof WEGEN_CONFIG)[0]
): Promise<[number, number][]> {
  const fc = await fetchPdokWfs(PDOK_WFS_PATHS.nwbWegen, 'wegvakken', cfg.bbox, 2000);
  const segments = fc.features
    .filter((f) => f.properties?.sttNaam === cfg.nwbStraat)
    .map((f) => {
      const geom = f.geometry;
      if (!geom || geom.type === 'GeometryCollection') return [];
      if (geom.type === 'LineString') {
        return [geom.coordinates as [number, number][]];
      }
      if (geom.type === 'MultiLineString') {
        return geom.coordinates as [number, number][][];
      }
      return [];
    })
    .flat()
    .filter((s) => s.length >= 2);

  return chainNwbSegments(segments, cfg.minPointDist ?? 8);
}

async function main() {
  const wegen: {
    id: string;
    naam: string;
    type: string;
    beheerder: string;
    centerline: [number, number][];
  }[] = [];

  for (const cfg of WEGEN_CONFIG) {
    const centerline = await extractNwbCenterline(cfg);

    let len = 0;
    for (let i = 1; i < centerline.length; i++) {
      len += Math.hypot(
        centerline[i][0] - centerline[i - 1][0],
        centerline[i][1] - centerline[i - 1][1]
      );
    }

    console.log(
      `${cfg.id}: ${centerline.length} punten, ${Math.round(len)} m (nwb/${cfg.nwbStraat})`
    );

    if (centerline.length < 2) {
      throw new Error(`Geen centerline voor ${cfg.id} (${cfg.nwbStraat})`);
    }

    wegen.push({
      id: cfg.id,
      naam: cfg.naam,
      type: cfg.type,
      beheerder: cfg.beheerder,
      centerline,
    });
  }

  const outPath = join(process.cwd(), 'demo/wegen-data.ts');
  const content = `/**
 * AUTO-GENERATED — niet handmatig bewerken.
 * Bron: PDOK NWB wegvakken (RD EPSG:28992)
 * Run: npx tsx scripts/generate-demo-wegen.ts
 */

export interface DemoWeg {
  id: string;
  naam: string;
  type: 'provincialeweg' | 'gemeenteweg' | 'woonstraat' | 'fietspad';
  beheerder: string;
  centerline: [number, number][];
}

export const DEMO_WEGEN_DATA: DemoWeg[] = ${JSON.stringify(wegen, null, 2)};
`;

  writeFileSync(outPath, content, 'utf8');
  console.log(`\nGeschreven naar ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
