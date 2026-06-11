import { describe, expect, it } from 'vitest';
import { generateStationEenlijn } from './station-eenlijn';
import { generateStationPlattegrond, stationBinnenmaten } from './station-plattegrond';
import { generateWerktekening } from './werktekening';
import { DEMO_TRACES } from '@/demo/traces';
import type { NetontwerpAsset, StationOntwerp } from '@/lib/netontwerp/types';

const trace = DEMO_TRACES[0];

const ontwerp: StationOntwerp = {
  stationAssetId: 'station-1',
  velden: [
    { type: 'ms_ring_in', kabel: '10kV XLPE 3x1x240 Al' },
    { type: 'ms_ring_uit', kabel: '10kV XLPE 3x1x240 Al' },
    { type: 'trafoveld', beveiliging: 'smeltveiligheid' },
  ],
  trafo: { vermogenKVA: 630, spanning: '10/0,4 kV' },
  lsGroepen: [
    { naam: 'Groep 1', zekeringA: 250, kabel: 'XLPE 4x240 Al', belastingKVA: 120 },
    { naam: 'Groep 2', zekeringA: 250, kabel: 'XLPE 4x240 Al', belastingKVA: 110 },
  ],
};

describe('station-eenlijn', () => {
  it('bevat MS-rail, LS-rail, trafo en alle groepen', () => {
    const svg = generateStationEenlijn(trace, ontwerp, 'TS-001');
    expect(svg).toContain('MS-rail');
    expect(svg).toContain('LS-rail');
    expect(svg).toContain('Trafo 630 kVA');
    expect(svg).toContain('Groep 1');
    expect(svg).toContain('Groep 2');
    expect(svg).toContain('250 A gG');
    expect(svg).toContain('Eenlijnschema');
  });
});

describe('station-plattegrond', () => {
  it('berekent binnenmaten uit velden en trafomaat', () => {
    const maten = stationBinnenmaten(ontwerp);
    expect(maten.lengteM).toBeGreaterThanOrEqual(3.2);
    expect(maten.breedteM).toBeGreaterThanOrEqual(2.2);
  });

  it('rendert plattegrond met ruimtebeslag en maatvoering', () => {
    const svg = generateStationPlattegrond(trace, ontwerp, 'TS-001');
    expect(svg).toContain('Plattegrond');
    expect(svg).toContain('Ruimtebeslag');
    expect(svg).toContain('Maatvoering');
    expect(svg).toContain('RMU 3 velden');
  });
});

describe('werktekening', () => {
  it('tekent moffen en mantelbuizen op chainage', () => {
    const assets: NetontwerpAsset[] = [
      {
        id: 'mof-1',
        type: 'mof',
        subtype: 'verbindingsmof',
        naam: 'Mof 1',
        positie: { binding: 'chainage', traceId: trace.id, lijnIndex: 0, chainageM: 200 },
        eigenschappen: {},
        bron: 'auto',
        gekoppeldeTraceIds: [trace.id],
      },
      {
        id: 'mb-1',
        type: 'mantelbuis',
        subtype: 'weg',
        naam: 'Mantelbuis weg',
        positie: { binding: 'chainage_bereik', traceId: trace.id, lijnIndex: 0, vanM: 80, totM: 120 },
        eigenschappen: { diameterMm: 160, methode: 'persing' },
        bron: 'auto',
        gekoppeldeTraceIds: [trace.id],
      },
    ];
    const svg = generateWerktekening(trace, assets);
    expect(svg).toContain('Werktekening');
    expect(svg).toContain('data-symbool="mof"');
    expect(svg).toContain('Mantelbuis');
    expect(svg).toContain('1 moffen');
    expect(svg).toContain('Maatvoering');
  });
});
