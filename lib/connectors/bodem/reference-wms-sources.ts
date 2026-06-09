/**
 * Landsdekkende referentie-WMS lagen (alleen visualisatie, geen bbox-vector).
 * Bronnen: Bodemloket, RIVM PFAS, provinciale geoportals.
 */

import { wmsTileUrl, type BodemWmsSource } from './wms-tiles';

const BLOK_VOORTGANG_WMS =
  'https://gis.gdngeoservices.nl/standalone/services/blk_gdn/lks_blk_rd_v1/MapServer/WMSServer';

const BLOK_KAART_WMS =
  'https://www.bodemloket.nl/mapserver/?map=/etc/mapserver/maps/algemeen.map';

const LIMBURG_MILIEU_WMS = 'https://portal.prvlimburg.nl/geodata/MILIEU/wms';

const RIVM_ALO_WMS = 'https://data.rivm.nl/geo/alo/wms';

/** Referentielagen — onder vervuilde-grond toggle op de kaart. */
export const BODEM_REFERENCE_WMS_SOURCES: BodemWmsSource[] = [
  {
    id: 'bodemloket-wbb',
    label: 'Bodemloket — WBB-locaties (voortgang bodemonderzoek)',
    tiles: wmsTileUrl(BLOK_VOORTGANG_WMS, 'WBB_locaties'),
    opacity: 0.65,
  },
  {
    id: 'bodemloket-zonering',
    label: 'Bodemloket — digitale bodemkwaliteitskaart (zonering)',
    tiles: wmsTileUrl(BLOK_KAART_WMS, 'zonering_bovengrond'),
    opacity: 0.5,
  },
  {
    id: 'bodemloket-toepassing',
    label: 'Bodemloket — toepassingskaart',
    tiles: wmsTileUrl(BLOK_KAART_WMS, 'toepassingskaart_bovengrond'),
    opacity: 0.45,
  },
  {
    id: 'bodemloket-ontgraving',
    label: 'Bodemloket — ontgravingskaart',
    tiles: wmsTileUrl(BLOK_KAART_WMS, 'ontgravingskaart_bovengrond'),
    opacity: 0.4,
  },
  {
    id: 'rivm-pfas-wms',
    label: 'RIVM — PFAS meetlocaties (definitieve achtergrondwaarden)',
    tiles: wmsTileUrl(RIVM_ALO_WMS, 'rivm_20201201_pfasdef_totaal'),
    opacity: 0.55,
  },
  {
    id: 'rivm-pfas-tijdelijk-wms',
    label: 'RIVM — PFAS meetlocaties (tijdelijke achtergrondwaarden)',
    tiles: wmsTileUrl(RIVM_ALO_WMS, 'vw_rivm_20200131_meetlocaties_pfas'),
    opacity: 0.5,
  },
  {
    id: 'limburg-mijnsteen',
    label: 'Provincie Limburg — mijnsteengebieden bodembesluit',
    tiles: wmsTileUrl(LIMBURG_MILIEU_WMS, 'MIJNSTEENGEB_BESLUIT_BODEM_V'),
    opacity: 0.55,
  },
];
