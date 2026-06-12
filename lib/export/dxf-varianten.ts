/**
 * DXF-varianten per tracé — gedeeld door de export-API en de
 * uitvoeringsmap-ZIP. Eenheden in meters (RD EPSG:28992).
 */

import { getDemoBestaandNet } from '@/lib/db/demo-store';
import {
  generateTraceDxf,
  generateLengthProfileDxf,
  generateCrossSectionDxf,
  generateCrossingDetailDxf,
  generateBorePlanDxf,
  generateBoreProfileDxf,
  generateWerktekeningDxf,
  type DxfKlicThema,
  type RdPunt,
} from '@/lib/drawings/dxf';
import { getDemoNetontwerp } from '@/lib/db/netontwerp-store';
import { puntOpChainage } from '@/lib/netontwerp/chainage';
import type { TraceLines } from '@/lib/trace-edit';
import { getAvoiForGemeente } from '@/demo/avoi';
import { getGebiedProfiel } from '@/demo/reports/context';
import { traceLengthM } from '@/lib/geo';
import { sleuflozeSegmenten, buildBoreSegmentInput } from '@/demo/bore-data';
import { boreProfilePoints } from '@/lib/drawings/bore-profile';
import type { DemoTrace } from '@/demo/traces';

export const DXF_VARIANTEN = ['situatie', 'lengteprofiel', 'dwarsprofiel', 'kruising', 'boorplan', 'boorprofiel', 'werktekening'] as const;

function naarDxfThema(thema: string): DxfKlicThema {
  const t = thema.toLowerCase();
  if (t.includes('gas')) return 'gas';
  if (t.includes('water')) return 'water';
  if (t.includes('spanning') || t.includes('elektra')) return 'elektra';
  if (t.includes('telecom') || t.includes('data')) return 'telecom';
  if (t.includes('riool')) return 'riool';
  return 'overig';
}

function profielVanTrace(trace: DemoTrace): {
  maaiveld: [number, number][];
  leidingAs: [number, number][];
  lengte: number;
} {
  const lengte = traceLengthM(trace.coordinates, trace.traceLines);
  const diepte = trace.coordinates[0]?.[2] ?? -1.0;
  return {
    maaiveld: [
      [0, 0],
      [Math.max(lengte, 1), 0],
    ],
    leidingAs: [
      [0, diepte],
      [Math.max(lengte, 1), diepte],
    ],
    lengte,
  };
}

export function dxfVariant(trace: DemoTrace, variant: string): { dxf: string; suffix: string } | null {
  switch (variant) {
    case 'situatie': {
      const bestaandNet = getDemoBestaandNet().map((net) => ({
        thema: naarDxfThema(net.thema),
        label: `${net.thema} (${net.beheerder})`,
        coordinaten: net.coordinates.map(([x, y]) => [x, y] as [number, number]),
      }));
      return {
        suffix: '',
        dxf: generateTraceDxf({
          naam: `${trace.code} — ${trace.naam}`,
          centerline: trace.coordinates.map(([x, y]) => [x, y] as [number, number]),
          bestaandNet,
        }),
      };
    }
    case 'lengteprofiel': {
      const p = profielVanTrace(trace);
      return {
        suffix: '-lengteprofiel',
        dxf: generateLengthProfileDxf({
          naam: trace.code,
          maaiveld: p.maaiveld,
          leidingAs: p.leidingAs,
        }),
      };
    }
    case 'dwarsprofiel': {
      const { gemeente } = getGebiedProfiel(trace.projectId);
      const avoi = getAvoiForGemeente(gemeente);
      return {
        suffix: '-dwarsprofiel',
        dxf: generateCrossSectionDxf({
          naam: `${trace.code} (AVOI ${gemeente})`,
          profielBreedteM: avoi.profileWidthM,
          slots: avoi.ordening.map((slot) => ({
            label: slot.label,
            offsetM: slot.offsetM,
            diepteNap: -(slot.minDekkingM + 0.1),
          })),
        }),
      };
    }
    case 'kruising': {
      const kruising = trace.segmenten.flatMap((s) => s.kruisingen ?? [])[0];
      return {
        suffix: '-kruisingsdetail',
        dxf: generateCrossingDetailDxf({
          naam: kruising ? `${trace.code} — ${kruising.naam}` : trace.code,
          dekkingM: trace.vereisteDekking,
          methodeLabel: kruising?.methodeLabel,
        }),
      };
    }
    case 'boorplan':
    case 'boorprofiel': {
      const lijn = trace.traceLines[0] ?? [];
      if (lijn.length < 2) return null;
      const boorSegment = sleuflozeSegmenten(trace)[0];
      const boreInput = boorSegment ? buildBoreSegmentInput(trace, boorSegment) : null;
      if (variant === 'boorplan') {
        return {
          suffix: '-boorplan',
          dxf: generateBorePlanDxf({
            naam: trace.code,
            centerline: lijn.map(([x, y]) => [x, y] as [number, number]),
            entryPut: boreInput
              ? { l: boreInput.trajectory.entryPutL, b: boreInput.trajectory.entryPutB }
              : { l: 3, b: 2 },
            exitPut: boreInput
              ? { l: boreInput.trajectory.exitPutL, b: boreInput.trajectory.exitPutB }
              : { l: 3, b: 2 },
          }),
        };
      }
      if (!boreInput) {
        const p = profielVanTrace(trace);
        return {
          suffix: '-boorprofiel',
          dxf: generateBoreProfileDxf({
            naam: trace.code,
            maaiveld: p.maaiveld,
            boorlijn: p.leidingAs,
            grondwaterNap: -1.5,
          }),
        };
      }
      return {
        suffix: '-boorprofiel',
        dxf: generateBoreProfileDxf({
          naam: trace.code,
          maaiveld: [
            [0, boreInput.maaiveldNap],
            [Math.max(boreInput.lengteM, 1), boreInput.maaiveldNap],
          ],
          boorlijn: boreProfilePoints(boreInput.trajectory, boreInput.lengteM, boreInput.maaiveldNap),
          grondwaterNap: boreInput.grondwaterNap,
        }),
      };
    }
    case 'werktekening': {
      const ontwerp = getDemoNetontwerp(trace.projectId);
      const lijnen = (trace.traceLines.length ? trace.traceLines : [trace.coordinates]) as TraceLines;
      const assets = ontwerp?.assets ?? [];

      const moffen = assets
        .filter((a) => a.type === 'mof' && a.positie.binding === 'chainage' && a.positie.traceId === trace.id)
        .flatMap((a) => {
          const pos = a.positie as { lijnIndex: number; chainageM: number };
          const punt = puntOpChainage(lijnen[pos.lijnIndex] ?? [], pos.chainageM);
          if (!punt) return [];
          const code = a.subtype === 'verbindingsmof' ? 'M' : a.subtype === 'overgangsmof' ? 'OM' : 'EM';
          return [{ x: punt.x, y: punt.y, code, chainageM: pos.chainageM }];
        });

      const mantelbuizen = assets
        .filter((a) => a.type === 'mantelbuis' && a.positie.binding === 'chainage_bereik' && a.positie.traceId === trace.id)
        .flatMap((a) => {
          const pos = a.positie as { lijnIndex: number; vanM: number; totM: number };
          const lijn = lijnen[pos.lijnIndex] ?? [];
          const coords: RdPunt[] = [];
          for (let i = 0; i <= 8; i++) {
            const punt = puntOpChainage(lijn, pos.vanM + ((pos.totM - pos.vanM) * i) / 8);
            if (punt) coords.push([punt.x, punt.y]);
          }
          return coords.length >= 2
            ? [{ coordinaten: coords, label: `Mantelbuis Ø${a.eigenschappen.diameterMm ?? ''}` }]
            : [];
        });

      const stations = assets
        .filter((a) => a.type === 'station' && a.positie.binding === 'punt')
        .map((a) => {
          const pos = a.positie as { x: number; y: number };
          return { x: pos.x, y: pos.y, naam: a.naam };
        });

      return {
        suffix: '-werktekening',
        dxf: generateWerktekeningDxf({
          naam: trace.code,
          centerlines: lijnen.map((l) => l.map(([x, y]) => [x, y] as RdPunt)),
          moffen,
          mantelbuizen,
          stations,
        }),
      };
    }
    default:
      return null;
  }
}

