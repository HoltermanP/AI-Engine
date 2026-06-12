import type { DemoTrace } from '@/demo/traces';
import type { BoreEngineeringResult, BoreSegmentResult } from '@/lib/bore/types';
import { BORE_METHODE_LABELS } from '@/lib/bore/types';
import {
  svgDocument,
  themeColors,
  tekeningVlak,
  DEFAULT_TEKENING_THEME,
  TEKENING_KLEUREN,
  defaultRevisieRows,
  northArrow,
} from './format';
import { isoTekenkader } from './symbols';
import { NLCS_LIJNDIKTE } from './nlcs';

function segmentTekeningNummer(traceCode: string, volgorde: number): string {
  return `TK-BPL-${traceCode}-S${volgorde}-2026-001`;
}

export function generateBorePlanDrawing(
  trace: DemoTrace,
  segment: BoreSegmentResult,
): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;
  const t = segment.boorplan.trajectory;
  const meta = {
    type: 'bore_plan' as const,
    titel: 'Boorplan (plan)',
    ondertitel: `${BORE_METHODE_LABELS[segment.methode]} — ${segment.label}`,
    trace,
    norm: 'NEN 3650 / NLCS 5.1 / RD EPSG:28992',
    schaal: '1:500',
    legenda: [
      { label: 'Ontwerptracé', color: trace.kleur, strokeWidth: 2.5 },
      { label: 'Boogtraject', color: '#E67E22', strokeWidth: 2, dash: '6,3' },
      { label: 'Startput', color: TEKENING_KLEUREN.accent, strokeWidth: 1 },
      { label: 'Eindput', color: TEKENING_KLEUREN.waarschuwing, strokeWidth: 1 },
    ],
    extra: [
      ['Segment', `S${segment.volgorde}`],
      ['Lengte', `${segment.boorplan.lengteM.toFixed(0)} m (boogdeel ${segment.boorplan.trajectory.booglengteM.toFixed(0)} m)`],
    ] as [string, string][],
  };

  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);
  const lengteM = segment.boorplan.lengteM;
  const entryX = pad.l + drawW * 0.12;
  const exitX = pad.l + drawW * 0.88;
  const midY = pad.t + drawH * 0.5;
  const boreLen = exitX - entryX;
  // Schaal in px/m zodat putafmetingen en maatvoering onderling kloppen
  const pxPerM = boreLen / lengteM;

  // In bovenaanzicht volgt het boortraject de tracélijn (diepte bestaat hier niet)
  const borePath = `M ${entryX} ${midY} L ${exitX} ${midY}`;

  const entryPutW = Math.max(t.entryPutL * pxPerM, 14);
  const entryPutH = Math.max(t.entryPutB * pxPerM, 8);
  const exitPutW = Math.max(t.exitPutL * pxPerM, 14);

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  ${northArrow(pad.l + 24, pad.t + 24, 22, theme)}
  <text x="${pad.l + drawW / 2}" y="${pad.t + 12}" text-anchor="middle" fill="${c.subtitel}" font-size="7" font-family="IBM Plex Sans,sans-serif">Schaal 1:${Math.round(1000 / pxPerM / 10) * 10}</text>

  <!-- Startput -->
  <rect x="${entryX - entryPutW / 2}" y="${midY - entryPutH / 2}" width="${entryPutW}" height="${entryPutH}" fill="${TEKENING_KLEUREN.accent}20" stroke="${TEKENING_KLEUREN.accent}" stroke-width="${NLCS_LIJNDIKTE.normaal}"/>
  <text x="${entryX}" y="${midY + entryPutH / 2 + 10}" text-anchor="middle" fill="${c.text}" font-size="6" font-family="IBM Plex Mono,monospace">Startput</text>
  <text x="${entryX}" y="${midY + entryPutH / 2 + 18}" text-anchor="middle" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${t.entryPutL}×${t.entryPutB} m</text>

  <!-- Eindput -->
  <rect x="${exitX - exitPutW / 2}" y="${midY - entryPutH / 2}" width="${exitPutW}" height="${entryPutH}" fill="${TEKENING_KLEUREN.waarschuwing}20" stroke="${TEKENING_KLEUREN.waarschuwing}" stroke-width="${NLCS_LIJNDIKTE.normaal}"/>
  <text x="${exitX}" y="${midY + entryPutH / 2 + 10}" text-anchor="middle" fill="${c.text}" font-size="6" font-family="IBM Plex Mono,monospace">Eindput</text>

  <!-- Boogtraject (volgt tracé in bovenaanzicht) -->
  <path d="${borePath}" fill="none" stroke="#E67E22" stroke-width="2.5" stroke-dasharray="6,3"/>
  <text x="${entryX + boreLen / 2}" y="${midY + 14}" text-anchor="middle" fill="#E67E22" font-size="6" font-family="IBM Plex Mono,monospace">Boogtraject R=${t.boogstraalM.toFixed(0)} m · diepte ${t.maxDiepteNap.toFixed(2)} m NAP (zie boorprofiel)</text>

  <!-- Tracélijn -->
  <line x1="${entryX}" y1="${midY - 14}" x2="${exitX}" y2="${midY - 14}" stroke="${trace.kleur}" stroke-width="3"/>
  <text x="${entryX + boreLen / 2}" y="${midY - 20}" text-anchor="middle" fill="${trace.kleur}" font-size="6" font-family="IBM Plex Sans,sans-serif">Ontwerptracé</text>

  <!-- Maatvoering -->
  <line x1="${entryX}" y1="${midY + 56}" x2="${exitX}" y2="${midY + 56}" stroke="${c.border}" stroke-width="0.75"/>
  <line x1="${entryX}" y1="${midY + 52}" x2="${entryX}" y2="${midY + 60}" stroke="${c.border}" stroke-width="0.75"/>
  <line x1="${exitX}" y1="${midY + 52}" x2="${exitX}" y2="${midY + 60}" stroke="${c.border}" stroke-width="0.75"/>
  <text x="${entryX + boreLen / 2}" y="${midY + 66}" text-anchor="middle" fill="${c.text}" font-size="6" font-family="IBM Plex Mono,monospace">Maatvoering ${lengteM.toFixed(0)} m</text>

  <!-- Legenda -->
  <text x="${pad.l + 8}" y="${pad.t + drawH - 8}" fill="${c.muted}" font-size="5" font-family="IBM Plex Sans,sans-serif">Legenda</text>
  <!-- Tekeningnummer -->
  <text x="${pad.l + drawW - 4}" y="${pad.t + 8}" text-anchor="end" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${segmentTekeningNummer(trace.code, segment.volgorde)}</text>
  <text x="${pad.l + 4}" y="${pad.t + 8}" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">Tekeningstatus: VO</text>
  <text x="${pad.l + 4}" y="${pad.t + 16}" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">Blad 1</text>
  <text x="${pad.l + 4}" y="${pad.t + 24}" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">Revisie 001</text>
  `;

  return svgDocument(w, h, meta, content, { theme, revisieRows: defaultRevisieRows('Boorplan concept') });
}

export function generateAllBorePlanDrawings(
  trace: DemoTrace,
  result: BoreEngineeringResult,
): { volgorde: number; svg: string; label: string }[] {
  return result.segmenten.map((seg) => ({
    volgorde: seg.volgorde,
    label: `Boorplan S${seg.volgorde} — ${BORE_METHODE_LABELS[seg.methode]}`,
    svg: generateBorePlanDrawing(trace, seg),
  }));
}
