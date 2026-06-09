import type { DemoTrace } from '@/demo/traces';
import { generateMaaiveldProfile } from '@/demo/pdok';
import { traceLengthM } from '@/lib/geo';
import {
  svgDocument,
  traceChainagePoints,
  flattenTraceCoords,
  themeColors,
  tekeningVlak,
  DEFAULT_TEKENING_THEME,
  TEKENING_KLEUREN,
  defaultRevisieRows,
} from './format';
import { kettingas, hoogteasNap, isoTekenkader, grondVullingFromPoints } from './symbols';
import { NLCS_LIJNDIKTE } from './nlcs';

export function generateLengthProfile(trace: DemoTrace): string {
  const w = 900;
  const h = 560;
  const theme = DEFAULT_TEKENING_THEME;

  const profileCoords = flattenTraceCoords(trace);
  const profile = generateMaaiveldProfile(profileCoords);
  const lengte = traceLengthM(trace.coordinates, trace.traceLines);
  const horScale = Math.max(500, Math.round(lengte / ((w - 48) / 1000) / 100) * 100);
  const vertScale = 50;
  const vertExaggeration = Math.round((horScale / vertScale) * 10) / 10;

  const meta = {
    type: 'length_profile' as const,
    titel: 'Lengteprofiel',
    ondertitel: 'AHN maaiveld + ontwerpdiepte + legtechnieken',
    trace,
    norm: 'AHN DTM / NEN 7171 / NLCS 5.1',
    schaal: `Hor. 1:${horScale} · Vert. 1:${vertScale}`,
    legenda: [
      { label: 'Maaiveld (AHN)', color: TEKENING_KLEUREN.maaiveld, strokeWidth: 2 },
      { label: 'Ontwerpdiepte', color: trace.kleur, strokeWidth: 2.5 },
      { label: 'Dekking (min.)', color: TEKENING_KLEUREN.accent, dash: '2,2', strokeWidth: 1 },
      { label: 'Grond', color: '#C4A574', strokeWidth: 0 },
    ],
    extra: [
      ['Dekking eis', `${trace.vereisteDekking} m`],
      ['Vert. exag.', `${vertExaggeration}×`],
    ] as [string, string][],
  };
  const { pad, drawW, drawH } = tekeningVlak(w, h, meta);
  const c = themeColors(theme);
  const tracePoints = traceChainagePoints(trace);

  const minZ = Math.min(
    ...profile.map((p) => p.hoogteNap),
    ...tracePoints.map((p) => p.z),
    -2.5
  );
  const maxZ = Math.max(...profile.map((p) => p.hoogteNap), 0.5);
  const rangeZ = maxZ - minZ || 1;

  const tx = (chainage: number) => pad.l + (chainage / lengte) * drawW;
  const ty = (z: number) => pad.t + ((maxZ - z) / rangeZ) * drawH;

  const maaiveldPath = profile
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${tx(p.chainage).toFixed(1)} ${ty(p.hoogteNap).toFixed(1)}`)
    .join(' ');

  const tracePath = tracePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${tx(p.chainage).toFixed(1)} ${ty(p.z).toFixed(1)}`)
    .join(' ');

  const dekkingLines = tracePoints
    .map((p) => {
      const profIdx = Math.min(
        profile.findIndex((pr) => pr.chainage >= p.chainage),
        profile.length - 1
      );
      const mv = profile[Math.max(0, profIdx)]?.hoogteNap ?? 0;
      const dekking = mv - p.z;
      if (p.chainage % 80 > 20 && p.chainage % 80 < 60) return '';
      return `<line x1="${tx(p.chainage).toFixed(1)}" y1="${ty(mv).toFixed(1)}" x2="${tx(p.chainage).toFixed(1)}" y2="${ty(p.z).toFixed(1)}" stroke="${TEKENING_KLEUREN.accent}" stroke-width="0.75" stroke-dasharray="2,2"/>
  <text x="${(tx(p.chainage) + 3).toFixed(1)}" y="${((ty(mv) + ty(p.z)) / 2).toFixed(1)}" fill="${TEKENING_KLEUREN.accent}" font-size="5" font-family="IBM Plex Mono,monospace">${dekking.toFixed(1)} m</text>`;
    })
    .filter(Boolean)
    .join('\n  ');

  const chainageInterval = lengte > 400 ? 50 : lengte > 150 ? 25 : 10;
  const hoogteInterval = rangeZ > 2 ? 0.5 : 0.25;

  let chainageAcc = 0;
  const hddMarkers = trace.segmenten
    .filter((s) => s.legtechniek === 'hdd' || s.legtechniek === 'persing')
    .map((seg) => {
      chainageAcc += seg.lengteM;
      const x = tx(Math.min(chainageAcc - seg.lengteM / 2, lengte));
      const label = seg.legtechniek === 'hdd' ? 'HDD' : 'Persing';
      return `<line x1="${x.toFixed(1)}" y1="${pad.t}" x2="${x.toFixed(1)}" y2="${pad.t + drawH}" stroke="${TEKENING_KLEUREN.waarschuwing}" stroke-width="0.75" stroke-dasharray="4,3" opacity="0.45"/>
  <rect x="${(x - 22).toFixed(1)}" y="${(pad.t + 4).toFixed(1)}" width="44" height="12" fill="#fff" fill-opacity="0.9" stroke="${TEKENING_KLEUREN.waarschuwing}" stroke-width="0.5" rx="1"/>
  <text x="${x.toFixed(1)}" y="${(pad.t + 13).toFixed(1)}" fill="${TEKENING_KLEUREN.waarschuwing}" font-size="6" font-family="IBM Plex Mono,monospace" text-anchor="middle" font-weight="600">${label}</text>`;
    })
    .join('\n  ');

  const groundFill = grondVullingFromPoints(
    profile.map((p) => ({ x: tx(p.chainage), y: ty(p.hoogteNap) })),
    tracePoints.map((p) => ({ x: tx(p.chainage), y: ty(p.z) }))
  );

  const content = `
  ${isoTekenkader(pad.l, pad.t, drawW, drawH)}
  ${groundFill}
  ${hoogteasNap(pad.l, pad.t, drawH, minZ, maxZ, hoogteInterval, c.muted)}
  ${kettingas(pad.l, pad.t + drawH, drawW, lengte, chainageInterval, c.muted)}
  <text x="12" y="${(pad.t + pad.t + drawH) / 2}" fill="${c.muted}" font-size="8" font-family="IBM Plex Mono,monospace" transform="rotate(-90,12,${(pad.t + pad.t + drawH) / 2})">m NAP</text>
  <text x="${(pad.l + pad.l + drawW) / 2}" y="${pad.t + drawH + 28}" fill="${c.muted}" font-size="8" font-family="IBM Plex Mono,monospace" text-anchor="middle">Ketting (m)</text>
  ${hddMarkers}
  <path d="${maaiveldPath}" fill="none" stroke="${TEKENING_KLEUREN.maaiveld}" stroke-width="${NLCS_LIJNDIKTE.dik}"/>
  <text x="${pad.l + 8}" y="${ty(profile[0]?.hoogteNap ?? 0) - 8}" fill="${TEKENING_KLEUREN.maaiveld}" font-size="7" font-family="IBM Plex Mono,monospace" font-weight="600">Maaiveld (AHN)</text>
  <path d="${tracePath}" fill="none" stroke="${trace.kleur}" stroke-width="${NLCS_LIJNDIKTE.constructie}"/>
  <text x="${pad.l + 8}" y="${ty(tracePoints[0]?.z ?? 0) + 16}" fill="${trace.kleur}" font-size="7" font-family="IBM Plex Mono,monospace" font-weight="600">Ontwerpdiepte</text>
  ${dekkingLines}
  <text x="${pad.l + drawW - 6}" y="${pad.t + 16}" fill="${c.subtitel}" font-size="7" font-family="IBM Plex Mono,monospace" text-anchor="end">L=${lengte} m · Hor. 1:${horScale} · Vert. 1:${vertScale} (${vertExaggeration}×)</text>`;

  return svgDocument(w, h, meta, content, {
    theme,
    revisieRows: defaultRevisieRows('Lengteprofiel concept'),
  });
}
