/** Koppel losse NWB-wegvakken tot één doorlopende middellijn (RD). */

function roundCoord([x, y]: [number, number]): [number, number] {
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export function dedupeCenterlinePoints(
  points: [number, number][],
  minDist = 8
): [number, number][] {
  const out: [number, number][] = [];
  for (const [x, y] of points) {
    const p = roundCoord([x, y]);
    if (
      !out.length ||
      Math.hypot(p[0] - out[out.length - 1][0], p[1] - out[out.length - 1][1]) >= minDist
    ) {
      out.push(p);
    }
  }
  return out;
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Verbind wegvak-segmenten via dichtstbijzijnde eindpunten (max 75 m sprong). */
export function chainNwbSegments(
  segments: [number, number][][],
  minPointDist = 8
): [number, number][] {
  const lines = segments.filter((s) => s.length >= 2);
  if (!lines.length) return [];

  let bestStart = 0;
  let bestLen = 0;
  for (let i = 0; i < lines.length; i++) {
    let len = 0;
    for (let j = 1; j < lines[i].length; j++) {
      len += dist(lines[i][j - 1], lines[i][j]);
    }
    if (len > bestLen) {
      bestLen = len;
      bestStart = i;
    }
  }

  let path = [...lines[bestStart]];
  const used = new Set<number>([bestStart]);
  const maxGap = 75;

  while (used.size < lines.length) {
    const head = path[0];
    const tail = path[path.length - 1];
    let best: {
      idx: number;
      reverse: boolean;
      prepend: boolean;
      gap: number;
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const line = lines[i];
      const first = line[0];
      const last = line[line.length - 1];
      const options = [
        { gap: dist(tail, first), reverse: false, prepend: false },
        { gap: dist(tail, last), reverse: true, prepend: false },
        { gap: dist(head, last), reverse: false, prepend: true },
        { gap: dist(head, first), reverse: true, prepend: true },
      ];
      for (const opt of options) {
        if (opt.gap <= maxGap && (!best || opt.gap < best.gap)) {
          best = { idx: i, reverse: opt.reverse, prepend: opt.prepend, gap: opt.gap };
        }
      }
    }

    if (!best) break;
    used.add(best.idx);
    const raw = best.reverse ? [...lines[best.idx]].reverse() : lines[best.idx];
    path = best.prepend
      ? [...raw.slice(0, -1), ...path]
      : [...path.slice(0, -1), ...raw];
  }

  return dedupeCenterlinePoints(path, minPointDist);
}
