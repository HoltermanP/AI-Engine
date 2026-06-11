/**
 * Mof- en mantelbuisadvies voor de werktekening (UO):
 * - verbindingsmoffen per haspellengte van de gekozen kabel
 * - eindmoffen aan beide uiteinden
 * - overgangsmof waar nieuw XLPE op bestaand GPLK koppelt
 * - mantelbuizen geseed uit kruisingen in de tracésegmenten
 */

import type { NetontwerpAsset } from './types';
import type { KabelSpec } from './kabel-catalogus';
import { lijnLengteM } from './chainage';
import type { TraceLines } from '@/lib/trace-edit';
import type { DemoTrace } from '@/demo/traces';

let mofTeller = 0;
function assetId(prefix: string): string {
  mofTeller += 1;
  return `${prefix}-${mofTeller.toString(36)}-${(mofTeller * 7919) % 10000}`;
}

export function adviseerMoffen(opts: {
  traceId: string;
  traceLines: TraceLines;
  kabel: KabelSpec;
  /** Koppelt het nieuwe tracé aan bestaand GPLK-net? Dan overgangsmof aan het begin. */
  koppeltAanGplk?: boolean;
}): NetontwerpAsset[] {
  const assets: NetontwerpAsset[] = [];
  const haspel = opts.kabel.haspelLengteM;

  opts.traceLines.forEach((line, lijnIndex) => {
    const lengte = lijnLengteM(line);
    if (lengte <= 0) return;

    // Eindmoffen / eindsluitingen aan beide uiteinden
    const eindPosities: { chainageM: number; subtype: string; naam: string }[] = [
      {
        chainageM: 0,
        subtype: opts.koppeltAanGplk && lijnIndex === 0 ? 'overgangsmof' : 'eindmof',
        naam: opts.koppeltAanGplk && lijnIndex === 0 ? 'Overgangsmof (GPLK↔XLPE)' : 'Eindsluiting begin',
      },
      { chainageM: lengte, subtype: 'eindmof', naam: 'Eindsluiting einde' },
    ];
    for (const eind of eindPosities) {
      assets.push({
        id: assetId('mof'),
        type: 'mof',
        subtype: eind.subtype,
        naam: eind.naam,
        positie: { binding: 'chainage', traceId: opts.traceId, lijnIndex, chainageM: eind.chainageM },
        eigenschappen: { kabel: opts.kabel.label },
        bron: 'auto',
        gekoppeldeTraceIds: [opts.traceId],
      });
    }

    // Verbindingsmoffen per haspellengte
    for (let m = haspel; m < lengte - 1; m += haspel) {
      assets.push({
        id: assetId('mof'),
        type: 'mof',
        subtype: 'verbindingsmof',
        naam: `Verbindingsmof km ${(m / 1000).toFixed(3)}`,
        positie: { binding: 'chainage', traceId: opts.traceId, lijnIndex, chainageM: m },
        eigenschappen: { kabel: opts.kabel.label, haspelLengteM: haspel },
        bron: 'auto',
        gekoppeldeTraceIds: [opts.traceId],
      });
    }
  });

  return assets;
}

/**
 * Seed mantelbuizen uit de kruisingen van het tracé: per kruising een buis
 * van 1,5× de kabeldiameter (min. Ø110) met 2 m uitloop aan weerszijden.
 */
export function adviseerMantelbuizen(opts: {
  trace: DemoTrace;
  traceLines: TraceLines;
  kabel: KabelSpec;
}): NetontwerpAsset[] {
  const assets: NetontwerpAsset[] = [];
  const lijn = opts.traceLines[0];
  if (!lijn || lijn.length < 2) return assets;
  const totaal = lijnLengteM(lijn);
  const diameterMm = Math.max(110, Math.ceil((opts.kabel.diameterMm * 1.5) / 10) * 10);

  const kruisingen = opts.trace.segmenten.flatMap((s) => s.kruisingen ?? []);
  // Zonder exacte kruisingschainage: verdeel ze evenredig over het tracé
  kruisingen.forEach((kruising, i) => {
    const midden = (totaal * (i + 1)) / (kruisingen.length + 1);
    const lengteM = kruising.type === 'water' ? 30 : 15;
    assets.push({
      id: assetId('mantel'),
      type: 'mantelbuis',
      subtype: kruising.type,
      naam: `Mantelbuis ${kruising.naam ?? kruising.type} Ø${diameterMm}`,
      positie: {
        binding: 'chainage_bereik',
        traceId: opts.trace.id,
        lijnIndex: 0,
        vanM: Math.max(0, midden - lengteM / 2 - 2),
        totM: Math.min(totaal, midden + lengteM / 2 + 2),
      },
      eigenschappen: {
        diameterMm,
        kruisingType: kruising.type,
        methode: kruising.methode ?? 'open ontgraving',
      },
      bron: 'auto',
      gekoppeldeTraceIds: [opts.trace.id],
    });
  });

  return assets;
}
