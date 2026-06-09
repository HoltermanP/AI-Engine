export type ActionType = 'onderzoek' | 'vergunning' | 'engineering' | 'review' | 'deadline';
export type ActionPrioriteit = 'hoog' | 'normaal' | 'laag';
export type ActionStatus = 'open' | 'bezig' | 'blokkerend' | 'afgerond';

export interface ProjectAction {
  id: string;
  projectId: string;
  traceId?: string;
  traceCode?: string;
  titel: string;
  type: ActionType;
  prioriteit: ActionPrioriteit;
  deadline?: string;
  startDatum?: string;
  planningWeek?: string;
  toegewezenAan?: string;
  afgerondOp?: string;
  status: ActionStatus;
}

export const DEMO_PROJECT_ACTIONS: ProjectAction[] = [
  {
    id: 'act-001',
    projectId: 'demo-project-001',
    traceId: 'trace-ls-001',
    traceCode: 'EL-LS-001',
    titel: 'KLIC-inventarisatie LS Schokkerweg afronden',
    type: 'onderzoek',
    prioriteit: 'normaal',
    deadline: '2026-06-10',
    startDatum: '2026-06-01',
    planningWeek: 'W23',
    toegewezenAan: 'J. de Vries',
    status: 'bezig',
  },
  {
    id: 'act-002',
    projectId: 'demo-project-001',
    traceId: 'trace-ls-001',
    traceCode: 'EL-LS-001',
    titel: 'Omschakelplan bestaand LS-net opstellen',
    type: 'engineering',
    prioriteit: 'hoog',
    deadline: '2026-06-18',
    startDatum: '2026-06-12',
    planningWeek: 'W24',
    toegewezenAan: 'M. Bakker',
    status: 'open',
  },
  {
    id: 'act-003',
    projectId: 'demo-project-002',
    traceId: 'trace-ls-002',
    traceCode: 'EL-LS-002',
    titel: 'Sleufloze boring LS onder trottoir beoordelen',
    type: 'engineering',
    prioriteit: 'normaal',
    deadline: '2026-06-25',
    startDatum: '2026-06-10',
    planningWeek: 'W25',
    toegewezenAan: 'S. Jansen',
    status: 'open',
  },
  {
    id: 'act-004',
    projectId: 'demo-project-002',
    traceId: 'trace-ls-002',
    traceCode: 'EL-LS-002',
    titel: 'Natura 2000-toets tracésectie',
    type: 'onderzoek',
    prioriteit: 'hoog',
    deadline: '2026-06-15',
    startDatum: '2026-05-28',
    planningWeek: 'W22',
    toegewezenAan: 'L. Peters',
    status: 'blokkerend',
  },
  {
    id: 'act-005',
    projectId: 'demo-project-003',
    traceId: 'trace-ls-003',
    traceCode: 'EL-LS-003',
    titel: 'Vergunning LS-werkzaamheden Banterweg',
    type: 'vergunning',
    prioriteit: 'hoog',
    deadline: '2026-06-08',
    startDatum: '2026-05-20',
    planningWeek: 'W21',
    toegewezenAan: 'R. van Dijk',
    status: 'open',
  },
  {
    id: 'act-006',
    projectId: 'demo-project-003',
    traceId: 'trace-ls-003',
    traceCode: 'EL-LS-003',
    titel: 'As-built LS-tekening voorbereiden',
    type: 'engineering',
    prioriteit: 'normaal',
    status: 'open',
  },
  {
    id: 'act-007',
    projectId: 'demo-project-004',
    traceId: 'trace-ls-004',
    traceCode: 'EL-LS-004',
    titel: 'Tracéstudie LS-concept Flevopolder',
    type: 'review',
    prioriteit: 'normaal',
    deadline: '2026-07-01',
    status: 'open',
  },
  {
    id: 'act-008',
    projectId: 'demo-project-004',
    traceId: 'trace-ls-004',
    traceCode: 'EL-LS-004',
    titel: 'Netstudie capaciteit LS-ring',
    type: 'engineering',
    prioriteit: 'normaal',
    deadline: '2026-06-20',
    status: 'open',
  },
  {
    id: 'act-009',
    projectId: 'demo-project-005',
    traceId: 'trace-ls-005',
    traceCode: 'EL-LS-005',
    titel: '120 bedrijfsaansluitingen LS inventariseren',
    type: 'engineering',
    prioriteit: 'normaal',
    status: 'bezig',
  },
  {
    id: 'act-010',
    projectId: 'demo-project-006',
    traceId: 'trace-ls-006',
    traceCode: 'EL-LS-006',
    titel: 'LS-aansluiting MS-ruimte dimensioneren',
    type: 'engineering',
    prioriteit: 'hoog',
    deadline: '2026-06-14',
    status: 'open',
  },
  {
    id: 'act-011',
    projectId: 'demo-project-007',
    traceId: 'trace-ls-007',
    traceCode: 'EL-LS-007',
    titel: 'LS-distributie 200 woningen dimensioneren',
    type: 'engineering',
    prioriteit: 'normaal',
    status: 'open',
  },
  {
    id: 'act-012',
    projectId: 'demo-project-008',
    traceId: 'trace-ls-008',
    traceCode: 'EL-LS-008',
    titel: 'Ecologische quickscan HDD LS-omlegging',
    type: 'onderzoek',
    prioriteit: 'hoog',
    deadline: '2026-06-22',
    status: 'blokkerend',
  },
  {
    id: 'act-013',
    projectId: 'demo-project-008',
    traceId: 'trace-ls-008',
    traceCode: 'EL-LS-008',
    titel: 'HDD-ontwerp LS-kabel onder kwetsbare zone',
    type: 'engineering',
    prioriteit: 'hoog',
    status: 'open',
  },
  {
    id: 'act-014',
    projectId: 'demo-project-009',
    traceId: 'trace-ls-009',
    traceCode: 'EL-LS-009',
    titel: 'LS-tracé utiliteitsstrook NEN 7171 toetsen',
    type: 'review',
    prioriteit: 'normaal',
    deadline: '2026-06-30',
    status: 'open',
  },
  {
    id: 'act-015',
    projectId: 'demo-project-010',
    traceId: 'trace-ls-010',
    traceCode: 'EL-LS-010',
    titel: 'As-built dossier LS NOP West archiveren',
    type: 'review',
    prioriteit: 'laag',
    afgerondOp: '2026-05-15',
    status: 'afgerond',
  },
  {
    id: 'act-016',
    projectId: 'demo-project-001',
    traceId: 'trace-ls-001',
    traceCode: 'EL-LS-001',
    titel: 'Bodemquickscan Schokkerweg uitgevoerd',
    type: 'onderzoek',
    prioriteit: 'normaal',
    afgerondOp: '2026-05-20',
    status: 'afgerond',
  },
  {
    id: 'act-017',
    projectId: 'demo-project-002',
    traceId: 'trace-ls-002',
    traceCode: 'EL-LS-002',
    titel: 'KLIC-inventarisatie tracésectie afgerond',
    type: 'onderzoek',
    prioriteit: 'normaal',
    afgerondOp: '2026-05-15',
    status: 'afgerond',
  },
  {
    id: 'act-018',
    projectId: 'demo-project-005',
    traceId: 'trace-ls-005',
    traceCode: 'EL-LS-005',
    titel: 'Tracévalidatie haven LS afgerond',
    type: 'review',
    prioriteit: 'normaal',
    afgerondOp: '2026-04-22',
    status: 'afgerond',
  },
];

export interface TraceConflictStats {
  traceId: string;
  totaal: number;
  blokkerend: number;
  waarschuwing: number;
}

export const DEMO_TRACE_CONFLICTS: TraceConflictStats[] = [
  { traceId: 'trace-ls-001', totaal: 2, blokkerend: 0, waarschuwing: 2 },
  { traceId: 'trace-ls-002', totaal: 4, blokkerend: 1, waarschuwing: 2 },
  { traceId: 'trace-ls-003', totaal: 1, blokkerend: 0, waarschuwing: 1 },
  { traceId: 'trace-ls-004', totaal: 0, blokkerend: 0, waarschuwing: 0 },
  { traceId: 'trace-ls-005', totaal: 2, blokkerend: 0, waarschuwing: 2 },
  { traceId: 'trace-ls-006', totaal: 1, blokkerend: 0, waarschuwing: 1 },
  { traceId: 'trace-ls-007', totaal: 1, blokkerend: 0, waarschuwing: 1 },
  { traceId: 'trace-ls-008', totaal: 3, blokkerend: 2, waarschuwing: 1 },
  { traceId: 'trace-ls-009', totaal: 2, blokkerend: 0, waarschuwing: 2 },
  { traceId: 'trace-ls-010', totaal: 0, blokkerend: 0, waarschuwing: 0 },
];
