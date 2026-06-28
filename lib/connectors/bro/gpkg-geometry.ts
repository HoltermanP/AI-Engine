import proj4 from 'proj4';

proj4.defs('EPSG:4258', '+proj=longlat +ellps=GRS80 +no_defs +type=crs');
proj4.defs(
  'EPSG:28992',
  '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs'
);

/** Parse GeoPackage binary / WKB hex blob naar polygonringen in RD (EPSG:28992). */
export function polygonRingsFromGpkgHex(hex: string): [number, number][][] {
  const buf = Buffer.from(hex, 'hex');
  if (buf.length < 8 || buf[0] !== 0x47 || buf[1] !== 0x50) return [];

  let offset = 4;
  const flags = buf[3];
  if (flags & 0x20) offset += 4;

  const envelopeType = (flags & 0x1c) >> 2;
  if (envelopeType === 1) offset += 32;
  else if (envelopeType === 2) offset += 48;
  else if (envelopeType === 3) offset += 48;
  else if (envelopeType === 4) offset += 64;

  return parseWkbPolygons(buf, offset);
}

function etrs89ToRd(lon: number, lat: number): [number, number] {
  const [x, y] = proj4('EPSG:4258', 'EPSG:28992', [lon, lat]);
  return [x, y];
}

function parseWkbPolygons(buf: Buffer, start: number): [number, number][][] {
  let offset = start;
  if (offset >= buf.length) return [];

  const byteOrder = buf[offset];
  offset += 1;
  const le = byteOrder === 1;
  const readU32 = (o: number) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const readF64 = (o: number) => (le ? buf.readDoubleLE(o) : buf.readDoubleBE(o));

  const type = readU32(offset);
  offset += 4;
  if (type & 0x20000000) offset += 4;

  const baseType = type & 0xff;
  if (baseType === 3) return [readPolygonRing(offset, le, readU32, readF64).ring];
  if (baseType === 6) {
    const numPoly = readU32(offset);
    offset += 4;
    const rings: [number, number][][] = [];
    for (let p = 0; p < numPoly; p++) {
      offset += 1;
      const innerType = readU32(offset);
      offset += 4;
      if (innerType & 0x20000000) offset += 4;
      const parsed = readPolygonRing(offset, le, readU32, readF64);
      offset = parsed.offset;
      rings.push(parsed.ring);
    }
    return rings;
  }
  return [];
}

function readPolygonRing(
  offset: number,
  le: boolean,
  readU32: (o: number) => number,
  readF64: (o: number) => number
): { ring: [number, number][]; offset: number } {
  const numRings = readU32(offset);
  offset += 4;
  const ring: [number, number][] = [];
  for (let r = 0; r < numRings; r++) {
    const numPoints = readU32(offset);
    offset += 4;
    for (let i = 0; i < numPoints; i++) {
      const lon = readF64(offset);
      offset += 8;
      const lat = readF64(offset);
      offset += 8;
      if (r === 0) ring.push(etrs89ToRd(lon, lat));
    }
  }
  return { ring, offset };
}

export function polygonFromGeoJsonGeometry(
  geometry: GeoJSON.Geometry
): [number, number][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0].map(([lon, lat]) => etrs89ToRd(lon, lat));
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates[0][0].map(([lon, lat]) => etrs89ToRd(lon, lat));
  }
  return [];
}

export function pointFromGeoJsonGeometry(
  geometry: GeoJSON.Geometry
): [number, number] | null {
  if (geometry.type === 'Point') {
    const [lon, lat] = geometry.coordinates;
    return etrs89ToRd(lon, lat);
  }
  if (geometry.type === 'MultiPoint' && geometry.coordinates[0]) {
    const [lon, lat] = geometry.coordinates[0];
    return etrs89ToRd(lon, lat);
  }
  if (geometry.type === 'Polygon' && geometry.coordinates[0]?.[0]) {
    const [lon, lat] = geometry.coordinates[0][0];
    return etrs89ToRd(lon, lat);
  }
  return null;
}

export function bboxIntersectsPolygon(
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  polygon: [number, number][]
): boolean {
  if (polygon.length < 3) return false;
  for (const [x, y] of polygon) {
    if (x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY) return true;
  }
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  return pointInPolygon(cx, cy, polygon);
}

function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
