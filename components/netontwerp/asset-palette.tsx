'use client';

import {
  STATION_SUBTYPE_LABELS,
  STATION_CAPACITEIT_KVA,
  MOF_SUBTYPE_LABELS,
  type StationSubtype,
  type MofSubtype,
} from '@/lib/netontwerp/types';
import { cn } from '@/lib/utils';
import { Building2, CircleDot, MapPin, Cable } from 'lucide-react';

export interface PlaatsModus {
  type: 'station' | 'mof' | 'aansluiting';
  subtype: string;
}

interface AssetPaletteProps {
  plaatsModus: PlaatsModus | null;
  onPlaatsModusChange: (modus: PlaatsModus | null) => void;
  /** Welke groepen tonen (per stap verschillend) */
  toon?: ('aansluiting' | 'station' | 'mof')[];
}

function PaletteKnop({
  actief,
  onClick,
  icon,
  label,
  detail,
}: {
  actief: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  detail?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
        actief
          ? 'border-[#2D6FE8] bg-[#2D6FE8]/10 text-[#2D6FE8]'
          : 'border-border hover:bg-muted',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {detail && <span className="block truncate text-[10px] text-muted-foreground">{detail}</span>}
      </span>
    </button>
  );
}

/**
 * Assetpalet voor de netarchitect: kies wat je op de kaart plaatst.
 * Eén klik activeert de plaatsmodus, nogmaals klikken zet hem uit.
 */
export function AssetPalette({
  plaatsModus,
  onPlaatsModusChange,
  toon = ['aansluiting', 'station', 'mof'],
}: AssetPaletteProps) {
  const toggle = (modus: PlaatsModus) => {
    const isActief =
      plaatsModus?.type === modus.type && plaatsModus?.subtype === modus.subtype;
    onPlaatsModusChange(isActief ? null : modus);
  };

  return (
    <div className="space-y-3">
      {toon.includes('aansluiting') && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-3 w-3" /> Belastingen
          </p>
          <PaletteKnop
            actief={plaatsModus?.type === 'aansluiting'}
            onClick={() => toggle({ type: 'aansluiting', subtype: 'belasting' })}
            icon={<MapPin className="h-3.5 w-3.5 text-emerald-600" />}
            label="Aansluitpunt plaatsen"
            detail="Klik op de kaart voor de locatie"
          />
        </div>
      )}

      {toon.includes('station') && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Building2 className="h-3 w-3" /> Stations
          </p>
          <div className="space-y-1">
            {(Object.keys(STATION_SUBTYPE_LABELS) as StationSubtype[]).map((subtype) => (
              <PaletteKnop
                key={subtype}
                actief={plaatsModus?.type === 'station' && plaatsModus.subtype === subtype}
                onClick={() => toggle({ type: 'station', subtype })}
                icon={<Building2 className="h-3.5 w-3.5 text-purple-600" />}
                label={STATION_SUBTYPE_LABELS[subtype]}
                detail={
                  STATION_CAPACITEIT_KVA[subtype]
                    ? `${STATION_CAPACITEIT_KVA[subtype]} kVA`
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {toon.includes('mof') && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleDot className="h-3 w-3" /> Moffen
          </p>
          <div className="space-y-1">
            {(Object.keys(MOF_SUBTYPE_LABELS) as MofSubtype[]).map((subtype) => (
              <PaletteKnop
                key={subtype}
                actief={plaatsModus?.type === 'mof' && plaatsModus.subtype === subtype}
                onClick={() => toggle({ type: 'mof', subtype })}
                icon={<CircleDot className="h-3.5 w-3.5 text-amber-600" />}
                label={MOF_SUBTYPE_LABELS[subtype]}
                detail="Snapt automatisch op het tracé"
              />
            ))}
          </div>
        </div>
      )}

      {plaatsModus && (
        <p className="flex items-center gap-1.5 rounded-md bg-[#2D6FE8]/10 px-2 py-1.5 text-[10px] text-[#2D6FE8]">
          <Cable className="h-3 w-3 shrink-0" />
          Plaatsmodus actief — klik op de kaart
        </p>
      )}
    </div>
  );
}
