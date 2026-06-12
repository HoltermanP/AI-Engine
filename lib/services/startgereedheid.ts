/**
 * Startgereedheid uitvoering — de go/no-go-gate van het engineeringsproces.
 *
 * Beoordeelt per project of alle werkvoorbereidingsproducten aanwezig zijn
 * om de uitvoering te mogen starten: definitief ontwerp, berekeningen,
 * werktekeningen, onderzoeken, vergunningen (incl. kritieke beslistermijn),
 * V&G-plan, kabeltrekplan, calculatie en de WIBON/KLIC-melding.
 */

import { getDemoTraces } from '@/lib/db/demo-store';
import { getDemoNetontwerp } from '@/lib/db/netontwerp-store';
import { getDossierItems, type DossierItem } from '@/lib/dossier/store';
import {
  deriveVergunningen,
  vergunningInputUitTrace,
  berekenVergunningDoorlooptijd,
} from '@/lib/planning/vergunningen';
import { afgeleideStapStatus } from '@/lib/netontwerp/stappen';
import { heeftSleuflozeSegmenten } from '@/lib/bore';

export type CriteriumStatus = 'gereed' | 'ontbreekt' | 'aandacht' | 'nvt';

export interface StartCriterium {
  id: string;
  titel: string;
  status: CriteriumStatus;
  detail: string;
  /** Waar in de app dit op te lossen is */
  actieHref?: string;
  actieLabel?: string;
}

export interface StartgereedheidResultaat {
  projectId: string;
  verdict: 'GO' | 'BIJNA' | 'NO_GO';
  /** Voortgang over de vereiste criteria (0-100) */
  pct: number;
  gereed: number;
  totaalVereist: number;
  criteria: StartCriterium[];
  /** Kritieke vergunningsdoorlooptijd in weken (langste wettelijke termijn) */
  kritiekeVergunningWeken: number;
  samenvatting: string;
}

function heeft(items: DossierItem[], matcher: (i: DossierItem) => boolean): DossierItem[] {
  return items.filter(matcher);
}

export function bepaalStartgereedheid(projectId: string): StartgereedheidResultaat {
  const traces = getDemoTraces(projectId);
  const items = getDossierItems(projectId);
  const netontwerp = getDemoNetontwerp(projectId);
  const criteria: StartCriterium[] = [];
  const traceHref = traces[0] ? `/project/${projectId}/trace/${traces[0].id}` : `/project/${projectId}`;

  // 1. Ontwerp definitief (alle tracés ≥ DO)
  const nietDefinitief = traces.filter((t) => t.fase === 'VO');
  criteria.push({
    id: 'ontwerp',
    titel: 'Tracéontwerp definitief (≥ DO)',
    status: traces.length === 0 ? 'ontbreekt' : nietDefinitief.length === 0 ? 'gereed' : 'aandacht',
    detail:
      traces.length === 0
        ? 'Nog geen tracés in het project'
        : nietDefinitief.length === 0
          ? `${traces.length} tracé(s) op DO/UO-niveau`
          : `${nietDefinitief.length} van ${traces.length} tracé(s) nog in VO: ${nietDefinitief.map((t) => t.code).join(', ')}`,
    actieHref: traceHref,
    actieLabel: 'Naar tracé-engineering',
  });

  // 2. Netontwerp (alleen voor elektraprojecten met een ontwerp)
  if (netontwerp) {
    const status = afgeleideStapStatus(netontwerp);
    const open = Object.entries(status).filter(([, s]) => s !== 'gereed');
    criteria.push({
      id: 'netontwerp',
      titel: 'Netontwerp doorlopen (belastingen → werktekening)',
      status: open.length === 0 ? 'gereed' : open.length <= 2 ? 'aandacht' : 'ontbreekt',
      detail:
        open.length === 0
          ? 'Alle 6 ontwerpstappen gereed'
          : `${6 - open.length}/6 stappen gereed — open: ${open.map(([k]) => k).join(', ')}`,
      actieHref: `/project/${projectId}/netontwerp`,
      actieLabel: 'Naar netontwerp',
    });
  }

  // 3. Normberekeningen
  const berekeningen = heeft(items, (i) => i.type === 'berekening');
  criteria.push({
    id: 'berekeningen',
    titel: 'Normberekeningen vastgelegd',
    status: berekeningen.length > 0 ? 'gereed' : 'ontbreekt',
    detail: berekeningen.length > 0 ? `${berekeningen.length} berekening(en) in dossier` : 'Draai de berekeningen in fase 3 en leg ze vast in het dossier',
    actieHref: traceHref,
    actieLabel: 'Naar engineering',
  });

  // 4. Werktekeningen (UO)
  const werktekeningen = heeft(items, (i) => i.type === 'tekening' && /werktekening|uo/i.test(i.naam));
  const tekeningen = heeft(items, (i) => i.type === 'tekening');
  criteria.push({
    id: 'werktekeningen',
    titel: 'Werktekeningen (UO) gereed',
    status: werktekeningen.length > 0 ? 'gereed' : tekeningen.length > 0 ? 'aandacht' : 'ontbreekt',
    detail:
      werktekeningen.length > 0
        ? `${werktekeningen.length} werktekening(en) + ${tekeningen.length - werktekeningen.length} overige tekeningen`
        : tekeningen.length > 0
          ? `${tekeningen.length} tekeningen aanwezig, maar nog geen UO-werktekening`
          : 'Genereer de werktekening in netontwerp stap 6 of fase 3',
    actieHref: netontwerp ? `/project/${projectId}/netontwerp?stap=werktekening` : traceHref,
    actieLabel: 'Werktekening genereren',
  });

  // 5. Onderzoeken (quickscans omgeving)
  const onderzoeken = heeft(items, (i) => i.type === 'onderzoek');
  criteria.push({
    id: 'onderzoeken',
    titel: 'Conditionerende onderzoeken uitgevoerd',
    status: onderzoeken.length > 0 ? 'gereed' : 'ontbreekt',
    detail:
      onderzoeken.length > 0
        ? `${onderzoeken.length} onderzoeksrapport(en) (bodem/water/natuur/archeologie)`
        : 'Voer de quickscans uit in fase 4 (omgeving)',
    actieHref: traceHref,
    actieLabel: 'Naar omgeving',
  });

  // 6. Vergunningen: aanvragen ingediend + kritieke termijn
  const aanvragen = heeft(items, (i) => i.type === 'aanvraag' || /vergunning/i.test(i.naam));
  const alleVergunningen = traces.flatMap((t) => deriveVergunningen(vergunningInputUitTrace(t)));
  const uniek = [...new Map(alleVergunningen.map((v) => [v.id, v])).values()];
  const doorlooptijd = berekenVergunningDoorlooptijd(uniek);
  criteria.push({
    id: 'vergunningen',
    titel: 'Vergunningen & meldingen ingediend',
    status: aanvragen.length > 0 ? (uniek.length > 0 ? 'aandacht' : 'gereed') : 'ontbreekt',
    detail:
      aanvragen.length > 0
        ? `${aanvragen.length} aanvraag/aanvragen voorbereid · ${uniek.length} vergunningen vereist — kritieke beslistermijn ${doorlooptijd.kritiekeDoorlooptijdWeken} weken (bewaak in de planning)`
        : `${uniek.length} vergunningen vereist (${uniek.map((v) => v.naam.split(' ')[0]).join(', ')}) — nog niets ingediend`,
    actieHref: `/project/${projectId}/planning`,
    actieLabel: 'Bewaak in planning',
  });

  // 7. V&G-plan
  const vg = heeft(items, (i) => /v&g|vg-plan|veiligheid/i.test(i.naam));
  criteria.push({
    id: 'vg',
    titel: 'V&G-plan (ontwerpfase) opgesteld',
    status: vg.length > 0 ? 'gereed' : 'ontbreekt',
    detail: vg.length > 0 ? vg[0].naam : 'Genereer het V&G-plan bij de WVB-documenten',
    actieHref: traceHref,
    actieLabel: 'Naar documenten',
  });

  // 8. Kabeltrekplan (alleen elektra)
  const elektra = traces.some((t) => t.discipline.startsWith('elektra'));
  if (elektra) {
    const trekplan = heeft(items, (i) => /kabeltrek/i.test(i.naam));
    criteria.push({
      id: 'kabeltrekplan',
      titel: 'Kabeltrekplan opgesteld',
      status: trekplan.length > 0 ? 'gereed' : 'ontbreekt',
      detail: trekplan.length > 0 ? trekplan[0].naam : 'Genereer het kabeltrekplan (trekkracht, rollenplan) bij de WVB-documenten',
      actieHref: traceHref,
      actieLabel: 'Naar documenten',
    });
  }

  // 9. Boorengineering (alleen bij sleufloze segmenten)
  const sleufloos = traces.some((t) => heeftSleuflozeSegmenten(t));
  if (sleufloos) {
    const boorplannen = heeft(items, (i) => /boorplan|boorprofiel|uitvoeringsplan/i.test(i.naam));
    criteria.push({
      id: 'boorengineering',
      titel: 'Boorengineering uitgewerkt (HDD/persing)',
      status: boorplannen.length > 0 ? 'gereed' : 'ontbreekt',
      detail:
        boorplannen.length > 0
          ? `${boorplannen.length} boordocument(en) in dossier`
          : 'Werk de sleufloze segmenten uit in het boorengineering-paneel (fase 3)',
      actieHref: traceHref,
      actieLabel: 'Naar boorengineering',
    });
  }

  // 10. Calculatie
  const calculaties = heeft(items, (i) => i.type === 'calculatie');
  criteria.push({
    id: 'calculatie',
    titel: 'Calculatie & materiaallijst gereed',
    status: calculaties.length > 0 ? 'gereed' : 'ontbreekt',
    detail: calculaties.length > 0 ? `${calculaties.length} calculatie(s) vastgelegd` : 'Genereer de calculatie (fase 3) of projectcalculatie',
    actieHref: `/project/${projectId}`,
    actieLabel: 'Projectcalculatie',
  });

  // 11. WIBON/KLIC-melding — altijd een uitvoeringsactie vlak vóór start
  criteria.push({
    id: 'klic',
    titel: 'KLIC-graafmelding (WIBON)',
    status: 'aandacht',
    detail: 'Graafmelding maximaal 20 werkdagen vóór aanvang indienen; liggingsgegevens op het werk',
    actieHref: traceHref,
    actieLabel: 'Plan de melding',
  });

  const beoordeelbaar = criteria.filter((c) => c.status !== 'nvt');
  const gereed = beoordeelbaar.filter((c) => c.status === 'gereed').length;
  const aandacht = beoordeelbaar.filter((c) => c.status === 'aandacht').length;
  const ontbreekt = beoordeelbaar.filter((c) => c.status === 'ontbreekt').length;
  const pct = Math.round(((gereed + aandacht * 0.5) / Math.max(beoordeelbaar.length, 1)) * 100);

  const verdict: StartgereedheidResultaat['verdict'] =
    ontbreekt === 0 && aandacht <= 1 ? 'GO' : ontbreekt <= 2 ? 'BIJNA' : 'NO_GO';

  return {
    projectId,
    verdict,
    pct,
    gereed,
    totaalVereist: beoordeelbaar.length,
    criteria,
    kritiekeVergunningWeken: doorlooptijd.kritiekeDoorlooptijdWeken,
    samenvatting:
      verdict === 'GO'
        ? `Werkvoorbereiding compleet — uitvoering kan starten (let op KLIC-melding ≤ 20 werkdagen vooraf).`
        : verdict === 'BIJNA'
          ? `${ontbreekt + aandacht} punt(en) open vóór start uitvoering — kritieke vergunningstermijn ${doorlooptijd.kritiekeDoorlooptijdWeken} weken.`
          : `${ontbreekt} verplichte producten ontbreken — uitvoering kan nog niet starten.`,
  };
}
