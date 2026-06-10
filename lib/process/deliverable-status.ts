/**
 * Afleiding van deliverable-statussen uit de tracé-fasen.
 *
 * LET OP: dit is een tijdelijke afleiding. Zolang er nog geen echte
 * statusregistratie per deliverable bestaat (in de demo-store of database),
 * leiden we de status af uit de verst gevorderde tracé-fase van het project:
 *
 * - Alle deliverables van fasen vóór de huidige projectfase → 'definitief'
 *   (die fasen zijn immers gepasseerd).
 * - Deliverables van de huidige projectfase → 'concept' (werk in uitvoering).
 * - Deliverables van latere fasen → geen record (= 'ontbreekt' in de
 *   voortgangsberekening van `berekenFaseVoortgang`).
 *
 * Zodra echte statusregistratie bestaat, vervangt die deze afleiding.
 */

import {
  PROJECT_FASEN,
  traceFaseNaarProjectFase,
  type DeliverableStatusRecord,
} from './fasen';

/**
 * Leidt deliverable-statusrecords af uit de fasen van de project-tracés.
 *
 * Pure functie: geen records voor projecten zonder tracés (alles 'ontbreekt').
 */
export function deriveDeliverableStatuses(
  traces: { fase: string }[]
): DeliverableStatusRecord[] {
  if (traces.length === 0) return [];

  // Verst gevorderde projectfase over alle tracés (index in PROJECT_FASEN).
  const huidigeFaseIndex = Math.max(
    ...traces.map((trace) => {
      const faseId = traceFaseNaarProjectFase(trace.fase);
      return PROJECT_FASEN.findIndex((f) => f.id === faseId);
    })
  );

  const records: DeliverableStatusRecord[] = [];
  PROJECT_FASEN.forEach((fase, index) => {
    if (index > huidigeFaseIndex) return; // latere fasen: geen record
    const status = index < huidigeFaseIndex ? 'definitief' : 'concept';
    for (const deliverable of fase.deliverables) {
      records.push({
        faseId: fase.id,
        deliverableId: deliverable.id,
        status,
      });
    }
  });
  return records;
}
