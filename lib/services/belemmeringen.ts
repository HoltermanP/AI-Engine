import { lineIntersectsBbox } from '@/lib/geo';
import type { BgtFeature } from '@/lib/connectors/pdok/bgt';
import type { ConnectorMode } from '@/lib/connectors/types';
import { DEMO_BELEMMERINGEN } from '@/demo/pdok';
import type { BboxQuery } from '@/lib/connectors/types';

export interface BelemmeringItem {
  id: string;
  categorie: string;
  beheerder: string;
  eisDekking?: number;
  coordinates: [number, number][];
  _source: ConnectorMode;
}

function lineFromGeometry(geom: GeoJSON.Geometry): [number, number][] {
  if (geom.type === 'LineString') {
    return geom.coordinates.map(([x, y]) => [x, y] as [number, number]);
  }
  if (geom.type === 'MultiLineString') {
    return geom.coordinates.flat().map(([x, y]) => [x, y] as [number, number]);
  }
  if (geom.type === 'Polygon') {
    return geom.coordinates[0].map(([x, y]) => [x, y] as [number, number]);
  }
  return [];
}

function centerlineFromPolygon(geom: GeoJSON.Polygon): [number, number][] {
  const ring = geom.coordinates[0];
  if (ring.length < 4) return [];
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  if (maxX - minX >= maxY - minY) {
    return [
      [minX, cy],
      [maxX, cy],
    ];
  }
  return [
    [cx, minY],
    [cx, maxY],
  ];
}

export function deriveBelemmeringenFromLayers(
  bbox: BboxQuery,
  bgt: BgtFeature[],
  wegvakken: { naam: string; type: string; coordinates: [number, number][] }[],
  source: ConnectorMode
): BelemmeringItem[] {
  const items: BelemmeringItem[] = [];
  let idx = 0;

  for (const feature of bgt) {
    if (feature.type !== 'water') continue;
    const coords =
      feature.geometry.type === 'Polygon'
        ? centerlineFromPolygon(feature.geometry)
        : lineFromGeometry(feature.geometry);
    if (coords.length < 2 || !lineIntersectsBbox(coords, bbox)) continue;
    items.push({
      id: `bel-bgt-water-${idx++}`,
      categorie: 'water',
      beheerder: 'BGT',
      eisDekking: 0.8,
      coordinates: coords,
      _source: source,
    });
  }

  const seenWegen = new Set<string>();
  for (const weg of wegvakken) {
    if (weg.coordinates.length < 2 || !lineIntersectsBbox(weg.coordinates, bbox)) continue;
    const naam = weg.naam?.trim() ?? '';
    if (!naam || naam === 'Fietspad' || naam === 'Onbekend') continue;
    if (seenWegen.has(naam)) continue;
    seenWegen.add(naam);
    items.push({
      id: `bel-nwb-${naam.replace(/\s+/g, '-').toLowerCase()}`,
      categorie: 'weg',
      beheerder: 'RWS/NWB',
      eisDekking: 1.0,
      coordinates: weg.coordinates,
      _source: source,
    });
  }

  return items;
}

export function getBelemmeringenForBbox(
  bbox: BboxQuery,
  bgt: BgtFeature[],
  wegvakken: { naam: string; type: string; coordinates: [number, number][] }[],
  bgtSource: ConnectorMode
): BelemmeringItem[] {
  if (bgtSource === 'live') {
    const derived = deriveBelemmeringenFromLayers(bbox, bgt, wegvakken, 'live');
    if (derived.length > 0) return derived;
  }

  return DEMO_BELEMMERINGEN.filter(
    (b) => b.coordinates.length > 0 && lineIntersectsBbox(b.coordinates, bbox)
  ).map((b) => ({
    id: b.id,
    categorie: b.categorie,
    beheerder: b.beheerder,
    eisDekking: b.eisDekking || undefined,
    coordinates: b.coordinates as [number, number][],
    _source: 'demo' as const,
  }));
}
