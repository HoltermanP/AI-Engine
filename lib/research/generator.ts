import type { DemoTrace } from '@/demo/traces';
import { DEMO_PROJECT, getDemoProjectById } from '@/demo/projects';
import { traceLengthM } from '@/lib/geo';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { OnderzoekDocument, AanvraagDocument, VergunningCheckItem, OnderzoekType } from './types';
import {
  rapportBodemQuickscan,
  rapportNatura2000,
  rapportArcheologie,
  rapportEcologieWnb,
  rapportNgeCe,
  rapportKlicInventarisatie,
} from '@/demo/reports';
import { getKlicForTrace } from '@/demo/klic';
import { getGebiedProfiel, getRapportContext } from '@/demo/reports/context';
import { tabelFromRows, segmentenTabel, bulletLijst } from '@/demo/reports/format';
import { verrijkRapportMetAnthropic } from '@/lib/research/ai-rapport';

const AANVRAAG_DATUM = new Date().toLocaleDateString('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function aanvraagNummer(type: string, traceCode: string): string {
  return `AAN-${type}-${traceCode}-2026-001`;
}

function aanvraagKop(
  titel: string,
  trace: DemoTrace,
  referentie: string,
  ontvanger: string,
  extraVelden: [string, string][] = []
): string {
  const project = getDemoProjectById(trace.projectId) ?? DEMO_PROJECT;
  const gebied = getGebiedProfiel(trace.projectId);
  const lengte = traceLengthM(trace.coordinates, trace.traceLines);
  const start = trace.coordinates[0];
  const end = trace.coordinates[trace.coordinates.length - 1];

  const velden: [string, string][] = [
    ['Documenttype', titel],
    ['Referentie', referentie],
    ['Datum', AANVRAAG_DATUM],
    ['Status', 'Concept'],
    ['Project', `${project.naam} (${project.projectnummer})`],
    ['Opdrachtgever', project.opdrachtgever],
    ['Tracé', `${trace.code} — ${trace.naam}`],
    ['Discipline', trace.discipline.replace(/_/g, ' ')],
    ['Nettype', trace.netType],
    ['Locatie', project.gebied],
    ['Gemeente', gebied.gemeente],
    ['Weg / corridor', trace.wegnaam],
    ['Leglocatie', trace.leglocatie],
    ['Tracélengte', `ca. ${lengte} m`],
    ['RD startpunt', `${start[0].toFixed(1)}, ${start[1].toFixed(1)}`],
    ['RD eindpunt', `${end[0].toFixed(1)}, ${end[1].toFixed(1)}`],
    ['Ontvanger', ontvanger],
    ...extraVelden,
  ];

  return `# ${titel}

> **Status:** Concept · ${AANVRAAG_DATUM}

${tabelFromRows(['Veld', 'Waarde'], velden)}

---`;
}

function aanvraagSectie(nummer: number, titel: string, inhoud: string): string {
  return `## ${nummer}. ${titel}\n\n${inhoud.trim()}`;
}

function aanvraagFooter(trace: DemoTrace, contactpersoon: string): string {
  const project = getDemoProjectById(trace.projectId) ?? DEMO_PROJECT;
  return `---

## Contactgegevens

| Rol | Naam / organisatie |
|-----|-------------------|
| Contactpersoon opdrachtgever | ${contactpersoon} — ${project.opdrachtgever} |
| Projectleider | Projectleider Infra — ${project.opdrachtgever} |
| Technisch aanspreekpunt | Tracé-engineer — Infra Engine BV |

*Dit document is opgesteld als concept-aanvraag binnen Infra Engine. Definitieve indiening vereist ondertekening door bevoegd gemachtigde.*`;
}

function watergangNamen(collected?: CollectedTraceData): string[] {
  const uitData = collected?.watergangen?.map((w) => w.naam) ?? [];
  if (uitData.length > 0) return uitData;
  const waterBelemmeringen = collected?.belemmeringen?.filter((b) => b.categorie === 'watergang') ?? [];
  if (waterBelemmeringen.length > 0) {
    return waterBelemmeringen.map((b) => b.beheerder || b.id);
  }
  return ['Prinsengracht Noord'];
}

function sonderpuntenAantal(trace: DemoTrace): number {
  const lengte = traceLengthM(trace.coordinates, trace.traceLines);
  return Math.max(3, Math.ceil(lengte / 250));
}

/** Synchrone conceptrapporten (sjablonen) — o.a. voor validatie en voorbeelden. */
export function buildOnderzoekTemplate(
  type: OnderzoekType,
  trace: DemoTrace,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
): OnderzoekDocument {
  const sonderingen = collected?.sonderingen.length ?? sonderpuntenAantal(trace);
  const netten =
    collected?.bestaandNet ??
    getKlicForTrace(trace.id).map((n) => ({
      beheerder: n.beheerder,
      thema: n.thema,
      spanningOfDiameter: n.spanningOfDiameter,
      nauwkeurigheid: n.nauwkeurigheid,
    }));

  const reports: Record<OnderzoekType, () => OnderzoekDocument> = {
    bodem_nen5725: () => ({
      type: 'bodem_nen5725',
      titel: 'Quick Scan Bodem (NEN 5725)',
      status: 'afgerond',
      inhoud: rapportBodemQuickscan(trace, sonderingen, collected),
      _source: collected?.sources?.['bro-cpt'] ?? 'demo',
    }),
    archeologie: () => ({
      type: 'archeologie',
      titel: 'Bureauonderzoek Archeologie',
      status: 'afgerond',
      inhoud: rapportArcheologie(trace),
      _source: 'demo',
    }),
    nge_ce: () => ({
      type: 'nge_ce',
      titel: 'NGE/CE-bureauonderzoek',
      status: 'afgerond',
      inhoud: rapportNgeCe(trace),
      _source: 'demo',
    }),
    ecologie_wnb: () => ({
      type: 'ecologie_wnb',
      titel: 'Ecologische Quickscan (Wnb)',
      status: 'afgerond',
      inhoud: rapportEcologieWnb(trace),
      _source: 'demo',
    }),
    kl_inventarisatie: () => ({
      type: 'kl_inventarisatie',
      titel: 'K&L-inventarisatie (KLIC)',
      status: collected ? 'afgerond' : 'in_uitvoering',
      inhoud: rapportKlicInventarisatie(trace, netten, conflicten ?? []),
      _source: collected?.sources?.klic ?? 'demo',
    }),
    natura2000: () => ({
      type: 'natura2000',
      titel: 'Natura 2000-toets / Passende beoordeling',
      status: 'afgerond',
      inhoud: rapportNatura2000(trace),
      _source: 'demo',
    }),
  };

  return reports[type]();
}

/** Genereer onderzoeksrapport; verrijkt met Anthropic indien geconfigureerd. */
export async function generateSingleOnderzoek(
  type: OnderzoekType,
  trace: DemoTrace,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
): Promise<OnderzoekDocument> {
  const template = buildOnderzoekTemplate(type, trace, collected, conflicten);
  return verrijkRapportMetAnthropic(template, trace, collected, conflicten);
}

export async function generateOnderzoeken(
  trace: DemoTrace,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
): Promise<OnderzoekDocument[]> {
  const types: OnderzoekType[] = [
    'bodem_nen5725',
    'natura2000',
    'archeologie',
    'ecologie_wnb',
    'nge_ce',
    'kl_inventarisatie',
  ];
  return Promise.all(
    types.map((type) => generateSingleOnderzoek(type, trace, collected, conflicten))
  );
}

export function generateAanvragen(
  trace: DemoTrace,
  collected?: CollectedTraceData
): AanvraagDocument[] {
  const ctx = getRapportContext(trace);
  const { gebied } = ctx;
  const lengte = ctx.lengteM;
  const sonderpunten = sonderpuntenAantal(trace);
  const watergangen = watergangNamen(collected);
  const legtechnieken = [...new Set(trace.segmenten.map((s) => s.legtechniek.replace(/_/g, ' ')))].join(', ');
  const hddSegmenten = trace.segmenten.filter((s) => s.legtechniek === 'hdd');
  const project = getDemoProjectById(trace.projectId) ?? DEMO_PROJECT;

  return [
    {
      type: 'sondeeronderzoek',
      titel: 'Aanvraag sondeeronderzoek (CPT)',
      ontvanger: gebied.geotechnischBureau,
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'Aanvraag sondeeronderzoek (CPT)',
          trace,
          aanvraagNummer('CPT', trace.code),
          gebied.geotechnischBureau,
          [['Norm', 'NEN-EN-ISO 22476-1 (CPT)']]
        ),
        aanvraagSectie(
          1,
          'Aanleiding en doel',
          `Ten behoeve van het tracé **${trace.code}** (${trace.naam}) binnen project **${project.naam}** verzoeken wij CPT-sonderonderzoek conform NEN-EN-ISO 22476-1. Het onderzoek dient ter onderbouwing van de NGE/CE-toets en legtechniekkeuze (${legtechnieken}).`
        ),
        aanvraagSectie(
          2,
          'Onderzoeksopzet',
          `**Aantal sonderpunten:** ${sonderpunten} (interval ca. 250 m)\n**Diepte:** minimaal 15 m onder maaiveld / NAP\n**Locatie:** langs ${trace.wegnaam}, buffer 5 m van tracéas\n**Metingen:** cone resistance, sleeve friction, pore pressure; grondwaterpeilmeting per punt\n\n${segmentenTabel(trace)}`
        ),
        aanvraagSectie(
          3,
          'Randvoorwaarden en veiligheid',
          bulletLijst([
            'WIBON: KLIC-melding verplicht vóór start veldwerk',
            'Verkeersmaatregelen in overleg met wegbeheerder bij werk in berm',
            'Bodemonderzoek quick scan conform NEN 5725 reeds uitgevoerd',
            `Verwachte bodemopbouw: ${gebied.bodemopbouwSamenvatting}`,
            `Grondwaterpeil referentie: ${gebied.grondwaterPeil}`,
          ])
        ),
        aanvraagSectie(
          4,
          'Planning en oplevering',
          `**Gewenste startdatum:** binnen 4 weken na opdrachtbevestiging\n**Oplevering:** digitaal rapport (PDF + CPT-rawdata) binnen 3 weken na veldwerk\n**Rapportage:** sonderprofielen, interpretatie draagkracht en grondwater, advies legdiepte`
        ),
        aanvraagFooter(trace, 'Dhr. J. van der Berg'),
      ].join('\n\n'),
      _source: 'demo',
    },
    {
      type: 'milieukundig_bodem',
      titel: 'Aanvraag milieukundig bodemonderzoek',
      ontvanger: gebied.bodemAdviesbureau,
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'Aanvraag milieukundig bodemonderzoek',
          trace,
          aanvraagNummer('BOD', trace.code),
          gebied.bodemAdviesbureau,
          [['Norm / standaard', 'NEN 5725 — Quick scan bodem']]
        ),
        aanvraagSectie(
          1,
          'Aanleiding',
          `Voor aanleg ${trace.netType} langs ${trace.wegnaam} (${lengte} m) is een quick scan bodem vereist conform NEN 5725. Gebied: ${gebied.gemeente}, ${gebied.provincie}.`
        ),
        aanvraagSectie(
          2,
          'Scope onderzoek',
          bulletLijst([
            `Tracé: ${trace.code} — ${trace.naam}`,
            `Legtechniek: ${legtechnieken}`,
            `Onderzoeksbreedte: 10 m langs tracé`,
            `Historische context: ${gebied.historischeContext}`,
            `Verwachte bodemopbouw: ${gebied.bodemopbouwSamenvatting}`,
            'Monstername: 3 representatieve punten (start, midden, eind)',
            'Parameters: PFAS-screening, zware metalen, minerale olie (indicatief)',
          ])
        ),
        aanvraagSectie(
          3,
          'Oplevering',
          'Quick scan rapport inclusief risicoclassificatie, saneringsadvies en eventuele vervolgstappen (besluitvorming NEN 5725). Oplevering binnen 2 weken na monstername.'
        ),
        aanvraagFooter(trace, 'Mw. S. de Vries'),
      ].join('\n\n'),
      _source: 'demo',
    },
    {
      type: 'archeologisch_veld',
      titel: 'Aanvraag archeologisch waarnemingsprotocol',
      ontvanger: `${gebied.gemeente} / ${gebied.archeologiePartner}`,
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'Aanvraag archeologisch waarnemingsprotocol',
          trace,
          aanvraagNummer('ARC', trace.code),
          `${gebied.gemeente} / ${gebied.archeologiePartner}`,
          [
            ['Bureauonderzoek', `ARC-${trace.code}-2026-001`],
            ['Archeologische verwachting', gebied.archeologischeVerwachting],
          ]
        ),
        aanvraagSectie(
          1,
          'Aanleiding',
          `Het bureauonderzoek archeologie (ARC-${trace.code}) concludeert een verwachting **${gebied.archeologischeVerwachting}**. Bij open ontgraving langs het tracé wordt een waarnemingsprotocol gevraagd conform Erfgoedwet en KNA.`
        ),
        aanvraagSectie(
          2,
          'Werkzaamheden',
          bulletLijst([
            `Tracélengte: ${lengte} m langs ${trace.wegnaam}`,
            `Segmenten met grondverzet: ${trace.segmenten.filter((s) => s.legtechniek !== 'hdd').map((s) => s.wegnaam).join(', ') || 'geen'}`,
            `HDD-segmenten (geen ontgraving): ${hddSegmenten.map((s) => s.wegnaam).join(', ') || 'geen'}`,
            'Waarneming bij start ontgraving en bij afwijkende grondlagen',
            'Dagrapportage en eindrapportage binnen 5 werkdagen na afronding',
          ])
        ),
        aanvraagSectie(
          3,
          'Historische context',
          gebied.historischeContext
        ),
        aanvraagFooter(trace, 'Dhr. P. Jansen'),
      ].join('\n\n'),
      _source: 'demo',
    },
    {
      type: 'ecologisch_onderzoek',
      titel: 'Aanvraag ecologisch toezicht',
      ontvanger: gebied.ecologieAdviesbureau,
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'Aanvraag ecologisch toezicht (Wet natuurbescherming)',
          trace,
          aanvraagNummer('ECO', trace.code),
          gebied.ecologieAdviesbureau,
          [['Wettelijk kader', 'Wet natuurbescherming (Wnb) — beschermde soorten']]
        ),
        aanvraagSectie(
          1,
          'Aanleiding',
          `Ecologisch toezicht bij werkzaamheden voor ${trace.netType}. Quickscan Wnb uitgevoerd; aandacht voor waterkruisingen en broedseizoen.`
        ),
        aanvraagSectie(
          2,
          'Scope',
          bulletLijst([
            `Watergangen in onderzoeksgebied: ${watergangen.join(', ')}`,
            `Legtechniek per segment: ${legtechnieken}`,
            '2 veldbezoeken: vóór start en na afronding kruising/werkzaamheden',
            'Inventarisatie beschermde soorten (vleermuizen, broedvogels, amfibieën)',
            'Advies mitigerende maatregelen en werkvensters',
            gebied.natura2000
              ? `Natura 2000-buffer: ${gebied.natura2000.naam} op ${gebied.natura2000.afstandM} m`
              : 'Geen Natura 2000 binnen 1 km',
          ])
        ),
        aanvraagSectie(
          3,
          'Planning',
          'Start toezicht minimaal 2 weken vóór eerste grondverzet. Rapportage binnen 10 werkdagen na laatste veldbezoek.'
        ),
        aanvraagFooter(trace, 'Mw. L. Bakker'),
      ].join('\n\n'),
      _source: 'demo',
    },
    {
      type: 'omgevingsvergunning',
      titel: 'Omgevingsvergunning — aanvraag',
      ontvanger: `Gemeente ${gebied.gemeente}`,
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'Aanvraag omgevingsvergunning',
          trace,
          aanvraagNummer('OV', trace.code),
          `Gemeente ${gebied.gemeente}`,
          [['Activiteit', 'Bouwactiviteit ondergrondse leiding (Omgevingswet)']]
        ),
        aanvraagSectie(
          1,
          'Activiteit en locatie',
          `Aanleg en exploitatie van ${trace.netType} (${trace.discipline.replace(/_/g, ' ')}) langs ${trace.wegnaam}.\n\nLeglocatie: ${trace.leglocatie}\nTracélengte: ca. ${lengte} m\nGemeente: ${gebied.gemeente}, provincie ${gebied.provincie}.`
        ),
        aanvraagSectie(
          2,
          'Bijlagen (concept)',
          bulletLijst([
            'Situatietekening tracé (schaal 1:1000)',
            'Lengteprofiel en dwarsprofielen',
            'Quick scan bodem (NEN 5725)',
            'K&L-inventarisatie (KLIC)',
            'Archeologisch bureauonderzoek',
            'Ecologische quickscan (Wnb)',
            gebied.natura2000 ? `Natura 2000-toets (${gebied.natura2000.code})` : 'Natura 2000-toets (niet van toepassing)',
            'Maatvoering en legtechniek per segment',
          ])
        ),
        aanvraagSectie(
          3,
          'Toetsingskader',
          'Omgevingswet — activiteit bouwactiviteit ondergrondse leiding. Geen significante gevolgen voor externe veiligheid conform BRZO-uitzondering utiliteitsleidingen.'
        ),
        aanvraagFooter(trace, 'Dhr. M. Visser'),
      ].join('\n\n'),
      _source: 'demo',
    },
    {
      type: 'watervergunning',
      titel: 'Watervergunning / melding',
      ontvanger: gebied.waterschap,
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'Melding / aanvraag watervergunning',
          trace,
          aanvraagNummer('WAT', trace.code),
          gebied.waterschap,
          [['Type', ctx.waterkruisingen.length > 0 ? 'Kruising watergang' : 'Melding werkzaamheden nabij watergang']]
        ),
        aanvraagSectie(
          1,
          'Kruisingen',
          watergangen
            .map(
              (wg) =>
                `**${wg}** — kruising door ${trace.netType}\nLegwijze: ${hddSegmenten.length > 0 ? 'gestuurde boring (HDD)' : 'onderdoor met sleuf'}\nMinimale dekking: ${trace.vereisteDekking} m onder bedding`
            )
            .join('\n\n')
        ),
        aanvraagSectie(
          2,
          'Technische gegevens',
          bulletLijst([
            `Diameter / doorsnede: ${trace.netType}`,
            `Diepte leiding: ${Math.abs(trace.coordinates[0][2]).toFixed(2)} m onder maaiveld`,
            'Tijdelijke damwanden: niet vereist bij HDD',
            'Herstel bedding en oevers conform legger',
            'Start werkzaamheden: Q3 2026 (indicatief)',
          ])
        ),
        aanvraagSectie(
          3,
          'Beoordeling',
          `Beoordeling door ${gebied.waterschap} conform Waterwet en legger. Ecologisch toezicht Wnb loopt parallel.`
        ),
        aanvraagFooter(trace, 'Dhr. R. Smit'),
      ].join('\n\n'),
      _source: 'demo',
    },
    {
      type: 'instemmingsbesluit',
      titel: 'Instemmingsbesluit / melding OD',
      ontvanger: gebied.omgevingsdienst,
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'Melding activiteit — instemmingsbesluit Omgevingsdienst',
          trace,
          aanvraagNummer('OD', trace.code),
          gebied.omgevingsdienst
        ),
        aanvraagSectie(
          1,
          'Activiteit',
          `Melding van werkzaamheden voor ${trace.netType} binnen het werkgebied van ${gebied.omgevingsdienst}. Tracé ${trace.code} langs ${trace.wegnaam}.`
        ),
        aanvraagSectie(
          2,
          'Milieu- en veiligheidsaspecten',
          bulletLijst([
            'Geen BRZO-bedrijf in directe omgeving',
            `Bodem: quick scan NEN 5725 — geen sanering vereist (verwacht)`,
            `NGE/CE-risico: ${gebied.ngeRisico}`,
            'K&L-inventarisatie uitgevoerd; eventuele conflicten in afstemming',
            'Storingprotocol en calamiteitenplan conform netbeheerder-eisen',
          ])
        ),
        aanvraagFooter(trace, 'Dhr. M. Visser'),
      ].join('\n\n'),
      _source: 'demo',
    },
    {
      type: 'kruisingsovereenkomst',
      titel: `Kruisingsovereenkomst ${trace.wegnaam}`,
      ontvanger: `Provincie ${gebied.provincie}`,
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'Concept kruisingsovereenkomst',
          trace,
          aanvraagNummer('KRS', trace.code),
          `Provincie ${gebied.provincie} / wegbeheerder`
        ),
        aanvraagSectie(
          1,
          'Onderwerp',
          `Kruisingsovereenkomst voor paralleltracé en/of kruising van ${trace.netType} met ${trace.wegnaam}. Tracé ${trace.code}, lengte ca. ${lengte} m.`
        ),
        aanvraagSectie(
          2,
          'Voorwaarden (concept)',
          bulletLijst([
            'Leglocatie conform utiliteitsstrook / bermbeleid wegbeheerder',
            `Minimale dekking onder verharding: ${trace.vereisteDekking} m`,
            'Herstel verharding en markering conform CROW-publicaties',
            'Werkzaamheden buiten spits indien op rijbaan',
            'Schadeprotocol en waarborgstelling',
            hddSegmenten.length > 0
              ? `HDD-kruising(en): ${hddSegmenten.map((s) => s.wegnaam).join(', ')}`
              : 'Geen HDD-kruisingen',
          ])
        ),
        aanvraagFooter(trace, 'Dhr. T. de Groot'),
      ].join('\n\n'),
      _source: 'demo',
    },
    {
      type: 'verkeersbesluit',
      titel: 'Verkeersbesluit',
      ontvanger: `Provincie ${gebied.provincie}`,
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'Aanvraag verkeersbesluit',
          trace,
          aanvraagNummer('VB', trace.code),
          `Provincie ${gebied.provincie}`
        ),
        aanvraagSectie(
          1,
          'Werkzaamheden',
          `Werkzaamheden in berm en/of verharding van ${trace.wegnaam} ten behoeve van aanleg ${trace.netType}. Geschatte duur: 4–6 weken.`
        ),
        aanvraagSectie(
          2,
          'Verkeersmaatregelen',
          bulletLijst([
            'Tijdelijke bermafzetting (VRI-richtlijn)',
            'Waarschuwingsborden conform RVV',
            'Werk buiten spitsuren op provinciale weg',
            'Omleidingsroute in overleg met wegbeheerder',
            'KLIC en WIBON-maatregelen actief tijdens graafwerk',
          ])
        ),
        aanvraagFooter(trace, 'Dhr. T. de Groot'),
      ].join('\n\n'),
      _source: 'demo',
    },
    {
      type: 'klic_graafmelding',
      titel: 'KLIC-graafmelding',
      ontvanger: 'Kadaster (KLIC-WIN)',
      status: 'concept',
      inhoud: [
        aanvraagKop(
          'KLIC-graafmelding (WIBON)',
          trace,
          aanvraagNummer('KLIC', trace.code),
          'Kadaster — KLIC-WIN',
          [
            ['Wet', 'Wet informatie-uitwisseling bovengrondse en ondergrondse netten (WIBON)'],
            ['Meldingstype', 'Graafmelding'],
          ]
        ),
        aanvraagSectie(
          1,
          'Werkzaamheden',
          bulletLijst([
            `Type: aanleg ${trace.netType}`,
            `Locatie: ${trace.wegnaam}, ${gebied.gemeente}`,
            `RD-werkgebied: polygon rond tracé (buffer 25 m)`,
            `Graafdiepte: max. ${Math.abs(trace.coordinates[0][2]).toFixed(1)} m`,
            `Geplande periode: Q3 ${new Date().getFullYear()}`,
            `Aannemer: nog te selecteren`,
          ])
        ),
        aanvraagSectie(
          2,
          'Veiligheidsmaatregelen',
          bulletLijst([
            'Landelijke KLIC-melding minimaal 3 werkdagen vóór start',
            'Proefsleuven conform KLIC-informatie',
            'Netbeheerders in kennis gesteld bij graafnabijheid < 1,5 m',
            'Aanwezigheid K&L-coördinator op locatie',
          ])
        ),
        aanvraagFooter(trace, 'Dhr. K. Meijer'),
      ].join('\n\n'),
      _source: 'demo',
    },
  ];
}

export function generateVergunningChecklist(
  trace: DemoTrace,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
): VergunningCheckItem[] {
  const gebied = getGebiedProfiel(trace.projectId);
  const watergangen = watergangNamen(collected);
  const heeftWater =
    (collected?.belemmeringen.some((b) => b.categorie === 'watergang') ?? false) ||
    (collected?.watergangen?.length ?? 0) > 0 ||
    trace.segmenten.some((s) => s.leglocatie.includes('water') || s.wegnaam.toLowerCase().includes('gracht'));
  const heeftWeg = collected?.belemmeringen.some((b) => b.categorie === 'weg') ?? true;
  const heeftNatuur =
    (collected?.belemmeringen.some((b) => b.categorie === 'natuur') ?? false) ||
    !!gebied.natura2000;
  const heeftBlokkerend = conflicten?.some((c) => c.ernst === 'blokkerend') ?? false;
  const heeftHdd = trace.segmenten.some((s) => s.legtechniek === 'hdd');
  const waterReden = heeftWater
    ? `Kruising(en): ${watergangen.join(', ')}`
    : 'Geen waterkruising in tracé';

  return [
    {
      vergunning: 'Omgevingsvergunning',
      nodig: true,
      reden: `Bouwactiviteit ondergrondse leiding (Ow) — gemeente ${gebied.gemeente}`,
      status: 'vereist',
    },
    {
      vergunning: 'Watervergunning / melding',
      nodig: heeftWater,
      reden: waterReden,
      status: heeftWater ? 'vereist' : 'niet_nodig',
    },
    {
      vergunning: 'Verkeersbesluit',
      nodig: heeftWeg,
      reden: heeftWeg ? `Werkzaamheden in berm ${trace.wegnaam}` : 'Geen wegkruising',
      status: heeftWeg ? 'vereist' : 'niet_nodig',
    },
    {
      vergunning: 'KLIC-graafmelding (WIBON)',
      nodig: true,
      reden: 'Verplicht minimaal 3 werkdagen vóór start graafwerk',
      status: 'vereist',
    },
    {
      vergunning: 'Kruisingsovereenkomst wegbeheerder',
      nodig: heeftWeg,
      reden: heeftWeg ? `Paralleltracé / kruising ${trace.wegnaam}` : 'Geen wegkruising',
      status: heeftWeg ? 'concept' : 'niet_nodig',
    },
    {
      vergunning: 'Kruisingsovereenkomst netbeheerder',
      nodig: heeftBlokkerend,
      reden: heeftBlokkerend
        ? `Blokkerende conflicten: ${conflicten?.filter((c) => c.ernst === 'blokkerend').map((c) => c.titel).join('; ')}`
        : 'Geen blokkades in K&L-inventarisatie',
      status: heeftBlokkerend ? 'vereist' : 'niet_nodig',
    },
    {
      vergunning: 'Archeologisch waarnemingsprotocol',
      nodig: gebied.archeologischeVerwachting !== 'negatief' || trace.segmenten.some((s) => s.legtechniek === 'open_ontgraving'),
      reden: `Verwachting: ${gebied.archeologischeVerwachting}; open ontgraving: ${trace.segmenten.some((s) => s.legtechniek === 'open_ontgraving') ? 'ja' : 'nee'}`,
      status: 'concept',
    },
    {
      vergunning: 'Ecologisch toezicht (Wnb)',
      nodig: heeftWater,
      reden: heeftWater ? `Beschermde soorten bij ${watergangen[0]}` : 'Geen waterkruising',
      status: heeftWater ? 'vereist' : 'concept',
    },
    {
      vergunning: 'Natura 2000-toets',
      nodig: heeftNatuur,
      reden: gebied.natura2000
        ? `Bufferzone ${gebied.natura2000.naam} (${gebied.natura2000.afstandM} m)`
        : 'Geen N2000 binnen onderzoeksgebied',
      status: heeftNatuur ? 'concept' : 'niet_nodig',
    },
    {
      vergunning: 'HDD-melding (gestuurde boring)',
      nodig: heeftHdd,
      reden: heeftHdd
        ? `HDD-segmenten: ${trace.segmenten.filter((s) => s.legtechniek === 'hdd').map((s) => s.wegnaam).join(', ')}`
        : 'Geen HDD',
      status: heeftHdd ? 'concept' : 'niet_nodig',
    },
    {
      vergunning: 'Instemmingsbesluit OD',
      nodig: heeftBlokkerend,
      reden: heeftBlokkerend
        ? `Afstemming ${gebied.omgevingsdienst} bij blokkerende conflicten`
        : 'Niet vereist',
      status: heeftBlokkerend ? 'vereist' : 'niet_nodig',
    },
  ];
}
