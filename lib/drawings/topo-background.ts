const ORIGIN_X = -285401.92;
const ORIGIN_Y = 903401.92;
const TILE_SIZE = 256;
const BASE_SCALE = 12_288_000;
// BGT-visualisatie: exacte pandcontouren (BRT generaliseert bebouwing en is
// daarmee misleidend naast een ontwerptracé). PDOK rendert BGT pas vanaf
// RD-level 12 — daaronder valt de tekening terug op BRT.
const PDOK_BGT_TEMPLATE =
  'https://service.pdok.nl/lv/bgt/wmts/v1_0/standaardvisualisatie/EPSG:28992';
const PDOK_BRT_TEMPLATE =
  'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:28992';
const BGT_MIN_LEVEL = 12;

export interface RdBbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function resolution(level: number): number {
  return (BASE_SCALE / 2 ** level) * 0.00028;
}

function tileSpan(level: number): number {
  return TILE_SIZE * resolution(level);
}

function tileBounds(col: number, row: number, level: number): RdBbox {
  const span = tileSpan(level);
  const minX = ORIGIN_X + col * span;
  const maxX = minX + span;
  const maxY = ORIGIN_Y - row * span;
  const minY = maxY - span;
  return { minX, minY, maxX, maxY };
}

function pickZoom(bbox: RdBbox, maxTiles = 20): number {
  for (let level = 12; level >= 7; level--) {
    const span = tileSpan(level);
    const colMin = Math.floor((bbox.minX - ORIGIN_X) / span);
    const colMax = Math.floor((bbox.maxX - ORIGIN_X) / span);
    const rowMin = Math.floor((ORIGIN_Y - bbox.maxY) / span);
    const rowMax = Math.floor((ORIGIN_Y - bbox.minY) / span);
    const count = (colMax - colMin + 1) * (rowMax - rowMin + 1);
    if (count > 0 && count <= maxTiles) return level;
  }
  return 8;
}

export function paddedBbox(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  paddingRatio = 0.08,
  minPaddingM = 60
): RdBbox {
  const padX = Math.max((maxX - minX) * paddingRatio, minPaddingM);
  const padY = Math.max((maxY - minY) * paddingRatio, minPaddingM);
  return {
    minX: minX - padX,
    minY: minY - padY,
    maxX: maxX + padX,
    maxY: maxY + padY,
  };
}

/** BRT PDOK achtergrondtegels als SVG-images, uitgelijnd op RD-coördinaten */
export function topoBackgroundSvg(
  bbox: RdBbox,
  tx: (x: number) => number,
  ty: (y: number) => number,
  clip: { x: number; y: number; w: number; h: number; id: string }
): string {
  const level = pickZoom(bbox);
  const span = tileSpan(level);
  const colMin = Math.floor((bbox.minX - ORIGIN_X) / span);
  const colMax = Math.floor((bbox.maxX - ORIGIN_X) / span);
  const rowMin = Math.floor((ORIGIN_Y - bbox.maxY) / span);
  const rowMax = Math.floor((ORIGIN_Y - bbox.minY) / span);

  const tiles: string[] = [];
  for (let col = colMin; col <= colMax; col++) {
    for (let row = rowMin; row <= rowMax; row++) {
      const tb = tileBounds(col, row, level);
      const x = tx(tb.minX);
      const y = ty(tb.maxY);
      const w = tx(tb.maxX) - x;
      const h = ty(tb.minY) - y;
      const template = level >= BGT_MIN_LEVEL ? PDOK_BGT_TEMPLATE : PDOK_BRT_TEMPLATE;
      const href = `${template}/${String(level).padStart(2, '0')}/${col}/${row}.png`;
      tiles.push(
        `<image href="${href}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" preserveAspectRatio="none"/>`
      );
    }
  }

  return `<!-- Achtergrond: ${level >= BGT_MIN_LEVEL ? 'BGT PDOK (exacte pandcontouren)' : 'BRT PDOK topo'} -->
  <defs>
    <clipPath id="${clip.id}">
      <rect x="${clip.x}" y="${clip.y}" width="${clip.w}" height="${clip.h}"/>
    </clipPath>
  </defs>
  <rect x="${clip.x}" y="${clip.y}" width="${clip.w}" height="${clip.h}" fill="#e8e4dc"/>
  <g clip-path="url(#${clip.id})">
    ${tiles.join('\n    ')}
  </g>`;
}
