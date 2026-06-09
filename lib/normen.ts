/**
 * Centrale normenconfiguratie.
 *
 * Eén plek voor alle norm-referenties die in berekeningen, tekeningen en
 * rapportages worden gebruikt, zodat normversies beheerbaar zijn en elke
 * norm-gebaseerde output dezelfde vermelding hanteert.
 */

export interface NormReferentie {
  /** Korte sleutel om in code naar te verwijzen. */
  id: string;
  /** Officiële aanduiding incl. versie/jaartal. */
  code: string;
  titel: string;
  /** Toepassingsgebied binnen de app. */
  toepassing: string;
}

export const NORMEN = {
  nen7171_1: {
    id: 'nen7171_1',
    code: 'NEN 7171-1:2009',
    titel: 'Ordening van ondergrondse netten — Criteria',
    toepassing: 'Parallelafstanden, ordening en kruisingen van kabels en leidingen',
  },
  nen7171_2: {
    id: 'nen7171_2',
    code: 'NPR 7171-2:2009',
    titel: 'Ordening van ondergrondse netten — Procesbeschrijving',
    toepassing: 'Proces tracé-ontwerp en afstemming',
  },
  nen3650: {
    id: 'nen3650',
    code: 'NEN 3650-1:2020',
    titel: 'Eisen voor buisleidingsystemen — Algemeen',
    toepassing: 'Sterkte- en boorberekeningen buisleidingen (HDD/persing)',
  },
  nen3651: {
    id: 'nen3651',
    code: 'NEN 3651:2020',
    titel: 'Aanvullende eisen voor buisleidingen in of nabij belangrijke waterstaatswerken',
    toepassing: 'Kruisingen met waterstaatswerken, dekking- en veiligheidseisen',
  },
  iec60287: {
    id: 'iec60287',
    code: 'IEC 60287-1-1:2023 / IEC 60287-2-1:2023',
    titel: 'Electric cables — Calculation of the current rating',
    toepassing: 'Thermische berekening / ampacity van energiekabels',
  },
  crow500: {
    id: 'crow500',
    code: 'CROW 500 (versie 2017, actualisatie 2021)',
    titel: 'Schade voorkomen aan kabels en leidingen',
    toepassing: 'Zorgvuldig graafproces, proefsleuven, lokaliseren',
  },
  wibon: {
    id: 'wibon',
    code: 'WIBON (2018)',
    titel: 'Wet informatie-uitwisseling bovengrondse en ondergrondse netten',
    toepassing: 'KLIC-meldingen en gebiedsinformatie',
  },
  nlcs: {
    id: 'nlcs',
    code: 'NLCS 5.0',
    titel: 'Nederlandse CAD Standaard',
    toepassing: 'Laagindeling, lijntypen en symbolen op tekeningen (DXF/PDF)',
  },
  bgt: {
    id: 'bgt',
    code: 'BGT / IMGeo 2.2',
    titel: 'Basisregistratie Grootschalige Topografie',
    toepassing: 'Topografische ondergrond en kostenraster tracé-routing',
  },
  bro: {
    id: 'bro',
    code: 'BRO (Wet Bro, 2018)',
    titel: 'Basisregistratie Ondergrond',
    toepassing: 'Sonderingen, grondopbouw (GeoTOP), grondwaterstanden',
  },
  astmF1962: {
    id: 'astmF1962',
    code: 'ASTM F1962-22',
    titel: 'Guide for Use of Maxi-HDD for Placement of PE Pipe',
    toepassing: 'Trekkrachtberekening HDD (aanvullend op NEN 3650)',
  },
  nen1010: {
    id: 'nen1010',
    code: 'NEN 1010:2020',
    titel: 'Elektrische installaties voor laagspanning',
    toepassing: 'LS-aansluitingen en beveiligingscontroles',
  },
  beiViag: {
    id: 'beiViag',
    code: 'BEI BLS 2024 / VIAG 2024',
    titel: 'Bedrijfsvoering van elektrische installaties / Veiligheidsinstructie aardgas',
    toepassing: 'Signalering veiligheidsregime bij MS/gas-werkzaamheden (geen vervanging van werkinstructies)',
  },
  omgevingswet: {
    id: 'omgevingswet',
    code: 'Omgevingswet (2024)',
    titel: 'Omgevingswet — vergunningprocedures',
    toepassing: 'Vergunningchecks en wettelijke beslistermijnen (regulier 8 wkn, uitgebreid 26 wkn)',
  },
  handboekBomen: {
    id: 'handboekBomen',
    code: 'Handboek Bomen 2022 (Norminstituut Bomen)',
    titel: 'Kwaliteitseisen werken rond bomen',
    toepassing: 'Boombeschermingszones (kroonprojectie + marge) in tracé-routing',
  },
} as const satisfies Record<string, NormReferentie>;

export type NormId = keyof typeof NORMEN;

/** Genormaliseerde vermelding voor rapporten/tekeningen, bijv. "NEN 3650-1:2020". */
export function normVermelding(id: NormId): string {
  return NORMEN[id].code;
}

/** Volledige referentieregel voor literatuurlijsten in rapporten. */
export function normReferentieRegel(id: NormId): string {
  const n = NORMEN[id];
  return `${n.code} — ${n.titel}`;
}
