/**
 * Belastingmodel: van aansluitingen (investeringsplan) naar ontwerpbelasting.
 * Gelijktijdigheid per afnemertype volgens gangbare netbeheerderspraktijk.
 */

import type { Aansluiting, AansluitingType, Netvlak } from './types';

/** Default gelijktijdigheidsfactor per afnemertype. */
export const GELIJKTIJDIGHEID_DEFAULTS: Record<AansluitingType, number> = {
  woning: 0.4,
  utiliteit: 0.7,
  bedrijf: 0.7,
  laadinfra: 0.9,
  pv_park: 1.0,
};

/** Default kVA per stuk per afnemertype. */
export const KVA_DEFAULTS: Record<AansluitingType, number> = {
  woning: 4,
  utiliteit: 50,
  bedrijf: 80,
  laadinfra: 22,
  pv_park: 1000,
};

export function nieuweAansluitingDefaults(type: AansluitingType): {
  kVAPerStuk: number;
  gelijktijdigheid: number;
} {
  return {
    kVAPerStuk: KVA_DEFAULTS[type],
    gelijktijdigheid: GELIJKTIJDIGHEID_DEFAULTS[type],
  };
}

export function belastingKVA(a: Aansluiting, groeifactor = 1): number {
  return a.aantal * a.kVAPerStuk * a.gelijktijdigheid * groeifactor;
}

export function totaalBelastingKVA(
  aansluitingen: Aansluiting[],
  opts: { netvlak?: Netvlak; groeifactor?: number } = {},
): number {
  const groei = opts.groeifactor ?? 1;
  return aansluitingen
    .filter((a) => !opts.netvlak || a.netvlak === opts.netvlak)
    .reduce((som, a) => som + belastingKVA(a, groei), 0);
}

/** Ontwerpstroom (A) uit schijnbaar vermogen: I = S / (√3 · U). */
export function stroomUitKVA(kVA: number, netvlak: Netvlak, spanningMsKV = 10): number {
  const uV = netvlak === 'LS' ? 400 : spanningMsKV * 1000;
  return (kVA * 1000) / (Math.sqrt(3) * uV);
}

const TYPE_ALIASSEN: Record<string, AansluitingType> = {
  woning: 'woning',
  woningen: 'woning',
  huis: 'woning',
  utiliteit: 'utiliteit',
  school: 'utiliteit',
  bedrijf: 'bedrijf',
  bedrijven: 'bedrijf',
  laadinfra: 'laadinfra',
  laadpaal: 'laadinfra',
  laadpalen: 'laadinfra',
  pv: 'pv_park',
  pv_park: 'pv_park',
  zon: 'pv_park',
};

export interface CsvParseResultaat {
  rijen: Omit<Aansluiting, 'id' | 'x' | 'y' | 'netvlak'>[];
  fouten: string[];
}

/**
 * Bulk-invoer uit Excel/CSV-plak: `naam;type;aantal;kVA[;gelijktijdigheid]`
 * (scheiding mag ; , of tab). kVA en gelijktijdigheid vallen terug op de
 * defaults van het type wanneer ze ontbreken.
 */
export function parseAansluitingenCsv(tekst: string): CsvParseResultaat {
  const rijen: CsvParseResultaat['rijen'] = [];
  const fouten: string[] = [];
  const regels = tekst.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);

  const naarGetal = (v?: string) => Number((v ?? '').replace(',', '.'));

  regels.forEach((regel, i) => {
    // ; of tab heeft voorrang (laat decimale komma's intact); anders komma
    const scheiding = /[;\t]/.test(regel) ? /[;\t]/ : /,/;
    const velden = regel.split(scheiding).map((v) => v.trim());
    if (i === 0 && /naam|type/i.test(velden[0]) && !/^\d/.test(velden[2] ?? '')) return; // kopregel
    const [naam, typeRuw, aantalRuw, kvaRuw, gRuw] = velden;
    const type = TYPE_ALIASSEN[(typeRuw ?? '').toLowerCase()] ?? null;
    const aantal = naarGetal(aantalRuw);
    if (!naam || !type || !Number.isFinite(aantal) || aantal <= 0) {
      fouten.push(`Regel ${i + 1} overgeslagen: "${regel.slice(0, 60)}" (verwacht: naam;type;aantal[;kVA;g])`);
      return;
    }
    const defaults = nieuweAansluitingDefaults(type);
    const kva = naarGetal(kvaRuw);
    const g = naarGetal(gRuw);
    rijen.push({
      naam,
      type,
      aantal: Math.round(aantal),
      kVAPerStuk: Number.isFinite(kva) && kva > 0 ? kva : defaults.kVAPerStuk,
      gelijktijdigheid: Number.isFinite(g) && g > 0 && g <= 1 ? g : defaults.gelijktijdigheid,
    });
  });

  return { rijen, fouten };
}

/**
 * Maximale stranglengte (m) waarbij de spanningsval binnen de grens blijft —
 * omgekeerde van spanningsvalLsV: L = ΔUmax · S / (√3 · I · ρ · cosφ).
 */
export function maxStrengLengteLsM(
  stroomA: number,
  sectieMm2: number,
  maxSpanningsvalPct: number,
  materiaal: 'Al' | 'Cu' = 'Al',
  cosPhi = 0.9,
): number {
  if (stroomA <= 0) return Infinity;
  const rho = materiaal === 'Cu' ? 0.0175 : 0.028;
  const maxDeltaUV = (maxSpanningsvalPct / 100) * 400;
  return (maxDeltaUV * sectieMm2) / (Math.sqrt(3) * stroomA * rho * cosPhi);
}
