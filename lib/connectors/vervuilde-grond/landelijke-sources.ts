import type { VervuildeGrondSourceDefinition } from './types';

const RIVM_ALO_WFS = 'https://data.rivm.nl/geo/alo/wfs';
const BLOK_KAART_WFS =
  'https://www.bodemloket.nl/mapserver/?map=/etc/mapserver/maps/algemeen.map';
const NL_COVERAGE = { minX: 10_000, minY: 300_000, maxX: 280_000, maxY: 620_000 };

/** Landelijke vectorbronnen (WFS) — bevraagbaar per trace-bbox. */
export const VERVUILDE_GROND_LANDELIJKE_SOURCES: VervuildeGrondSourceDefinition[] = [
  {
    id: 'rivm_pfas_definitief',
    label: 'RIVM — PFAS meetlocaties definitieve achtergrondwaarden',
    gemeente: 'Landelijk',
    provider: 'wfs',
    baseUrl: RIVM_ALO_WFS,
    testBbox: { minX: 10_000, minY: 380_000, maxX: 50_000, maxY: 410_000 },
    layers: [
      {
        bron: 'pfas_definitief',
        label: 'PFAS meetlocatie (definitief)',
        color: '#5B2C6F',
        typeNames: 'alo:rivm_20201201_pfasdef_totaal',
        nameFields: ['monsterid', 'onderzoeki', 'diepteprof', 'onb_beinvloed'],
        statusFields: ['som_pfos', 'som_pfoa', 'diepte_cm', 'aw', 'onb_beinvloed'],
      },
    ],
  },
  {
    id: 'rivm_pfas_tijdelijk',
    label: 'RIVM — PFAS meetlocaties tijdelijke achtergrondwaarden',
    gemeente: 'Landelijk',
    provider: 'wfs',
    baseUrl: RIVM_ALO_WFS,
    testBbox: { minX: 10_000, minY: 380_000, maxX: 50_000, maxY: 410_000 },
    layers: [
      {
        bron: 'pfas_tijdelijk',
        label: 'PFAS meetlocatie (tijdelijk)',
        color: '#7D3C98',
        typeNames: 'alo:vw_rivm_20200131_meetlocaties_pfas',
        nameFields: ['monsterid', 'onderzoeki', 'diepteprof'],
        statusFields: ['som_pfos', 'som_pfoa', 'diepte_cm'],
      },
    ],
  },
  {
    id: 'bodemloket_bkk',
    label: 'Bodemloket — digitale bodemkwaliteitskaart (BKK)',
    gemeente: 'Landelijk',
    provider: 'wfs',
    baseUrl: BLOK_KAART_WFS,
    coverageBbox: NL_COVERAGE,
    testBbox: { minX: 92_230, minY: 450_036, maxX: 92_358, maxY: 450_210 },
    layers: [
      {
        bron: 'bodemloket_zonering',
        label: 'Bodemloket — BKK zonering bovengrond',
        color: '#7F8C8D',
        typeNames: 'zonering_bovengrond',
        wfsGml: true,
        nameFields: ['naam', 'id', 'gemeente_code'],
        statusFields: ['waarde', 'klassewaarde', 'laagnaam'],
      },
      {
        bron: 'bodemloket_toepassing',
        label: 'Bodemloket — toepassingskaart bovengrond',
        color: '#95A5A6',
        typeNames: 'toepassingskaart_bovengrond',
        wfsGml: true,
        nameFields: ['naam', 'id', 'gemeente_code'],
        statusFields: ['waarde', 'klassewaarde'],
      },
      {
        bron: 'bodemloket_ontgraving',
        label: 'Bodemloket — ontgravingskaart bovengrond',
        color: '#BDC3C7',
        typeNames: 'ontgravingskaart_bovengrond',
        wfsGml: true,
        nameFields: ['naam', 'id', 'gemeente_code'],
        statusFields: ['waarde', 'klassewaarde'],
      },
    ],
  },
];
