import type { DemoTrace } from '@/demo/traces';
import type { BoreSegmentResult, BoreTrajectory } from '@/lib/bore/types';
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

/**
 * Boorprofiel-geometrie: insteektangent → boog (R) → horizontaal deel op
 * ontwerpdiepte → boog (R) → uittredetangent. Geeft (chainage, z NAP)-punten.
 */
export function boreProfilePoints(
  traj: BoreTrajectory,
  lengteM: number,
  maaiveldNap: number,
): [number, number][] {
  const R = traj.boogstraalM;
  const thetaIn = (traj.entryAngleDeg * Math.PI) / 180;
  const thetaUit = (traj.exitAngleDeg * Math.PI) / 180;
  const diepteOnderMv = Math.max(0.5, maaiveldNap - traj.maxDiepteNap);

  const profielHelft = (theta: number) => {
    const boogDrop = R * (1 - Math.cos(theta));
    const tangentDrop = Math.max(0, diepteOnderMv - boogDrop);
    const tangentHor = theta > 0 ? tangentDrop / Math.tan(theta) : 0;
    const boogHor = R * Math.sin(theta);
    return { tangentHor, boogHor, totaalHor: tangentHor + boogHor };
  };

  const inH = profielHelft(thetaIn);
  const uitH = profielHelft(thetaUit);
  // Bij korte boringen past het volledige in+uit-deel niet: schaal de hele
  // verticale doorsnede (incl. bereikte diepte) evenredig terug.
  const schaal = Math.min(1, lengteM / (inH.totaalHor + uitH.totaalHor + 1));
  const zBodem = maaiveldNap - diepteOnderMv * schaal;

  const punten: [number, number][] = [];
  const STAPPEN = 16;

  // Insteektangent (recht, onder hoek)
  const inTangentHor = inH.tangentHor * schaal;
  punten.push([0, maaiveldNap]);
  if (inTangentHor > 0.01) {
    punten.push([inTangentHor, maaiveldNap - inTangentHor * Math.tan(thetaIn)]);
  }
  // Insteekboog: cirkel met middelpunt boven het raakpunt aan het horizontale deel
  const inBoogEindX = (inH.tangentHor + inH.boogHor) * schaal;
  const inCx = inBoogEindX;
  const inCz = zBodem + R * schaal;
  for (let i = 1; i <= STAPPEN; i++) {
    const a = thetaIn * (1 - i / STAPPEN);
    punten.push([inCx - R * schaal * Math.sin(a), inCz - R * schaal * Math.cos(a)]);
  }
  // Horizontaal deel
  const uitBoogStartX = lengteM - (uitH.tangentHor + uitH.boogHor) * schaal;
  if (uitBoogStartX > inBoogEindX) {
    punten.push([uitBoogStartX, zBodem]);
  }
  // Uittredeboog + tangent (gespiegeld)
  const uitCx = uitBoogStartX;
  const uitCz = zBodem + R * schaal;
  for (let i = 1; i <= STAPPEN; i++) {
    const a = thetaUit * (i / STAPPEN);
    punten.push([uitCx + R * schaal * Math.sin(a), uitCz - R * schaal * Math.cos(a)]);
  }
  const uitTangentHor = uitH.tangentHor * schaal;
  if (uitTangentHor > 0.01) {
    punten.push([lengteM, maaiveldNap]);
  } else {
    punten[punten.length - 1] = [lengteM, maaiveldNap];
  }
  return punten;
}

export function generateBoreProfileDrawing(
  trace: DemoTrace,
  segment: BoreSegmentResult,
): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;
  const plan = segment.boorplan;
  const traj = plan.trajectory;
  const lengteM = plan.lengteM;
  const maaiveld = plan.maaiveldNap;
  const gw = plan.grondwaterNap;

  const meta = {
    type: 'bore_profile' as const,
    titel: 'Boorprofiel (lengte)',
    ondertitel: `${BORE_METHODE_LABELS[segment.methode]} — sonderingen + boog`,
    trace,
    norm: 'NEN 3650-1 / NEN-EN-ISO 22476-1 / NLCS 5.1',
    schaal: `Hor. 1:500 · vert. overdreven`,
    legenda: [
      { label: 'Maaiveld', color: TEKENING_KLEUREN.maaiveld, strokeWidth: 2 },
      { label: 'Boortraject (as)', color: '#E67E22', strokeWidth: 2.5 },
      { label: 'Productleiding', color: trace.kleur, strokeWidth: 2 },
      { label: 'Grondwater', color: '#3498DB', dash: '4,2', strokeWidth: 1 },
    ],
    extra: [
      ['Ontwerpdiepte', `${traj.maxDiepteNap.toFixed(2)} m NAP (${(maaiveld - traj.maxDiepteNap).toFixed(2)} m -mv)`],
      ['Boogstraal', `${traj.boogstraalM.toFixed(0)} m · in/uit ${traj.entryAngleDeg}°/${traj.exitAngleDeg}°`],
    ] as [string, string][],
  };

  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);
  const minZ = traj.maxDiepteNap - 1.0;
  const maxZ = maaiveld + 1.0;
  const rangeZ = maxZ - minZ;

  const tx = (chainage: number) => pad.l + (chainage / lengteM) * drawW;
  const ty = (z: number) => pad.t + ((maxZ - z) / rangeZ) * drawH;
  const vertExag = (drawH / rangeZ) / (drawW / lengteM);

  const mvY = ty(maaiveld);
  const maaiveldPath = `M ${tx(0)} ${mvY} L ${tx(lengteM)} ${mvY}`;

  const profiel = boreProfilePoints(traj, lengteM, maaiveld);
  const borePath = profiel
    .map(([s, z], i) => `${i === 0 ? 'M' : 'L'} ${tx(s).toFixed(1)} ${ty(z).toFixed(1)}`)
    .join(' ');
  const middenS = lengteM / 2;
  const bodemY = ty(traj.maxDiepteNap);

  const sonderingSvg = segment.sonderingen
    .slice(0, 3)
    .map((s, i) => {
      const x = tx((lengteM / (Math.min(segment.sonderingen.length, 3) + 1)) * (i + 1));
      const layers = s.lagen
        .map((l) => {
          const y1 = ty(maaiveld - l.van);
          const y2 = ty(maaiveld - l.tot);
          const colors: Record<string, string> = { zand: '#C4A574', klei: '#8B7355', veen: '#5D4037' };
          return `<rect x="${x - 4}" y="${y1}" width="8" height="${Math.max(0, y2 - y1)}" fill="${colors[l.grondsoort] ?? '#999'}" stroke="${c.border}" stroke-width="0.3"/>`;
        })
        .join('');
      return `${layers}
      <line x1="${x}" y1="${mvY}" x2="${x}" y2="${ty(maaiveld - s.diepte)}" stroke="${c.border}" stroke-width="0.5" stroke-dasharray="2,2"/>
      <text x="${x}" y="${mvY - 4}" text-anchor="middle" fill="${c.muted}" font-size="4" font-family="IBM Plex Mono,monospace">${s.id.replace('cpt-', '').replace('bro-cpt-', '')}</text>`;
    })
    .join('');

  const grondFill = `<rect x="${tx(0)}" y="${mvY}" width="${drawW}" height="${ty(minZ) - mvY}" fill="#C4A574" fill-opacity="0.25" stroke="none"/>`;

  // Dekking-maatlijn in het midden
  const dekkingMaat = `
  <line x1="${tx(middenS)}" y1="${mvY}" x2="${tx(middenS)}" y2="${bodemY}" stroke="${c.muted}" stroke-width="0.5" stroke-dasharray="3,2"/>
  <text x="${tx(middenS) + 4}" y="${(mvY + bodemY) / 2}" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${(maaiveld - traj.maxDiepteNap).toFixed(2)} m</text>`;

  const content = `
  ${kettingas(pad.l, pad.t + drawH + 4, drawW, lengteM, 50, c.text)}
  ${hoogteasNap(pad.l - 14, pad.t, drawH, minZ, maxZ, 0.5, c.text)}
  ${grondFill}
  <path d="${maaiveldPath}" fill="none" stroke="${TEKENING_KLEUREN.maaiveld}" stroke-width="${NLCS_LIJNDIKTE.normaal}"/>
  <text x="${tx(lengteM / 2)}" y="${mvY - 4}" text-anchor="middle" fill="${TEKENING_KLEUREN.maaiveld}" font-size="5" font-family="IBM Plex Sans,sans-serif">Maaiveld ${maaiveld.toFixed(2)} m NAP</text>
  <line x1="${tx(0)}" y1="${ty(gw)}" x2="${tx(lengteM)}" y2="${ty(gw)}" stroke="#3498DB" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="${tx(lengteM - 20)}" y="${ty(gw) - 3}" text-anchor="end" fill="#3498DB" font-size="5" font-family="IBM Plex Mono,monospace">Grondwater ${gw.toFixed(2)} m NAP</text>
  <path d="${borePath}" fill="none" stroke="#E67E22" stroke-width="2.5"/>
  <path d="${borePath}" fill="none" stroke="${trace.kleur}" stroke-width="1" stroke-dasharray="1,3"/>
  ${dekkingMaat}
  <text x="${tx(middenS)}" y="${bodemY + 12}" text-anchor="middle" fill="#E67E22" font-size="5" font-family="IBM Plex Mono,monospace">Boortraject — ontwerpdiepte ${traj.maxDiepteNap.toFixed(2)} m NAP</text>
  ${sonderingSvg}
  <text x="${pad.l + 8}" y="${pad.t + drawH - 8}" fill="${c.muted}" font-size="5" font-family="IBM Plex Sans,sans-serif">Legenda</text>
  <text x="${pad.l + drawW - 4}" y="${pad.t + 8}" text-anchor="end" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${segmentProfielNummer(trace.code, segment.volgorde)}</text>
  <text x="${pad.l + 4}" y="${pad.t + 8}" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">Tekeningstatus: VO</text>
  <text x="${pad.l + 4}" y="${pad.t + 16}" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">Blad 1 · Revisie 001 · Vert. exag. ${vertExag.toFixed(0)}×</text>
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
