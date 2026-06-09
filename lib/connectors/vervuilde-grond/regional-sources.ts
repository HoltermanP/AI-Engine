import type { VervuildeGrondSourceDefinition } from './types';

const ZH_BODEM_WFS = 'https://geodata.zuid-holland.nl/geoserver/bodem/wfs';
const ZH_COVERAGE = { minX: 50_000, minY: 408_000, maxX: 140_000, maxY: 481_000 };
const ODMH_URL =
  'https://geo.odmh.nl/arcgis/rest/services/Atlas/Atlas_Bodem/MapServer';
const ODMH_COVERAGE = { minX: 85_800, minY: 433_000, maxX: 131_000, maxY: 460_000 };

/** Provinciale, OD- en andere niet-gemeentelijke bronnen. */
export const VERVUILDE_GROND_REGIONAL_SOURCES: VervuildeGrondSourceDefinition[] = [
  {
    id: 'pzh_historisch_bodembestand',
    label: 'Provincie Zuid-Holland — Historisch Bodem Bestand',
    gemeente: 'Zuid-Holland',
    provider: 'wfs',
    baseUrl: ZH_BODEM_WFS,
    coverageBbox: ZH_COVERAGE,
    testBbox: { minX: 120_000, minY: 437_000, maxX: 122_000, maxY: 438_000 },
    layers: [
      {
        bron: 'pzh_hbb_punten',
        label: 'PZH — HBB verdachte locatie',
        color: '#6E2C00',
        typeNames: 'bodem:BS_HBB_PUNTEN_PZH',
        nameFields: ['SYMBTEKST', 'BIO_ID', 'PLAATS', 'STRAAT'],
        statusFields: ['EUT_STATUS', 'EUT_TOTAAL', 'BEHEERDER'],
      },
      {
        bron: 'pzh_hbb_buiten',
        label: 'PZH — HBB buiten werkgebied',
        color: '#873600',
        typeNames: 'bodem:BS_HBB_PUNTEN_BUITEN_PZH',
        nameFields: ['SYMBTEKST', 'BIO_ID', 'PLAATS'],
        statusFields: ['EUT_STATUS'],
      },
    ],
  },
  {
    id: 'pzh_bsb_sanering',
    label: 'Provincie Zuid-Holland — BSB bedrijfsterreinen',
    gemeente: 'Zuid-Holland',
    provider: 'wfs',
    baseUrl: ZH_BODEM_WFS,
    coverageBbox: ZH_COVERAGE,
    testBbox: { minX: 80_000, minY: 430_000, maxX: 120_000, maxY: 460_000 },
    layers: [
      {
        bron: 'pzh_bsb_geocodeerd',
        label: 'PZH — bodemsanering bedrijfsterrein',
        color: '#A04000',
        typeNames: 'bodem:BS_BSB_TOT_LIJST_GEGEOCODEERD',
        nameFields: ['NAAM', 'PLAATS', 'STRAAT', 'PHT'],
        statusFields: ['EXITCODE', 'SBICODES'],
      },
    ],
  },
  {
    id: 'pzh_spoedlocaties',
    label: 'Provincie Zuid-Holland — spoedlocaties',
    gemeente: 'Zuid-Holland',
    provider: 'wfs',
    baseUrl: ZH_BODEM_WFS,
    coverageBbox: ZH_COVERAGE,
    testBbox: { minX: 100_000, minY: 453_000, maxX: 105_000, maxY: 454_000 },
    layers: [
      {
        bron: 'pzh_spoedlocatie',
        label: 'PZH — spoedlocatie bodem',
        color: '#CB4335',
        typeNames: 'bodem:BS_SPOEDLOCATIES',
        nameFields: ['Locatienaam', 'Locatiecode', 'BIS_locatie', 'Gemeente'],
        statusFields: [
          'Aanleiding_risico_humaan',
          'Onderzocht',
          'Beschikt',
          'Sanering_gestart',
        ],
      },
    ],
  },
  {
    id: 'pzh_arcgis_schone_bodem',
    label: 'Provincie Zuid-Holland — signaalbodem (ArcGIS)',
    gemeente: 'Zuid-Holland',
    provider: 'arcgis',
    baseUrl:
      'https://geoservices.zuid-holland.nl/arcgis/rest/services/Bodem/Bodem_schone_bodem/MapServer',
    coverageBbox: ZH_COVERAGE,
    testBbox: { minX: 80_000, minY: 430_000, maxX: 120_000, maxY: 460_000 },
    layers: [
      {
        bron: 'pzh_arcgis_spoed',
        label: 'PZH — spoedlocatie (ArcGIS)',
        color: '#E74C3C',
        layerId: 14,
        nameFields: ['Locatienaam', 'Locatiecode', 'Gemeente'],
      },
      {
        bron: 'pzh_arcgis_bsb',
        label: 'PZH — BSB sanering (ArcGIS)',
        color: '#D35400',
        layerId: 10,
        nameFields: ['NAAM', 'PLAATS'],
      },
      {
        bron: 'pzh_arcgis_slootdemping',
        label: 'PZH — slootdemping',
        color: '#BA4A00',
        layerId: 13,
        nameFields: ['NAAM', 'LOCATIE'],
      },
      {
        bron: 'pzh_arcgis_stortplaats',
        label: 'PZH — voormalige stortplaats',
        color: '#DC7633',
        layerId: 5,
        nameFields: ['NAAM', 'LOCATIE'],
      },
    ],
  },
  {
    id: 'odmh_regional',
    label: 'Omgevingsdienst Midden-Holland — bodemregister',
    gemeente: 'Midden-Holland (ODMH)',
    provider: 'arcgis',
    baseUrl: ODMH_URL,
    coverageBbox: ODMH_COVERAGE,
    testBbox: { minX: 105_000, minY: 450_000, maxX: 110_000, maxY: 453_000 },
    layers: [
      {
        bron: 'odmh_veront',
        label: 'ODMH — verontreinigingscontour',
        color: '#1B4F72',
        layerId: 2,
        nameFields: ['NAAM', 'LOCATIE_ID', 'SIKB_UID'],
        statusFields: ['CONTOURTYPE'],
      },
      {
        bron: 'odmh_sanering',
        label: 'ODMH — saneringscontour',
        color: '#21618C',
        layerId: 3,
        nameFields: ['NAAM', 'LOCATIE_ID'],
        statusFields: ['CONTOURTYPE'],
      },
      {
        bron: 'odmh_zorg',
        label: 'ODMH — zorgmaatregel',
        color: '#2874A6',
        layerId: 4,
        nameFields: ['NAAM', 'LOCATIE_ID'],
      },
      {
        bron: 'odmh_locatie',
        label: 'ODMH — bodemlocatie',
        color: '#3498DB',
        layerId: 0,
        nameFields: ['NAAM', 'LOCATIE_ID'],
      },
      {
        bron: 'odmh_onderzoek',
        label: 'ODMH — bodemonderzoek',
        color: '#5DADE2',
        layerId: 1,
        nameFields: ['NAAM', 'LOCATIE_ID'],
      },
      {
        bron: 'odmh_tanks',
        label: 'ODMH — ondergrondse tanks',
        color: '#85C1E9',
        layerId: 5,
        nameFields: ['NAAM', 'LOCATIE_ID'],
      },
      {
        bron: 'odmh_slootdemping',
        label: 'ODMH — slootdemping',
        color: '#AED6F1',
        layerId: 8,
        nameFields: ['NAAM', 'LOCATIE_ID'],
      },
      {
        bron: 'odmh_bedrijfsactiviteit',
        label: 'ODMH — bedrijfsactiviteit',
        color: '#D4E6F1',
        layerId: 7,
        nameFields: ['NAAM', 'LOCATIE_ID'],
      },
    ],
  },
];
