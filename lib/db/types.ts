export type Discipline =
  | 'elektra_ls'
  | 'elektra_ms'
  | 'stations'
  | 'gas_hd'
  | 'gas_ld'
  | 'water';

export type TraceFase = 'VO' | 'DO' | 'UO' | 'as_built';

export type Liggingsnauwkeurigheid = 'gemeten' | 'geschat' | 'maatvoering';

export type ConflictErnst = 'blokkerend' | 'waarschuwing' | 'info';

export type ConflictType =
  | 'onvoldoende_afstand'
  | 'onvoldoende_dekking'
  | 'verboden_zone'
  | 'eigendom'
  | 'bodemrisico';

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  elektra_ls: 'Elektra LS',
  elektra_ms: 'Elektra MS',
  stations: 'Stations',
  gas_hd: 'Gas HD',
  gas_ld: 'Gas LD',
  water: 'Water',
};

export const FASE_LABELS: Record<TraceFase, string> = {
  VO: 'Voorlopig Ontwerp',
  DO: 'Definitief Ontwerp',
  UO: 'Uitvoeringsontwerp',
  as_built: 'As-built',
};
