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
import {
  isoTekenkader,
  maatlijnHorizontaal,
  maatlijnVerticaal,
  kruisingshoek,
  leidingSymbool,
} from './symbols';
import { NLCS_KLEUR, NLCS_LIJNDIKTE, NLCS_LIJNTYPE } from './nlcs';

export function generateCrossingDetail(trace: DemoTrace): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;
  const isGasHd = trace.discipline === 'gas_hd';
  const norm = isGasHd ? 'NEN 3650 / NEN 3651' : 'NEN 7171 / IMKL 2.0';

  const meta = {
    type: 'crossing_detail' as const,
    titel: 'Kruisingsdetail',
    ondertitel: isGasHd ? 'HD-kruising · maatvoering mantelbuis' : 'Kruising ondergrondse netten · 90°',
    trace,
    norm,
    schaal: '1:50',
    legenda: isGasHd
      ? [
          { label: 'HD-leiding', color: trace.kleur, strokeWidth: 3 },
          { label: 'Mantelbuis', color: '#4a5568', dash: '4,3' },
          { label: 'Dekking', color: TEKENING_KLEUREN.accent, strokeWidth: 1 },
        ]
      : [
          { label: 'Ontwerpleiding', color: trace.kleur, strokeWidth: 4 },
          { label: 'Bestaand net', color: IMKL_COLORS.laagspanning, dash: '4,3' },
          { label: 'Vrij te houden', color: TEKENING_KLEUREN.accent, strokeWidth: 1 },
        ],
    extra: [
      [
        'Legtechniek',
        trace.segmenten.find((s) => s.legtechniek === 'hdd')
          ? 'HDD (gestuurd boren)'
          : (trace.segmenten[0]?.legtechniek.replace(/_/g, ' ') ?? 'open ontgraving'),
      ],
    ] as [string, string][],
  };
  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);
  const maaiveldY = pad.t + 56;
  const dekking = trace.vereisteDekking;
  const cx = pad.l + drawW / 2;
  const ontwerpY = maaiveldY + 90;

  const detailContent = isGasHd
    ? `<g><!-- HD kruising NEN 3651 -->
  ${leidingSymbool({ x: cx, y: ontwerpY, radius: 16, kleur: trace.kleur, label: trace.netType.slice(0, 20), ontwerp: true, diameterMm: 355 })}
  <ellipse cx="${cx}" cy="${ontwerpY}" rx="${drawW * 0.26}" ry="32" fill="none" stroke="${c.subtitel}" stroke-width="${NLCS_LIJNDIKTE.medium}" stroke-dasharray="${NLCS_LIJNTYPE.streep}"/>
  <text x="${cx}" y="${ontwerpY + 52}" fill="${c.subtitel}" font-size="8" text-anchor="middle" font-family="IBM Plex Mono,monospace">Mantelbuis / beschermbuis</text>
  ${maatlijnVerticaal(cx - drawW * 0.32, maaiveldY, ontwerpY - 16, `dekking ${dekking.toFixed(1)} m`, 0)}
  <text x="${pad.l + 12}" y="${pad.t + drawH - 36}" fill="${c.muted}" font-size="8" font-family="IBM Plex Mono,monospace">Dekking min. ${dekking.toFixed(1)} m (NEN 3651) · PE-coating + mantelbuis · COINS uitwisseling</text>
</g>`
    : `<g><!-- Kruising LS/gas LD NEN 7171 -->
  <line x1="${pad.l + 48}" y1="${ontwerpY}" x2="${pad.l + drawW - 48}" y2="${ontwerpY}" stroke="${trace.kleur}" stroke-width="${NLCS_LIJNDIKTE.constructie}"/>
  <text x="${pad.l + 54}" y="${ontwerpY - 8}" fill="${trace.kleur}" font-size="8" font-family="IBM Plex Mono,monospace">${trace.netType.slice(0, 28)}</text>
  <line x1="${cx}" y1="${maaiveldY + 24}" x2="${cx}" y2="${ontwerpY + 40}" stroke="${IMKL_COLORS.laagspanning}" stroke-width="${NLCS_LIJNDIKTE.medium}" stroke-dasharray="${NLCS_LIJNTYPE.streep}"/>
  <text x="${cx + 10}" y="${(maaiveldY + ontwerpY) / 2 + 4}" fill="${IMKL_COLORS.laagspanning}" font-size="8" font-family="IBM Plex Mono,monospace">Bestaand net (KLIC)</text>
  ${kruisingshoek(cx, ontwerpY, 90, '90°')}
  ${maatlijnHorizontaal(cx + 20, cx + 70, ontwerpY + 18, '≥ 0,5 m vrij', 0)}
  ${maatlijnVerticaal(cx + drawW * 0.28, maaiveldY, ontwerpY, `dekking ${dekking.toFixed(1)} m`, 0)}
  <text x="${pad.l + 12}" y="${pad.t + drawH - 36}" fill="${c.muted}" font-size="8" font-family="IBM Plex Mono,monospace">Vrij te houden afstand: 0,5 m (NEN 7171) · Dekking min. ${dekking.toFixed(1)} m</text>
</g>`;

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  <line x1="${pad.l}" y1="${maaiveldY}" x2="${pad.l + drawW}" y2="${maaiveldY}" stroke="${NLCS_KLEUR.maaiveld}" stroke-width="${NLCS_LIJNDIKTE.hoofdlijn}"/>
  <text x="${pad.l + 8}" y="${maaiveldY - 10}" fill="${NLCS_KLEUR.maaiveld}" font-size="9" font-family="IBM Plex Mono,monospace" font-weight="600">Maaiveld</text>
  <line x1="${pad.l}" y1="${maaiveldY + 120}" x2="${pad.l + drawW}" y2="${maaiveldY + 120}" stroke="${NLCS_KLEUR.grond}" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.5"/>
  <text x="${pad.l + drawW - 8}" y="${maaiveldY + 134}" fill="${c.muted}" font-size="7" font-family="IBM Plex Mono,monospace" text-anchor="end">Grondwater / grondlaag indicatief</text>
  ${detailContent}
  <!-- Maatvoering -->
  <text x="${pad.l + 12}" y="${pad.t + drawH - 18}" fill="${c.muted}" font-size="7" font-family="IBM Plex Mono,monospace">Schaal dwars 1:50 · ${trace.leglocatie} · NLCS lijnstijlen</text>`;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows('Kruisingsdetail concept'),
  });
}
