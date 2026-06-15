import type { MapTrace } from '@/components/trace-map';

export type TraceCoord = [number, number, number];
export type TraceLine = TraceCoord[];
export type TraceLines = TraceLine[];

export function getTraceLines(trace: MapTrace): TraceLines {
  if (trace.traceLines?.length) {
    return trace.traceLines.map((line) => line.map((c) => [...c] as TraceCoord));
  }
  if (trace.coordinates.length > 0) {
    return [trace.coordinates.map((c) => [...c] as TraceCoord)];
  }
  return [[]];
}

export function flattenTraceLines(lines: TraceLines): TraceCoord[] {
  return lines.flat();
}

function distPointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function findNearestVertex(
  lines: TraceLines,
  x: number,
  y: number,
  maxDistM = 25
): { lineIdx: number; vertexIdx: number } | null {
  let best: { lineIdx: number; vertexIdx: number; dist: number } | null = null;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let vertexIdx = 0; vertexIdx < line.length; vertexIdx++) {
      const [vx, vy] = line[vertexIdx];
      const dist = Math.hypot(vx - x, vy - y);
      if (dist <= maxDistM && (!best || dist < best.dist)) {
        best = { lineIdx, vertexIdx, dist };
      }
    }
  }

  return best ? { lineIdx: best.lineIdx, vertexIdx: best.vertexIdx } : null;
}

export function findNearestSegmentInsert(
  lines: TraceLines,
  x: number,
  y: number,
  maxDistM = 20
): { lineIdx: number; insertAfterIdx: number } | null {
  let best: { lineIdx: number; insertAfterIdx: number; dist: number } | null = null;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i];
      const [bx, by] = line[i + 1];
      const dist = distPointToSegment(x, y, ax, ay, bx, by);
      if (dist <= maxDistM && (!best || dist < best.dist)) {
        best = { lineIdx, insertAfterIdx: i, dist };
      }
    }
  }

  return best ? { lineIdx: best.lineIdx, insertAfterIdx: best.insertAfterIdx } : null;
}

export function moveVertex(
  lines: TraceLines,
  lineIdx: number,
  vertexIdx: number,
  x: number,
  y: number
): TraceLines {
  return lines.map((line, li) => {
    if (li !== lineIdx) return line;
    return line.map((coord, vi) =>
      vi === vertexIdx ? [x, y, coord[2] ?? -0.65] : coord
    );
  });
}

export function insertVertexAfter(
  lines: TraceLines,
  lineIdx: number,
  insertAfterIdx: number,
  x: number,
  y: number,
  z = -0.65
): TraceLines {
  return lines.map((line, li) => {
    if (li !== lineIdx) return line;
    const next = [...line];
    next.splice(insertAfterIdx + 1, 0, [x, y, z]);
    return next;
  });
}

export function appendVertex(lines: TraceLines, x: number, y: number, z = -0.65): TraceLines {
  if (lines.length === 0) return [[[x, y, z]]];
  const next = lines.map((line) => [...line]);
  const lastLine = next[next.length - 1] ?? [];
  lastLine.push([x, y, z]);
  next[next.length - 1] = lastLine;
  return next;
}

/** Verwijder een hoekpunt; behoud minimaal 2 punten per lijn. */
export function deleteVertex(lines: TraceLines, lineIdx: number, vertexIdx: number): TraceLines {
  return lines.map((line, li) => {
    if (li !== lineIdx || line.length <= 2) return line;
    return line.filter((_, vi) => vi !== vertexIdx);
  });
}

/** REVERSE: keer de richting van één lijn om (start ↔ eind). */
export function reverseLine(lines: TraceLines, lineIdx: number): TraceLines {
  return lines.map((line, li) => (li === lineIdx ? [...line].reverse() : line));
}

/**
 * BREAK: splits een lijn op het punt (x,y) — geprojecteerd op het
 * dichtstbijzijnde segment — in twee aparte lijnen. Het breekpunt wordt het
 * eindpunt van het eerste en het beginpunt van het tweede deel.
 */
export function breakLine(
  lines: TraceLines,
  lineIdx: number,
  x: number,
  y: number
): TraceLines {
  const line = lines[lineIdx];
  if (!line || line.length < 2) return lines;

  let beste = { seg: -1, t: 0, d: Infinity, px: x, py: y };
  for (let i = 0; i < line.length - 1; i++) {
    const ax = line[i][0];
    const ay = line[i][1];
    const dx = line[i + 1][0] - ax;
    const dy = line[i + 1][1] - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lenSq));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d = Math.hypot(x - px, y - py);
    if (d < beste.d) beste = { seg: i, t, d, px, py };
  }
  if (beste.seg < 0) return lines;

  const z = line[beste.seg][2] ?? -0.65;
  const breekpunt: TraceCoord = [beste.px, beste.py, z];
  const kopieer = (l: TraceCoord[]) => l.map((c) => [...c] as TraceCoord);

  let eerste: TraceLine;
  let tweede: TraceLine;
  if (beste.t <= 0.001) {
    // Breken op het beginhoekpunt van het segment (gedeeld punt)
    eerste = kopieer(line.slice(0, beste.seg + 1));
    tweede = kopieer(line.slice(beste.seg));
  } else if (beste.t >= 0.999) {
    // Breken op het eindhoekpunt van het segment (gedeeld punt)
    eerste = kopieer(line.slice(0, beste.seg + 2));
    tweede = kopieer(line.slice(beste.seg + 1));
  } else {
    // Breken midden in het segment → nieuw breekpunt in beide delen
    eerste = [...kopieer(line.slice(0, beste.seg + 1)), [...breekpunt] as TraceCoord];
    tweede = [[...breekpunt] as TraceCoord, ...kopieer(line.slice(beste.seg + 1))];
  }
  if (eerste.length < 2 || tweede.length < 2) return lines;

  const next = lines.map((l) => l.map((c) => [...c] as TraceCoord));
  next.splice(lineIdx, 1, eerste, tweede);
  return next;
}

/**
 * JOIN: voeg twee lijnen samen wanneer een uiteinde van A binnen `tolM` van een
 * uiteinde van B ligt. De lijnen worden correct georiënteerd aaneengeschakeld;
 * het dubbele verbindingspunt wordt eenmaal opgenomen.
 */
export function joinLines(
  lines: TraceLines,
  idxA: number,
  idxB: number,
  tolM = 5
): TraceLines {
  if (idxA === idxB) return lines;
  const a = lines[idxA];
  const b = lines[idxB];
  if (!a || !b || a.length < 2 || b.length < 2) return lines;

  const aStart = a[0];
  const aEind = a[a.length - 1];
  const bStart = b[0];
  const bEind = b[b.length - 1];
  const d = (p: TraceCoord, q: TraceCoord) => Math.hypot(p[0] - q[0], p[1] - q[1]);

  // Kies de combinatie met het kleinste gat tussen de uiteinden
  const opties: { gat: number; lijn: () => TraceLine }[] = [
    { gat: d(aEind, bStart), lijn: () => [...a, ...b.slice(1)] },
    { gat: d(aEind, bEind), lijn: () => [...a, ...[...b].reverse().slice(1)] },
    { gat: d(aStart, bEind), lijn: () => [...b, ...a.slice(1)] },
    { gat: d(aStart, bStart), lijn: () => [...[...b].reverse(), ...a.slice(1)] },
  ];
  const beste = opties.reduce((m, o) => (o.gat < m.gat ? o : m));
  if (beste.gat > tolM) return lines;

  const samengevoegd = beste.lijn().map((c) => [...c] as TraceCoord);
  return lines
    .map((l, i) => (i === idxA ? samengevoegd : l))
    .filter((_, i) => i !== idxB);
}

export function applyTraceLines(trace: MapTrace, lines: TraceLines): MapTrace {
  return {
    ...trace,
    traceLines: lines,
    coordinates: flattenTraceLines(lines),
  };
}

export function normalizeTraceCoordinates(
  coordinates: [number, number, number?][]
): [number, number, number][] {
  return coordinates.map(([x, y, z]) => [x, y, z ?? -0.65]);
}

export function demoTraceToMapTrace(trace: {
  id: string;
  code: string;
  naam: string;
  discipline: string;
  kleur: string;
  coordinates: [number, number, number?][];
  traceLines?: [number, number, number?][][];
}): MapTrace {
  return {
    id: trace.id,
    code: trace.code,
    naam: trace.naam,
    discipline: trace.discipline,
    kleur: trace.kleur,
    coordinates: trace.coordinates,
    traceLines: trace.traceLines,
  };
}
