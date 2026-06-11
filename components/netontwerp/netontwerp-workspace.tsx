'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Netontwerp, NetontwerpAsset, NetontwerpStap } from '@/lib/netontwerp/types';
import { nieuweAansluitingDefaults } from '@/lib/netontwerp/belastingen';
import { afgeleideStapStatus } from '@/lib/netontwerp/stappen';
import { snapNaarLijnen } from '@/lib/netontwerp/chainage';
import { saveNetontwerpAction, maakNieuwTraceAction } from '@/lib/actions/netontwerp';
import { demoTraceToMapTrace } from '@/lib/trace-edit';
import { saveManualTraceAction } from '@/lib/actions/trace-routing';
import { assetsNaarGeoJSON, aansluitingenNaarFeatures } from '@/lib/map/netontwerp-assets';
import { MapWorkspace } from '@/components/map-workspace';
import type { MapTrace } from '@/components/trace-map';
import { getTraceLines, flattenTraceLines, type TraceLines } from '@/lib/trace-edit';
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
  initieleTraces: MapTrace[];
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

export function NetontwerpWorkspace({ initieleOntwerp, initieleTraces }: NetontwerpWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stapParam = searchParams.get('stap') as NetontwerpStap | null;
  const actieveStap: NetontwerpStap =
    stapParam && GELDIGE_STAPPEN.includes(stapParam) ? stapParam : 'belastingen';

  const [ontwerp, setOntwerp] = useState(initieleOntwerp);
  const [traces, setTraces] = useState(initieleTraces);
  const [geselecteerdTraceId, setGeselecteerdTraceId] = useState<string | undefined>(
    initieleOntwerp.traceIds[0] ?? initieleTraces[0]?.id,
  );
  const [plaatsModus, setPlaatsModus] = useState<PlaatsModus | null>(null);
  const [geselecteerdAssetId, setGeselecteerdAssetId] = useState<string | null>(null);
  const [opslagStatus, setOpslagStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const setStap = useCallback(
    (stap: NetontwerpStap) => {
      setPlaatsModus(null);
      router.replace(`?stap=${stap}`, { scroll: false });
    },
    [router],
  );

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

  /* ── Debounced opslag van tracégeometrie (stap 2) ─────────────────── */
  const traceSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTracesChange = useCallback(
    (volgende: MapTrace[]) => {
      setTraces(volgende);
      if (!geselecteerdTraceId) return;
      const trace = volgende.find((t) => t.id === geselecteerdTraceId);
      if (!trace) return;
      setOpslagStatus('saving');
      if (traceSaveTimer.current) clearTimeout(traceSaveTimer.current);
      traceSaveTimer.current = setTimeout(async () => {
        const lines = getTraceLines(trace);
        await saveManualTraceAction(
          trace.id,
          flattenTraceLines(lines),
          lines as [number, number, number][][],
        );
        setOpslagStatus('saved');
      }, 1200);
    },
    [geselecteerdTraceId],
  );

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
      setGeselecteerdTraceId(resultaat.trace.id);
    },
    [ontwerp],
  );

  const handleAssetClick = useCallback((assetId: string) => {
    setGeselecteerdAssetId((prev) => (prev === assetId ? null : assetId));
  }, []);

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

  const toonPalet: ('aansluiting' | 'station' | 'mof')[] =
    actieveStap === 'belastingen'
      ? ['aansluiting']
      : actieveStap === 'stations'
        ? ['station']
        : actieveStap === 'werktekening'
          ? ['mof']
          : [];

  const kaartBewerkbaar = actieveStap === 'trace';

  return (
    <div className="flex h-full flex-col">
      <NetontwerpStappenNav
        actieveStap={actieveStap}
        onStapChange={setStap}
        stappenStatus={stappenStatus}
      />

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        {/* Kaart + palet */}
        <div className="min-h-[320px] flex-1 xl:min-h-0">
          <MapWorkspace
            traces={traces}
            onTracesChange={handleTracesChange}
            selectedTraceId={geselecteerdTraceId}
            editable={kaartBewerkbaar}
            defaultDrawMode="none"
            netontwerpAssets={netontwerpAssets}
            onAssetPlaats={plaatsModus ? handleAssetPlaats : undefined}
            onAssetClick={handleAssetClick}
          />
        </div>

        {/* Stappaneel */}
        <div className="w-full shrink-0 overflow-y-auto border-t border-border bg-background p-3 xl:w-[380px] xl:border-l xl:border-t-0">
          {geselecteerdAsset && (
            <div className="mb-3 rounded-lg border border-[#2D6FE8]/40 bg-[#2D6FE8]/5 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{geselecteerdAsset.naam}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {geselecteerdAsset.type} · {geselecteerdAsset.subtype} ·{' '}
                    {geselecteerdAsset.bron}
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
              <AssetPalette
                plaatsModus={plaatsModus}
                onPlaatsModusChange={setPlaatsModus}
                toon={toonPalet}
              />
            </div>
          )}

          {actieveStap === 'belastingen' && (
            <StapBelastingen ontwerp={ontwerp} onOntwerpChange={setOntwerp} />
          )}
          {actieveStap === 'trace' && (
            <StapTrace
              ontwerp={ontwerp}
              traces={traces}
              geselecteerdTraceId={geselecteerdTraceId}
              onSelecteerTrace={setGeselecteerdTraceId}
              onNieuwTrace={handleNieuwTrace}
              opslagStatus={opslagStatus}
            />
          )}
          {actieveStap === 'kabel' && (
            <StapKabel ontwerp={ontwerp} traces={traces} onOntwerpChange={setOntwerp} />
          )}
          {actieveStap === 'stations' && (
            <StapStations ontwerp={ontwerp} onOntwerpChange={setOntwerp} />
          )}
          {actieveStap === 'stationsontwerp' && (
            <StapStationsontwerp ontwerp={ontwerp} onOntwerpChange={setOntwerp} />
          )}
          {actieveStap === 'werktekening' && (
            <StapWerktekening ontwerp={ontwerp} onOntwerpChange={setOntwerp} />
          )}
        </div>
      </div>
    </div>
  );
}
