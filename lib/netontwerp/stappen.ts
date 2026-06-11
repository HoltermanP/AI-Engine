/**
 * Ontwerpstappen van het netontwerp — gemodelleerd naar het proces zoals
 * Liander en aannemers het doorlopen: investeringsplan → gebiedsontwerp →
 * engineering → werkvoorbereiding.
 */

import type { Netontwerp, NetontwerpStap, StapStatus } from './types';

export interface NetontwerpStapDefinitie {
  id: NetontwerpStap;
  nummer: number;
  titel: string;
  beschrijving: string;
}

export const NETONTWERP_STAPPEN: NetontwerpStapDefinitie[] = [
  {
    id: 'belastingen',
    nummer: 1,
    titel: 'Belastingen & uitgangspunten',
    beschrijving: 'Aansluitingen, vermogens en gelijktijdigheid — het investeringsplan als vertrekpunt',
  },
  {
    id: 'trace',
    nummer: 2,
    titel: 'Tracé schetsen',
    beschrijving: 'Kabeltracés tekenen of automatisch routeren per netvlak (LS/MS)',
  },
  {
    id: 'kabel',
    nummer: 3,
    titel: 'Kabelberekening',
    beschrijving: 'Kabeltype en doorsnede uit belasting, spanningsval en belastbaarheid',
  },
  {
    id: 'stations',
    nummer: 4,
    titel: 'Stations & netopbouw',
    beschrijving: 'Benodigde stations uit belastingclusters; plaatsing en netstructuur',
  },
  {
    id: 'stationsontwerp',
    nummer: 5,
    titel: 'Stationsontwerp',
    beschrijving: 'Eenlijnschema en plattegrond per station',
  },
  {
    id: 'werktekening',
    nummer: 6,
    titel: 'Werktekening & uitvoering',
    beschrijving: 'Moffen, mantelbuizen, werktekening (UO), materiaallijst en export',
  },
];

export function getStapDefinitie(id: NetontwerpStap): NetontwerpStapDefinitie {
  return NETONTWERP_STAPPEN.find((s) => s.id === id) ?? NETONTWERP_STAPPEN[0];
}

/** Leid de stapstatus af uit de inhoud van het ontwerp. */
export function afgeleideStapStatus(ontwerp: Netontwerp): Record<NetontwerpStap, StapStatus> {
  const heeftAansluitingen = ontwerp.aansluitingen.length > 0;
  const heeftTraces = ontwerp.traceIds.length > 0;
  const heeftKabels = ontwerp.kabelKeuzes.length > 0;
  const stations = ontwerp.assets.filter((a) => a.type === 'station');
  const moffen = ontwerp.assets.filter((a) => a.type === 'mof');
  const heeftOntwerpen = ontwerp.stationsOntwerpen.length > 0;

  const status = (gereed: boolean, bezig: boolean): StapStatus =>
    gereed ? 'gereed' : bezig ? 'bezig' : 'open';

  return {
    belastingen: status(heeftAansluitingen, false),
    trace: status(heeftTraces, heeftAansluitingen),
    kabel: status(heeftKabels, heeftTraces),
    stations: status(stations.length > 0, heeftKabels),
    stationsontwerp: status(heeftOntwerpen, stations.length > 0),
    werktekening: status(moffen.length > 0, heeftOntwerpen),
  };
}
