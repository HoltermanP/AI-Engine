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
