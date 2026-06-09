const MAPLIBRE_VERSION = '5.24.0';
const CDN_BASE = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist`;

export interface MapLibreCDN {
  Map: new (options: Record<string, unknown>) => MapLibreMap;
  Popup: new (options?: Record<string, unknown>) => MapLibrePopup;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
  ScaleControl: new (options?: Record<string, unknown>) => unknown;
}

export interface MapLibreMap {
  addControl: (control: unknown, position?: string) => void;
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>) => void;
  getSource: (id: string) => unknown;
  getLayer: (id: string) => unknown;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
  getCanvas: () => HTMLCanvasElement;
  on: (type: string, layerOrHandler: string | ((...args: unknown[]) => void), handler?: (...args: unknown[]) => void) => void;
  off: (type: string, layerOrHandler: string | ((...args: unknown[]) => void), handler?: (...args: unknown[]) => void) => void;
  fitBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => void;
  getBounds: () => {
    getWest: () => number;
    getSouth: () => number;
    getEast: () => number;
    getNorth: () => number;
  };
  flyTo: (options: Record<string, unknown>) => void;
  resize: () => void;
  remove: () => void;
  queryRenderedFeatures: (
    point: { x: number; y: number },
    options?: { layers?: string[] }
  ) => { properties?: Record<string, unknown> }[];
  dragPan: { disable: () => void; enable: () => void };
}

export interface MapLibrePopup {
  setLngLat: (lngLat: { lng: number; lat: number }) => MapLibrePopup;
  setHTML: (html: string) => MapLibrePopup;
  addTo: (map: MapLibreMap) => MapLibrePopup;
  remove: () => void;
}

declare global {
  interface Window {
    maplibregl?: MapLibreCDN;
  }
}

let loadPromise: Promise<MapLibreCDN> | null = null;

export function loadMapLibre(): Promise<MapLibreCDN> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('MapLibre kan alleen in de browser geladen worden'));
  }

  if (window.maplibregl) {
    return Promise.resolve(window.maplibregl);
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-maplibre-css]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${CDN_BASE}/maplibre-gl.css`;
        link.setAttribute('data-maplibre-css', '1');
        document.head.appendChild(link);
      }

      const script = document.createElement('script');
      script.src = `${CDN_BASE}/maplibre-gl.js`;
      script.async = true;
      script.onload = () => {
        if (window.maplibregl) resolve(window.maplibregl);
        else reject(new Error('MapLibre GL niet beschikbaar na laden'));
      };
      script.onerror = () => reject(new Error('MapLibre GL script laden mislukt'));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}
