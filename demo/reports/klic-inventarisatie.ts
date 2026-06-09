import type { DemoTrace } from '../traces';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import { getRapportContext } from './context';
import {
  rapportHeader,
  sectie,
  subsectie,
  samenvattingBlok,
  tabelFromRows,
  bulletLijst,
  genummerdeLijst,
  divider,
  rapportFooter,
  inhoudsopgave,
  referentiesBlok,
  bijlagenOverzicht,
  scopeBlok,
} from './format';

interface KlicNet {
  beheerder: string;
  thema: string;
  spanningOfDiameter?: string;
  nauwkeurigheid?: string;
}

export function rapportKlicInventarisatie(
  trace: DemoTrace,
  netten: KlicNet[],
  conflicten: DetectedConflict[]
): string {
  const ctx = getRapportContext(trace);
  const beheerders = new Set(netten.map((n) => n.beheerder));
  const blokkerend = conflicten.filter((c) => c.ernst === 'blokkerend').length;
  const waarschuwing = conflicten.filter((c) => c.ernst === 'waarschuwing').length;
  const gemeten = netten.filter((n) => n.nauwkeurigheid === 'gemeten').length;
  const geschat = netten.filter((n) => n.nauwkeurigheid === 'geschat').length;

  const header = rapportHeader({
    titel: 'K&L-inventarisatie',
    ondertitel: 'KLIC/WIBON-analyse en conflictdetectie conform NEN 7171',
    prefix: 'KLIC',
    trace,
    norm: 'WIBON / IMKL 2.0 / NEN 7171 / CROW 500',
    extraVelden: [
      ['KLIC-meldnummer', `MELD-2026-${trace.code.replace(/-/g, '')}`],
      ['Ontvangstdatum KLIC', new Date().toLocaleDateString('nl-NL')],
      ['Aantal netbeheerders', String(beheerders.size)],
      ['Aantal netten in gebied', String(netten.length)],
      ['Tracélengte', `${ctx.lengteM} m`],
      ['Gemeente', ctx.gebied.gemeente],
      ['Uitvoerder', 'InfraEngine K&L-advies'],
    ],
  });

  const conflictSectie =
    conflicten.length === 0
      ? 'Geen conflicten gedetecteerd na toetsing van het ontwerptracé tegen het bestaande net conform NEN 7171.'
      : conflicten
          .map(
            (c, i) =>
              `${subsectie(
                `4.${i + 1}`,
                `${c.type.replace(/_/g, ' ')} — ${c.ernst}`,
                `${tabelFromRows(
                  ['Aspect', 'Waarde'],
                  [
                    ['Norm', c.norm ?? '—'],
                    ['Gemeten', `${c.waardeGemeten ?? '—'} m`],
                    ['Eis', `${c.waardeEis ?? '—'} m`],
                    ['RD-locatie', `${c.x.toFixed(1)}, ${c.y.toFixed(1)}`],
                  ]
                )}

${c.toelichting}`
              )}`
          )
          .join('\n\n');

  const netTabel =
    netten.length > 0
      ? tabelFromRows(
          ['#', 'Beheerder', 'Thema', 'Type/afmeting', 'Nauwkeurigheid', 'Betrouwbaarheid'],
          netten.map((n, i) => [
            i + 1,
            n.beheerder,
            n.thema,
            n.spanningOfDiameter ?? '—',
            n.nauwkeurigheid ?? '—',
            n.nauwkeurigheid === 'gemeten' ? 'Hoog' : n.nauwkeurigheid === 'maatvoering' ? 'Middel' : 'Laag',
          ])
        )
      : '*Geen netten in onderzoeksgebied geregistreerd.*';

  const kruisingenTabel =
    netten.length > 0
      ? tabelFromRows(
          ['Bestaand net', 'Thema', 'Relatie tot ontwerp', 'Regime', 'Maatregel'],
          netten.slice(0, 6).map((n) => {
            const regime =
              n.thema === 'gas' && trace.discipline.includes('gas')
                ? 'Paralleltracé / afstandstoets'
                : n.thema === trace.discipline.replace('_hd', '').replace('_ld', '').replace('elektra', 'elektra')
                ? 'Parallel / coördinatie'
                : 'Kruising / afstandstoets';
            const maatregel =
              n.nauwkeurigheid === 'geschat'
                ? 'Proefsleuf + extra voorzorg'
                : ctx.heeftHdd
                ? 'HDD-boogminimaal, proefsleuf bij kruising'
                : 'Afstandstoets conform NEN 7171';
            return [n.beheerder, n.thema, `Parallel/kruising langs ${trace.wegnaam}`, regime, maatregel];
          })
        )
      : '*Geen kruisingen te beoordelen.*';

  return `${header}

${inhoudsopgave([
  { nummer: 1, titel: 'Management summary' },
  { nummer: 2, titel: 'Inventarisatie bestaand net' },
  { nummer: 3, titel: 'Liggingsnauwkeurigheid' },
  { nummer: 4, titel: 'Conflictenanalyse' },
  { nummer: 5, titel: 'Kruisingen en parallelle ligging' },
  { nummer: 6, titel: 'WIBON-verplichtingen' },
  { nummer: 7, titel: 'Conclusie' },
  { nummer: 8, titel: 'Referenties' },
  { nummer: 9, titel: 'Bijlagen' },
])}

${divider()}

${sectie(
  1,
  'Management summary',
  `${scopeBlok(trace, `Analyse conform WIBON en NEN 7171 voor ${trace.netType}.`)}

${samenvattingBlok(
  `In het onderzoeksgebied rond tracé ${trace.code} zijn **${netten.length} bestaande kabel- en leidingen** geregistreerd van **${beheerders.size} netbeheerders**. Na toetsing zijn **${conflicten.length} conflicten** geïdentificeerd (${blokkerend} blokkerend, ${waarschuwing} waarschuwing).`,
  `Behandel alle ${blokkerend > 0 ? 'blokkerende' : ''} conflicten vóór start werkzaamheden. Dien KLIC-graafmelding in minimaal 3 werkdagen vóór start conform WIBON.`,
  [
    `${gemeten} netten met GPS-nauwkeurigheid (betrouwbaar)`,
    `${geschat} netten met geschatte ligging (extra voorzorg)`,
    ctx.heeftHdd ? 'Proefsleuf aanbevolen bij HDD-kruisingen' : 'Open sleuf: standaard WIBON-procedure',
    'As-built registratie verplicht na oplevering',
    `Netbeheerders: ${[...beheerders].join(', ')}`,
  ]
)}`
)}

${divider()}

${sectie(2, 'Inventarisatie bestaand net', `${netTabel}

${subsectie('2.1', 'Netbeheerders in onderzoeksgebied', bulletLijst([...beheerders].map((b) => `**${b}** — netten in KLIC-levering`)))}`)}

${divider()}

${sectie(
  3,
  'Liggingsnauwkeurigheid en betrouwbaarheid',
  `${tabelFromRows(
    ['Nauwkeurigheid', 'Aantal', 'Betrouwbaarheidsbuffer', 'Interpretatie'],
    [
      ['Gemeten (GPS)', gemeten, '1,0× vrij te houden afstand', 'Hoog vertrouwen — standaard WIBON-buffer'],
      ['Maatvoering (tekening)', netten.filter((n) => n.nauwkeurigheid === 'maatvoering').length, '1,2×', 'Middel — aanvullende proefsleuf aanbevolen'],
      ['Geschat', geschat, '1,5×', 'Laag — proefsleuf verplicht bij kruising'],
    ]
  )}

${subsectie(
  '3.1',
  'Betrouwbaarheidsbeoordeling',
  bulletLijst([
    'IMKL 2.0-conforme data van geregistreerde netbeheerders',
    'Oudere netten (pre-2000) vaker geschatte ligging',
    'Vitens, Liander, GTS: overwegend gemeten ligging in utiliteitsstroken',
    'KPN microduct en Enexis LS: vaker geschatte ligging — extra voorzorg',
    'Alle liggingen gecontroleerd tegen ontwerptracé conform NEN 7171',
  ])
)}`
)}

${divider()}

${sectie(4, 'Conflictenanalyse', conflictSectie)}

${divider()}

${sectie(5, 'Kruisingen en parallelle ligging', kruisingenTabel)}

${divider()}

${sectie(
  6,
  'WIBON-verplichtingen',
  genummerdeLijst([
    '**KLIC-graafmelding** indienen minimaal 3 werkdagen vóór start via KLIC-WIN',
    '**Landelijke voorinformatie** beschikbaar houden op locatie (digitaal + print)',
    `**Netbeheerders informeren** over geplande kruisingen: ${[...beheerders].join(', ')}`,
    ctx.heeftHdd ? '**Proefsleuf** bij HDD-kruisingen vóór gestuurde boring' : '**Proefsleuf** bij kruisingen met geschatte ligging',
    '**As-built** registreren en doorgeven aan netbeheerders na oplevering',
    '**Schademelding** procedure opnemen in werkplan conform WIBON art. 16',
    '**Werkplan K&L** opstellen met vrij te houden afstanden per nettype',
  ])
)}

${divider()}

${sectie(
  7,
  'Conclusie',
  tabelFromRows(
    ['Onderdeel', 'Beoordeling', 'Status'],
    [
      ['KLIC-data ontvangen', 'Compleet', '✓'],
      ['Conflicten geïdentificeerd', `${conflicten.length} (${blokkerend} blokkerend)`, conflicten.length > 0 ? '✓' : '✗'],
      ['WIBON-graafmelding', 'Vereist vóór start', '✓'],
      ['Proefsleuven', ctx.heeftHdd || geschat > 0 ? 'Aanbevolen/vereist' : 'Optioneel', '✓'],
      ['Netbeheerder-afstemming', 'Vereist', '✓'],
      ['As-built registratie', 'Vereist na oplevering', '✓'],
    ]
  )
)}

${referentiesBlok([
  'Wet informatie-uitwisseling bovengrondse en ondergrondse netten (WIBON)',
  'NEN 7171:2017 — Aanleg en onderhoud van ondergrondse kabels en leidingen',
  'CROW-publicatie 500 — Richtlijnen ondergrondse infrastructuur',
  'IMKL 2.0 — Informatiemodel Kabels en Leidingen',
  'Handreiking KLIC-WIN — Kadaster',
])}

${bijlagenOverzicht([
  { letter: 'A', titel: 'KLIC-levering overzicht', beschrijving: 'Alle netten in onderzoeksgebied' },
  { letter: 'B', titel: 'Conflictkaart', beschrijving: 'Conflicten op ontwerptracé (RD)' },
  { letter: 'C', titel: 'Toetsingsrapport NEN 7171', beschrijving: 'Afstanden en kruisingen per net' },
  { letter: 'D', titel: 'Concept graafmelding', beschrijving: 'KLIC-WIN meldingsformulier' },
])}

${rapportFooter('K&L / KLIC', trace)}`;
}
