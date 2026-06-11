import { describe, expect, it } from 'vitest';
import { appendFileSync } from 'fs';
import { segmentIntersectsPolygon } from '@/lib/geo';
import { fetchRoutingLayerData } from './fetch-routing-layers';
import { buildRoutingContext } from './context';
import { planAutomaticTrace } from './plan';
import type { TraceWaypoint } from './types';

function log(line: string) {
  appendFileSync('/tmp/trace-bench.log', `\n${line}`);
}

// Live-kwaliteitstoets met echte PDOK-data rond Emmeloord.
// Draait alleen expliciet: LIVE_PDOK=1 npx vitest run lib/services/trace-routing/bench-live.test.ts
describe('trace-routing live kwaliteitstoets', () => {
  it.runIf(process.env.LIVE_PDOK === '1')(
    'route volgt wegen, raakt geen pand en detecteert kruisingen',
    { timeout: 120_000 },
    async () => {
      const seed: TraceWaypoint[] = [
        { x: 179000, y: 523900, label: 'start' },
        { x: 180400, y: 525100, label: 'eind' },
      ];

      const tFetch = performance.now();
      const layerData = await fetchRoutingLayerData(seed);
      const fetchMs = Math.round(performance.now() - tFetch);

      const wegen = (layerData.nwb ?? []).filter((w) => w.coordinates.length >= 2);
      const start = wegen[0].coordinates[0];
      let eind = start;
      let bestD = 0;
      for (const weg of wegen) {
        for (const c of weg.coordinates) {
          const d = Math.hypot(c[0] - start[0], c[1] - start[1]);
          if (d > bestD && d < 1500) {
            bestD = d;
            eind = c;
          }
        }
      }
      const waypoints: TraceWaypoint[] = [
        { x: start[0], y: start[1] },
        { x: eind[0], y: eind[1] },
      ];

      const input = {
        waypoints,
        discipline: 'elektra_ls' as const,
        projectId: 'bench',
        vereisteDekking: 0.6,
        layerData,
      };

      const tPlan = performance.now();
      const result = planAutomaticTrace(input);
      const planMs = Math.round(performance.now() - tPlan);

      const ctx = buildRoutingContext(input);
      const route2d = result.coordinates.map(([x, y]) => [x, y] as [number, number]);

      // 1. Nooit door bebouwing — strenge segmenttoets tegen alle pandpolygonen
      let pandHits = 0;
      for (let i = 1; i < route2d.length; i++) {
        for (const pand of ctx.pandPolygonen) {
          if (
            segmentIntersectsPolygon(
              route2d[i - 1][0],
              route2d[i - 1][1],
              route2d[i][0],
              route2d[i][1],
              pand
            )
          ) {
            pandHits++;
          }
        }
      }

      // 2. Wegvolging: vrijwel elk routepunt ligt dicht bij een wegcenterline
      let bijWeg = 0;
      for (const [x, y] of route2d) {
        let minD = Infinity;
        for (const weg of ctx.roadCenterlines) {
          for (let i = 1; i < weg.centerline.length; i++) {
            const [x1, y1] = weg.centerline[i - 1];
            const [x2, y2] = weg.centerline[i];
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lenSq = dx * dx + dy * dy;
            const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
            minD = Math.min(minD, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
            if (minD < 15) break;
          }
          if (minD < 15) break;
        }
        if (minD < 15) bijWeg++;
      }
      const wegVolgPct = route2d.length ? Math.round((100 * bijWeg) / route2d.length) : 0;

      const kruisingen = result.segmenten.flatMap((s) => s.kruisingen);

      log(
        `kwaliteit: fetch ${fetchMs} ms | plan ${planMs} ms | lengte ${result.totaleLengteM} m | ` +
          `bomen ${ctx.bomen.length} | panden ${ctx.pandPolygonen.length} | pandHits ${pandHits} | ` +
          `wegvolging ${wegVolgPct}% | kruisingen ${kruisingen.length} ` +
          `[${kruisingen.map((k) => `${k.type}:${k.legtechniek}`).join(', ')}] | ` +
          `opmerkingen: ${result.segmenten.flatMap((s) => s.opmerkingen).join(' // ')}`
      );

      expect(result.totaleLengteM).toBeGreaterThan(0);
      expect(pandHits).toBe(0);
      expect(wegVolgPct).toBeGreaterThanOrEqual(80);
      expect(planMs).toBeLessThan(30_000);
    }
  );
});
