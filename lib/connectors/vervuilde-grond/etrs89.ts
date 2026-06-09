import proj4 from 'proj4';

proj4.defs('EPSG:4258', '+proj=longlat +ellps=GRS80 +no_defs +type=crs');

/** ETRS89 (EPSG:4258) naar RD — voor BRO GeoPackage-features. */
export function etrs89ToRd(lon: number, lat: number): [number, number] {
  const [x, y] = proj4('EPSG:4258', 'EPSG:28992', [lon, lat]);
  return [x, y];
}
