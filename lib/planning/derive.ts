import type { DemoTrace } from '@/demo/traces';
import type { TraceFase } from '@/lib/db/types';
import { traceLengthM } from '@/lib/geo';
import { checkBenodigdeOnderzoeken } from '@/lib/process/onderzoek-check';
import { ENGINEERING_WORKFLOW } from '@/lib/process/workflow';
import { sleuflozeSegmenten } from '@/lib/bore';
import { BORE_METHODE_LABELS } from '@/lib/bore/types';
import type { PlanningActiviteitTemplate } from './types';

function prefix(trace: DemoTrace, id: string) {
  return `${trace.code}-${id}`;
}

function lengtePerTech(trace: DemoTrace): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of trace.segmenten) {
    map[s.legtechniek] = (map[s.legtechniek] ?? 0) + s.lengteM;
  }
  if (!trace.segmenten.length) {
    map.open_ontgraving = traceLengthM(trace.coordinates, trace.traceLines);
  }
  return map;
}

/** Workflow-stappen afgerond per tracéfase (demo-heuristiek). */
export function afgerondeStappenVoorFase(fase: TraceFase): Set<string> {
  const all = ENGINEERING_WORKFLOW.map((s) => s.id);
  const idx: Record<TraceFase, number> = {
    VO: 2,
    DO: 5,
    UO: 12,
    as_built: all.length,
  };
  const cut = idx[fase];
  return new Set(all.slice(0, cut));
}

export function deriveTraceActiviteitTemplates(trace: DemoTrace): PlanningActiviteitTemplate[] {
  const templates: PlanningActiviteitTemplate[] = [];
  const lengte = traceLengthM(trace.coordinates, trace.traceLines);
  const perTech = lengtePerTech(trace);
  const onderzoek = checkBenodigdeOnderzoeken(trace);

  templates.push({
    id: prefix(trace, 'ontwerp'),
    titel: `Tracéontwerp ${trace.code}`,
    beschrijving: `Ontwerp en vaststelling tracé ${trace.naam} langs ${trace.wegnaam}. Discipline: ${trace.discipline.replace(/_/g, ' ')}, nettype ${trace.netType}. Leglocatie: ${trace.leglocatie}. Lengte ca. ${Math.round(lengte)} m.`,
    categorie: 'ontwerp',
    duurDagen: Math.max(5, Math.ceil(lengte / 80)),
    voorgangerIds: [],
    deliverables: ['Tracétekening concept', 'Segmentindeling legtechniek', 'Coördinatenlijst RD'],
    traceScope: true,
  });

  templates.push({
    id: prefix(trace, 'data'),
    titel: `Data verzamelen ${trace.code}`,
    beschrijving: `Ophalen PDOK (BGT, BRK, AHN), BRO (CPT, grondwater), KLIC, waterschap-legger en netbeheerder-GIS voor bbox tracé ${trace.code}.`,
    categorie: 'data',
    duurDagen: 3,
    voorgangerIds: [prefix(trace, 'ontwerp')],
    deliverables: ['Verzamelde datalagen', 'Bronoverzicht'],
    traceScope: true,
  });

  templates.push({
    id: prefix(trace, 'toets'),
    titel: `Tracé toetsen ${trace.code}`,
    beschrijving: `Conflictdetectie: afstand tot K&L, dekking NEN 7171, kruisingen weg/water, bebouwing en Natura 2000. ${trace.omschrijving}`,
    categorie: 'toets',
    duurDagen: 2,
    voorgangerIds: [prefix(trace, 'data')],
    deliverables: ['Conflictenoverzicht', 'Toetsrapport tracé'],
    traceScope: true,
  });

  templates.push({
    id: prefix(trace, 'berekenen'),
    titel: `Engineering berekenen ${trace.code}`,
    beschrijving: `Discipline-specifieke berekeningen (${trace.discipline.replace(/_/g, ' ')}): dimensionering, spanningsval/drukverlies, legdiepte conform norm.`,
    categorie: 'engineering',
    duurDagen: 4,
    voorgangerIds: [prefix(trace, 'toets')],
    deliverables: ['Berekeningsrapport', 'Normverwijzingen'],
    traceScope: true,
  });

  templates.push({
    id: prefix(trace, 'tekenen'),
    titel: `Tekeningen ${trace.code}`,
    beschrijving: `Genereren tracétekening, lengteprofiel, dwarsprofiel AVOI en kruisingsdetails conform NLCS/IMKL.`,
    categorie: 'engineering',
    duurDagen: 3,
    voorgangerIds: [prefix(trace, 'berekenen')],
    deliverables: ['SVG-tekeningen', 'Tekeninglijst'],
    traceScope: true,
  });

  templates.push({
    id: prefix(trace, 'calculatie'),
    titel: `Calculatie ${trace.code}`,
    beschrijving: `Kostenraming op basis van tracé: materialen, grondwerk, sleufloze techniek en herstelwerk in RAW-posten met eenheidsprijzen.`,
    categorie: 'calculatie',
    duurDagen: 2,
    voorgangerIds: [prefix(trace, 'berekenen')],
    deliverables: ['Calculatie Excel', 'Postenoverzicht'],
    traceScope: true,
  });

  const sleufloos = sleuflozeSegmenten(trace);
  if (sleufloos.length) {
    templates.push({
      id: prefix(trace, 'boorengineering'),
      titel: `Boorengineering ${trace.code}`,
      beschrijving: `Uitwerken ${sleufloos.map((s) => `${BORE_METHODE_LABELS[s.legtechniek as keyof typeof BORE_METHODE_LABELS] ?? s.legtechniek} (${s.lengteM} m)`).join(', ')}. CPT-koppeling, boorplan en boorprofiel-tekeningen.`,
      categorie: 'boorengineering',
      duurDagen: 5 + sleufloos.length * 3,
      voorgangerIds: [prefix(trace, 'berekenen')],
      deliverables: ['Boorplan per segment', 'Boorprofiel-tekeningen', 'Trekkrachtberekening'],
      traceScope: true,
    });
  }

  templates.push({
    id: prefix(trace, 'onderzoek-check'),
    titel: `Check onderzoeken ${trace.code}`,
    beschrijving: onderzoek.samenvatting,
    categorie: 'onderzoek',
    duurDagen: 1,
    voorgangerIds: [prefix(trace, 'toets')],
    deliverables: ['Onderzoeksprogramma'],
    traceScope: true,
  });

  for (const item of onderzoek.items.filter((i) => i.nodig && i.prioriteit !== 'niet_nodig')) {
    const step = ENGINEERING_WORKFLOW.find((s) => s.onderzoekType === item.type);
    templates.push({
      id: prefix(trace, `onderzoek-${item.type}`),
      titel: item.label,
      beschrijving: `${item.reden} Wettelijk kader: ${item.wettelijkKader}. Prioriteit: ${item.prioriteit}.`,
      categorie: 'onderzoek',
      duurDagen: item.prioriteit === 'verplicht' ? 14 : 7,
      voorgangerIds: [prefix(trace, 'onderzoek-check')],
      deliverables: [`Rapport ${item.label}`, 'Advies mitigerende maatregelen'],
      traceScope: true,
    });
  }

  templates.push({
    id: prefix(trace, 'vergunning'),
    titel: `Vergunningen ${trace.code}`,
    beschrijving: `Vergunningchecklist OMO/OMA: melding activiteit Omgevingswet, eventueel watervergunning, kabelbedrijf-meldingen en verkeersbesluit bij wegkruising.`,
    categorie: 'vergunning',
    duurDagen: 10,
    voorgangerIds: [prefix(trace, 'onderzoek-check')],
    deliverables: ['Vergunningchecklist', 'Concept-aanvragen'],
    traceScope: true,
  });

  templates.push({
    id: prefix(trace, 'aanvragen'),
    titel: `Aanvragen & afstemming ${trace.code}`,
    beschrijving: `Indienen meldingen, afstemming netbeheerders, WIBON graafmelding en omgevingsdienst.`,
    categorie: 'vergunning',
    duurDagen: 5,
    voorgangerIds: [prefix(trace, 'vergunning')],
    deliverables: ['Verzonden aanvragen', 'Afstemming netbeheerder'],
    traceScope: true,
  });

  const uitvoeringVoorgangers = [
    prefix(trace, 'tekenen'),
    prefix(trace, 'aanvragen'),
    ...(sleufloos.length ? [prefix(trace, 'boorengineering')] : []),
  ];

  templates.push({
    id: prefix(trace, 'uitvoorbereid'),
    titel: `Werkvoorbereiding uitvoering ${trace.code}`,
    beschrijving: `Inrichten werkvak, afzetting, proefsleuf en coördinatie uitvoerder. Tracé ${Math.round(lengte)} m.`,
    categorie: 'uitvoering',
    duurDagen: 3,
    voorgangerIds: uitvoeringVoorgangers,
    deliverables: ['Uitvoeringsplan', 'Veiligheidsplan'],
    traceScope: true,
  });

  if (perTech.open_ontgraving) {
    templates.push({
      id: prefix(trace, 'uitvoer-open'),
      titel: `Open sleuf ${trace.code}`,
      beschrijving: `Grondwerk en leggen in open sleuf over ${Math.round(perTech.open_ontgraving)} m. Dekking ${trace.vereisteDekking} m.`,
      categorie: 'uitvoering',
      duurDagen: Math.max(3, Math.ceil(perTech.open_ontgraving / 25)),
      voorgangerIds: [prefix(trace, 'uitvoorbereid')],
      deliverables: ['Uitgevoerde sleuf', 'As-built meting'],
      traceScope: true,
    });
  }

  if (perTech.hdd) {
    templates.push({
      id: prefix(trace, 'uitvoer-hdd'),
      titel: `HDD-uitvoering ${trace.code}`,
      beschrijving: `Gestuurd boren ${Math.round(perTech.hdd)} m incl. start/eindputten en intrekken productleiding.`,
      categorie: 'uitvoering',
      duurDagen: Math.max(5, Math.ceil(perTech.hdd / 15)),
      voorgangerIds: [prefix(trace, 'uitvoorbereid')],
      deliverables: ['HDD-as-built', 'Boormelding'],
      traceScope: true,
    });
  }

  if (perTech.persing) {
    templates.push({
      id: prefix(trace, 'uitvoer-persing'),
      titel: `Persing ${trace.code}`,
      beschrijving: `Persing/microtunneling ${Math.round(perTech.persing)} m.`,
      categorie: 'uitvoering',
      duurDagen: Math.max(4, Math.ceil(perTech.persing / 12)),
      voorgangerIds: [prefix(trace, 'uitvoorbereid')],
      deliverables: ['Persing-as-built'],
      traceScope: true,
    });
  }

  if (perTech.sleufloos) {
    templates.push({
      id: prefix(trace, 'uitvoer-sleufloos'),
      titel: `Sleufloze leg ${trace.code}`,
      beschrijving: `Sleufloze techniek (asfaltzagen/trekken) over ${Math.round(perTech.sleufloos)} m.`,
      categorie: 'uitvoering',
      duurDagen: Math.max(2, Math.ceil(perTech.sleufloos / 30)),
      voorgangerIds: [prefix(trace, 'uitvoorbereid')],
      deliverables: ['Sleufloos as-built'],
      traceScope: true,
    });
  }

  const uitvoerIds = [
    ...(perTech.open_ontgraving ? [prefix(trace, 'uitvoer-open')] : []),
    ...(perTech.hdd ? [prefix(trace, 'uitvoer-hdd')] : []),
    ...(perTech.persing ? [prefix(trace, 'uitvoer-persing')] : []),
    ...(perTech.sleufloos ? [prefix(trace, 'uitvoer-sleufloos')] : []),
  ];

  templates.push({
    id: prefix(trace, 'herstel'),
    titel: `Herstelwerk ${trace.code}`,
    beschrijving: `Herstel verharding, bestrating en berm conform leglocatie per segment.`,
    categorie: 'uitvoering',
    duurDagen: Math.max(2, Math.ceil(lengte / 50)),
    voorgangerIds: uitvoerIds.length ? uitvoerIds : [prefix(trace, 'uitvoorbereid')],
    deliverables: ['Hersteltekening', 'Fotoverslag'],
    traceScope: true,
  });

  templates.push({
    id: prefix(trace, 'dossier'),
    titel: `Dossier ${trace.code}`,
    beschrijving: `Bundelen berekeningen, tekeningen, onderzoeken en DO-document voor oplevering tracé ${trace.code}.`,
    categorie: 'dossier',
    duurDagen: 3,
    voorgangerIds: [prefix(trace, 'herstel'), prefix(trace, 'calculatie')],
    deliverables: ['Compleet tracé-dossier', 'DO-document'],
    milestone: true,
    traceScope: true,
  });

  return templates;
}

export function deriveProjectActiviteitTemplates(): PlanningActiviteitTemplate[] {
  return [
    {
      id: 'project-kickoff',
      titel: 'Projectkick-off',
      beschrijving: 'Startbijeenkomst opdrachtgever, scope, planning en rollen vaststellen.',
      categorie: 'project',
      duurDagen: 1,
      voorgangerIds: [],
      deliverables: ['Projectplan', 'Communicatieplan'],
      milestone: true,
    },
    {
      id: 'project-oplevering',
      titel: 'Eindoplevering project',
      beschrijving: 'Overdracht dossier, as-built en evaluatie aan opdrachtgever.',
      categorie: 'project',
      duurDagen: 1,
      voorgangerIds: [],
      deliverables: ['Opleveringsrapport', 'Gedeponeerd dossier'],
      milestone: true,
    },
  ];
}
