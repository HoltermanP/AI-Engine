/**
 * Bemating (dimensions) voor de tekentool en de tekeningen — AutoCAD-stijl.
 * Twee soorten: lineaire maatlijn (afstand tussen twee punten, met een
 * maatlijn-offset) en hoekbemating (hoek tussen twee benen vanuit een hoekpunt).
 *
 * Alle invoer/uitvoer is in RD-coördinaten (meters). De geometrie is puur en
 * rendering-onafhankelijk: zowel de kaart (MapLibre) als de SVG-tekening en de
 * DXF-export passen er hun eigen coördinaattransformatie op toe.
 */

export type BematingType = 'lineair' | 'hoek';

export interface Bemating {
  id: string;
  type: BematingType;
  /**
   * Lineair: [punt1, punt2]. Hoek: [been1, hoekpunt, been2].
   * Punten in RD (x, y) meters.
   */
  punten: [number, number][];
  /** Maatlijn-offset (m) loodrecht op de meetrichting (lineair). */
  offsetM?: number;
  /** Straal van de hoekboog (m). */
  radiusM?: number;
  /** Optioneel handmatig label i.p.v. de gemeten waarde. */
  tekst?: string;
}

export interface LineaireBematingGeo {
  type: 'lineair';
  /** Maatlijn (verschoven over de offset). */
  maatlijn: [[number, number], [number, number]];
  /** Maathulplijnen van de meetpunten naar de maatlijn. */
  extensie1: [[number, number], [number, number]];
  extensie2: [[number, number], [number, number]];
  /** Pijlposities (uiteinden van de maatlijn) + eenheidsrichting. */
  pijl1: [number, number];
  pijl2: [number, number];
  richting: [number, number];
  tekstPos: [number, number];
  tekstHoekDeg: number;
  waarde: number;
  label: string;
}

export interface HoekBematingGeo {
  type: 'hoek';
  vertex: [number, number];
  /** Boogpunten (RD). */
  boog: [number, number][];
  pijlStart: [number, number];
  pijlEind: [number, number];
  tekstPos: [number, number];
  waarde: number;
  label: string;
}

export type BematingGeo = LineaireBematingGeo | HoekBematingGeo;

function sub(a: [number, number], b: [number, number]): [number, number] {
  return [a[0] - b[0], a[1] - b[1]];
}
function len(v: [number, number]): number {
  return Math.hypot(v[0], v[1]);
}
function eenheid(v: [number, number]): [number, number] {
  const l = len(v) || 1;
  return [v[0] / l, v[1] / l];
}

/** Formatteer een lengte (m) met 2 decimalen. */
export function lengteLabel(m: number): string {
  return `${m.toFixed(2)} m`;
}
/** Formatteer een hoek (graden) met 1 decimaal. */
export function hoekLabel(deg: number): string {
  return `${deg.toFixed(1)}°`;
}

function lineaireGeo(b: Bemating): LineaireBematingGeo {
  const [p1, p2] = b.punten;
  const offset = b.offsetM ?? 4;
  const dir = eenheid(sub(p2, p1));
  // Normaal (links van de richting); maatlijn aan die zijde
  const nx = -dir[1];
  const ny = dir[0];
  const o: [number, number] = [nx * offset, ny * offset];
  const m1: [number, number] = [p1[0] + o[0], p1[1] + o[1]];
  const m2: [number, number] = [p2[0] + o[0], p2[1] + o[1]];
  const waarde = len(sub(p2, p1));
  const tekstHoek = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI;
  return {
    type: 'lineair',
    maatlijn: [m1, m2],
    extensie1: [p1, [m1[0] + nx * 0.6, m1[1] + ny * 0.6]],
    extensie2: [p2, [m2[0] + nx * 0.6, m2[1] + ny * 0.6]],
    pijl1: m1,
    pijl2: m2,
    richting: dir,
    tekstPos: [(m1[0] + m2[0]) / 2 + nx * 1.2, (m1[1] + m2[1]) / 2 + ny * 1.2],
    tekstHoekDeg: tekstHoek > 90 || tekstHoek < -90 ? tekstHoek + 180 : tekstHoek,
    waarde,
    label: b.tekst ?? lengteLabel(waarde),
  };
}

function hoekGeo(b: Bemating): HoekBematingGeo {
  const [arm1, vertex, arm2] = b.punten;
  const radius = b.radiusM ?? (Math.min(len(sub(arm1, vertex)), len(sub(arm2, vertex))) * 0.5 || 5);
  const a1 = Math.atan2(arm1[1] - vertex[1], arm1[0] - vertex[0]);
  const a2 = Math.atan2(arm2[1] - vertex[1], arm2[0] - vertex[0]);
  // Kortste draairichting van a1 naar a2
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const waarde = Math.abs((delta * 180) / Math.PI);

  const STAPPEN = 24;
  const boog: [number, number][] = [];
  for (let i = 0; i <= STAPPEN; i++) {
    const a = a1 + delta * (i / STAPPEN);
    boog.push([vertex[0] + radius * Math.cos(a), vertex[1] + radius * Math.sin(a)]);
  }
  const midA = a1 + delta / 2;
  return {
    type: 'hoek',
    vertex,
    boog,
    pijlStart: boog[0],
    pijlEind: boog[boog.length - 1],
    tekstPos: [vertex[0] + (radius + 1.5) * Math.cos(midA), vertex[1] + (radius + 1.5) * Math.sin(midA)],
    waarde,
    label: b.tekst ?? hoekLabel(waarde),
  };
}

/** Bereken de rendering-geometrie voor een bemating (puur, in RD). */
export function bematingGeometrie(b: Bemating): BematingGeo {
  return b.type === 'hoek' ? hoekGeo(b) : lineaireGeo(b);
}

/** Numerieke waarde van een bemating (lengte m of hoek graden). */
export function bematingWaarde(b: Bemating): number {
  return b.type === 'hoek' ? hoekGeo(b).waarde : lineaireGeo(b).waarde;
}
