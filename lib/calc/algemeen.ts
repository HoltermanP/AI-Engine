import type { CalcInput, CalcResult } from './types';
import { dekkingM } from './formulas';

const BUIS_DIAMETER_M: Record<string, number> = {
  elektra_ls: 0.05,
  elektra_ms: 0.12,
  gas_ld: 0.11,
  gas_hd: 0.4,
  water: 0.315,
  stations: 0.15,
};

export function calcAlgemeen(input: CalcInput): CalcResult[] {
  const results: CalcResult[] = [];
  const maaiveld = input.maaiveldNap ?? -0.18;
  const asNap = input.diepteNap ?? -0.65;
  const buisD = input.diameterMm ? input.diameterMm / 1000 : (BUIS_DIAMETER_M[input.discipline] ?? 0.1);
  const dekking = dekkingM(maaiveld, asNap, buisD);
  const voldoet = dekking >= input.vereisteDekking;

  results.push({
    type: 'legdiepte_dekking',
    discipline: input.discipline,
    categorie: 'algemeen',
    normReferentie: 'NEN 7171 / netbeheerder',
    invoer: {
      maaiveldNap: maaiveld,
      asNap,
      buisDiameterM: buisD,
      vereisteDekking: input.vereisteDekking,
      legtechniek: input.legtechniek ?? 'open_ontgraving',
    },
    resultaat: {
      werkelijkeDekkingM: Math.round(dekking * 1000) / 1000,
      voldoet,
      margeM: Math.round((dekking - input.vereisteDekking) * 1000) / 1000,
    },
    aannames: [
      `Maaiveld NAP ${maaiveld} m (projectgemiddelde).`,
      `As leiding/kabel NAP ${asNap} m uit tracé.`,
      input.legtechniek === 'hdd' || input.legtechniek === 'persing'
        ? 'Sleufloze techniek: controle op minimale boogstraal en bescherming buiten dekking.'
        : 'Open ontgraving: standaard dekkingseis.',
    ],
    conclusie: voldoet
      ? `Dekking ${dekking.toFixed(2)} m voldoet aan minimum ${input.vereisteDekking} m (NEN 7171).`
      : `Dekking ${dekking.toFixed(2)} m onvoldoende — minimum ${input.vereisteDekking} m vereist.`,
  });

  if (input.legtechniek === 'hdd' || input.legtechniek === 'persing') {
    const minBoogstraal = buisD * 750;
    results.push({
      type: 'sleufloos_belasting',
      discipline: input.discipline,
      categorie: 'algemeen',
      normReferentie: 'NEN 3650 / netbeheerder',
      invoer: {
        legtechniek: input.legtechniek,
        buisDiameterM: buisD,
        lengteM: input.lengteM,
      },
      resultaat: {
        minBoogstraalM: Math.round(minBoogstraal * 10) / 10,
        aanbevolenMaxTrekkrachtKN: Math.round(buisD * 1000 * 0.5 * 10) / 10,
      },
      aannames: [
        'Minimale boogstraal 750× buisdiameter (HDD richtlijn).',
        'Trekkracht indicatief — detailberekening bij uitvoeringsontwerp.',
      ],
      conclusie: `${input.legtechniek === 'hdd' ? 'HDD' : 'Persing'}: controleer boogstraal ≥ ${minBoogstraal.toFixed(1)} m en trekkracht bij detailengineering.`,
    });
  }

  return results;
}
