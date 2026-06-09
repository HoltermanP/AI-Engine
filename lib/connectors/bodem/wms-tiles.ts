/** Bouwt MapLibre-compatibele WMS-tile-URL's (EPSG:3857). */

export function wmsTileUrl(baseUrl: string, layers: string): string {
  const q = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    CRS: 'EPSG:3857',
    STYLES: '',
    WIDTH: '256',
    HEIGHT: '256',
    LAYERS: layers,
  });
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${q.toString()}&BBOX={bbox-epsg-3857}`;
}

export interface BodemWmsSource {
  id: string;
  label: string;
  tiles: string;
  opacity: number;
}
