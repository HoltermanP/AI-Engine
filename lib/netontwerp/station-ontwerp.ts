/**
 * Stationsontwerp-bouwer: stelt per stationsasset het eenlijnschema samen
 * (RMU-velden, trafo, LS-rek met groepen) op basis van de clusterbelasting.
 */

import type {
  Aansluiting,
  NetontwerpAsset,
  NetontwerpUitgangspunten,
  StationLsGroep,
  StationOntwerp,
  StationVeld,
} from './types';
import { belastingKVA, stroomUitKVA } from './belastingen';

/** Standaard NH-zekeringwaarden (gG) voor LS-groepen. */
const NH_ZEKERINGEN_A = [125, 160, 200, 250, 315, 400];

function kiesZekering(stroomA: number): number {
  for (const z of NH_ZEKERINGEN_A) {
    if (stroomA * 1.25 <= z) return z;
  }
  return NH_ZEKERINGEN_A[NH_ZEKERINGEN_A.length - 1];
}

/** Standaard trafomaten (kVA) — kies de kleinste die de belasting bij 80% draagt. */
const TRAFO_MATEN_KVA = [250, 400, 630, 1000];

export function kiesTrafoKVA(belastingKva: number): number {
  for (const maat of TRAFO_MATEN_KVA) {
    if (belastingKva <= maat * 0.8) return maat;
  }
  return TRAFO_MATEN_KVA[TRAFO_MATEN_KVA.length - 1];
}

export function bouwStationOntwerp(opts: {
  station: NetontwerpAsset;
  aansluitingen: Aansluiting[];
  uitgangspunten: NetontwerpUitgangspunten;
  msKabelLabel?: string;
  lsKabelLabel?: string;
  /** Max. belasting per LS-groep (kVA); default 150 (≈ 216 A bij 400 V) */
  maxGroepKVA?: number;
}): StationOntwerp {
  const groei = opts.uitgangspunten.groeifactor;
  const gekoppeldIds = new Set(
    String(opts.station.eigenschappen.aansluitingIds ?? '')
      .split(',')
      .filter(Boolean),
  );
  const cluster = opts.aansluitingen.filter(
    (a) => a.netvlak === 'LS' && (gekoppeldIds.size === 0 || gekoppeldIds.has(a.id)),
  );
  const totaalKva = cluster.reduce((s, a) => s + belastingKVA(a, groei), 0);
  const eigenTrafo = Number(opts.station.eigenschappen.trafoKVA) || 0;
  const trafoKVA = eigenTrafo > 0 ? eigenTrafo : kiesTrafoKVA(totaalKva || 250);

  const msKabel = opts.msKabelLabel ?? `${opts.uitgangspunten.spanningMsKV}kV XLPE 3x1x240 Al`;
  const lsKabel = opts.lsKabelLabel ?? 'XLPE 4x240 Al';

  // Ringvelden in/uit + trafoveld; reserveveld bij N-1
  const velden: StationVeld[] = [
    { type: 'ms_ring_in', kabel: msKabel },
    { type: 'ms_ring_uit', kabel: msKabel },
    { type: 'trafoveld', beveiliging: trafoKVA > 630 ? 'vermogensschakelaar' : 'smeltveiligheid' },
  ];
  if (opts.uitgangspunten.nMin1) velden.push({ type: 'reserve' });

  // LS-groepen: verdeel de clusterbelasting in strengen van max. maxGroepKVA
  const maxGroep = opts.maxGroepKVA ?? 150;
  const aantalGroepen = Math.max(1, Math.min(8, Math.ceil((totaalKva || maxGroep) / maxGroep)));
  const kvaPerGroep = (totaalKva || maxGroep) / aantalGroepen;
  const stroomPerGroep = stroomUitKVA(kvaPerGroep, 'LS');
  const lsGroepen: StationLsGroep[] = Array.from({ length: aantalGroepen }, (_, i) => ({
    naam: `Groep ${i + 1}`,
    zekeringA: kiesZekering(stroomPerGroep),
    kabel: lsKabel,
    belastingKVA: Math.round(kvaPerGroep),
  }));

  return {
    stationAssetId: opts.station.id,
    velden,
    trafo: {
      vermogenKVA: trafoKVA,
      spanning: `${opts.uitgangspunten.spanningMsKV}/0,4 kV`,
    },
    lsGroepen,
  };
}
