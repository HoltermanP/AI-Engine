/**
 * Tekeningen-audit: rendert élk tekeningtype naar PNG voor visuele controle
 * op professionele tekenafspraken (NLCS/NEN).
 * Gebruik: npx tsx scripts/render-tekeningen-audit.ts [traceCode]
 */
import { mkdirSync, writeFileSync } from 'fs';
import { Resvg } from '@resvg/resvg-js';
import { DEMO_TRACES } from '../demo/traces';
import { DEMO_BESTAAND_NET } from '../demo/klic';
import { generateDrawings } from '../lib/drawings';
import { generateBoreDrawings } from '../lib/drawings/bore-index';
import { runBoreEngineering, heeftSleuflozeSegmenten } from '../lib/bore';
import { generateStationEenlijn } from '../lib/drawings/station-eenlijn';
import { generateStationPlattegrond } from '../lib/drawings/station-plattegrond';
import { generateWerktekening } from '../lib/drawings/werktekening';
import { adviseerMoffen, adviseerMantelbuizen } from '../lib/netontwerp/moffen-advies';
import { KABEL_CATALOGUS } from '../lib/netontwerp/kabel-catalogus';
import type { StationOntwerp } from '../lib/netontwerp/types';
import type { TraceLines } from '../lib/trace-edit';

function naarPng(svg: string, pad: string): void {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1800 },
    background: '#ffffff',
    font: { loadSystemFonts: true },
  });
  writeFileSync(pad, resvg.render().asPng());
  console.log('✓', pad);
}

function main() {
  const code = process.argv[2] ?? 'EL-LS-008';
  const trace = DEMO_TRACES.find((t) => t.code === code) ?? DEMO_TRACES[0];
  const uitDir = '/tmp/tekeningen-audit';
  mkdirSync(uitDir, { recursive: true });

  // Standaardset (situatie, lengteprofiel, dwarsprofiel, kruising)
  for (const d of generateDrawings(trace, DEMO_BESTAAND_NET)) {
    naarPng(d.svg, `${uitDir}/${d.type}.png`);
  }

  // Boorset
  if (heeftSleuflozeSegmenten(trace)) {
    const eng = runBoreEngineering(trace);
    for (const d of generateBoreDrawings(trace, eng)) {
      naarPng(d.svg, `${uitDir}/${d.type}-S${d.segmentVolgorde}.png`);
    }
  }

  // Station eenlijn + plattegrond
  const ontwerp: StationOntwerp = {
    stationAssetId: 's1',
    velden: [
      { type: 'ms_ring_in', kabel: '10kV XLPE 3x1x240 Al' },
      { type: 'ms_ring_uit', kabel: '10kV XLPE 3x1x240 Al' },
      { type: 'trafoveld', beveiliging: 'smeltveiligheid' },
    ],
    trafo: { vermogenKVA: 630, spanning: '10/0,4 kV' },
    lsGroepen: [
      { naam: 'Groep 1', zekeringA: 250, kabel: 'XLPE 4x240 Al', belastingKVA: 120 },
      { naam: 'Groep 2', zekeringA: 200, kabel: 'XLPE 4x150 Al', belastingKVA: 95 },
      { naam: 'Groep 3', zekeringA: 250, kabel: 'XLPE 4x240 Al', belastingKVA: 110 },
    ],
  };
  naarPng(generateStationEenlijn(trace, ontwerp, 'TS-001'), `${uitDir}/station_eenlijn.png`);
  naarPng(generateStationPlattegrond(trace, ontwerp, 'TS-001'), `${uitDir}/station_plattegrond.png`);

  // Werktekening met moffen/mantelbuizen
  const kabel = KABEL_CATALOGUS.find((k) => k.id === 'ls-xlpe-4x240-al')!;
  const lijnen = (trace.traceLines.length ? trace.traceLines : [trace.coordinates]) as TraceLines;
  const assets = [
    ...adviseerMoffen({ traceId: trace.id, traceLines: lijnen, kabel, koppeltAanGplk: true }),
    ...adviseerMantelbuizen({ trace, traceLines: lijnen, kabel }),
  ];
  naarPng(generateWerktekening(trace, assets), `${uitDir}/werktekening.png`);
}

main();
