import type { DemoTrace } from '@/demo/traces';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import { bepaalBoringen, type Boring } from './boringen';

/**
 * Verzamelt alle knelpunten van een tracé in één geordende lijst voor weergave
 * op de tekening: boringen, overige kruisingen, gemotiveerde afwijkingen van de
 * richtlijnen en gedetecteerde conflicten (KLIC/dekking/verboden zone/bodem).
 */

export type KnelpuntCategorie = 'boring' | 'kruising' | 'afwijking' | 'conflict';
export type KnelpuntErnst = 'blokkerend' | 'waarschuwing' | 'info';

export interface Knelpunt {
  /** Labelnummer op de tekening (B1, K1, A1, C1) */
  id: string;
  categorie: KnelpuntCategorie;
  ernst: KnelpuntErnst;
  titel: string;
  /** Opmerkingen/regels die op de tekening komen (afweging, toelichting, maatregel) */
  regels: string[];
  norm?: string;
  beheerder?: string;
  vergunning?: string;
  x?: number;
  y?: number;
  segmentVolgorde?: number;
  /** Alleen voor categorie 'boring' */
  boring?: Boring;
}

const ERNST_ORDER: Record<KnelpuntErnst, number> = {
  blokkerend: 0,
  waarschuwing: 1,
  info: 2,
};

function boringNaarKnelpunt(b: Boring): Knelpunt {
  const regels: string[] = [
    `${b.methodeLabel} · lengte ${b.lengteM} m · Ø${b.diameterMm} mm · diepte ${b.diepteNap.toFixed(2)} m NAP`,
    `Obstakel ${b.naam} ≈${b.obstakelBreedteM} m + werkput-uitloop ${b.uitloopM} m p/zijde`,
    ...(b.afweging ?? []),
  ];
  if (b.beheerder || b.vergunning) {
    regels.push([b.beheerder, b.vergunning].filter(Boolean).join(' · '));
  }
  return {
    id: b.id,
    categorie: 'boring',
    ernst: 'info',
    titel: `${b.naam} — ${b.methodeLabel}`,
    regels,
    norm: b.normReferentie,
    beheerder: b.beheerder,
    vergunning: b.vergunning,
    x: b.x,
    y: b.y,
    segmentVolgorde: b.segmentVolgorde,
    boring: b,
  };
}

const BORING_METHODEN = new Set([
  'gestuurde_boring',
  'persing',
  'nanodrill',
  'avegaarboring',
  'zinker',
]);

function isBoringKruising(methode: string | undefined, legtechniek: string): boolean {
  if (methode && BORING_METHODEN.has(methode)) return true;
  return legtechniek === 'hdd' || legtechniek === 'persing';
}

/** Verzamel alle knelpunten (geordend: blokkerend → waarschuwing → info). */
export function verzamelKnelpunten(
  trace: DemoTrace,
  conflicten: DetectedConflict[] = []
): Knelpunt[] {
  const knelpunten: Knelpunt[] = [];

  // 1. Boringen (sleufloze kruisingen) — eigen B-nummering
  for (const boring of bepaalBoringen(trace)) {
    knelpunten.push(boringNaarKnelpunt(boring));
  }

  // 2. Overige kruisingen (open ontgraving / asfaltzagen / bestrating) — K
  let kNr = 0;
  for (const seg of trace.segmenten) {
    for (const k of seg.kruisingen ?? []) {
      if (isBoringKruising(k.methode, k.legtechniek)) continue;
      kNr++;
      const regels = [...(k.afweging ?? [])];
      if (k.beheerder || k.vergunning) {
        regels.push([k.beheerder, k.vergunning].filter(Boolean).join(' · '));
      }
      knelpunten.push({
        id: `K${kNr}`,
        categorie: 'kruising',
        ernst: 'info',
        titel: `${k.naam} — ${k.methodeLabel ?? k.legtechniek.replace(/_/g, ' ')}`,
        regels,
        norm: k.normReferentie,
        beheerder: k.beheerder,
        vergunning: k.vergunning,
        x: k.x,
        y: k.y,
        segmentVolgorde: seg.volgorde,
      });
    }
  }

  // 3. Afwijkingen van de richtlijnen (uniek) — A
  const afwijkingen = [...new Set(trace.segmenten.flatMap((s) => s.afwijkingen ?? []))];
  afwijkingen.forEach((tekst, i) => {
    knelpunten.push({
      id: `A${i + 1}`,
      categorie: 'afwijking',
      ernst: 'waarschuwing',
      titel: tekst.split('—')[0].trim().slice(0, 60) || `Afwijking ${i + 1}`,
      regels: [tekst],
    });
  });

  // 4. Gedetecteerde conflicten (KLIC/dekking/verboden zone/bodem) — C
  conflicten.forEach((c, i) => {
    const regels = [c.toelichting];
    if (c.waardeGemeten !== undefined && c.waardeEis !== undefined) {
      regels.push(`Gemeten ${c.waardeGemeten} m · eis ${c.waardeEis} m`);
    }
    knelpunten.push({
      id: `C${i + 1}`,
      categorie: 'conflict',
      ernst: c.ernst as KnelpuntErnst,
      titel: c.titel,
      regels,
      norm: c.norm,
      x: c.x,
      y: c.y,
    });
  });

  return knelpunten;
}

/** Knelpunten gesorteerd op ernst (blokkerend eerst) — voor de staat/lijst. */
export function knelpuntenOpErnst(knelpunten: Knelpunt[]): Knelpunt[] {
  return [...knelpunten].sort((a, b) => ERNST_ORDER[a.ernst] - ERNST_ORDER[b.ernst]);
}

/** Telt knelpunten per ernst — voor samenvattingen op de tekening. */
export function knelpuntenTelling(knelpunten: Knelpunt[]): {
  blokkerend: number;
  waarschuwing: number;
  info: number;
  boringen: number;
} {
  return {
    blokkerend: knelpunten.filter((k) => k.ernst === 'blokkerend').length,
    waarschuwing: knelpunten.filter((k) => k.ernst === 'waarschuwing').length,
    info: knelpunten.filter((k) => k.ernst === 'info').length,
    boringen: knelpunten.filter((k) => k.categorie === 'boring').length,
  };
}
