import type { DemoTrace } from '@/demo/traces';
import type { DemoBestaandNet } from '@/demo/klic';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import { bepaalBoringen } from '@/lib/services/trace-routing/boringen';
import {
  verzamelKnelpunten,
  knelpuntenTelling,
  type Knelpunt,
} from '@/lib/services/trace-routing/knelpunten';
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

const KNELPUNT_ERNST_KLEUR = {
  blokkerend: '#C0392B',
  waarschuwing: '#E67E22',
  info: '#2C7BB6',
} as const;
const BORING_KLEUR = '#0E7490';

/** Boringmarker: intrede-/uittredeput + boorlijn + B-label. */
function boringMarker(
  boring: ReturnType<typeof bepaalBoringen>[number],
  tx: (x: number) => number,
  ty: (y: number) => number
): string {
  const ix = tx(boring.intrede[0]);
  const iy = ty(boring.intrede[1]);
  const ux = tx(boring.uittrede[0]);
  const uy = ty(boring.uittrede[1]);
  const cx = tx(boring.x);
  const cy = ty(boring.y);
  const put = (px: number, py: number) =>
    `<rect x="${(px - 3).toFixed(1)}" y="${(py - 3).toFixed(1)}" width="6" height="6" fill="#ffffff" stroke="${BORING_KLEUR}" stroke-width="1.4"/>`;
  return `<g><!-- Boring ${boring.id} -->
  <line x1="${ix.toFixed(1)}" y1="${iy.toFixed(1)}" x2="${ux.toFixed(1)}" y2="${uy.toFixed(1)}" stroke="${BORING_KLEUR}" stroke-width="2.6" stroke-dasharray="5,2.5" stroke-linecap="round"/>
  ${put(ix, iy)}
  ${put(ux, uy)}
  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="7.5" fill="#ffffff" stroke="${BORING_KLEUR}" stroke-width="1.5"/>
  <text x="${cx.toFixed(1)}" y="${(cy + 2.5).toFixed(1)}" fill="${BORING_KLEUR}" font-size="6.5" font-family="IBM Plex Mono,monospace" text-anchor="middle" font-weight="700">${boring.id}</text>
</g>`;
}

/** Marker voor een knelpunt met locatie (overige kruising K of conflict C). */
function knelpuntMarker(
  k: Knelpunt,
  tx: (x: number) => number,
  ty: (y: number) => number
): string {
  if (k.x === undefined || k.y === undefined) return '';
  const cx = tx(k.x);
  const cy = ty(k.y);
  if (k.categorie === 'conflict') {
    const kleur = KNELPUNT_ERNST_KLEUR[k.ernst];
    return `<g><!-- Conflict ${k.id} -->
  <polygon points="${cx},${(cy - 8).toFixed(1)} ${(cx + 7).toFixed(1)},${(cy + 5).toFixed(1)} ${(cx - 7).toFixed(1)},${(cy + 5).toFixed(1)}" fill="#ffffff" stroke="${kleur}" stroke-width="1.6"/>
  <text x="${cx}" y="${(cy + 3.5).toFixed(1)}" fill="${kleur}" font-size="5.5" font-family="IBM Plex Mono,monospace" text-anchor="middle" font-weight="700">${k.id}</text>
</g>`;
  }
  // Overige kruising (open ontgraving / asfaltzagen / bestrating)
  return `<g><!-- Kruising ${k.id} -->
  <polygon points="${cx},${(cy - 7).toFixed(1)} ${(cx + 7).toFixed(1)},${cy} ${cx},${(cy + 7).toFixed(1)} ${(cx - 7).toFixed(1)},${cy}" fill="#ffffff" stroke="${TEKENING_KLEUREN.accent}" stroke-width="1.5"/>
  <text x="${cx}" y="${(cy + 2.5).toFixed(1)}" fill="${TEKENING_KLEUREN.accent}" font-size="6.5" font-family="IBM Plex Mono,monospace" text-anchor="middle" font-weight="700">${k.id}</text>
</g>`;
}

/**
 * Markers (B/K/C) op locatie plus een compact knelpuntenblok. De volledige
 * opmerkingen per knelpunt staan op de aparte knelpunten- en boringenstaat.
 */
function knelpuntLaag(
  trace: DemoTrace,
  conflicten: DetectedConflict[],
  tx: (x: number) => number,
  ty: (y: number) => number,
  blok: { x: number; y: number; maxW: number }
): { markers: string; opmerkingen: string; aantal: number } {
  const boringen = bepaalBoringen(trace);
  const knelpunten = verzamelKnelpunten(trace, conflicten);
  const telling = knelpuntenTelling(knelpunten);
  const totaal = knelpunten.length;
  if (totaal === 0) return { markers: '', opmerkingen: '', aantal: 0 };

  const boringMarkers = boringen.map((b) => boringMarker(b, tx, ty)).join('\n  ');
  const overigeMarkers = knelpunten
    .filter((k) => k.categorie !== 'boring' && k.x !== undefined && k.y !== undefined)
    .map((k) => knelpuntMarker(k, tx, ty))
    .join('\n  ');
  const markers = `${boringMarkers}\n  ${overigeMarkers}`;

  // Compact blok: kop + telling + tot 6 prioritaire regels (blokkerend eerst),
  // met verwijzing naar de volledige staat
  const regelHoogte = 8;
  const prioriteit = [...knelpunten].sort((a, b) => {
    const r = { blokkerend: 0, waarschuwing: 1, info: 2 } as const;
    return r[a.ernst] - r[b.ernst];
  });
  const items = prioriteit.slice(0, 6);
  const blokHoogte = 30 + items.length * regelHoogte + 8;

  const regels = items
    .map((k, i) => {
      const y0 = blok.y + 30 + i * regelHoogte;
      const detail = k.regels[0] ?? '';
      return `<text x="${blok.x + 6}" y="${y0}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5.2" font-family="IBM Plex Mono,monospace"><tspan fill="${TEKENING_KLEUREN.tekstDonker}" font-weight="700">${k.id}</tspan> ${k.titel.slice(0, 40)} — ${detail.slice(0, 50)}</text>`;
    })
    .join('\n  ');

  const meer =
    totaal > items.length
      ? `<text x="${blok.x + 6}" y="${blok.y + blokHoogte - 4}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5.2" font-family="IBM Plex Mono,monospace">… + ${totaal - items.length} overige — zie knelpunten- en boringenstaat</text>`
      : `<text x="${blok.x + 6}" y="${blok.y + blokHoogte - 4}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5.2" font-family="IBM Plex Mono,monospace">Volledige opmerkingen: zie knelpunten- en boringenstaat</text>`;

  const opmerkingen = `<g><!-- Knelpunten en boringen (compact) -->
  <rect x="${blok.x}" y="${blok.y}" width="${blok.maxW}" height="${blokHoogte}" fill="#ffffff" fill-opacity="0.94" stroke="${TEKENING_KLEUREN.lijnLicht}" stroke-width="0.75" rx="3"/>
  <text x="${blok.x + 6}" y="${blok.y + 11}" fill="${TEKENING_KLEUREN.tekstDonker}" font-size="6.5" font-family="IBM Plex Mono,monospace" font-weight="700">KNELPUNTEN &amp; BORINGEN</text>
  <text x="${blok.x + 6}" y="${blok.y + 21}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5.4" font-family="IBM Plex Mono,monospace">${telling.boringen} boring(en) · ${telling.blokkerend} blokkerend · ${telling.waarschuwing} waarschuwing · ${totaal} totaal</text>
  ${regels}
  ${meer}
</g>`;

  return { markers, opmerkingen, aantal: totaal };
}

export function generateTracePlan(
  trace: DemoTrace,
  bestaandNet: DemoBestaandNet[],
  conflicten: DetectedConflict[] = []
): string {
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
      { label: 'Boring (B) intrede/uittrede', color: BORING_KLEUR, dash: '5,2.5', strokeWidth: 2.5 },
      { label: 'Bestaand net (KLIC)', color: IMKL_COLORS.laagspanning, dash: '6,4' },
      { label: 'Hulpraster RD', color: '#b0b0b0', dash: '2,4', strokeWidth: 0.5 },
    ],
    extra: [
      ['Achtergrond', 'BGT PDOK (exacte pandcontouren)'],
      ['Legtechniek', trace.segmenten.map((s) => s.legtechniek.replace(/_/g, ' ')).join(', ')],
      ...(bepaalBoringen(trace).length > 0
        ? ([['Boringen', `${bepaalBoringen(trace).length} stuks — B-markeringen + boringenstaat`]] as [string, string][])
        : []),
      ...(trace.segmenten.some((s) => s.kruisingen?.length)
        ? ([
            [
              'Kruisingen',
              `${trace.segmenten.reduce((n, s) => n + (s.kruisingen?.length ?? 0), 0)} stuks — zie knelpuntenstaat`,
            ],
          ] as [string, string][])
        : []),
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

  const kruisingen = knelpuntLaag(trace, conflicten, tx, ty, {
    x: pad.l + 12,
    y: pad.t + 12,
    maxW: Math.min(340, drawW - 24),
  });

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  ${topo}
  ${raster}
  ${netLines}
  ${tracePaths}
  ${segmentLabels(trace, traceLines, tx, ty)}
  ${kruisingen.markers}
  ${kruisingen.opmerkingen}
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
