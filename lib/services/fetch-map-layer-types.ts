import type { MapLayerData } from '@/components/trace-map';
import type { ConnectorMode } from '@/lib/connectors/types';
import type { FetchableMapLayerId } from '@/lib/map/fetchable-layers';

export interface MapLayerFetchResult {
  layerId: FetchableMapLayerId;
  source: ConnectorMode;
  sources: Record<string, ConnectorMode>;
  partial: Partial<MapLayerData>;
}
