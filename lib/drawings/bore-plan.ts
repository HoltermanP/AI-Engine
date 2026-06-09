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
      ['Lengte', `${segment.boorplan.trajectory.booglengteM.toFixed(0)} m boog + ${segment.boorplan.samenvatting.match(/\d+ m/)?.[0] ?? ''}`],
    ] as [string, string][],
  };

  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);
  const cx = pad.l + drawW * 0.15;
  const cy = pad.t + drawH * 0.55;
  const boreLen = Math.min(drawW * 0.65, segment.boorplan.trajectory.booglengteM * 2.5);
  const entryX = cx;
  const exitX = cx + boreLen;
  const midY = cy;
  const depthPx = drawH * 0.25;

  const borePath = `M ${entryX} ${midY}
    Q ${entryX + boreLen * 0.25} ${midY + depthPx * 0.3} ${entryX + boreLen * 0.5} ${midY + depthPx}
    Q ${entryX + boreLen * 0.75} ${midY + depthPx * 0.3} ${exitX} ${midY}`;

  const entryPutW = t.entryPutL * 3;
  const entryPutH = t.entryPutB * 3;
  const exitPutW = t.exitPutL * 3;

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  ${northArrow(pad.l + 24, pad.t + 24, 22, theme)}
  <text x="${pad.l + drawW / 2}" y="${pad.t + 12}" text-anchor="middle" fill="${c.subtitel}" font-size="7" font-family="IBM Plex Sans,sans-serif">Schaal</text>
  <text x="${pad.l + drawW / 2}" y="${pad.t + 12}" text-anchor="middle" fill="${c.subtitel}" font-size="7" font-family="IBM Plex Sans,sans-serif">Schaal 1:500</text>

  <!-- Startput -->
  <rect x="${entryX - entryPutW / 2}" y="${midY - entryPutH / 2}" width="${entryPutW}" height="${entryPutH}" fill="${TEKENING_KLEUREN.accent}20" stroke="${TEKENING_KLEUREN.accent}" stroke-width="${NLCS_LIJNDIKTE.normaal}"/>
  <text x="${entryX}" y="${midY + entryPutH / 2 + 10}" text-anchor="middle" fill="${c.text}" font-size="6" font-family="IBM Plex Mono,monospace">Startput</text>
  <text x="${entryX}" y="${midY + entryPutH / 2 + 18}" text-anchor="middle" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${t.entryPutL}×${t.entryPutB} m</text>

  <!-- Eindput -->
  <rect x="${exitX - exitPutW / 2}" y="${midY - entryPutH / 2}" width="${exitPutW}" height="${entryPutH}" fill="${TEKENING_KLEUREN.waarschuwing}20" stroke="${TEKENING_KLEUREN.waarschuwing}" stroke-width="${NLCS_LIJNDIKTE.normaal}"/>
  <text x="${exitX}" y="${midY + entryPutH / 2 + 10}" text-anchor="middle" fill="${c.text}" font-size="6" font-family="IBM Plex Mono,monospace">Eindput</text>

  <!-- Boogtraject -->
  <path d="${borePath}" fill="none" stroke="#E67E22" stroke-width="2.5" stroke-dasharray="6,3"/>
  <text x="${entryX + boreLen / 2}" y="${midY + depthPx + 14}" text-anchor="middle" fill="#E67E22" font-size="6" font-family="IBM Plex Mono,monospace">Boogtraject R=${t.boogstraalM.toFixed(0)} m</text>

  <!-- Tracélijn -->
  <line x1="${entryX}" y1="${midY - 20}" x2="${exitX}" y2="${midY - 20}" stroke="${trace.kleur}" stroke-width="3"/>
  <text x="${entryX + boreLen / 2}" y="${midY - 26}" text-anchor="middle" fill="${trace.kleur}" font-size="6" font-family="IBM Plex Sans,sans-serif">Ontwerptracé</text>

  <!-- Maatvoering -->
  <line x1="${entryX}" y1="${midY + depthPx + 30}" x2="${exitX}" y2="${midY + depthPx + 30}" stroke="${c.border}" stroke-width="0.75"/>
  <text x="${entryX + boreLen / 2}" y="${midY + depthPx + 40}" text-anchor="middle" fill="${c.text}" font-size="6" font-family="IBM Plex Mono,monospace">Maatvoering ${segment.boorplan.samenvatting.match(/\d+ m/)?.[0] ?? ''}</text>

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
