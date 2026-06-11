/**
 * Chainage-wiskunde op tracélijnen: assets (moffen, mantelbuizen) zijn aan
 * een metrering langs de lijn gebonden zodat ze geldig blijven wanneer het
 * tracé opnieuw wordt getekend of versleept.
 */

import type { TraceLine, TraceLines } from '@/lib/trace-edit';

export function lijnLengteM(line: TraceLine): number {
  let lengte = 0;
  for (let i = 1; i < line.length; i++) {
    lengte += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  }
  return lengte;
}

export function clampChainage(line: TraceLine, chainageM: number): number {
  return Math.max(0, Math.min(lijnLengteM(line), chainageM));
}

/** Punt + richting (rad, t.o.v. x-as) op metrering `chainageM` langs de lijn. */
export function puntOpChainage(
  line: TraceLine,
  chainageM: number,
): { x: number; y: number; richtingRad: number } | null {
  if (line.length < 2) return null;
  let rest = clampChainage(line, chainageM);

  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const segLen = Math.hypot(bx - ax, by - ay);
    if (segLen <= 0) continue;
    if (rest <= segLen || i === line.length - 1) {
      const t = Math.min(1, rest / segLen);
      return {
        x: ax + (bx - ax) * t,
        y: ay + (by - ay) * t,
        richtingRad: Math.atan2(by - ay, bx - ax),
      };
    }
    rest -= segLen;
  }
  return null;
}

/**
 * Projecteer een vrij punt op de lijn en geef de metrering + afstand terug.
 */
export function chainageVanPunt(
  line: TraceLine,
  x: number,
  y: number,
): { chainageM: number; afstandM: number } | null {
  if (line.length < 2) return null;
  let best: { chainageM: number; afstandM: number } | null = null;
  let basis = 0;

  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const segLen = Math.sqrt(lenSq);
    if (segLen <= 0) continue;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lenSq));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const afstand = Math.hypot(x - px, y - py);
    if (!best || afstand < best.afstandM) {
      best = { chainageM: basis + t * segLen, afstandM: afstand };
    }
    basis += segLen;
  }
  return best;
}

/** Snap een vrij punt naar de dichtstbijzijnde lijn binnen `maxAfstandM`. */
export function snapNaarLijnen(
  lines: TraceLines,
  x: number,
  y: number,
  maxAfstandM = 50,
): { lijnIndex: number; chainageM: number; x: number; y: number } | null {
  let best: { lijnIndex: number; chainageM: number; afstandM: number } | null = null;
  for (let li = 0; li < lines.length; li++) {
    const hit = chainageVanPunt(lines[li], x, y);
    if (hit && hit.afstandM <= maxAfstandM && (!best || hit.afstandM < best.afstandM)) {
      best = { lijnIndex: li, chainageM: hit.chainageM, afstandM: hit.afstandM };
    }
  }
  if (!best) return null;
  const punt = puntOpChainage(lines[best.lijnIndex], best.chainageM);
  if (!punt) return null;
  return { lijnIndex: best.lijnIndex, chainageM: best.chainageM, x: punt.x, y: punt.y };
}
