/**
 * Stationsplattegrond — datagedreven: ruimtebeslag uit het werkelijke aantal
 * MS-velden, de trafomaat en het LS-rek van het stationsontwerp.
 */

import type { DemoTrace } from '@/demo/traces';
import type { StationOntwerp } from '@/lib/netontwerp/types';
import { IMKL_COLORS } from '@/lib/discipline-colors';
import {
  svgDocument,
  themeColors,
  tekeningVlak,
  DEFAULT_TEKENING_THEME,
  TEKENING_KLEUREN,
  defaultRevisieRows,
} from './format';
import { isoTekenkader, maatlijnHorizontaal, maatlijnVerticaal } from './symbols';
import { NLCS_KLEUR, NLCS_LIJNDIKTE } from './nlcs';

/** Binnenmaten (m) op basis van trafomaat en aantal velden — compactstation-praktijk. */
export function stationBinnenmaten(ontwerp: StationOntwerp): { lengteM: number; breedteM: number } {
  const msVeldBreedte = 0.5; // m per RMU-veld
  const trafoLengte = ontwerp.trafo.vermogenKVA > 630 ? 2.2 : 1.6;
  const lsRekBreedte = 0.3 * Math.max(ontwerp.lsGroepen.length, 2);
  const lengteM = Math.max(3.2, 1.2 + trafoLengte + msVeldBreedte * ontwerp.velden.length);
  const breedteM = Math.max(2.2, 1.4 + Math.max(lsRekBreedte, 1.2));
  return {
    lengteM: Math.round(lengteM * 10) / 10,
    breedteM: Math.round(breedteM * 10) / 10,
  };
}

export function generateStationPlattegrond(
  trace: DemoTrace,
  ontwerp: StationOntwerp,
  stationNaam: string,
): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;
  const maten = stationBinnenmaten(ontwerp);

  const meta = {
    type: 'station_plattegrond' as const,
    titel: 'Stationsplattegrond',
    ondertitel: `${stationNaam} — ${maten.lengteM} × ${maten.breedteM} m binnenmaat`,
    trace,
    norm: 'NEN-EN 61936-1 / netbeheerder / NLCS 5.1',
    schaal: '1:50',
    legenda: [
      { label: 'Transformator', color: TEKENING_KLEUREN.accent, strokeWidth: 2 },
      { label: 'MS-installatie (RMU)', color: IMKL_COLORS.middenspanning, strokeWidth: 2 },
      { label: 'LS-rek', color: IMKL_COLORS.laagspanning, strokeWidth: 2 },
      { label: 'Kabelkelder / invoer', color: '#64748B', dash: '4,3' },
    ],
    extra: [
      ['Ruimtebeslag', `${(maten.lengteM * maten.breedteM).toFixed(1)} m²`],
      ['Trafo', `${ontwerp.trafo.vermogenKVA} kVA`],
    ] as [string, string][],
  };

  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);

  // Schaal: passend binnen ~60% van het tekenvlak
  const pxPerM = Math.min((drawW * 0.55) / maten.lengteM, (drawH * 0.6) / maten.breedteM);
  const roomW = maten.lengteM * pxPerM;
  const roomH = maten.breedteM * pxPerM;
  const ox = pad.l + 50;
  const oy = pad.t + 50;

  // Indeling: RMU links, trafo rechts, LS-rek onder langs de wand
  const rmuW = 0.5 * ontwerp.velden.length * pxPerM;
  const rmuH = 0.9 * pxPerM;
  const trafoW = (ontwerp.trafo.vermogenKVA > 630 ? 2.2 : 1.6) * pxPerM;
  const trafoH = 1.1 * pxPerM;
  const lsW = 0.3 * Math.max(ontwerp.lsGroepen.length, 2) * pxPerM;
  const lsH = 0.4 * pxPerM;

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  <text x="${ox + roomW / 2}" y="${oy - 12}" text-anchor="middle" fill="${c.subtitel}" font-size="8" font-family="IBM Plex Sans,sans-serif" font-weight="600">Plattegrond ${stationNaam} — Ruimtebeslag</text>

  <!-- Bouwkundige schil -->
  <rect x="${ox}" y="${oy}" width="${roomW}" height="${roomH}" fill="${NLCS_KLEUR.bouwvlak}" fill-opacity="0.12" stroke="${NLCS_KLEUR.tekenkader}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>

  <!-- RMU / MS-installatie -->
  <rect x="${ox + 0.3 * pxPerM}" y="${oy + 0.3 * pxPerM}" width="${rmuW}" height="${rmuH}" fill="none" stroke="${IMKL_COLORS.middenspanning}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>
  ${ontwerp.velden
    .map((veld, i) => {
      const vx = ox + 0.3 * pxPerM + (i * rmuW) / ontwerp.velden.length;
      return `<line x1="${vx}" y1="${oy + 0.3 * pxPerM}" x2="${vx}" y2="${oy + 0.3 * pxPerM + rmuH}" stroke="${IMKL_COLORS.middenspanning}" stroke-width="0.5"/>`;
    })
    .join('')}
  <text x="${ox + 0.3 * pxPerM + rmuW / 2}" y="${oy + 0.3 * pxPerM + rmuH / 2}" text-anchor="middle" fill="${IMKL_COLORS.middenspanning}" font-size="6" font-family="IBM Plex Mono,monospace">RMU ${ontwerp.velden.length} velden</text>

  <!-- Trafo -->
  <rect x="${ox + roomW - trafoW - 0.3 * pxPerM}" y="${oy + 0.3 * pxPerM}" width="${trafoW}" height="${trafoH}" fill="none" stroke="${TEKENING_KLEUREN.accent}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>
  <text x="${ox + roomW - trafoW / 2 - 0.3 * pxPerM}" y="${oy + 0.3 * pxPerM + trafoH / 2}" text-anchor="middle" fill="${TEKENING_KLEUREN.accent}" font-size="6" font-family="IBM Plex Mono,monospace">Trafo ${ontwerp.trafo.vermogenKVA} kVA</text>

  <!-- LS-rek -->
  <rect x="${ox + 0.3 * pxPerM}" y="${oy + roomH - lsH - 0.3 * pxPerM}" width="${lsW}" height="${lsH}" fill="none" stroke="${IMKL_COLORS.laagspanning}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>
  <text x="${ox + 0.3 * pxPerM + lsW / 2}" y="${oy + roomH - lsH / 2 - 0.3 * pxPerM + 2}" text-anchor="middle" fill="${IMKL_COLORS.laagspanning}" font-size="6" font-family="IBM Plex Mono,monospace">LS-rek ${ontwerp.lsGroepen.length} groepen</text>

  <!-- Kabelinvoer -->
  <rect x="${ox + roomW * 0.35}" y="${oy + roomH - 0.25 * pxPerM}" width="${roomW * 0.3}" height="${0.25 * pxPerM}" fill="none" stroke="#64748B" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="${ox + roomW * 0.5}" y="${oy + roomH + 12}" text-anchor="middle" fill="${c.muted}" font-size="5" font-family="IBM Plex Sans,sans-serif">kabelinvoer</text>

  <!-- Maatvoering -->
  ${maatlijnHorizontaal(ox, ox + roomW, oy + roomH + 18, `${maten.lengteM.toFixed(1)} m`)}
  ${maatlijnVerticaal(ox - 18, oy, oy + roomH, `${maten.breedteM.toFixed(1)} m`)}

  <text x="${pad.l + 8}" y="${pad.t + drawH - 8}" fill="${c.muted}" font-size="5" font-family="IBM Plex Sans,sans-serif">Legenda</text>
  `;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows('Plattegrond concept'),
  });
}
