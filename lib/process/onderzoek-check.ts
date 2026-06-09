import type { DemoTrace } from '@/demo/traces';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { OnderzoekType } from '@/lib/research/types';
import { DEMO_NATURA2000 } from '@/demo/pdok';

export interface OnderzoekCheckItem {
  type: OnderzoekType;
  label: string;
  nodig: boolean;
  prioriteit: 'verplicht' | 'aanbevolen' | 'optioneel' | 'niet_nodig';
  reden: string;
  wettelijkKader: string;
}

export interface OnderzoekCheckResult {
  traceId: string;
  uitgevoerdOp: string;
  items: OnderzoekCheckItem[];
  samenvatting: string;
}

function afstandTotNatura2000(trace: DemoTrace): number {
  const n2000Center = {
    x: DEMO_NATURA2000.polygon.reduce((s, [x]) => s + x, 0) / DEMO_NATURA2000.polygon.length,
    y: DEMO_NATURA2000.polygon.reduce((s, [, y]) => s + y, 0) / DEMO_NATURA2000.polygon.length,
  };
  let minDist = Infinity;
  for (const [x, y] of trace.coordinates) {
    minDist = Math.min(minDist, Math.hypot(x - n2000Center.x, y - n2000Center.y));
  }
  return Math.round(minDist);
}

export function checkBenodigdeOnderzoeken(
  trace: DemoTrace,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
): OnderzoekCheckResult {
  const heeftOpenOntgraving = trace.segmenten.some((s) => s.legtechniek === 'open_ontgraving');
  const heeftHdd = trace.segmenten.some((s) => s.legtechniek === 'hdd');
  const heeftWaterkruising = collected?.belemmeringen.some((b) => b.categorie === 'watergang') ?? false;
  const heeftWegkruising = collected?.belemmeringen.some((b) => b.categorie === 'weg') ?? true;
  const n2000Afstand = afstandTotNatura2000(trace);
  const heeftBlokkerend = conflicten?.some((c) => c.ernst === 'blokkerend') ?? false;

  const items: OnderzoekCheckItem[] = [
    {
      type: 'kl_inventarisatie',
      label: 'K&L-inventarisatie (KLIC)',
      nodig: true,
      prioriteit: 'verplicht',
      reden: 'WIBON-verplichting: graafmelding en analyse bestaande kabels en leidingen',
      wettelijkKader: 'Wet informatie-uitwisseling bovengrondse en ondergrondse netten (WIBON)',
    },
    {
      type: 'bodem_nen5725',
      label: 'Quick scan bodem (NEN 5725)',
      nodig: heeftOpenOntgraving,
      prioriteit: heeftOpenOntgraving ? 'verplicht' : 'aanbevolen',
      reden: heeftOpenOntgraving
        ? 'Open ontgraving in utiliteitsstrook — bodemverwijdering verwacht'
        : 'Geen open ontgraving (HDD/sleufloos) — vooronderzoek ter voorkoming',
      wettelijkKader: 'NEN 5725 / Besluit bodemkwaliteit',
    },
    {
      type: 'archeologie',
      label: 'Bureauonderzoek archeologie',
      nodig: true,
      prioriteit: 'aanbevolen',
      reden: 'Standaard bij grondverzet in Noordoostpolder; droogmakerijgebied na 1942',
      wettelijkKader: 'Erfgoedwet / gemeentelijk beleid Noordoostpolder',
    },
    {
      type: 'nge_ce',
      label: 'NGE/CE-bureauonderzoek',
      nodig: false,
      prioriteit: 'niet_nodig',
      reden: 'Noordoostpolder: droogmakerij na 1942, geen militaire activiteiten gedocumenteerd',
      wettelijkKader: 'CROW-richtlijn NGE/CE',
    },
    {
      type: 'ecologie_wnb',
      label: 'Ecologische quickscan (Wnb)',
      nodig: true,
      prioriteit: heeftWaterkruising ? 'verplicht' : 'aanbevolen',
      reden: heeftWaterkruising
        ? 'Waterkruising Prinsengracht Noord — beschermde soorten (bittervoorn, amfibieën)'
        : 'Slootkanten in tracégebied — broedvogels mogelijk',
      wettelijkKader: 'Wet natuurbescherming (Wnb)',
    },
    {
      type: 'natura2000',
      label: 'Natura 2000-toets',
      nodig: n2000Afstand < 1000,
      prioriteit: n2000Afstand < 500 ? 'verplicht' : n2000Afstand < 1000 ? 'aanbevolen' : 'niet_nodig',
      reden: `Afstand tot Wolderwijd/Eemmeer: ca. ${n2000Afstand} m`,
      wettelijkKader: 'Habitatrichtlijn / Aanvullingswet natuur Omgevingswet',
    },
  ];

  const nodig = items.filter((i) => i.nodig && i.prioriteit !== 'niet_nodig');
  const samenvatting = [
    `${nodig.length} onderzoeken vereist/aanbevolen voor tracé ${trace.code} langs ${trace.wegnaam}.`,
    heeftOpenOntgraving ? 'Open ontgraving gedetecteerd → bodemonderzoek verplicht.' : null,
    heeftHdd ? 'HDD-segmenten aanwezig → beperkte bodemverwijdering.' : null,
    heeftWaterkruising ? 'Waterkruising → ecologisch toezicht vereist.' : null,
    heeftWegkruising ? 'Wegkruising/parallel → verkeersbesluit waarschijnlijk nodig.' : null,
    heeftBlokkerend ? 'Blokkerende conflicten → afstemming netbeheerders vereist.' : null,
  ].filter(Boolean).join(' ');

  return {
    traceId: trace.id,
    uitgevoerdOp: new Date().toISOString(),
    items,
    samenvatting,
  };
}
