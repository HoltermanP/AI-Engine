/**
 * NLCS-titelblok voor SVG-tekeningen.
 *
 * Rendert een normconform titelblok (kader rechtsonder, 180×120 eenheden op
 * A3-layout, parametrisch) en kan een bestaande SVG-tekening "wrappen":
 * viewBox onderaan vergroten en titelblok + kaderrand toevoegen.
 */

import { normVermelding } from '@/lib/normen';

/** Tekeningstatus conform documentbeheer. */
export type TitelblokStatus = 'concept' | 'in review' | 'definitief';

/** Velden van het NLCS-titelblok. Alle velden hebben verstandige defaults. */
export interface TitelblokOpts {
  projectnaam?: string;
  opdrachtgever?: string;
  /** Tekeningnummer (doc-code), bijv. NOP01-DO-TEK-001-v1.0 */
  tekeningnummer?: string;
  schaal?: string;
  /** Bladformaat, bijv. "A3". */
  formaat?: string;
  status?: TitelblokStatus;
  /** Versie-aanduiding, bijv. "v1.0". */
  versie?: string;
  /** Datum (vrije notatie); default vandaag (nl-NL). */
  datum?: string;
  getekendDoor?: string;
  gecontroleerdDoor?: string;
  /** Breedte van het titelblok in tekening-eenheden (default 180). */
  breedte?: number;
  /** Hoogte van het titelblok in tekening-eenheden (default 120). */
  hoogte?: number;
  /** Positie linksboven van het titelblok (default 0,0 — binnen eigen <g>). */
  x?: number;
  y?: number;
}

/** Volledig ingevulde titelblok-opties. */
type TitelblokResolved = Required<TitelblokOpts>;

function vandaagNl(): string {
  return new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Vult ontbrekende titelblok-velden in met defaults. */
export function resolveTitelblokOpts(opts: TitelblokOpts = {}): TitelblokResolved {
  return {
    projectnaam: opts.projectnaam ?? 'Onbekend project',
    opdrachtgever: opts.opdrachtgever ?? '—',
    tekeningnummer: opts.tekeningnummer ?? 'PROJ-DO-TEK-001-v1.0',
    schaal: opts.schaal ?? '1:500',
    formaat: opts.formaat ?? 'A3',
    status: opts.status ?? 'concept',
    versie: opts.versie ?? 'v1.0',
    datum: opts.datum ?? vandaagNl(),
    getekendDoor: opts.getekendDoor ?? '—',
    gecontroleerdDoor: opts.gecontroleerdDoor ?? '—',
    breedte: opts.breedte ?? 180,
    hoogte: opts.hoogte ?? 120,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface TitelblokVeld {
  label: string;
  waarde: string;
}

/**
 * Rendert het NLCS-titelblok als SVG-groep (`<g>…</g>`-string).
 * Kader van `breedte`×`hoogte` eenheden (default 180×120, A3-onderhoek),
 * met projectgegevens, doc-code, status en normvermelding NLCS 5.0.
 */
export function renderTitelblokSvg(opts: TitelblokOpts = {}): string {
  const o = resolveTitelblokOpts(opts);
  const { x, y, breedte: w, hoogte: h } = o;

  const kopH = h * 0.16; // titelregel
  const voetH = h * 0.14; // normvermelding
  const velden: TitelblokVeld[] = [
    { label: 'Project', waarde: o.projectnaam },
    { label: 'Opdrachtgever', waarde: o.opdrachtgever },
    { label: 'Tekeningnummer', waarde: o.tekeningnummer },
    { label: 'Status', waarde: o.status },
    { label: 'Schaal', waarde: o.schaal },
    { label: 'Formaat', waarde: o.formaat },
    { label: 'Versie', waarde: o.versie },
    { label: 'Datum', waarde: o.datum },
    { label: 'Getekend', waarde: o.getekendDoor },
    { label: 'Gecontroleerd', waarde: o.gecontroleerdDoor },
  ];

  const rijH = (h - kopH - voetH) / velden.length;
  const labelW = w * 0.38;
  const fontLabel = Math.min(rijH * 0.62, 5.5);
  const fontWaarde = Math.min(rijH * 0.7, 6);

  const rijen = velden
    .map((veld, i) => {
      const ry = y + kopH + i * rijH;
      return `<line x1="${x}" y1="${(ry + rijH).toFixed(2)}" x2="${x + w}" y2="${(ry + rijH).toFixed(2)}" stroke="#1a1a1a" stroke-width="0.4"/>
  <text x="${(x + 3).toFixed(2)}" y="${(ry + rijH * 0.7).toFixed(2)}" font-size="${fontLabel.toFixed(1)}" font-family="IBM Plex Mono,monospace" fill="#666666">${escapeXml(veld.label)}</text>
  <text x="${(x + labelW + 3).toFixed(2)}" y="${(ry + rijH * 0.7).toFixed(2)}" font-size="${fontWaarde.toFixed(1)}" font-family="IBM Plex Mono,monospace" fill="#1a1a1a">${escapeXml(veld.waarde)}</text>`;
    })
    .join('\n  ');

  return `<g data-titelblok="nlcs">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="#1a1a1a" stroke-width="1"/>
  <line x1="${x}" y1="${(y + kopH).toFixed(2)}" x2="${x + w}" y2="${(y + kopH).toFixed(2)}" stroke="#1a1a1a" stroke-width="0.7"/>
  <line x1="${(x + labelW).toFixed(2)}" y1="${(y + kopH).toFixed(2)}" x2="${(x + labelW).toFixed(2)}" y2="${(y + h - voetH).toFixed(2)}" stroke="#1a1a1a" stroke-width="0.4"/>
  <text x="${(x + w / 2).toFixed(2)}" y="${(y + kopH * 0.68).toFixed(2)}" font-size="${Math.min(kopH * 0.5, 9).toFixed(1)}" font-family="Space Grotesk,sans-serif" font-weight="600" text-anchor="middle" fill="#1a1a1a">TITELBLOK</text>
  ${rijen}
  <line x1="${x}" y1="${(y + h - voetH).toFixed(2)}" x2="${x + w}" y2="${(y + h - voetH).toFixed(2)}" stroke="#1a1a1a" stroke-width="0.7"/>
  <text x="${(x + w / 2).toFixed(2)}" y="${(y + h - voetH * 0.32).toFixed(2)}" font-size="${Math.min(voetH * 0.42, 6).toFixed(1)}" font-family="IBM Plex Mono,monospace" text-anchor="middle" fill="#666666">Conform ${escapeXml(normVermelding('nlcs'))} — Nederlandse CAD Standaard</text>
</g>`;
}

/** Geparste SVG-afmetingen. */
interface SvgMaten {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/** Parse viewBox (of width/height fallback) uit een SVG-string. */
function parseSvgMaten(svg: string): SvgMaten | null {
  const viewBoxMatch = svg.match(/viewBox\s*=\s*"\s*([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)\s*"/);
  if (viewBoxMatch) {
    const [, minX, minY, width, height] = viewBoxMatch;
    const maten = {
      minX: Number(minX),
      minY: Number(minY),
      width: Number(width),
      height: Number(height),
    };
    if ([maten.minX, maten.minY, maten.width, maten.height].every(Number.isFinite) && maten.width > 0 && maten.height > 0) {
      return maten;
    }
    return null;
  }
  const widthMatch = svg.match(/<svg[^>]*\swidth\s*=\s*"([\d.]+)"/);
  const heightMatch = svg.match(/<svg[^>]*\sheight\s*=\s*"([\d.]+)"/);
  if (widthMatch && heightMatch) {
    const width = Number(widthMatch[1]);
    const height = Number(heightMatch[1]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { minX: 0, minY: 0, width, height };
    }
  }
  return null;
}

/** Marge tussen tekening en titelblokstrook. */
const TITELBLOK_MARGE = 8;

/**
 * Vergroot de viewBox van een bestaande SVG-tekening onderaan en voegt een
 * NLCS-titelblok (rechtsonder) plus kaderrand toe.
 *
 * Robuust: width/height/viewBox worden met regex geparsed. Als parsing
 * faalt (geen `<svg>`-element, geen bruikbare maten of geen sluittag),
 * wordt de originele SVG ongewijzigd geretourneerd.
 */
export function wrapDrawingWithTitelblok(svg: string, opts: TitelblokOpts = {}): string {
  if (!svg.includes('</svg>')) return svg;
  const maten = parseSvgMaten(svg);
  if (!maten) return svg;

  const o = resolveTitelblokOpts(opts);
  const blokH = o.hoogte;
  const blokW = Math.min(o.breedte, maten.width);
  const extraH = blokH + TITELBLOK_MARGE * 2;

  const nieuweHoogte = maten.height + extraH;
  const nieuweViewBox = `${maten.minX} ${maten.minY} ${maten.width} ${nieuweHoogte}`;

  // Titelblok rechtsonder in de nieuwe strook
  const blokX = maten.minX + maten.width - blokW - TITELBLOK_MARGE;
  const blokY = maten.minY + maten.height + TITELBLOK_MARGE;
  const titelblok = renderTitelblokSvg({ ...opts, breedte: blokW, x: blokX, y: blokY });

  const kaderrand = `<rect x="${maten.minX + 1}" y="${maten.minY + 1}" width="${maten.width - 2}" height="${nieuweHoogte - 2}" fill="none" stroke="#1a1a1a" stroke-width="1.5" data-kaderrand="nlcs"/>`;
  const strookAchtergrond = `<rect x="${maten.minX}" y="${maten.minY + maten.height}" width="${maten.width}" height="${extraH}" fill="#f4f2ed"/>`;

  let result = svg;

  // viewBox bijwerken of toevoegen
  if (/viewBox\s*=\s*"/.test(result)) {
    result = result.replace(/viewBox\s*=\s*"[^"]*"/, `viewBox="${nieuweViewBox}"`);
  } else {
    result = result.replace(/<svg/, `<svg viewBox="${nieuweViewBox}"`);
  }

  // height-attribuut van het svg-element bijwerken (indien aanwezig)
  result = result.replace(
    /(<svg[^>]*?\sheight\s*=\s*")[\d.]+(")/,
    `$1${nieuweHoogte}$2`
  );

  // Titelblok + kaderrand vóór de sluittag invoegen
  const insertIdx = result.lastIndexOf('</svg>');
  result =
    result.slice(0, insertIdx) +
    `  ${strookAchtergrond}\n  ${titelblok}\n  ${kaderrand}\n` +
    result.slice(insertIdx);

  return result;
}
