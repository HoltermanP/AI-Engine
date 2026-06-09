/** PDOK/BRO bronnen voor vervuilde grond — SLD + SAD. */

import { wmsTileUrl } from '../bodem/wms-tiles';

export const SLD_GPKG_URL =
  'https://service.pdok.nl/tno/bro-overheidsbesluit-bodemverontreiniging/atom/downloads/brosldvolledigeset.gpkg';

export const SAD_GPKG_URL =
  'https://service.pdok.nl/tno/bro-milieuhygienisch-bodemonderzoek/atom/downloads/brosadvolledigeset.gpkg';

export const SLD_WMS_BASE =
  'https://service.pdok.nl/tno/bro-overheidsbesluit-bodemverontreiniging/wms/v1_0';

export const SAD_WMS_BASE =
  'https://service.pdok.nl/tno/bro-milieuhygienisch-bodemonderzoek/wms/v1_0';

/** SLD WMS-lagen: overheidsbesluit, bodemlocatie, verontreinigd/aangepakt/nazorggebied. */
export const SLD_WMS_LAYERS =
  'sld,sld_soil_location,sld_contaminated_area,sld_handled_area,sld_aftercare_area';

/** SAD WMS-lagen: onderzoeksgebied + meetpunten. */
export const SAD_WMS_LAYERS = 'sad,sad_measurement_point';

export const VERVUILDE_GROND_WMS_SOURCES = [
  {
    id: 'sad',
    label: 'BRO SAD — milieuhygiënisch bodemonderzoek',
    tiles: wmsTileUrl(SAD_WMS_BASE, SAD_WMS_LAYERS),
    opacity: 0.6,
  },
  {
    id: 'sld',
    label: 'BRO SLD — overheidsbesluit bodemverontreiniging',
    tiles: wmsTileUrl(SLD_WMS_BASE, SLD_WMS_LAYERS),
    opacity: 0.55,
  },
] as const;
