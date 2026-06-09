import type { DemoTrace } from './traces';
import type { Discipline } from '@/lib/db/types';
import { disciplineColor } from '@/lib/discipline-colors';
import { getGebiedProfiel } from './reports/context';

export type AvoiZone =
  | 'berm_zuid'
  | 'berm_noord'
  | 'onder_verharding'
  | 'parallelweg'
  | 'utiliteitsstrook';

export interface AvoiUtilitySlot {
  discipline: Discipline | 'telecom' | 'riool' | 'warmte';
  label: string;
  /** Horizontale afstand t.o.v. wegas (+ = noord / links in profiel) */
  offsetM: number;
  minDekkingM: number;
  kleur: string;
  zone: AvoiZone;
}

export interface GemeenteAvoi {
  gemeente: string;
  titel: string;
  versie: string;
  vaststelling: string;
  /** Zichtbare breedte dwarsprofiel (m) */
  profileWidthM: number;
  ordening: AvoiUtilitySlot[];
  /** Aanvullende eisen per ontwerpdiscipline */
  ontwerp: Partial<
    Record<
      Discipline,
      { offsetM: number; minDekkingM: number; zone: AvoiZone; leglocatieHint: string }
    >
  >;
}

function slot(
  entry: Omit<AvoiUtilitySlot, 'kleur'>
): AvoiUtilitySlot {
  return { ...entry, kleur: disciplineColor(entry.discipline) };
}

const NOP_ORDENING: AvoiUtilitySlot[] = [
  slot({ discipline: 'telecom', label: 'Telecom', offsetM: -1.2, minDekkingM: 0.6, zone: 'berm_zuid' }),
  slot({ discipline: 'elektra_ls', label: 'Elektra LS', offsetM: -1.8, minDekkingM: 0.6, zone: 'berm_zuid' }),
  slot({ discipline: 'gas_ld', label: 'Gas LD', offsetM: -2.6, minDekkingM: 0.8, zone: 'berm_zuid' }),
  slot({ discipline: 'riool', label: 'Riool', offsetM: -3.4, minDekkingM: 1.0, zone: 'onder_verharding' }),
  slot({ discipline: 'water', label: 'Water', offsetM: 2.2, minDekkingM: 1.0, zone: 'berm_noord' }),
  slot({ discipline: 'elektra_ms', label: 'Elektra MS', offsetM: 6.5, minDekkingM: 1.0, zone: 'utiliteitsstrook' }),
  slot({ discipline: 'gas_hd', label: 'Gas HD', offsetM: 14.0, minDekkingM: 1.2, zone: 'parallelweg' }),
];

const GEMEENTE_AVOI: Record<string, GemeenteAvoi> = {
  Noordoostpolder: {
    gemeente: 'Noordoostpolder',
    titel: 'AVOI Ondergrondse Infrastructuren Gemeente Noordoostpolder',
    versie: '2024-01',
    vaststelling: 'Raadsbesluit 15-03-2024',
    profileWidthM: 22,
    ordening: NOP_ORDENING,
    ontwerp: {
      elektra_ls: { offsetM: -1.5, minDekkingM: 0.6, zone: 'berm_zuid', leglocatieHint: 'Berm zuid, max. 1,5 m uit kant verharding' },
      elektra_ms: { offsetM: 6.0, minDekkingM: 1.0, zone: 'utiliteitsstrook', leglocatieHint: 'Utiliteitsstrook 6–8 m noord van wegas' },
      gas_hd: { offsetM: 15.0, minDekkingM: 1.2, zone: 'parallelweg', leglocatieHint: 'Paralleltracé min. 12 m noord van wegas (GTS-corridor)' },
      gas_ld: { offsetM: -2.0, minDekkingM: 0.8, zone: 'berm_zuid', leglocatieHint: 'Berm/trottoir, sleufloos waar mogelijk' },
      water: { offsetM: 2.5, minDekkingM: 1.0, zone: 'berm_noord', leglocatieHint: 'Noordberm, 2,5 m uit kant' },
      stations: { offsetM: 6.0, minDekkingM: 0.0, zone: 'utiliteitsstrook', leglocatieHint: 'Stationterrein aansluiting op MS-ruimte' },
    },
  },
  Almere: {
    gemeente: 'Almere',
    titel: 'AVOI Ondergrondse Netten Almere',
    versie: '2023-06',
    vaststelling: 'Collegebesluit 22-06-2023',
    profileWidthM: 18,
    ordening: [
      slot({ discipline: 'telecom', label: 'Telecom', offsetM: -0.8, minDekkingM: 0.5, zone: 'onder_verharding' }),
      slot({ discipline: 'elektra_ls', label: 'Elektra LS', offsetM: -1.4, minDekkingM: 0.6, zone: 'onder_verharding' }),
      slot({ discipline: 'gas_ld', label: 'Gas LD', offsetM: -2.2, minDekkingM: 0.8, zone: 'berm_zuid' }),
      slot({ discipline: 'water', label: 'Water', offsetM: 1.8, minDekkingM: 1.0, zone: 'berm_noord' }),
      slot({ discipline: 'riool', label: 'Riool', offsetM: -3.0, minDekkingM: 1.2, zone: 'onder_verharding' }),
      slot({ discipline: 'elektra_ms', label: 'Elektra MS', offsetM: 4.5, minDekkingM: 1.0, zone: 'utiliteitsstrook' }),
      slot({ discipline: 'gas_hd', label: 'Gas HD', offsetM: 10.0, minDekkingM: 1.2, zone: 'parallelweg' }),
    ],
    ontwerp: {
      elektra_ms: { offsetM: 4.5, minDekkingM: 1.0, zone: 'utiliteitsstrook', leglocatieHint: 'Stedelijke utiliteitsstrook, coördinatie Liander' },
      elektra_ls: { offsetM: -1.2, minDekkingM: 0.6, zone: 'onder_verharding', leglocatieHint: 'Onder trottoir in bebouwde kom' },
      gas_ld: { offsetM: -2.0, minDekkingM: 0.8, zone: 'berm_zuid', leglocatieHint: 'PE onder trottoir/berm' },
      water: { offsetM: 1.8, minDekkingM: 1.0, zone: 'berm_noord', leglocatieHint: 'Noordberm stedelijk tracé' },
      gas_hd: { offsetM: 10.0, minDekkingM: 1.2, zone: 'parallelweg', leglocatieHint: 'Parallel aan hoofdinfrastructuur' },
      stations: { offsetM: 4.5, minDekkingM: 0.0, zone: 'utiliteitsstrook', leglocatieHint: 'MS-ruimte in stedelijk net' },
    },
  },
  Purmerend: {
    gemeente: 'Purmerend',
    titel: 'Verordening Ondergrondse Infrastructuren Purmerend',
    versie: '2022-04',
    vaststelling: 'Raadsbesluit 12-04-2022',
    profileWidthM: 16,
    ordening: [
      slot({ discipline: 'telecom', label: 'Telecom', offsetM: -1.0, minDekkingM: 0.6, zone: 'berm_zuid' }),
      slot({ discipline: 'elektra_ls', label: 'Elektra LS', offsetM: -1.6, minDekkingM: 0.6, zone: 'berm_zuid' }),
      slot({ discipline: 'gas_ld', label: 'Gas LD', offsetM: -2.4, minDekkingM: 0.8, zone: 'berm_zuid' }),
      slot({ discipline: 'water', label: 'Water', offsetM: 2.0, minDekkingM: 1.0, zone: 'berm_noord' }),
      slot({ discipline: 'riool', label: 'Riool', offsetM: -3.2, minDekkingM: 1.0, zone: 'onder_verharding' }),
      slot({ discipline: 'elektra_ms', label: 'Elektra MS', offsetM: 5.5, minDekkingM: 1.0, zone: 'parallelweg' }),
    ],
    ontwerp: {
      water: { offsetM: 2.0, minDekkingM: 1.0, zone: 'berm_noord', leglocatieHint: 'Zuidberm drinkwater, min. 2 m uit kant' },
      elektra_ms: { offsetM: 5.5, minDekkingM: 1.0, zone: 'parallelweg', leglocatieHint: 'Parallel aan weg in utiliteitszone' },
      gas_ld: { offsetM: -2.4, minDekkingM: 0.8, zone: 'berm_zuid', leglocatieHint: 'Zuidberm distributie' },
      elektra_ls: { offsetM: -1.6, minDekkingM: 0.6, zone: 'berm_zuid', leglocatieHint: 'Zuidberm LS' },
      gas_hd: { offsetM: 8.0, minDekkingM: 1.2, zone: 'parallelweg', leglocatieHint: 'Transport buiten bebouwde kom' },
      stations: { offsetM: 5.5, minDekkingM: 0.0, zone: 'parallelweg', leglocatieHint: 'Aansluiting MS-ruimte' },
    },
  },
  Lelystad: {
    gemeente: 'Lelystad',
    titel: 'AVOI Ondergrondse Infrastructuren Lelystad',
    versie: '2023-11',
    vaststelling: 'Raadsbesluit 09-11-2023',
    profileWidthM: 20,
    ordening: [
      slot({ discipline: 'telecom', label: 'Telecom', offsetM: -1.1, minDekkingM: 0.6, zone: 'berm_zuid' }),
      slot({ discipline: 'elektra_ls', label: 'Elektra LS', offsetM: -2.0, minDekkingM: 0.6, zone: 'berm_zuid' }),
      slot({ discipline: 'gas_ld', label: 'Gas LD', offsetM: -2.8, minDekkingM: 0.8, zone: 'berm_zuid' }),
      slot({ discipline: 'water', label: 'Water', offsetM: 2.4, minDekkingM: 1.0, zone: 'berm_noord' }),
      slot({ discipline: 'elektra_ms', label: 'Elektra MS', offsetM: 5.0, minDekkingM: 1.0, zone: 'utiliteitsstrook' }),
      slot({ discipline: 'riool', label: 'Riool', offsetM: -3.6, minDekkingM: 1.2, zone: 'onder_verharding' }),
      slot({ discipline: 'warmte', label: 'Warmte', offsetM: 3.5, minDekkingM: 1.0, zone: 'utiliteitsstrook' }),
    ],
    ontwerp: {
      elektra_ls: { offsetM: -1.2, minDekkingM: 0.6, zone: 'berm_zuid', leglocatieHint: 'Havenberm oostzijde, 1,2 m uit kant' },
      elektra_ms: { offsetM: 5.0, minDekkingM: 1.0, zone: 'utiliteitsstrook', leglocatieHint: 'Bedrijventerrein utiliteitsstrook' },
      gas_ld: { offsetM: -2.0, minDekkingM: 0.8, zone: 'onder_verharding', leglocatieHint: 'Onder trottoir havengebied' },
      water: { offsetM: 2.4, minDekkingM: 1.0, zone: 'berm_noord', leglocatieHint: 'Noordberm' },
      gas_hd: { offsetM: 12.0, minDekkingM: 1.2, zone: 'parallelweg', leglocatieHint: 'Transport parallel hoofdweg' },
      stations: { offsetM: 5.0, minDekkingM: 0.0, zone: 'utiliteitsstrook', leglocatieHint: 'Haven-MS aansluiting' },
    },
  },
  Dronten: {
    gemeente: 'Dronten',
    titel: 'AVOI Dronten — Ondergrondse Infrastructuren',
    versie: '2024-02',
    vaststelling: 'Raadsbesluit 20-02-2024',
    profileWidthM: 20,
    ordening: NOP_ORDENING,
    ontwerp: {
      gas_ld: { offsetM: -2.0, minDekkingM: 0.8, zone: 'onder_verharding', leglocatieHint: 'Onder trottoir nieuwbouwwijk' },
      elektra_ls: { offsetM: -1.5, minDekkingM: 0.6, zone: 'berm_zuid', leglocatieHint: 'Berm zuid distributie' },
      elektra_ms: { offsetM: 6.0, minDekkingM: 1.0, zone: 'utiliteitsstrook', leglocatieHint: 'Utiliteitsstrook langs hoofdweg' },
      gas_hd: { offsetM: 14.0, minDekkingM: 1.2, zone: 'parallelweg', leglocatieHint: 'Parallel GTS-corridor' },
      water: { offsetM: 2.5, minDekkingM: 1.0, zone: 'berm_noord', leglocatieHint: 'Noordberm' },
      stations: { offsetM: 6.0, minDekkingM: 0.0, zone: 'utiliteitsstrook', leglocatieHint: 'Station aansluiting' },
    },
  },
  Urk: {
    gemeente: 'Urk',
    titel: 'AVOI Gemeente Urk — Industrie- en utiliteitszones',
    versie: '2023-08',
    vaststelling: 'Raadsbesluit 14-08-2023',
    profileWidthM: 18,
    ordening: [
      slot({ discipline: 'telecom', label: 'Telecom', offsetM: -1.0, minDekkingM: 0.6, zone: 'utiliteitsstrook' }),
      slot({ discipline: 'elektra_ls', label: 'Elektra LS', offsetM: -2.0, minDekkingM: 0.6, zone: 'utiliteitsstrook' }),
      slot({ discipline: 'gas_ld', label: 'Gas LD', offsetM: -3.0, minDekkingM: 0.8, zone: 'utiliteitsstrook' }),
      slot({ discipline: 'water', label: 'Water', offsetM: 2.5, minDekkingM: 1.0, zone: 'utiliteitsstrook' }),
      slot({ discipline: 'elektra_ms', label: 'Elektra MS', offsetM: -4.5, minDekkingM: 1.0, zone: 'utiliteitsstrook' }),
      slot({ discipline: 'gas_hd', label: 'Gas HD', offsetM: 8.0, minDekkingM: 1.2, zone: 'parallelweg' }),
      slot({ discipline: 'riool', label: 'Riool', offsetM: -5.5, minDekkingM: 1.2, zone: 'onder_verharding' }),
    ],
    ontwerp: {
      elektra_ms: { offsetM: -4.5, minDekkingM: 1.0, zone: 'utiliteitsstrook', leglocatieHint: 'Gecombineerde utiliteitsstrook industrieterrein' },
      gas_hd: { offsetM: 8.0, minDekkingM: 1.2, zone: 'parallelweg', leglocatieHint: 'Bypass parallel aan hoofdweg' },
      gas_ld: { offsetM: -3.0, minDekkingM: 0.8, zone: 'utiliteitsstrook', leglocatieHint: 'Industrieterrein PE' },
      water: { offsetM: 2.5, minDekkingM: 1.0, zone: 'utiliteitsstrook', leglocatieHint: 'Utiliteitsstrook' },
      elektra_ls: { offsetM: -2.0, minDekkingM: 0.6, zone: 'utiliteitsstrook', leglocatieHint: 'Industrieterrein LS' },
      stations: { offsetM: -4.5, minDekkingM: 0.0, zone: 'utiliteitsstrook', leglocatieHint: 'MS-ruimte industrieterrein' },
    },
  },
};

const DEFAULT_AVOI = GEMEENTE_AVOI.Nooroostpolder;

export function getAvoiForGemeente(gemeente: string): GemeenteAvoi {
  return GEMEENTE_AVOI[gemeente] ?? DEFAULT_AVOI;
}

export function getAvoiForTrace(trace: DemoTrace): GemeenteAvoi {
  const { gemeente } = getGebiedProfiel(trace.projectId);
  return getAvoiForGemeente(gemeente);
}

export function getOntwerpEis(
  avoi: GemeenteAvoi,
  trace: DemoTrace
): NonNullable<GemeenteAvoi['ontwerp'][Discipline]> {
  const eis = avoi.ontwerp[trace.discipline];
  if (eis) return eis;

  const slot = avoi.ordening.find((o) => o.discipline === trace.discipline);
  if (slot) {
    return {
      offsetM: slot.offsetM,
      minDekkingM: slot.minDekkingM,
      zone: slot.zone,
      leglocatieHint: trace.leglocatie,
    };
  }

  return {
    offsetM: 0,
    minDekkingM: trace.vereisteDekking,
    zone: 'berm_zuid',
    leglocatieHint: trace.leglocatie,
  };
}

const ZONE_LABELS: Record<AvoiZone, string> = {
  berm_zuid: 'Berm zuid',
  berm_noord: 'Berm noord',
  onder_verharding: 'Onder verharding',
  parallelweg: 'Parallelweg',
  utiliteitsstrook: 'Utiliteitsstrook',
};

export function zoneLabel(zone: AvoiZone): string {
  return ZONE_LABELS[zone];
}
