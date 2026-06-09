import type { BboxQuery } from '@/lib/connectors/types';

export type WegBron = 'nwb' | 'bgt';

export interface WegConfig {
  id: string;
  naam: string;
  type: 'provincialeweg' | 'gemeenteweg' | 'woonstraat' | 'fietspad';
  beheerder: string;
  bron: WegBron;
  bbox: BboxQuery;
  /** NWB: straatnaam (sttNaam) */
  nwbStraat?: string;
  minPointDist?: number;
}

/** Demo-wegen afgeleid van PDOK NWB (voorkeur) of BGT (RD EPSG:28992). */
export const WEGEN_CONFIG: WegConfig[] = [
  {
    id: 'weg-schokkerweg',
    naam: 'Lange Dreef (Schokkerwal)',
    type: 'gemeenteweg',
    beheerder: 'Gemeente Noordoostpolder',
    bron: 'nwb',
    bbox: { minX: 179900, minY: 524750, maxX: 180500, maxY: 524920 },
    nwbStraat: 'Lange Dreef',
    minPointDist: 8,
  },
  {
    id: 'weg-espelerweg-emmeloord',
    naam: 'Espelerweg (Emmeloord)',
    type: 'gemeenteweg',
    beheerder: 'Gemeente Noordoostpolder',
    bron: 'nwb',
    bbox: { minX: 177200, minY: 526150, maxX: 178200, maxY: 526500 },
    nwbStraat: 'Espelerweg',
    minPointDist: 10,
  },
  {
    id: 'weg-provincialeweg',
    naam: 'Provincialeweg N50 (Kuinderweg)',
    type: 'provincialeweg',
    beheerder: 'Provincie Flevoland',
    bron: 'nwb',
    bbox: { minX: 181600, minY: 524600, maxX: 184400, maxY: 530500 },
    nwbStraat: 'Kuinderweg',
    minPointDist: 25,
  },
  {
    id: 'weg-zuidermolenweg',
    naam: 'Muntweg (Emmeloord)',
    type: 'gemeenteweg',
    beheerder: 'Gemeente Noordoostpolder',
    bron: 'nwb',
    bbox: { minX: 179600, minY: 526400, maxX: 181900, maxY: 526550 },
    nwbStraat: 'Muntweg',
    minPointDist: 12,
  },
  {
    id: 'weg-banterweg-emmeloord',
    naam: 'Banterweg (Emmeloord)',
    type: 'gemeenteweg',
    beheerder: 'Gemeente Noordoostpolder',
    bron: 'nwb',
    bbox: { minX: 179400, minY: 525650, maxX: 180200, maxY: 530350 },
    nwbStraat: 'Banterweg',
    minPointDist: 15,
  },
  {
    id: 'weg-markerwaardweg',
    naam: 'Kennemerlandlaan (Lelystad Haven)',
    type: 'gemeenteweg',
    beheerder: 'Gemeente Lelystad',
    bron: 'nwb',
    bbox: { minX: 177200, minY: 525950, maxX: 178200, maxY: 526350 },
    nwbStraat: 'Kennemerlandlaan',
    minPointDist: 10,
  },
  {
    id: 'weg-almere-poort',
    naam: 'Poortdreef (Almere Poort)',
    type: 'gemeenteweg',
    beheerder: 'Gemeente Almere',
    bron: 'nwb',
    bbox: { minX: 138900, minY: 482750, maxX: 139500, maxY: 483150 },
    nwbStraat: 'Poortdreef',
    minPointDist: 10,
  },
  {
    id: 'weg-purmerend-zuid',
    naam: 'Purmerend-Zuid 4',
    type: 'gemeenteweg',
    beheerder: 'Gemeente Purmerend',
    bron: 'nwb',
    bbox: { minX: 123800, minY: 501800, maxX: 124600, maxY: 502400 },
    nwbStraat: 'Purmerend-Zuid 4',
    minPointDist: 12,
  },
  {
    id: 'weg-dronten-de-noord',
    naam: 'De Noord (Dronten)',
    type: 'gemeenteweg',
    beheerder: 'Gemeente Dronten',
    bron: 'nwb',
    bbox: { minX: 177400, minY: 504900, maxX: 178100, maxY: 505300 },
    nwbStraat: 'De Noord',
    minPointDist: 12,
  },
  {
    id: 'weg-urk-ambachtsweg',
    naam: 'Urkerweg (industrieterrein)',
    type: 'gemeenteweg',
    beheerder: 'Gemeente Urk',
    bron: 'nwb',
    bbox: { minX: 169500, minY: 518900, maxX: 170200, maxY: 519500 },
    nwbStraat: 'Urkerweg',
    minPointDist: 12,
  },
  {
    id: 'weg-oostvaardersdijk',
    naam: 'Oostvaardersdijk (Lelystad)',
    type: 'provincialeweg',
    beheerder: 'Rijkswaterstaat',
    bron: 'nwb',
    bbox: { minX: 156800, minY: 501400, maxX: 158200, maxY: 502200 },
    nwbStraat: 'Oostvaardersdijk',
    minPointDist: 15,
  },
];
