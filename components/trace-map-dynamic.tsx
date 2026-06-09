'use client';

import dynamic from 'next/dynamic';
import { Component, useState, type ComponentProps, type ReactNode } from 'react';

const TraceMapLazy = dynamic(
  () => import('./trace-map').then((mod) => ({ default: mod.TraceMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center rounded-lg border border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">Kaart laden…</p>
      </div>
    ),
  }
);

interface MapErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive">Kaart kon niet laden.</p>
          <button
            type="button"
            className="rounded-md bg-[#2D6FE8] px-3 py-1.5 text-xs text-white hover:bg-[#2D6FE8]/90"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry?.();
            }}
          >
            Opnieuw proberen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function TraceMap(props: ComponentProps<typeof TraceMapLazy>) {
  const [mapKey, setMapKey] = useState(0);

  return (
    <MapErrorBoundary onRetry={() => setMapKey((k) => k + 1)}>
      <TraceMapLazy key={mapKey} {...props} />
    </MapErrorBoundary>
  );
}

export type { MapTrace, MapNet, MapLayerData } from './trace-map';
