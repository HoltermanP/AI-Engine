export type CalculatieEenheid = 'm' | 'm²' | 'm³' | 'st' | 'uur' | 'wk' | 'post';

export interface CalculatieRegel {
  postnummer: string;
  omschrijving: string;
  hoofdgroep: string;
  eenheid: CalculatieEenheid;
  hoeveelheid: number;
  eenheidsprijs: number;
  totaal: number;
  toelichting?: string;
}

export interface CalculatieHoofdgroep {
  code: string;
  naam: string;
  regels: CalculatieRegel[];
  subtotaal: number;
}

export interface CalculatieSamenvatting {
  subtotaal: number;
  projectleiding: number;
  risicoregeling: number;
  totaalExclBtw: number;
  btw: number;
  totaalInclBtw: number;
}

export interface CalculatieResult {
  traceId: string;
  traceCode: string;
  traceNaam: string;
  projectId: string;
  projectNaam: string;
  projectnummer: string;
  discipline: string;
  lengteM: number;
  gegenereerdOp: string;
  hoofdgroepen: CalculatieHoofdgroep[];
  samenvatting: CalculatieSamenvatting;
  /** Alle regels plat (voor export) */
  regels: CalculatieRegel[];
}

export interface ProjectCalculatieResult {
  projectId: string;
  projectNaam: string;
  projectnummer: string;
  traceCalculaties: CalculatieResult[];
  samenvatting: CalculatieSamenvatting;
  regels: CalculatieRegel[];
  gegenereerdOp: string;
}

/** Ruwe hoeveelheid vóór koppeling aan eenheidsprijs */
export interface AfgeleidePost {
  postnummer: string;
  hoeveelheid: number;
  toelichting?: string;
}
