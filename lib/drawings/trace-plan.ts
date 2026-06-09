import type { DemoTrace } from '@/demo/traces';
import type { DemoBestaandNet } from '@/demo/klic';
import { IMKL_COLORS, utilityThemaColor } from '@/lib/discipline-colors';
import { traceLengthM } from '@/lib/geo';
import {
  berekenSchaal,
  northArrow,
  scaleBar,
  svgDocument,
  traceCoordLines,
  tekeningVlak,
  DEFAULT_TEKENING_THEME,
  TEKENING_KLEUREN,
  defaultRevisieRows,
} from './format';
import { paddedBbox, topoBackgroundSvg } from './topo-background';
import { IMKL_LIJN, NLCS_LIJNDIKTE } from './nlcs';
import { isoTekenkader, rdCoordRaster, snedeMarkering, maatlijnHorizontaal } from './symbols';

function klicThemaColor(thema: string, spanningOfDiameter?: string): string {
  const spec = (spanningOfDiameter ?? '').toLowerCase();
  if (thema === 'elektra') {
    if (spec.includes('kv') || spec.includes('10kv') || spec.includes('ms')) {
      return utilityThemaColor('elektra', { spanning: 'ms' });
    }
    return utilityThemaColor('elektra', { spanning: 'ls' });
  }
  if (thema === 'gas') {
    if (spec.includes('dn5') || spec.includes('bar') || spec.includes('hd')) {
      return utilityThemaColor('gas', { druk: 'hd' });
    }
    return utilityThemaColor('gas', { druk: 'ld' });
  }
  return utilityThemaColor(thema);
}

function tracePathWithHalo(path: string, color: string, width: number, label?: string): string {
  const attrs = label ? ` data-label="${label}"` : '';
  return `<path d="${path}" fill="none" stroke="#ffffff" stroke-width="${width + 2.5}" stroke-opacity="0.9"${attrs}/>
  <path d="${path}" fill="none" stroke="${color}" stroke-width="${width}"${attrs}/>`;
}

function segmentLabels(
  trace: DemoTrace,
  traceLines: [number, number, number?][][],
  tx: (x: number) => number,
  ty: (y: number) => number
): string {
  return trace.segmenten
    .map((seg, i) => {
      const line = traceLines[i] ?? traceLines[0];
      if (!line?.length) return '';
      const mid = line[Math.floor(line.length / 2)];
      if (!mid) return '';
      const [x, y] = mid;
      const tech = seg.legtechniek.replace(/_/g, ' ');
      return `<g><!-- Segment ${seg.volgorde} -->
  <rect x="${(tx(x) - 42).toFixed(1)}" y="${(ty(y) - 22).toFixed(1)}" width="84" height="18" fill="#ffffff" fill-opacity="0.92" stroke="${TEKENING_KLEUREN.lijnLicht}" stroke-width="0.5" rx="2"/>
  <text x="${tx(x).toFixed(1)}" y="${(ty(y) - 14).toFixed(1)}" fill="${TEKENING_KLEUREN.tekstDonker}" font-size="6" font-family="IBM Plex Mono,monospace" text-anchor="middle" font-weight="600">${seg.wegnaam.slice(0, 18)}</text>
  <text x="${tx(x).toFixed(1)}" y="${(ty(y) - 6).toFixed(1)}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5.5" font-family="IBM Plex Mono,monospace" text-anchor="middle">${tech} · ${seg.lengteM} m</text>
</g>`;
    })
    .join('\n  ');
}

export function generateTracePlan(trace: DemoTrace, bestaandNet: DemoBestaandNet[]): string {
  const w = 900;
  const h = 620;
  const theme = DEFAULT_TEKENING_THEME;

  const traceLines = traceCoordLines(trace);
  const allCoords = [...traceLines.flat(), ...bestaandNet.flatMap((n) => n.coordinates)];
  const xs = allCoords.map(([x]) => x);
  const ys = allCoords.map(([, y]) => y);
  const bbox = paddedBbox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
  const realWidthM = bbox.maxX - bbox.minX || 1;
  const realHeightM = bbox.maxY - bbox.minY || 1;
  const schaal = berekenSchaal(realWidthM);
  const lengte = traceLengthM(trace.coordinates, trace.traceLines);

  const meta = {
    type: 'trace_plan' as const,
    titel: 'Tracétekening',
    ondertitel: `${trace.naam} · situatie met bestaand net (IMKL)`,
    trace,
    schaal,
    norm: 'NEN 7171 / IMKL 2.0 / KLIC-WIN',
    legenda: [
      { label: 'Ontwerptracé', color: trace.kleur, strokeWidth: 3 },
      { label: 'Bestaand net (KLIC)', color: IMKL_COLORS.laagspanning, dash: '6,4' },
      { label: 'Hulpraster RD', color: '#b0b0b0', dash: '2,4', strokeWidth: 0.5 },
    ],
    extra: [
      ['Achtergrond', 'BRT PDOK standaard'],
      ['Legtechniek', trace.segmenten.map((s) => s.legtechniek.replace(/_/g, ' ')).join(', ')],
    ] as [string, string][],
  };
  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);

  const scaleX = drawW / realWidthM;
  const scaleY = drawH / realHeightM;
  const scale = Math.min(scaleX, scaleY);

  const tx = (x: number) => pad.l + (x - bbox.minX) * scale;
  const ty = (y: number) => pad.t + drawH - (y - bbox.minY) * scale;

  const barMeters = realWidthM > 2000 ? 500 : realWidthM > 800 ? 200 : 100;
  const barPx = barMeters * scale;
  const clipId = `topo-${trace.code.replace(/[^a-zA-Z0-9]/g, '')}`;
  const rasterInterval = realWidthM > 1500 ? 200 : realWidthM > 600 ? 100 : 50;

  const topo = topoBackgroundSvg(bbox, tx, ty, {
    x: pad.l,
    y: pad.t,
    w: drawW,
    h: drawH,
    id: clipId,
  });

  const raster = rdCoordRaster(bbox, tx, ty, rasterInterval);

  const tracePaths = traceLines
    .map((line) => {
      const path = line
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${tx(x).toFixed(1)} ${ty(y).toFixed(1)}`)
        .join(' ');
      return tracePathWithHalo(path, trace.kleur, NLCS_LIJNDIKTE.constructie, 'Ontwerptracé');
    })
    .join('\n  ');

  const start = traceLines[0]?.[0];
  const endLine = traceLines[traceLines.length - 1];
  const end = endLine?.[endLine.length - 1];

  const netLines = bestaandNet
    .map((net) => {
      const path = net.coordinates
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${tx(x).toFixed(1)} ${ty(y).toFixed(1)}`)
        .join(' ');
      const kleur = klicThemaColor(net.thema, net.spanningOfDiameter);
      const dash = IMKL_LIJN.bestaand.dash ? ` stroke-dasharray="${IMKL_LIJN.bestaand.dash}"` : '';
      return `<path d="${path}" fill="none" stroke="${kleur}" stroke-width="${IMKL_LIJN.bestaand.width}"${dash} opacity="0.88" data-label="Bestaand net"/>
  <text font-size="0"><title>${net.beheerder} — ${net.thema} ${net.spanningOfDiameter ?? ''}</title></text>`;
    })
    .join('\n  ');

  const labelStyle = `fill="${TEKENING_KLEUREN.tekstDonker}" font-size="8" font-family="IBM Plex Mono,monospace" paint-order="stroke" stroke="#ffffff" stroke-width="3"`;

  const snedeX = start ? tx(start[0]) + (end ? (tx(end[0]) - tx(start[0])) * 0.45 : 40) : pad.l + drawW / 2;
  const snedeY1 = pad.t + 20;
  const snedeY2 = pad.t + drawH - 80;

  const maatvoering =
    start && end
      ? maatlijnHorizontaal(
          tx(start[0]),
          tx(end[0]),
          ty(start[1]) + 28,
          `L ≈ ${lengte} m`,
          14
        )
      : '';

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  ${topo}
  ${raster}
  ${netLines}
  ${tracePaths}
  ${segmentLabels(trace, traceLines, tx, ty)}
  ${start ? `<circle cx="${tx(start[0])}" cy="${ty(start[1])}" r="6" fill="${trace.kleur}" stroke="#ffffff" stroke-width="2"/>
  <polygon points="${tx(start[0])},${ty(start[1]) - 10} ${tx(start[0]) - 5},${ty(start[1]) - 3} ${tx(start[0]) + 5},${ty(start[1]) - 3}" fill="${trace.kleur}"/>
  <text x="${tx(start[0]) + 10}" y="${ty(start[1]) - 10}" ${labelStyle}>Start</text>` : ''}
  ${end ? `<rect x="${tx(end[0]) - 5}" y="${ty(end[1]) - 5}" width="10" height="10" fill="none" stroke="${trace.kleur}" stroke-width="2"/>
  <text x="${tx(end[0]) + 10}" y="${ty(end[1]) + 14}" ${labelStyle}>Eind</text>` : ''}
  ${snedeMarkering(snedeX, snedeY1, snedeY2, 'A—A')}
  ${maatvoering}
  <!-- Maatvoering -->
  ${northArrow(pad.l + drawW - 44, pad.t + 20, 32, theme)}
  ${scaleBar(pad.l + 14, pad.t + drawH - 26, barPx, barMeters, theme)}
  <text x="${pad.l + 14}" y="${pad.t + drawH - 38}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="6" font-family="IBM Plex Mono,monospace">RD EPSG:28992 · rastervak ${rasterInterval} m</text>`;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows('Tracétekening concept'),
  });
}
