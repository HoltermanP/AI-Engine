/**
 * Compacte, dependency-vrije DXF-parser voor tracégeometrie uit AutoCAD.
 * Leest de ENTITIES-sectie en haalt LINE, LWPOLYLINE en POLYLINE/VERTEX op als
 * polylijnen. Coördinaten worden ruw teruggegeven in de DXF-eenheden (voor
 * Nederlandse infra-CAD vrijwel altijd RD/Rijksdriehoek in meters); de aanroeper
 * valideert/herprojecteert.
 *
 * DXF is een strikt code/waarde-paarformaat: elke regel met een groepscode wordt
 * gevolgd door een regel met de waarde. We parsen alleen wat voor lijngeometrie
 * nodig is — hatches, blocks, tekst e.d. worden genegeerd.
 */

export interface DxfPolyline {
  /** Laagnaam (DXF-code 8) als herkenbare bron */
  naam?: string;
  coordinates: [number, number][];
}

interface CodeValue {
  code: number;
  value: string;
}

function parsePairs(text: string): CodeValue[] {
  const lines = text.split(/\r\n|\r|\n/);
  const pairs: CodeValue[] = [];
  // DXF: even index = groepscode, oneven index = waarde
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number.parseInt(lines[i].trim(), 10);
    if (Number.isNaN(code)) continue;
    pairs.push({ code, value: lines[i + 1] });
  }
  return pairs;
}

/** Grenzen van de ENTITIES-sectie (we negeren BLOCKS/objecten om dubbele geometrie te voorkomen). */
function entitiesRange(pairs: CodeValue[]): { start: number; end: number } {
  let start = -1;
  for (let i = 0; i < pairs.length - 1; i++) {
    if (pairs[i].code === 0 && pairs[i].value.trim() === 'SECTION') {
      const naam = pairs[i + 1];
      if (naam.code === 2 && naam.value.trim() === 'ENTITIES') {
        start = i + 2;
        break;
      }
    }
  }
  if (start < 0) return { start: -1, end: -1 };
  for (let i = start; i < pairs.length; i++) {
    if (pairs[i].code === 0 && pairs[i].value.trim() === 'ENDSEC') {
      return { start, end: i };
    }
  }
  return { start, end: pairs.length };
}

/** Splits een reeks paren in entiteit-chunks; elke chunk begint bij groepscode 0. */
function splitEntities(pairs: CodeValue[], start: number, end: number): CodeValue[][] {
  const chunks: CodeValue[][] = [];
  let current: CodeValue[] | null = null;
  for (let i = start; i < end; i++) {
    if (pairs[i].code === 0) {
      if (current) chunks.push(current);
      current = [pairs[i]];
    } else if (current) {
      current.push(pairs[i]);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function laagVan(chunk: CodeValue[]): string | undefined {
  const laag = chunk.find((p) => p.code === 8)?.value.trim();
  return laag && laag !== '0' ? laag : undefined;
}

function lineFromChunk(chunk: CodeValue[]): DxfPolyline | null {
  let x1: number | undefined;
  let y1: number | undefined;
  let x2: number | undefined;
  let y2: number | undefined;
  for (const { code, value } of chunk) {
    const v = Number.parseFloat(value);
    if (code === 10) x1 = v;
    else if (code === 20) y1 = v;
    else if (code === 11) x2 = v;
    else if (code === 21) y2 = v;
  }
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null;
  return { naam: laagVan(chunk), coordinates: [[x1, y1], [x2, y2]] };
}

function lwpolylineFromChunk(chunk: CodeValue[]): DxfPolyline | null {
  const coords: [number, number][] = [];
  let pendingX: number | undefined;
  let closed = false;
  for (const { code, value } of chunk) {
    if (code === 70) closed = (Number.parseInt(value.trim(), 10) & 1) === 1;
    else if (code === 10) pendingX = Number.parseFloat(value);
    else if (code === 20 && pendingX !== undefined) {
      coords.push([pendingX, Number.parseFloat(value)]);
      pendingX = undefined;
    }
  }
  if (coords.length < 2) return null;
  if (closed && coords.length >= 3) coords.push(coords[0]);
  return { naam: laagVan(chunk), coordinates: coords };
}

/** POLYLINE-header + opvolgende VERTEX-chunks tot SEQEND. */
function polylineFromChunks(
  chunks: CodeValue[][],
  headerIdx: number
): { polyline: DxfPolyline | null; nextIdx: number } {
  const header = chunks[headerIdx];
  const closed =
    (Number.parseInt(header.find((p) => p.code === 70)?.value.trim() ?? '0', 10) & 1) === 1;
  const coords: [number, number][] = [];
  let i = headerIdx + 1;
  for (; i < chunks.length; i++) {
    const type = chunks[i][0].value.trim();
    if (type === 'VERTEX') {
      const x = chunks[i].find((p) => p.code === 10)?.value;
      const y = chunks[i].find((p) => p.code === 20)?.value;
      if (x !== undefined && y !== undefined) {
        coords.push([Number.parseFloat(x), Number.parseFloat(y)]);
      }
    } else if (type === 'SEQEND') {
      i++;
      break;
    } else {
      break;
    }
  }
  if (coords.length < 2) return { polyline: null, nextIdx: i };
  if (closed && coords.length >= 3) coords.push(coords[0]);
  return { polyline: { naam: laagVan(header), coordinates: coords }, nextIdx: i };
}

/**
 * Parse de polylijngeometrie uit een DXF-tekst. Geeft lijnen in de
 * oorspronkelijke DXF-eenheden (geen herprojectie).
 */
export function polylinesFromDxf(text: string): DxfPolyline[] {
  const pairs = parsePairs(text);
  const { start, end } = entitiesRange(pairs);
  if (start < 0) return [];

  const chunks = splitEntities(pairs, start, end);
  const result: DxfPolyline[] = [];
  for (let i = 0; i < chunks.length; ) {
    const type = chunks[i][0].value.trim();
    if (type === 'LINE') {
      const line = lineFromChunk(chunks[i]);
      if (line) result.push(line);
      i++;
    } else if (type === 'LWPOLYLINE') {
      const line = lwpolylineFromChunk(chunks[i]);
      if (line) result.push(line);
      i++;
    } else if (type === 'POLYLINE') {
      const { polyline, nextIdx } = polylineFromChunks(chunks, i);
      if (polyline) result.push(polyline);
      i = nextIdx > i ? nextIdx : i + 1;
    } else {
      i++;
    }
  }
  return result;
}
