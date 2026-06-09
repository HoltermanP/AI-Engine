export type ProjectStatus = 'actief' | 'concept' | 'afgerond' | 'gearchiveerd';

export interface DemoProject {
  id: string;
  organisatieId: string;
  naam: string;
  omschrijving: string;
  status: ProjectStatus;
  gebied: string;
  opdrachtgever: string;
  projectnummer: string;
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'demo-project-001',
    organisatieId: 'demo-org-001',
    naam: 'Netverzwaring Noordoostpolder Oost',
    omschrijving:
      'Gecombineerd infrastructuurproject langs Kuinderweg (N50) en Schokkerweg bij Emmeloord. Verzwaring elektra (MS/LS), HD-gas, LD-distributie en drinkwater in bestaande utiliteitsstroken en wegbermen.',
    status: 'actief',
    gebied: 'Noordoostpolder — Emmeloord',
    opdrachtgever: 'Netbeheer Noord BV',
    projectnummer: 'NOP-2026-0042',
  },
  {
    id: 'demo-project-002',
    organisatieId: 'demo-org-001',
    naam: 'MS-ringuitbreiding Almere Stad',
    omschrijving:
      'Uitbreiding middenspanningsring ten behoeve van nieuwbouwwijk Almere Poort. Paralleltracé langs hoofdinfrastructuur met HDD-kruisingen onder N307.',
    status: 'actief',
    gebied: 'Almere — Poort & Haven',
    opdrachtgever: 'Liander',
    projectnummer: 'ALM-2026-0118',
  },
  {
    id: 'demo-project-003',
    organisatieId: 'demo-org-001',
    naam: 'Drinkwatervervanging Purmerend Zuid',
    omschrijving:
      'Vervanging verouderde gietijzeren drinkwaterleiding Ø250 door Ø400 in bestaande wegberm. Inclusief aansluitingen op bestaand distributienet.',
    status: 'actief',
    gebied: 'Purmerend — Zuid',
    opdrachtgever: 'Vitens',
    projectnummer: 'PUR-2026-0087',
  },
  {
    id: 'demo-project-004',
    organisatieId: 'demo-org-001',
    naam: 'Gastransport corridor Flevopolder Noord',
    omschrijving:
      'Nieuwe HD-transportleiding DN500 in parallel aan bestaande GTS-corridor. Tracéstudie en vooroverleg met waterschap en provincie.',
    status: 'concept',
    gebied: 'Flevopolder — Noord',
    opdrachtgever: 'GTS',
    projectnummer: 'FLV-2026-0031',
  },
  {
    id: 'demo-project-005',
    organisatieId: 'demo-org-001',
    naam: 'LS-net verzwaring Lelystad Haven',
    omschrijving:
      'Verzwaring laagspanningsnet voor havengebied en bedrijventerrein. 120 huis- en bedrijfsaansluitingen met nieuwe kabeltracés in bermen.',
    status: 'actief',
    gebied: 'Lelystad — Haven',
    opdrachtgever: 'Liander',
    projectnummer: 'LEY-2026-0156',
  },
  {
    id: 'demo-project-006',
    organisatieId: 'demo-org-001',
    naam: 'Stationsvervanging Emmeloord Centrum',
    omschrijving:
      'Vervanging MS-ruimte en uitbreiding schakelvelden voor netverzwaring centrumgebied. Korte aansluittracés naar bestaande ring.',
    status: 'actief',
    gebied: 'Noordoostpolder — Emmeloord Centrum',
    opdrachtgever: 'Liander',
    projectnummer: 'NOP-2026-0073',
  },
  {
    id: 'demo-project-007',
    organisatieId: 'demo-org-001',
    naam: 'PE-distributie nieuwbouw Dronten West',
    omschrijving:
      'Lagedruk PE-distributieleiding voor 200 woningen nieuwbouwwijk. Sleufloze techniek onder trottoir waar mogelijk.',
    status: 'actief',
    gebied: 'Dronten — West',
    opdrachtgever: 'Enexis',
    projectnummer: 'DRO-2026-0094',
  },
  {
    id: 'demo-project-008',
    organisatieId: 'demo-org-001',
    naam: 'HD-gas bypass Oostvaardersdijk',
    omschrijving:
      'Bypass hogedrukleiding ten behoeve van groot onderhoud bestaande leiding. Gestuurde boring onder ecologisch kwetsbare zone.',
    status: 'concept',
    gebied: 'Flevoland — Oostvaardersdijk',
    opdrachtgever: 'GTS',
    projectnummer: 'FLV-2026-0049',
  },
  {
    id: 'demo-project-009',
    organisatieId: 'demo-org-001',
    naam: 'Combinatietracé Urk industrieterrein',
    omschrijving:
      'Gecombineerd tracé MS-kabel, LD-gas en drinkwater voor uitbreiding industrieterrein. Gezamenlijke utiliteitsstrook conform NEN 7171.',
    status: 'actief',
    gebied: 'Urk — Industrieterrein',
    opdrachtgever: 'Combinatie Netbeheer BV',
    projectnummer: 'URK-2026-0022',
  },
  {
    id: 'demo-project-010',
    organisatieId: 'demo-org-001',
    naam: 'Watertransportleiding Noordoostpolder West',
    omschrijving:
      'Transportleiding Ø500 tussen pompstation en distributieknooppunt. Project afgerond; as-built dossier beschikbaar.',
    status: 'afgerond',
    gebied: 'Noordoostpolder — West',
    opdrachtgever: 'Vitens',
    projectnummer: 'NOP-2025-0198',
  },
];

/** Eerste demo-project (volledig uitgewerkt met 6 tracés) */
export const DEMO_PROJECT = DEMO_PROJECTS[0];

export function getDemoProjectById(id: string): DemoProject | null {
  return DEMO_PROJECTS.find((p) => p.id === id) ?? null;
}
