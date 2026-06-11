import { minDistLineToLine, pointInPolygon } from '@/lib/geo';
import type { BodemRisicoGebied, BodemRisicoLocatie, BodemGebiedType, BodemRisicoklasse } from './types';
import { GEBIED_TYPE_LABEL, RISICO_LABEL } from './types';

function trace2d(coords: [number, number, number?][]): [number, number][] {
  return coords.map(([x, y]) => [x, y]);
}

function afstandLocatieTotTrace(
  loc: BodemRisicoLocatie,
  trace: [number, number, number?][]
): number {
  const line = trace2d(trace);
  if (line.length < 2) return 999;

  if (loc.polygon && loc.polygon.length >= 4) {
    for (const [x, y] of line) {
      if (pointInPolygon(x, y, loc.polygon)) return 0;
    }
    const ring = loc.polygon.map(([x, y]) => [x, y] as [number, number]);
    return Math.round(minDistLineToLine(line, ring));
  }

  if (loc.x !== undefined && loc.y !== undefined) {
    let min = Infinity;
    for (let i = 1; i < line.length; i++) {
      const [x1, y1] = line[i - 1];
      const [x2, y2] = line[i];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq === 0 ? 0 : ((loc.x - x1) * dx + (loc.y - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      min = Math.min(min, Math.hypot(loc.x - px, loc.y - py));
    }
    return Math.round(min === Infinity ? 999 : min);
  }

  return 999;
}

export function afstandenTotTrace(
  locaties: BodemRisicoLocatie[],
  trace: [number, number, number?][]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const loc of locaties) {
    map.set(loc.id, afstandLocatieTotTrace(loc, trace));
  }
  return map;
}

function gebiedLabel(risicoklasse: BodemRisicoklasse, gebiedType: BodemGebiedType): string {
  return `${RISICO_LABEL[risicoklasse]} — ${GEBIED_TYPE_LABEL[gebiedType]}`;
}

/**
 * Bufferstraal (m) voor puntlocaties per risicoklasse: een verontreinigings-
 * punt zonder contour wordt als risicovlek getoond. Hogere klasse = grotere
 * indicatieve onderzoekszone rond de locatie (quickscan-werkwijze).
 */
const VLEK_STRAAL_M: Record<BodemRisicoklasse, number> = {
  zeer_hoog: 50,
  hoog: 40,
  middel: 30,
  laag: 20,
  beheer: 20,
  geen: 12,
  onbekend: 25,
};

function puntNaarVlek(x: number, y: number, straalM: number): [number, number][] {
  const punten: [number, number][] = [];
  const segmenten = 20;
  for (let i = 0; i <= segmenten; i++) {
    const hoek = (i / segmenten) * 2 * Math.PI;
    punten.push([
      Math.round((x + Math.cos(hoek) * straalM) * 10) / 10,
      Math.round((y + Math.sin(hoek) * straalM) * 10) / 10,
    ]);
  }
  return punten;
}

/** Groepeer locaties per risicoklasse + gebiedtype tot analyseerbare gebieden. */
export function aggregateBodemRisicoGebieden(
  locaties: BodemRisicoLocatie[]
): BodemRisicoGebied[] {
  const groups = new Map<string, BodemRisicoLocatie[]>();

  for (const loc of locaties) {
    const key = `${loc.risicoklasse}|${loc.gebiedType}`;
    const list = groups.get(key) ?? [];
    list.push(loc);
    groups.set(key, list);
  }

  const gebieden: BodemRisicoGebied[] = [];

  for (const [key, items] of groups) {
    const [risicoklasse, gebiedType] = key.split('|') as [BodemRisicoklasse, BodemGebiedType];
    const polygons: [number, number][][] = [];
    const punten: { id: string; x: number; y: number }[] = [];

    for (const item of items) {
      if (item.polygon && item.polygon.length >= 4) {
        polygons.push(item.polygon);
      } else if (item.x !== undefined && item.y !== undefined) {
        punten.push({ id: item.id, x: item.x, y: item.y });
        // Puntlocatie zonder contour: toon als risicovlek met indicatieve zone
        polygons.push(puntNaarVlek(item.x, item.y, VLEK_STRAAL_M[risicoklasse] ?? 25));
      }
    }

    const afstanden = items
      .map((i) => i.afstandTraceM)
      .filter((d): d is number => d !== undefined);
    const minAfstandTraceM = afstanden.length > 0 ? Math.min(...afstanden) : undefined;

    gebieden.push({
      id: `gebied-${risicoklasse}-${gebiedType}`,
      risicoklasse,
      gebiedType,
      label: gebiedLabel(risicoklasse, gebiedType),
      telling: items.length,
      locatieIds: items.map((i) => i.id),
      polygons,
      punten,
      minAfstandTraceM,
    });
  }

  return gebieden.sort((a, b) => {
    const volgorde = ['zeer_hoog', 'hoog', 'middel', 'laag', 'beheer', 'geen', 'onbekend'];
    return volgorde.indexOf(a.risicoklasse) - volgorde.indexOf(b.risicoklasse);
  });
}

export function enrichLocatiesMetAfstand(
  locaties: BodemRisicoLocatie[],
  trace: [number, number, number?][]
): BodemRisicoLocatie[] {
  const afstanden = afstandenTotTrace(locaties, trace);
  return locaties.map((loc) => ({
    ...loc,
    afstandTraceM: afstanden.get(loc.id),
  }));
}
