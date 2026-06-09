import { getTrace } from '@/lib/db/store';
import { persistCollectedTraceData } from '@/lib/db/persist-collected';
import { traceBbox } from '@/lib/geo';
import { pdokAhnConnector } from '@/lib/connectors/pdok/ahn';
import { pdokBrkKaartConnector } from '@/lib/connectors/pdok/brk-kaart';
import { pdokBgtConnector } from '@/lib/connectors/pdok/bgt';
import { pdokNwbConnector } from '@/lib/connectors/pdok/nwb';
import { pdokNatura2000Connector } from '@/lib/connectors/pdok/natura2000';
import { broCptConnector } from '@/lib/connectors/bro/cpt';
import { broGrondwaterConnector } from '@/lib/connectors/bro/grondwater';
import { broVervuildeGrondConnector } from '@/lib/connectors/bro/vervuilde-grond';
import { klicConnector } from '@/lib/connectors/klic';
import { brkEigenaarConnector } from '@/lib/connectors/brk/eigenaar';
import { getBelemmeringenForBbox } from '@/lib/services/belemmeringen';
import type { BgtFeature } from '@/lib/connectors/pdok/bgt';
import type { ConnectorMode } from '@/lib/connectors/types';
import { normalizeCollectedTraceData } from '@/lib/services/normalize-collected';
import { watergangenFromBgt } from '@/lib/services/layer-derivation';
import { analyseerBodemRisico } from '@/lib/services/bodem-risico';
import type {
  BodemRisicoGebied,
  BodemRisicoSamenvatting,
  BodemTraceKruising,
} from '@/lib/services/bodem-risico';

export const COLLECTED_DATA_VERSION = 15;

export interface CollectedTraceData {
  dataVersion?: number;
  coordinateSystem?: 'EPSG:4326' | 'EPSG:28992';
  traceId: string;
  collectedAt: string;
  sources: Record<string, ConnectorMode>;
  maaiveld: { chainage: number; x: number; y: number; hoogteNap: number }[];
  bestaandNet: {
    id: string;
    thema: string;
    beheerder: string;
    spanningOfDiameter?: string;
    materiaal?: string;
    nauwkeurigheid: string;
    diepte?: number;
    vrijTeHoudenAfstand: number;
    coordinates: [number, number, number?][];
    _source: ConnectorMode;
  }[];
  sonderingen: {
    id: string;
    x: number;
    y: number;
    qc: number;
    grondsoort: string;
    _source: ConnectorMode;
  }[];
  grondwater: {
    id: string;
    x: number;
    y: number;
    standNap: number;
    _source: ConnectorMode;
  }[];
  percelen: {
    id: string;
    perceelnummer: string;
    polygon: [number, number][];
    _source: ConnectorMode;
  }[];
  belemmeringen: {
    id: string;
    categorie: string;
    beheerder: string;
    eisDekking?: number;
    coordinates: [number, number][];
    _source: ConnectorMode;
  }[];
  eigenaars: {
    perceelnummer: string;
    eigenaarType: string;
    _source: ConnectorMode;
  }[];
  bgt: BgtFeature[];
  nwb: {
    naam: string;
    type: string;
    coordinates: [number, number][];
    _source: ConnectorMode;
  }[];
  watergangen: {
    naam: string;
    type: string;
    coordinates: [number, number][];
    _source: ConnectorMode;
  }[];
  kunstwerken: {
    naam: string;
    type: string;
    x: number;
    y: number;
    _source: ConnectorMode;
  }[];
  natura2000: {
    id: string;
    naam: string;
    polygon: [number, number][];
    _source: ConnectorMode;
  }[];
  vervuildeGrond: {
    id: string;
    bron: string;
    naam: string;
    status: string;
    polygon?: [number, number][];
    x?: number;
    y?: number;
    risicoklasse?: string;
    gebiedType?: string;
    afstandTraceM?: number;
    _source: ConnectorMode;
  }[];
  bodemRisicoGebieden?: BodemRisicoGebied[];
  bodemRisicoSamenvatting?: BodemRisicoSamenvatting;
  bodemTraceKruisingen?: BodemTraceKruising[];
}

export async function collectTraceData(traceId: string): Promise<CollectedTraceData> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error(`Tracé ${traceId} niet gevonden`);

  const bbox = traceBbox(trace.coordinates, 200, trace.traceLines);
  const traceQuery = {
    traceId,
    coordinates: trace.coordinates,
    bbox,
  };

  const [
    ahn,
    brkKaart,
    bgt,
    nwb,
    natura2000,
    broCpt,
    broGw,
    broVervuild,
    klic,
    brkEigenaar,
  ] = await Promise.all([
    pdokAhnConnector.fetch(traceQuery),
    pdokBrkKaartConnector.fetch(bbox),
    pdokBgtConnector.fetch(bbox),
    pdokNwbConnector.fetch(bbox),
    pdokNatura2000Connector.fetch(bbox),
    broCptConnector.fetch(bbox),
    broGrondwaterConnector.fetch(traceQuery),
    broVervuildeGrondConnector.fetch(bbox),
    klicConnector.fetch(traceQuery),
    brkEigenaarConnector.fetch(bbox),
  ]);

  const sources: Record<string, ConnectorMode> = {
    'pdok-ahn': ahn._source,
    'pdok-brk-kaart': brkKaart._source,
    'pdok-bgt': bgt._source,
    'pdok-nwb': nwb._source,
    'pdok-natura2000': natura2000._source,
    'bro-cpt': broCpt._source,
    'bro-grondwater': broGw._source,
    'bro-vervuilde-grond': broVervuild._source,
    klic: klic._source,
    'brk-eigenaar': brkEigenaar._source,
  };

  const belemmeringen = getBelemmeringenForBbox(bbox, bgt.features, nwb.wegvakken, bgt._source);

  const result: CollectedTraceData = {
    traceId,
    collectedAt: new Date().toISOString(),
    sources,
    maaiveld: ahn.profile,
    bestaandNet: klic.netten.map((n) => ({ ...n, _source: klic._source })),
    sonderingen: broCpt.sonderingen.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      qc: s.qc,
      grondsoort: s.grondsoort,
      _source: broCpt._source,
    })),
    grondwater: broGw.punten.map((g) => ({
      id: g.id,
      x: g.x,
      y: g.y,
      standNap: g.standNap,
      _source: broGw._source,
    })),
    percelen: brkKaart.percelen.map((p) => ({
      id: p.id,
      perceelnummer: p.perceelnummer,
      polygon: p.polygon,
      _source: brkKaart._source,
    })),
    belemmeringen,
    eigenaars: brkEigenaar.percelen.map((e) => ({
      perceelnummer: e.perceelnummer,
      eigenaarType: e.eigenaarType,
      _source: brkEigenaar._source,
    })),
    bgt: bgt.features,
    nwb: nwb.wegvakken.map((w) => ({ ...w, _source: nwb._source })),
    watergangen: watergangenFromBgt(bbox, bgt.features, bgt._source),
    kunstwerken: [],
    natura2000: natura2000.gebieden.map((g) => ({
      id: g.id,
      naam: g.naam,
      polygon: g.polygon,
      _source: natura2000._source,
    })),
    vervuildeGrond: [],
    bodemRisicoGebieden: [],
    bodemRisicoSamenvatting: undefined,
  };

  const bodemAnalyse = analyseerBodemRisico(
    broVervuild.locaties,
    trace.coordinates,
    trace.traceLines
  );
  result.vervuildeGrond = bodemAnalyse.locaties.map((l) => ({
    id: l.id,
    bron: l.bron,
    naam: l.naam,
    status: l.status,
    polygon: l.polygon,
    x: l.x,
    y: l.y,
    risicoklasse: l.risicoklasse,
    gebiedType: l.gebiedType,
    afstandTraceM: l.afstandTraceM,
    _source: broVervuild._source,
  }));
  result.bodemRisicoGebieden = bodemAnalyse.gebieden;
  result.bodemRisicoSamenvatting = bodemAnalyse.samenvatting;
  result.bodemTraceKruisingen = bodemAnalyse.traceKruisingen;

  const normalized = normalizeCollectedTraceData(result);

  void persistCollectedTraceData(traceId, normalized).catch((err) => {
    console.error('[collectTraceData] persist mislukt:', err);
  });
  return normalized;
}
