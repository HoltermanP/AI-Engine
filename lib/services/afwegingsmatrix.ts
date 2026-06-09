/**
 * Tracé-afwegingsmatrix (multicriteria-analyse).
 *
 * Vergelijkt route-alternatieven op de criteria die in de NL infra-praktijk
 * gangbaar zijn voor een tracéstudie/afwegingsnotitie: lengte, boringen,
 * kruisingen, bodemrisico, vergunningen, kosten-indicatie en omgevingshinder.
 * Scores per criterium 1–5 (5 = gunstig), gewogen totaal + onderbouwd advies.
 */

import type { TraceRouteAlternative } from '@/lib/services/trace-routing/types';

export interface AfwegingsCriterium {
  id: CriteriumId;
  label: string;
  /** Gewicht in de gewogen som (som van alle gewichten = 100). */
  gewicht: number;
  toelichting: string;
}

export type CriteriumId =
  | 'lengte'
  | 'boringen'
  | 'kruisingen'
  | 'bodemrisico'
  | 'vergunningen'
  | 'kosten'
  | 'omgevingshinder';

export const AFWEGINGS_CRITERIA: AfwegingsCriterium[] = [
  { id: 'lengte', label: 'Tracélengte', gewicht: 15, toelichting: 'Kortere tracés zijn goedkoper en sneller realiseerbaar' },
  { id: 'boringen', label: 'Boringen / sleufloze passages', gewicht: 20, toelichting: 'Elke boring betekent extra engineering, kosten en risico' },
  { id: 'kruisingen', label: 'Kruisingen met infra', gewicht: 15, toelichting: 'Kruisingen met wegen, water en kabels/leidingen (NEN 7171-1)' },
  { id: 'bodemrisico', label: 'Bodemrisico', gewicht: 10, toelichting: 'Verontreiniging, archeologie, NGE en slappe lagen' },
  { id: 'vergunningen', label: 'Vergunningen & gedoogplichten', gewicht: 15, toelichting: 'Privaat terrein, waterstaatswerken, beschermde gebieden' },
  { id: 'kosten', label: 'Kosten-indicatie', gewicht: 15, toelichting: 'Richtprijs op basis van lengte en legtechnieken' },
  { id: 'omgevingshinder', label: 'Omgevingshinder', gewicht: 10, toelichting: 'Open ontgraving in verharding en nabij bebouwing' },
];

export interface CriteriumScore {
  criterium: CriteriumId;
  /** Ruwe meetwaarde (bijv. meters, aantallen, euro's). */
  waarde: number;
  waardeLabel: string;
  /** Score 1–5 (5 = meest gunstig). */
  score: number;
  motivatie: string;
}

export interface AlternatiefAfweging {
  alternatiefId: string;
  label: string;
  scores: CriteriumScore[];
  /** Gewogen totaalscore 0–100. */
  totaal: number;
}

export interface Afwegingsmatrix {
  criteria: AfwegingsCriterium[];
  alternatieven: AlternatiefAfweging[];
  /** alternatiefId van het advies. */
  advies: string;
  adviesMotivatie: string;
}

/** Richtprijzen (EUR/m) per legtechniek voor de kosten-indicatie (VO-niveau, ±30%). */
const RICHTPRIJS_PER_M: Record<string, number> = {
  open_ontgraving: 85,
  hdd: 320,
  persing: 450,
  sleufloos: 180,
};

interface AlternatiefKenmerken {
  lengteM: number;
  aantalBoringen: number;
  boringLengteM: number;
  aantalKruisingen: number;
  bodemrisicoSignalen: number;
  vergunningSignalen: number;
  kostenIndicatie: number;
  hinderM: number;
}

function kenmerken(alt: TraceRouteAlternative): AlternatiefKenmerken {
  const boorSegmenten = alt.segmenten.filter((s) => s.legtechniek !== 'open_ontgraving');
  const kruisingen = alt.segmenten.flatMap((s) => s.kruisingen);
  const tekst = [
    ...alt.waarschuwingen,
    ...alt.blokkades,
    ...alt.segmenten.flatMap((s) => s.opmerkingen),
  ]
    .join(' ')
    .toLowerCase();

  const bodemrisicoSignalen =
    (tekst.match(/verontreinig|bodem|archeolog|nge|explosiev|veen|slappe/g) ?? []).length;
  const vergunningSignalen =
    alt.segmenten.filter((s) => s.zakelijkRechtVereist).length +
    (tekst.match(/natura ?2000|waterschap|keur|vergunning|gedoog|spoor|rijksweg/g) ?? []).length;

  const kostenIndicatie = alt.segmenten.reduce(
    (sum, s) => sum + (RICHTPRIJS_PER_M[s.legtechniek] ?? 100) * s.lengteM,
    0
  );
  const hinderM = alt.segmenten
    .filter((s) => s.legtechniek === 'open_ontgraving' && s.leglocatie !== 'berm')
    .reduce((sum, s) => sum + s.lengteM, 0);

  return {
    lengteM: alt.totaleLengteM,
    aantalBoringen: boorSegmenten.length,
    boringLengteM: boorSegmenten.reduce((sum, s) => sum + s.lengteM, 0),
    aantalKruisingen: kruisingen.length,
    bodemrisicoSignalen,
    vergunningSignalen,
    kostenIndicatie,
    hinderM,
  };
}

/**
 * Relatieve score 1–5: beste waarde krijgt 5, slechtste 1, lineair daartussen.
 * Bij gelijke waarden krijgt iedereen 5 (geen onderscheidend criterium).
 */
function relatieveScore(waarde: number, alle: number[]): number {
  const min = Math.min(...alle);
  const max = Math.max(...alle);
  if (max - min < 1e-9) return 5;
  return Math.round((5 - (4 * (waarde - min)) / (max - min)) * 10) / 10;
}

const EUR = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Bouw de afwegingsmatrix voor 2–5 route-alternatieven. */
export function buildAfwegingsmatrix(alternatieven: TraceRouteAlternative[]): Afwegingsmatrix {
  const kenmerkenPerAlt = alternatieven.map(kenmerken);

  const reeks = (f: (k: AlternatiefKenmerken) => number) => kenmerkenPerAlt.map(f);

  const matrixAlternatieven: AlternatiefAfweging[] = alternatieven.map((alt, i) => {
    const k = kenmerkenPerAlt[i];
    const scores: CriteriumScore[] = [
      {
        criterium: 'lengte',
        waarde: k.lengteM,
        waardeLabel: `${Math.round(k.lengteM)} m`,
        score: relatieveScore(k.lengteM, reeks((x) => x.lengteM)),
        motivatie: `Totale tracélengte ${Math.round(k.lengteM)} m`,
      },
      {
        criterium: 'boringen',
        waarde: k.aantalBoringen,
        waardeLabel: `${k.aantalBoringen}× (${Math.round(k.boringLengteM)} m)`,
        score: relatieveScore(k.boringLengteM, reeks((x) => x.boringLengteM)),
        motivatie:
          k.aantalBoringen === 0
            ? 'Geen sleufloze passages nodig'
            : `${k.aantalBoringen} boring(en)/persing(en), samen ${Math.round(k.boringLengteM)} m`,
      },
      {
        criterium: 'kruisingen',
        waarde: k.aantalKruisingen,
        waardeLabel: `${k.aantalKruisingen}×`,
        score: relatieveScore(k.aantalKruisingen, reeks((x) => x.aantalKruisingen)),
        motivatie: `${k.aantalKruisingen} kruising(en) met wegen, water of infra`,
      },
      {
        criterium: 'bodemrisico',
        waarde: k.bodemrisicoSignalen,
        waardeLabel: `${k.bodemrisicoSignalen} signalen`,
        score: relatieveScore(k.bodemrisicoSignalen, reeks((x) => x.bodemrisicoSignalen)),
        motivatie:
          k.bodemrisicoSignalen === 0
            ? 'Geen bodemrisico-signalen uit de toetsing'
            : `${k.bodemrisicoSignalen} signalering(en) m.b.t. bodem/archeologie/NGE`,
      },
      {
        criterium: 'vergunningen',
        waarde: k.vergunningSignalen,
        waardeLabel: `${k.vergunningSignalen} signalen`,
        score: relatieveScore(k.vergunningSignalen, reeks((x) => x.vergunningSignalen)),
        motivatie:
          k.vergunningSignalen === 0
            ? 'Volledig openbare grond, geen bijzondere vergunningstrajecten gesignaleerd'
            : `${k.vergunningSignalen} signalering(en): privaat terrein/beschermd gebied/keur`,
      },
      {
        criterium: 'kosten',
        waarde: k.kostenIndicatie,
        waardeLabel: EUR.format(k.kostenIndicatie),
        score: relatieveScore(k.kostenIndicatie, reeks((x) => x.kostenIndicatie)),
        motivatie: `Richtprijs ${EUR.format(k.kostenIndicatie)} (VO-niveau, ±30%)`,
      },
      {
        criterium: 'omgevingshinder',
        waarde: k.hinderM,
        waardeLabel: `${Math.round(k.hinderM)} m`,
        score: relatieveScore(k.hinderM, reeks((x) => x.hinderM)),
        motivatie:
          k.hinderM === 0
            ? 'Open ontgraving uitsluitend in berm'
            : `${Math.round(k.hinderM)} m open ontgraving buiten de berm (verharding/rijbaan)`,
      },
    ];

    const totaal =
      scores.reduce((sum, s) => {
        const gewicht = AFWEGINGS_CRITERIA.find((c) => c.id === s.criterium)?.gewicht ?? 0;
        return sum + (s.score / 5) * gewicht;
      }, 0);

    return {
      alternatiefId: alt.id,
      label: alt.label,
      scores,
      totaal: Math.round(totaal * 10) / 10,
    };
  });

  const winnaar = [...matrixAlternatieven].sort((a, b) => b.totaal - a.totaal)[0];
  const winnaarAlt = alternatieven.find((a) => a.id === winnaar.alternatiefId);
  const sterkstePunten = winnaar.scores
    .filter((s) => s.score >= 4)
    .map((s) => AFWEGINGS_CRITERIA.find((c) => c.id === s.criterium)?.label ?? s.criterium)
    .slice(0, 3);

  return {
    criteria: AFWEGINGS_CRITERIA,
    alternatieven: matrixAlternatieven,
    advies: winnaar.alternatiefId,
    adviesMotivatie:
      `${winnaar.label} scoort het hoogst (${winnaar.totaal}/100)` +
      (sterkstePunten.length > 0 ? `, met name op ${sterkstePunten.join(', ').toLowerCase()}` : '') +
      (winnaarAlt && winnaarAlt.blokkades.length > 0
        ? `. Let op: dit alternatief kent ${winnaarAlt.blokkades.length} blokkade(s) die eerst opgelost moeten worden.`
        : '.'),
  };
}
