import type { DemoTrace } from '@/demo/traces';
import type { BoreSegmentResult } from '@/lib/bore/types';
import { BORE_METHODE_LABELS } from '@/lib/bore/types';
import {
  svgDocument,
  themeColors,
  tekeningVlak,
  DEFAULT_TEKENING_THEME,
  TEKENING_KLEUREN,
  defaultRevisieRows,
} from './format';
import { kettingas, hoogteasNap } from './symbols';
import { NLCS_LIJNDIKTE } from './nlcs';

function segmentProfielNummer(traceCode: string, volgorde: number): string {
  return `TK-BPR-${traceCode}-S${volgorde}-2026-001`;
}

export function generateBoreProfileDrawing(
  trace: DemoTrace,
  segment: BoreSegmentResult,
): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;
  const traj = segment.boorplan.trajectory;
  const lengte = segment.boorplan.samenvatting.match(/(\d+) m/)?.[1] ?? '200';
  const lengteM = Number(lengte);

  const meta = {
    type: 'bore_profile' as const,
    titel: 'Boorprofiel (lengte)',
    ondertitel: `${BORE_METHODE_LABELS[segment.methode]} — sonderingen + boog`,
    trace,
    norm: 'NEN-EN-ISO 22476-1 / AHN / NLCS 5.1',
    schaal: `Hor. 1:500 · Vert. 1:50`,
    legenda: [
      { label: 'Maaiveld', color: TEKENING_KLEUREN.maaiveld, strokeWidth: 2 },
      { label: 'Boogtraject', color: '#E67E22', strokeWidth: 2.5 },
      { label: 'Productleiding', color: trace.kleur, strokeWidth: 2 },
      { label: 'Grondwater', color: '#3498DB', dash: '4,2', strokeWidth: 1 },
    ],
    extra: [
      ['Max. diepte', `${traj.maxDiepteNap.toFixed(2)} m NAP`],
      ['Boogstraal', `${traj.boogstraalM.toFixed(1)} m`],
    ] as [string, string][],
  };

  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);
  const maaiveld = -0.18;
  const gw = -0.48;
  const minZ = traj.maxDiepteNap - 0.5;
  const maxZ = 0.5;
  const rangeZ = maxZ - minZ;

  const tx = (chainage: number) => pad.l + (chainage / lengteM) * drawW;
  const ty = (z: number) => pad.t + ((maxZ - z) / rangeZ) * drawH;

  const mvY = ty(maaiveld);
  const maaiveldPath = `M ${tx(0)} ${mvY} L ${tx(lengteM)} ${mvY}`;

  const entryDepth = maaiveld - 0.3;
  const midDepth = traj.maxDiepteNap;
  const exitDepth = maaiveld - 0.3;
  const borePath = `M ${tx(0)} ${ty(entryDepth)}
    Q ${tx(lengteM * 0.25)} ${ty(entryDepth - 0.2)} ${tx(lengteM * 0.5)} ${ty(midDepth)}
    Q ${tx(lengteM * 0.75)} ${ty(exitDepth - 0.2)} ${tx(lengteM)} ${ty(exitDepth)}`;

  const productPath = `M ${tx(0)} ${ty(entryDepth + 0.05)} L ${tx(lengteM)} ${ty(exitDepth + 0.05)}`;

  const sonderingSvg = segment.sonderingen
    .slice(0, 3)
    .map((s, i) => {
      const x = tx((lengteM / (segment.sonderingen.length + 1)) * (i + 1));
      const layers = s.lagen
        .map((l) => {
          const y1 = ty(-l.van);
          const y2 = ty(-l.tot);
          const colors: Record<string, string> = { zand: '#C4A574', klei: '#8B7355', veen: '#5D4037' };
          return `<rect x="${x - 4}" y="${y2}" width="8" height="${y1 - y2}" fill="${colors[l.grondsoort] ?? '#999'}" stroke="${c.border}" stroke-width="0.3"/>`;
        })
        .join('');
      return `${layers}
      <line x1="${x}" y1="${mvY}" x2="${x}" y2="${ty(-s.diepte)}" stroke="${c.border}" stroke-width="0.5" stroke-dasharray="2,2"/>
      <text x="${x}" y="${mvY - 4}" text-anchor="middle" fill="${c.muted}" font-size="4" font-family="IBM Plex Mono,monospace">${s.id.replace('cpt-', '').replace('bro-cpt-', '')}</text>`;
    })
    .join('');

  const grondFill = `<rect x="${tx(0)}" y="${ty(minZ)}" width="${drawW}" height="${mvY - ty(minZ)}" fill="#C4A574" fill-opacity="0.25" stroke="none"/>`;

  const content = `
  ${kettingas(pad.l, pad.t + drawH + 4, drawW, lengteM, 50, c.text)}
  ${hoogteasNap(pad.l - 14, pad.t, drawH, minZ, maxZ, 0.5, c.text)}
  ${grondFill}
  <path d="${maaiveldPath}" fill="none" stroke="${TEKENING_KLEUREN.maaiveld}" stroke-width="${NLCS_LIJNDIKTE.normaal}"/>
  <text x="${tx(lengteM / 2)}" y="${mvY - 4}" text-anchor="middle" fill="${TEKENING_KLEUREN.maaiveld}" font-size="5" font-family="IBM Plex Sans,sans-serif">Maaiveld</text>
  <line x1="${tx(0)}" y1="${ty(gw)}" x2="${tx(lengteM)}" y2="${ty(gw)}" stroke="#3498DB" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="${tx(lengteM - 20)}" y="${ty(gw) - 3}" fill="#3498DB" font-size="5" font-family="IBM Plex Mono,monospace">Grondwater ${gw} m NAP</text>
  <path d="${borePath}" fill="none" stroke="#E67E22" stroke-width="2.5"/>
  <path d="${productPath}" fill="none" stroke="${trace.kleur}" stroke-width="2"/>
  <text x="${tx(lengteM * 0.5)}" y="${ty(midDepth) - 6}" text-anchor="middle" fill="#E67E22" font-size="5" font-family="IBM Plex Mono,monospace">Boogtraject</text>
  <text x="${tx(lengteM * 0.5)}" y="${ty(midDepth) + 12}" text-anchor="middle" fill="${trace.kleur}" font-size="5" font-family="IBM Plex Mono,monospace">Ontwerpdiepte</text>
  ${sonderingSvg}
  <text x="${pad.l + 8}" y="${pad.t + drawH - 8}" fill="${c.muted}" font-size="5" font-family="IBM Plex Sans,sans-serif">Legenda</text>
  <text x="${pad.l + drawW - 4}" y="${pad.t + 8}" text-anchor="end" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${segmentProfielNummer(trace.code, segment.volgorde)}</text>
  <text x="${pad.l + 4}" y="${pad.t + 8}" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">Tekeningstatus: VO</text>
  <text x="${pad.l + 4}" y="${pad.t + 16}" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">Blad 1 · Revisie 001 · Vert. exag. 10×</text>
  `;

  return svgDocument(w, h, meta, content, { theme, revisieRows: defaultRevisieRows('Boorprofiel concept') });
}

export function generateAllBoreProfileDrawings(
  trace: DemoTrace,
  segmenten: BoreSegmentResult[],
): { volgorde: number; svg: string; label: string }[] {
  return segmenten.map((seg) => ({
    volgorde: seg.volgorde,
    label: `Boorprofiel S${seg.volgorde} — ${BORE_METHODE_LABELS[seg.methode]}`,
    svg: generateBoreProfileDrawing(trace, seg),
  }));
}
