import { bematingGeometrie, type Bemating } from '@/lib/map/bemating';

/**
 * Rendert bematingen (lineair + hoek) als SVG voor de tekening. De tx/ty
 * transformeren RD-meters naar tekenvlak-px; pijlen en tekstrotatie worden in
 * px berekend zodat ze kloppen ongeacht schaal en y-flip.
 */

const FONT = 'IBM Plex Mono,monospace';

function pijl(tipX: number, tipY: number, dirX: number, dirY: number, kleur: string): string {
  const len = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / len;
  const uy = dirY / len;
  const px = -uy;
  const py = ux;
  const L = 5;
  const B = 1.8;
  const baseX = tipX - ux * L;
  const baseY = tipY - uy * L;
  return `<polygon points="${tipX.toFixed(1)},${tipY.toFixed(1)} ${(baseX + px * B).toFixed(1)},${(baseY + py * B).toFixed(1)} ${(baseX - px * B).toFixed(1)},${(baseY - py * B).toFixed(1)}" fill="${kleur}"/>`;
}

export function bematingenSvg(
  bematingen: Bemating[] | undefined,
  tx: (x: number) => number,
  ty: (y: number) => number,
  kleur = '#1f2937'
): string {
  if (!bematingen?.length) return '';
  const onderdelen: string[] = [];

  for (const b of bematingen) {
    const geo = bematingGeometrie(b);
    if (geo.type === 'lineair') {
      const m1 = [tx(geo.maatlijn[0][0]), ty(geo.maatlijn[0][1])] as const;
      const m2 = [tx(geo.maatlijn[1][0]), ty(geo.maatlijn[1][1])] as const;
      const e1a = [tx(geo.extensie1[0][0]), ty(geo.extensie1[0][1])] as const;
      const e1b = [tx(geo.extensie1[1][0]), ty(geo.extensie1[1][1])] as const;
      const e2a = [tx(geo.extensie2[0][0]), ty(geo.extensie2[0][1])] as const;
      const e2b = [tx(geo.extensie2[1][0]), ty(geo.extensie2[1][1])] as const;
      const dx = m2[0] - m1[0];
      const dy = m2[1] - m1[1];
      let hoek = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (hoek > 90 || hoek < -90) hoek += 180;
      const tp = [tx(geo.tekstPos[0]), ty(geo.tekstPos[1])] as const;
      onderdelen.push(`<g><!-- Bemating ${b.id} -->
  <line x1="${e1a[0].toFixed(1)}" y1="${e1a[1].toFixed(1)}" x2="${e1b[0].toFixed(1)}" y2="${e1b[1].toFixed(1)}" stroke="${kleur}" stroke-width="0.5"/>
  <line x1="${e2a[0].toFixed(1)}" y1="${e2a[1].toFixed(1)}" x2="${e2b[0].toFixed(1)}" y2="${e2b[1].toFixed(1)}" stroke="${kleur}" stroke-width="0.5"/>
  <line x1="${m1[0].toFixed(1)}" y1="${m1[1].toFixed(1)}" x2="${m2[0].toFixed(1)}" y2="${m2[1].toFixed(1)}" stroke="${kleur}" stroke-width="0.6"/>
  ${pijl(m1[0], m1[1], m2[0] - m1[0], m2[1] - m1[1], kleur)}
  ${pijl(m2[0], m2[1], m1[0] - m2[0], m1[1] - m2[1], kleur)}
  <text x="${tp[0].toFixed(1)}" y="${tp[1].toFixed(1)}" fill="${kleur}" font-size="6" font-family="${FONT}" text-anchor="middle" transform="rotate(${hoek.toFixed(1)} ${tp[0].toFixed(1)} ${tp[1].toFixed(1)})" paint-order="stroke" stroke="#ffffff" stroke-width="2.2">${geo.label}</text>
</g>`);
    } else {
      const pts = geo.boog.map(([x, y]) => `${tx(x).toFixed(1)},${ty(y).toFixed(1)}`).join(' ');
      const ps = [tx(geo.pijlStart[0]), ty(geo.pijlStart[1])] as const;
      const psNext = geo.boog[1] ? [tx(geo.boog[1][0]), ty(geo.boog[1][1])] as const : ps;
      const pe = [tx(geo.pijlEind[0]), ty(geo.pijlEind[1])] as const;
      const peProj = geo.boog[geo.boog.length - 2]
        ? [tx(geo.boog[geo.boog.length - 2][0]), ty(geo.boog[geo.boog.length - 2][1])] as const
        : pe;
      const tp = [tx(geo.tekstPos[0]), ty(geo.tekstPos[1])] as const;
      onderdelen.push(`<g><!-- Hoekbemating ${b.id} -->
  <polyline points="${pts}" fill="none" stroke="${kleur}" stroke-width="0.6"/>
  ${pijl(ps[0], ps[1], ps[0] - psNext[0], ps[1] - psNext[1], kleur)}
  ${pijl(pe[0], pe[1], pe[0] - peProj[0], pe[1] - peProj[1], kleur)}
  <text x="${tp[0].toFixed(1)}" y="${tp[1].toFixed(1)}" fill="${kleur}" font-size="6" font-family="${FONT}" text-anchor="middle" paint-order="stroke" stroke="#ffffff" stroke-width="2.2">${geo.label}</text>
</g>`);
    }
  }

  return `<g><!-- Bemating -->
  ${onderdelen.join('\n  ')}
</g>`;
}
