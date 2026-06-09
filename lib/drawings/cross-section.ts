import type { DemoTrace } from '@/demo/traces';
import {
  getAvoiForTrace,
  getOntwerpEis,
  zoneLabel,
  type AvoiUtilitySlot,
} from '@/demo/avoi';
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
  leidingSymbool,
  wegDwarsprofiel,
  maatlijnHorizontaal,
  maatlijnVerticaal,
} from './symbols';
import { NLCS_KLEUR, NLCS_LIJNDIKTE } from './nlcs';

export function generateCrossSection(trace: DemoTrace): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;
  const avoi = getAvoiForTrace(trace);
  const ontwerpEis = getOntwerpEis(avoi, trace);

  const meta = {
    type: 'cross_section' as const,
    titel: 'Dwarsprofiel',
    ondertitel: `${trace.wegnaam} · snede A—A · ${avoi.gemeente}`,
    trace,
    norm: `${avoi.titel} ${avoi.versie} / NEN 7171`,
    schaal: 'Hor. 1:100 · Vert. 1:50',
    extra: [
      ['AVOI', avoi.vaststelling],
      ['Ontwerpeis', ontwerpEis.leglocatieHint],
    ] as [string, string][],
    legenda: [
      { label: 'Ontwerpleiding (AVOI)', color: trace.kleur, strokeWidth: 3 },
      { label: 'Bestaand / overig', color: '#888888', strokeWidth: 2 },
      { label: 'Verharding', color: NLCS_KLEUR.verharding, strokeWidth: 2 },
    ],
  };
  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);
  const maaiveldY = pad.t + 48;
  const hScale = 55;

  const designDepth = Math.max(Math.abs(trace.coordinates[0]?.[2] ?? 1), ontwerpEis.minDekkingM);
  const dekkingEis = Math.max(trace.vereisteDekking, ontwerpEis.minDekkingM);

  const minOffset = Math.min(...avoi.ordening.map((o) => o.offsetM), ontwerpEis.offsetM);
  const maxOffset = Math.max(...avoi.ordening.map((o) => o.offsetM), ontwerpEis.offsetM);
  const span = Math.max(avoi.profileWidthM, maxOffset - minOffset + 4);
  const xScale = drawW / span;
  const wegasX = pad.l + (-minOffset + 2) * xScale;
  const xForOffset = (offsetM: number) => wegasX + offsetM * xScale;

  const ordening = avoi.ordening.map((slot) => {
    if (slot.discipline === trace.discipline) {
      return { ...slot, offsetM: ontwerpEis.offsetM, zone: ontwerpEis.zone };
    }
    return slot;
  });

  const designDiscipline = trace.discipline;
  const hasDesignSlot = ordening.some((o) => o.discipline === designDiscipline);
  const slots = hasDesignSlot
    ? ordening
    : [
        ...ordening,
        {
          discipline: designDiscipline,
          label: trace.discipline.replace(/_/g, ' '),
          offsetM: ontwerpEis.offsetM,
          minDekkingM: ontwerpEis.minDekkingM,
          kleur: trace.kleur,
          zone: ontwerpEis.zone,
        } satisfies AvoiUtilitySlot,
      ];

  const designX = xForOffset(ontwerpEis.offsetM);
  const designY = maaiveldY + designDepth * hScale;

  const pipes = slots
    .map((item) => {
      const isDesign = item.discipline === designDiscipline;
      const diepte = isDesign ? designDepth : item.minDekkingM + 0.05;
      const y = maaiveldY + diepte * hScale;
      const diameterMm =
        item.discipline === 'gas_ld'
          ? 110
          : item.discipline === 'water'
            ? 315
            : item.discipline.startsWith('elektra')
              ? undefined
              : undefined;
      return leidingSymbool({
        x: xForOffset(item.offsetM),
        y,
        radius: isDesign ? 13 : 9,
        kleur: item.kleur,
        label: item.label,
        diepteLabel: `${diepte.toFixed(2)} m NAP`,
        ontwerp: isDesign,
        diameterMm: isDesign ? diameterMm : undefined,
      });
    })
    .join('\n  ');

  const wegBreedte = span * 0.55 * xScale;
  const weg = wegDwarsprofiel(pad.l + (drawW - wegBreedte) / 2, maaiveldY, wegBreedte);

  const offsetMaat = maatlijnHorizontaal(
    wegasX,
    designX,
    maaiveldY + 20,
    `${Math.abs(ontwerpEis.offsetM).toFixed(1)} m`,
    8
  );

  const dekkingMaat = maatlijnVerticaal(
    designX + 28,
    maaiveldY,
    designY,
    `dekking ${dekkingEis.toFixed(1)} m`,
    0
  );

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  ${weg}
  <line x1="${pad.l}" y1="${maaiveldY}" x2="${pad.l + drawW}" y2="${maaiveldY}" stroke="${NLCS_KLEUR.maaiveld}" stroke-width="${NLCS_LIJNDIKTE.hoofdlijn}"/>
  <text x="${pad.l + 4}" y="${maaiveldY - 10}" fill="${NLCS_KLEUR.maaiveld}" font-size="8" font-family="IBM Plex Mono,monospace" font-weight="600">Maaiveld (NAP)</text>
  <line x1="${wegasX.toFixed(1)}" y1="${maaiveldY}" x2="${wegasX.toFixed(1)}" y2="${pad.t + drawH}" stroke="${c.border}" stroke-width="${NLCS_LIJNDIKTE.normaal}" stroke-dasharray="6,4"/>
  <text x="${wegasX.toFixed(1)}" y="${pad.t + drawH - 10}" fill="${c.muted}" font-size="7" font-family="IBM Plex Mono,monospace" text-anchor="middle">Wegas</text>
  ${pipes}
  ${offsetMaat}
  ${dekkingMaat}
  <!-- Maatvoering -->
  <text x="${pad.l + 8}" y="${pad.t + drawH - 40}" fill="${c.muted}" font-size="7" font-family="IBM Plex Mono,monospace">Ordening conform ${avoi.titel} (${avoi.versie})</text>
  <text x="${pad.l + 8}" y="${pad.t + drawH - 28}" fill="${c.muted}" font-size="7" font-family="IBM Plex Mono,monospace">Ontwerplocatie: ${zoneLabel(ontwerpEis.zone)} · min. dekking ${dekkingEis.toFixed(1)} m (NEN 7171)</text>
  <text x="${pad.l + 8}" y="${pad.t + drawH - 16}" fill="${c.muted}" font-size="7" font-family="IBM Plex Mono,monospace">Schaal dwars 1:50 · hor. 1:100 · AVOI-referentie</text>`;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows('Dwarsprofiel A—A concept'),
  });
}
