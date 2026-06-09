import type { DemoTrace } from '@/demo/traces';
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
import { NLCS_KLEUR, NLCS_LIJNDIKTE, NLCS_LIJNTYPE } from './nlcs';

export function generateStationDrawing(trace: DemoTrace): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;

  const meta = {
    type: 'station' as const,
    titel: 'Stationstekening',
    ondertitel: 'Ruimtebeslag MS-distributieruimte · schematisch plattegrond',
    trace,
    norm: 'NEN-EN 61936-1 / netbeheerder / NLCS 5.1',
    schaal: '1:100',
    legenda: [
      { label: 'Transformator', color: IMKL_COLORS.middenspanning, strokeWidth: 2 },
      { label: 'Schakelveld MS', color: IMKL_COLORS.middenspanning, strokeWidth: 2 },
      { label: 'Uitbreiding (nieuw)', color: TEKENING_KLEUREN.accent, dash: '4,3' },
      { label: 'Aansluittracé', color: trace.kleur, strokeWidth: 3 },
    ],
    extra: [['Nettype', trace.netType]] as [string, string][],
  };
  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);
  const ox = pad.l + 24;
  const oy = pad.t + 24;
  const roomW = 520;
  const roomH = 300;

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  <rect x="${ox}" y="${oy}" width="${roomW}" height="${roomH}" fill="${NLCS_KLEUR.bouwvlak}" fill-opacity="0.15" stroke="${NLCS_KLEUR.tekenkader}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>
  <text x="${ox + roomW / 2}" y="${oy + 14}" fill="${c.subtitel}" font-size="8" font-family="IBM Plex Mono,monospace" text-anchor="middle" font-weight="600">MS-ruimte — Ruimtebeslag (schematisch)</text>

  <rect x="${ox + 20}" y="${oy + 28}" width="120" height="80" fill="none" stroke="${IMKL_COLORS.middenspanning}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>
  <circle cx="${ox + 80}" cy="${oy + 58}" r="18" fill="none" stroke="${IMKL_COLORS.middenspanning}" stroke-width="1"/>
  <text x="${ox + 80}" y="${oy + 62}" fill="${IMKL_COLORS.middenspanning}" font-size="7" text-anchor="middle" font-family="IBM Plex Mono,monospace">MS</text>
  <text x="${ox + 80}" y="${oy + 98}" fill="${IMKL_COLORS.middenspanning}" font-size="9" text-anchor="middle" font-family="IBM Plex Mono,monospace">Trafo 1</text>
  <text x="${ox + 80}" y="${oy + 110}" fill="${c.muted}" font-size="7" text-anchor="middle">2 MVA · bestaand</text>

  <rect x="${ox + 160}" y="${oy + 28}" width="120" height="80" fill="none" stroke="${IMKL_COLORS.middenspanning}" stroke-width="${NLCS_LIJNDIKTE.dik}" stroke-dasharray="${NLCS_LIJNTYPE.streep}"/>
  <circle cx="${ox + 220}" cy="${oy + 58}" r="18" fill="none" stroke="${IMKL_COLORS.middenspanning}" stroke-width="1"/>
  <text x="${ox + 220}" y="${oy + 98}" fill="${IMKL_COLORS.middenspanning}" font-size="9" text-anchor="middle" font-family="IBM Plex Mono,monospace">Trafo 2</text>
  <text x="${ox + 220}" y="${oy + 110}" fill="${TEKENING_KLEUREN.accent}" font-size="7" text-anchor="middle">2 MVA · nieuw</text>

  <rect x="${ox + 20}" y="${oy + 130}" width="380" height="56" fill="none" stroke="${IMKL_COLORS.middenspanning}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>
  <text x="${ox + 210}" y="${oy + 162}" fill="${IMKL_COLORS.middenspanning}" font-size="9" text-anchor="middle" font-family="IBM Plex Mono,monospace">MS-schakelvelden (4×)</text>

  <rect x="${ox + 420}" y="${oy + 28}" width="80" height="240" fill="none" stroke="${TEKENING_KLEUREN.accent}" stroke-width="${NLCS_LIJNDIKTE.medium}" stroke-dasharray="${NLCS_LIJNTYPE.streep}"/>
  <text x="${ox + 460}" y="${oy + 150}" fill="${TEKENING_KLEUREN.accent}" font-size="8" text-anchor="middle" font-family="IBM Plex Mono,monospace" transform="rotate(-90,${ox + 460},${oy + 150})">Uitbreidingszone</text>

  <line x1="${ox + roomW - 8}" y1="${oy + 170}" x2="${ox + roomW + 56}" y2="${oy + 170}" stroke="${trace.kleur}" stroke-width="${NLCS_LIJNDIKTE.constructie}"/>
  <polygon points="${ox + roomW + 56},${oy + 170} ${ox + roomW + 48},${oy + 166} ${ox + roomW + 48},${oy + 174}" fill="${trace.kleur}"/>
  <text x="${ox + roomW + 62}" y="${oy + 174}" fill="${trace.kleur}" font-size="7" font-family="IBM Plex Mono,monospace">Aansluittracé</text>

  ${maatlijnHorizontaal(ox, ox + roomW, oy + roomH + 16, `${roomW / 10} m`, 0)}
  ${maatlijnVerticaal(ox - 20, oy, oy + roomH, `${roomH / 10} m`, 0)}

  <text x="${ox + 8}" y="${oy + roomH - 8}" fill="${c.muted}" font-size="8" font-family="IBM Plex Mono,monospace">Vrije loopruimte min. 1,2 m · NEN-EN 61936-1 · Schaal 1:100</text>
  <text x="${ox + 8}" y="${oy + roomH + 36}" fill="${c.muted}" font-size="8" font-family="IBM Plex Mono,monospace">Totaal footprint: ca. 72 m² · Vrije loopruimte: 12 m²</text>`;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows('Stationstekening concept'),
  });
}
