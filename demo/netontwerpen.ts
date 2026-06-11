/**
 * Demo-netontwerp voor demo-project-001 (Netverzwaring Noordoostpolder Oost):
 * 48 nieuwe woningen + utiliteit + laadinfra langs het bestaande LS-tracé
 * (trace-ls-001, Schokkerweg/Korte Dreef-corridor).
 */

import type { Netontwerp } from '@/lib/netontwerp/types';
import { defaultUitgangspunten, legeStappenStatus } from '@/lib/netontwerp/types';

export const DEMO_NETONTWERPEN: Netontwerp[] = [
  {
    id: 'netontwerp-001',
    projectId: 'demo-project-001',
    naam: 'Netontwerp Schokkerweg-corridor',
    uitgangspunten: defaultUitgangspunten(),
    aansluitingen: [
      {
        id: 'aansl-001',
        naam: 'Nieuwbouw fase 1 (rijwoningen)',
        type: 'woning',
        aantal: 28,
        kVAPerStuk: 4,
        gelijktijdigheid: 0.4,
        x: 179820,
        y: 524740,
        netvlak: 'LS',
      },
      {
        id: 'aansl-002',
        naam: 'Nieuwbouw fase 2 (2-onder-1-kap)',
        type: 'woning',
        aantal: 20,
        kVAPerStuk: 5,
        gelijktijdigheid: 0.4,
        x: 179480,
        y: 524480,
        netvlak: 'LS',
      },
      {
        id: 'aansl-003',
        naam: 'Buurthuis + school',
        type: 'utiliteit',
        aantal: 2,
        kVAPerStuk: 50,
        gelijktijdigheid: 0.7,
        x: 179650,
        y: 524600,
        netvlak: 'LS',
      },
      {
        id: 'aansl-004',
        naam: 'Laadplein (10 laadpunten)',
        type: 'laadinfra',
        aantal: 10,
        kVAPerStuk: 22,
        gelijktijdigheid: 0.9,
        x: 179300,
        y: 524300,
        netvlak: 'LS',
      },
    ],
    assets: [],
    kabelKeuzes: [],
    stationsOntwerpen: [],
    traceIds: ['trace-ls-001'],
    stappenStatus: { ...legeStappenStatus(), belastingen: 'gereed', trace: 'gereed' },
    bijgewerktOp: '2026-06-11T08:00:00.000Z',
  },
];
