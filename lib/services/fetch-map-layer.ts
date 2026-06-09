import type { MapLayerData } from '@/components/trace-map';
import { getTrace } from '@/lib/db/store';
import { pdokBrkKaartConnector } from '@/lib/connectors/pdok/brk-kaart';
import { pdokBgtConnector } from '@/lib/connectors/pdok/bgt';
import { pdokBomenConnector } from '@/lib/connectors/pdok/bomen';
import { pdokNwbConnector } from '@/lib/connectors/pdok/nwb';
import { pdokNatura2000Connector } from '@/lib/connectors/pdok/natura2000';
import { broCptConnector } from '@/lib/connectors/bro/cpt';
import { broGrondwaterConnector } from '@/lib/connectors/bro/grondwater';
import { broVervuildeGrondConnector } from '@/lib/connectors/bro/vervuilde-grond';
import type { BboxQuery, ConnectorMode } from '@/lib/connectors/types';
import { getBelemmeringenForBbox } from '@/lib/services/belemmeringen';
import { watergangenFromBgt } from '@/lib/services/layer-derivation';
import type { FetchableMapLayerId } from '@/lib/map/fetchable-layers';
import { clampBboxNl } from '@/lib/map/viewport-bbox';
import {
  ensureRdLine,
  ensureRdPosition,
  ensureRdPositionFromPdok,
  ensureRdRing,
  geometryPreserveMixedCrs,
} from '@/lib/services/normalize-layer-slice';

export type { FetchableMapLayerId } from '@/lib/map/fetchable-layers';
export type { MapLayerFetchResult } from '@/lib/services/fetch-map-layer-types';
import type { MapLayerFetchResult } from '@/lib/services/fetch-map-layer-types';

function normalizePartial(partial: Partial<MapLayerData>): Partial<MapLayerData> {
  return {
    coordinateSystem: 'EPSG:28992',
    bgt: partial.bgt?.map((f) => ({
      ...f,
      geometry: geometryPreserveMixedCrs(f.geometry),
    })),
    bomen: partial.bomen?.map((b) => {
      const [x, y] = ensureRdPosition(b.x, b.y);
      return { ...b, x, y };
    }),
    percelen: partial.percelen?.map((p) => ({
      ...p,
      polygon: p.polygon.map(([x, y]) => ensureRdPositionFromPdok(x, y)),
    })),
    nwb: partial.nwb?.map((w) => ({
      ...w,
      coordinates: ensureRdLine(w.coordinates),
    })),
    watergangen: partial.watergangen?.map((w) => ({
      ...w,
      coordinates: ensureRdLine(w.coordinates),
    })),
    belemmeringen: partial.belemmeringen?.map((b) => ({
      ...b,
      coordinates: ensureRdLine(b.coordinates),
    })),
    natura2000: partial.natura2000?.map((g) => ({
      ...g,
      polygon: ensureRdRing(g.polygon),
    })),
    sonderingen: partial.sonderingen?.map((s) => {
      const [x, y] = ensureRdPosition(s.x, s.y);
      return { ...s, x, y };
    }),
    grondwater: partial.grondwater?.map((g) => {
      const [x, y] = ensureRdPosition(g.x, g.y);
      return { ...g, x, y };
    }),
    vervuildeGrond: partial.vervuildeGrond?.map((l) => ({
      ...l,
      polygon: l.polygon ? ensureRdRing(l.polygon) : undefined,
      x: l.x !== undefined && l.y !== undefined ? ensureRdPosition(l.x, l.y)[0] : l.x,
      y: l.x !== undefined && l.y !== undefined ? ensureRdPosition(l.x, l.y)[1] : l.y,
    })),
  };
}

export async function fetchMapLayer(
  layerId: FetchableMapLayerId,
  bbox: BboxQuery,
  traceId?: string
): Promise<MapLayerFetchResult> {
  const query = clampBboxNl(bbox);

  switch (layerId) {
    case 'bgt': {
      const bgt = await pdokBgtConnector.fetch(query);
      return {
        layerId,
        source: bgt._source,
        sources: { 'pdok-bgt': bgt._source },
        partial: normalizePartial({ bgt: bgt.features }),
      };
    }
    case 'bomen': {
      const bomen = await pdokBomenConnector.fetch(query);
      return {
        layerId,
        source: bomen._source,
        sources: { 'pdok-bomen': bomen._source },
        partial: normalizePartial({ bomen: bomen.bomen }),
      };
    }
    case 'percelen': {
      const brk = await pdokBrkKaartConnector.fetch(query);
      return {
        layerId,
        source: brk._source,
        sources: { 'pdok-brk-kaart': brk._source },
        partial: normalizePartial({
          percelen: brk.percelen.map((p) => ({
            id: p.id,
            perceelnummer: p.perceelnummer,
            polygon: p.polygon,
          })),
        }),
      };
    }
    case 'nwb': {
      const nwb = await pdokNwbConnector.fetch(query);
      return {
        layerId,
        source: nwb._source,
        sources: { 'pdok-nwb': nwb._source },
        partial: normalizePartial({
          nwb: nwb.wegvakken.map((w) => ({
            naam: w.naam,
            type: w.type,
            coordinates: w.coordinates,
          })),
        }),
      };
    }
    case 'watergangen': {
      const bgt = await pdokBgtConnector.fetch(query);
      return {
        layerId,
        source: bgt._source,
        sources: { 'pdok-bgt': bgt._source },
        partial: normalizePartial({
          watergangen: watergangenFromBgt(query, bgt.features, bgt._source),
        }),
      };
    }
    case 'belemmeringen': {
      const [bgt, nwb] = await Promise.all([
        pdokBgtConnector.fetch(query),
        pdokNwbConnector.fetch(query),
      ]);
      const source: ConnectorMode =
        bgt._source === 'live' || nwb._source === 'live' ? 'live' : 'demo';
      return {
        layerId,
        source,
        sources: { 'pdok-bgt': bgt._source, 'pdok-nwb': nwb._source },
        partial: normalizePartial({
          belemmeringen: getBelemmeringenForBbox(
            query,
            bgt.features,
            nwb.wegvakken,
            source
          ),
        }),
      };
    }
    case 'natura2000': {
      const nat = await pdokNatura2000Connector.fetch(query);
      return {
        layerId,
        source: nat._source,
        sources: { 'pdok-natura2000': nat._source },
        partial: normalizePartial({
          natura2000: nat.gebieden.map((g) => ({
            id: g.id,
            naam: g.naam,
            polygon: g.polygon,
          })),
        }),
      };
    }
    case 'sonderingen': {
      const bro = await broCptConnector.fetch(query);
      return {
        layerId,
        source: bro._source,
        sources: { 'bro-cpt': bro._source },
        partial: normalizePartial({
          sonderingen: bro.sonderingen.map((s) => ({
            id: s.id,
            x: s.x,
            y: s.y,
            qc: s.qc,
            grondsoort: s.grondsoort,
          })),
        }),
      };
    }
    case 'grondwater': {
      let gw;
      if (traceId) {
        const trace = await getTrace(traceId);
        if (trace) {
          gw = await broGrondwaterConnector.fetch({
            traceId,
            coordinates: trace.coordinates,
            bbox: query,
          });
        }
      }
      gw ??= await broGrondwaterConnector.fetch(query);
      return {
        layerId,
        source: gw._source,
        sources: { 'bro-grondwater': gw._source },
        partial: normalizePartial({
          grondwater: gw.punten.map((g) => ({
            id: g.id,
            x: g.x,
            y: g.y,
            standNap: g.standNap,
          })),
        }),
      };
    }
    case 'vervuilde-grond': {
      const vg = await broVervuildeGrondConnector.fetch(query);
      return {
        layerId,
        source: vg._source,
        sources: { 'bro-vervuilde-grond': vg._source },
        partial: normalizePartial({
          vervuildeGrond: vg.locaties.map((l) => ({
            id: l.id,
            bron: l.bron,
            naam: l.naam,
            status: l.status,
            polygon: l.polygon,
            x: l.x,
            y: l.y,
            risicoklasse: l.risicoklasse,
            gebiedType: l.gebiedType,
          })),
        }),
      };
    }
    default: {
      const _exhaustive: never = layerId;
      throw new Error(`Onbekende laag: ${_exhaustive}`);
    }
  }
}
