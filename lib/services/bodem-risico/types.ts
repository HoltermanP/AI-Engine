/** Risicoklassen voor bouw-/tracéwerkzaamheden (NEN 5725 quick scan). */
export type BodemRisicoklasse =
  | 'zeer_hoog'
  | 'hoog'
  | 'middel'
  | 'laag'
  | 'beheer'
  | 'geen'
  | 'onbekend';

/** Type bodemgebied / registratie-object. */
export type BodemGebiedType =
  | 'verontreinigd_gebied'
  | 'aangepakt_gebied'
  | 'nazorggebied'
  | 'bodemlocatie'
  | 'overheidsbesluit'
  | 'bodemonderzoek'
  | 'meetpunt'
  | 'verdachte_locatie'
  | 'historisch_hbb'
  | 'sanering'
  | 'spoedlocatie'
  | 'pfas'
  | 'grondwaterverontreiniging'
  | 'bedrijfsactiviteit'
  | 'bodemkwaliteitskaart'
  | 'stortplaats'
  | 'krw_grondwater'
  | 'overig';

export interface BodemRisicoLocatie {
  id: string;
  bron: string;
  naam: string;
  status: string;
  polygon?: [number, number][];
  x?: number;
  y?: number;
  risicoklasse: BodemRisicoklasse;
  gebiedType: BodemGebiedType;
  afstandTraceM?: number;
}

export interface BodemRisicoGebied {
  id: string;
  risicoklasse: BodemRisicoklasse;
  gebiedType: BodemGebiedType;
  label: string;
  telling: number;
  locatieIds: string[];
  polygons: [number, number][][];
  punten: { id: string; x: number; y: number }[];
  minAfstandTraceM?: number;
}

export type BodemTraceRelatie = 'doorschreden' | 'nabij';

export interface BodemTraceKruising {
  locatieId: string;
  naam: string;
  bron: string;
  risicoklasse: BodemRisicoklasse;
  gebiedType: BodemGebiedType;
  relatie: BodemTraceRelatie;
  afstandTraceM: number;
  x: number;
  y: number;
}

export interface BodemRisicoSamenvatting {
  totaalLocaties: number;
  hoogsteRisicoklasse: BodemRisicoklasse;
  perKlasse: Record<BodemRisicoklasse, number>;
  perGebiedType: Partial<Record<BodemGebiedType, number>>;
  aanbeveling: string;
}

export const RISICO_VOLGORDE: BodemRisicoklasse[] = [
  'zeer_hoog',
  'hoog',
  'middel',
  'laag',
  'beheer',
  'geen',
  'onbekend',
];

export const RISICO_LABEL: Record<BodemRisicoklasse, string> = {
  zeer_hoog: 'Zeer hoog',
  hoog: 'Hoog',
  middel: 'Middel',
  laag: 'Laag',
  beheer: 'Beheer (gesaneerd/nazorg)',
  geen: 'Geen risico',
  onbekend: 'Onbekend',
};

export const RISICO_KLEUR: Record<BodemRisicoklasse, string> = {
  zeer_hoog: '#7B241C',
  hoog: '#C0392B',
  middel: '#E67E22',
  laag: '#F39C12',
  beheer: '#27AE60',
  geen: '#95A5A6',
  onbekend: '#BDC3C7',
};

export const GEBIED_TYPE_LABEL: Record<BodemGebiedType, string> = {
  verontreinigd_gebied: 'Verontreinigd gebied',
  aangepakt_gebied: 'Aangepakt gebied',
  nazorggebied: 'Nazorggebied',
  bodemlocatie: 'Bodemlocatie',
  overheidsbesluit: 'Overheidsbesluit',
  bodemonderzoek: 'Bodemonderzoek',
  meetpunt: 'Meetpunt',
  verdachte_locatie: 'Verdachte locatie',
  historisch_hbb: 'Historisch HBB',
  sanering: 'Sanering',
  spoedlocatie: 'Spoedlocatie',
  pfas: 'PFAS',
  grondwaterverontreiniging: 'Grondwaterverontreiniging',
  bedrijfsactiviteit: 'Bedrijfsactiviteit',
  bodemkwaliteitskaart: 'Bodemkwaliteitskaart (BKK)',
  stortplaats: 'Stortplaats',
  krw_grondwater: 'KRW grondwaterverontreiniging',
  overig: 'Overig',
};
