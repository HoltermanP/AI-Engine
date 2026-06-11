/**
 * Netontwerp-domeinmodel: het gebiedsontwerp voor elektranetten (LS/MS)
 * zoals netbeheerders (Liander) en aannemers dat doorlopen — van
 * investeringsplan (belastingen) via tracé, kabelkeuze en stations
 * naar stationsontwerp en werktekening.
 */

export type Netvlak = 'LS' | 'MS';

export type NetontwerpStap =
  | 'belastingen'
  | 'trace'
  | 'kabel'
  | 'stations'
  | 'stationsontwerp'
  | 'werktekening';

export type StationSubtype =
  | 'ms_ruimte'
  | 'transformatorstation'
  | 'compactstation'
  | 'ls_verdeelkast';

export type MofSubtype = 'verbindingsmof' | 'eindmof' | 'aftakmof' | 'overgangsmof';

export type AansluitingType = 'woning' | 'utiliteit' | 'bedrijf' | 'laadinfra' | 'pv_park';

/** Positie van een asset: vrij punt, op een tracélijn (chainage) of bereik. */
export type AssetPositie =
  | { binding: 'punt'; x: number; y: number }
  | { binding: 'chainage'; traceId: string; lijnIndex: number; chainageM: number }
  | { binding: 'chainage_bereik'; traceId: string; lijnIndex: number; vanM: number; totM: number };

export type NetontwerpAssetType = 'station' | 'mof' | 'mantelbuis';

export interface NetontwerpAsset {
  id: string;
  type: NetontwerpAssetType;
  subtype: string;
  naam: string;
  positie: AssetPositie;
  eigenschappen: Record<string, number | string | boolean>;
  /** 'auto' = gesuggereerd (mag herberekend worden), 'handmatig' = door ontwerper geplaatst */
  bron: 'auto' | 'handmatig';
  gekoppeldeTraceIds: string[];
}

export interface Aansluiting {
  id: string;
  naam: string;
  type: AansluitingType;
  aantal: number;
  kVAPerStuk: number;
  /** Gelijktijdigheidsfactor (0–1); default per type via belastingen.ts */
  gelijktijdigheid: number;
  x: number;
  y: number;
  netvlak: Netvlak;
}

export interface KabelKeuze {
  traceId: string;
  kabelId: string;
  bron: 'advies' | 'handmatig';
  adviesMotivatie?: string;
}

export interface NetontwerpUitgangspunten {
  netvlakken: Netvlak[];
  spanningMsKV: 10 | 20;
  /** NEN 1010: max. 5% tot aansluiting; ontwerpwaarde LS-net */
  maxSpanningsvalLsPct: number;
  maxSpanningsvalMsPct: number;
  /** Groeifactor op de belasting (bijv. 1.3 voor elektrificatie) */
  groeifactor: number;
  /** N-1-redundantie voor stations (MS) */
  nMin1: boolean;
}

/** LS-groep in een stationsontwerp (vertrekkende streng). */
export interface StationLsGroep {
  naam: string;
  zekeringA: number;
  kabel: string;
  belastingKVA: number;
}

export type StationVeld =
  | { type: 'ms_ring_in'; kabel: string }
  | { type: 'ms_ring_uit'; kabel: string }
  | { type: 'trafoveld'; beveiliging: 'smeltveiligheid' | 'vermogensschakelaar' }
  | { type: 'reserve' };

export interface StationOntwerp {
  stationAssetId: string;
  velden: StationVeld[];
  trafo: { vermogenKVA: number; spanning: string };
  lsGroepen: StationLsGroep[];
}

export type StapStatus = 'open' | 'bezig' | 'gereed';

export interface Netontwerp {
  id: string;
  projectId: string;
  naam: string;
  uitgangspunten: NetontwerpUitgangspunten;
  aansluitingen: Aansluiting[];
  assets: NetontwerpAsset[];
  kabelKeuzes: KabelKeuze[];
  stationsOntwerpen: StationOntwerp[];
  /** Tracé-id's die bij dit ontwerp horen (per netvlak gescheiden via discipline) */
  traceIds: string[];
  stappenStatus: Record<NetontwerpStap, StapStatus>;
  bijgewerktOp: string;
}

/* ───────────────────────────── Labels & capaciteiten ───────────────────────────── */

export const NETVLAK_LABELS: Record<Netvlak, string> = {
  LS: 'Laagspanning (400 V)',
  MS: 'Middenspanning (10–20 kV)',
};

export const STATION_SUBTYPE_LABELS: Record<StationSubtype, string> = {
  ms_ruimte: 'MS-ruimte (schakelstation)',
  transformatorstation: 'Transformatorstation',
  compactstation: 'Compactstation',
  ls_verdeelkast: 'LS-verdeelkast',
};

export const MOF_SUBTYPE_LABELS: Record<MofSubtype, string> = {
  verbindingsmof: 'Verbindingsmof',
  eindmof: 'Eindmof / eindsluiting',
  aftakmof: 'Aftakmof',
  overgangsmof: 'Overgangsmof (GPLK↔XLPE)',
};

export const AANSLUITING_TYPE_LABELS: Record<AansluitingType, string> = {
  woning: 'Woningen',
  utiliteit: 'Utiliteit',
  bedrijf: 'Bedrijf',
  laadinfra: 'Laadinfrastructuur',
  pv_park: 'PV-park / teruglevering',
};

/** Nominale trafocapaciteit per stationstype (kVA). */
export const STATION_CAPACITEIT_KVA: Record<StationSubtype, number> = {
  ms_ruimte: 0,
  transformatorstation: 630,
  compactstation: 400,
  ls_verdeelkast: 0,
};

export const ASSET_TYPE_LABELS: Record<NetontwerpAssetType, string> = {
  station: 'Station',
  mof: 'Mof',
  mantelbuis: 'Mantelbuis',
};

export function defaultUitgangspunten(): NetontwerpUitgangspunten {
  return {
    netvlakken: ['LS', 'MS'],
    spanningMsKV: 10,
    maxSpanningsvalLsPct: 5,
    maxSpanningsvalMsPct: 5,
    groeifactor: 1.3,
    nMin1: false,
  };
}

export function legeStappenStatus(): Record<NetontwerpStap, StapStatus> {
  return {
    belastingen: 'open',
    trace: 'open',
    kabel: 'open',
    stations: 'open',
    stationsontwerp: 'open',
    werktekening: 'open',
  };
}
