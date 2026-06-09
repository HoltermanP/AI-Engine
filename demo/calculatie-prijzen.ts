/** Fictieve eenheidsprijzen (2026, excl. BTW) — RAW/BESTEK-achtige posten. */

export type CalculatieEenheid = 'm' | 'm²' | 'm³' | 'st' | 'uur' | 'wk' | 'post';

export interface Eenheidsprijs {
  postnummer: string;
  omschrijving: string;
  eenheid: CalculatieEenheid;
  prijs: number;
  hoofdgroep: string;
}

export const EENHEIDSPRIJZEN: Eenheidsprijs[] = [
  // 01 Voorbereiding
  { postnummer: '01.01.010', omschrijving: 'Proefsleuf / tracé-inventarisatie', eenheid: 'st', prijs: 850, hoofdgroep: '01 Voorbereiding' },
  { postnummer: '01.02.010', omschrijving: 'WIBON/KLIC coördinatie en nazorg', eenheid: 'uur', prijs: 95, hoofdgroep: '01 Voorbereiding' },
  { postnummer: '01.03.010', omschrijving: 'Inrichten werkvak / afzetting', eenheid: 'wk', prijs: 1200, hoofdgroep: '01 Voorbereiding' },

  // 02 Grondwerk open sleuf
  { postnummer: '02.01.010', omschrijving: 'Grond ontgraven sleuf (zand)', eenheid: 'm³', prijs: 18.5, hoofdgroep: '02 Grondwerk' },
  { postnummer: '02.02.010', omschrijving: 'Zandbed aanbrengen', eenheid: 'm³', prijs: 42, hoofdgroep: '02 Grondwerk' },
  { postnummer: '02.03.010', omschrijving: 'Grond verwerken / afvoer', eenheid: 'm³', prijs: 28, hoofdgroep: '02 Grondwerk' },
  { postnummer: '02.04.010', omschrijving: 'Opsluiting sleuf (zand)', eenheid: 'm', prijs: 12.5, hoofdgroep: '02 Grondwerk' },

  // 03 Materialen
  { postnummer: '03.01.010', omschrijving: 'GPLK-kabel LS (4-ader)', eenheid: 'm', prijs: 28, hoofdgroep: '03 Materialen' },
  { postnummer: '03.01.020', omschrijving: 'XLPE-kabel MS (20 kV)', eenheid: 'm', prijs: 85, hoofdgroep: '03 Materialen' },
  { postnummer: '03.02.010', omschrijving: 'PE-buis LD-gas DN110 SDR11', eenheid: 'm', prijs: 22, hoofdgroep: '03 Materialen' },
  { postnummer: '03.02.020', omschrijving: 'Stalen buis HD-gas', eenheid: 'm', prijs: 145, hoofdgroep: '03 Materialen' },
  { postnummer: '03.03.010', omschrijving: 'Drinkwaterleiding PE/GI', eenheid: 'm', prijs: 68, hoofdgroep: '03 Materialen' },
  { postnummer: '03.04.010', omschrijving: 'Mantelbuis PE (HDD/persing)', eenheid: 'm', prijs: 35, hoofdgroep: '03 Materialen' },
  { postnummer: '03.05.010', omschrijving: 'Waarschuwingslint / detectielint', eenheid: 'm', prijs: 1.2, hoofdgroep: '03 Materialen' },
  { postnummer: '03.06.010', omschrijving: 'Kabelmof / lasmof', eenheid: 'st', prijs: 320, hoofdgroep: '03 Materialen' },

  // 04 Legwerk open ontgraving
  { postnummer: '04.01.010', omschrijving: 'Kabel/leiding leggen in sleuf', eenheid: 'm', prijs: 15, hoofdgroep: '04 Legwerk open' },
  { postnummer: '04.02.010', omschrijving: 'Dekking aanbrengen conform NEN 7171', eenheid: 'm', prijs: 8.5, hoofdgroep: '04 Legwerk open' },

  // 05 Sleufloze techniek
  { postnummer: '05.01.010', omschrijving: 'HDD gestuurd boren incl. pilot', eenheid: 'm', prijs: 285, hoofdgroep: '05 Sleufloos' },
  { postnummer: '05.01.020', omschrijving: 'HDD start-/eindput ontgraven', eenheid: 'st', prijs: 4500, hoofdgroep: '05 Sleufloos' },
  { postnummer: '05.01.030', omschrijving: 'Boormedium bentoniet', eenheid: 'm³', prijs: 95, hoofdgroep: '05 Sleufloos' },
  { postnummer: '05.02.010', omschrijving: 'Persing microtunnel', eenheid: 'm', prijs: 420, hoofdgroep: '05 Sleufloos' },
  { postnummer: '05.02.020', omschrijving: 'Persing put (start/eind)', eenheid: 'st', prijs: 6200, hoofdgroep: '05 Sleufloos' },
  { postnummer: '05.03.010', omschrijving: 'Sleufloze kabeltrekking (asfaltzagen)', eenheid: 'm', prijs: 95, hoofdgroep: '05 Sleufloos' },

  // 06 Herstelwerk
  { postnummer: '06.01.010', omschrijving: 'Asfaltverharding herstellen', eenheid: 'm²', prijs: 48, hoofdgroep: '06 Herstelwerk' },
  { postnummer: '06.02.010', omschrijving: 'Bestrating/trottoir herstellen', eenheid: 'm²', prijs: 62, hoofdgroep: '06 Herstelwerk' },
  { postnummer: '06.03.010', omschrijving: 'Bermherstel / inzaaien', eenheid: 'm', prijs: 18, hoofdgroep: '06 Herstelwerk' },

  // 07 Aansluitingen
  { postnummer: '07.01.010', omschrijving: 'Eindmof / kabelkast plaatsen', eenheid: 'st', prijs: 1850, hoofdgroep: '07 Aansluitingen' },
  { postnummer: '07.02.010', omschrijving: 'Aansluiting netbeheerder (indicatief)', eenheid: 'st', prijs: 2400, hoofdgroep: '07 Aansluitingen' },

  // 08 Projectkosten
  { postnummer: '08.01.010', omschrijving: 'Projectleiding / werkvoorbereiding', eenheid: 'post', prijs: 1, hoofdgroep: '08 Projectkosten' },
  { postnummer: '08.02.010', omschrijving: 'Risicoregeling / onvoorzien', eenheid: 'post', prijs: 1, hoofdgroep: '08 Projectkosten' },
];

export function prijsVoorPost(postnummer: string): Eenheidsprijs | undefined {
  return EENHEIDSPRIJZEN.find((p) => p.postnummer === postnummer);
}

export const BTW_PERCENTAGE = 21;
export const PROJECTLEIDING_PERCENTAGE = 8;
export const RISICO_PERCENTAGE = 5;
