import type { VervuildeGrondSourceDefinition } from './types';

const LIMBURG_WFS = 'https://portal.prvlimburg.nl/geodata/MILIEU/wfs';
const LIMBURG_COVERAGE = { minX: 150_000, minY: 300_000, maxX: 220_000, maxY: 390_000 };

const GELDERLAND_WFS = 'https://geoserver.gelderland.nl/geoserver/ngr_d/wfs';
const GELDERLAND_COVERAGE = { minX: 61_590, minY: 366_084, maxX: 280_844, maxY: 622_164 };

const BRABANT_MS =
  'https://geoportaal.brabant.nl/server/rest/services/Bodem/stortplaatsen/MapServer';
const BRABANT_COVERAGE = { minX: 70_000, minY: 390_000, maxX: 210_000, maxY: 440_000 };

const OVERIJSSEL_WFS = 'https://services.geodataoverijssel.nl/geoserver/wfs';
const OVERIJSSEL_COVERAGE = { minX: 190_000, minY: 490_000, maxX: 280_000, maxY: 555_000 };

const NOORDHOLLAND_MS =
  'https://geoservices.noord-holland.nl/ags/rest/services/oi_dataservice_alg/MapServer';
const NH_COVERAGE = { minX: 90_000, minY: 475_000, maxX: 180_000, maxY: 540_000 };

const FRYSLAN_MS = 'https://geoportaal.fryslan.nl/arcgis/rest/services/bodematlas/MapServer';
const FRYSLAN_COVERAGE = { minX: 170_000, minY: 540_000, maxX: 240_000, maxY: 600_000 };

const ZEELAND_WFS = 'https://opengeodata.zeeland.nl/geoserver/bodem/wfs';
const ZEELAND_COVERAGE = { minX: 13_565, minY: 357_829, maxX: 77_736, maxY: 419_957 };

/** Provinciale bodem-/vervuilde-grondbronnen (open WFS/ArcGIS). */
export const VERVUILDE_GROND_PROVINCIAL_SOURCES: VervuildeGrondSourceDefinition[] = [
  {
    id: 'limburg_bodemregister',
    label: 'Provincie Limburg — bodemregister',
    gemeente: 'Limburg',
    provider: 'wfs',
    baseUrl: LIMBURG_WFS,
    // Uitgeschakeld: portal.prvlimburg.nl reageert traag/instabiel en vertraagt
    // de data-verzameling. Weer inschakelen kan per aanvraag via enabledIds.
    defaultEnabled: false,
    coverageBbox: LIMBURG_COVERAGE,
    testBbox: { minX: 175_000, minY: 310_000, maxX: 185_000, maxY: 320_000 },
    layers: [
      {
        bron: 'limburg_wbb_overgangsrecht',
        label: 'Limburg — WBB-overgangsrechtlocatie',
        color: '#922B21',
        typeNames: 'MILIEU:OVERGANGSRECHTLOC_WBB_V',
        nameFields: ['NAAM', 'LOCATIECOD', 'SIKB_UID', 'PLAATS', 'GEMEENTE'],
        statusFields: ['BESL_STAT_', 'BESL_STA_1', 'AANPAK_NM'],
      },
      {
        bron: 'limburg_stortplaats',
        label: 'Limburg — voormalige stortplaats',
        color: '#A04000',
        typeNames: 'MILIEU:VOORMALIGE_STORTPLAATSEN_P',
        nameFields: ['LOCATIENAAM', 'LI_CODE', 'GEMEENTE'],
        statusFields: ['STATUS_STORTLOCATIE'],
      },
      {
        bron: 'limburg_mijnsteen_bodem',
        label: 'Limburg — mijnsteengebied bodembesluit',
        color: '#7D6608',
        typeNames: 'MILIEU:MIJNSTEENGEB_BESLUIT_BODEM_V',
        nameFields: ['OMSCHR'],
        statusFields: [],
      },
    ],
  },
  {
    id: 'zeeland_bodemregister',
    label: 'Provincie Zeeland — bodemlocaties',
    gemeente: 'Zeeland',
    provider: 'wfs',
    baseUrl: ZEELAND_WFS,
    coverageBbox: ZEELAND_COVERAGE,
    testBbox: { minX: 35_000, minY: 380_000, maxX: 45_000, maxY: 390_000 },
    layers: [
      {
        bron: 'zeeland_bodemlocatie',
        label: 'Zeeland — bodemlocatie (contour)',
        color: '#1F618D',
        typeNames: 'bodem:geonam_bdmlctvvl',
        nameFields: ['naam', 'locatiecode', 'adres', 'gemeente', 'woonplaats'],
        statusFields: ['status', 'opmerkingen', 'corsanr', 'datum'],
      },
    ],
  },
  {
    id: 'fryslan_bodematlas',
    label: 'Provincie Fryslân — bodematlas',
    gemeente: 'Fryslân',
    provider: 'arcgis',
    baseUrl: FRYSLAN_MS,
    coverageBbox: FRYSLAN_COVERAGE,
    testBbox: { minX: 190_000, minY: 570_000, maxX: 195_000, maxY: 575_000 },
    layers: [
      {
        bron: 'fryslan_navos',
        label: 'Fryslân — Navos-locatie',
        color: '#6C3483',
        layerId: 15,
        nameFields: ['LOCATIECOD', 'PLAATS', 'GEMEENTE', 'DOM_UBI_NM'],
        statusFields: ['EUT_TOT_NM', 'EUT_TOT_ID'],
      },
      {
        bron: 'fryslan_landbodem',
        label: 'Fryslân — landbodemlocatie',
        color: '#884EA0',
        layerId: 2,
        nameFields: ['LOCATIECOD', 'PLAATS', 'GEMEENTE', 'STRAAT', 'DOM_UBI_NM'],
        statusFields: ['EUT_TOT_NM', 'EUT_TOT_ID', 'BDM_TPB_NM'],
      },
      {
        bron: 'fryslan_stortplaats',
        label: 'Fryslân — gesloten stortplaats',
        color: '#A569BD',
        layerId: 14,
        nameFields: ['LOCATIECOD', 'PLAATS', 'GEMEENTE', 'STRAAT'],
        statusFields: ['DOM_UBI_NM', 'EUT_TOT_NM'],
      },
      {
        bron: 'fryslan_waterbodem',
        label: 'Fryslân — waterbodemlocatie',
        color: '#BB8FCE',
        layerId: 3,
        nameFields: ['LOCATIECOD', 'PLAATS', 'GEMEENTE', 'STRAAT'],
        statusFields: ['EUT_TOT_NM', 'DOM_UBI_NM'],
      },
    ],
  },
  {
    id: 'noordholland_bodem',
    label: 'Provincie Noord-Holland — bodem/spoed',
    gemeente: 'Noord-Holland',
    provider: 'arcgis',
    baseUrl: NOORDHOLLAND_MS,
    coverageBbox: NH_COVERAGE,
    testBbox: { minX: 100_000, minY: 480_000, maxX: 110_000, maxY: 490_000 },
    layers: [
      {
        bron: 'nh_navos_stortplaats',
        label: 'Noord-Holland — NAVOS-stortplaats',
        color: '#1A5276',
        layerId: 33,
        nameFields: ['LOC_NAAM', 'LOC_CODE', 'ADRES', 'PLAATS', 'GEMEENTE_N'],
        statusFields: ['WBB_CODE'],
      },
      {
        bron: 'nh_spoedlocatie',
        label: 'Noord-Holland — humane spoedlocatie',
        color: '#C0392B',
        layerId: 23,
        nameFields: ['LOC_NAAM', 'LOC_CODE', 'GEMEENTE_N', 'PLAATS'],
        statusFields: ['WBB_CODE', 'STATUS'],
      },
    ],
  },
  {
    id: 'brabant_stortplaatsen',
    label: 'Provincie Noord-Brabant — voormalige stortplaatsen',
    gemeente: 'Noord-Brabant',
    provider: 'arcgis',
    baseUrl: BRABANT_MS,
    coverageBbox: BRABANT_COVERAGE,
    testBbox: { minX: 85_000, minY: 410_000, maxX: 95_000, maxY: 420_000 },
    layers: [
      {
        bron: 'brabant_stortplaats',
        label: 'Brabant — voormalige stortplaats',
        color: '#784212',
        layerId: 4,
        nameFields: ['NAAM', 'PLAATS', 'GEMEENTE', 'GLOBISNR'],
        statusFields: ['ONDERZKN', 'RAPPORT_STATUS', 'STATUS_HGB'],
      },
    ],
  },
  {
    id: 'overijssel_stortplaatsen',
    label: 'Provincie Overijssel — stortplaatsen',
    gemeente: 'Overijssel',
    provider: 'wfs',
    baseUrl: OVERIJSSEL_WFS,
    coverageBbox: OVERIJSSEL_COVERAGE,
    testBbox: { minX: 220_000, minY: 500_000, maxX: 230_000, maxY: 510_000 },
    layers: [
      {
        bron: 'overijssel_stortplaats',
        label: 'Overijssel — stortplaats (grondwaterbeheer)',
        color: '#5D4037',
        typeNames: 'B34_beheer_grondwater:B3_Stortplaatsen',
        nameFields: ['CODE', 'LEGENDA'],
        statusFields: ['CD_VISIE', 'PRIMAID'],
      },
    ],
  },
  {
    id: 'gelderland_krw_grondwater',
    label: 'Provincie Gelderland — KRW grondwaterverontreiniging',
    gemeente: 'Gelderland',
    provider: 'wfs',
    baseUrl: GELDERLAND_WFS,
    coverageBbox: GELDERLAND_COVERAGE,
    testBbox: { minX: 239_000, minY: 456_000, maxX: 240_000, maxY: 457_000 },
    layers: [
      {
        bron: 'gelderland_krw_gw',
        label: 'Gelderland — KRW grondwaterverontreiniging',
        color: '#21618C',
        typeNames: 'ngr_d:POPR_RWP_KRW_Grondwaterverontreiniging',
        nameFields: ['besnaam', 'noemer'],
        statusFields: ['richtlijn', 'zwemplas_t', 'nr_bsl_gld', 'url_rwp'],
      },
    ],
  },
];
