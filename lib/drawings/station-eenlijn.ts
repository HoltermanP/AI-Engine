/**
 * Eenlijnschema transformatorstation (RMU-stijl):
 * MS-rail bovenin → ringvelden (lastscheiders) + trafoveld → trafosymbool →
 * LS-rail → vertrekkende groepen met NH-zekeringen.
 */

import type { DemoTrace } from '@/demo/traces';
import type { StationOntwerp, StationVeld } from '@/lib/netontwerp/types';
import { IMKL_COLORS } from '@/lib/discipline-colors';
import {
  svgDocument,
  themeColors,
  tekeningVlak,
  DEFAULT_TEKENING_THEME,
  TEKENING_KLEUREN,
  defaultRevisieRows,
} from './format';
import { isoTekenkader } from './symbols';
import { NLCS_LIJNDIKTE } from './nlcs';

const MS_KLEUR = IMKL_COLORS.middenspanning;
const LS_KLEUR = IMKL_COLORS.laagspanning;

function veldLabel(veld: StationVeld): string {
  switch (veld.type) {
    case 'ms_ring_in':
      return 'Ring in';
    case 'ms_ring_uit':
      return 'Ring uit';
    case 'trafoveld':
      return 'Trafoveld';
    case 'reserve':
      return 'Reserve';
  }
}

/** Lastscheider-symbool (schuine schakelstreep met scharnierpunt). */
function lastscheider(x: number, y: number, kleur: string): string {
  return `
  <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 8}" stroke="${kleur}" stroke-width="1.5"/>
  <line x1="${x}" y1="${y + 8}" x2="${x + 7}" y2="${y + 22}" stroke="${kleur}" stroke-width="1.5"/>
  <circle cx="${x}" cy="${y + 8}" r="1.5" fill="${kleur}"/>
  <line x1="${x}" y1="${y + 24}" x2="${x}" y2="${y + 32}" stroke="${kleur}" stroke-width="1.5"/>`;
}

/** Smeltveiligheid-symbool (rechthoek met doorgaande lijn). */
function smeltveiligheid(x: number, y: number, kleur: string): string {
  return `
  <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 32}" stroke="${kleur}" stroke-width="1.5"/>
  <rect x="${x - 4}" y="${y + 8}" width="8" height="16" fill="none" stroke="${kleur}" stroke-width="1.5"/>`;
}

/** Vermogensschakelaar-symbool (kruis in vierkant). */
function vermogensschakelaar(x: number, y: number, kleur: string): string {
  return `
  <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 32}" stroke="${kleur}" stroke-width="1.5"/>
  <line x1="${x - 5}" y1="${y + 11}" x2="${x + 5}" y2="${y + 21}" stroke="${kleur}" stroke-width="1.5"/>
  <line x1="${x - 5}" y1="${y + 21}" x2="${x + 5}" y2="${y + 11}" stroke="${kleur}" stroke-width="1.5"/>`;
}

/** Trafosymbool: twee overlappende cirkels. */
function trafoSymbool(x: number, y: number, r: number, kleur: string): string {
  return `
  <circle cx="${x}" cy="${y - r * 0.55}" r="${r}" fill="none" stroke="${kleur}" stroke-width="1.8"/>
  <circle cx="${x}" cy="${y + r * 0.55}" r="${r}" fill="none" stroke="${kleur}" stroke-width="1.8"/>`;
}

export function generateStationEenlijn(
  trace: DemoTrace,
  ontwerp: StationOntwerp,
  stationNaam: string,
): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;

  const meta = {
    type: 'station_eenlijn' as const,
    titel: 'Eenlijnschema',
    ondertitel: `${stationNaam} — trafo ${ontwerp.trafo.vermogenKVA} kVA ${ontwerp.trafo.spanning}`,
    trace,
    norm: 'NEN-EN 61936-1 / IEC 60617 / netbeheerder',
    schaal: 'schematisch',
    legenda: [
      { label: 'MS-veld (lastscheider)', color: MS_KLEUR, strokeWidth: 2 },
      { label: 'Trafo', color: TEKENING_KLEUREN.accent, strokeWidth: 2 },
      { label: 'LS-groep (NH-zekering)', color: LS_KLEUR, strokeWidth: 2 },
    ],
    extra: [
      ['Velden', `${ontwerp.velden.length}× MS`],
      ['LS-groepen', `${ontwerp.lsGroepen.length}`],
    ] as [string, string][],
  };

  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);

  const railY = pad.t + 70;
  const railX1 = pad.l + 60;
  const railX2 = pad.l + Math.min(drawW - 320, 60 + ontwerp.velden.length * 90 + 40);
  const veldStap = (railX2 - railX1 - 40) / Math.max(ontwerp.velden.length, 1);

  let veldenSvg = '';
  let trafoVeldX = railX1 + 20 + veldStap * (ontwerp.velden.length - 1);
  ontwerp.velden.forEach((veld, i) => {
    const x = railX1 + 30 + veldStap * i;
    const symbool =
      veld.type === 'trafoveld'
        ? veld.beveiliging === 'vermogensschakelaar'
          ? vermogensschakelaar(x, railY, MS_KLEUR)
          : smeltveiligheid(x, railY, MS_KLEUR)
        : veld.type === 'reserve'
          ? `<line x1="${x}" y1="${railY}" x2="${x}" y2="${railY + 14}" stroke="${MS_KLEUR}" stroke-width="1.5" stroke-dasharray="3,2"/>`
          : lastscheider(x, railY, MS_KLEUR);
    if (veld.type === 'trafoveld') trafoVeldX = x;

    const kabelTekst =
      veld.type === 'ms_ring_in' || veld.type === 'ms_ring_uit'
        ? `<text x="${x}" y="${railY + 56}" text-anchor="middle" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${veld.kabel}</text>
           <line x1="${x}" y1="${railY + 32}" x2="${x}" y2="${railY + 46}" stroke="${MS_KLEUR}" stroke-width="1.5"/>
           <path d="M ${x - 4} ${railY + 46} L ${x + 4} ${railY + 46} L ${x} ${railY + 52} Z" fill="${MS_KLEUR}"/>`
        : '';

    veldenSvg += `
    ${symbool}
    ${kabelTekst}
    <text x="${x}" y="${railY - 8}" text-anchor="middle" fill="${c.text}" font-size="6" font-family="IBM Plex Sans,sans-serif">${veldLabel(veld)}</text>`;
  });

  // Trafo onder het trafoveld
  const trafoY = railY + 90;
  const lsRailY = trafoY + 60;
  const trafoSvg = `
  <line x1="${trafoVeldX}" y1="${railY + 32}" x2="${trafoVeldX}" y2="${trafoY - 22}" stroke="${MS_KLEUR}" stroke-width="1.5"/>
  ${trafoSymbool(trafoVeldX, trafoY, 14, TEKENING_KLEUREN.accent)}
  <text x="${trafoVeldX + 24}" y="${trafoY}" fill="${c.text}" font-size="7" font-family="IBM Plex Mono,monospace">Trafo ${ontwerp.trafo.vermogenKVA} kVA</text>
  <text x="${trafoVeldX + 24}" y="${trafoY + 10}" fill="${c.muted}" font-size="6" font-family="IBM Plex Mono,monospace">${ontwerp.trafo.spanning} · Dyn5</text>
  <line x1="${trafoVeldX}" y1="${trafoY + 22}" x2="${trafoVeldX}" y2="${lsRailY}" stroke="${LS_KLEUR}" stroke-width="1.5"/>`;

  // LS-rail + groepen
  const groepStap = Math.min(80, (drawW - 140) / Math.max(ontwerp.lsGroepen.length, 1));
  const lsRailX1 = pad.l + 50;
  const lsRailX2 = lsRailX1 + 30 + groepStap * ontwerp.lsGroepen.length;
  let groepenSvg = '';
  ontwerp.lsGroepen.forEach((groep, i) => {
    const x = lsRailX1 + 30 + groepStap * i;
    groepenSvg += `
    ${smeltveiligheid(x, lsRailY, LS_KLEUR)}
    <line x1="${x}" y1="${lsRailY + 32}" x2="${x}" y2="${lsRailY + 44}" stroke="${LS_KLEUR}" stroke-width="1.5"/>
    <path d="M ${x - 4} ${lsRailY + 44} L ${x + 4} ${lsRailY + 44} L ${x} ${lsRailY + 50} Z" fill="${LS_KLEUR}"/>
    <text x="${x}" y="${lsRailY + 60}" text-anchor="middle" fill="${c.text}" font-size="6" font-family="IBM Plex Sans,sans-serif">${groep.naam}</text>
    <text x="${x}" y="${lsRailY + 69}" text-anchor="middle" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${groep.zekeringA} A gG</text>
    <text x="${x}" y="${lsRailY + 77}" text-anchor="middle" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${groep.kabel}</text>
    <text x="${x}" y="${lsRailY + 85}" text-anchor="middle" fill="${c.muted}" font-size="5" font-family="IBM Plex Mono,monospace">${groep.belastingKVA} kVA</text>`;
  });

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  <text x="${pad.l + drawW / 2}" y="${pad.t + 14}" text-anchor="middle" fill="${c.subtitel}" font-size="8" font-family="IBM Plex Sans,sans-serif" font-weight="600">Eenlijnschema ${stationNaam}</text>

  <!-- MS-rail -->
  <line x1="${railX1}" y1="${railY}" x2="${railX2}" y2="${railY}" stroke="${MS_KLEUR}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>
  <text x="${railX1}" y="${railY - 20}" fill="${MS_KLEUR}" font-size="7" font-family="IBM Plex Mono,monospace">MS-rail ${ontwerp.trafo.spanning.split('/')[0]} kV</text>
  ${veldenSvg}
  ${trafoSvg}

  <!-- LS-rail -->
  <line x1="${lsRailX1}" y1="${lsRailY}" x2="${lsRailX2}" y2="${lsRailY}" stroke="${LS_KLEUR}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>
  <text x="${lsRailX1}" y="${lsRailY - 6}" fill="${LS_KLEUR}" font-size="7" font-family="IBM Plex Mono,monospace">LS-rail 400 V</text>
  ${groepenSvg}

  <text x="${pad.l + 8}" y="${pad.t + drawH - 8}" fill="${c.muted}" font-size="5" font-family="IBM Plex Sans,sans-serif">Legenda</text>
  `;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows('Eenlijnschema concept'),
  });
}
