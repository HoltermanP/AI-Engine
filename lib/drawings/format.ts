import type { DemoTrace } from '@/demo/traces';
import { DEMO_PROJECT, getDemoProjectById } from '@/demo/projects';
import { traceLengthM } from '@/lib/geo';
import { flattenTraceLines } from '@/demo/roads';
import type { DrawingType } from './types';
import { TEKENING_NORMEN } from './nlcs';
import { revisieTabel } from './symbols';

export const TEKENING_KLEUREN = {
  achtergrond: '#0D1428',
  achtergrondLicht: '#f4f2ed',
  paneel: '#1a1a2e',
  paneelLicht: '#ffffff',
  lijn: '#333333',
  lijnLicht: '#cccccc',
  tekst: '#ffffff',
  tekstDonker: '#1a2332',
  subtitel: '#888888',
  subtitelDonker: '#4a5568',
  muted: '#666666',
  mutedDonker: '#6b7280',
  accent: '#2D6FE8',
  maaiveld: '#8B7355',
  waarschuwing: '#FF4D1C',
} as const;

export type TekeningTheme = 'dark' | 'light';

export const DEFAULT_TEKENING_THEME: TekeningTheme = 'light';

export function themeColors(theme: TekeningTheme = DEFAULT_TEKENING_THEME) {
  const light = theme === 'light';
  return {
    canvas: light ? '#ffffff' : TEKENING_KLEUREN.paneel,
    canvasOpacity: light ? 1 : 0.35,
    border: light ? TEKENING_KLEUREN.lijnLicht : TEKENING_KLEUREN.lijn,
    text: light ? TEKENING_KLEUREN.tekstDonker : TEKENING_KLEUREN.tekst,
    subtitel: light ? TEKENING_KLEUREN.subtitelDonker : TEKENING_KLEUREN.subtitel,
    muted: light ? TEKENING_KLEUREN.mutedDonker : TEKENING_KLEUREN.muted,
  };
}

/** Wit tekenvlak op licht tekenblad */
export function drawingCanvas(x: number, y: number, w: number, h: number, theme = DEFAULT_TEKENING_THEME): string {
  const c = themeColors(theme);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c.canvas}" fill-opacity="${c.canvasOpacity}" stroke="${c.border}" stroke-width="1"/>`;
}

/** Minimale structuur-eisen voor uniforme SVG-tekeningen (NLCS / COINS / NEN-EN 81346) */
export const TEKENING_STRUCTUUR_EISEN = {
  normen: [...TEKENING_NORMEN],
  verplichteElementen: [
    'xmlns="http://www.w3.org/2000/svg"',
    'Tekeningnummer',
    'Tekeningstatus',
    'Blad',
    'Revisie',
    'RD EPSG:28992',
  ],
  perType: {
    trace_plan: ['Noordpijl', 'Legenda', 'Schaal', 'Start', 'Ontwerptracé', 'Bestaand net', 'BGT PDOK', 'Maatvoering'],
    length_profile: ['Ketting (m)', 'm NAP', 'Maaiveld', 'Ontwerpdiepte', 'Legenda', 'Vert.'],
    cross_section: ['AVOI', 'Ordening', 'Maaiveld (NAP)', 'Legenda', 'Wegas', 'Maatvoering'],
    crossing_detail: ['Maaiveld', 'Dekking', 'Legenda', 'Maatvoering'],
    station: ['Ruimtebeslag', 'MS-ruimte', 'Legenda'],
    station_eenlijn: ['Eenlijnschema', 'MS-rail', 'LS-rail', 'Trafo', 'Legenda'],
    station_plattegrond: ['Plattegrond', 'Ruimtebeslag', 'Legenda', 'Maatvoering'],
    werktekening: ['Noordpijl', 'Legenda', 'Schaal', 'Ontwerptracé', 'Mof', 'Maatvoering'],
    bore_plan: ['Startput', 'Eindput', 'Boogtraject', 'Ontwerptracé', 'Legenda', 'Maatvoering', 'Noordpijl', 'Schaal'],
    bore_profile: ['Maaiveld', 'Boogtraject', 'Ontwerpdiepte', 'Grondwater', 'Legenda', 'Ketting (m)', 'm NAP', 'Vert.'],
    bore_setup: ['Boorstelling', 'Startput', 'Pijpenbaan', 'Veiligheidszone', 'Mudrecycling', 'Legenda', 'Maatvoering', 'Noordpijl'],
    knelpunten_overzicht: ['Knelpunten', 'Boringen', 'Legenda', 'Ernst'],
  },
} as const;

const TEKENING_DATUM = new Date().toLocaleDateString('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function defaultRevisieRows(beschrijving = 'Concept tekening'): { rev: string; datum: string; beschrijving: string }[] {
  return [{ rev: '001', datum: TEKENING_DATUM, beschrijving }];
}

const TYPE_PREFIX: Record<DrawingType, string> = {
  trace_plan: 'TK-PLN',
  length_profile: 'TK-LNP',
  cross_section: 'TK-DWP',
  crossing_detail: 'TK-KRS',
  station: 'TK-STN',
  station_eenlijn: 'TK-EEN',
  station_plattegrond: 'TK-SPL',
  werktekening: 'TK-WRK',
  bore_plan: 'TK-BPL',
  bore_profile: 'TK-BPR',
  bore_setup: 'TK-BOP',
  knelpunten_overzicht: 'TK-KNP',
};

export interface TekeningLegendaItem {
  label: string;
  color: string;
  dash?: string;
  strokeWidth?: number;
}

export interface TekeningMeta {
  type: DrawingType;
  titel: string;
  ondertitel: string;
  trace: DemoTrace;
  norm?: string;
  schaal?: string;
  status?: string;
  blad?: string;
  revisie?: string;
  legenda?: TekeningLegendaItem[];
  extra?: [string, string][];
}

/** Vaste breedte revisieblok (rechterdeel titelhoek) — compact A3-onderhoek */
export const TITLE_BLOCK_WIDTH = 268;
/** Linkerdeel titelhoek: legenda */
export const TITLE_BLOCK_LEGEND_W = 88;
/** Rand rond tekenblad */
export const TITLE_BLOCK_MARGIN = 8;

export interface TekeningVlak {
  pad: { t: number; r: number; b: number; l: number };
  drawW: number;
  drawH: number;
  titleBlockH: number;
  titleBlockW: number;
  titleBlockLegendW: number;
  /** Positie titelhoek (legenda + revisieblok) rechtsonder in tekenkader */
  titleBlock: { x: number; y: number; w: number; h: number };
}

function titleBlockLegendWidth(meta: TekeningMeta): number {
  return meta.legenda?.length ? TITLE_BLOCK_LEGEND_W : 0;
}

function titleBlockTotalWidth(meta: TekeningMeta): number {
  return titleBlockLegendWidth(meta) + TITLE_BLOCK_WIDTH;
}

interface TitleBlockMetrics {
  headerH: number;
  rowH: number;
  wideRowH: number;
  footerH: number;
  footerRowH: number;
  pairsPerRow: number;
  pairW: number;
  labelW: number;
  valueW: number;
}

function titleBlockMetrics(w: number): TitleBlockMetrics {
  const headerH = 24;
  const rowH = 15;
  const wideRowH = 20;
  const footerH = 26;
  const footerRowH = 13;
  const pairsPerRow = 2;
  const pairW = w / pairsPerRow;
  const labelW = Math.round(Math.min(72, pairW * 0.42));
  const valueW = pairW - labelW;
  return { headerH, rowH, wideRowH, footerH, footerRowH, pairsPerRow, pairW, labelW, valueW };
}

function computeTitleBlockDataHeight(fields: TitleBlockField[], metrics: TitleBlockMetrics): number {
  let h = 0;
  for (let i = 0; i < fields.length; ) {
    if (fields[i].wide) {
      h += metrics.wideRowH;
      i += 1;
      continue;
    }
    let count = 0;
    while (count < metrics.pairsPerRow && i < fields.length && !fields[i].wide) {
      count += 1;
      i += 1;
    }
    h += metrics.rowH;
  }
  return h;
}

export function computeTitleBlockHeight(meta: TekeningMeta): number {
  const metrics = titleBlockMetrics(TITLE_BLOCK_WIDTH);
  const dataH = computeTitleBlockDataHeight(buildTitleBlockFields(meta), metrics);
  return metrics.headerH + dataH + metrics.footerH;
}

export function titleBlockReserve(meta: TekeningMeta): number {
  return computeTitleBlockHeight(meta) + TITLE_BLOCK_MARGIN;
}

/** Tekenvlak vult het kader; onderhoek ligt rechtsonder over de tekening */
export function tekeningVlak(width: number, height: number, meta: TekeningMeta): TekeningVlak {
  const titleBlockH = computeTitleBlockHeight(meta);
  const titleBlockLegendW = titleBlockLegendWidth(meta);
  const titleBlockW = titleBlockTotalWidth(meta);
  const pad = {
    t: 20,
    l: 16,
    r: 16,
    b: 16,
  };
  const drawW = width - pad.l - pad.r;
  const drawH = height - pad.t - pad.b;
  return {
    pad,
    drawW,
    drawH,
    titleBlockH,
    titleBlockW,
    titleBlockLegendW,
    titleBlock: {
      x: pad.l + drawW - titleBlockW,
      y: pad.t + drawH - titleBlockH,
      w: titleBlockW,
      h: titleBlockH,
    },
  };
}

export function tekeningNummer(type: DrawingType, traceCode: string): string {
  return `${TYPE_PREFIX[type]}-${traceCode}-2026-001`;
}

export function projectForTrace(trace: DemoTrace) {
  return getDemoProjectById(trace.projectId) ?? DEMO_PROJECT;
}

export function berekenSchaal(realWidthM: number, drawWidthMm = 170): string {
  const ratios = [500, 1000, 2000, 2500, 5000, 10000, 20000];
  for (const ratio of ratios) {
    if ((realWidthM / ratio) * 1000 <= drawWidthMm) {
      return `1:${ratio}`;
    }
  }
  const ratio = Math.ceil((realWidthM * 1000) / drawWidthMm / 500) * 500;
  return `1:${ratio}`;
}

/** Coördinaten per tracélijn (zonder diagonalen tussen segmenten) */
export function traceCoordLines(trace: DemoTrace): [number, number, number][][] {
  if (trace.traceLines?.length) return trace.traceLines;
  return trace.coordinates.length >= 2 ? [trace.coordinates] : [];
}

export function flattenTraceCoords(trace: DemoTrace): [number, number, number][] {
  return flattenTraceLines(traceCoordLines(trace));
}

export function traceChainagePoints(trace: DemoTrace): { chainage: number; z: number }[] {
  const points: { chainage: number; z: number }[] = [];
  let chainage = 0;

  for (const line of traceCoordLines(trace)) {
    for (let i = 0; i < line.length; i++) {
      const [x, y, z = 0] = line[i];
      if (i > 0) {
        const [px, py] = line[i - 1];
        chainage += Math.hypot(x - px, y - py);
      }
      points.push({ chainage, z });
    }
  }

  return points;
}

export function northArrow(x: number, y: number, size = 28, theme: TekeningTheme = 'dark'): string {
  const s = size;
  const fill = theme === 'light' ? TEKENING_KLEUREN.tekstDonker : TEKENING_KLEUREN.tekst;
  const sub = theme === 'light' ? TEKENING_KLEUREN.subtitelDonker : TEKENING_KLEUREN.subtitel;
  return `<!-- Noordpijl -->
<g transform="translate(${x},${y})">
  <polygon points="0,0 ${s * 0.22},${s * 0.55} -${s * 0.22},${s * 0.55}" fill="${fill}"/>
  <polygon points="0,0 ${s * 0.22},${s * 0.55} 0,${s * 0.75} -${s * 0.22},${s * 0.55}" fill="${TEKENING_KLEUREN.accent}"/>
  <text x="0" y="${s + 12}" fill="${sub}" font-size="8" font-family="IBM Plex Mono,monospace" text-anchor="middle">N</text>
</g>`;
}

export function scaleBar(
  x: number,
  y: number,
  barPx: number,
  meters: number,
  theme: TekeningTheme = 'dark'
): string {
  const label = meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  const stroke = theme === 'light' ? TEKENING_KLEUREN.tekstDonker : TEKENING_KLEUREN.tekst;
  const sub = theme === 'light' ? TEKENING_KLEUREN.subtitelDonker : TEKENING_KLEUREN.subtitel;
  return `<g>
  <line x1="${x}" y1="${y}" x2="${x + barPx}" y2="${y}" stroke="${stroke}" stroke-width="2"/>
  <line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 4}" stroke="${stroke}" stroke-width="1"/>
  <line x1="${x + barPx}" y1="${y - 4}" x2="${x + barPx}" y2="${y + 4}" stroke="${stroke}" stroke-width="1"/>
  <text x="${x + barPx / 2}" y="${y + 14}" fill="${sub}" font-size="8" font-family="IBM Plex Mono,monospace" text-anchor="middle">${label}</text>
</g>`;
}

export function legendBox(
  x: number,
  y: number,
  items: { label: string; color: string; dash?: string; strokeWidth?: number }[],
  theme: TekeningTheme = 'dark'
): string {
  const rowH = 16;
  const h = items.length * rowH + 12;
  const w = 190;
  const bg = theme === 'light' ? TEKENING_KLEUREN.paneelLicht : TEKENING_KLEUREN.achtergrond;
  const bgOpacity = theme === 'light' ? 0.92 : 0.85;
  const border = theme === 'light' ? TEKENING_KLEUREN.lijnLicht : TEKENING_KLEUREN.lijn;
  const title = theme === 'light' ? TEKENING_KLEUREN.mutedDonker : TEKENING_KLEUREN.muted;
  const label = theme === 'light' ? TEKENING_KLEUREN.subtitelDonker : TEKENING_KLEUREN.subtitel;
  const rows = items
    .map((item, i) => {
      const ry = y + 10 + i * rowH;
      const dash = item.dash ? ` stroke-dasharray="${item.dash}"` : '';
      const sw = item.strokeWidth ?? 2;
      return `<line x1="${x + 10}" y1="${ry}" x2="${x + 34}" y2="${ry}" stroke="${item.color}" stroke-width="${sw}"${dash}/>
  <text x="${x + 40}" y="${ry + 4}" fill="${label}" font-size="8" font-family="IBM Plex Mono,monospace">${item.label}</text>`;
    })
    .join('\n  ');

  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" fill-opacity="${bgOpacity}" stroke="${border}"/>
  <text x="${x + 10}" y="${y + 10}" fill="${title}" font-size="7" font-family="Space Grotesk,sans-serif" font-weight="600">Legenda</text>
  ${rows}
</g>`;
}

interface TitleBlockField {
  label: string;
  value: string;
  /** Waarde over drie kolommen (label + brede waarde) */
  wide?: boolean;
}

function truncateCell(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}…`;
}

function splitSubtitleLines(text: string, lineLen: number): string[] {
  if (text.length <= lineLen) return [text];
  const breakAt = text.lastIndexOf(' ', lineLen);
  const split = breakAt > 14 ? breakAt : lineLen;
  const first = text.slice(0, split).trim();
  const rest = text.slice(split).trim();
  if (!rest) return [first];
  if (rest.length <= lineLen) return [first, rest];
  return [first, `${rest.slice(0, lineLen - 1)}…`];
}

function titleBlockSubtitleSvg(
  x: number,
  y: number,
  w: number,
  ondertitel: string,
  color: string
): string {
  const lines = splitSubtitleLines(ondertitel, 32);
  if (lines.length === 1) {
    return `<text x="${x + w / 2}" y="${y}" fill="${color}" font-size="6" font-family="IBM Plex Mono,monospace" text-anchor="middle">${escapeXml(lines[0])}</text>`;
  }
  return `<text x="${x + w / 2}" y="${y - 4}" fill="${color}" font-size="6" font-family="IBM Plex Mono,monospace" text-anchor="middle">${escapeXml(lines[0])}</text>
  <text x="${x + w / 2}" y="${y + 5}" fill="${color}" font-size="6" font-family="IBM Plex Mono,monospace" text-anchor="middle">${escapeXml(lines[1])}</text>`;
}

function buildTitleBlockFields(meta: TekeningMeta): TitleBlockField[] {
  const project = projectForTrace(meta.trace);
  const lengte = traceLengthM(meta.trace.coordinates, meta.trace.traceLines);
  const nummer = tekeningNummer(meta.type, meta.trace.code);
  const status = meta.status ?? 'Concept';
  const blad = meta.blad ?? '1 / 1';

  return [
    { label: 'Tekeningnummer', value: nummer },
    { label: 'Tekeningstatus', value: status },
    { label: 'Project', value: project.naam },
    { label: 'Projectnummer', value: project.projectnummer },
    { label: 'Tracé', value: `${meta.trace.code} — ${meta.trace.naam}`, wide: true },
    { label: 'Discipline', value: meta.trace.discipline.replace(/_/g, ' ') },
    { label: 'Tracélengte', value: `ca. ${lengte} m` },
    { label: 'Coördinatensysteem', value: 'RD EPSG:28992' },
    ...(meta.norm ? [{ label: 'Norm / standaard', value: meta.norm }] : []),
    { label: 'Blad', value: blad },
    { label: 'Uitvoerder', value: 'Infra Engine BV' },
    ...(meta.extra?.map(([label, value]) => ({ label, value })) ?? []),
  ];
}

function maxCharsForCell(cellW: number, fontSize = 7): number {
  return Math.max(4, Math.floor((cellW - 8) / (fontSize * 0.58)));
}

let titleBlockCellSeq = 0;

function gridCell(
  x: number,
  y: number,
  w: number,
  h: number,
  colors: ReturnType<typeof themeColors>,
  opts: {
    label?: string;
    value?: string;
    valueLines?: string[];
    tip?: string;
    labelOnly?: boolean;
    valueOnly?: boolean;
  }
): string {
  const clipId = `tb-c-${titleBlockCellSeq++}`;
  const label = opts.label ?? '';
  const valueLines =
    opts.valueLines ??
    (opts.value ? [truncateCell(opts.value, maxCharsForCell(w))] : []);
  const fullValue = opts.value ?? valueLines.join(' ');
  const displayTruncated =
    Boolean(opts.value) && truncateCell(fullValue, maxCharsForCell(w)) !== fullValue;
  const titleTip = opts.tip
    ? `<title>${escapeXml(opts.tip)}</title>`
    : fullValue && (displayTruncated || valueLines.length > 1)
      ? `<title>${escapeXml(label || 'Waarde')}: ${escapeXml(fullValue)}</title>`
      : '';

  const labelText =
    label && !opts.valueOnly
      ? `<text x="${x + 3}" y="${y + 8}" fill="${colors.muted}" font-size="5.5" font-family="IBM Plex Mono,monospace">${escapeXml(truncateCell(label, maxCharsForCell(w, 5.5)))}</text>`
      : '';

  let valueText = '';
  if (!opts.labelOnly && valueLines.length > 0) {
    const valueY = label && !opts.valueOnly ? y + h - 3 : y + h - 4;
    if (valueLines.length === 1) {
      valueText = `<text x="${x + 3}" y="${valueY}" fill="${colors.subtitel}" font-size="6" font-family="IBM Plex Mono,monospace">${escapeXml(valueLines[0])}</text>`;
    } else {
      valueText = valueLines
        .map(
          (line, i) =>
            `<text x="${x + 3}" y="${y + 14 + i * 7}" fill="${colors.subtitel}" font-size="5.5" font-family="IBM Plex Mono,monospace">${escapeXml(line)}</text>`
        )
        .join('\n  ');
    }
  }

  return `<g>
  ${titleTip}
  <clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${colors.border}" stroke-width="0.5"/>
  <g clip-path="url(#${clipId})">
  ${labelText}
  ${valueText}
  </g>
</g>`;
}

function titleBlockDataRow(
  x: number,
  rowY: number,
  pairs: TitleBlockField[],
  metrics: TitleBlockMetrics,
  colors: ReturnType<typeof themeColors>
): string {
  const cells: string[] = [];

  for (let p = 0; p < metrics.pairsPerRow; p++) {
    const field = pairs[p];
    const pairX = x + p * metrics.pairW;
    if (!field) {
      cells.push(gridCell(pairX, rowY, metrics.pairW, metrics.rowH, colors, {}));
      continue;
    }

    cells.push(
      gridCell(pairX, rowY, metrics.labelW, metrics.rowH, colors, {
        label: field.label,
        labelOnly: true,
      }),
      gridCell(pairX + metrics.labelW, rowY, metrics.valueW, metrics.rowH, colors, {
        value: field.value,
        valueOnly: true,
        tip: `${field.label}: ${field.value}`,
      })
    );
  }

  return cells.join('\n  ');
}

function titleBlockWideRow(
  x: number,
  rowY: number,
  w: number,
  field: TitleBlockField,
  metrics: TitleBlockMetrics,
  colors: ReturnType<typeof themeColors>
): string {
  const valueW = w - metrics.labelW;
  const maxLen = maxCharsForCell(valueW, 6.5);
  const lines = splitSubtitleLines(field.value, maxLen);
  return [
    gridCell(x, rowY, metrics.labelW, metrics.wideRowH, colors, {
      label: field.label,
      labelOnly: true,
    }),
    gridCell(x + metrics.labelW, rowY, valueW, metrics.wideRowH, colors, {
      valueLines: lines,
      valueOnly: true,
      tip: `${field.label}: ${field.value}`,
    }),
  ].join('\n  ');
}

function footerMetaCell(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  colors: ReturnType<typeof themeColors>
): string {
  return gridCell(x, y, w, h, colors, {
    label,
    value,
    tip: `${label}: ${value}`,
  });
}

function titleBlockLegendaPanel(
  items: TekeningLegendaItem[],
  x: number,
  y: number,
  w: number,
  h: number,
  colors: ReturnType<typeof themeColors>
): string {
  const headerH = 16;
  const rowH = 11;
  const rows = items
    .map((item, i) => {
      const ry = y + headerH + 4 + i * rowH;
      const dash = item.dash ? ` stroke-dasharray="${item.dash}"` : '';
      const sw = item.strokeWidth ?? 2;
      const label = truncateCell(item.label, maxCharsForCell(w - 28, 5.5));
      return `<line x1="${x + 4}" y1="${ry}" x2="${x + 20}" y2="${ry}" stroke="${item.color}" stroke-width="${sw}"${dash}/>
  <text x="${x + 24}" y="${ry + 2}" fill="${colors.subtitel}" font-size="5.5" font-family="IBM Plex Mono,monospace">${escapeXml(label)}</text>`;
    })
    .join('\n  ');

  return `<g>
  <text x="${x + w / 2}" y="${y + 10}" fill="${colors.muted}" font-size="5.5" font-family="Space Grotesk,sans-serif" font-weight="600" text-anchor="middle">Legenda</text>
  <line x1="${x}" y1="${y + headerH}" x2="${x + w}" y2="${y + headerH}" stroke="${colors.border}" stroke-width="0.5"/>
  ${rows}
</g>`;
}

/** Titelhoek: legenda (links) + revisieblok (rechts) */
export function titleBlockComposite(
  meta: TekeningMeta,
  x: number,
  y: number,
  h: number,
  theme: TekeningTheme = 'dark'
): string {
  const legendW = titleBlockLegendWidth(meta);
  const dataW = TITLE_BLOCK_WIDTH;
  const totalW = legendW + dataW;
  const colors = themeColors(theme);
  const paneel = theme === 'light' ? TEKENING_KLEUREN.paneelLicht : TEKENING_KLEUREN.paneel;
  const legendPanel =
    legendW > 0 && meta.legenda
      ? titleBlockLegendaPanel(meta.legenda, x, y, legendW, h, colors)
      : '';
  const revisieblok = titleBlockRevisieblok(meta, x + legendW, y, dataW, h, theme, true);

  return `<g>
  <rect x="${x}" y="${y}" width="${totalW}" height="${h}" fill="${paneel}" stroke="${colors.border}" stroke-width="1"/>
  ${legendW > 0 ? `<line x1="${x + legendW}" y1="${y}" x2="${x + legendW}" y2="${y + h}" stroke="${colors.border}" stroke-width="0.75"/>` : ''}
  ${legendPanel}
  ${revisieblok}
</g>`;
}

function titleBlockRevisieblok(
  meta: TekeningMeta,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: TekeningTheme = 'dark',
  embedded = false
): string {
  titleBlockCellSeq = 0;
  const colors = themeColors(theme);
  const paneel = theme === 'light' ? TEKENING_KLEUREN.paneelLicht : TEKENING_KLEUREN.paneel;
  const fields = buildTitleBlockFields(meta);
  const metrics = titleBlockMetrics(w);
  const { headerH, rowH, wideRowH, footerH, footerRowH } = metrics;
  const revisie = meta.revisie ?? '001';
  const footerMetaW = w / 4;

  let rowY = y + headerH;
  const rows: string[] = [];

  for (let i = 0; i < fields.length; ) {
    if (fields[i].wide) {
      rows.push(titleBlockWideRow(x, rowY, w, fields[i], metrics, colors));
      rowY += wideRowH;
      i += 1;
      continue;
    }

    const rowFields: TitleBlockField[] = [];
    while (rowFields.length < metrics.pairsPerRow && i < fields.length && !fields[i].wide) {
      rowFields.push(fields[i]);
      i += 1;
    }

    rows.push(titleBlockDataRow(x, rowY, rowFields, metrics, colors));
    rowY += rowH;
  }

  const footerY = y + h - footerH;
  const footerHalf = w / 2;

  return `<g>
  ${embedded ? '' : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${paneel}" stroke="${colors.border}" stroke-width="1"/>`}
  <line x1="${x}" y1="${y + headerH}" x2="${x + w}" y2="${y + headerH}" stroke="${colors.border}" stroke-width="0.75"/>
  <line x1="${x}" y1="${footerY}" x2="${x + w}" y2="${footerY}" stroke="${colors.border}" stroke-width="0.75"/>
  <text x="${x + w / 2}" y="${y + 11}" fill="${colors.text}" font-size="7.5" font-family="Space Grotesk,sans-serif" font-weight="600" text-anchor="middle">${escapeXml(meta.titel.toUpperCase())}</text>
  ${titleBlockSubtitleSvg(x, y + 20, w, meta.ondertitel, colors.subtitel)}
  ${rows.join('\n  ')}
  <g>
    <rect x="${x}" y="${footerY}" width="${footerHalf}" height="${footerRowH}" fill="none" stroke="${colors.border}" stroke-width="0.5"/>
    <rect x="${x + footerHalf}" y="${footerY}" width="${footerHalf}" height="${footerRowH}" fill="none" stroke="${colors.border}" stroke-width="0.5"/>
    <text x="${x + 3}" y="${footerY + 8}" fill="${colors.muted}" font-size="5.5" font-family="IBM Plex Mono,monospace">Gezien</text>
    <text x="${x + footerHalf + 3}" y="${footerY + 8}" fill="${colors.muted}" font-size="5.5" font-family="IBM Plex Mono,monospace">Getekend</text>
    <line x1="${x + 28}" y1="${footerY + 10}" x2="${x + footerHalf - 4}" y2="${footerY + 10}" stroke="${colors.border}" stroke-width="0.5"/>
    <line x1="${x + footerHalf + 28}" y1="${footerY + 10}" x2="${x + w - 4}" y2="${footerY + 10}" stroke="${colors.border}" stroke-width="0.5"/>
  </g>
  ${footerMetaCell(x, footerY + footerRowH, footerMetaW, footerRowH, 'Schaal', meta.schaal ?? '—', colors)}
  ${footerMetaCell(x + footerMetaW, footerY + footerRowH, footerMetaW, footerRowH, 'Datum', TEKENING_DATUM, colors)}
  ${footerMetaCell(x + footerMetaW * 2, footerY + footerRowH, footerMetaW, footerRowH, 'Revisie', revisie, colors)}
  ${footerMetaCell(x + footerMetaW * 3, footerY + footerRowH, footerMetaW, footerRowH, 'Formaat', 'A3', colors)}
</g>`;
}

export function svgDocument(
  width: number,
  height: number,
  meta: TekeningMeta,
  content: string,
  opts?: { titleBlockH?: number; theme?: TekeningTheme; revisieRows?: { rev: string; datum: string; beschrijving: string }[] }
): string {
  const vlak = tekeningVlak(width, height, meta);
  const { pad, titleBlock: tb } = vlak;
  const tbH = opts?.titleBlockH ?? tb.h;
  const theme = opts?.theme ?? DEFAULT_TEKENING_THEME;
  const bg = theme === 'light' ? TEKENING_KLEUREN.achtergrondLicht : TEKENING_KLEUREN.achtergrond;
  const frame = drawingCanvas(pad.l, pad.t, vlak.drawW, vlak.drawH, theme);

  const revisieImport = opts?.revisieRows?.length
    ? `<!-- Revisie -->
  <g transform="translate(${pad.l}, ${pad.t - 2})">${revisieTabel(0, -52, opts.revisieRows)}</g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  ${frame}
  ${content}
  ${revisieImport}
  ${titleBlockComposite(meta, tb.x, tb.y, tbH, theme)}
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function valideerTekening(svg: string, type: DrawingType): { geldig: boolean; fouten: string[] } {
  const fouten: string[] = [];

  for (const element of TEKENING_STRUCTUUR_EISEN.verplichteElementen) {
    if (!svg.includes(element)) {
      fouten.push(`Ontbrekend element: ${element}`);
    }
  }

  for (const element of TEKENING_STRUCTUUR_EISEN.perType[type]) {
    if (!svg.includes(element)) {
      fouten.push(`Ontbrekend element (${type}): ${element}`);
    }
  }

  if (!/TK-(PLN|LNP|DWP|KRS|STN|BPL|BPR|BOP|KNP)-/.test(svg)) {
    fouten.push('Ontbrekend tekeningnummer (TK-xxx patroon)');
  }

  return { geldig: fouten.length === 0, fouten };
}

export function valideerAlleTekeningen(
  trace: DemoTrace,
  svgs: { type: DrawingType; svg: string }[]
): { geldig: boolean; resultaten: { type: DrawingType; geldig: boolean; fouten: string[] }[] } {
  const resultaten = svgs.map(({ type, svg }) => {
    const { geldig, fouten } = valideerTekening(svg, type);
    return { type, geldig, fouten };
  });

  return {
    geldig: resultaten.every((r) => r.geldig),
    resultaten,
  };
}
