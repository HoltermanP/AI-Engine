const SRID = 28992;

export function lineStringZWkt(coordinates: [number, number, number?][]): string {
  const points = coordinates
    .map(([x, y, z]) => {
      const zz = z ?? 0;
      return `${x} ${y} ${zz}`;
    })
    .join(', ');
  return `LINESTRING Z (${points})`;
}

export function parseLineStringZ(wkt: string | null): [number, number, number][] {
  if (!wkt) return [];
  const match = wkt.match(/LINESTRING\s*Z?\s*\((.+)\)/i);
  if (!match) return [];
  return match[1].split(',').map((pair) => {
    const parts = pair.trim().split(/\s+/).map(Number);
    return [parts[0], parts[1], parts[2] ?? 0] as [number, number, number];
  });
}

export function polygonWkt(ring: [number, number][]): string {
  const points = ring.map(([x, y]) => `${x} ${y}`).join(', ');
  return `POLYGON ((${points}))`;
}

export function pointWkt(x: number, y: number, z?: number): string {
  return z !== undefined ? `POINT Z (${x} ${y} ${z})` : `POINT (${x} ${y})`;
}

export function geomExpr(wkt: string) {
  return `ST_SetSRID(ST_GeomFromText('${wkt.replace(/'/g, "''")}'), ${SRID})`;
}
