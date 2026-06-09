/**
 * Uitbreidbaar register van bodem-/vervuilde-grondbronnen.
 *
 * Nieuwe bron toevoegen:
 * 1. Voeg een entry toe aan VERVUILDE_GROND_EXTRA_SOURCES
 * 2. Kies provider: wfs | ogc | arcgis
 * 3. Specificeer lagen met unieke `bron`-code (gebruikt op kaart en in popups)
 * 4. Optioneel: coverageBbox, gemeenteFilter, defaultEnabled
 */

import type {
  VervuildeGrondSourceDefinition,
  VervuildeGrondSourceLayer,
} from './types';
import { VERVUILDE_GROND_LANDELIJKE_SOURCES } from './landelijke-sources';
import { VERVUILDE_GROND_PROVINCIAL_SOURCES } from './provincial-sources';

export type {
  VervuildeGrondProvider,
  VervuildeGrondSourceDefinition,
  VervuildeGrondSourceLayer,
} from './types';

const DEFAULT_NAME_FIELDS = [
  'name',
  'naam',
  'NAME',
  'NAAM',
  'LOC_CODE',
  'LOCATIECODE',
  'locatiecode',
  'Locatiecode',
  'Locatienaam',
  'locatie',
  'OMSCHRIJV',
  'PROJECTNAAM',
  'PROJECT',
  'LOCATIE',
  'naam_rapport',
  'am_nummer',
];
const DEFAULT_STATUS_FIELDS = [
  'status',
  'STATUS',
  'beoordeling',
  'TYPE',
  'type',
  'CONTOURTYPE',
  'verontreinigingstype',
  'beschikking',
  'wbb',
  'type_onderzoek',
  'BESLUITOMSCHRIJVING',
];

const ODMH_BODEM_URL =
  'https://geo.odmh.nl/arcgis/rest/services/Atlas/Atlas_Bodem/MapServer';
const ZH_BODEM_WFS = 'https://geodata.zuid-holland.nl/geoserver/bodem/wfs';

function odmhLayers(
  prefix: string,
  gemeente: string,
  palette: [string, string, string, string]
): VervuildeGrondSourceLayer[] {
  return [
    {
      bron: `${prefix}_veront`,
      label: `${gemeente} — verontreiniging`,
      color: palette[0],
      layerId: 2,
      nameFields: ['NAAM', 'LOCATIE_ID', 'SIKB_UID'],
      statusFields: ['CONTOURTYPE'],
    },
    {
      bron: `${prefix}_sanering`,
      label: `${gemeente} — sanering`,
      color: palette[1],
      layerId: 3,
      nameFields: ['NAAM', 'LOCATIE_ID'],
      statusFields: ['CONTOURTYPE'],
    },
    {
      bron: `${prefix}_locatie`,
      label: `${gemeente} — bodemlocatie`,
      color: palette[2],
      layerId: 0,
      nameFields: ['NAAM', 'LOCATIE_ID'],
    },
    {
      bron: `${prefix}_onderzoek`,
      label: `${gemeente} — onderzoek`,
      color: palette[3],
      layerId: 1,
      nameFields: ['NAAM', 'LOCATIE_ID'],
    },
  ];
}

function odmhSource(
  id: string,
  gemeente: string,
  coverageBbox: VervuildeGrondSourceDefinition['coverageBbox'],
  palette: [string, string, string, string]
): VervuildeGrondSourceDefinition {
  const prefix = `gemeente_${id}`;
  return {
    id,
    label: `Gemeente ${gemeente} — bodemregister (ODMH)`,
    gemeente,
    provider: 'arcgis',
    baseUrl: ODMH_BODEM_URL,
    coverageBbox,
    testBbox: coverageBbox,
    layers: odmhLayers(prefix, gemeente, palette),
  };
}

function zhSpoedSource(
  id: string,
  gemeente: string,
  gemeenteFilter: string,
  coverageBbox: VervuildeGrondSourceDefinition['coverageBbox'],
  color: string
): VervuildeGrondSourceDefinition {
  return {
    id,
    label: `Gemeente ${gemeente} — spoedlocaties (PZH)`,
    gemeente,
    provider: 'wfs',
    baseUrl: ZH_BODEM_WFS,
    coverageBbox,
    testBbox: coverageBbox,
    layers: [
      {
        bron: `gemeente_${id}_spoed`,
        label: `${gemeente} — spoedlocatie`,
        color,
        typeNames: 'bodem:BS_SPOEDLOCATIES',
        gemeenteFilter,
        gemeenteField: 'Gemeente',
        nameFields: ['Locatienaam', 'Locatiecode', 'BIS_locatie', 'Straat'],
        statusFields: ['Aanleiding_risico_humaan', 'Onderzocht'],
      },
    ],
  };
}

import { VERVUILDE_GROND_REGIONAL_SOURCES } from './regional-sources';

const VERVUILDE_GROND_GEMEENTE_SOURCES: VervuildeGrondSourceDefinition[] = [
  {
    id: 'nijmegen',
    label: 'Gemeente Nijmegen — bodemregister',
    gemeente: 'Nijmegen',
    provider: 'wfs',
    baseUrl: 'https://services.nijmegen.nl/geoservices/extern_MIL_Bodem/ows',
    testBbox: { minX: 180_000, minY: 410_000, maxX: 200_000, maxY: 425_000 },
    layers: [
      {
        bron: 'gemeente_nijmegen_veront',
        label: 'Nijmegen — verontreiniging',
        color: '#1A5276',
        typeNames: 'extern_MIL_Bodem:MIL_BOD_VERONT',
        nameFields: ['LOC_CODE'],
      },
      {
        bron: 'gemeente_nijmegen_verdacht',
        label: 'Nijmegen — verdachte locatie',
        color: '#2874A6',
        typeNames: 'extern_MIL_Bodem:MIL_BOD_VERDACHT',
        nameFields: ['LOC_CODE'],
      },
      {
        bron: 'gemeente_nijmegen_onderzoek',
        label: 'Nijmegen — bodemonderzoek',
        color: '#5DADE2',
        typeNames: 'extern_MIL_Bodem:MIL_BOD_ONDERZ',
        nameFields: ['LOC_CODE'],
      },
      {
        bron: 'gemeente_nijmegen_olietanks',
        label: 'Nijmegen — olietank',
        color: '#7FB3D5',
        typeNames: 'extern_MIL_Bodem:MIL_BOD_OLIETANKS',
        nameFields: ['LOC_CODE'],
      },
      {
        bron: 'gemeente_nijmegen_grondwater',
        label: 'Nijmegen — grondwaterverontreiniging',
        color: '#5499C7',
        typeNames: 'extern_MIL_Water:MIL_WAT_GWVERONT',
        wfsBaseUrl: 'https://services.nijmegen.nl/geoservices/extern_MIL_Water/ows',
        nameFields: ['LOC_CODE'],
      },
    ],
  },
  {
    id: 'haarlem',
    label: 'Gemeente Haarlem — bodemregister',
    gemeente: 'Haarlem',
    provider: 'ogc',
    baseUrl: 'https://data.haarlem.nl/geoserver/ogc/features/v1',
    testBbox: { minX: 100_000, minY: 486_000, maxX: 105_000, maxY: 490_000 },
    layers: [
      {
        bron: 'gemeente_haarlem_locatie',
        label: 'Haarlem — bodemlocatie',
        color: '#117A65',
        collection: 'gemeentehaarlem:bodem_locatie',
        nameFields: ['name', 'locatiecode'],
        statusFields: ['beoordeling', 'beschikking', 'wbb'],
      },
      {
        bron: 'gemeente_haarlem_veront',
        label: 'Haarlem — verontreiniging',
        color: '#148F77',
        collection: 'gemeentehaarlem:BODEM_VERONTREINIGING',
        nameFields: ['name', 'locatiecode'],
      },
      {
        bron: 'gemeente_haarlem_onderzoek',
        label: 'Haarlem — bodemonderzoek',
        color: '#48C9B0',
        collection: 'gemeentehaarlem:bodem_onderzoek',
        nameFields: ['name', 'locatiecode'],
      },
      {
        bron: 'gemeente_haarlem_meetpunt',
        label: 'Haarlem — meetpunt',
        color: '#76D7C4',
        collection: 'gemeentehaarlem:bodem_meetpunten',
        nameFields: ['name', 'locatiecode'],
      },
      {
        bron: 'gemeente_haarlem_tanks',
        label: 'Haarlem — bodemtank',
        color: '#1ABC9C',
        collection: 'gemeentehaarlem:bodem_tanks',
        nameFields: ['name', 'locatiecode'],
      },
      {
        bron: 'gemeente_haarlem_besluit',
        label: 'Haarlem — bodembesluit',
        color: '#16A085',
        collection: 'gemeentehaarlem:bodem_besluiten',
        nameFields: ['name', 'locatiecode'],
        statusFields: ['beschikking', 'beoordeling'],
      },
      {
        bron: 'gemeente_haarlem_activiteit',
        label: 'Haarlem — bodemactiviteit',
        color: '#0E6251',
        collection: 'gemeentehaarlem:bodem_activiteiten',
        nameFields: ['name', 'locatiecode'],
      },
    ],
  },
  {
    id: 'arnhem',
    label: 'Gemeente Arnhem — verontreinigingscontouren',
    gemeente: 'Arnhem',
    provider: 'arcgis',
    baseUrl:
      'https://geo.arnhem.nl/arcgis/rest/services/OpenData/Verontreinigingscontouren/MapServer',
    coverageBbox: { minX: 205_000, minY: 440_000, maxX: 215_000, maxY: 450_000 },
    testBbox: { minX: 205_000, minY: 440_000, maxX: 215_000, maxY: 450_000 },
    layers: [
      {
        bron: 'gemeente_arnhem_grond_geval',
        label: 'Arnhem — grond gevalcontour',
        color: '#7D3C98',
        layerId: 1,
        nameFields: ['LOCATIE', 'LOC_CODE', 'PROJECT', 'NAAM'],
        statusFields: ['TYPE', 'VERONTREINIGINGSTYPE', 'CONTOURTYPE'],
      },
      {
        bron: 'gemeente_arnhem_niet_ernstig',
        label: 'Arnhem — niet-ernstige verontreiniging',
        color: '#A569BD',
        layerId: 0,
        nameFields: ['LOCATIE', 'LOC_CODE', 'PROJECT', 'NAAM'],
      },
      {
        bron: 'gemeente_arnhem_grondwater',
        label: 'Arnhem — grondwater gevalcontour',
        color: '#8E44AD',
        layerId: 2,
        nameFields: ['LOCATIE', 'LOC_CODE', 'PROJECT', 'NAAM'],
        statusFields: ['TYPE', 'VERONTREINIGINGSTYPE'],
      },
    ],
  },
  {
    id: 'amsterdam',
    label: 'Gemeente Amsterdam — bodemregister',
    gemeente: 'Amsterdam',
    provider: 'wfs',
    baseUrl: 'https://api.data.amsterdam.nl/v1/wfs/bodem',
    coverageBbox: { minX: 115_000, minY: 483_000, maxX: 125_000, maxY: 490_000 },
    testBbox: { minX: 115_000, minY: 483_000, maxX: 125_000, maxY: 490_000 },
    layers: [
      {
        bron: 'gemeente_amsterdam_grond',
        label: 'Amsterdam — grondmonster',
        color: '#922B21',
        typeNames: 'app:grond',
        nameFields: ['locatie', 'am_nummer', 'naam_boring'],
        statusFields: ['type_onderzoek', 'eindoordeel'],
      },
      {
        bron: 'gemeente_amsterdam_grondwater',
        label: 'Amsterdam — grondwatermonster',
        color: '#C0392B',
        typeNames: 'app:grondwater',
        nameFields: ['locatie', 'am_nummer'],
        statusFields: ['type_onderzoek'],
      },
      {
        bron: 'gemeente_amsterdam_onderzoek',
        label: 'Amsterdam — historisch onderzoek',
        color: '#E74C3C',
        typeNames: 'app:onderzoeken',
        wfsBaseUrl: 'https://api.data.amsterdam.nl/v1/wfs/historische_bodeminformatie',
        nameFields: ['naam_rapport', 'locatie_of_adres', 'nummer_rapport'],
        statusFields: ['type_onderzoek'],
      },
      {
        bron: 'gemeente_amsterdam_asbest',
        label: 'Amsterdam — asbest in bodem',
        color: '#B03A2E',
        typeNames: 'app:asbest',
        nameFields: ['locatie', 'am_nummer'],
        statusFields: ['type_onderzoek', 'eindoordeel'],
      },
      {
        bron: 'gemeente_amsterdam_bodemgebruik',
        label: 'Amsterdam — bodemgebruik/obstakels',
        color: '#CD6155',
        typeNames: 'app:bodemgebruik_en_obstakels',
        wfsBaseUrl: 'https://api.data.amsterdam.nl/v1/wfs/historische_bodeminformatie',
        nameFields: ['naam', 'locatie_of_adres'],
      },
    ],
  },
  {
    id: 'zwolle',
    label: 'Gemeente Zwolle — bodemregister',
    gemeente: 'Zwolle',
    provider: 'arcgis',
    baseUrl: 'https://gisservices.zwolle.nl/arcgis/rest/services/Bodem/MapServer',
    coverageBbox: { minX: 192_000, minY: 494_000, maxX: 216_000, maxY: 512_000 },
    testBbox: { minX: 192_000, minY: 494_000, maxX: 216_000, maxY: 512_000 },
    layers: [
      {
        bron: 'gemeente_zwolle_veront',
        label: 'Zwolle — verontreiniging',
        color: '#1F618D',
        layerId: 2,
        nameFields: ['LOCATIECODE', 'BESLUITOMSCHRIJVING'],
        statusFields: ['CONTOURTYPE', 'OVERSCHRIJDING'],
      },
      {
        bron: 'gemeente_zwolle_locatie',
        label: 'Zwolle — locatie',
        color: '#2E86C1',
        layerId: 3,
        nameFields: ['LOCATIECODE'],
      },
      {
        bron: 'gemeente_zwolle_onderzoek',
        label: 'Zwolle — onderzoek',
        color: '#5DADE2',
        layerId: 4,
        nameFields: ['LOCATIECODE'],
      },
      {
        bron: 'gemeente_zwolle_sanering',
        label: 'Zwolle — sanering',
        color: '#85C1E9',
        layerId: 1,
        nameFields: ['LOCATIECODE'],
        statusFields: ['CONTOURTYPE'],
      },
      {
        bron: 'gemeente_zwolle_zorg',
        label: 'Zwolle — zorgmaatregel',
        color: '#AED6F1',
        layerId: 0,
        nameFields: ['LOCATIECODE'],
        statusFields: ['CONTOURTYPE'],
      },
    ],
  },
  odmhSource('leiden', 'Leiden', { minX: 88_000, minY: 452_000, maxX: 94_000, maxY: 458_000 }, [
    '#154360',
    '#1A5276',
    '#2471A3',
    '#5499C7',
  ]),
  odmhSource('gouda', 'Gouda', { minX: 105_000, minY: 448_000, maxX: 112_000, maxY: 455_000 }, [
    '#145A32',
    '#196F3D',
    '#229954',
    '#52BE80',
  ]),
  odmhSource(
    'zoetermeer',
    'Zoetermeer',
    { minX: 55_000, minY: 448_000, maxX: 65_000, maxY: 456_000 },
    ['#4A235A', '#5B2C6F', '#7D3C98', '#A569BD']
  ),
  {
    ...odmhSource(
      'alphen_aan_den_rijn',
      'Alphen aan den Rijn',
      { minX: 98_000, minY: 458_000, maxX: 108_000, maxY: 468_000 },
      ['#784212', '#935116', '#B9770E', '#D4AC0D']
    ),
    layers: [
      ...odmhLayers('gemeente_alphen_aan_den_rijn', 'Alphen aan den Rijn', [
        '#784212',
        '#935116',
        '#B9770E',
        '#D4AC0D',
      ]),
      {
        bron: 'gemeente_alphen_aan_den_rijn_spoed',
        label: 'Alphen aan den Rijn — spoedlocatie',
        color: '#D4AC0D',
        typeNames: 'bodem:BS_SPOEDLOCATIES',
        gemeenteFilter: 'Alphen aan den Rijn',
        gemeenteField: 'Gemeente',
        nameFields: ['Locatienaam', 'Locatiecode'],
      },
    ],
  },
  zhSpoedSource(
    'delft',
    'Delft',
    'Delft',
    { minX: 83_500, minY: 447_500, maxX: 86_000, maxY: 449_000 },
    '#117864'
  ),
  zhSpoedSource(
    'den_haag',
    "'s-Gravenhage",
    'Den Haag',
    { minX: 78_000, minY: 448_000, maxX: 86_000, maxY: 456_000 },
    '#0E6655'
  ),
  zhSpoedSource(
    'rijswijk',
    'Rijswijk',
    'Rijswijk',
    { minX: 83_000, minY: 448_500, maxX: 84_500, maxY: 453_500 },
    '#148F77'
  ),
  zhSpoedSource(
    'rotterdam',
    'Rotterdam',
    'Rotterdam',
    { minX: 92_000, minY: 432_000, maxX: 102_000, maxY: 445_000 },
    '#16A085'
  ),
];

export const VERVUILDE_GROND_EXTRA_SOURCES: VervuildeGrondSourceDefinition[] = [
  ...VERVUILDE_GROND_LANDELIJKE_SOURCES,
  ...VERVUILDE_GROND_PROVINCIAL_SOURCES,
  ...VERVUILDE_GROND_GEMEENTE_SOURCES,
  ...VERVUILDE_GROND_REGIONAL_SOURCES,
];

export function getSourceLayerDefaults(layer: VervuildeGrondSourceLayer) {
  return {
    nameFields: layer.nameFields ?? DEFAULT_NAME_FIELDS,
    statusFields: layer.statusFields ?? DEFAULT_STATUS_FIELDS,
  };
}

export function getSourceById(id: string): VervuildeGrondSourceDefinition | undefined {
  return VERVUILDE_GROND_EXTRA_SOURCES.find((s) => s.id === id);
}

export function listGemeentelijkeSourceIds(): string[] {
  return VERVUILDE_GROND_EXTRA_SOURCES.map((s) => s.id);
}
