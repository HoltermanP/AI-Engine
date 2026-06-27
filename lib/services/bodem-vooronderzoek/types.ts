/**
 * Domeintypes voor de Bodem-vooronderzoek-module (NEN 5725-assistent).
 *
 * Scope-grens: deze module automatiseert alléén data-aggregatie en signalering.
 * Mens-werk (bevoegd-gezag-archief, historische vergunningen, luchtfoto's,
 * locatiebezoek, eindverantwoordelijkheid) wordt expliciet gemarkeerd, nooit geclaimd.
 */

import type { BboxQuery } from '@/lib/connectors/types';

/** De vier getypeerde signaalsoorten uit de signaal-logica. */
export type SignaalType =
  | 'bekende_verontreiniging'
  | 'ophoging_demping'
  | 'bodemkwaliteitsklasse'
  | 'archief_gat';

/** Ernst-niveau van een signalering. */
export type SignaalErnst = 'info' | 'let_op' | 'kritisch';

/** Eén afgeleide ruimtelijke signalering. */
export interface BodemSignaal {
  type: SignaalType;
  ernst: SignaalErnst;
  /** Of dit signaal volledig automatisch is afgeleid (false ⇒ mens-werk vereist). */
  automatiseerbaar: boolean;
  /** Of dit signaal handmatige verificatie vereist (⚠ in de output). */
  handmatigeVerificatie: boolean;
  bron: string;
  /** ISO-datum van ophalen van de onderliggende brondata. */
  bronDatum: string;
  titel: string;
  toelichting: string;
  /** Koppeling naar de bron-locatie (bv. WBB-locatiecode bevoegd gezag). */
  locatiecode?: string;
  /** Afstand tot het tracé in meters, indien van toepassing. */
  afstandM?: number;
}

/** Verwijzing naar het te onderzoeken projectgebied. Tracé of losse bbox. */
export interface BodemGebiedRef {
  /** Intern project-UUID (optioneel; cache kan ook gebied-scoped zijn). */
  projectId?: string;
  /** Intern tracé-UUID, indien op een tracé gebaseerd. */
  traceId?: string;
  /** Zoekgebied in RD New (EPSG:28992). */
  bbox: BboxQuery;
  /** Tracé-coördinaten (RD) voor buffer-/afstandsanalyse, indien aanwezig. */
  trace?: [number, number, number?][];
  /** Bufferbreedte rond het tracé in meters. */
  bufferM?: number;
  /** Stabiele cache-sleutel voor dit gebied. */
  gebiedKey: string;
}
