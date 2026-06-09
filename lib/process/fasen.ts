/**
 * Projectfasering voor infra-engineering (kabels & leidingen).
 *
 * Het standaardproces: Verkenning → VO → DO → UO → Werkvoorbereiding →
 * Uitvoering & As-built. Elke fase heeft eigen deliverables met een status
 * (concept / in_review / definitief). De registry hieronder is de centrale
 * bron voor fase-navigatie, deliverable-dashboards en documentcodering.
 */

export type ProjectFaseId =
  | 'verkenning'
  | 'vo'
  | 'do'
  | 'uo'
  | 'werkvoorbereiding'
  | 'uitvoering';

export type DeliverableStatus = 'ontbreekt' | 'concept' | 'in_review' | 'definitief';

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  ontbreekt: 'Nog niet gestart',
  concept: 'Concept',
  in_review: 'In review',
  definitief: 'Definitief',
};

export interface DeliverableDef {
  id: string;
  naam: string;
  /** Documenttype voor de documentcodering (RAP/NOT/TEK/BER/PLN/CAL/LST/VGP). */
  docType: 'RAP' | 'NOT' | 'TEK' | 'BER' | 'PLN' | 'CAL' | 'LST' | 'VGP';
  omschrijving: string;
}

export interface ProjectFaseDef {
  id: ProjectFaseId;
  nummer: number;
  naam: string;
  kort: string;
  omschrijving: string;
  deliverables: DeliverableDef[];
}

export const PROJECT_FASEN: ProjectFaseDef[] = [
  {
    id: 'verkenning',
    nummer: 1,
    naam: 'Verkenning / Haalbaarheid',
    kort: 'Verkenning',
    omschrijving: 'Quick scans, tracéstudie en go/no-go advies',
    deliverables: [
      { id: 'quickscans', naam: 'Quick scans (bodem, water, natuur, archeologie, NGE, K&L)', docType: 'RAP', omschrijving: 'Themascans met ernst-indicatie per bevinding' },
      { id: 'tracestudie', naam: 'Tracéstudie / afwegingsnotitie', docType: 'RAP', omschrijving: 'Voorkeurstracé + alternatieven met multicriteria-afweging' },
      { id: 'gonogo', naam: 'Go/no-go advies', docType: 'NOT', omschrijving: 'Haalbaarheidsconclusie met risico-top-5' },
    ],
  },
  {
    id: 'vo',
    nummer: 2,
    naam: 'Voorontwerp (VO)',
    kort: 'VO',
    omschrijving: 'Voorkeurstracé + 2 alternatieven, uitgangspunten, VO-tekeningen',
    deliverables: [
      { id: 'uitgangspunten', naam: 'Uitgangspuntennotitie', docType: 'NOT', omschrijving: 'Aannames, normen, dekking, parallelafstanden, kruisingsmethoden' },
      { id: 'vo_tekeningen', naam: 'VO-tekeningen (situatie)', docType: 'TEK', omschrijving: 'Situatietekening voorkeurstracé op BGT-ondergrond' },
      { id: 'afwegingsmatrix', naam: 'Tracé-afwegingsmatrix', docType: 'RAP', omschrijving: 'Multicriteria-analyse met scores en advies' },
      { id: 'raming', naam: 'Kostenraming (±30%)', docType: 'CAL', omschrijving: 'Raming op basis van tracéhoeveelheden' },
    ],
  },
  {
    id: 'do',
    nummer: 3,
    naam: 'Definitief Ontwerp (DO)',
    kort: 'DO',
    omschrijving: 'Definitief tracé, DO-nota, vergunningen, DO-tekeningen',
    deliverables: [
      { id: 'do_nota', naam: 'DO-nota', docType: 'RAP', omschrijving: 'Definitief ontwerp met onderbouwing en toetsresultaten' },
      { id: 'vergunningen', naam: 'Vergunningeninventarisatie', docType: 'LST', omschrijving: 'Benodigde vergunningen/meldingen incl. wettelijke termijnen' },
      { id: 'do_tekeningen', naam: 'DO-tekeningen', docType: 'TEK', omschrijving: 'Situatie, lengteprofiel en kruisingsdetails' },
      { id: 'budget', naam: 'Budgetcalculatie (±15%)', docType: 'CAL', omschrijving: 'Budget op basis van uitgewerkt ontwerp' },
    ],
  },
  {
    id: 'uo',
    nummer: 4,
    naam: 'Uitvoeringsontwerp (UO)',
    kort: 'UO',
    omschrijving: 'Detailengineering, boorengineering, alle berekeningen, UO-tekeningen',
    deliverables: [
      { id: 'boorengineering', naam: 'Boorengineering-rapport(en)', docType: 'BER', omschrijving: 'Boorlijnontwerp, trekkracht, mudspanning, sterktecontrole per boring' },
      { id: 'kabeltrek', naam: 'Kabeltrekberekening', docType: 'BER', omschrijving: 'Trekkracht en zijwaartse druk over het tracé' },
      { id: 'thermisch', naam: 'Thermische berekening (IEC 60287)', docType: 'BER', omschrijving: 'Belastbaarheid bij legpatroon en bodemwarmteweerstand' },
      { id: 'uo_tekeningen', naam: 'UO-tekeningen', docType: 'TEK', omschrijving: 'Maatgevende details, dwarsprofielen, boortekeningen' },
      { id: 'inschrijfbegroting', naam: 'Inschrijf-/directiebegroting', docType: 'CAL', omschrijving: 'Begroting op UO-niveau' },
    ],
  },
  {
    id: 'werkvoorbereiding',
    nummer: 5,
    naam: 'Werkvoorbereiding',
    kort: 'WVB',
    omschrijving: 'Werktekeningen, kabeltrekplan, materiaal, proefsleuven, planning, V&G',
    deliverables: [
      { id: 'werktekeningen', naam: 'Werktekeningen', docType: 'TEK', omschrijving: 'Tekeningen met maatvoering voor uitvoering' },
      { id: 'kabeltrekplan', naam: 'Kabeltrekplan', docType: 'PLN', omschrijving: 'Trekvakken, opstelplaatsen, rollenplan, trekkrachtcontrole' },
      { id: 'materiaallijst', naam: 'Materiaallijst', docType: 'LST', omschrijving: 'Kabel/buis per haspel, moffen, bedding, markering' },
      { id: 'proefsleuvenplan', naam: 'Proefsleuvenplan (CROW 500)', docType: 'PLN', omschrijving: 'Proefsleuflocaties op basis van KLIC-dichtheid en kruisingen' },
      { id: 'uitvoeringsplanning', naam: 'Uitvoeringsplanning', docType: 'PLN', omschrijving: 'Volgorde werkvakken, boringen, kabeltrekken, herstel' },
      { id: 'vg_plan', naam: 'V&G-plan ontwerpfase', docType: 'VGP', omschrijving: 'Veiligheids- en gezondheidsplan met projectrisico\'s' },
    ],
  },
  {
    id: 'uitvoering',
    nummer: 6,
    naam: 'Uitvoering & As-built',
    kort: 'Uitvoering',
    omschrijving: 'Revisiegegevens, as-built tekeningen, opleverdossier',
    deliverables: [
      { id: 'asbuilt_tekeningen', naam: 'As-built tekeningen', docType: 'TEK', omschrijving: 'Revisie op basis van inmeting' },
      { id: 'opleverdossier', naam: 'Opleverdossier-index', docType: 'RAP', omschrijving: 'Index van alle opleverdocumenten' },
    ],
  },
];

export const PROJECT_FASE_BY_ID: Record<ProjectFaseId, ProjectFaseDef> = Object.fromEntries(
  PROJECT_FASEN.map((f) => [f.id, f])
) as Record<ProjectFaseId, ProjectFaseDef>;

/** Mapping van bestaand (tracé-)fasemodel naar projectfasen. */
export function traceFaseNaarProjectFase(traceFase: string): ProjectFaseId {
  switch (traceFase) {
    case 'VO':
      return 'vo';
    case 'DO':
      return 'do';
    case 'UO':
      return 'uo';
    case 'as_built':
      return 'uitvoering';
    default:
      return 'verkenning';
  }
}

export interface DeliverableStatusRecord {
  faseId: ProjectFaseId;
  deliverableId: string;
  status: DeliverableStatus;
  /** Documentcode zodra het document gegenereerd is. */
  docCode?: string;
  bijgewerktOp?: string;
}

export interface FaseVoortgang {
  fase: ProjectFaseDef;
  totaal: number;
  definitief: number;
  inReview: number;
  concept: number;
  ontbreekt: number;
}

/** Voortgang per fase op basis van statusrecords (ontbrekende records = 'ontbreekt'). */
export function berekenFaseVoortgang(
  records: DeliverableStatusRecord[]
): FaseVoortgang[] {
  return PROJECT_FASEN.map((fase) => {
    const byId = new Map(
      records.filter((r) => r.faseId === fase.id).map((r) => [r.deliverableId, r.status])
    );
    const statuses = fase.deliverables.map((d) => byId.get(d.id) ?? 'ontbreekt');
    return {
      fase,
      totaal: fase.deliverables.length,
      definitief: statuses.filter((s) => s === 'definitief').length,
      inReview: statuses.filter((s) => s === 'in_review').length,
      concept: statuses.filter((s) => s === 'concept').length,
      ontbreekt: statuses.filter((s) => s === 'ontbreekt').length,
    };
  });
}

/** Actieve fase = eerste fase die nog niet volledig definitief is. */
export function bepaalActieveFase(records: DeliverableStatusRecord[]): ProjectFaseId {
  const voortgang = berekenFaseVoortgang(records);
  const actief = voortgang.find((v) => v.definitief < v.totaal);
  return actief?.fase.id ?? 'uitvoering';
}
