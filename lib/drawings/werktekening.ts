/**
 * Werktekening (UO) — uitvoeringsgerichte situatietekening met moffen,
 * mantelbuizen en stations op het ontwerptracé, incl. chainagelabels.
 */

import type { DemoTrace } from '@/demo/traces';
import type { NetontwerpAsset } from '@/lib/netontwerp/types';
import { puntOpChainage, lijnLengteM } from '@/lib/netontwerp/chainage';
import type { TraceLines } from '@/lib/trace-edit';
import {
  svgDocument,
  themeColors,
  tekeningVlak,
  DEFAULT_TEKENING_THEME,
  TEKENING_KLEUREN,
  defaultRevisieRows,
  berekenSchaal,
  traceCoordLines,
  northArrow,
} from './format';
import { paddedBbox, topoBackgroundSvg } from './topo-background';
import { rdCoordRaster } from './symbols';
import { NLCS_LIJNDIKTE } from './nlcs';

const MOF_KLEUR = '#E67E22';
const MANTELBUIS_KLEUR = '#0E7490';
const STATION_KLEUR = '#7C3AED';

/** NLCS-stijl mofsymbool: cirkel met diagonaalkruis op de kabel. */
export function mofSymbool(x: number, y: number, r = 4, kleur = MOF_KLEUR): string {
  const d = r * 0.7;
  return `<g data-symbool="mof">
  <circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" stroke="${kleur}" stroke-width="1.2"/>
  <line x1="${x - d}" y1="${y - d}" x2="${x + d}" y2="${y + d}" stroke="${kleur}" stroke-width="1"/>
  <line x1="${x - d}" y1="${y + d}" x2="${x + d}" y2="${y - d}" stroke="${kleur}" stroke-width="1"/>
</g>`;
}

/** Stationsymbool: vierkant met diagonaal (NLCS-conventie schakel-/trafostation). */
export function stationSymbool(x: number, y: number, maat = 10, kleur = STATION_KLEUR): string {
  const h = maat / 2;
  return `<g data-symbool="station">
  <rect x="${x - h}" y="${y - h}" width="${maat}" height="${maat}" fill="#ffffff" stroke="${kleur}" stroke-width="1.6"/>
  <line x1="${x - h}" y1="${y + h}" x2="${x + h}" y2="${y - h}" stroke="${kleur}" stroke-width="1.2"/>
</g>`;
}

function traceLinesVanTrace(trace: DemoTrace): TraceLines {
  return (trace.traceLines.length ? trace.traceLines : [trace.coordinates]) as TraceLines;
}

export function generateWerktekening(
  trace: DemoTrace,
  assets: NetontwerpAsset[],
): string {
  const w = 900;
  const h = 620;
  const theme = DEFAULT_TEKENING_THEME;

  const traceLines = traceCoordLines(trace);
  const lijnen = traceLinesVanTrace(trace);
  const allCoords = traceLines.flat();
  const xs = allCoords.map(([x]) => x);
  const ys = allCoords.map(([, y]) => y);
  const bbox = paddedBbox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
  const realWidthM = bbox.maxX - bbox.minX || 1;
  const realHeightM = bbox.maxY - bbox.minY || 1;

  const traceAssets = assets.filter(
    (a) =>
      a.gekoppeldeTraceIds.includes(trace.id) ||
      (a.positie.binding !== 'punt' && a.positie.traceId === trace.id),
  );
  const moffen = traceAssets.filter((a) => a.type === 'mof');
  const mantelbuizen = traceAssets.filter((a) => a.type === 'mantelbuis');
  const stations = assets.filter((a) => a.type === 'station');

  const meta = {
    type: 'werktekening' as const,
    titel: 'Werktekening (UO)',
    ondertitel: `${trace.naam} · moffen + mantelbuizen + stations`,
    trace,
    schaal: berekenSchaal(realWidthM),
    norm: 'NLCS 5.1 / NEN 7171 / netbeheerder',
    legenda: [
      { label: 'Ontwerptracé', color: trace.kleur, strokeWidth: 3 },
      { label: 'Mof', color: MOF_KLEUR, strokeWidth: 1.5 },
      { label: 'Mantelbuis', color: MANTELBUIS_KLEUR, strokeWidth: 5 },
      { label: 'Station', color: STATION_KLEUR, strokeWidth: 1.5 },
    ],
    extra: [
      ['Moffen', `${moffen.length} stuks`],
      ['Mantelbuizen', `${mantelbuizen.length} stuks`],
      ['Nettype', trace.netType],
    ] as [string, string][],
  };

  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);
  const scale = Math.min(drawW / realWidthM, drawH / realHeightM);
  const tx = (x: number) => pad.l + (x - bbox.minX) * scale;
  const ty = (y: number) => pad.t + drawH - (y - bbox.minY) * scale;

  const clipId = `wt-topo-${trace.code.replace(/[^a-zA-Z0-9]/g, '')}`;
  const topo = topoBackgroundSvg(bbox, tx, ty, {
    x: pad.l,
    y: pad.t,
    w: drawW,
    h: drawH,
    id: clipId,
  });
  const raster = rdCoordRaster(bbox, tx, ty, realWidthM > 600 ? 100 : 50);

  const tracePaths = traceLines
    .map((line) => {
      const path = line
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${tx(x).toFixed(1)} ${ty(y).toFixed(1)}`)
        .join(' ');
      return `<path d="${path}" fill="none" stroke="#ffffff" stroke-width="${NLCS_LIJNDIKTE.constructie + 2.5}" opacity="0.85"/>
  <path d="${path}" fill="none" stroke="${trace.kleur}" stroke-width="${NLCS_LIJNDIKTE.constructie}" data-label="Ontwerptracé"/>`;
    })
    .join('\n  ');

  // Mantelbuizen als verdikte lijnstukken over het tracé
  const mantelbuisSvg = mantelbuizen
    .map((mb) => {
      if (mb.positie.binding !== 'chainage_bereik') return '';
      const lijn = lijnen[mb.positie.lijnIndex];
      if (!lijn) return '';
      const stappen = 12;
      const coords: [number, number][] = [];
      for (let i = 0; i <= stappen; i++) {
        const m = mb.positie.vanM + ((mb.positie.totM - mb.positie.vanM) * i) / stappen;
        const punt = puntOpChainage(lijn, m);
        if (punt) coords.push([tx(punt.x), ty(punt.y)]);
      }
      if (coords.length < 2) return '';
      const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
      const mid = coords[Math.floor(coords.length / 2)];
      return `<path d="${path}" fill="none" stroke="${MANTELBUIS_KLEUR}" stroke-width="6" opacity="0.65" data-label="Mantelbuis"/>
  <text x="${mid[0]}" y="${mid[1] - 8}" text-anchor="middle" fill="${MANTELBUIS_KLEUR}" font-size="5.5" font-family="IBM Plex Mono,monospace" paint-order="stroke" stroke="#ffffff" stroke-width="2">Ø${mb.eigenschappen.diameterMm ?? ''} ${String(mb.eigenschappen.methode ?? '').replace(/_/g, ' ')}</text>`;
    })
    .join('\n  ');

  // Moffen met chainagelabel
  const mofSvg = moffen
    .map((mof) => {
      if (mof.positie.binding !== 'chainage') return '';
      const lijn = lijnen[mof.positie.lijnIndex];
      if (!lijn) return '';
      const punt = puntOpChainage(lijn, mof.positie.chainageM);
      if (!punt) return '';
      const x = tx(punt.x);
      const y = ty(punt.y);
      return `${mofSymbool(x, y)}
  <text x="${x}" y="${y - 7}" text-anchor="middle" fill="${MOF_KLEUR}" font-size="5" font-family="IBM Plex Mono,monospace" paint-order="stroke" stroke="#ffffff" stroke-width="2">${mof.subtype === 'verbindingsmof' ? 'M' : mof.subtype === 'overgangsmof' ? 'OM' : 'EM'} ${(mof.positie.chainageM / 1000).toFixed(2)}k</text>`;
    })
    .join('\n  ');

  const stationSvg = stations
    .map((st) => {
      if (st.positie.binding !== 'punt') return '';
      const { x: rx, y: ry } = st.positie;
      if (rx < bbox.minX || rx > bbox.maxX || ry < bbox.minY || ry > bbox.maxY) return '';
      const x = tx(rx);
      const y = ty(ry);
      return `${stationSymbool(x, y)}
  <text x="${x}" y="${y + 16}" text-anchor="middle" fill="${STATION_KLEUR}" font-size="5.5" font-family="IBM Plex Mono,monospace" paint-order="stroke" stroke="#ffffff" stroke-width="2">${st.naam}</text>`;
    })
    .join('\n  ');

  const totaalLengte = lijnen.reduce((s, l) => s + lijnLengteM(l), 0);
  const barMeters = realWidthM > 800 ? 200 : 100;
  const barPx = barMeters * scale;

  const content = `
  ${topo}
  ${raster}
  ${tracePaths}
  ${mantelbuisSvg}
  ${mofSvg}
  ${stationSvg}
  ${northArrow(pad.l + 24, pad.t + 24, 22, theme)}

  <!-- Schaalbalk + maatvoering -->
  <g>
    <line x1="${pad.l + 12}" y1="${pad.t + drawH - 16}" x2="${pad.l + 12 + barPx}" y2="${pad.t + drawH - 16}" stroke="${c.text}" stroke-width="2"/>
    <text x="${pad.l + 12 + barPx / 2}" y="${pad.t + drawH - 21}" text-anchor="middle" fill="${c.text}" font-size="6" font-family="IBM Plex Mono,monospace">Schaal: ${barMeters} m</text>
    <text x="${pad.l + 12}" y="${pad.t + drawH - 6}" fill="${c.muted}" font-size="5.5" font-family="IBM Plex Mono,monospace">Maatvoering tracé ${totaalLengte.toFixed(0)} m · ${moffen.length} moffen · ${mantelbuizen.length} mantelbuizen</text>
  </g>

  <text x="${pad.l + 8}" y="${pad.t + 12}" fill="${c.muted}" font-size="5" font-family="IBM Plex Sans,sans-serif">Legenda</text>
  `;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows('Werktekening UO concept'),
  });
}
