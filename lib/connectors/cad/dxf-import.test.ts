import { describe, expect, it } from 'vitest';
import { polylinesFromDxf } from './dxf-import';

/** Minimale DXF met één LINE en één LWPOLYLINE (3 punten) in RD-coördinaten. */
const DXF_SAMPLE = [
  '0', 'SECTION',
  '2', 'ENTITIES',
  '0', 'LINE',
  '8', 'TRACE_ELEKTRA',
  '10', '180000.0',
  '20', '524000.0',
  '11', '180100.0',
  '21', '524050.0',
  '0', 'LWPOLYLINE',
  '8', 'TRACE_WATER',
  '90', '3',
  '70', '0',
  '10', '181000.0',
  '20', '525000.0',
  '10', '181050.0',
  '20', '525025.0',
  '10', '181100.0',
  '20', '525000.0',
  '0', 'ENDSEC',
  '0', 'EOF',
].join('\r\n');

describe('polylinesFromDxf', () => {
  it('leest LINE en LWPOLYLINE met laagnaam en coördinaten', () => {
    const lijnen = polylinesFromDxf(DXF_SAMPLE);
    expect(lijnen).toHaveLength(2);

    const [line, lw] = lijnen;
    expect(line.naam).toBe('TRACE_ELEKTRA');
    expect(line.coordinates).toEqual([
      [180000, 524000],
      [180100, 524050],
    ]);

    expect(lw.naam).toBe('TRACE_WATER');
    expect(lw.coordinates).toHaveLength(3);
    expect(lw.coordinates[1]).toEqual([181050, 525025]);
  });

  it('sluit een gesloten LWPOLYLINE (flag 1) terug naar het beginpunt', () => {
    const closed = DXF_SAMPLE.replace('70\r\n0', '70\r\n1');
    const lijnen = polylinesFromDxf(closed);
    const lw = lijnen.find((l) => l.naam === 'TRACE_WATER');
    expect(lw?.coordinates).toHaveLength(4);
    expect(lw?.coordinates.at(-1)).toEqual(lw?.coordinates[0]);
  });

  it('parst POLYLINE/VERTEX/SEQEND', () => {
    const dxf = [
      '0', 'SECTION', '2', 'ENTITIES',
      '0', 'POLYLINE', '8', 'OUD_TRACE',
      '0', 'VERTEX', '10', '182000', '20', '526000',
      '0', 'VERTEX', '10', '182100', '20', '526100',
      '0', 'SEQEND',
      '0', 'ENDSEC', '0', 'EOF',
    ].join('\n');
    const lijnen = polylinesFromDxf(dxf);
    expect(lijnen).toHaveLength(1);
    expect(lijnen[0].naam).toBe('OUD_TRACE');
    expect(lijnen[0].coordinates).toEqual([
      [182000, 526000],
      [182100, 526100],
    ]);
  });

  it('geeft een lege lijst zonder ENTITIES-sectie', () => {
    expect(polylinesFromDxf('0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF')).toEqual([]);
  });
});
