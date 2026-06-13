import type { DemoTrace } from '@/demo/traces';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { DrawingResult } from './types';
import {
  verzamelKnelpunten,
  knelpuntenOpErnst,
  knelpuntenTelling,
  type Knelpunt,
  type KnelpuntCategorie,
  type KnelpuntErnst,
} from '@/lib/services/trace-routing/knelpunten';
import {
  svgDocument,
  tekeningVlak,
  DEFAULT_TEKENING_THEME,
  TEKENING_KLEUREN,
  defaultRevisieRows,
} from './format';

const ERNST_KLEUR: Record<KnelpuntErnst, string> = {
  blokkerend: '#C0392B',
  waarschuwing: '#E67E22',
  info: '#2C7BB6',
};

const CATEGORIE_LABEL: Record<KnelpuntCategorie, string> = {
  boring: 'Boring',
  kruising: 'Kruising',
  afwijking: 'Afwijking',
  conflict: 'Conflict',
};

const CATEGORIE_KLEUR: Record<KnelpuntCategorie, string> = {
  boring: '#0E7490',
  kruising: '#7C3AED',
  afwijking: '#E67E22',
  conflict: '#C0392B',
};

const ERNST_LABEL: Record<KnelpuntErnst, string> = {
  blokkerend: 'Blokkerend',
  waarschuwing: 'Waarschuwing',
  info: 'Info',
};

const FONT = 'IBM Plex Mono,monospace';
const REGEL_FONT_PX = 5.4;
const REGEL_HOOGTE = 7.5;
const CHAR_PX = REGEL_FONT_PX * 0.62;

// Vaste bladafmetingen (A3-verhouding). tekeningVlak levert bij 900×620 met
// pad {t20,r16,b16,l16}: drawW 868, drawH 584. Het titelblok staat rechtsonder
// (≈356 breed × 160 hoog) — daarom blijven de rijen links daarvan, zodat ze de
// volle bladhoogte kunnen benutten zonder overlap.
const CANVAS_W = 900;
const CANVAS_H = 620;
const KOP_HOOGTE = 26;
/** Breedte van een knelpuntrij: links van het titelblok/legenda-kolom. */
const RIJ_BREEDTE = 504;
/** Tekst-inspring vanaf de linkerrand van de rij (badge + ernst-stip). */
const TEKST_INSPRING = 44;
const TEKST_BREEDTE = RIJ_BREEDTE - TEKST_INSPRING - 8;
/** Beschikbare verticale ruimte voor rijen per blad. */
const BESCHIKBAAR = 584 - KOP_HOOGTE - 10;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Eenvoudige woordwrap voor monospace tekst binnen `breedtePx`. */
function wrap(tekst: string, breedtePx: number): string[] {
  const maxChars = Math.max(8, Math.floor(breedtePx / CHAR_PX));
  const woorden = tekst.split(/\s+/);
  const regels: string[] = [];
  let huidige = '';
  for (const woord of woorden) {
    const kandidaat = huidige ? `${huidige} ${woord}` : woord;
    if (kandidaat.length > maxChars && huidige) {
      regels.push(huidige);
      huidige = woord;
    } else {
      huidige = kandidaat;
    }
  }
  if (huidige) regels.push(huidige);
  return regels;
}

interface RenderRij {
  knelpunt: Knelpunt;
  /** Voorgewrapte tekstregels (titel + opmerkingen + norm) */
  regels: string[];
  hoogte: number;
}

function bouwRij(knelpunt: Knelpunt, tekstBreedte: number): RenderRij {
  const regels: string[] = [];
  for (const r of knelpunt.regels) {
    regels.push(...wrap(r, tekstBreedte));
  }
  if (knelpunt.norm) regels.push(...wrap(`Norm: ${knelpunt.norm}`, tekstBreedte));
  const hoogte = 11 + Math.max(1, regels.length) * REGEL_HOOGTE + 4;
  return { knelpunt, regels, hoogte };
}

function renderRij(
  rij: RenderRij,
  x: number,
  y: number,
  breedte: number,
  tekstX: number,
  tekstBreedte: number
): string {
  const k = rij.knelpunt;
  const ernstKleur = ERNST_KLEUR[k.ernst];
  const catKleur = CATEGORIE_KLEUR[k.categorie];

  const badge = `<rect x="${x + 3}" y="${y + 3}" width="26" height="14" rx="2" fill="${catKleur}"/>
  <text x="${x + 16}" y="${y + 12.5}" fill="#ffffff" font-size="6" font-family="${FONT}" text-anchor="middle" font-weight="700">${k.id}</text>`;

  const ernstStip = `<circle cx="${x + 36}" cy="${y + 10}" r="2.6" fill="${ernstKleur}"><title>${ERNST_LABEL[k.ernst]}</title></circle>`;

  const titel = `<text x="${tekstX}" y="${y + 9}" fill="${TEKENING_KLEUREN.tekstDonker}" font-size="6" font-family="${FONT}" font-weight="700">${escapeXml(
    `${CATEGORIE_LABEL[k.categorie]} · ${k.titel}`.slice(0, Math.floor(tekstBreedte / CHAR_PX))
  )}</text>`;

  const opmerkingen = rij.regels
    .map(
      (r, i) =>
        `<text x="${tekstX}" y="${y + 9 + (i + 1) * REGEL_HOOGTE}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="${REGEL_FONT_PX}" font-family="${FONT}">${escapeXml(r)}</text>`
    )
    .join('\n  ');

  return `<g><!-- ${k.id} -->
  <rect x="${x}" y="${y}" width="${breedte}" height="${rij.hoogte}" fill="#ffffff" fill-opacity="0.5" stroke="${TEKENING_KLEUREN.lijnLicht}" stroke-width="0.4" rx="2"/>
  ${badge}
  ${ernstStip}
  ${titel}
  ${opmerkingen}
</g>`;
}

function legendaBlok(x: number, y: number, telling: ReturnType<typeof knelpuntenTelling>): string {
  const items: [string, string][] = [
    ['Ernst — blokkerend', ERNST_KLEUR.blokkerend],
    ['Ernst — waarschuwing', ERNST_KLEUR.waarschuwing],
    ['Ernst — info', ERNST_KLEUR.info],
  ];
  const stippen = items
    .map(
      ([label, kleur], i) =>
        `<circle cx="${x + 5}" cy="${y + 10 + i * 9}" r="2.6" fill="${kleur}"/>
  <text x="${x + 12}" y="${y + 12.5 + i * 9}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5.4" font-family="${FONT}">${label}</text>`
    )
    .join('\n  ');
  return `<g><!-- Legenda -->
  <text x="${x}" y="${y + 2}" fill="${TEKENING_KLEUREN.tekstDonker}" font-size="6" font-family="${FONT}" font-weight="700">Legenda</text>
  ${stippen}
  <text x="${x}" y="${y + 48}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5.4" font-family="${FONT}">Boringen: ${telling.boringen} · blok. ${telling.blokkerend} · waarsch. ${telling.waarschuwing}</text>
</g>`;
}

function bouwBlad(
  trace: DemoTrace,
  rijen: RenderRij[],
  bladNr: number,
  bladTotaal: number,
  telling: ReturnType<typeof knelpuntenTelling>
): string {
  const w = CANVAS_W;
  const h = CANVAS_H;
  const theme = DEFAULT_TEKENING_THEME;

  const meta = {
    type: 'knelpunten_overzicht' as const,
    titel: 'Knelpunten- en boringenstaat',
    ondertitel: `${trace.naam} · boringen, kruisingen, afwijkingen en conflicten`,
    trace,
    norm: 'NEN 7171 / NEN 3650 / CROW 500',
    schaal: 'n.v.t. (staat)',
    legenda: [
      { label: 'Boring (B)', color: CATEGORIE_KLEUR.boring, strokeWidth: 3 },
      { label: 'Kruising (K)', color: CATEGORIE_KLEUR.kruising, strokeWidth: 3 },
      { label: 'Afwijking (A)', color: CATEGORIE_KLEUR.afwijking, strokeWidth: 3 },
      { label: 'Conflict (C)', color: CATEGORIE_KLEUR.conflict, strokeWidth: 3 },
    ],
    extra: [
      ['Boringen', `${telling.boringen} stuks`],
      ['Knelpunten', `${telling.blokkerend} blokkerend · ${telling.waarschuwing} waarschuwing`],
    ] as [string, string][],
  };

  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);

  const tekstX0 = pad.l + TEKST_INSPRING;

  let y = pad.t + KOP_HOOGTE;
  const rijenSvg = rijen
    .map((rij) => {
      const svg = renderRij(rij, pad.l, y, RIJ_BREEDTE, tekstX0, TEKST_BREEDTE);
      y += rij.hoogte + 3;
      return svg;
    })
    .join('\n  ');

  const legenda = legendaBlok(pad.l + drawW - 192, pad.t + KOP_HOOGTE, telling);

  const kop = `<text x="${pad.l + 2}" y="${pad.t + 12}" fill="${TEKENING_KLEUREN.tekstDonker}" font-size="9" font-family="${FONT}" font-weight="700">KNELPUNTEN- EN BORINGENSTAAT</text>
  <text x="${pad.l + 2}" y="${pad.t + 21}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="6" font-family="${FONT}">Blad ${bladNr}/${bladTotaal} · alle boringen, kruisingen, afwijkingen en conflicten met opmerkingen · Ernst-codering</text>
  <line x1="${pad.l}" y1="${pad.t + KOP_HOOGTE - 3}" x2="${pad.l + RIJ_BREEDTE}" y2="${pad.t + KOP_HOOGTE - 3}" stroke="${TEKENING_KLEUREN.lijnLicht}" stroke-width="0.6"/>`;

  const content = `
  ${kop}
  ${rijenSvg}
  ${legenda}
  <text x="${pad.l + 2}" y="${pad.t + drawH - 4}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="5" font-family="${FONT}">RD EPSG:28992 · staat afgeleid uit routing-analyse en conflictdetectie</text>`;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows('Knelpunten- en boringenstaat concept'),
  });
}

/**
 * Genereert de knelpunten- en boringenstaat: één of meer bladen die ALLE
 * boringen, kruisingen, afwijkingen en conflicten met opmerkingen opsommen.
 * Paginering zorgt dat niets wordt afgekapt.
 */
export function generateKnelpuntenOverzicht(
  trace: DemoTrace,
  conflicten: DetectedConflict[] = []
): DrawingResult[] {
  const knelpunten = knelpuntenOpErnst(verzamelKnelpunten(trace, conflicten));
  const telling = knelpuntenTelling(knelpunten);

  // Lege staat: toch één blad zodat het pakket compleet is
  if (knelpunten.length === 0) {
    const leeg: Knelpunt = {
      id: 'B0',
      categorie: 'boring',
      ernst: 'info',
      titel: 'Geen knelpunten of boringen vastgesteld',
      regels: ['Tracé bevat geen boringen, kruisingen, afwijkingen of conflicten.'],
    };
    return [
      {
        type: 'knelpunten_overzicht',
        label: 'Knelpunten- en boringenstaat',
        svg: bouwBlad(trace, [bouwRij(leeg, TEKST_BREEDTE)], 1, 1, telling),
        formaat: 'svg',
      },
    ];
  }

  const rijen = knelpunten.map((k) => bouwRij(k, TEKST_BREEDTE));

  const bladen: RenderRij[][] = [];
  let huidig: RenderRij[] = [];
  let hoogte = 0;
  for (const rij of rijen) {
    if (hoogte + rij.hoogte + 3 > BESCHIKBAAR && huidig.length) {
      bladen.push(huidig);
      huidig = [];
      hoogte = 0;
    }
    huidig.push(rij);
    hoogte += rij.hoogte + 3;
  }
  if (huidig.length) bladen.push(huidig);

  return bladen.map((bladRijen, i) => ({
    type: 'knelpunten_overzicht' as const,
    label: bladen.length > 1 ? `Knelpunten- en boringenstaat (${i + 1}/${bladen.length})` : 'Knelpunten- en boringenstaat',
    svg: bouwBlad(trace, bladRijen, i + 1, bladen.length, telling),
    formaat: 'svg' as const,
  }));
}
