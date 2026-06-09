/**
 * Kritiek pad (CPM) over de projectplanning.
 *
 * Backward pass over de afhankelijkheidsgraaf van reeds geroosterde
 * activiteiten: per activiteit wordt de laatste toegestane einddatum bepaald
 * (vanaf de projecteinddatum, via de opvolger-relaties). Activiteiten zonder
 * speling (laatste eind == geplande eind) vormen het kritieke pad.
 */

import type { PlanningActiviteit } from './types';

export interface KritiekPadResultaat {
  /** Ids van activiteiten op het kritieke pad. */
  kritiekeIds: Set<string>;
  /** Totale speling per activiteit-id (kalenderdagen, 0 = kritiek). */
  spelingDagen: Map<string, number>;
}

const DAG_MS = 86_400_000;

function isoNaarDag(iso: string): number {
  return Math.round(new Date(`${iso}T00:00:00Z`).getTime() / DAG_MS);
}

/** Bepaal het kritieke pad via een backward pass (memoized DFS). */
export function berekenKritiekPad(activiteiten: PlanningActiviteit[]): KritiekPadResultaat {
  const byId = new Map(activiteiten.map((a) => [a.id, a]));
  const opvolgers = new Map<string, string[]>();
  for (const act of activiteiten) {
    for (const vid of act.voorgangers) {
      if (!byId.has(vid)) continue;
      opvolgers.set(vid, [...(opvolgers.get(vid) ?? []), act.id]);
    }
  }

  const projectEindDag = Math.max(...activiteiten.map((a) => isoNaarDag(a.eindDatum)));

  // Laatste toegestane einddag per activiteit.
  const lateFinish = new Map<string, number>();
  const visiting = new Set<string>();

  function lf(id: string): number {
    const cached = lateFinish.get(id);
    if (cached !== undefined) return cached;
    const act = byId.get(id)!;
    if (visiting.has(id)) return isoNaarDag(act.eindDatum); // cykelbescherming
    visiting.add(id);

    const volgers = opvolgers.get(id) ?? [];
    let result: number;
    if (volgers.length === 0) {
      result = projectEindDag;
    } else {
      result = Math.min(
        ...volgers.map((vid) => {
          const v = byId.get(vid)!;
          const duurDagen = isoNaarDag(v.eindDatum) - isoNaarDag(v.startDatum);
          // Laatste start opvolger = laatste eind − duur; deze activiteit moet
          // de dag ervoor klaar zijn.
          return lf(vid) - duurDagen - 1;
        })
      );
    }
    visiting.delete(id);
    lateFinish.set(id, result);
    return result;
  }

  const kritiekeIds = new Set<string>();
  const spelingDagen = new Map<string, number>();
  for (const act of activiteiten) {
    const speling = lf(act.id) - isoNaarDag(act.eindDatum);
    spelingDagen.set(act.id, speling);
    if (speling <= 0) kritiekeIds.add(act.id);
  }

  return { kritiekeIds, spelingDagen };
}

/** Geef kopieën van de activiteiten met `kritiekPad` gemarkeerd. */
export function markeerKritiekPad(activiteiten: PlanningActiviteit[]): PlanningActiviteit[] {
  if (activiteiten.length === 0) return activiteiten;
  const { kritiekeIds } = berekenKritiekPad(activiteiten);
  return activiteiten.map((a) => ({ ...a, kritiekPad: kritiekeIds.has(a.id) }));
}
