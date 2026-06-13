/**
 * CAD-tekengereedschap voor de kaart (AutoCAD-basisfuncties):
 * - objectsnap (OSNAP): snappen op eindpunten/hoekpunten en op lijnen
 * - ortho-modus: richting beperken tot stappen van 45° t.o.v. het noorden
 * - maatinvoer: exact punt op getypte afstand in de cursorrichting
 * - offset: parallelle polylijn op vaste afstand (parallelligging kabels)
 *
 * Alle functies werken op RD-coördinaten (meters) en zijn puur.
 */

import type { TraceCoord, TraceLine, TraceLines } from '@/lib/trace-edit';

export interface SnapDoel {
  lines: TraceLines;
  /** Bronlabel, bijv. "Eindpunt EL-LS-001" of "Bestaand 10kV (Liander)". */
  label?: string;
}

export type SnapType = 'vertex' | 'eindpunt' | 'lijn';

export interface SnapResultaat {
  x: number;
  y: number;
  type: SnapType;
  afstandM: number;
  /** Welk object er gesnapt is (uit SnapDoel.label). */
  bron?: string;
}

/**
 * OSNAP: zoek het beste snap-punt nabij de cursor. Hoek-/eindpunten gaan
 * vóór lijn-snaps (zoals in CAD), elk met hun eigen tolerantie. Het bronlabel
 * van het geraakte doel komt mee terug zodat de gebruiker ziet waaraan snapt.
 */
export function snapPunt(
  x: number,
  y: number,
  doelen: SnapDoel[],
  opties: { vertexTolM?: number; lijnTolM?: number } = {},
): SnapResultaat | null {
  const vertexTol = opties.vertexTolM ?? 8;
  const lijnTol = opties.lijnTolM ?? 5;

  let besteVertex: SnapResultaat | null = null;
  let besteLijn: SnapResultaat | null = null;

  for (const doel of doelen) {
    for (const line of doel.lines) {
      for (let i = 0; i < line.length; i++) {
        const [vx, vy] = line[i];
        const d = Math.hypot(vx - x, vy - y);
        if (d <= vertexTol && (!besteVertex || d < besteVertex.afstandM)) {
          besteVertex = {
            x: vx,
            y: vy,
            type: i === 0 || i === line.length - 1 ? 'eindpunt' : 'vertex',
            afstandM: d,
            bron: doel.label,
          };
        }
      }
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = line[i - 1];
        const [bx, by] = line[i];
        const dx = bx - ax;
        const dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lenSq));
        const px = ax + t * dx;
        const py = ay + t * dy;
        const d = Math.hypot(x - px, y - py);
        if (d <= lijnTol && (!besteLijn || d < besteLijn.afstandM)) {
          besteLijn = { x: px, y: py, type: 'lijn', afstandM: d, bron: doel.label };
        }
      }
    }
  }

  return besteVertex ?? besteLijn;
}

/**
 * Ortho-modus: projecteer de cursor zó dat het nieuwe segment vanaf `vorig`
 * een hoek in stappen van `stapGraden` (default 45°) maakt.
 */
export function orthoPunt(
  vorig: { x: number; y: number },
  cursor: { x: number; y: number },
  stapGraden = 45,
): { x: number; y: number } {
  const dx = cursor.x - vorig.x;
  const dy = cursor.y - vorig.y;
  const lengte = Math.hypot(dx, dy);
  if (lengte < 0.01) return cursor;
  const hoek = Math.atan2(dy, dx);
  const stap = (stapGraden * Math.PI) / 180;
  const gesnapt = Math.round(hoek / stap) * stap;
  return {
    x: vorig.x + lengte * Math.cos(gesnapt),
    y: vorig.y + lengte * Math.sin(gesnapt),
  };
}

/** Punt op exact `lengteM` vanaf `vorig` in de richting van `cursor` (maatinvoer). */
export function puntOpAfstand(
  vorig: { x: number; y: number },
  cursor: { x: number; y: number },
  lengteM: number,
): { x: number; y: number } {
  const dx = cursor.x - vorig.x;
  const dy = cursor.y - vorig.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return { x: vorig.x + lengteM, y: vorig.y };
  return { x: vorig.x + (dx / d) * lengteM, y: vorig.y + (dy / d) * lengteM };
}

/** Segmentmaat voor de statusbalk: lengte (m) en richting (° t.o.v. noord, CW). */
export function segmentMaat(
  van: { x: number; y: number },
  naar: { x: number; y: number },
): { lengteM: number; hoekDeg: number } {
  const dx = naar.x - van.x;
  const dy = naar.y - van.y;
  // Noord = 0°, met de klok mee (kompasrichting zoals in landmeten)
  let hoek = (Math.atan2(dx, dy) * 180) / Math.PI;
  if (hoek < 0) hoek += 360;
  return { lengteM: Math.hypot(dx, dy), hoekDeg: hoek };
}

/**
 * Binnenhoek (knik) bij `hoek` tussen segment `voor`→`hoek` en `hoek`→`naar`.
 * 180° = recht doorlopend, 90° = haakse knik, →0° = scherpe terugbuiging.
 */
export function binnenhoekDeg(
  voor: { x: number; y: number },
  hoek: { x: number; y: number },
  naar: { x: number; y: number },
): number {
  const ax = voor.x - hoek.x;
  const ay = voor.y - hoek.y;
  const bx = naar.x - hoek.x;
  const by = naar.y - hoek.y;
  const la = Math.hypot(ax, ay);
  const lb = Math.hypot(bx, by);
  if (la < 0.001 || lb < 0.001) return 180;
  const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export interface HoekHulplijn {
  x: number;
  y: number;
  /** Type hulplijn t.o.v. het vorige segment of een referentierichting. */
  soort: 'haaks' | 'parallel' | 'verlengde';
}

/**
 * Magnetische hoeksnap: trekt de cursor naar een haakse (90°), parallelle (0°)
 * of recht-doorlopende richting t.o.v. het vorige segment, mits binnen de
 * tolerantie. Geeft het gecorrigeerde punt + welk type hulplijn actief is,
 * zodat de kaart een stippel-guide kan tekenen. Retourneert null buiten
 * tolerantie (dan geldt de vrije/OSNAP-positie).
 */
export function hoekHulplijn(
  vorigVan: { x: number; y: number },
  vorigNaar: { x: number; y: number },
  cursor: { x: number; y: number },
  tolGraden = 4,
): HoekHulplijn | null {
  const segDx = vorigNaar.x - vorigVan.x;
  const segDy = vorigNaar.y - vorigVan.y;
  const segLen = Math.hypot(segDx, segDy);
  const curDx = cursor.x - vorigNaar.x;
  const curDy = cursor.y - vorigNaar.y;
  const curLen = Math.hypot(curDx, curDy);
  if (segLen < 0.01 || curLen < 0.01) return null;

  const segHoek = Math.atan2(segDy, segDx);
  const curHoek = Math.atan2(curDy, curDx);
  let delta = ((curHoek - segHoek) * 180) / Math.PI;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  const abs = Math.abs(delta);

  const richtingen: { hoek: number; soort: HoekHulplijn['soort'] }[] = [
    { hoek: 0, soort: 'verlengde' },
    { hoek: 90, soort: 'haaks' },
    { hoek: -90, soort: 'haaks' },
    { hoek: 180, soort: 'parallel' },
    { hoek: -180, soort: 'parallel' },
  ];
  for (const r of richtingen) {
    if (Math.abs(Math.abs(delta) - Math.abs(r.hoek)) <= tolGraden && (r.hoek !== 0 || abs <= tolGraden)) {
      const doelHoek = segHoek + (r.hoek * Math.PI) / 180;
      return {
        x: vorigNaar.x + curLen * Math.cos(doelHoek),
        y: vorigNaar.y + curLen * Math.sin(doelHoek),
        soort: r.soort,
      };
    }
  }
  return null;
}

/**
 * Offset (parallel kopiëren): polylijn op `afstandM` loodrecht naast het
 * origineel (positief = rechts van de tekenrichting), hoeken via verstek.
 */
export function offsetPolyline(line: TraceLine, afstandM: number): TraceLine {
  if (line.length < 2 || afstandM === 0) return line.map((c) => [...c] as TraceCoord);

  // Normaal per segment (rechts van de richting)
  const normalen: { nx: number; ny: number }[] = [];
  for (let i = 1; i < line.length; i++) {
    const dx = line[i][0] - line[i - 1][0];
    const dy = line[i][1] - line[i - 1][1];
    const len = Math.hypot(dx, dy) || 1;
    normalen.push({ nx: dy / len, ny: -dx / len });
  }

  const resultaat: TraceLine = [];
  for (let i = 0; i < line.length; i++) {
    const z = line[i][2] ?? -0.65;
    const vorige = normalen[Math.max(0, i - 1)];
    const volgende = normalen[Math.min(normalen.length - 1, i)];
    // Verstek: gemiddelde van aangrenzende normalen, geschaald zodat de
    // afstand tot beide segmenten gelijk blijft (begrensd tegen spitse hoeken)
    let mx = vorige.nx + volgende.nx;
    let my = vorige.ny + volgende.ny;
    const mLen = Math.hypot(mx, my);
    if (mLen < 0.01) {
      mx = volgende.nx;
      my = volgende.ny;
    } else {
      mx /= mLen;
      my /= mLen;
    }
    const cosHalf = mx * volgende.nx + my * volgende.ny;
    const schaal = Math.min(1 / Math.max(Math.abs(cosHalf), 0.25), 4);
    resultaat.push([
      line[i][0] + mx * afstandM * schaal,
      line[i][1] + my * afstandM * schaal,
      z,
    ]);
  }
  return resultaat;
}

/** Totale lengte van een meetlijn (meetfunctie / DIST). */
export function meetLengteM(punten: { x: number; y: number }[]): number {
  let lengte = 0;
  for (let i = 1; i < punten.length; i++) {
    lengte += Math.hypot(punten[i].x - punten[i - 1].x, punten[i].y - punten[i - 1].y);
  }
  return lengte;
}
