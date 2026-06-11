'use client';

import { SourceBadge } from '@/components/source-badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ConnectorMode } from '@/lib/connectors/types';
import { Camera, ChevronDown, ChevronRight } from 'lucide-react';

export interface LayerToggle {
  id: string;
  label: string;
  group: string;
  count: number;
  color?: string;
  defaultOn: boolean;
  loading?: boolean;
}

export type BasemapId = 'bgt' | 'brt' | 'osm' | 'luchtfoto';

export const BASEMAP_OPTIONS: Record<BasemapId, string> = {
  // BGT toont exacte pandcontouren — standaard, want BRT generaliseert bebouwing
  bgt: 'BGT (exact)',
  brt: 'BRT PDOK',
  osm: 'OpenStreetMap',
  luchtfoto: 'Luchtfoto',
};

const GROUP_LABELS: Record<string, string> = {
  topografie: 'Topografie',
  kadaster: 'Kadaster',
  ondergrond: 'Ondergrond',
  netwerk: 'Netwerk & tracé',
};

interface MapLayerPanelProps {
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
}

export function MapLayerPanel({
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
  setStreetViewMode,
  dataSource = 'demo',
  hasCollectedData = false,
  lazyLayers = false,
}: MapLayerPanelProps) {
  const groupedToggles: Record<string, LayerToggle[]> = {};
  for (const toggle of layerToggles) {
    if (!groupedToggles[toggle.group]) groupedToggles[toggle.group] = [];
    groupedToggles[toggle.group].push(toggle);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SourceBadge source={dataSource} />
        <span className="text-xs font-medium text-foreground">Datalagen</span>
      </div>

      <div className="flex items-center gap-2 rounded border border-border px-2 py-1.5">
        <Switch id="layer-all" checked={allLayersVisible} onCheckedChange={toggleAllLayers} />
        <Label htmlFor="layer-all" className="flex-1 text-xs font-medium">
          Alle lagen
        </Label>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Achtergrond</span>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(BASEMAP_OPTIONS) as BasemapId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setBasemap(id)}
              className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
                basemap === id
                  ? 'bg-[#2D6FE8] text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {BASEMAP_OPTIONS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1 border-b border-border pb-3">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Straatbeeld</span>
        <button
          type="button"
          onClick={() => setStreetViewMode(!streetViewMode)}
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
            streetViewMode ? 'bg-[#2D6FE8] text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          {streetViewMode ? 'Klik op kaart…' : 'Straatbeeld'}
        </button>
      </div>

      {Object.entries(groupedToggles).map(([group, toggles]) => (
        <div key={group}>
          <div className="mb-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="flex flex-1 items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              {expandedGroups[group] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {GROUP_LABELS[group] ?? group}
            </button>
            <Switch
              id={`layer-group-${group}`}
              checked={isGroupVisible(group)}
              onCheckedChange={(v) => toggleGroupVisibility(group, v)}
            />
          </div>
          {expandedGroups[group] && (
            <div className="space-y-1 pl-1">
              {toggles.map((toggle) => (
                <div key={toggle.id} className="flex items-center gap-2">
                  <Switch
                    id={`layer-${toggle.id}`}
                    checked={isVisible(toggle.id)}
                    onCheckedChange={() => toggleLayer(toggle.id)}
                  />
                  {toggle.color && (
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: toggle.color }} />
                  )}
                  <Label htmlFor={`layer-${toggle.id}`} className="flex-1 text-[11px]">
                    {toggle.label}
                    {toggle.loading ? (
                      <span className="ml-1 text-muted-foreground">laden…</span>
                    ) : (
                      <span className="ml-1 text-muted-foreground">({toggle.count})</span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {lazyLayers && (
        <p className="rounded border border-[#2D6FE8]/30 bg-[#2D6FE8]/10 px-2 py-1.5 text-[10px] text-[#2D6FE8]">
          Zet een laag aan om live data op te halen voor het zichtbare kaartgebied (heel NL).
        </p>
      )}
      {!lazyLayers && !hasCollectedData && (
        <p className="rounded border border-[#2D6FE8]/30 bg-[#2D6FE8]/10 px-2 py-1.5 text-[10px] text-[#2D6FE8]">
          Verzamel data in Fase 2 voor alle GIS-lagen
        </p>
      )}
    </div>
  );
}
