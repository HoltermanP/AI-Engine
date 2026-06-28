'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  bboxRdToWgs84,
  geometryForMap,
  lineForMap,
  pointToMapGeoJson,
  polygonForMap,
  rdToWgs84,
  traceBbox,
  wgs84ToRd,
} from '@/lib/geo';
import { SourceBadge } from '@/components/source-badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { ConnectorMode } from '@/lib/connectors/types';
import { conflictPopupHtml, type DetectedConflict } from '@/lib/services/conflict-detection';
import { Camera, ChevronDown, ChevronRight } from 'lucide-react';
import { loadMapLibre, type MapLibreCDN, type MapLibreMap, type MapLibrePopup } from '@/lib/maplibre-cdn';
import { StreetViewPanel } from '@/components/street-view-panel';
import type { LayerToggle, BasemapId } from '@/components/map-layer-panel';
import { BASEMAP_OPTIONS } from '@/components/map-layer-panel';
import type { DrawMode } from '@/components/map-display-controls';
import { getTraceLines, type TraceLines } from '@/lib/trace-edit';
import { bematingGeometrie, type Bemating } from '@/lib/map/bemating';
import {
  meetLengteM,
  orthoPunt,
  puntOpAfstand,
  segmentMaat,
  snapPunt,
  type SnapType,
} from '@/lib/map/teken-gereedschap';

/** Status van het CAD-tekengereedschap voor de statusbalk onder de kaart. */
export interface TekenStatus {
  rdX: number;
  rdY: number;
  snapType?: SnapType;
  lengteM?: number;
  hoekDeg?: number;
  maatBuffer?: string;
}

export interface CadOpties {
  osnap: boolean;
  ortho: boolean;
}
import { IMKL_COLORS, UTILITY_THEMA_COLORS } from '@/lib/discipline-colors';
import type { MapViewport } from '@/lib/map/viewport-bbox';
import { isFetchableMapLayer } from '@/lib/map/fetchable-layers';
import { BODEM_REFERENCE_WMS_SOURCES } from '@/lib/connectors/bodem/reference-wms-sources';
import { VERVUILDE_GROND_WMS_SOURCES } from '@/lib/connectors/bro/vervuilde-grond-sources';
import {
  vervuildeGrondKleur,
  VERVUILDE_GROND_LABEL,
} from '@/lib/connectors/vervuilde-grond/bron-metadata';
import { aggregateBodemRisicoGebieden } from '@/lib/services/bodem-risico/gebieden';
import {
  GEBIED_TYPE_LABEL,
  RISICO_KLEUR,
  RISICO_LABEL,
  type BodemGebiedType,
  type BodemRisicoLocatie,
  type BodemRisicoklasse,
} from '@/lib/services/bodem-risico/types';

const BODEM_KAART_WMS_SOURCES = [
  ...VERVUILDE_GROND_WMS_SOURCES,
  ...BODEM_REFERENCE_WMS_SOURCES,
];

/** Vast aantal demo-wegen — voorkomt zware roads.ts import bij module-load */
const DEMO_WEG_COUNT = 5;
/** Vast aantal demo-rioolleidingen — voorkomt zware riolering.ts import bij module-load */
const DEMO_RIOLERING_COUNT = 10;

const DEFAULT_MAP_CENTER: [number, number] = [5.75, 52.7];

type LayerCrs = MapLayerData['coordinateSystem'];

function layerUsesWgs84(crs?: LayerCrs): boolean {
  return crs === 'EPSG:4326';
}

function polygonForLayer(
  polygon: [number, number][],
  crs?: LayerCrs
): GeoJSON.Polygon {
  if (layerUsesWgs84(crs)) {
    return { type: 'Polygon', coordinates: [polygon.map(([x, y]) => [x, y])] };
  }
  return polygonForMap(polygon);
}

function lineForLayer(
  coordinates: [number, number, number?][],
  crs?: LayerCrs
): GeoJSON.LineString {
  if (layerUsesWgs84(crs)) {
    return {
      type: 'LineString',
      coordinates: coordinates.map(([x, y, z]) =>
        z !== undefined ? [x, y, z] : [x, y]
      ),
    };
  }
  return lineForMap(coordinates);
}

function pointForLayer(x: number, y: number, crs?: LayerCrs): GeoJSON.Point {
  if (layerUsesWgs84(crs)) {
    return { type: 'Point', coordinates: [x, y] };
  }
  return pointToMapGeoJson(x, y);
}

function geometryForLayer(
  geometry: GeoJSON.Geometry,
  crs?: LayerCrs
): GeoJSON.Geometry {
  if (layerUsesWgs84(crs)) return geometry;
  return geometryForMap(geometry);
}

function mapCenterFromTraces(traces: MapTrace[]): [number, number] {
  for (const trace of traces) {
    const coord = trace.coordinates[0];
    if (coord) {
      return rdToWgs84(coord[0], coord[1]);
    }
  }
  return DEFAULT_MAP_CENTER;
}

export interface MapTrace {
  id: string;
  code: string;
  naam: string;
  discipline: string;
  kleur: string;
  coordinates: [number, number, number?][];
  traceLines?: [number, number, number?][][];
  /** Handmatig geplaatste bematingen (lineair + hoek) */
  bematingen?: Bemating[];
}

export interface MapNet {
  id: string;
  thema: string;
  beheerder: string;
  coordinates: [number, number, number?][];
  /** Minimale parallelafstand (m) conform netbeheerder/NEN 7171 */
  vrijTeHoudenAfstand?: number;
}

export interface MapLayerData {
  coordinateSystem?: 'EPSG:4326' | 'EPSG:28992';
  bgt?: { type: string; label: string; geometry: GeoJSON.Geometry }[];
  bomen?: { id: string; x: number; y: number }[];
  nwb?: { naam: string; type: string; coordinates: [number, number][] }[];
  percelen?: { id: string; perceelnummer: string; polygon: [number, number][]; oppervlakteM2?: number }[];
  watergangen?: { naam: string; type: string; coordinates: [number, number][]; breedteM?: number }[];
  kunstwerken?: { naam: string; type: string; x: number; y: number }[];
  sonderingen?: { id: string; x: number; y: number; qc: number; grondsoort: string }[];
  grondwater?: { id: string; x: number; y: number; standNap: number }[];
  belemmeringen?: {
    id: string;
    categorie: string;
    beheerder: string;
    coordinates: [number, number][];
  }[];
  natura2000?: { id: string; naam: string; polygon: [number, number][] }[];
  vervuildeGrond?: {
    id: string;
    bron: string;
    naam: string;
    status: string;
    polygon?: [number, number][];
    x?: number;
    y?: number;
    risicoklasse?: string;
    gebiedType?: string;
    afstandTraceM?: number;
  }[];
  bodemRisicoGebieden?: {
    id: string;
    risicoklasse: string;
    gebiedType: string;
    label: string;
    telling: number;
    polygons: [number, number][][];
    punten: { id: string; x: number; y: number }[];
    minAfstandTraceM?: number;
  }[];
  /** Panddekking onzeker (PDOK-feature-caps geraakt) — bebouwingstoets mogelijk onvolledig */
  pandDekkingOnzeker?: boolean;
}

interface TraceMapProps {
  traces: MapTrace[];
  bestaandNet?: MapNet[];
  conflicten?: DetectedConflict[];
  layerData?: MapLayerData;
  lazyLayers?: boolean;
  loadingLayers?: string[];
  selectedTraceId?: string;
  selectedConflictId?: string | null;
  dataSource?: ConnectorMode;
  height?: string;
  showLayerPanel?: boolean;
  traceLineWidth?: number;
  multiLineMode?: boolean;
  drawMode?: DrawMode;
  autoWaypoints?: { x: number; y: number }[];
  /** Bodem-vooronderzoek WBB-signalen als GeoJSON (WGS84/4326) — eigen laag op de kaart. */
  bodemSignalen?: GeoJSON.FeatureCollection;
  routeAlternatives?: {
    id: string;
    label: string;
    traceLines: [number, number, number][][];
    selected: boolean;
  }[];
  /** Gemarkeerde deeltracés van het geselecteerde alternatief (best-effort: door bebouwing/privaat) */
  markedSegments?: {
    marker: 'ok' | 'door_bebouwing' | 'door_privaat';
    coordinates: [number, number, number][];
  }[];
  /** Particuliere percelen met zakelijk recht (ZRO) — apart gemarkeerd op de tekening */
  zroPercelen?: {
    perceelnummer: string;
    polygon: [number, number][];
    eigenaar: string;
    status: string;
    lengteM: number;
    oppervlakteM2?: number;
  }[];
  onMapClick?: (lng: number, lat: number, modifiers?: { alt: boolean }) => void;
  onTraceLinesChange?: (lines: TraceLines) => void;
  /** CAD-tekenopties: objectsnap (F3) en ortho-modus (F8) */
  cadOpties?: CadOpties;
  /** Live tekenstatus (RD-cursor, segmentmaat, snap) voor de statusbalk */
  onTekenStatus?: (status: TekenStatus | null) => void;
  /** Meetfunctie: meetpunten in RD; de kaart tekent de meetlijn + totaal */
  meetPunten?: { x: number; y: number }[];
  /** Bematingen (lineair + hoek) van het geselecteerde tracé — op de kaart getekend */
  bematingen?: Bemating[];
  /** Lopende bematingsplaatsing: reeds geklikte punten (RD) als preview */
  bematingPunten?: [number, number][];
  /** Netontwerp-assets (stations/moffen als punten, mantelbuizen als lijnen) — render-klaar GeoJSON */
  netontwerpAssets?: { punten: GeoJSON.Feature[]; lijnen: GeoJSON.Feature[] };
  /** Plaatsmodus actief: kaartkliks gaan naar onMapClick, cursor wordt crosshair */
  plaatsModusActief?: boolean;
  onAssetClick?: (assetId: string) => void;
  /** Asset versleept naar nieuwe positie (RD-coördinaten) */
  onAssetVerplaats?: (assetId: string, x: number, y: number) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  onLayerToggle?: (layerId: string, visible: boolean) => void;
  onLayerControlReady?: (props: {
    layerToggles: LayerToggle[];
    isVisible: (id: string) => boolean;
    toggleLayer: (id: string) => void;
    allLayersVisible: boolean;
    toggleAllLayers: (visible: boolean) => void;
    isGroupVisible: (group: string) => boolean;
    toggleGroupVisibility: (group: string, visible: boolean) => void;
    expandedGroups: Record<string, boolean>;
    toggleGroup: (group: string) => void;
    basemap: BasemapId;
    setBasemap: (id: BasemapId) => void;
    streetViewMode: boolean;
    setStreetViewMode: (v: boolean) => void;
    dataSource?: ConnectorMode;
    hasCollectedData?: boolean;
    lazyLayers?: boolean;
  }) => void;
}

const THEMA_KLEUREN = UTILITY_THEMA_COLORS;

const ERNST_KLEUREN: Record<string, string> = {
  blokkerend: '#FF4D1C',
  waarschuwing: '#F39C12',
  info: '#2D6FE8',
};

const BGT_STIJL: Record<string, { fill: string; line: string; opacity: number }> = {
  weg: { fill: '#B8B8B8', line: '#707070', opacity: 0.75 },
  water: { fill: '#7EC8E3', line: '#2980B9', opacity: 0.65 },
  pand: { fill: '#D4C4A8', line: '#8B7355', opacity: 0.8 },
  overig: { fill: '#C8C8C8', line: '#888888', opacity: 0.5 },
};

const LAZY_GIS_LAYERS: {
  id: string;
  label: string;
  group: string;
  color: string;
  countKey: keyof MapLayerData;
  defaultOn?: boolean;
}[] = [
  { id: 'bgt', label: 'BGT topografie', group: 'topografie', color: BGT_STIJL.weg.fill, countKey: 'bgt' },
  { id: 'bomen', label: 'Bomen (BGT)', group: 'topografie', color: '#2E8B57', countKey: 'bomen' },
  { id: 'nwb', label: 'NWB wegen', group: 'topografie', color: '#7F8C8D', countKey: 'nwb' },
  { id: 'watergangen', label: 'Watergangen', group: 'topografie', color: '#2980B9', countKey: 'watergangen' },
  { id: 'belemmeringen', label: 'Belemmeringen', group: 'topografie', color: '#E67E22', countKey: 'belemmeringen' },
  { id: 'natura2000', label: 'Natura2000', group: 'topografie', color: '#27AE60', countKey: 'natura2000' },
  { id: 'percelen', label: 'BRK percelen', group: 'kadaster', color: '#E74C3C', countKey: 'percelen' },
  { id: 'sonderingen', label: 'BRO sonderingen', group: 'ondergrond', color: '#8B4513', countKey: 'sonderingen' },
  { id: 'grondwater', label: 'Grondwaterstand', group: 'ondergrond', color: '#3498DB', countKey: 'grondwater' },
  { id: 'vervuilde-grond', label: 'Bodemrisico', group: 'ondergrond', color: '#C0392B', countKey: 'vervuildeGrond', defaultOn: true },
];

const BELEMMERING_KLEUR: Record<string, string> = {
  weg: '#E67E22',
  watergang: '#1ABC9C',
  spoor: '#8E44AD',
  natuur: '#27AE60',
};

const BASEMAPS: Record<
  BasemapId,
  { label: string; tiles: string[]; attribution: string; maxzoom?: number; vanafZoom?: number }
> = {
  bgt: {
    label: BASEMAP_OPTIONS.bgt,
    tiles: [
      'https://service.pdok.nl/lv/bgt/wmts/v1_0/standaardvisualisatie/EPSG:3857/{z}/{x}/{y}.png',
    ],
    attribution: '© Kadaster / PDOK BGT',
    maxzoom: 19,
    // PDOK rendert de BGT-visualisatie pas vanaf dit zoomniveau
    vanafZoom: 16.5,
  },
  brt: {
    label: BASEMAP_OPTIONS.brt,
    tiles: [
      'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',
    ],
    attribution: '© Kadaster / PDOK',
    maxzoom: 19,
  },
  osm: {
    label: BASEMAP_OPTIONS.osm,
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap',
    maxzoom: 19,
  },
  luchtfoto: {
    label: BASEMAP_OPTIONS.luchtfoto,
    tiles: [
      'https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?bbox={bbox-epsg-3857}&format=image/jpeg&service=WMS&version=1.3.0&request=GetMap&crs=EPSG:3857&width=256&height=256&layers=Actueel_orthoHR',
    ],
    attribution: '© Kadaster / PDOK Luchtfoto',
    maxzoom: 21,
  },
};

function popupHtml(title: string, rows: [string, string][]): string {
  const rowsHtml = rows
    .map(([k, v]) => `<div><span style="color:#888">${k}</span> ${v}</div>`)
    .join('');
  return `<div style="font-family:system-ui;font-size:12px;max-width:220px">
    <strong>${title}</strong>${rowsHtml ? `<div style="margin-top:4px;line-height:1.5">${rowsHtml}</div>` : ''}
  </div>`;
}

function offsetLine(
  coords: [number, number, number?][],
  offsetM: number
): [number, number, number?][] {
  if (coords.length < 2) return coords;
  return coords.map(([x, y, z], i) => {
    const prev = coords[Math.max(0, i - 1)];
    const next = coords[Math.min(coords.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    return [x + nx * offsetM, y + ny * offsetM, z];
  });
}

function buildTraceFeaturesForMap(
  traces: MapTrace[],
  selectedTraceId: string | undefined,
  overrideLines: TraceLines | null,
  traceLineWidth: number,
  multiLineMode: boolean
): GeoJSON.Feature[] {
  const selectedWidth = traceLineWidth + 2;

  return traces.flatMap((trace) => {
    const isSelected = trace.id === selectedTraceId;
    const lines =
      isSelected && overrideLines
        ? overrideLines
        : trace.traceLines?.length
          ? trace.traceLines
          : [trace.coordinates];

    if (multiLineMode && lines.length === 1 && lines[0].length >= 2) {
      const offsets = [-1, 0, 1];
      return offsets.map((offset, li) => ({
        type: 'Feature' as const,
        properties: {
          id: trace.id,
          code: trace.code,
          naam: trace.naam,
          kleur: trace.kleur,
          selected: isSelected,
          lineIdx: li,
        },
        geometry: lineForMap(offsetLine(lines[0], offset)),
      }));
    }

    return lines
      .filter((line) => line.length >= 2)
      .map((line, li) => ({
        type: 'Feature' as const,
        properties: {
          id: trace.id,
          code: trace.code,
          naam: trace.naam,
          kleur: trace.kleur,
          selected: isSelected,
          lineIdx: li,
        },
        geometry: lineForMap(line),
      }));
  });
}

function buildVertexFeaturesForMap(
  lines: TraceLines,
  active?: { lineIdx: number; vertexIdx: number }
): GeoJSON.Feature[] {
  return lines.flatMap((line, lineIdx) =>
    line.map((coord, idx) => ({
      type: 'Feature' as const,
      properties: {
        idx,
        lineIdx,
        isLast: idx === line.length - 1,
        isFirst: idx === 0,
        isActive:
          active?.lineIdx === lineIdx && active?.vertexIdx === idx,
      },
      geometry: pointToMapGeoJson(coord[0], coord[1]),
    }))
  );
}

function updateTraceSourcesOnMap(
  map: MapLibreMap,
  traces: MapTrace[],
  selectedTraceId: string | undefined,
  workingLines: TraceLines | null,
  traceLineWidth: number,
  multiLineMode: boolean,
  activeVertex?: { lineIdx: number; vertexIdx: number }
) {
  const traceSource = map.getSource('traces-source') as
    | { setData: (data: GeoJSON.FeatureCollection) => void }
    | undefined;
  const vertexSource = map.getSource('trace-vertices-source') as
    | { setData: (data: GeoJSON.FeatureCollection) => void }
    | undefined;

  if (traceSource?.setData) {
    traceSource.setData({
      type: 'FeatureCollection',
      features: buildTraceFeaturesForMap(
        traces,
        selectedTraceId,
        workingLines,
        traceLineWidth,
        multiLineMode
      ),
    });
  }

  if (vertexSource?.setData && workingLines) {
    vertexSource.setData({
      type: 'FeatureCollection',
      features: buildVertexFeaturesForMap(workingLines, activeVertex),
    });
  }
}

type GeoJsonSource = { setData: (data: GeoJSON.FeatureCollection) => void };

/**
 * Veilige check of de kaartstijl beschikbaar is. Na map.remove() of tijdens
 * een stijl-reload is de interne `style` undefined; getSource/addLayer
 * gooien dan "Cannot read properties of undefined (reading 'getSource')".
 * isStyleLoaded() controleert `this.style` eerst en gooit niet.
 */
function styleKlaar(map: MapLibreMap | null): map is MapLibreMap {
  try {
    return !!map && typeof map.isStyleLoaded === 'function' && map.isStyleLoaded() === true;
  } catch {
    return false;
  }
}

/** Tracé- en tekenlagen apart bijwerken — voorkomt volledige GIS-rebuild bij elke klik. */
function ensureTraceLayers(
  map: MapLibreMap,
  options: {
    traces: MapTrace[];
    selectedTraceId?: string;
    traceLineWidth: number;
    multiLineMode: boolean;
    drawMode: DrawMode;
    showTraces: boolean;
    autoWaypoints?: { x: number; y: number }[];
  }
): void {
  const {
    traces,
    selectedTraceId,
    traceLineWidth,
    multiLineMode,
    drawMode,
    showTraces,
    autoWaypoints = [],
  } = options;
  const selectedWidth = traceLineWidth + 2;

  if (drawMode === 'none') {
    if (map.getLayer('trace-vertices-circle')) map.removeLayer('trace-vertices-circle');
    if (map.getSource('trace-vertices-source')) map.removeSource('trace-vertices-source');
    if (map.getLayer('auto-waypoints-circle')) map.removeLayer('auto-waypoints-circle');
    if (map.getSource('auto-waypoints-source')) map.removeSource('auto-waypoints-source');
  }

  if (!showTraces || traces.length === 0) {
    if (map.getLayer('traces-line')) map.removeLayer('traces-line');
    if (map.getSource('traces-source')) map.removeSource('traces-source');
    return;
  }

  const traceFeatures = buildTraceFeaturesForMap(
    traces,
    selectedTraceId,
    null,
    traceLineWidth,
    multiLineMode
  );
  const traceData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: traceFeatures,
  };

  const traceSource = map.getSource('traces-source') as GeoJsonSource | undefined;
  if (traceSource?.setData) {
    traceSource.setData(traceData);
  } else {
    map.addSource('traces-source', { type: 'geojson', data: traceData });
  }

  if (traceFeatures.length > 0 && !map.getLayer('traces-line')) {
    map.addLayer({
      id: 'traces-line',
      type: 'line',
      source: 'traces-source',
      paint: {
        'line-color': ['get', 'kleur'],
        'line-width': [
          'case',
          ['get', 'selected'],
          selectedWidth,
          traceLineWidth,
        ],
        'line-opacity': 0.95,
      },
    });
  } else if (traceFeatures.length === 0 && map.getLayer('traces-line')) {
    map.removeLayer('traces-line');
  }

  if (drawMode === 'auto' && autoWaypoints.length > 0) {
    const wpFeatures: GeoJSON.Feature[] = autoWaypoints.map((wp, idx) => {
      const [lng, lat] = rdToWgs84(wp.x, wp.y);
      return {
        type: 'Feature',
        properties: {
          idx,
          isFirst: idx === 0,
          isLast: idx === autoWaypoints.length - 1,
        },
        geometry: { type: 'Point', coordinates: [lng, lat] },
      };
    });
    const wpData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: wpFeatures };
    const wpSource = map.getSource('auto-waypoints-source') as GeoJsonSource | undefined;
    if (wpSource?.setData) {
      wpSource.setData(wpData);
    } else {
      map.addSource('auto-waypoints-source', { type: 'geojson', data: wpData });
      map.addLayer({
        id: 'auto-waypoints-circle',
        type: 'circle',
        source: 'auto-waypoints-source',
        paint: {
          'circle-radius': ['case', ['get', 'isFirst'], 10, ['get', 'isLast'], 10, 8],
          'circle-color': [
            'case',
            ['get', 'isFirst'],
            '#27AE60',
            ['get', 'isLast'],
            '#FF4D1C',
            '#2D6FE8',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }
  } else {
    if (map.getLayer('auto-waypoints-circle')) map.removeLayer('auto-waypoints-circle');
    if (map.getSource('auto-waypoints-source')) map.removeSource('auto-waypoints-source');
  }

  if (drawMode !== 'none' && drawMode !== 'auto' && selectedTraceId) {
    const selectedTrace = traces.find((t) => t.id === selectedTraceId);
    if (!selectedTrace) return;

    const lines = getTraceLines(selectedTrace);
    const vertexFeatures = buildVertexFeaturesForMap(lines);
    if (vertexFeatures.length === 0) {
      if (map.getLayer('trace-vertices-circle')) map.removeLayer('trace-vertices-circle');
      if (map.getSource('trace-vertices-source')) map.removeSource('trace-vertices-source');
      return;
    }

    const vertexData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: vertexFeatures,
    };
    const vertexSource = map.getSource('trace-vertices-source') as GeoJsonSource | undefined;
    if (vertexSource?.setData) {
      vertexSource.setData(vertexData);
    } else {
      map.addSource('trace-vertices-source', { type: 'geojson', data: vertexData });
      map.addLayer({
        id: 'trace-vertices-circle',
        type: 'circle',
        source: 'trace-vertices-source',
        paint: {
          'circle-radius': [
            'case',
            ['get', 'isActive'],
            12,
            ['get', 'isLast'],
            drawMode === 'edit' ? 10 : 8,
            ['get', 'isFirst'],
            drawMode === 'edit' ? 9 : 7,
            drawMode === 'edit' ? 8 : 6,
          ],
          'circle-color': [
            'case',
            ['get', 'isActive'],
            '#FF4D1C',
            ['get', 'isLast'],
            '#2D6FE8',
            ['get', 'isFirst'],
            '#27AE60',
            '#ffffff',
          ],
          'circle-stroke-width': ['case', ['get', 'isActive'], 3, 2],
          'circle-stroke-color': ['case', ['get', 'isActive'], '#ffffff', '#2D6FE8'],
        },
      });
    }
  }
}

function ensureRouteAlternativeLayers(
  map: MapLibreMap,
  alternatives: {
    id: string;
    label: string;
    traceLines: [number, number, number][][];
    selected: boolean;
  }[]
): void {
  const layerId = 'route-alternatives-line';
  const sourceId = 'route-alternatives-source';

  const features: GeoJSON.Feature[] = [];
  for (const alt of alternatives) {
    if (alt.selected) continue;
    for (const line of alt.traceLines) {
      if (line.length < 2) continue;
      features.push({
        type: 'Feature',
        properties: { id: alt.id, label: alt.label },
        geometry: lineForMap(line),
      });
    }
  }

  if (features.length === 0) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    return;
  }

  const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
  const source = map.getSource(sourceId) as GeoJsonSource | undefined;
  if (source?.setData) {
    source.setData(data);
  } else {
    map.addSource(sourceId, { type: 'geojson', data });
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#94A3B8',
        'line-width': 3,
        'line-opacity': 0.75,
        'line-dasharray': [4, 3],
      },
    });
  }
}

/**
 * Markeert deeltracés die door bebouwing of particulier terrein lopen
 * (best-effort routering). Bebouwing = rood doorgetrokken, privaat = amber
 * gestreept. 'ok'-delen worden niet apart getekend (de gewone tracélaag dekt ze).
 */
function ensureMarkedSegmentLayers(
  map: MapLibreMap,
  segments: {
    marker: 'ok' | 'door_bebouwing' | 'door_privaat';
    coordinates: [number, number, number][];
  }[]
): void {
  const sourceId = 'marked-segments-source';
  const bebouwingLayer = 'marked-segments-bebouwing';
  const privaatLayer = 'marked-segments-privaat';

  const features: GeoJSON.Feature[] = [];
  for (const seg of segments) {
    if (seg.marker === 'ok' || seg.coordinates.length < 2) continue;
    features.push({
      type: 'Feature',
      properties: { marker: seg.marker },
      geometry: lineForMap(seg.coordinates),
    });
  }

  if (features.length === 0) {
    for (const id of [bebouwingLayer, privaatLayer]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    return;
  }

  const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
  const source = map.getSource(sourceId) as GeoJsonSource | undefined;
  if (source?.setData) {
    source.setData(data);
    return;
  }
  map.addSource(sourceId, { type: 'geojson', data });
  map.addLayer({
    id: bebouwingLayer,
    type: 'line',
    source: sourceId,
    filter: ['==', ['get', 'marker'], 'door_bebouwing'],
    paint: { 'line-color': '#DC2626', 'line-width': 5, 'line-opacity': 0.95 },
  });
  map.addLayer({
    id: privaatLayer,
    type: 'line',
    source: sourceId,
    filter: ['==', ['get', 'marker'], 'door_privaat'],
    paint: {
      'line-color': '#D97706',
      'line-width': 5,
      'line-opacity': 0.9,
      'line-dasharray': [3, 2],
    },
  });
}

/**
 * Markeert de particuliere percelen waarop een zakelijk recht (ZRO) gevestigd
 * moet worden: opvallende amber vlak + dikke gestreepte rand + perceelnummer.
 * Onderscheidt zich van de algemene (lichte) BRK-percelenlaag.
 */
function ensureZroPercelenLayers(
  map: MapLibreMap,
  percelen: {
    perceelnummer: string;
    polygon: [number, number][];
    eigenaar: string;
    status: string;
    lengteM: number;
    oppervlakteM2?: number;
  }[]
): void {
  const sourceId = 'zro-percelen-source';
  const fillLayer = 'zro-percelen-fill';
  const lineLayer = 'zro-percelen-line';
  const labelLayer = 'zro-percelen-label';

  const features: GeoJSON.Feature[] = percelen
    .filter((p) => p.polygon && p.polygon.length >= 4)
    .map((p) => ({
      type: 'Feature',
      properties: {
        perceelnummer: p.perceelnummer,
        eigenaar: p.eigenaar,
        status: p.status,
        lengteM: p.lengteM,
        oppervlakteM2: p.oppervlakteM2 ?? null,
      },
      geometry: polygonForLayer(p.polygon),
    }));

  if (features.length === 0) {
    for (const id of [labelLayer, lineLayer, fillLayer]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    return;
  }

  const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
  const source = map.getSource(sourceId) as GeoJsonSource | undefined;
  if (source?.setData) {
    source.setData(data);
    return;
  }

  map.addSource(sourceId, { type: 'geojson', data });
  map.addLayer({
    id: fillLayer,
    type: 'fill',
    source: sourceId,
    paint: { 'fill-color': '#D97706', 'fill-opacity': 0.18 },
  });
  map.addLayer({
    id: lineLayer,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': '#B45309',
      'line-width': 2.5,
      'line-opacity': 0.95,
      'line-dasharray': [2, 1],
    },
  });
  map.addLayer({
    id: labelLayer,
    type: 'symbol',
    source: sourceId,
    layout: {
      'text-field': ['get', 'perceelnummer'],
      'text-size': 11,
    },
    paint: {
      'text-color': '#7C2D12',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.6,
    },
  });
}

export function TraceMap({
  traces,
  bestaandNet = [],
  conflicten = [],
  layerData,
  lazyLayers = false,
  loadingLayers = [],
  selectedTraceId,
  selectedConflictId = null,
  dataSource = 'demo',
  height = '100%',
  showLayerPanel = false,
  traceLineWidth = 4,
  multiLineMode = false,
  drawMode = 'none',
  autoWaypoints = [],
  routeAlternatives = [],
  markedSegments = [],
  zroPercelen = [],
  onMapClick,
  onTraceLinesChange,
  onViewportChange,
  onLayerToggle,
  onLayerControlReady,
  cadOpties,
  onTekenStatus,
  meetPunten = [],
  bematingen = [],
  bematingPunten = [],
  netontwerpAssets,
  bodemSignalen,
  plaatsModusActief = false,
  onAssetClick,
  onAssetVerplaats,
}: TraceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<MapLibrePopup | null>(null);
  const maplibreRef = useRef<MapLibreCDN | null>(null);
  const streetViewModeRef = useRef(false);
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  const plaatsModusRef = useRef(plaatsModusActief);
  plaatsModusRef.current = plaatsModusActief;
  const onAssetClickRef = useRef(onAssetClick);
  onAssetClickRef.current = onAssetClick;
  const onAssetVerplaatsRef = useRef(onAssetVerplaats);
  onAssetVerplaatsRef.current = onAssetVerplaats;
  const cadOptiesRef = useRef(cadOpties);
  cadOptiesRef.current = cadOpties;
  const onTekenStatusRef = useRef(onTekenStatus);
  onTekenStatusRef.current = onTekenStatus;
  /** Laatst (gesnapte/ortho-)aangepaste cursorpositie in RD — gebruikt bij klik en maatinvoer */
  const cadCursorRef = useRef<{ x: number; y: number } | null>(null);
  const maatBufferRef = useRef('');
  const laatsteTekenStatusRef = useRef<TekenStatus | null>(null);
  const tracesRef = useRef(traces);
  tracesRef.current = traces;
  const selectedTraceIdRef = useRef(selectedTraceId);
  selectedTraceIdRef.current = selectedTraceId;
  const traceLineWidthRef = useRef(traceLineWidth);
  traceLineWidthRef.current = traceLineWidth;
  const multiLineModeRef = useRef(multiLineMode);
  multiLineModeRef.current = multiLineMode;
  const onTraceLinesChangeRef = useRef(onTraceLinesChange);
  onTraceLinesChangeRef.current = onTraceLinesChange;
  const skipClickRef = useRef(false);
  const dragRef = useRef<{
    lines: TraceLines;
    lineIdx: number;
    vertexIdx: number;
    moved: boolean;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // BGT als standaard: exacte pandcontouren in plaats van gegeneraliseerde BRT-blokken
  const [basemap, setBasemap] = useState<BasemapId>('bgt');
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [streetViewPoint, setStreetViewPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    topografie: true,
    kadaster: true,
    ondergrond: true,
    netwerk: true,
  });

  const hasGisData = lazyLayers || Boolean(layerData);

  const layerCount = (key: keyof MapLayerData): number => {
    const value = layerData?.[key];
    return Array.isArray(value) ? value.length : 0;
  };

  const layerToggles = useMemo((): LayerToggle[] => {
    const toggles: LayerToggle[] = [
      {
        id: 'traces',
        label: 'Ontwerptracés',
        group: 'netwerk',
        count: traces.length,
        defaultOn: true,
      },
    ];

    if (lazyLayers) {
      for (const def of LAZY_GIS_LAYERS) {
        toggles.push({
          id: def.id,
          label: def.label,
          group: def.group,
          count: layerCount(def.countKey),
          color: def.color,
          defaultOn: def.defaultOn ?? false,
          loading: loadingLayers.includes(def.id),
        });
      }
    } else if (hasGisData) {
      if (layerCount('bgt') > 0) {
        toggles.push({
          id: 'bgt',
          label: 'BGT topografie',
          group: 'topografie',
          count: layerCount('bgt'),
          color: BGT_STIJL.weg.fill,
          defaultOn: true,
        });
      } else {
        toggles.push({
          id: 'wegen-demo',
          label: 'Wegen',
          group: 'topografie',
          count: DEMO_WEG_COUNT,
          color: '#94A3B8',
          defaultOn: true,
        });
      }

      if (layerCount('bomen') > 0) {
        toggles.push({ id: 'bomen', label: 'Bomen (BGT)', group: 'topografie', count: layerCount('bomen'), color: '#2E8B57', defaultOn: true });
      }
      if (layerCount('nwb') > 0) {
        toggles.push({ id: 'nwb', label: 'NWB wegen', group: 'topografie', count: layerCount('nwb'), color: '#7F8C8D', defaultOn: true });
      }
      if (layerCount('percelen') > 0) {
        toggles.push({ id: 'percelen', label: 'BRK percelen', group: 'kadaster', count: layerCount('percelen'), color: '#E74C3C', defaultOn: true });
      }
      if (layerCount('watergangen') > 0) {
        toggles.push({ id: 'watergangen', label: 'Watergangen', group: 'topografie', count: layerCount('watergangen'), color: '#2980B9', defaultOn: true });
      }
      if (layerCount('kunstwerken') > 0) {
        toggles.push({ id: 'kunstwerken', label: 'Kunstwerken', group: 'topografie', count: layerCount('kunstwerken'), color: '#16A085', defaultOn: true });
      }
      if (layerCount('belemmeringen') > 0) {
        toggles.push({ id: 'belemmeringen', label: 'Belemmeringen', group: 'topografie', count: layerCount('belemmeringen'), color: '#E67E22', defaultOn: true });
      }
      if (layerCount('natura2000') > 0) {
        toggles.push({ id: 'natura2000', label: 'Natura2000', group: 'topografie', count: layerCount('natura2000'), color: '#27AE60', defaultOn: false });
      }
      if (layerCount('sonderingen') > 0) {
        toggles.push({ id: 'sonderingen', label: 'BRO sonderingen', group: 'ondergrond', count: layerCount('sonderingen'), color: '#8B4513', defaultOn: true });
      }
      if (layerCount('grondwater') > 0) {
        toggles.push({ id: 'grondwater', label: 'Grondwaterstand', group: 'ondergrond', count: layerCount('grondwater'), color: '#3498DB', defaultOn: true });
      }
      if (layerCount('vervuildeGrond') > 0) {
        toggles.push({ id: 'vervuilde-grond', label: 'Bodemrisico', group: 'ondergrond', count: layerCount('vervuildeGrond'), color: '#C0392B', defaultOn: true });
      }
    } else {
      toggles.push({
        id: 'wegen-demo',
        label: 'Wegen',
        group: 'topografie',
        count: DEMO_WEG_COUNT,
        color: '#94A3B8',
        defaultOn: true,
      });
      toggles.push({
        id: 'riolering-demo',
        label: 'Riolering',
        group: 'netwerk',
        count: DEMO_RIOLERING_COUNT,
        color: IMKL_COLORS.rioolVrijverfall,
        defaultOn: true,
      });
    }

    if (bestaandNet.length > 0) {
      toggles.push({
        id: 'klic',
        label: 'Bestaand net (KLIC)',
        group: 'netwerk',
        count: bestaandNet.length,
        color: IMKL_COLORS.laagspanning,
        defaultOn: true,
      });
    }

    if (conflicten.length > 0) {
      toggles.push({
        id: 'conflicts',
        label: 'Conflicten',
        group: 'netwerk',
        count: conflicten.length,
        color: ERNST_KLEUREN.blokkerend,
        defaultOn: true,
      });
    }

    return toggles;
  }, [
    traces.length,
    bestaandNet.length,
    conflicten.length,
    lazyLayers,
    hasGisData,
    loadingLayers,
    layerData?.bgt?.length ?? 0,
    layerData?.bomen?.length ?? 0,
    layerData?.nwb?.length ?? 0,
    layerData?.percelen?.length ?? 0,
    layerData?.watergangen?.length ?? 0,
    layerData?.kunstwerken?.length ?? 0,
    layerData?.belemmeringen?.length ?? 0,
    layerData?.natura2000?.length ?? 0,
    layerData?.sonderingen?.length ?? 0,
    layerData?.grondwater?.length ?? 0,
    layerData?.vervuildeGrond?.length ?? 0,
  ]);

  const defaultLayerVisibility = useMemo(() => {
    const defaults: Record<string, boolean> = {};
    for (const toggle of layerToggles) {
      defaults[toggle.id] = toggle.defaultOn;
    }
    return defaults;
  }, [layerToggles]);

  const isVisible = useCallback(
    (id: string) => layerVisibility[id] ?? defaultLayerVisibility[id] ?? true,
    [layerVisibility, defaultLayerVisibility]
  );

  const toggleLayer = (id: string) => {
    const nextVisible = !isVisible(id);
    setLayerVisibility((prev) => ({ ...prev, [id]: nextVisible }));
    onLayerToggle?.(id, nextVisible);
  };

  const setLayersVisible = useCallback(
    (ids: string[], visible: boolean) => {
      setLayerVisibility((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          next[id] = visible;
          if (lazyLayers && isFetchableMapLayer(id)) {
            onLayerToggle?.(id, visible);
          }
        }
        return next;
      });
    },
    [lazyLayers, onLayerToggle]
  );

  const toggleAllLayers = useCallback(
    (visible: boolean) => {
      setLayersVisible(
        layerToggles.map((toggle) => toggle.id),
        visible
      );
    },
    [layerToggles, setLayersVisible]
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const traceIdsKey = traces.map((t) => t.id).join(',');
  const mapInitKey = useMemo(
    () => `${selectedTraceId ?? 'none'}:${traceIdsKey}`,
    [selectedTraceId, traceIdsKey]
  );

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;
    let map: MapLibreMap | null = null;

    const center = mapCenterFromTraces(traces);

    void (async () => {
      const maplibreModule = await loadMapLibre();
      if (cancelled || !mapContainer.current) return;

      maplibreRef.current = maplibreModule;

      map = new maplibreModule.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            // Terugvallaag: BRT op afstand (BGT rendert pas vanaf zoom ~16)
            'basemap-fallback': {
              type: 'raster',
              tiles: BASEMAPS.brt.tiles,
              tileSize: 256,
              attribution: BASEMAPS.brt.attribution,
              maxzoom: BASEMAPS.brt.maxzoom ?? 19,
            },
            basemap: {
              type: 'raster',
              tiles: BASEMAPS[basemap].tiles,
              tileSize: 256,
              attribution: BASEMAPS[basemap].attribution,
              maxzoom: BASEMAPS[basemap].maxzoom ?? 19,
            },
          },
          layers: [
            { id: 'basemap-fallback', type: 'raster', source: 'basemap-fallback' },
            {
              id: 'basemap',
              type: 'raster',
              source: 'basemap',
              minzoom: BASEMAPS[basemap].vanafZoom ?? 0,
            },
          ],
        },
        center: center as [number, number],
        zoom: 14,
      });

      map.addControl(new maplibreModule.NavigationControl(), 'top-right');
      map.addControl(new maplibreModule.ScaleControl({ unit: 'metric' }), 'bottom-left');
      map.on('load', () => {
        map?.resize();
        if (!cancelled) setMapReady(true);
      });
      mapRef.current = map;
      requestAnimationFrame(() => map?.resize());
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      popupRef.current?.remove();
      popupRef.current = null;
      map?.remove();
      mapRef.current = null;
      maplibreRef.current = null;
    };
  }, [mapInitKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource('basemap') as { setTiles: (tiles: string[]) => void } | undefined;
    if (source?.setTiles) {
      source.setTiles(BASEMAPS[basemap].tiles);
    }
    // BGT rendert pas vanaf zoom ~16: daaronder valt de kaart terug op BRT
    map.setLayerZoomRange('basemap', BASEMAPS[basemap].vanafZoom ?? 0, 24);
  }, [basemap, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !onViewportChange) return;

    const reportViewport = () => {
      const bounds = map.getBounds();
      onViewportChange({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      });
    };

    map.on('moveend', reportViewport);
    reportViewport();

    return () => {
      map.off('moveend', reportViewport);
    };
  }, [mapReady, onViewportChange]);

  useEffect(() => {
    streetViewModeRef.current = streetViewMode;
  }, [streetViewMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onClick = (...args: unknown[]) => {
      const e = args[0] as {
        lngLat: { lng: number; lat: number };
        originalEvent?: MouseEvent;
      };
      if ((drawModeRef.current !== 'none' || plaatsModusRef.current) && onMapClick) {
        if (skipClickRef.current) {
          skipClickRef.current = false;
          return;
        }
        // CAD: gebruik de gesnapte/ortho-gecorrigeerde cursorpositie
        const cad = cadCursorRef.current;
        if (cad && drawModeRef.current === 'draw') {
          const [lng, lat] = rdToWgs84(cad.x, cad.y);
          onMapClick(lng, lat, { alt: Boolean(e.originalEvent?.altKey) });
          return;
        }
        onMapClick(e.lngLat.lng, e.lngLat.lat, { alt: Boolean(e.originalEvent?.altKey) });
        return;
      }
      if (!streetViewMode) return;
      setStreetViewPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };

    map.on('click', onClick);
    map.getCanvas().style.cursor =
      drawMode === 'edit'
        ? 'default'
        : drawMode !== 'none' || plaatsModusActief || streetViewMode
          ? 'crosshair'
          : '';

    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
    };
  }, [mapReady, streetViewMode, drawMode, plaatsModusActief, onMapClick]);

  // Netontwerp-assets: stations/moffen (punten) + mantelbuizen (lijnen)
  useEffect(() => {
    const map = mapRef.current;
    const maplibreModule = maplibreRef.current;
    if (!styleKlaar(map) || !maplibreModule) return;

    const puntData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: netontwerpAssets?.punten ?? [],
    };
    const lijnData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: netontwerpAssets?.lijnen ?? [],
    };

    const puntSource = map.getSource('netontwerp-assets-punt') as
      | { setData: (d: GeoJSON.FeatureCollection) => void }
      | undefined;
    if (puntSource) {
      puntSource.setData(puntData);
      (map.getSource('netontwerp-assets-lijn') as { setData: (d: GeoJSON.FeatureCollection) => void })
        ?.setData(lijnData);
      return;
    }
    if (puntData.features.length === 0 && lijnData.features.length === 0) return;

    map.addSource('netontwerp-assets-lijn', { type: 'geojson', data: lijnData });
    map.addLayer({
      id: 'netontwerp-mantelbuis-line',
      type: 'line',
      source: 'netontwerp-assets-lijn',
      paint: {
        'line-color': ['get', 'kleur'],
        'line-width': 7,
        'line-opacity': 0.7,
        'line-dasharray': [2, 1],
      },
    });

    map.addSource('netontwerp-assets-punt', { type: 'geojson', data: puntData });
    map.addLayer({
      id: 'netontwerp-assets-circle',
      type: 'circle',
      source: 'netontwerp-assets-punt',
      paint: {
        'circle-radius': ['match', ['get', 'assetType'], 'station', 10, 5],
        'circle-color': ['get', 'kleur'],
        'circle-stroke-width': ['match', ['get', 'assetType'], 'station', 3, 1.5],
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
      },
    });
    map.addLayer({
      id: 'netontwerp-assets-label',
      type: 'symbol',
      source: 'netontwerp-assets-punt',
      minzoom: 14,
      layout: {
        'text-field': ['get', 'naam'],
        'text-size': 10,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#1F2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });

    const onAssetLayerClick = (...args: unknown[]) => {
      const e = args[0] as { features?: { properties?: Record<string, unknown> }[] };
      const id = e.features?.[0]?.properties?.id;
      if (id && onAssetClickRef.current) {
        skipClickRef.current = true;
        onAssetClickRef.current(String(id));
      }
    };
    map.on('click', 'netontwerp-assets-circle', onAssetLayerClick);
    map.on('click', 'netontwerp-mantelbuis-line', onAssetLayerClick);
  }, [netontwerpAssets, mapReady]);

  // Bodem-vooronderzoek: WBB-signalen (4326 GeoJSON) als fill + omtrek.
  useEffect(() => {
    const map = mapRef.current;
    if (!styleKlaar(map)) return;

    const data: GeoJSON.FeatureCollection = bodemSignalen ?? {
      type: 'FeatureCollection',
      features: [],
    };

    const bron = map.getSource('bodem-wbb-source') as
      | { setData: (d: GeoJSON.FeatureCollection) => void }
      | undefined;
    if (bron) {
      bron.setData(data);
      return;
    }
    if (data.features.length === 0) return;

    map.addSource('bodem-wbb-source', { type: 'geojson', data });
    map.addLayer({
      id: 'bodem-wbb-fill',
      type: 'fill',
      source: 'bodem-wbb-source',
      paint: {
        // Kleur op ernst: 'verontreinig' in statusOordeel = kritisch (rood), anders let-op (oranje).
        'fill-color': [
          'case',
          ['in', 'verontreinig', ['downcase', ['coalesce', ['get', 'statusOordeel'], '']]],
          '#C0392B',
          '#E67E22',
        ],
        'fill-opacity': 0.4,
        'fill-outline-color': '#5d2c26',
      },
    });
  }, [bodemSignalen, mapReady]);

  // ── CAD-tekengereedschap: rubber band, OSNAP-marker, maatinvoer, meetlijn ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const zorgVoorBronnen = () => {
      if (!styleKlaar(map)) return;
      if (!map.getSource('cad-preview')) {
        map.addSource('cad-preview', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'cad-preview-line',
          type: 'line',
          source: 'cad-preview',
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: { 'line-color': '#2D6FE8', 'line-width': 1.5, 'line-dasharray': [3, 2] },
        });
        map.addLayer({
          id: 'cad-preview-label',
          type: 'symbol',
          source: 'cad-preview',
          filter: ['==', ['geometry-type'], 'Point'],
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-offset': [0, -1.2],
            'text-anchor': 'bottom',
          },
          paint: { 'text-color': '#1d4ed8', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 },
        });
      }
      if (!map.getSource('cad-snap')) {
        map.addSource('cad-snap', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'cad-snap-marker',
          type: 'circle',
          source: 'cad-snap',
          paint: {
            'circle-radius': 6,
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#16A34A',
          },
        });
      }
    };

    const zetPreview = (features: GeoJSON.Feature[]) => {
      if (!styleKlaar(map)) return;
      (map.getSource('cad-preview') as { setData: (d: GeoJSON.FeatureCollection) => void } | undefined)
        ?.setData({ type: 'FeatureCollection', features });
    };
    const zetSnap = (features: GeoJSON.Feature[]) => {
      if (!styleKlaar(map)) return;
      (map.getSource('cad-snap') as { setData: (d: GeoJSON.FeatureCollection) => void } | undefined)
        ?.setData({ type: 'FeatureCollection', features });
    };

    const laatsteVertex = (): { x: number; y: number } | null => {
      const trace = tracesRef.current.find((t) => t.id === selectedTraceIdRef.current);
      if (!trace) return null;
      const lines = getTraceLines(trace);
      const laatste = lines[lines.length - 1]?.at(-1);
      return laatste ? { x: laatste[0], y: laatste[1] } : null;
    };

    const onMouseMove = (...args: unknown[]) => {
      if (drawModeRef.current !== 'draw') return;
      const e = args[0] as { lngLat: { lng: number; lat: number } };
      const [rdX, rdY] = wgs84ToRd(e.lngLat.lng, e.lngLat.lat);
      const opties = cadOptiesRef.current;
      zorgVoorBronnen();

      // 1. OSNAP op alle tracégeometrie (eindpunt/vertex vóór lijn)
      let punt = { x: rdX, y: rdY };
      let snapType: SnapType | undefined;
      if (opties?.osnap) {
        const doelen = tracesRef.current.map((t) => ({ lines: getTraceLines(t) }));
        const snap = snapPunt(rdX, rdY, doelen);
        if (snap) {
          punt = { x: snap.x, y: snap.y };
          snapType = snap.type;
        }
      }
      // 2. Ortho (alleen wanneer er al een vorig punt is en er niet gesnapt is)
      const vorig = laatsteVertex();
      if (opties?.ortho && vorig && !snapType) {
        punt = orthoPunt(vorig, punt);
      }
      cadCursorRef.current = punt;

      // 3. Rubber band + maatlabel
      const features: GeoJSON.Feature[] = [];
      let lengteM: number | undefined;
      let hoekDeg: number | undefined;
      if (vorig) {
        const maat = segmentMaat(vorig, punt);
        lengteM = maat.lengteM;
        hoekDeg = maat.hoekDeg;
        const [lngA, latA] = rdToWgs84(vorig.x, vorig.y);
        const [lngB, latB] = rdToWgs84(punt.x, punt.y);
        features.push(
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [[lngA, latA], [lngB, latB]] },
          },
          {
            type: 'Feature',
            properties: {
              label: `${maat.lengteM.toFixed(1)} m ∠${maat.hoekDeg.toFixed(0)}°${maatBufferRef.current ? ` · maat: ${maatBufferRef.current} m` : ''}`,
            },
            geometry: { type: 'Point', coordinates: [(lngA + lngB) / 2, (latA + latB) / 2] },
          },
        );
      }
      zetPreview(features);
      if (snapType) {
        const [lng, lat] = rdToWgs84(punt.x, punt.y);
        zetSnap([{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }]);
      } else {
        zetSnap([]);
      }

      laatsteTekenStatusRef.current = {
        rdX: punt.x,
        rdY: punt.y,
        snapType,
        lengteM,
        hoekDeg,
        maatBuffer: maatBufferRef.current || undefined,
      };
      onTekenStatusRef.current?.(laatsteTekenStatusRef.current);
    };

    const emitMaatBuffer = () => {
      const vorige = laatsteTekenStatusRef.current;
      if (!vorige) return;
      laatsteTekenStatusRef.current = { ...vorige, maatBuffer: maatBufferRef.current || undefined };
      onTekenStatusRef.current?.(laatsteTekenStatusRef.current);
    };

    // Maatinvoer: typ een afstand en bevestig met Enter (AutoCAD-stijl)
    const onKeyDown = (e: KeyboardEvent) => {
      if (drawModeRef.current !== 'draw') return;
      const doel = e.target as HTMLElement | null;
      if (doel && ['INPUT', 'TEXTAREA', 'SELECT'].includes(doel.tagName)) return;
      if (/^[0-9]$/.test(e.key) || e.key === '.' || e.key === ',') {
        maatBufferRef.current += e.key === ',' ? '.' : e.key;
        emitMaatBuffer();
        e.preventDefault();
      } else if (e.key === 'Backspace' && maatBufferRef.current) {
        maatBufferRef.current = maatBufferRef.current.slice(0, -1);
        emitMaatBuffer();
        e.preventDefault();
      } else if (e.key === 'Enter' && maatBufferRef.current) {
        const lengte = Number(maatBufferRef.current);
        const vorig = laatsteVertex();
        const cursor = cadCursorRef.current;
        if (Number.isFinite(lengte) && lengte > 0 && vorig && cursor && onMapClick) {
          const doelPunt = puntOpAfstand(vorig, cursor, lengte);
          const [lng, lat] = rdToWgs84(doelPunt.x, doelPunt.y);
          onMapClick(lng, lat);
        }
        maatBufferRef.current = '';
        emitMaatBuffer();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        maatBufferRef.current = '';
        emitMaatBuffer();
      }
    };

    map.on('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      map.off('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      cadCursorRef.current = null;
      maatBufferRef.current = '';
      // Tijdens unmount kan de kaart al verwijderd zijn (style undefined)
      if (styleKlaar(map)) {
        if (map.getSource('cad-preview')) zetPreview([]);
        if (map.getSource('cad-snap')) zetSnap([]);
      }
      onTekenStatusRef.current?.(null);
    };
  }, [mapReady, drawMode, onMapClick]);

  // Meetfunctie: meetlijn + totaallengte
  useEffect(() => {
    const map = mapRef.current;
    if (!styleKlaar(map)) return;
    const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    if (meetPunten.length >= 1) {
      const coords = meetPunten.map((p) => rdToWgs84(p.x, p.y));
      if (coords.length >= 2) {
        data.features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        });
        data.features.push({
          type: 'Feature',
          properties: { label: `Σ ${meetLengteM(meetPunten).toFixed(1)} m` },
          geometry: { type: 'Point', coordinates: coords[coords.length - 1] },
        });
      }
    }
    if (!map.getSource('cad-meet')) {
      if (data.features.length === 0) return;
      map.addSource('cad-meet', { type: 'geojson', data });
      map.addLayer({
        id: 'cad-meet-line',
        type: 'line',
        source: 'cad-meet',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#9333EA', 'line-width': 2, 'line-dasharray': [4, 2] },
      });
      map.addLayer({
        id: 'cad-meet-label',
        type: 'symbol',
        source: 'cad-meet',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: { 'text-field': ['get', 'label'], 'text-size': 12, 'text-offset': [0, -1], 'text-anchor': 'bottom' },
        paint: { 'text-color': '#7C3AED', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 },
      });
    } else {
      (map.getSource('cad-meet') as { setData: (d: GeoJSON.FeatureCollection) => void }).setData(data);
    }
  }, [meetPunten, mapReady]);

  // Bemating (lineair + hoek) van het geselecteerde tracé + lopende plaatsing
  useEffect(() => {
    const map = mapRef.current;
    if (!styleKlaar(map)) return;
    const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    const lijn = (pts: [number, number][]) => pts.map(([x, y]) => rdToWgs84(x, y));

    for (const b of bematingen) {
      const geo = bematingGeometrie(b);
      if (geo.type === 'lineair') {
        for (const seg of [geo.maatlijn, geo.extensie1, geo.extensie2]) {
          data.features.push({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: lijn([seg[0], seg[1]]) },
          });
        }
        data.features.push({
          type: 'Feature',
          properties: { label: geo.label },
          geometry: { type: 'Point', coordinates: rdToWgs84(geo.tekstPos[0], geo.tekstPos[1]) },
        });
      } else {
        data.features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: lijn(geo.boog) },
        });
        data.features.push({
          type: 'Feature',
          properties: { label: geo.label },
          geometry: { type: 'Point', coordinates: rdToWgs84(geo.tekstPos[0], geo.tekstPos[1]) },
        });
      }
    }
    // Lopende plaatsing: reeds geklikte punten als markers
    for (const [x, y] of bematingPunten) {
      data.features.push({
        type: 'Feature',
        properties: { punt: true },
        geometry: { type: 'Point', coordinates: rdToWgs84(x, y) },
      });
    }

    if (!map.getSource('cad-bemating')) {
      if (data.features.length === 0) return;
      map.addSource('cad-bemating', { type: 'geojson', data });
      map.addLayer({
        id: 'cad-bemating-line',
        type: 'line',
        source: 'cad-bemating',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#1f2937', 'line-width': 1.2 },
      });
      map.addLayer({
        id: 'cad-bemating-punt',
        type: 'circle',
        source: 'cad-bemating',
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'punt'], true]],
        paint: { 'circle-radius': 4, 'circle-color': '#1f2937', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff' },
      });
      map.addLayer({
        id: 'cad-bemating-label',
        type: 'symbol',
        source: 'cad-bemating',
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['!', ['has', 'punt']]],
        layout: { 'text-field': ['get', 'label'], 'text-size': 11, 'text-anchor': 'center' },
        paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.8 },
      });
    } else {
      (map.getSource('cad-bemating') as { setData: (d: GeoJSON.FeatureCollection) => void }).setData(data);
    }
  }, [bematingen, bematingPunten, mapReady]);

  // Netontwerp-assets verslepen (stations/moffen) — alleen aansluitingen niet
  const assetDragRef = useRef<{ assetId: string; moved: boolean } | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !onAssetVerplaats) return;

    const onMouseDown = (...args: unknown[]) => {
      if (!map.getLayer('netontwerp-assets-circle')) return;
      const e = args[0] as { point: { x: number; y: number }; preventDefault: () => void };
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['netontwerp-assets-circle'],
      });
      const props = features[0]?.properties as Record<string, unknown> | undefined;
      if (!props?.id || props.assetType === 'aansluiting') return;
      e.preventDefault();
      assetDragRef.current = { assetId: String(props.id), moved: false };
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
    };

    const onMouseMove = (...args: unknown[]) => {
      const drag = assetDragRef.current;
      if (!drag) return;
      drag.moved = true;
      const e = args[0] as { lngLat: { lng: number; lat: number } };
      const [x, y] = wgs84ToRd(e.lngLat.lng, e.lngLat.lat);
      onAssetVerplaatsRef.current?.(drag.assetId, x, y);
    };

    const finishDrag = () => {
      const drag = assetDragRef.current;
      if (!drag) return;
      assetDragRef.current = null;
      map.dragPan.enable();
      if (drag.moved) skipClickRef.current = true;
      map.getCanvas().style.cursor = '';
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', finishDrag);
    window.addEventListener('mouseup', finishDrag);
    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', finishDrag);
      window.removeEventListener('mouseup', finishDrag);
      assetDragRef.current = null;
      map.dragPan.enable();
    };
  }, [mapReady, onAssetVerplaats]);

  const tracePopupHandlerRef = useRef<((...args: unknown[]) => void) | null>(null);
  const zroPopupHandlerRef = useRef<((...args: unknown[]) => void) | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    const maplibreModule = maplibreRef.current;
    if (!map || !mapReady || !maplibreModule) return;

    ensureTraceLayers(map, {
      traces,
      selectedTraceId,
      traceLineWidth,
      multiLineMode,
      drawMode,
      showTraces: isVisible('traces'),
      autoWaypoints,
    });

    ensureRouteAlternativeLayers(map, routeAlternatives);
    ensureMarkedSegmentLayers(map, markedSegments);
    ensureZroPercelenLayers(map, zroPercelen);

    if (zroPopupHandlerRef.current) {
      map.off('click', 'zro-percelen-fill', zroPopupHandlerRef.current);
      zroPopupHandlerRef.current = null;
    }
    if (map.getLayer('zro-percelen-fill')) {
      const onZroClick = (...args: unknown[]) => {
        const e = args[0] as {
          lngLat: { lng: number; lat: number };
          features?: { properties?: Record<string, unknown> }[];
        };
        const p = e.features?.[0]?.properties ?? {};
        const rows: [string, string][] = [
          ['Eigenaar', String(p.eigenaar ?? '—')],
          ['Status', String(p.status ?? '—')],
          ['Lengte tracé', `${String(p.lengteM ?? '—')} m`],
        ];
        if (p.oppervlakteM2 != null) rows.push(['Oppervlakte', `${String(p.oppervlakteM2)} m²`]);
        popupRef.current?.remove();
        popupRef.current = new maplibreModule.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat(e.lngLat)
          .setHTML(popupHtml(`Perceel ${String(p.perceelnummer ?? '')} · zakelijk recht`, rows))
          .addTo(map);
      };
      map.on('click', 'zro-percelen-fill', onZroClick);
      zroPopupHandlerRef.current = onZroClick;
    }

    if (tracePopupHandlerRef.current) {
      map.off('click', 'traces-line', tracePopupHandlerRef.current);
      tracePopupHandlerRef.current = null;
    }

    if (drawMode === 'none' && isVisible('traces') && map.getLayer('traces-line')) {
      const onTraceClick = (...args: unknown[]) => {
        if (drawModeRef.current !== 'none' || streetViewModeRef.current) return;
        const e = args[0] as {
          lngLat: { lng: number; lat: number };
          features?: { properties?: Record<string, unknown> }[];
        };
        if (!e.features?.[0]) return;
        const props = e.features[0].properties ?? {};
        popupRef.current?.remove();
        popupRef.current = new maplibreModule.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui;font-size:12px"><strong>${String(props.code)}</strong><div style="margin-top:4px;color:#666">${String(props.naam)}</div></div>`
          )
          .addTo(map);
      };
      map.on('click', 'traces-line', onTraceClick);
      tracePopupHandlerRef.current = onTraceClick;
    }

    return () => {
      if (tracePopupHandlerRef.current) {
        map.off('click', 'traces-line', tracePopupHandlerRef.current);
        tracePopupHandlerRef.current = null;
      }
      if (zroPopupHandlerRef.current) {
        map.off('click', 'zro-percelen-fill', zroPopupHandlerRef.current);
        zroPopupHandlerRef.current = null;
      }
    };
  }, [
    traces,
    selectedTraceId,
    traceLineWidth,
    multiLineMode,
    drawMode,
    autoWaypoints,
    routeAlternatives,
    markedSegments,
    zroPercelen,
    mapReady,
    isVisible,
    layerVisibility,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || drawMode !== 'edit') return;

    const onMouseDown = (...args: unknown[]) => {
      if (drawModeRef.current !== 'edit') return;
      const e = args[0] as {
        point: { x: number; y: number };
        preventDefault: () => void;
      };

      const features = map.queryRenderedFeatures(e.point, {
        layers: ['trace-vertices-circle'],
      });
      if (!features.length) return;

      const props = features[0].properties as Record<string, unknown> | undefined;
      if (!props) return;

      const trace = tracesRef.current.find((t) => t.id === selectedTraceIdRef.current);
      if (!trace) return;

      e.preventDefault();
      const lineIdx = Number(props.lineIdx);
      const vertexIdx = Number(props.idx);

      dragRef.current = {
        lines: getTraceLines(trace),
        lineIdx,
        vertexIdx,
        moved: false,
      };
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
    };

    const onMouseMove = (...args: unknown[]) => {
      const drag = dragRef.current;
      if (!drag) return;

      const e = args[0] as { lngLat: { lng: number; lat: number } };
      const [x, y] = wgs84ToRd(e.lngLat.lng, e.lngLat.lat);
      const z = drag.lines[drag.lineIdx]?.[drag.vertexIdx]?.[2] ?? -0.65;

      drag.lines = drag.lines.map((line, li) => {
        if (li !== drag.lineIdx) return line;
        return line.map((coord, vi) =>
          vi === drag.vertexIdx ? [x, y, z] : coord
        );
      });
      drag.moved = true;

      updateTraceSourcesOnMap(
        map,
        tracesRef.current,
        selectedTraceIdRef.current,
        drag.lines,
        traceLineWidthRef.current,
        multiLineModeRef.current,
        { lineIdx: drag.lineIdx, vertexIdx: drag.vertexIdx }
      );
    };

    const finishDrag = () => {
      const drag = dragRef.current;
      if (!drag) return;

      dragRef.current = null;
      map.dragPan.enable();

      if (drag.moved) {
        skipClickRef.current = true;
        onTraceLinesChangeRef.current?.(drag.lines);
      }

      map.getCanvas().style.cursor = 'default';
    };

    const onHoverMove = (...args: unknown[]) => {
      if (dragRef.current || drawModeRef.current !== 'edit') return;
      const e = args[0] as { point: { x: number; y: number } };
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['trace-vertices-circle'],
      });
      map.getCanvas().style.cursor = features.length > 0 ? 'grab' : 'default';
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mousemove', onHoverMove);
    map.on('mouseup', finishDrag);
    window.addEventListener('mouseup', finishDrag);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mousemove', onHoverMove);
      map.off('mouseup', finishDrag);
      window.removeEventListener('mouseup', finishDrag);
      dragRef.current = null;
      map.dragPan.enable();
    };
  }, [mapReady, drawMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let cancelled = false;
    const layerListeners: {
      layerId: string;
      onClick: (...args: unknown[]) => void;
      onEnter: () => void;
      onLeave: () => void;
    }[] = [];

    const dynamicLayers = [
      'natura2000-fill', 'natura2000-line',
      'percelen-fill', 'percelen-line',
      'nwb-line',
      'bgt-fill', 'bgt-line',
      'bomen-circle',
      'watergangen-line',
      'belemmeringen-line',
      'wegen-line',
      'riolering-line',
      'klic-line',
      'sonderingen-circle',
      'grondwater-circle',
      'kunstwerken-circle',
      'conflicts-circle',
      'vervuilde-grond-fill', 'vervuilde-grond-line', 'vervuilde-grond-point',
      'bodem-risico-gebied-fill', 'bodem-risico-gebied-line',
      ...BODEM_KAART_WMS_SOURCES.map((s) => `vervuilde-grond-wms-${s.id}`),
    ];
    const dynamicSources = [
      'natura2000-source', 'percelen-source', 'nwb-source', 'bgt-source',
      'bomen-source',
      'watergangen-source', 'belemmeringen-source', 'wegen-source',
      'riolering-source', 'klic-source', 'sonderingen-source',
      'grondwater-source', 'kunstwerken-source', 'conflicts-source',
      'vervuilde-grond-poly-source', 'vervuilde-grond-point-source',
      'bodem-risico-gebied-source',
      ...BODEM_KAART_WMS_SOURCES.map((s) => `vervuilde-grond-wms-${s.id}-source`),
    ];

    void (async () => {
      dynamicLayers.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      dynamicSources.forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
      popupRef.current?.remove();

      const maplibreModule = maplibreRef.current;
      if (!maplibreModule || cancelled) return;

      const addClickPopup = (
        layerId: string,
        getContent: (props: Record<string, unknown>) => string
      ) => {
        const onClick = (...args: unknown[]) => {
          if (drawModeRef.current !== 'none' || streetViewModeRef.current) return;
          const e = args[0] as { lngLat: { lng: number; lat: number }; features?: { properties?: Record<string, unknown> }[] };
          if (!e.features?.[0]) return;
          const props = e.features[0].properties ?? {};
          popupRef.current?.remove();
          popupRef.current = new maplibreModule.Popup({ closeButton: true, maxWidth: '260px' })
            .setLngLat(e.lngLat)
            .setHTML(getContent(props))
            .addTo(map);
        };
        const onEnter = () => {
          if (drawModeRef.current === 'none') map.getCanvas().style.cursor = 'pointer';
        };
        const onLeave = () => {
          if (drawModeRef.current === 'none' && !streetViewModeRef.current) {
            map.getCanvas().style.cursor = '';
          }
        };
        map.on('click', layerId, onClick);
        map.on('mouseenter', layerId, onEnter);
        map.on('mouseleave', layerId, onLeave);
        layerListeners.push({ layerId, onClick, onEnter, onLeave });
      };

    // Natura2000
    if (isVisible('natura2000') && layerData?.natura2000 && layerData.natura2000.length > 0) {
      const features = layerData.natura2000.map((g) => ({
        type: 'Feature' as const,
        properties: { id: g.id, naam: g.naam },
        geometry: polygonForLayer(g.polygon, layerData?.coordinateSystem),
      }));
      map.addSource('natura2000-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'natura2000-fill',
        type: 'fill',
        source: 'natura2000-source',
        paint: { 'fill-color': '#27AE60', 'fill-opacity': 0.15 },
      });
      map.addLayer({
        id: 'natura2000-line',
        type: 'line',
        source: 'natura2000-source',
        paint: { 'line-color': '#27AE60', 'line-width': 2, 'line-dasharray': [4, 2] },
      });
      addClickPopup('natura2000-fill', (p) =>
        popupHtml('Natura2000', [['Gebied', String(p.naam)]])
      );
    }

    // BRK percelen
    if (isVisible('percelen') && layerData?.percelen && layerData.percelen.length > 0) {
      const features = layerData.percelen.map((p) => ({
        type: 'Feature' as const,
        properties: { id: p.id, perceelnummer: p.perceelnummer },
        geometry: polygonForLayer(p.polygon, layerData?.coordinateSystem),
      }));
      map.addSource('percelen-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'percelen-fill',
        type: 'fill',
        source: 'percelen-source',
        paint: { 'fill-color': '#E74C3C', 'fill-opacity': 0.06 },
      });
      map.addLayer({
        id: 'percelen-line',
        type: 'line',
        source: 'percelen-source',
        paint: { 'line-color': '#C0392B', 'line-width': 1.5, 'line-opacity': 0.7 },
      });
      addClickPopup('percelen-fill', (p) =>
        popupHtml('Kadastraal perceel', [['Nummer', String(p.perceelnummer)]])
      );
    }

    // NWB wegvakken
    if (isVisible('nwb') && layerData?.nwb && layerData.nwb.length > 0) {
      const features = layerData.nwb.map((w, i) => ({
        type: 'Feature' as const,
        properties: { id: `nwb-${i}`, naam: w.naam, type: w.type },
        geometry: lineForLayer(w.coordinates, layerData?.coordinateSystem),
      }));
      map.addSource('nwb-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'nwb-line',
        type: 'line',
        source: 'nwb-source',
        paint: { 'line-color': '#7F8C8D', 'line-width': 3, 'line-opacity': 0.85 },
      });
      addClickPopup('nwb-line', (p) =>
        popupHtml('NWB wegvak', [
          ['Naam', String(p.naam)],
          ['Type', String(p.type)],
        ])
      );
    }

    // BGT topografie
    if (isVisible('bgt') && layerData?.bgt && layerData.bgt.length > 0) {
      const features = layerData.bgt.map((f, i) => ({
        type: 'Feature' as const,
        properties: { id: `bgt-${i}`, type: f.type, label: f.label },
        geometry: geometryForLayer(f.geometry, layerData?.coordinateSystem),
      }));
      map.addSource('bgt-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'bgt-fill',
        type: 'fill',
        source: 'bgt-source',
        filter: ['in', ['get', 'type'], ['literal', ['weg', 'water', 'pand', 'overig']]],
        paint: {
          'fill-color': [
            'match', ['get', 'type'],
            'weg', BGT_STIJL.weg.fill,
            'water', BGT_STIJL.water.fill,
            'pand', BGT_STIJL.pand.fill,
            BGT_STIJL.overig.fill,
          ],
          'fill-opacity': [
            'match', ['get', 'type'],
            'weg', BGT_STIJL.weg.opacity,
            'water', BGT_STIJL.water.opacity,
            'pand', BGT_STIJL.pand.opacity,
            BGT_STIJL.overig.opacity,
          ],
        },
      });
      map.addLayer({
        id: 'bgt-line',
        type: 'line',
        source: 'bgt-source',
        paint: {
          'line-color': [
            'match', ['get', 'type'],
            'weg', BGT_STIJL.weg.line,
            'water', BGT_STIJL.water.line,
            'pand', BGT_STIJL.pand.line,
            BGT_STIJL.overig.line,
          ],
          'line-width': ['match', ['get', 'type'], 'weg', 1, 'water', 1.5, 0.5],
        },
      });
      addClickPopup('bgt-fill', (p) =>
        popupHtml('BGT', [
          ['Type', String(p.type)],
          ['Label', String(p.label)],
        ])
      );
      addClickPopup('bgt-line', (p) =>
        popupHtml('BGT', [
          ['Type', String(p.type)],
          ['Label', String(p.label)],
        ])
      );
    }

    // Bomen (BGT vegetatieobject)
    if (isVisible('bomen') && layerData?.bomen && layerData.bomen.length > 0) {
      const features = layerData.bomen.map((b) => ({
        type: 'Feature' as const,
        properties: { id: b.id },
        geometry: pointForLayer(b.x, b.y, layerData?.coordinateSystem),
      }));
      map.addSource('bomen-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'bomen-circle',
        type: 'circle',
        source: 'bomen-source',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            12, 2,
            15, 4,
            18, 7,
          ],
          'circle-color': '#2E8B57',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
      addClickPopup('bomen-circle', (p) =>
        popupHtml('Boom', [
          ['Bron', 'BGT vegetatieobject'],
          ['Id', String(p.id)],
        ])
      );
    }

    // Watergangen
    if (isVisible('watergangen') && layerData?.watergangen && layerData.watergangen.length > 0) {
      const features = layerData.watergangen.map((w, i) => ({
        type: 'Feature' as const,
        properties: { id: `wg-${i}`, naam: w.naam, type: w.type },
        geometry: lineForLayer(w.coordinates, layerData?.coordinateSystem),
      }));
      map.addSource('watergangen-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'watergangen-line',
        type: 'line',
        source: 'watergangen-source',
        paint: {
          'line-color': '#2980B9',
          'line-width': 3,
          'line-opacity': 0.85,
        },
      });
      addClickPopup('watergangen-line', (p) =>
        popupHtml(String(p.naam), [['Type', String(p.type)]])
      );
    }

    // Belemmeringen
    if (isVisible('belemmeringen') && layerData?.belemmeringen && layerData.belemmeringen.length > 0) {
      const features = layerData.belemmeringen
        .filter((b) => b.coordinates.length > 1)
        .map((b) => ({
          type: 'Feature' as const,
          properties: { id: b.id, categorie: b.categorie, beheerder: b.beheerder },
          geometry: lineForLayer(b.coordinates, layerData?.coordinateSystem),
        }));
      if (features.length > 0) {
        map.addSource('belemmeringen-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });
        map.addLayer({
          id: 'belemmeringen-line',
          type: 'line',
          source: 'belemmeringen-source',
          paint: {
            'line-color': [
              'match', ['get', 'categorie'],
              'weg', BELEMMERING_KLEUR.weg,
              'watergang', BELEMMERING_KLEUR.watergang,
              'spoor', BELEMMERING_KLEUR.spoor,
              'natuur', BELEMMERING_KLEUR.natuur,
              '#888888',
            ],
            'line-width': 3,
            'line-opacity': 0.7,
            'line-dasharray': [3, 2],
          },
        });
        addClickPopup('belemmeringen-line', (p) =>
          popupHtml('Belemmering', [
            ['Categorie', String(p.categorie)],
            ['Beheerder', String(p.beheerder)],
          ])
        );
      }
    }

    // Demo riolering (GWSW-stijl, lazy load)
    if (isVisible('riolering-demo') && !lazyLayers && !hasGisData) {
      try {
        const { DEMO_RIOLERING } = await import('@/demo/riolering');
        if (cancelled || !mapRef.current) return;
        if (DEMO_RIOLERING.length > 0) {
          const features = DEMO_RIOLERING.map((leiding) => ({
            type: 'Feature' as const,
            properties: {
              id: leiding.id,
              type: leiding.type,
              stelsel: leiding.stelsel,
              diameterMm: leiding.diameterMm,
              beheerder: leiding.beheerder,
              diepte: leiding.diepte,
            },
            geometry: lineForMap(leiding.coordinates),
          }));
          map.addSource('riolering-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features },
          });
          map.addLayer({
            id: 'riolering-line',
            type: 'line',
            source: 'riolering-source',
            paint: {
              'line-color': [
                'match', ['get', 'stelsel'],
                'onder_overdruk', IMKL_COLORS.rioolOnderOverdruk,
                'vrijverfall', IMKL_COLORS.rioolVrijverfall,
                'gemengd', IMKL_COLORS.rioolVrijverfall,
                IMKL_COLORS.rioolVrijverfall,
              ],
              'line-width': [
                'match', ['get', 'type'],
                'hoofdriool', 3,
                'persleiding', 2.5,
                'berging', 2,
                'huisaansluiting', 1.5,
                2,
              ],
              'line-opacity': 0.85,
            },
          });
          addClickPopup('riolering-line', (p) =>
            popupHtml('Riolering', [
              ['Type', String(p.type)],
              ['Stelsel', String(p.stelsel)],
              ['Diameter', `Ø${p.diameterMm} mm`],
              ['Diepte', `${p.diepte} m NAP`],
              ['Beheerder', String(p.beheerder)],
            ])
          );
        }
      } catch (err) {
        console.error('Demo riolering laden mislukt:', err);
      }
    }

    // KLIC
    if (isVisible('klic') && bestaandNet.length > 0) {
      const features = bestaandNet.flatMap((net, idx) => {
        const offsets = multiLineMode
          ? [-1.5, 0, 1.5].map((o, li) => ({ coords: offsetLine(net.coordinates, o), lineIdx: li }))
          : [{ coords: net.coordinates, lineIdx: 0 }];
        return offsets.map(({ coords, lineIdx }) => ({
          type: 'Feature' as const,
          properties: {
            id: `${net.id}-${lineIdx}`,
            thema: net.thema,
            beheerder: net.beheerder,
            lineIdx,
          },
          geometry: lineForMap(coords),
        }));
      });
      map.addSource('klic-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'klic-line',
        type: 'line',
        source: 'klic-source',
        paint: {
          'line-color': [
            'match', ['get', 'thema'],
            'elektra', THEMA_KLEUREN.elektra,
            'gas', THEMA_KLEUREN.gas,
            'water', THEMA_KLEUREN.water,
            'telecom', THEMA_KLEUREN.telecom,
            'media', THEMA_KLEUREN.media,
            'riool', THEMA_KLEUREN.riool,
            'warmte', THEMA_KLEUREN.warmte,
            '#888888',
          ],
          'line-width': multiLineMode ? 1.5 : 2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.8,
        },
      });
      addClickPopup('klic-line', (p) =>
        popupHtml('KLIC-net', [
          ['Thema', String(p.thema)],
          ['Beheerder', String(p.beheerder)],
          ...(multiLineMode ? [['Lijn', String(p.lineIdx)]] as [string, string][] : []),
        ])
      );
    }

    // BRO sonderingen
    if (isVisible('sonderingen') && layerData?.sonderingen && layerData.sonderingen.length > 0) {
      const features = layerData.sonderingen.map((s) => ({
        type: 'Feature' as const,
        properties: { id: s.id, qc: s.qc, grondsoort: s.grondsoort },
        geometry: pointForLayer(s.x, s.y, layerData?.coordinateSystem),
      }));
      map.addSource('sonderingen-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'sonderingen-circle',
        type: 'circle',
        source: 'sonderingen-source',
        paint: {
          'circle-radius': 7,
          'circle-color': '#8B4513',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      addClickPopup('sonderingen-circle', (p) =>
        popupHtml('BRO sondering', [
          ['qc', `${p.qc} MPa`],
          ['Grondsoort', String(p.grondsoort)],
        ])
      );
    }

    // Grondwater
    if (isVisible('grondwater') && layerData?.grondwater && layerData.grondwater.length > 0) {
      const features = layerData.grondwater.map((g) => ({
        type: 'Feature' as const,
        properties: { id: g.id, standNap: g.standNap },
        geometry: pointForLayer(g.x, g.y, layerData?.coordinateSystem),
      }));
      map.addSource('grondwater-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'grondwater-circle',
        type: 'circle',
        source: 'grondwater-source',
        paint: {
          'circle-radius': 6,
          'circle-color': '#3498DB',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
      addClickPopup('grondwater-circle', (p) =>
        popupHtml('Grondwaterstand', [['NAP', `${p.standNap} m`]])
      );
    }

    // Vervuilde grond — PDOK WMS (landelijk SLD+SAD) + vector uit seed
    if (isVisible('vervuilde-grond')) {
      if (dataSource === 'live') {
        for (const wms of BODEM_KAART_WMS_SOURCES) {
          const sourceId = `vervuilde-grond-wms-${wms.id}-source`;
          map.addSource(sourceId, {
            type: 'raster',
            tiles: [wms.tiles],
            tileSize: 256,
            attribution: wms.label,
          });
          map.addLayer({
            id: `vervuilde-grond-wms-${wms.id}`,
            type: 'raster',
            source: sourceId,
            paint: { 'raster-opacity': wms.opacity },
          });
        }
      }

      if (layerData?.vervuildeGrond && layerData.vervuildeGrond.length > 0) {
      const polygonFeatures = layerData.vervuildeGrond
        .filter((l) => l.polygon && l.polygon.length >= 4)
        .map((l) => ({
          type: 'Feature' as const,
          properties: {
            id: l.id,
            bron: l.bron,
            naam: l.naam,
            status: l.status,
            risicoklasse: l.risicoklasse,
            gebiedType: l.gebiedType,
            afstandTraceM: l.afstandTraceM,
            kleur: vervuildeGrondKleur(l.bron, l.risicoklasse),
          },
          geometry: polygonForLayer(l.polygon!, layerData?.coordinateSystem),
        }));

      const pointFeatures = layerData.vervuildeGrond
        .filter((l) => l.x !== undefined && l.y !== undefined)
        .map((l) => ({
          type: 'Feature' as const,
          properties: {
            id: l.id,
            bron: l.bron,
            naam: l.naam,
            status: l.status,
            risicoklasse: l.risicoklasse,
            gebiedType: l.gebiedType,
            afstandTraceM: l.afstandTraceM,
            kleur: vervuildeGrondKleur(l.bron, l.risicoklasse),
          },
          geometry: pointForLayer(l.x!, l.y!, layerData?.coordinateSystem),
        }));

      if (polygonFeatures.length > 0) {
        map.addSource('vervuilde-grond-poly-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: polygonFeatures },
        });
        map.addLayer({
          id: 'vervuilde-grond-fill',
          type: 'fill',
          source: 'vervuilde-grond-poly-source',
          paint: {
            'fill-color': ['get', 'kleur'],
            'fill-opacity': 0.25,
          },
        });
        map.addLayer({
          id: 'vervuilde-grond-line',
          type: 'line',
          source: 'vervuilde-grond-poly-source',
          paint: {
            'line-color': ['get', 'kleur'],
            'line-width': 2,
            'line-dasharray': [3, 2],
          },
        });
        addClickPopup('vervuilde-grond-fill', (p) => {
          const rows: [string, string][] = [
            ['Locatie', String(p.naam)],
            ['Bron', VERVUILDE_GROND_LABEL[String(p.bron)] ?? String(p.bron)],
          ];
          if (p.risicoklasse) {
            rows.push(['Risicoklasse', RISICO_LABEL[p.risicoklasse as BodemRisicoklasse] ?? String(p.risicoklasse)]);
          }
          if (p.gebiedType) {
            rows.push(['Gebiedtype', GEBIED_TYPE_LABEL[p.gebiedType as BodemGebiedType] ?? String(p.gebiedType)]);
          }
          if (p.status) rows.push(['Status', String(p.status)]);
          if (p.afstandTraceM != null) rows.push(['Afstand tracé', `${p.afstandTraceM} m`]);
          return popupHtml('Bodemrisico', rows);
        });
      }

      if (pointFeatures.length > 0) {
        map.addSource('vervuilde-grond-point-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: pointFeatures },
        });
        map.addLayer({
          id: 'vervuilde-grond-point',
          type: 'circle',
          source: 'vervuilde-grond-point-source',
          paint: {
            'circle-radius': 8,
            'circle-color': ['get', 'kleur'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });
        addClickPopup('vervuilde-grond-point', (p) => {
          const rows: [string, string][] = [
            ['Locatie', String(p.naam)],
            ['Bron', VERVUILDE_GROND_LABEL[String(p.bron)] ?? String(p.bron)],
          ];
          if (p.risicoklasse) {
            rows.push(['Risicoklasse', RISICO_LABEL[p.risicoklasse as BodemRisicoklasse] ?? String(p.risicoklasse)]);
          }
          if (p.gebiedType) {
            rows.push(['Gebiedtype', GEBIED_TYPE_LABEL[p.gebiedType as BodemGebiedType] ?? String(p.gebiedType)]);
          }
          if (p.status) rows.push(['Status', String(p.status)]);
          if (p.afstandTraceM != null) rows.push(['Afstand tracé', `${p.afstandTraceM} m`]);
          return popupHtml('Bodemrisico', rows);
        });
      }

      const risicoGebieden =
        layerData.bodemRisicoGebieden ??
        (layerData.vervuildeGrond?.length
          ? aggregateBodemRisicoGebieden(layerData.vervuildeGrond as BodemRisicoLocatie[])
          : []);

      if (risicoGebieden.length > 0) {
        const gebiedFeatures = risicoGebieden.flatMap((g) =>
          g.polygons.map((poly, idx) => ({
            type: 'Feature' as const,
            properties: {
              id: `${g.id}-${idx}`,
              label: g.label,
              telling: g.telling,
              risicoklasse: g.risicoklasse,
              kleur: RISICO_KLEUR[g.risicoklasse as BodemRisicoklasse] ?? '#C0392B',
              minAfstandTraceM: g.minAfstandTraceM,
            },
            geometry: polygonForLayer(poly, layerData?.coordinateSystem),
          }))
        );
        if (gebiedFeatures.length > 0) {
          map.addSource('bodem-risico-gebied-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: gebiedFeatures },
          });
          map.addLayer({
            id: 'bodem-risico-gebied-fill',
            type: 'fill',
            source: 'bodem-risico-gebied-source',
            paint: {
              'fill-color': ['get', 'kleur'],
              'fill-opacity': 0.25,
            },
          });
          map.addLayer({
            id: 'bodem-risico-gebied-line',
            type: 'line',
            source: 'bodem-risico-gebied-source',
            paint: {
              'line-color': ['get', 'kleur'],
              'line-width': 2,
              'line-dasharray': [3, 2],
            },
          });
          addClickPopup('bodem-risico-gebied-fill', (p) => {
            const rows: [string, string][] = [
              ['Gebied', String(p.label)],
              ['Locaties', String(p.telling)],
            ];
            if (p.minAfstandTraceM != null) rows.push(['Dichtstbij tracé', `${p.minAfstandTraceM} m`]);
            return popupHtml('Risicogebied', rows);
          });
        }
      }
      }
    }

    // Kunstwerken
    if (isVisible('kunstwerken') && layerData?.kunstwerken && layerData.kunstwerken.length > 0) {
      const features = layerData.kunstwerken.map((k, i) => ({
        type: 'Feature' as const,
        properties: { id: `kw-${i}`, naam: k.naam, type: k.type },
        geometry: pointForLayer(k.x, k.y, layerData?.coordinateSystem),
      }));
      map.addSource('kunstwerken-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'kunstwerken-circle',
        type: 'circle',
        source: 'kunstwerken-source',
        paint: {
          'circle-radius': 8,
          'circle-color': '#16A085',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      addClickPopup('kunstwerken-circle', (p) =>
        popupHtml(String(p.naam), [['Type', String(p.type)]])
      );
    }

    // Demo wegen (fallback, lazy load — na netwerk/tracé-lagen)
    if (isVisible('wegen-demo') && !lazyLayers && !hasGisData) {
      try {
        const { DEMO_WEGEN } = await import('@/demo/roads');
        if (cancelled || !mapRef.current) return;
        if (DEMO_WEGEN.length > 0) {
          const features = DEMO_WEGEN.map((weg) => ({
            type: 'Feature' as const,
            properties: { id: weg.id, naam: weg.naam, type: weg.type },
            geometry: lineForMap(weg.centerline),
          }));
          map.addSource('wegen-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features },
          });
          map.addLayer({
            id: 'wegen-line',
            type: 'line',
            source: 'wegen-source',
            paint: {
              'line-color': '#94A3B8',
              'line-width': 4,
              'line-opacity': 0.35,
            },
          });
          addClickPopup('wegen-line', (p) =>
            popupHtml(String(p.naam), [['Type', String(p.type)]])
          );
        }
      } catch (err) {
        console.error('Demo wegen laden mislukt:', err);
      }
    }

    // Conflicten
    if (isVisible('conflicts') && conflicten.length > 0) {
      const features = conflicten.map((c) => ({
        type: 'Feature' as const,
        properties: {
          id: c.id,
          ernst: c.ernst,
          titel: c.titel,
          toelichting: c.toelichting,
          selected: c.id === selectedConflictId,
        },
        geometry: pointToMapGeoJson(c.x, c.y),
      }));
      map.addSource('conflicts-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'conflicts-circle',
        type: 'circle',
        source: 'conflicts-source',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['get', 'selected'], false],
            14,
            ['match', ['get', 'ernst'], 'blokkerend', 10, 'waarschuwing', 8, 6],
          ],
          'circle-color': [
            'match', ['get', 'ernst'],
            'blokkerend', ERNST_KLEUREN.blokkerend,
            'waarschuwing', ERNST_KLEUREN.waarschuwing,
            ERNST_KLEUREN.info,
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['get', 'selected'], false],
            3,
            2,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });
      addClickPopup('conflicts-circle', (p) => {
        const conflict = conflicten.find((c) => c.id === p.id);
        if (!conflict) {
          return popupHtml('Conflict', [['Toelichting', String(p.toelichting)]]);
        }
        return conflictPopupHtml(conflict);
      });
    }

    })();

    return () => {
      cancelled = true;
      layerListeners.forEach(({ layerId, onClick, onEnter, onLeave }) => {
        map.off('click', layerId, onClick);
        map.off('mouseenter', layerId, onEnter);
        map.off('mouseleave', layerId, onLeave);
      });
    };
  }, [
    bestaandNet, conflicten, layerData, selectedConflictId,
    mapReady, layerVisibility, isVisible, lazyLayers, hasGisData, multiLineMode,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibreModule = maplibreRef.current;
    if (!map || !mapReady || !maplibreModule) return;

    if (!selectedConflictId) {
      popupRef.current?.remove();
      popupRef.current = null;
      return;
    }

    const conflict = conflicten.find((c) => c.id === selectedConflictId);
    if (!conflict) return;

    const [lng, lat] = rdToWgs84(conflict.x, conflict.y);
    map.flyTo({ center: [lng, lat], zoom: 17, duration: 700 });

    popupRef.current?.remove();
    popupRef.current = new maplibreModule.Popup({
      closeButton: true,
      maxWidth: '280px',
      offset: 16,
    })
      .setLngLat({ lng, lat })
      .setHTML(conflictPopupHtml(conflict))
      .addTo(map);
  }, [selectedConflictId, conflicten, mapReady]);

  const fitBoundsKeyRef = useRef('');

  useEffect(() => {
    const map = mapRef.current;
    const currentTraces = tracesRef.current;
    if (!map || !mapReady || currentTraces.length === 0) return;

    const fitKey = `${selectedTraceId ?? 'all'}-${hasGisData ? 'gis' : 'bare'}`;
    if (fitBoundsKeyRef.current === fitKey) return;
    fitBoundsKeyRef.current = fitKey;

    const focusTrace = selectedTraceId
      ? currentTraces.find((t) => t.id === selectedTraceId)
      : undefined;
    const allCoords = currentTraces.flatMap((t) => t.coordinates);
    const coords = focusTrace?.coordinates.length ? focusTrace.coordinates : allCoords;
    if (coords.length === 0) return;

    const bbox = traceBbox(coords, 200);
    const wgsBbox = bboxRdToWgs84(bbox);
    map.fitBounds(
      [[wgsBbox[0], wgsBbox[1]], [wgsBbox[2], wgsBbox[3]]],
      { padding: 60, maxZoom: selectedTraceId ? 16 : 14, duration: 800 }
    );
  }, [selectedTraceId, mapReady, hasGisData]);

  useEffect(() => {
    const container = mapContainer.current;
    const map = mapRef.current;
    if (!container || !map || !mapReady) return;

    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [mapReady]);

  const GROUP_LABELS: Record<string, string> = {
    topografie: 'Topografie',
    kadaster: 'Kadaster',
    ondergrond: 'Ondergrond',
    netwerk: 'Netwerk & tracé',
  };

  const groupedToggles = useMemo(() => {
    const groups: Record<string, LayerToggle[]> = {};
    for (const toggle of layerToggles) {
      if (!groups[toggle.group]) groups[toggle.group] = [];
      groups[toggle.group].push(toggle);
    }
    return groups;
  }, [layerToggles]);

  const allLayersVisible = useMemo(
    () => layerToggles.every((toggle) => isVisible(toggle.id)),
    [layerToggles, isVisible]
  );

  const isGroupVisible = useCallback(
    (group: string) => {
      const toggles = groupedToggles[group] ?? [];
      return toggles.length > 0 && toggles.every((toggle) => isVisible(toggle.id));
    },
    [groupedToggles, isVisible]
  );

  const toggleGroupVisibility = useCallback(
    (group: string, visible: boolean) => {
      const toggles = groupedToggles[group] ?? [];
      setLayersVisible(
        toggles.map((toggle) => toggle.id),
        visible
      );
    },
    [groupedToggles, setLayersVisible]
  );

  useEffect(() => {
    onLayerControlReady?.({
      layerToggles,
      isVisible,
      toggleLayer,
      allLayersVisible,
      toggleAllLayers,
      isGroupVisible,
      toggleGroupVisibility,
      expandedGroups,
      toggleGroup,
      basemap,
      setBasemap,
      streetViewMode,
      setStreetViewMode: (v) => {
        if (!v) setStreetViewPoint(null);
        setStreetViewMode(v);
      },
      dataSource,
      hasCollectedData: hasGisData,
      lazyLayers,
    });
  }, [
    onLayerControlReady,
    layerToggles,
    isVisible,
    allLayersVisible,
    toggleAllLayers,
    isGroupVisible,
    toggleGroupVisibility,
    expandedGroups,
    basemap,
    streetViewMode,
    dataSource,
    hasGisData,
    lazyLayers,
  ]);

  return (
    <div className="relative h-full min-h-[280px] w-full" style={{ height }}>
      <div ref={mapContainer} className="h-full min-h-[280px] w-full rounded-lg" />

      {showLayerPanel && (
      <div className="absolute left-3 top-3 max-h-[calc(100%-24px)] w-56 max-w-[calc(100%-24px)] overflow-y-auto rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2">
          <SourceBadge source={dataSource} />
          <span className="text-xs text-muted-foreground">Datalagen</span>
        </div>

        <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
          <Switch
            id="layer-all"
            checked={allLayersVisible}
            onCheckedChange={toggleAllLayers}
          />
          <Label htmlFor="layer-all" className="flex-1 text-xs font-medium text-foreground">
            Alle lagen
          </Label>
        </div>

        <div className="mb-3 space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Achtergrond</span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setBasemap(id)}
                className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
                  basemap === id
                    ? 'bg-[#2D6FE8] text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {BASEMAPS[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 space-y-1 border-b border-border pb-3">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Straatbeeld</span>
          <button
            type="button"
            onClick={() => {
              setStreetViewMode((prev) => {
                if (prev) setStreetViewPoint(null);
                return !prev;
              });
            }}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
              streetViewMode
                ? 'bg-[#2D6FE8] text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            {streetViewMode ? 'Klik op de kaart…' : 'Straatbeeld openen'}
          </button>
          {streetViewMode && (
            <p className="text-[10px] text-muted-foreground">
              Klik een punt op de kaart voor Mapillary-beelden (max. 50 m).
            </p>
          )}
        </div>

        {Object.entries(groupedToggles).map(([group, toggles]) => (
          <div key={group} className="mb-2">
            <div className="mb-1 flex w-full items-center gap-1">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="flex flex-1 items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                {expandedGroups[group] ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {GROUP_LABELS[group] ?? group}
              </button>
              <Switch
                id={`layer-group-${group}`}
                checked={isGroupVisible(group)}
                onCheckedChange={(visible) => toggleGroupVisibility(group, visible)}
                aria-label={`${GROUP_LABELS[group] ?? group} tonen of verbergen`}
              />
            </div>
            {expandedGroups[group] && (
              <div className="space-y-1.5 pl-1">
                {toggles.map((toggle) => (
                  <div key={toggle.id} className="flex items-center gap-2">
                    <Switch
                      id={`layer-${toggle.id}`}
                      checked={isVisible(toggle.id)}
                      onCheckedChange={() => toggleLayer(toggle.id)}
                    />
                    {toggle.color && (
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: toggle.color }}
                      />
                    )}
                    <Label htmlFor={`layer-${toggle.id}`} className="flex-1 text-xs text-foreground">
                      {toggle.label}
                      <span className="ml-1 text-muted-foreground">({toggle.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {lazyLayers && (
          <p className="mt-2 rounded border border-[#2D6FE8]/30 bg-[#2D6FE8]/10 px-2 py-1.5 text-[10px] text-[#2D6FE8]">
            Zet een laag aan om live data op te halen voor het zichtbare kaartgebied.
          </p>
        )}
      </div>
      )}

      {streetViewPoint && (
        <StreetViewPanel
          lat={streetViewPoint.lat}
          lng={streetViewPoint.lng}
          onClose={() => setStreetViewPoint(null)}
        />
      )}

      <div className="absolute bottom-3 right-3 rounded border border-border bg-card/95 px-2 py-1 font-mono text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm">
        RD / WGS84 · EPSG:28992
      </div>
    </div>
  );
}
