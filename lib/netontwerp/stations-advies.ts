/**
 * Stationsadvies: bepaal uit de belastingclusters hoeveel transformator-
 * stations nodig zijn en waar ze logisch staan (belasting-gewogen zwaartepunt,
 * gesnapt op het MS-tracé wanneer aanwezig).
 */

import type { Aansluiting, NetontwerpUitgangspunten, StationSubtype } from './types';
import { STATION_CAPACITEIT_KVA } from './types';
import { belastingKVA, stroomUitKVA, maxStrengLengteLsM } from './belastingen';
import { snapNaarLijnen } from './chainage';
import type { TraceLines } from '@/lib/trace-edit';

export interface StationSuggestie {
  x: number;
  y: number;
  subtype: StationSubtype;
  belastingKVA: number;
  trafoKVA: number;
  aansluitingIds: string[];
  maxAfstandTotAansluitingM: number;
  waarschuwingen: string[];
}

export interface StationsAdvies {
  suggesties: StationSuggestie[];
  totaalBelastingKVA: number;
  aantalStations: number;
  toelichting: string;
}

/** Belasting-gewogen k-means (deterministisch geïnitialiseerd langs de spreiding). */
function clusterAansluitingen(
  punten: { id: string; x: number; y: number; kva: number }[],
  k: number,
): { cx: number; cy: number; leden: typeof punten }[] {
  if (punten.length === 0 || k <= 0) return [];
  const n = Math.min(k, punten.length);

  // Init: spreid centroids over de bounding-box-diagonaal (deterministisch)
  const xs = punten.map((p) => p.x);
  const ys = punten.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let centroids = Array.from({ length: n }, (_, i) => ({
    cx: minX + ((i + 0.5) / n) * (maxX - minX),
    cy: minY + ((i + 0.5) / n) * (maxY - minY),
  }));

  let leden: (typeof punten)[] = [];
  for (let iter = 0; iter < 25; iter++) {
    leden = centroids.map(() => [] as typeof punten);
    for (const p of punten) {
      let best = 0;
      let bestD = Infinity;
      centroids.forEach((c, i) => {
        const d = Math.hypot(p.x - c.cx, p.y - c.cy);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      leden[best].push(p);
    }
    const volgende = centroids.map((c, i) => {
      const cluster = leden[i];
      const gewicht = cluster.reduce((s, p) => s + p.kva, 0);
      if (gewicht <= 0) return c;
      return {
        cx: cluster.reduce((s, p) => s + p.x * p.kva, 0) / gewicht,
        cy: cluster.reduce((s, p) => s + p.y * p.kva, 0) / gewicht,
      };
    });
    const verschoven = volgende.some(
      (c, i) => Math.hypot(c.cx - centroids[i].cx, c.cy - centroids[i].cy) > 0.5,
    );
    centroids = volgende;
    if (!verschoven) break;
  }

  return centroids
    .map((c, i) => ({ ...c, leden: leden[i] ?? [] }))
    .filter((c) => c.leden.length > 0);
}

export function adviseerStations(opts: {
  aansluitingen: Aansluiting[];
  uitgangspunten: NetontwerpUitgangspunten;
  /** MS-tracélijnen om stations op te snappen (optioneel) */
  msTraceLines?: TraceLines;
  /** Gekozen LS-kabel voor de lengtevalidatie (sectie + materiaal) */
  lsKabel?: { sectieMm2: number; materiaal: 'Al' | 'Cu' };
  subtype?: StationSubtype;
}): StationsAdvies {
  const subtype = opts.subtype ?? 'transformatorstation';
  const trafoKVA = STATION_CAPACITEIT_KVA[subtype] || 630;
  const groei = opts.uitgangspunten.groeifactor;
  const lsAansluitingen = opts.aansluitingen.filter((a) => a.netvlak === 'LS');

  const punten = lsAansluitingen.map((a) => ({
    id: a.id,
    x: a.x,
    y: a.y,
    kva: belastingKVA(a, groei),
  }));
  const totaal = punten.reduce((s, p) => s + p.kva, 0);
  if (totaal <= 0) {
    return {
      suggesties: [],
      totaalBelastingKVA: 0,
      aantalStations: 0,
      toelichting: 'Geen LS-belasting ingevoerd — voer eerst aansluitingen in (stap 1).',
    };
  }

  // Ontwerpbezetting max. 80%; bij N-1 één station extra
  const benodigd = Math.max(1, Math.ceil(totaal / (trafoKVA * 0.8)));
  const aantal = benodigd + (opts.uitgangspunten.nMin1 ? 1 : 0);

  const clusters = clusterAansluitingen(punten, aantal);
  const suggesties: StationSuggestie[] = clusters.map((cluster, i) => {
    const clusterKVA = cluster.leden.reduce((s, p) => s + p.kva, 0);
    let x = cluster.cx;
    let y = cluster.cy;
    if (opts.msTraceLines?.length) {
      const snap = snapNaarLijnen(opts.msTraceLines, x, y, 400);
      if (snap) {
        x = snap.x;
        y = snap.y;
      }
    }
    const maxAfstand = Math.max(
      ...cluster.leden.map((p) => Math.hypot(p.x - x, p.y - y)),
      0,
    );

    const waarschuwingen: string[] = [];
    if (clusterKVA > trafoKVA * 0.8) {
      waarschuwingen.push(
        `Clusterbelasting ${clusterKVA.toFixed(0)} kVA > 80% van trafo ${trafoKVA} kVA — zwaardere trafo of extra station overwegen.`,
      );
    }
    if (opts.lsKabel) {
      const stroom = stroomUitKVA(clusterKVA, 'LS');
      const maxLengte = maxStrengLengteLsM(
        stroom,
        opts.lsKabel.sectieMm2,
        opts.uitgangspunten.maxSpanningsvalLsPct,
        opts.lsKabel.materiaal,
      );
      if (maxAfstand > maxLengte) {
        waarschuwingen.push(
          `Verste aansluiting ${maxAfstand.toFixed(0)} m > max. stranglengte ${maxLengte.toFixed(0)} m (spanningsval ${opts.uitgangspunten.maxSpanningsvalLsPct}%) — extra station of zwaardere kabel nodig.`,
        );
      }
    }

    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      subtype,
      belastingKVA: Math.round(clusterKVA),
      trafoKVA,
      aansluitingIds: cluster.leden.map((p) => p.id),
      maxAfstandTotAansluitingM: Math.round(maxAfstand),
      waarschuwingen,
    };
  });

  return {
    suggesties,
    totaalBelastingKVA: Math.round(totaal),
    aantalStations: suggesties.length,
    toelichting: `Totale LS-ontwerpbelasting ${totaal.toFixed(0)} kVA (incl. groeifactor ${groei}) → ${benodigd}× ${trafoKVA} kVA bij max. 80% bezetting${opts.uitgangspunten.nMin1 ? ' + 1 station (N-1)' : ''}. Posities: belasting-gewogen zwaartepunten${opts.msTraceLines?.length ? ', gesnapt op het MS-tracé' : ''}.`,
  };
}
