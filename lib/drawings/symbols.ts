import { NLCS_KLEUR, NLCS_LIJNDIKTE, NLCS_LIJNTYPE, nlcsStrokeAttrs } from './nlcs';
import { TEKENING_KLEUREN } from './format';

/** ISO/NL tekenkader: dubbele rand */
export function isoTekenkader(x: number, y: number, w: number, h: number): string {
  return `<g><!-- Tekenkader ISO/NL -->
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${NLCS_KLEUR.tekenkader}" stroke-width="2"/>
  <rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="none" stroke="${NLCS_KLEUR.tekenkader}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>
</g>`;
}

function arrowHead(x: number, y: number, angleDeg: number, size = 4): string {
  const rad = (angleDeg * Math.PI) / 180;
  const x1 = x - size * Math.cos(rad - 0.4);
  const y1 = y - size * Math.sin(rad - 0.4);
  const x2 = x - size * Math.cos(rad + 0.4);
  const y2 = y - size * Math.sin(rad + 0.4);
  return `<polygon points="${x},${y} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${NLCS_KLEUR.maatlijn}"/>`;
}

/** Horizontale maatlijn conform NLCS maatvoering */
export function maatlijnHorizontaal(
  x1: number,
  x2: number,
  y: number,
  label: string,
  offsetY = 0
): string {
  const ya = y + offsetY;
  const ext = 6;
  const mx = (x1 + x2) / 2;
  return `<g><!-- Maatvoering -->
  <line x1="${x1}" y1="${y}" x2="${x1}" y2="${ya + ext}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>
  <line x1="${x2}" y1="${y}" x2="${x2}" y2="${ya + ext}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>
  <line x1="${x1}" y1="${ya}" x2="${x2}" y2="${ya}" ${nlcsStrokeAttrs({ width: NLCS_LIJNDIKTE.dun, color: NLCS_KLEUR.maatlijn })}/>
  ${arrowHead(x1, ya, 180, 3.5)}
  ${arrowHead(x2, ya, 0, 3.5)}
  <text x="${mx}" y="${ya - 3}" fill="${NLCS_KLEUR.maattekst}" font-size="7" font-family="IBM Plex Mono,monospace" text-anchor="middle">${label}</text>
</g>`;
}

/** Verticale maatlijn (diepte / dekking) */
export function maatlijnVerticaal(
  x: number,
  y1: number,
  y2: number,
  label: string,
  offsetX = 0
): string {
  const xa = x + offsetX;
  const ext = 6;
  const my = (y1 + y2) / 2;
  return `<g><!-- Maatvoering verticaal -->
  <line x1="${x}" y1="${y1}" x2="${xa + ext}" y2="${y1}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>
  <line x1="${x}" y1="${y2}" x2="${xa + ext}" y2="${y2}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>
  <line x1="${xa}" y1="${y1}" x2="${xa}" y2="${y2}" ${nlcsStrokeAttrs({ width: NLCS_LIJNDIKTE.dun, color: NLCS_KLEUR.maatlijn })}/>
  ${arrowHead(xa, y1, 90, 3.5)}
  ${arrowHead(xa, y2, -90, 3.5)}
  <text x="${xa + 8}" y="${my + 2}" fill="${NLCS_KLEUR.maattekst}" font-size="7" font-family="IBM Plex Mono,monospace">${label}</text>
</g>`;
}

/** Kettingas met tickmarks (lengteprofiel) */
export function kettingas(
  x0: number,
  y: number,
  width: number,
  lengteM: number,
  intervalM: number,
  textColor: string
): string {
  const ticks: string[] = [];
  const labels: string[] = [];
  for (let c = 0; c <= lengteM; c += intervalM) {
    const x = x0 + (c / lengteM) * width;
    ticks.push(
      `<line x1="${x.toFixed(1)}" y1="${y}" x2="${x.toFixed(1)}" y2="${y + 6}" stroke="${NLCS_KLEUR.maatlijn}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>`
    );
    if (c % (intervalM * 2) === 0 || c === lengteM) {
      labels.push(
        `<text x="${x.toFixed(1)}" y="${y + 16}" fill="${textColor}" font-size="7" font-family="IBM Plex Mono,monospace" text-anchor="middle">${c}</text>`
      );
    }
  }
  return `<g><!-- Ketting (m) -->
  <line x1="${x0}" y1="${y}" x2="${x0 + width}" y2="${y}" stroke="${NLCS_KLEUR.maatlijn}" stroke-width="${NLCS_LIJNDIKTE.medium}"/>
  ${ticks.join('\n  ')}
  ${labels.join('\n  ')}
</g>`;
}

/** Hoogte-as met NAP-ticks */
export function hoogteasNap(
  x: number,
  y0: number,
  height: number,
  minZ: number,
  maxZ: number,
  intervalM: number,
  textColor: string
): string {
  const range = maxZ - minZ || 1;
  const ty = (z: number) => y0 + ((maxZ - z) / range) * height;
  const ticks: string[] = [];
  const labels: string[] = [];
  const start = Math.ceil(minZ / intervalM) * intervalM;
  for (let z = start; z <= maxZ + 0.001; z += intervalM) {
    const y = ty(z);
    ticks.push(
      `<line x1="${x - 6}" y1="${y.toFixed(1)}" x2="${x}" y2="${y.toFixed(1)}" stroke="${NLCS_KLEUR.maatlijn}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>`
    );
    labels.push(
      `<text x="${x - 8}" y="${(y + 2).toFixed(1)}" fill="${textColor}" font-size="7" font-family="IBM Plex Mono,monospace" text-anchor="end">${z.toFixed(1)}</text>`
    );
  }
  return `<g><!-- m NAP -->
  <line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + height}" stroke="${NLCS_KLEUR.maatlijn}" stroke-width="${NLCS_LIJNDIKTE.medium}"/>
  ${ticks.join('\n  ')}
  ${labels.join('\n  ')}
</g>`;
}

/** Utiliteitsleiding symbool (dwarsdoorsnede) */
export function leidingSymbool(opts: {
  x: number;
  y: number;
  radius: number;
  kleur: string;
  label: string;
  diepteLabel?: string;
  ontwerp?: boolean;
  diameterMm?: number;
}): string {
  const { x, y, radius, kleur, label, diepteLabel, ontwerp, diameterMm } = opts;
  const sw = ontwerp ? NLCS_LIJNDIKTE.constructie : NLCS_LIJNDIKTE.medium;
  const fillOp = ontwerp ? 1 : 0.75;
  const center = diameterMm
    ? `<line x1="${(x - radius * 0.4).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + radius * 0.4).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${kleur}" stroke-width="0.5"/>`
    : '';
  return `<g><!-- Leiding ${label} -->
  <line x1="${x.toFixed(1)}" y1="${(y - radius - 8).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - radius).toFixed(1)}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="${NLCS_LIJNDIKTE.dun}" stroke-dasharray="${NLCS_LIJNTYPE.stippel}"/>
  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="${kleur}" fill-opacity="${fillOp}" stroke="${kleur}" stroke-width="${sw}"/>
  ${center}
  ${diameterMm ? `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="#fff" font-size="5" font-family="IBM Plex Mono,monospace" text-anchor="middle">Ø${diameterMm}</text>` : ''}
  <text x="${x.toFixed(1)}" y="${(y + radius + 12).toFixed(1)}" fill="${NLCS_KLEUR.maattekst}" font-size="7" font-family="IBM Plex Mono,monospace" text-anchor="middle">${label}</text>
  ${diepteLabel ? `<text x="${x.toFixed(1)}" y="${(y + radius + 22).toFixed(1)}" fill="${TEKENING_KLEUREN.mutedDonker}" font-size="6" font-family="IBM Plex Mono,monospace" text-anchor="middle">${diepteLabel}</text>` : ''}
  ${ontwerp ? `<text x="${x.toFixed(1)}" y="${(y - radius - 10).toFixed(1)}" fill="${TEKENING_KLEUREN.accent}" font-size="6" font-family="IBM Plex Mono,monospace" text-anchor="middle" font-weight="600">ONTWERP</text>` : ''}
</g>`;
}

/** Wegdwarsprofiel: verharding, fundering, berm */
export function wegDwarsprofiel(
  x0: number,
  yMaaiveld: number,
  width: number,
  opts?: { rijbaanBreedte?: number; trottoirBreedte?: number }
): string {
  const rij = opts?.rijbaanBreedte ?? width * 0.55;
  const trottoir = opts?.trottoirBreedte ?? width * 0.15;
  const cx = x0 + width / 2;
  const rijX = cx - rij / 2;
  const funderingH = 12;
  const verhardingH = 8;

  return `<g><!-- Wegdwarsprofiel -->
  <rect x="${rijX.toFixed(1)}" y="${(yMaaiveld + verhardingH).toFixed(1)}" width="${rij.toFixed(1)}" height="${funderingH}" fill="${NLCS_KLEUR.grond}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>
  <rect x="${rijX.toFixed(1)}" y="${yMaaiveld.toFixed(1)}" width="${rij.toFixed(1)}" height="${verhardingH}" fill="${NLCS_KLEUR.verharding}" stroke="${NLCS_KLEUR.verhardingLicht}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>
  <rect x="${(x0 + 4).toFixed(1)}" y="${(yMaaiveld + 4).toFixed(1)}" width="${trottoir.toFixed(1)}" height="6" fill="${NLCS_KLEUR.verhardingLicht}" stroke="none" opacity="0.6"/>
  <rect x="${(x0 + width - trottoir - 4).toFixed(1)}" y="${(yMaaiveld + 4).toFixed(1)}" width="${trottoir.toFixed(1)}" height="6" fill="${NLCS_KLEUR.verhardingLicht}" stroke="none" opacity="0.6"/>
  <text x="${cx.toFixed(1)}" y="${(yMaaiveld + verhardingH / 2 + 2).toFixed(1)}" fill="#fff" font-size="6" font-family="IBM Plex Mono,monospace" text-anchor="middle">Verharding</text>
</g>`;
}

/** Snede-aanduiding A—A */
export function snedeMarkering(
  x: number,
  y1: number,
  y2: number,
  label: string,
  side: 'left' | 'right' = 'left'
): string {
  const dx = side === 'left' ? -14 : 14;
  const tx = x + dx;
  return `<g><!-- Snede ${label} -->
  <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${NLCS_KLEUR.snede}" stroke-width="${NLCS_LIJNDIKTE.dik}" stroke-dasharray="${NLCS_LIJNTYPE.streepPunt}"/>
  <circle cx="${x}" cy="${y1}" r="8" fill="none" stroke="${NLCS_KLEUR.snede}" stroke-width="${NLCS_LIJNDIKTE.medium}"/>
  <text x="${x}" y="${y1 + 3}" fill="${NLCS_KLEUR.snede}" font-size="8" font-family="Space Grotesk,sans-serif" font-weight="700" text-anchor="middle">${label.split('—')[0] ?? label}</text>
  <text x="${tx}" y="${(y1 + y2) / 2}" fill="${NLCS_KLEUR.snede}" font-size="7" font-family="IBM Plex Mono,monospace" text-anchor="middle" transform="rotate(-90,${tx},${(y1 + y2) / 2})">${label}</text>
</g>`;
}

/** RD-coördinaten raster (hulplijnen) */
export function rdCoordRaster(
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  tx: (x: number) => number,
  ty: (y: number) => number,
  intervalM = 100
): string {
  const lines: string[] = [];
  const labels: string[] = [];
  const startX = Math.ceil(bbox.minX / intervalM) * intervalM;
  const startY = Math.ceil(bbox.minY / intervalM) * intervalM;

  for (let x = startX; x <= bbox.maxX; x += intervalM) {
    const px = tx(x);
    lines.push(
      `<line x1="${px.toFixed(1)}" y1="${ty(bbox.maxY).toFixed(1)}" x2="${px.toFixed(1)}" y2="${ty(bbox.minY).toFixed(1)}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="0.4" stroke-dasharray="2,4" opacity="0.5"/>`
    );
    labels.push(
      `<text x="${px.toFixed(1)}" y="${(ty(bbox.minY) + 10).toFixed(1)}" fill="${NLCS_KLEUR.hulplijn}" font-size="6" font-family="IBM Plex Mono,monospace" text-anchor="middle">${Math.round(x)}</text>`
    );
  }
  for (let y = startY; y <= bbox.maxY; y += intervalM) {
    const py = ty(y);
    lines.push(
      `<line x1="${tx(bbox.minX).toFixed(1)}" y1="${py.toFixed(1)}" x2="${tx(bbox.maxX).toFixed(1)}" y2="${py.toFixed(1)}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="0.4" stroke-dasharray="2,4" opacity="0.5"/>`
    );
    labels.push(
      `<text x="${(tx(bbox.minX) + 4).toFixed(1)}" y="${(py + 2).toFixed(1)}" fill="${NLCS_KLEUR.hulplijn}" font-size="6" font-family="IBM Plex Mono,monospace">${Math.round(y)}</text>`
    );
  }

  return `<g><!-- RD-raster EPSG:28992 -->\n  ${lines.join('\n  ')}\n  ${labels.join('\n  ')}\n</g>`;
}

/** Grondvulling tussen maaiveld en leiding (lengteprofiel) */
export function grondVullingFromPoints(
  maaiveld: { x: number; y: number }[],
  leiding: { x: number; y: number }[],
  fillColor = NLCS_KLEUR.grond
): string {
  if (maaiveld.length < 2 || leiding.length < 2) return '';
  const forward = maaiveld
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const backward = [...leiding]
    .reverse()
    .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  return `<path d="${forward} ${backward} Z" fill="${fillColor}" fill-opacity="0.28" stroke="none"/>`;
}

/** Kruisingshoek-aanduiding */
export function kruisingshoek(
  cx: number,
  cy: number,
  angleDeg: number,
  label: string
): string {
  const r = 18;
  const rad = (angleDeg * Math.PI) / 180;
  const x2 = cx + r * Math.cos(rad);
  const y2 = cy - r * Math.sin(rad);
  return `<g><!-- Kruisingshoek -->
  <path d="M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${NLCS_KLEUR.maatlijn}" stroke-width="${NLCS_LIJNDIKTE.dun}"/>
  <text x="${(cx + r * 0.7).toFixed(1)}" y="${(cy - r * 0.35).toFixed(1)}" fill="${NLCS_KLEUR.maattekst}" font-size="7" font-family="IBM Plex Mono,monospace">${label}</text>
</g>`;
}

/** Revisietabel (compact, boven titelhoek) */
export function revisieTabel(
  x: number,
  y: number,
  rows: { rev: string; datum: string; beschrijving: string }[]
): string {
  const colW = [28, 52, 120];
  const rowH = 11;
  const headerH = 12;
  const w = colW.reduce((a, b) => a + b, 0);
  const h = headerH + rows.length * rowH;

  const header = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fafafa" stroke="${NLCS_KLEUR.tekenkader}" stroke-width="0.5"/>
  <text x="${x + colW[0] / 2}" y="${y + 9}" fill="${NLCS_KLEUR.maattekst}" font-size="5.5" font-family="IBM Plex Mono,monospace" text-anchor="middle" font-weight="600">Rev</text>
  <text x="${x + colW[0] + colW[1] / 2}" y="${y + 9}" fill="${NLCS_KLEUR.maattekst}" font-size="5.5" font-family="IBM Plex Mono,monospace" text-anchor="middle" font-weight="600">Datum</text>
  <text x="${x + colW[0] + colW[1] + 4}" y="${y + 9}" fill="${NLCS_KLEUR.maattekst}" font-size="5.5" font-family="IBM Plex Mono,monospace" font-weight="600">Beschrijving</text>
  <line x1="${x}" y1="${y + headerH}" x2="${x + w}" y2="${y + headerH}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="0.5"/>`;

  const body = rows
    .map((row, i) => {
      const ry = y + headerH + i * rowH;
      return `<text x="${x + colW[0] / 2}" y="${ry + 8}" fill="${NLCS_KLEUR.maattekst}" font-size="5.5" font-family="IBM Plex Mono,monospace" text-anchor="middle">${row.rev}</text>
  <text x="${x + colW[0] + colW[1] / 2}" y="${ry + 8}" fill="${NLCS_KLEUR.maattekst}" font-size="5.5" font-family="IBM Plex Mono,monospace" text-anchor="middle">${row.datum}</text>
  <text x="${x + colW[0] + colW[1] + 4}" y="${ry + 8}" fill="${NLCS_KLEUR.maattekst}" font-size="5.5" font-family="IBM Plex Mono,monospace">${row.beschrijving.slice(0, 28)}</text>
  <line x1="${x}" y1="${ry + rowH}" x2="${x + w}" y2="${ry + rowH}" stroke="${NLCS_KLEUR.hulplijn}" stroke-width="0.3"/>`;
    })
    .join('\n  ');

  return `<g><!-- Revisie -->\n  ${header}\n  ${body}\n</g>`;
}
