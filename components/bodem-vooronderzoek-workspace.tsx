'use client';

import { useMemo, useState } from 'react';
import { Mountain } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BodemVooronderzoekPanel } from '@/components/bodem-vooronderzoek-panel';

/** Lichtgewicht tracé-vorm voor de bodem-workspace (RD-coördinaten). */
export interface BodemTraceKeuze {
  id: string;
  code: string;
  naam: string;
  coordinates: [number, number, number][];
}

export interface BodemVooronderzoekWorkspaceProps {
  projectId: string;
  traces: BodemTraceKeuze[];
}

export function BodemVooronderzoekWorkspace({
  projectId,
  traces,
}: BodemVooronderzoekWorkspaceProps) {
  const bruikbaar = useMemo(
    () => traces.filter((t) => t.coordinates.length >= 2),
    [traces]
  );
  const [geselecteerd, setGeselecteerd] = useState<string>(bruikbaar[0]?.id ?? '');

  if (bruikbaar.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        <Mountain className="h-6 w-6" />
        <p>Nog geen tracé met geometrie in dit project.</p>
        <p>Teken eerst een tracé bij Tracé-engineering om het bodem-vooronderzoek te starten.</p>
      </div>
    );
  }

  const trace = bruikbaar.find((t) => t.id === geselecteerd) ?? bruikbaar[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Tracé:</span>
        <Select value={trace.id} onValueChange={(v) => v && setGeselecteerd(v)}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Kies een tracé" />
          </SelectTrigger>
          <SelectContent>
            {bruikbaar.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.code} — {t.naam}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <BodemVooronderzoekPanel
        key={trace.id}
        projectId={projectId}
        traceId={trace.id}
        trace={trace.coordinates}
        omschrijving={`${trace.code} — ${trace.naam}`}
      />
    </div>
  );
}
