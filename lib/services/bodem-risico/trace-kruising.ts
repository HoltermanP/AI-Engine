import {
  findLineIntersections,
  minDistLineToLine,
  pointInPolygon,
} from '@/lib/geo';
import type {
  BodemGebiedType,
  BodemRisicoLocatie,
  BodemRisicoklasse,
  BodemTraceKruising,
} from './types';
import { GEBIED_TYPE_LABEL, RISICO_LABEL } from './types';

/** Max. afstand (m) voor 'nabij het tracé' (buiten directe doorsnijding). */
export const BODEM_NABIJ_THRESHOLD_M = 50;

/** Puntlocatie binnen deze afstand telt als doorschreden. */
const PUNT_DOORSCHREDEN_M = 3;

function traceLines(
  coordinates: [number, number, number?][],
  traceLines?: [number, number, number?][][]
): [number, number][][] {
  const lines =
    traceLines?.filter((l) => l.length >= 2) ??
    (coordinates.length >= 2 ? [coordinates] : []);
  return lines.map((l) => l.map(([x, y]) => [x, y] as [number, number]));
}

function traceDoorschrijdtPolygon(
  lines: [number, number][][],
  polygon: [number, number][]
): { doorschreden: boolean; punt: [number, number] | null } {
  for (const line of lines) {
    for (const [x, y] of line) {
      if (pointInPolygon(x, y, polygon)) {
        return { doorschreden: true, punt: [x, y] };
      }
    }
    const ring = polygon.map(([x, y]) => [x, y] as [number, number]);
    for (let i = 1; i < line.length; i++) {
      const hits = findLineIntersections([line[i - 1], line[i]], ring);
      if (hits.length > 0) return { doorschreden: true, punt: hits[0] };
    }
    const closed =
      ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
        ? ring
        : [...ring, ring[0]];
    if (findLineIntersections(line, closed).length > 0) {
      const hit = findLineIntersections(line, closed)[0];
      return { doorschreden: true, punt: hit };
    }
  }
  return { doorschreden: false, punt: null };
}

function minAfstandTrace(
  lines: [number, number][][],
  polygon?: [number, number][],
  px?: number,
  py?: number
): { afstand: number; punt: [number, number] } {
  let min = Infinity;
  let best: [number, number] = lines[0]?.[0] ?? [0, 0];

  for (const line of lines) {
    if (polygon && polygon.length >= 4) {
      const ring = polygon.map(([x, y]) => [x, y] as [number, number]);
      const d = minDistLineToLine(line, ring);
      if (d < min) {
        min = d;
        best = line[Math.floor(line.length / 2)] ?? best;
      }
    }
    if (px !== undefined && py !== undefined) {
      for (let i = 1; i < line.length; i++) {
        const [x1, y1] = line[i - 1];
        const [x2, y2] = line[i];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const qx = x1 + t * dx;
        const qy = y1 + t * dy;
        const d = Math.hypot(px - qx, py - qy);
        if (d < min) {
          min = d;
          best = [qx, qy];
        }
      }
    }
  }

  return { afstand: min === Infinity ? 999 : Math.round(min), punt: best };
}

function relatieVoorLocatie(
  loc: BodemRisicoLocatie,
  lines: [number, number][][]
): { relatie: BodemTraceKruising['relatie']; afstand: number; x: number; y: number } | null {
  if (loc.risicoklasse === 'geen') return null;

  if (loc.polygon && loc.polygon.length >= 4) {
    const cross = traceDoorschrijdtPolygon(lines, loc.polygon);
    if (cross.doorschreden && cross.punt) {
      return { relatie: 'doorschreden', afstand: 0, x: cross.punt[0], y: cross.punt[1] };
    }
    const { afstand, punt } = minAfstandTrace(lines, loc.polygon);
    if (afstand <= BODEM_NABIJ_THRESHOLD_M) {
      if (loc.gebiedType === 'bodemkwaliteitskaart') return null;
      return { relatie: 'nabij', afstand, x: punt[0], y: punt[1] };
    }
    return null;
  }

  if (loc.x !== undefined && loc.y !== undefined) {
    const { afstand, punt } = minAfstandTrace(lines, undefined, loc.x, loc.y);
    if (afstand <= PUNT_DOORSCHREDEN_M) {
      return { relatie: 'doorschreden', afstand, x: loc.x, y: loc.y };
    }
    if (afstand <= BODEM_NABIJ_THRESHOLD_M) {
      return { relatie: 'nabij', afstand, x: punt[0], y: punt[1] };
    }
  }

  return null;
}

/** Bepaal welke bodemlocaties het tracé doorschrijdt of nabij liggen. */
export function analyseBodemTraceKruisingen(
  locaties: BodemRisicoLocatie[],
  coordinates: [number, number, number?][],
  traceLinesInput?: [number, number, number?][][]
): BodemTraceKruising[] {
  const lines = traceLines(coordinates, traceLinesInput);
  if (lines.length === 0) return [];

  const kruisingen: BodemTraceKruising[] = [];

  for (const loc of locaties) {
    const hit = relatieVoorLocatie(loc, lines);
    if (!hit) continue;
    kruisingen.push({
      locatieId: loc.id,
      naam: loc.naam,
      bron: loc.bron,
      risicoklasse: loc.risicoklasse,
      gebiedType: loc.gebiedType,
      relatie: hit.relatie,
      afstandTraceM: hit.afstand,
      x: hit.x,
      y: hit.y,
    });
  }

  const volgorde = { doorschreden: 0, nabij: 1 };
  const risicoVolgorde = ['zeer_hoog', 'hoog', 'middel', 'laag', 'beheer', 'onbekend'];
  return kruisingen.sort((a, b) => {
    const r = volgorde[a.relatie] - volgorde[b.relatie];
    if (r !== 0) return r;
    return risicoVolgorde.indexOf(a.risicoklasse) - risicoVolgorde.indexOf(b.risicoklasse);
  });
}

export function gebiedLabelMetRelatie(k: BodemTraceKruising): string {
  const rel = k.relatie === 'doorschreden' ? 'Doorschreden' : `Nabij (${k.afstandTraceM} m)`;
  return `${rel}: ${RISICO_LABEL[k.risicoklasse]} — ${GEBIED_TYPE_LABEL[k.gebiedType]}`;
}
