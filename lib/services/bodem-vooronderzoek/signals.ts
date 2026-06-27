/**
 * Signaal-engine voor het bodem-vooronderzoek: leidt getypeerde signaleringen af.
 *
 * Deze module bevat de PURE regels (geen DB/netwerk), zodat ze met vaste
 * fixture-geometrieën te testen zijn. De orchestratie (PostGIS-queries, AHN-
 * sampling) zit in analyse.ts en voert deze functies met echte data.
 *
 * Vier signaaltypes (signaal-logica):
 *  1. bekende_verontreiniging  — tracé-buffer raakt WBB-vlak            → kritisch
 *  2. ophoging_demping         — AHN-hoogte wijkt > drempel af          → let_op (⚠)
 *  3. bodemkwaliteitsklasse    — gemeentelijke BKK indien beschikbaar   → info  (⚠)
 *  4. archief_gat              — bevoegd-gezag-archief e.d. (altijd)     → let_op (⚠)
 */

import type { BodemTraceKruising } from '@/lib/services/bodem-risico/types';
import { RISICO_LABEL } from '@/lib/services/bodem-risico/types';
import type { BodemSignaal } from './types';

/** Hoogteafwijking (m) t.o.v. de omgeving die op ophoging/demping kan wijzen. */
export const OPHOGING_DREMPEL_M = 0.5;

/** Halfvenster (aantal buurpunten per zijde) voor de AHN-baseline. */
const AHN_VENSTER = 3;

/**
 * (1) Bekende verontreiniging — zet tracé-kruisingen met WBB-locaties om in
 * kritische signaleringen. Volledig automatiseerbaar; geen handmatige check.
 */
export function signalenVanKruisingen(
  kruisingen: BodemTraceKruising[],
  bronDatum: string
): BodemSignaal[] {
  return kruisingen.map((k) => {
    const doorschreden = k.relatie === 'doorschreden';
    return {
      type: 'bekende_verontreiniging',
      ernst: 'kritisch',
      automatiseerbaar: true,
      handmatigeVerificatie: false,
      bron: 'Bodemloket WBB (Wet bodembescherming)',
      bronDatum,
      titel: doorschreden
        ? `Tracé doorsnijdt bekende bodemlocatie ${k.locatieId}`
        : `Bekende bodemlocatie ${k.locatieId} nabij tracé (${k.afstandTraceM} m)`,
      toelichting: `${RISICO_LABEL[k.risicoklasse]} — status "${k.naam}". ${
        doorschreden
          ? 'Het tracé loopt door of langs deze (potentieel) verontreinigde locatie; grondroering vereist afstemming en mogelijk aanvullend onderzoek.'
          : 'Locatie ligt binnen de invloedszone van het tracé.'
      }`,
      locatiecode: k.locatieId,
      afstandM: k.afstandTraceM,
    };
  });
}

export interface HoogteSample {
  chainage: number;
  hoogteNap: number;
}

/** Mediaan van een getallenreeks (puur, zonder mutatie van de invoer). */
function mediaan(getallen: number[]): number {
  const s = [...getallen].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * (2) Mogelijke ophoging/demping — detecteert AHN-hoogtepunten die meer dan de
 * drempel afwijken van hun directe omgeving (lokale mediaan). Resulteert in
 * let-op-signalen die handmatige luchtfoto-/kaartcheck vereisen.
 */
export function signalenOphogingDemping(
  samples: HoogteSample[],
  bronDatum: string,
  drempelM = OPHOGING_DREMPEL_M
): BodemSignaal[] {
  if (samples.length < 2 * AHN_VENSTER + 1) return [];

  // Markeer afwijkende punten t.o.v. de lokale mediaan (buren, zonder zichzelf).
  const afwijkend: { i: number; delta: number }[] = [];
  for (let i = 0; i < samples.length; i++) {
    const van = Math.max(0, i - AHN_VENSTER);
    const tot = Math.min(samples.length - 1, i + AHN_VENSTER);
    const buren: number[] = [];
    for (let j = van; j <= tot; j++) if (j !== i) buren.push(samples[j].hoogteNap);
    if (buren.length === 0) continue;
    const delta = samples[i].hoogteNap - mediaan(buren);
    if (Math.abs(delta) > drempelM) afwijkend.push({ i, delta });
  }
  if (afwijkend.length === 0) return [];

  // Groepeer aaneengesloten afwijkende punten tot één zone.
  const signalen: BodemSignaal[] = [];
  let groep: { i: number; delta: number }[] = [];
  const flush = () => {
    if (groep.length === 0) return;
    const eerste = samples[groep[0].i];
    const laatste = samples[groep[groep.length - 1].i];
    const piek = groep.reduce((a, b) => (Math.abs(b.delta) > Math.abs(a.delta) ? b : a));
    const ophoging = piek.delta > 0;
    signalen.push({
      type: 'ophoging_demping',
      ernst: 'let_op',
      automatiseerbaar: false,
      handmatigeVerificatie: true,
      bron: 'PDOK AHN (maaiveldhoogte)',
      bronDatum,
      titel: `Mogelijke ${ophoging ? 'ophooglaag' : 'gedempte laagte/watergang'} rond ch. ${eerste.chainage}–${laatste.chainage} m`,
      toelichting: `AHN-maaiveld wijkt hier ${piek.delta > 0 ? '+' : ''}${piek.delta.toFixed(
        1
      )} m af van de omgeving. Dit kan duiden op een ophoging of demping. ⚠ Handmatige verificatie vereist: controleer historische luchtfoto's en kaartreeksen.`,
      afstandM: 0,
    });
    groep = [];
  };
  for (let k = 0; k < afwijkend.length; k++) {
    if (k > 0 && afwijkend[k].i !== afwijkend[k - 1].i + 1) flush();
    groep.push(afwijkend[k]);
  }
  flush();

  return signalen;
}

/**
 * (3) Bodemkwaliteitsklasse — de gemeentelijke bodemkwaliteitskaart is alleen
 * als WMS-raster (zonering) beschikbaar, niet als bevraagbare vector. We leiden
 * dus geen klasse automatisch af, maar markeren dit expliciet als mens-werk.
 */
export function signaalBodemkwaliteit(bronDatum: string): BodemSignaal {
  return {
    type: 'bodemkwaliteitsklasse',
    ernst: 'info',
    automatiseerbaar: false,
    handmatigeVerificatie: true,
    bron: 'Bodemloket — digitale bodemkwaliteitskaart (WMS-zonering)',
    bronDatum,
    titel: 'Bodemkwaliteitsklasse niet automatisch bepaald',
    toelichting:
      'De ontgravings-/toepassingskaart is alleen als WMS-zonering beschikbaar, niet als bevraagbare vector. ⚠ Handmatige verificatie vereist: lees de klasse per zone af op de gemeentelijke bodemkwaliteitskaart en vertaal naar de indicatieve grondafvoer-implicatie.',
  };
}

/**
 * (4) Archief-gat — wordt ALTIJD gegenereerd, ongeacht de data. Dit zijn de
 * verplichte, niet te automatiseren onderdelen van het NEN 5725-vooronderzoek.
 */
export function signalenArchiefGat(bronDatum: string): BodemSignaal[] {
  const basis = {
    type: 'archief_gat' as const,
    ernst: 'let_op' as const,
    automatiseerbaar: false,
    handmatigeVerificatie: true,
    bron: 'Niet via open data — bevoegd gezag / dossieronderzoek',
    bronDatum,
  };
  return [
    {
      ...basis,
      titel: 'Bodemarchief bevoegd gezag niet geraadpleegd',
      toelichting:
        '⚠ Handmatige verificatie vereist: het bodemarchief van gemeente/omgevingsdienst (Squit/Nazca-i) is leidend en niet via API beschikbaar. Vraag het dossier op bij het bevoegd gezag.',
    },
    {
      ...basis,
      titel: 'Historische milieuvergunningen / tanks niet beoordeeld',
      toelichting:
        '⚠ Handmatige verificatie vereist: historische (hinderwet-)vergunningen, bedrijfsactiviteiten en ondergrondse tanks vergen dossieronderzoek; deze zijn niet automatisch ontsloten.',
    },
    {
      ...basis,
      titel: 'Historische luchtfoto-/kaartanalyse niet uitgevoerd',
      toelichting:
        "⚠ Handmatige verificatie vereist: interpretatie van historische luchtfoto's en kaartreeksen is mens-werk en hoort bij het vooronderzoek.",
    },
    {
      ...basis,
      titel: 'Locatiebezoek / terreininspectie vereist',
      toelichting:
        '⚠ Handmatige verificatie vereist: het verplichte locatiebezoek (terreininspectie) is niet uitgevoerd en kan niet worden geautomatiseerd.',
    },
  ];
}
