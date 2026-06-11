import type { DemoTrace } from '@/demo/traces';
import type { BoreSegmentResult } from '@/lib/bore/types';
import {
  svgDocument,
  themeColors,
  tekeningVlak,
  northArrow,
  scaleBar,
  DEFAULT_TEKENING_THEME,
  TEKENING_KLEUREN,
  defaultRevisieRows,
} from './format';
import { isoTekenkader, maatlijnHorizontaal } from './symbols';
import { NLCS_LIJNDIKTE } from './nlcs';

/**
 * Booropstellingtekening (bovenaanzicht werkterrein bij de startput):
 * boorstelling, ankerblok, mudrecycling, pijpenbaan en veiligheidszone met
 * maatvoering — conform de uitvoeringseisen voor HDD (NEN 3650/3651, V&G).
 */
export function generateBoreSetupDrawing(
  trace: DemoTrace,
  segment: BoreSegmentResult
): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;
  const t = segment.boorplan.trajectory;

  const meta = {
    type: 'bore_setup' as const,
    titel: `Booropstelling S${segment.volgorde}`,
    ondertitel: `${segment.label} · werkterrein startput (bovenaanzicht)`,
    trace,
    norm: 'NEN 3650/3651 · V&G-plan ontwerp',
    schaal: '1:200',
    legenda: [
      { label: 'Boorstelling', color: trace.kleur, strokeWidth: 3 },
      { label: 'Pijpenbaan (product)', color: '#2563eb', dash: '6,4' },
      { label: 'Veiligheidszone', color: '#dc2626', dash: '4,3' },
      { label: 'Mudrecycling/spoeling', color: '#92400e', strokeWidth: 1.5 },
    ],
    extra: [
      ['Startput', `${t.entryPutL.toFixed(1)} × ${t.entryPutB.toFixed(1)} m · diepte ${t.entryPutD.toFixed(1)} m`],
      ['Boogtraject', `${t.booglengteM.toFixed(0)} m · R=${t.boogstraalM.toFixed(0)} m`],
      ['Intredehoek', `${t.entryAngleDeg.toFixed(0)}°`],
    ] as [string, string][],
  };
  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);

  // Schematische lay-out: links boorstelling/startput, rechts pijpenbaan
  const cy = pad.t + drawH * 0.45;
  const putX = pad.l + drawW * 0.22;
  const putW = Math.max(40, t.entryPutL * 8);
  const putH = Math.max(26, t.entryPutB * 8);
  const rigX = putX - putW / 2 - 120;
  const baanX1 = putX + putW / 2 + 16;
  const baanX2 = pad.l + drawW - 30;
  const zoneM = 12; // veiligheidszone rond stelling/put (indicatief)
  const zonePad = zoneM * 4;

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}

  <!-- Veiligheidszone -->
  <rect x="${rigX - zonePad}" y="${cy - putH / 2 - zonePad}" width="${putX + putW / 2 + zonePad - (rigX - zonePad)}" height="${putH + zonePad * 2}"
    fill="#dc2626" fill-opacity="0.05" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="4,3"/>
  <text x="${rigX - zonePad + 4}" y="${cy - putH / 2 - zonePad + 11}" fill="#dc2626" font-size="6.5" font-family="IBM Plex Mono,monospace" font-weight="600">Veiligheidszone ${zoneM} m — alleen geautoriseerd personeel</text>

  <!-- Boorstelling -->
  <rect x="${rigX}" y="${cy - 18}" width="96" height="36" fill="${trace.kleur}" fill-opacity="0.15" stroke="${trace.kleur}" stroke-width="${NLCS_LIJNDIKTE.constructie}"/>
  <text x="${rigX + 48}" y="${cy - 2}" text-anchor="middle" fill="${c.text}" font-size="7" font-family="IBM Plex Mono,monospace" font-weight="700">Boorstelling</text>
  <text x="${rigX + 48}" y="${cy + 9}" text-anchor="middle" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5.5" font-family="IBM Plex Mono,monospace">trekkracht conform berekening</text>
  <!-- Ankerblok -->
  <rect x="${rigX - 26}" y="${cy - 10}" width="18" height="20" fill="${c.text}" fill-opacity="0.25" stroke="${c.text}" stroke-width="1"/>
  <text x="${rigX - 17}" y="${cy + 26}" text-anchor="middle" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5.5" font-family="IBM Plex Mono,monospace">Anker</text>

  <!-- Startput -->
  <rect x="${putX - putW / 2}" y="${cy - putH / 2}" width="${putW}" height="${putH}" fill="#0ea5e9" fill-opacity="0.12" stroke="#0369a1" stroke-width="1.5"/>
  <text x="${putX}" y="${cy + 3}" text-anchor="middle" fill="#0369a1" font-size="6.5" font-family="IBM Plex Mono,monospace" font-weight="600">Startput</text>

  <!-- Mudrecycling -->
  <rect x="${rigX}" y="${cy + 44}" width="70" height="26" fill="#92400e" fill-opacity="0.12" stroke="#92400e" stroke-width="1.5"/>
  <text x="${rigX + 35}" y="${cy + 60}" text-anchor="middle" fill="#92400e" font-size="6" font-family="IBM Plex Mono,monospace">Mudrecycling</text>
  <path d="M ${rigX + 70} ${cy + 57} L ${putX - putW / 2} ${cy + putH / 2}" fill="none" stroke="#92400e" stroke-width="1.2"/>

  <!-- Pijpenbaan richting eindput -->
  <path d="M ${baanX1} ${cy} L ${baanX2} ${cy}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6,4"/>
  <text x="${(baanX1 + baanX2) / 2}" y="${cy - 8}" text-anchor="middle" fill="#2563eb" font-size="6.5" font-family="IBM Plex Mono,monospace">Pijpenbaan — uitgelegde productbuis richting eindput</text>

  ${maatlijnHorizontaal(putX - putW / 2, putX + putW / 2, cy + putH / 2 + 22, `${t.entryPutL.toFixed(1)} m`, 12)}
  ${maatlijnHorizontaal(rigX - zonePad, putX + putW / 2 + zonePad, cy + putH / 2 + 48, `werkterrein ≈ ${(((putX + putW / 2 + zonePad) - (rigX - zonePad)) / 4).toFixed(0)} m`, 12)}
  <!-- Maatvoering -->
  ${northArrow(pad.l + drawW - 44, pad.t + 20, 32, theme)}
  ${scaleBar(pad.l + 14, pad.t + drawH - 26, 80, 20, theme)}
  <text x="${pad.l + 14}" y="${pad.t + drawH - 38}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="6" font-family="IBM Plex Mono,monospace">RD EPSG:28992 · schematisch bovenaanzicht</text>`;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows(`Booropstelling S${segment.volgorde}`),
  });
}

export function generateAllBoreSetupDrawings(
  trace: DemoTrace,
  segmenten: BoreSegmentResult[]
): { volgorde: number; label: string; svg: string }[] {
  return segmenten
    .filter((s) => s.methode === 'hdd' || s.methode === 'persing')
    .map((s) => ({
      volgorde: s.volgorde,
      label: `Booropstelling S${s.volgorde} — ${s.label}`,
      svg: generateBoreSetupDrawing(trace, s),
    }));
}
