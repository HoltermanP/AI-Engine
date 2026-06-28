'use client';

import { MapWorkspace } from '@/components/map-workspace';
import { useCockpit } from './cockpit-context';

/**
 * De ÉNE blijvende kaart van de cockpit. Staat buiten de paneel-switch en
 * verandert nooit van plek/`key`, zodat de MapLibre-instantie over alle
 * processtappen behouden blijft. Gedeelde props komen uit de context; per stap
 * gepubliceerde config (tekentools/lagen/assets) wordt eroverheen gespreid.
 */
export function CockpitMap() {
  const {
    traces,
    setTraces,
    bestaandNet,
    conflicten,
    selectedTraceId,
    selectedConflictId,
    mapConfig,
  } = useCockpit();

  return (
    <MapWorkspace
      traces={traces}
      onTracesChange={setTraces}
      bestaandNet={bestaandNet}
      conflicten={conflicten}
      selectedTraceId={selectedTraceId}
      selectedConflictId={selectedConflictId}
      traceId={selectedTraceId}
      lazyLayers
      height="100%"
      {...mapConfig}
    />
  );
}
