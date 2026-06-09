import type { ConflictErnst, ConflictType } from '@/lib/db/types';
import type { BodemRisicoLocatie } from '@/lib/services/bodem-risico/types';
import { analyseBodemTraceKruisingen } from '@/lib/services/bodem-risico/trace-kruising';
import { detectBodemRisicoConflicts } from '@/lib/services/bodem-risico/conflicten';
import {
  deduplicatePoints,
  findLineIntersections,
  interpolateHoogteAtPoint,
  interpolateZAtClosestPoint,
  lineIntersectsBbox,
  minDistLineToLine,
  nauwkeurigheidBuffer,
  pointInPolygon,
  sustainedParallelViolation,
  traceBbox,
} from '@/lib/geo';

export interface ConflictInput {
  traceId: string;
  traceCoordinates: [number, number, number][];
  vereisteDekking: number;
  bestaandNet: {
    id: string;
    thema: string;
    beheerder: string;
    nauwkeurigheid: string;
    diepte?: number;
    vrijTeHoudenAfstand: number;
    coordinates: [number, number, number?][];
  }[];
  belemmeringen: {
    id: string;
    categorie: string;
    beheerder: string;
    eisDekking?: number;
    coordinates: [number, number][];
  }[];
  maaiveld?: { chainage: number; x: number; y: number; hoogteNap: number }[];
  natura2000?: { id: string; naam: string; polygon: [number, number][] }[];
  bodemRisico?: BodemRisicoLocatie[];
  traceLines?: [number, number, number?][][];
}

export interface DetectedConflict {
  id: string;
  traceId: string;
  titel: string;
  type: ConflictType;
  ernst: ConflictErnst;
  norm?: string;
  waardeGemeten?: number;
  waardeEis?: number;
  toelichting: string;
  x: number;
  y: number;
}

const DEKKING_UNDERSHOOT_M = 0.1;
const PARALLEL_TOLERANCE_M = 0.02;
const PARALLEL_MIN_RUN_M = 40;
const CROSSING_DEDUPE_M = 20;
const Z_LOOKUP_MAX_M = 12;
const MAAIVELD_LOOKUP_MAX_M = 15;

const ERNST_LABELS: Record<ConflictErnst, string> = {
  blokkerend: 'Blokkerend',
  waarschuwing: 'Waarschuwing',
  info: 'Info',
};

const TYPE_LABELS: Record<ConflictType, string> = {
  onvoldoende_afstand: 'Onvoldoende afstand',
  onvoldoende_dekking: 'Onvoldoende dekking',
  verboden_zone: 'Verboden zone',
  eigendom: 'Eigendom',
  bodemrisico: 'Bodemrisico',
};

function trace2d(coords: [number, number, number?][]): [number, number][] {
  return coords.map(([x, y]) => [x, y]);
}

function lineHasZ(coords: [number, number, number?][]): boolean {
  return coords.some(([, , z]) => z !== undefined);
}

function clearanceEis(vrijTeHoudenAfstand: number, nauwkeurigheid: string): number {
  return vrijTeHoudenAfstand * nauwkeurigheidBuffer(nauwkeurigheid);
}

export function conflictPopupHtml(conflict: DetectedConflict): string {
  const rows: [string, string][] = [
    ['Ernst', ERNST_LABELS[conflict.ernst]],
    ['Type', TYPE_LABELS[conflict.type]],
  ];
  if (conflict.norm) rows.push(['Norm', conflict.norm]);
  if (conflict.waardeGemeten !== undefined) {
    rows.push(['Gemeten', `${conflict.waardeGemeten} m`]);
  }
  if (conflict.waardeEis !== undefined) {
    rows.push(['Eis', `${conflict.waardeEis} m`]);
  }
  const detailRows = rows
    .map(([k, v]) => `<div><span style="color:#888">${k}</span> ${v}</div>`)
    .join('');
  return `<div style="font-family:system-ui;font-size:12px;max-width:260px">
    <strong>${conflict.titel}</strong>
    <div style="margin-top:4px;line-height:1.5">${detailRows}</div>
    <p style="margin:8px 0 0;line-height:1.45;color:#333">${conflict.toelichting}</p>
  </div>`;
}

export function detectConflicts(input: ConflictInput): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];
  const traceLine = trace2d(input.traceCoordinates);
  const bbox = traceBbox(input.traceCoordinates, 100);
  let conflictIdx = 0;

  const push = (conflict: Omit<DetectedConflict, 'id'>) => {
    conflicts.push({ ...conflict, id: `conflict-${++conflictIdx}` });
  };

  const relevantBelemmeringen = input.belemmeringen.filter((bel) =>
    lineIntersectsBbox(bel.coordinates, bbox)
  );

  // --- Bestaand net (KLIC): alleen bij gemeten geometrie ---
  for (const net of input.bestaandNet) {
    if (!lineHasZ(net.coordinates)) continue;

    const netLine = trace2d(net.coordinates);
    const eis = clearanceEis(net.vrijTeHoudenAfstand, net.nauwkeurigheid);
    const kruisingen = deduplicatePoints(
      findLineIntersections(traceLine, netLine),
      CROSSING_DEDUPE_M
    );

    for (const [kx, ky] of kruisingen) {
      const traceSample = interpolateZAtClosestPoint(
        input.traceCoordinates,
        kx,
        ky,
        Z_LOOKUP_MAX_M
      );
      const netSample = interpolateZAtClosestPoint(net.coordinates, kx, ky, Z_LOOKUP_MAX_M);
      if (!traceSample || !netSample) continue;

      const vertAfstand = Math.abs(traceSample.z - netSample.z);
      if (vertAfstand >= eis - PARALLEL_TOLERANCE_M) continue;

      push({
        traceId: input.traceId,
        titel: `Kruising ${net.thema}`,
        type: 'onvoldoende_afstand',
        ernst: vertAfstand < eis * 0.5 ? 'blokkerend' : 'waarschuwing',
        norm: 'NEN 7171',
        waardeGemeten: Math.round(vertAfstand * 100) / 100,
        waardeEis: Math.round(eis * 100) / 100,
        toelichting: `Gemeten verticale ruimte bij kruising met ${net.beheerder} ${net.thema} (${net.nauwkeurigheid}): ${vertAfstand.toFixed(2)} m, eis ${eis.toFixed(2)} m`,
        x: kx,
        y: ky,
      });
    }

    const parallelViolation = sustainedParallelViolation(
      traceLine,
      netLine,
      eis - PARALLEL_TOLERANCE_M,
      PARALLEL_MIN_RUN_M,
      kruisingen
    );

    if (!parallelViolation && kruisingen.length === 0) {
      const dist = minDistLineToLine(traceLine, netLine);
      if (dist < eis - PARALLEL_TOLERANCE_M) {
        push({
          traceId: input.traceId,
          titel: `Parallel ${net.thema}`,
          type: 'onvoldoende_afstand',
          ernst: dist < eis * 0.5 ? 'blokkerend' : 'waarschuwing',
          norm: 'NEN 7171',
          waardeGemeten: Math.round(dist * 100) / 100,
          waardeEis: Math.round(eis * 100) / 100,
          toelichting: `Gemeten horizontale afstand tot parallel ${net.beheerder} ${net.thema}: ${dist.toFixed(2)} m < eis ${eis.toFixed(2)} m`,
          x: traceLine[Math.floor(traceLine.length / 2)][0],
          y: traceLine[Math.floor(traceLine.length / 2)][1],
        });
      }
      continue;
    }

    if (parallelViolation) {
      push({
        traceId: input.traceId,
        titel: `Parallel ${net.thema}`,
        type: 'onvoldoende_afstand',
        ernst:
          parallelViolation.dist < eis * 0.5 ? 'blokkerend' : 'waarschuwing',
        norm: 'NEN 7171',
        waardeGemeten: Math.round(parallelViolation.dist * 100) / 100,
        waardeEis: Math.round(eis * 100) / 100,
        toelichting: `Parallel aan ${net.beheerder} ${net.thema}: ${parallelViolation.runLength.toFixed(0)} m onder eis (${parallelViolation.dist.toFixed(2)} m < ${eis.toFixed(2)} m)`,
        x: parallelViolation.x,
        y: parallelViolation.y,
      });
    }
  }

  // --- Belemmeringen: alleen watergang/spoor met gemeten waarden ---
  for (const bel of relevantBelemmeringen) {
    if (bel.categorie === 'weg' || bel.categorie === 'natuur') continue;
    if (bel.coordinates.length < 2) continue;

    const kruisingen = deduplicatePoints(
      findLineIntersections(traceLine, bel.coordinates),
      CROSSING_DEDUPE_M
    );

    for (const [kx, ky] of kruisingen) {
      if (bel.categorie === 'spoor') {
        push({
          traceId: input.traceId,
          titel: 'Spoor-kruising',
          type: 'verboden_zone',
          ernst: 'blokkerend',
          norm: 'Spoorwegwet',
          toelichting: `Tracé kruist ${bel.beheerder} — afstemming en maatregelen vereist`,
          x: kx,
          y: ky,
        });
        continue;
      }

      const traceSample = interpolateZAtClosestPoint(
        input.traceCoordinates,
        kx,
        ky,
        Z_LOOKUP_MAX_M
      );
      if (!traceSample || !input.maaiveld?.length) continue;

      const maaiveldHoogte = interpolateHoogteAtPoint(
        input.maaiveld,
        kx,
        ky,
        MAAIVELD_LOOKUP_MAX_M
      );
      if (maaiveldHoogte === undefined) continue;

      const eisDekking = bel.eisDekking ?? 1.0;
      const dekking = maaiveldHoogte - traceSample.z;
      if (dekking >= eisDekking - DEKKING_UNDERSHOOT_M) continue;

      push({
        traceId: input.traceId,
        titel: `Kruising ${bel.categorie}`,
        type: 'onvoldoende_dekking',
        ernst: dekking < eisDekking * 0.85 ? 'blokkerend' : 'waarschuwing',
        norm: bel.categorie === 'watergang' ? 'Waterwet' : 'NEN 7171',
        waardeGemeten: Math.round(dekking * 100) / 100,
        waardeEis: eisDekking,
        toelichting: `Gemeten dekking bij kruising ${bel.categorie} (${bel.beheerder}): ${dekking.toFixed(2)} m < eis ${eisDekking} m`,
        x: kx,
        y: ky,
      });
    }
  }

  // --- Natura2000: tracé in beschermd gebied ---
  for (const gebied of input.natura2000 ?? []) {
    const binnenGebied = input.traceCoordinates.some(([x, y]) =>
      pointInPolygon(x, y, gebied.polygon)
    );
    if (!binnenGebied) continue;

    const [x, y] = input.traceCoordinates.find(([tx, ty]) =>
      pointInPolygon(tx, ty, gebied.polygon)
    )!;
    push({
      traceId: input.traceId,
      titel: 'Natura2000',
      type: 'verboden_zone',
      ernst: 'blokkerend',
      norm: 'Habitatrichtlijn',
      toelichting: `Tracé ligt in ${gebied.naam} — natuurtoets vereist`,
      x,
      y,
    });
  }

  // --- Dekking langs tracé: één locatie, alleen bij gekoppelde metingen ---
  if (
    input.maaiveld &&
    input.maaiveld.length > 0 &&
    input.vereisteDekking > 0
  ) {
    let worst: { dekking: number; x: number; y: number; chainage: number } | null =
      null;

    for (let i = 0; i < input.traceCoordinates.length; i++) {
      const [x, y, z] = input.traceCoordinates[i];
      const mv = input.maaiveld[Math.min(i, input.maaiveld.length - 1)];
      if (Math.hypot(mv.x - x, mv.y - y) > MAAIVELD_LOOKUP_MAX_M) continue;

      const dekking = mv.hoogteNap - z;
      if (dekking >= input.vereisteDekking - DEKKING_UNDERSHOOT_M) continue;

      if (!worst || dekking < worst.dekking) {
        worst = { dekking, x, y, chainage: mv.chainage };
      }
    }

    if (worst) {
      push({
        traceId: input.traceId,
        titel: 'Dekking tracé',
        type: 'onvoldoende_dekking',
        ernst:
          worst.dekking < input.vereisteDekking * 0.85
            ? 'blokkerend'
            : 'waarschuwing',
        norm: 'NEN 7171',
        waardeGemeten: Math.round(worst.dekking * 100) / 100,
        waardeEis: input.vereisteDekking,
        toelichting: `Gemeten dekking bij ketting ${worst.chainage} m: ${worst.dekking.toFixed(2)} m < vereist ${input.vereisteDekking} m`,
        x: worst.x,
        y: worst.y,
      });
    }
  }

  const ernstOrder: Record<ConflictErnst, number> = {
    blokkerend: 0,
    waarschuwing: 1,
    info: 2,
  };

  // --- Bodemrisico: doorschreden of nabij risicogebied ---
  if (input.bodemRisico && input.bodemRisico.length > 0) {
    const kruisingen = analyseBodemTraceKruisingen(
      input.bodemRisico,
      input.traceCoordinates,
      input.traceLines
    );
    for (const draft of detectBodemRisicoConflicts(input.traceId, kruisingen)) {
      push(draft);
    }
  }

  const deduped: DetectedConflict[] = [];
  for (const conflict of conflicts) {
    const existingIdx = deduped.findIndex(
      (existing) =>
        existing.type === conflict.type &&
        existing.titel === conflict.titel &&
        Math.hypot(existing.x - conflict.x, existing.y - conflict.y) < 25
    );
    if (existingIdx === -1) {
      deduped.push(conflict);
      continue;
    }
    const existing = deduped[existingIdx];
    const conflictWorse =
      ernstOrder[conflict.ernst] < ernstOrder[existing.ernst] ||
      ((conflict.waardeGemeten ?? 999) < (existing.waardeGemeten ?? 999) &&
        conflict.ernst === existing.ernst);
    if (conflictWorse) {
      deduped[existingIdx] = conflict;
    }
  }

  return deduped.sort((a, b) => ernstOrder[a.ernst] - ernstOrder[b.ernst]);
}
