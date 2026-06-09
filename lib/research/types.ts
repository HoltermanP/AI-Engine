export type OnderzoekType =
  | 'archeologie'
  | 'bodem_nen5725'
  | 'nge_ce'
  | 'ecologie_wnb'
  | 'natura2000'
  | 'kl_inventarisatie';

export type OnderzoekStatus = 'open' | 'in_uitvoering' | 'afgerond';

export type AanvraagType =
  | 'sondeeronderzoek'
  | 'milieukundig_bodem'
  | 'archeologisch_veld'
  | 'ecologisch_onderzoek'
  | 'omgevingsvergunning'
  | 'watervergunning'
  | 'instemmingsbesluit'
  | 'kruisingsovereenkomst'
  | 'verkeersbesluit'
  | 'klic_graafmelding';

export interface OnderzoekDocument {
  type: OnderzoekType;
  titel: string;
  status: OnderzoekStatus;
  inhoud: string;
  _source: 'live' | 'demo';
}

export interface AanvraagDocument {
  type: AanvraagType;
  titel: string;
  ontvanger: string;
  status: 'concept' | 'verzonden' | 'goedgekeurd';
  inhoud: string;
  _source: 'live' | 'demo';
}

export interface VergunningCheckItem {
  vergunning: string;
  nodig: boolean;
  reden: string;
  status: 'concept' | 'niet_nodig' | 'vereist';
}
