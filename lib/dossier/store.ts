import type { CalcResult } from '@/lib/calc/types';
import type { DrawingResult } from '@/lib/drawings/types';
import type { OnderzoekDocument, AanvraagDocument, VergunningCheckItem } from '@/lib/research/types';
import type { DetectedConflict } from '@/lib/services/conflict-detection';

export interface DossierItem {
  id: string;
  projectId: string;
  traceId: string;
  naam: string;
  type: 'berekening' | 'tekening' | 'onderzoek' | 'aanvraag' | 'rapport' | 'ai' | 'calculatie';
  inhoud: string;
  formaat?: string;
  createdAt: string;
  _source?: 'live' | 'demo';
}

const dossierStore = new Map<string, DossierItem[]>();

function key(projectId: string) {
  return projectId;
}

export function getDossierItems(projectId: string, traceId?: string): DossierItem[] {
  const items = dossierStore.get(key(projectId)) ?? [];
  return traceId ? items.filter((i) => i.traceId === traceId) : items;
}

export function addToDossier(item: Omit<DossierItem, 'id' | 'createdAt'>): DossierItem {
  const k = key(item.projectId);
  const items = dossierStore.get(k) ?? [];
  const newItem: DossierItem = {
    ...item,
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  items.push(newItem);
  dossierStore.set(k, items);
  return newItem;
}

export function saveBerekeningenToDossier(
  projectId: string,
  traceId: string,
  traceCode: string,
  berekeningen: CalcResult[]
): DossierItem[] {
  return berekeningen.map((b) =>
    addToDossier({
      projectId,
      traceId,
      naam: `${traceCode} — ${b.type}`,
      type: 'berekening',
      inhoud: JSON.stringify(b, null, 2),
      formaat: 'json',
    })
  );
}

export function saveTekeningenToDossier(
  projectId: string,
  traceId: string,
  tekeningen: DrawingResult[]
): DossierItem[] {
  return tekeningen.map((t) =>
    addToDossier({
      projectId,
      traceId,
      naam: t.label,
      type: 'tekening',
      inhoud: t.svg,
      formaat: 'svg',
    })
  );
}

export function saveOnderzoekenToDossier(
  projectId: string,
  traceId: string,
  onderzoeken: OnderzoekDocument[]
): DossierItem[] {
  return onderzoeken.map((o) =>
    addToDossier({
      projectId,
      traceId,
      naam: o.titel,
      type: 'onderzoek',
      inhoud: o.inhoud,
      formaat: 'markdown',
      _source: o._source,
    })
  );
}

export function saveBoreEngineeringToDossier(
  projectId: string,
  traceId: string,
  traceCode: string,
  result: import('@/lib/bore/types').BoreEngineeringResult,
): DossierItem[] {
  const items: DossierItem[] = [];
  for (const seg of result.segmenten) {
    items.push(
      addToDossier({
        projectId,
        traceId,
        naam: `${traceCode} — Boorplan S${seg.volgorde}`,
        type: 'berekening',
        inhoud: JSON.stringify({ boorplan: seg.boorplan, berekeningen: seg.berekeningen }, null, 2),
        formaat: 'json',
      })
    );
  }
  return items;
}

export function saveCalculatieToDossier(
  projectId: string,
  traceId: string,
  calculatie: import('@/lib/calculatie/types').CalculatieResult,
  excelBase64?: string,
): DossierItem[] {
  const items: DossierItem[] = [
    addToDossier({
      projectId,
      traceId,
      naam: `${calculatie.traceCode} — Calculatie`,
      type: 'calculatie',
      inhoud: JSON.stringify(calculatie, null, 2),
      formaat: 'json',
    }),
  ];
  if (excelBase64) {
    items.push(
      addToDossier({
        projectId,
        traceId,
        naam: `${calculatie.traceCode} — Calculatie.xlsx`,
        type: 'calculatie',
        inhoud: excelBase64,
        formaat: 'xlsx',
      })
    );
  }
  return items;
}

export function saveAanvragenToDossier(
  projectId: string,
  traceId: string,
  aanvragen: AanvraagDocument[]
): DossierItem[] {
  return aanvragen.map((a) =>
    addToDossier({
      projectId,
      traceId,
      naam: a.titel,
      type: 'aanvraag',
      inhoud: a.inhoud,
      formaat: 'text',
      _source: a._source,
    })
  );
}

export function saveAiAnalyseToDossier(
  projectId: string,
  traceId: string,
  traceCode: string,
  text: string,
  source: 'live' | 'demo'
): DossierItem {
  return addToDossier({
    projectId,
    traceId,
    naam: `${traceCode} — AI-conflictanalyse`,
    type: 'ai',
    inhoud: text,
    formaat: 'text',
    _source: source,
  });
}

export function saveVergunningChecklistToDossier(
  projectId: string,
  traceId: string,
  traceCode: string,
  checklist: VergunningCheckItem[]
): DossierItem {
  return addToDossier({
    projectId,
    traceId,
    naam: `${traceCode} — Vergunningchecklist`,
    type: 'rapport',
    inhoud: JSON.stringify(checklist, null, 2),
    formaat: 'json',
  });
}

export function saveDoDocumentToDossier(
  projectId: string,
  inhoud: string
): DossierItem {
  return addToDossier({
    projectId,
    traceId: 'project',
    naam: 'Definitief Ontwerp (DO)',
    type: 'rapport',
    inhoud,
    formaat: 'markdown',
  });
}

export function buildFullDossierSummary(
  projectId: string,
  traceId: string,
  conflicten: DetectedConflict[]
) {
  const items = getDossierItems(projectId, traceId);
  return {
    totaal: items.length,
    berekeningen: items.filter((i) => i.type === 'berekening').length,
    tekeningen: items.filter((i) => i.type === 'tekening').length,
    onderzoeken: items.filter((i) => i.type === 'onderzoek').length,
    aanvragen: items.filter((i) => i.type === 'aanvraag').length,
    conflicten: conflicten.length,
    blokkerend: conflicten.filter((c) => c.ernst === 'blokkerend').length,
  };
}
