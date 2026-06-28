'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Netontwerp, NetontwerpAsset, NetontwerpStap } from '@/lib/netontwerp/types';
import { nieuweAansluitingDefaults } from '@/lib/netontwerp/belastingen';
import { afgeleideStapStatus } from '@/lib/netontwerp/stappen';
import { snapNaarLijnen, puntOpChainage, lijnLengteM } from '@/lib/netontwerp/chainage';
import type { CsvParseResultaat } from '@/lib/netontwerp/belastingen';
import { bepaalRingVolgorde } from '@/lib/netontwerp/stations-advies';
import {
  saveNetontwerpAction,
  maakNieuwTraceAction,
  getNetontwerpTracesAction,
} from '@/lib/actions/netontwerp';
import { demoTraceToMapTrace } from '@/lib/trace-edit';
import { assetsNaarGeoJSON, aansluitingenNaarFeatures } from '@/lib/map/netontwerp-assets';
import { useCockpit, useCockpitMap } from '@/components/project-cockpit/cockpit-context';
import { getTraceLines, type TraceLines } from '@/lib/trace-edit';
import { NetontwerpStappenNav } from './netontwerp-stappen-nav';
import { AssetPalette, type PlaatsModus } from './asset-palette';
import { StapBelastingen } from './stap-belastingen';
import { StapTrace } from './stap-trace';
import { StapKabel } from './stap-kabel';
import { StapStations } from './stap-stations';
import { StapStationsontwerp } from './stap-stationsontwerp';
import { StapWerktekening } from './stap-werktekening';

interface NetontwerpWorkspaceProps {
  initieleOntwerp: Netontwerp;
}

const GELDIGE_STAPPEN: NetontwerpStap[] = [
  'belastingen',
  'trace',
  'kabel',
  'stations',
  'stationsontwerp',
  'werktekening',
];

let plaatsTeller = 0;

/**
 * Zijpaneel "Netontwerp" — belastingen, kabelkeuze, stations en assets. De kaart
 * is de gedeelde cockpit-kaart; dit paneel publiceert de assets + plaatsmodus en
 * deelt de tracé-geometrie via de cockpit-context. De substap staat in `?substap=`
 * (de hoofdstap zit in `?stap=netontwerp`).
 */
export function NetontwerpWorkspace({ initieleOntwerp }: NetontwerpWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { traces, setTraces, selectedTraceId, setSelectedTraceId } = useCockpit();
  const subParam = searchParams.get('substap') as NetontwerpStap | null;
  const actieveStap: NetontwerpStap =
    subParam && GELDIGE_STAPPEN.includes(subParam) ? subParam : 'belastingen';

  const [ontwerp, setOntwerp] = useState(initieleOntwerp);
  const geselecteerdTraceId = selectedTraceId ?? initieleOntwerp.traceIds[0] ?? traces[0]?.id;
  const [plaatsModus, setPlaatsModus] = useState<PlaatsModus | null>(null);
  const [geselecteerdAssetId, setGeselecteerdAssetId] = useState<string | null>(null);
  const [opslagStatus, setOpslagStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const setStap = useCallback(
    (stap: NetontwerpStap) => {
      setPlaatsModus(null);
      const params = new URLSearchParams(searchParams.toString());
      params.set('stap', 'netontwerp');
      params.set('substap', stap);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  /* ── Sneltoetsen: Esc verlaat de plaatsmodus, Delete verwijdert selectie ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const doel = e.target as HTMLElement | null;
      if (doel && ['INPUT', 'TEXTAREA', 'SELECT'].includes(doel.tagName)) return;
      if (e.key === 'Escape') {
        setPlaatsModus(null);
        setGeselecteerdAssetId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && geselecteerdAssetId) {
        e.preventDefault();
        setOntwerp((prev) => ({
          ...prev,
          assets: prev.assets.filter((a) => a.id !== geselecteerdAssetId),
        }));
        setGeselecteerdAssetId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [geselecteerdAssetId]);

  /* ── Debounced opslag van het ontwerp ─────────────────────────────── */
  const ontwerpSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eersteRender = useRef(true);
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false;
      return;
    }
    setOpslagStatus('saving');
    if (ontwerpSaveTimer.current) clearTimeout(ontwerpSaveTimer.current);
    ontwerpSaveTimer.current = setTimeout(async () => {
      await saveNetontwerpAction(ontwerp);
      setOpslagStatus('saved');
    }, 1200);
    return () => {
      if (ontwerpSaveTimer.current) clearTimeout(ontwerpSaveTimer.current);
    };
  }, [ontwerp]);

  /* ── Asset-plaatsing via kaartklik ────────────────────────────────── */
  const traceLinesById = useMemo(() => {
    const map: Record<string, TraceLines> = {};
    for (const t of traces) map[t.id] = getTraceLines(t);
    return map;
  }, [traces]);

  const handleAssetPlaats = useCallback(
    (x: number, y: number) => {
      if (!plaatsModus) return;
      plaatsTeller += 1;

      if (plaatsModus.type === 'aansluiting') {
        const defaults = nieuweAansluitingDefaults('woning');
        setOntwerp((prev) => ({
          ...prev,
          aansluitingen: [
            ...prev.aansluitingen,
            {
              id: `aansl-${Date.now()}-${plaatsTeller}`,
              naam: `Aansluiting ${prev.aansluitingen.length + 1}`,
              type: 'woning',
              aantal: 1,
              kVAPerStuk: defaults.kVAPerStuk,
              gelijktijdigheid: defaults.gelijktijdigheid,
              x,
              y,
              netvlak: 'LS',
            },
          ],
        }));
        return;
      }

      if (plaatsModus.type === 'station') {
        const asset: NetontwerpAsset = {
          id: `station-${Date.now()}-${plaatsTeller}`,
          type: 'station',
          subtype: plaatsModus.subtype,
          naam: `TS-${String(
            ontwerp.assets.filter((a) => a.type === 'station').length + 1,
          ).padStart(3, '0')}`,
          positie: { binding: 'punt', x, y },
          eigenschappen: {},
          bron: 'handmatig',
          gekoppeldeTraceIds: ontwerp.traceIds,
        };
        setOntwerp((prev) => ({ ...prev, assets: [...prev.assets, asset] }));
        return;
      }

      // Mof: snap op het geselecteerde (of dichtstbijzijnde) tracé
      const doelTraceId =
        geselecteerdTraceId && traceLinesById[geselecteerdTraceId]
          ? geselecteerdTraceId
          : Object.keys(traceLinesById)[0];
      if (!doelTraceId) return;
      const snap = snapNaarLijnen(traceLinesById[doelTraceId], x, y, 100);
      if (!snap) return;
      const asset: NetontwerpAsset = {
        id: `mof-${Date.now()}-${plaatsTeller}`,
        type: 'mof',
        subtype: plaatsModus.subtype,
        naam: `Mof km ${(snap.chainageM / 1000).toFixed(3)}`,
        positie: {
          binding: 'chainage',
          traceId: doelTraceId,
          lijnIndex: snap.lijnIndex,
          chainageM: snap.chainageM,
        },
        eigenschappen: {},
        bron: 'handmatig',
        gekoppeldeTraceIds: [doelTraceId],
      };
      setOntwerp((prev) => ({ ...prev, assets: [...prev.assets, asset] }));
    },
    [plaatsModus, ontwerp.assets, ontwerp.traceIds, geselecteerdTraceId, traceLinesById],
  );

  const handleNieuwTrace = useCallback(
    async (netvlak: 'LS' | 'MS') => {
      const resultaat = await maakNieuwTraceAction(ontwerp, netvlak);
      setOntwerp(resultaat.ontwerp);
      setTraces((prev) => [demoTraceToMapTrace(resultaat.trace), ...prev]);
      setSelectedTraceId(resultaat.trace.id);
    },
    [ontwerp, setTraces, setSelectedTraceId],
  );

  /** Bulk-import (CSV): spreid de aansluitingen gelijkmatig langs het eerste tracé. */
  const handleBulkImport = useCallback(
    (rijen: CsvParseResultaat['rijen']) => {
      const lijn =
        (geselecteerdTraceId ? traceLinesById[geselecteerdTraceId] : undefined)?.find(
          (l) => l.length >= 2,
        ) ?? Object.values(traceLinesById).flat().find((l) => l.length >= 2);

      setOntwerp((prev) => {
        const nieuwe = rijen.map((rij, i) => {
          let x = 0;
          let y = 0;
          if (lijn) {
            const totaal = lijnLengteM(lijn);
            const punt = puntOpChainage(lijn, (totaal * (i + 1)) / (rijen.length + 1));
            if (punt) {
              x = punt.x - 25 * Math.sin(punt.richtingRad);
              y = punt.y + 25 * Math.cos(punt.richtingRad);
            }
          }
          plaatsTeller += 1;
          return {
            id: `aansl-csv-${Date.now()}-${plaatsTeller}`,
            netvlak: 'LS' as const,
            x,
            y,
            ...rij,
          };
        });
        return { ...prev, aansluitingen: [...prev.aansluitingen, ...nieuwe] };
      });
    },
    [geselecteerdTraceId, traceLinesById],
  );

  /** Na ringgeneratie: het nieuwe MS-tracé van de server ophalen en tonen. */
  const handleRingTrace = useCallback(
    async (traceId: string) => {
      const verse = await getNetontwerpTracesAction([traceId]);
      if (verse.length) {
        setTraces((prev) => [
          ...verse.map(demoTraceToMapTrace),
          ...prev.filter((t) => t.id !== traceId),
        ]);
        setSelectedTraceId(traceId);
      }
    },
    [setTraces, setSelectedTraceId],
  );

  const handleAssetClick = useCallback((assetId: string) => {
    setGeselecteerdAssetId((prev) => (prev === assetId ? null : assetId));
  }, []);

  /** Slepen: stations vrij verplaatsen; moffen blijven op hun tracé gesnapt. */
  const handleAssetVerplaats = useCallback(
    (assetId: string, x: number, y: number) => {
      setOntwerp((prev) => ({
        ...prev,
        assets: prev.assets.map((a) => {
          if (a.id !== assetId) return a;
          if (a.positie.binding === 'punt') {
            return { ...a, positie: { binding: 'punt', x, y }, bron: 'handmatig' as const };
          }
          if (a.positie.binding === 'chainage') {
            const lines = traceLinesById[a.positie.traceId];
            if (!lines) return a;
            const snap = snapNaarLijnen(lines, x, y, 250);
            if (!snap) return a;
            return {
              ...a,
              bron: 'handmatig' as const,
              positie: {
                ...a.positie,
                lijnIndex: snap.lijnIndex,
                chainageM: Math.round(snap.chainageM * 10) / 10,
              },
            };
          }
          return a;
        }),
      }));
    },
    [traceLinesById],
  );

  const geselecteerdAsset = useMemo(
    () => ontwerp.assets.find((a) => a.id === geselecteerdAssetId) ?? null,
    [ontwerp.assets, geselecteerdAssetId],
  );

  const verwijderGeselecteerdAsset = useCallback(() => {
    if (!geselecteerdAssetId) return;
    setOntwerp((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== geselecteerdAssetId),
    }));
    setGeselecteerdAssetId(null);
  }, [geselecteerdAssetId]);

  /* ── Kaartdata ────────────────────────────────────────────────────── */
  const netontwerpAssets = useMemo(() => {
    const collecties = assetsNaarGeoJSON(ontwerp.assets, traceLinesById);
    return {
      punten: [...collecties.punten, ...aansluitingenNaarFeatures(ontwerp.aansluitingen)],
      lijnen: collecties.lijnen,
    };
  }, [ontwerp.assets, ontwerp.aansluitingen, traceLinesById]);

  const stappenStatus = useMemo(() => afgeleideStapStatus(ontwerp), [ontwerp]);
  const kaartBewerkbaar = actieveStap === 'trace';

  // Publiceer assets + plaatsmodus naar de gedeelde cockpit-kaart.
  const mapConfig = useMemo(
    () => ({
      editable: kaartBewerkbaar,
      defaultDrawMode: 'none' as const,
      netontwerpAssets,
      onAssetPlaats: plaatsModus ? handleAssetPlaats : undefined,
      onAssetClick: handleAssetClick,
      onAssetVerplaats: kaartBewerkbaar ? undefined : handleAssetVerplaats,
    }),
    [kaartBewerkbaar, netontwerpAssets, plaatsModus, handleAssetPlaats, handleAssetClick, handleAssetVerplaats]
  );
  useCockpitMap(mapConfig);

  const ringVolgorde = useMemo(() => {
    const msTrace = traces.find((t) => t.discipline === 'elektra_ms');
    const msLines = msTrace ? traceLinesById[msTrace.id] : undefined;
    if (!msLines?.some((l) => l.length >= 2)) return [];
    const stationPunten = ontwerp.assets
      .filter((a) => a.type === 'station' && a.positie.binding === 'punt')
      .map((a) => {
        const pos = a.positie as { x: number; y: number };
        return { id: a.id, naam: a.naam, x: pos.x, y: pos.y };
      });
    return bepaalRingVolgorde(stationPunten, msLines);
  }, [traces, traceLinesById, ontwerp.assets]);

  const toonPalet: ('aansluiting' | 'station' | 'mof')[] =
    actieveStap === 'belastingen'
      ? ['aansluiting']
      : actieveStap === 'stations'
        ? ['station']
        : actieveStap === 'werktekening'
          ? ['mof']
          : [];

  return (
    <div className="flex h-full flex-col">
      <NetontwerpStappenNav
        actieveStap={actieveStap}
        onStapChange={setStap}
        stappenStatus={stappenStatus}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {geselecteerdAsset && (
          <div className="mb-3 rounded-lg border border-[#2D6FE8]/40 bg-[#2D6FE8]/5 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{geselecteerdAsset.naam}</p>
                <p className="text-[10px] text-muted-foreground">
                  {geselecteerdAsset.type} · {geselecteerdAsset.subtype} · {geselecteerdAsset.bron}
                  {geselecteerdAsset.positie.binding === 'chainage'
                    ? ` · km ${(geselecteerdAsset.positie.chainageM / 1000).toFixed(3)}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={verwijderGeselecteerdAsset}
                className="shrink-0 rounded-md border border-destructive/40 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/10"
              >
                Verwijderen
              </button>
            </div>
          </div>
        )}

        {toonPalet.length > 0 && (
          <div className="mb-3 rounded-lg border border-border bg-card p-3">
            <AssetPalette plaatsModus={plaatsModus} onPlaatsModusChange={setPlaatsModus} toon={toonPalet} />
          </div>
        )}

        {actieveStap === 'belastingen' && (
          <StapBelastingen ontwerp={ontwerp} onOntwerpChange={setOntwerp} onBulkImport={handleBulkImport} />
        )}
        {actieveStap === 'trace' && (
          <StapTrace
            ontwerp={ontwerp}
            traces={traces}
            geselecteerdTraceId={geselecteerdTraceId}
            onSelecteerTrace={setSelectedTraceId}
            onNieuwTrace={handleNieuwTrace}
            opslagStatus={opslagStatus}
          />
        )}
        {actieveStap === 'kabel' && (
          <StapKabel ontwerp={ontwerp} traces={traces} onOntwerpChange={setOntwerp} />
        )}
        {actieveStap === 'stations' && (
          <StapStations
            ontwerp={ontwerp}
            onOntwerpChange={setOntwerp}
            ringVolgorde={ringVolgorde}
            onRingTrace={handleRingTrace}
          />
        )}
        {actieveStap === 'stationsontwerp' && (
          <StapStationsontwerp ontwerp={ontwerp} onOntwerpChange={setOntwerp} />
        )}
        {actieveStap === 'werktekening' && (
          <StapWerktekening ontwerp={ontwerp} onOntwerpChange={setOntwerp} />
        )}
      </div>
    </div>
  );
}
