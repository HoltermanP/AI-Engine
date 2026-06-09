import type { VervuildeGrondLocatie } from '@/lib/connectors/vervuilde-grond/types';
import type {
  BodemGebiedType,
  BodemRisicoLocatie,
  BodemRisicoklasse,
  BodemRisicoSamenvatting,
} from './types';
import { RISICO_LABEL, RISICO_VOLGORDE } from './types';

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

function statusBevat(status: string, ...termen: string[]): boolean {
  const n = norm(status);
  return termen.some((t) => n.includes(norm(t)));
}

function bronBevat(bron: string, ...termen: string[]): boolean {
  const n = norm(bron);
  return termen.some((t) => n.includes(norm(t)));
}

function pfasRisico(status: string): BodemRisicoklasse {
  if (statusBevat(status, 'beinvloed', 'beïnvloed')) {
    const pfos = parseFloat(status.match(/som_pfos[:\s]*([<>\d.,]+)/i)?.[1]?.replace(',', '.') ?? '');
    const pfoa = parseFloat(status.match(/som_pfoa[:\s]*([<>\d.,]+)/i)?.[1]?.replace(',', '.') ?? '');
    if (pfos > 0.5 || pfoa > 0.5) return 'hoog';
    return 'middel';
  }
  return 'laag';
}

function classificeer(bron: string, status: string): {
  risicoklasse: BodemRisicoklasse;
  gebiedType: BodemGebiedType;
} {
  const b = bron.toLowerCase();
  const s = status.toLowerCase();

  if (b === 'sld_verontreinigd_gebied') {
    return { risicoklasse: 'hoog', gebiedType: 'verontreinigd_gebied' };
  }
  if (b === 'sld_aangepakt_gebied') {
    return { risicoklasse: 'beheer', gebiedType: 'aangepakt_gebied' };
  }
  if (b === 'sld_nazorggebied') {
    return { risicoklasse: 'beheer', gebiedType: 'nazorggebied' };
  }
  if (b === 'sld_bodemlocatie') {
    if (statusBevat(s, 'geenverontreiniging', 'geen_verontreiniging', 'schoon')) {
      return { risicoklasse: 'geen', gebiedType: 'bodemlocatie' };
    }
    if (statusBevat(s, 'voldoendegesaneerd', 'gesaneerd', 'afgerond')) {
      return { risicoklasse: 'beheer', gebiedType: 'bodemlocatie' };
    }
    if (statusBevat(s, 'lichtverontreinigd', 'licht')) {
      return { risicoklasse: 'middel', gebiedType: 'bodemlocatie' };
    }
    if (statusBevat(s, 'onderzoeknodig', 'onderzoek')) {
      return { risicoklasse: 'middel', gebiedType: 'bodemlocatie' };
    }
    return { risicoklasse: 'middel', gebiedType: 'bodemlocatie' };
  }
  if (b === 'sld_overheidsbesluit') {
    if (statusBevat(s, 'geen', 'schoon')) return { risicoklasse: 'geen', gebiedType: 'overheidsbesluit' };
    if (statusBevat(s, 'saner', 'aangepakt')) return { risicoklasse: 'beheer', gebiedType: 'overheidsbesluit' };
    return { risicoklasse: 'middel', gebiedType: 'overheidsbesluit' };
  }
  if (b === 'sad_bodemonderzoek') {
    return { risicoklasse: 'middel', gebiedType: 'bodemonderzoek' };
  }
  if (b === 'sad_meetpunt') {
    return { risicoklasse: 'middel', gebiedType: 'meetpunt' };
  }

  if (bronBevat(b, 'pfas')) {
    return { risicoklasse: pfasRisico(status), gebiedType: 'pfas' };
  }
  if (bronBevat(b, 'spoed')) {
    return { risicoklasse: 'zeer_hoog', gebiedType: 'spoedlocatie' };
  }
  if (bronBevat(b, 'grondwater')) {
    return { risicoklasse: 'hoog', gebiedType: 'grondwaterverontreiniging' };
  }
  if (bronBevat(b, 'hbb', 'verdacht')) {
    return { risicoklasse: 'middel', gebiedType: bronBevat(b, 'hbb') ? 'historisch_hbb' : 'verdachte_locatie' };
  }
  if (bronBevat(b, 'veront', 'vervuil', 'contour')) {
    return { risicoklasse: 'hoog', gebiedType: 'verontreinigd_gebied' };
  }
  if (bronBevat(b, 'saner', 'bsb', 'stort')) {
    return { risicoklasse: 'middel', gebiedType: 'sanering' };
  }
  if (bronBevat(b, 'onderzoek', 'meetpunt')) {
    return { risicoklasse: 'middel', gebiedType: 'bodemonderzoek' };
  }
  if (bronBevat(b, 'bodemloket')) {
    return { risicoklasse: 'laag', gebiedType: 'bodemkwaliteitskaart' };
  }
  if (bronBevat(b, 'limburg_wbb', 'overgangsrecht')) {
    return { risicoklasse: 'hoog', gebiedType: 'bodemlocatie' };
  }
  if (bronBevat(b, 'limburg_mijnsteen', 'mijnsteen')) {
    return { risicoklasse: 'hoog', gebiedType: 'verontreinigd_gebied' };
  }
  if (bronBevat(b, 'stortplaats', 'stort', 'navos')) {
    return { risicoklasse: 'middel', gebiedType: 'stortplaats' };
  }
  if (bronBevat(b, 'krw_gw', 'gelderland_krw')) {
    return { risicoklasse: 'hoog', gebiedType: 'krw_grondwater' };
  }
  if (bronBevat(b, 'zeeland_bodem')) {
    if (statusBevat(s, 'urgent', 'san', 'verontreinig')) {
      return { risicoklasse: 'hoog', gebiedType: 'bodemlocatie' };
    }
    return { risicoklasse: 'middel', gebiedType: 'bodemlocatie' };
  }
  if (bronBevat(b, 'fryslan')) {
    if (statusBevat(s, 'ernstig', 'potentieel')) {
      return { risicoklasse: 'hoog', gebiedType: 'verdachte_locatie' };
    }
    return { risicoklasse: 'middel', gebiedType: 'bodemonderzoek' };
  }
  if (bronBevat(b, 'nh_spoed')) {
    return { risicoklasse: 'zeer_hoog', gebiedType: 'spoedlocatie' };
  }
  if (bronBevat(b, 'tank', 'olietank', 'bedrijf')) {
    return { risicoklasse: 'middel', gebiedType: 'bedrijfsactiviteit' };
  }
  if (bronBevat(b, 'zorg', 'nazorg', 'aangepakt')) {
    return { risicoklasse: 'beheer', gebiedType: 'aangepakt_gebied' };
  }

  if (statusBevat(s, 'spoed', 'urgent')) {
    return { risicoklasse: 'zeer_hoog', gebiedType: 'spoedlocatie' };
  }
  if (statusBevat(s, 'verontreinig', 'vervuil', 'ernstig')) {
    return { risicoklasse: 'hoog', gebiedType: 'verontreinigd_gebied' };
  }
  if (statusBevat(s, 'verdacht', 'hbb', 'onderzoek')) {
    return { risicoklasse: 'middel', gebiedType: 'verdachte_locatie' };
  }
  if (statusBevat(s, 'gesaneerd', 'aangepakt', 'nazorg')) {
    return { risicoklasse: 'beheer', gebiedType: 'aangepakt_gebied' };
  }
  if (statusBevat(s, 'geen', 'schoon')) {
    return { risicoklasse: 'geen', gebiedType: 'overig' };
  }

  return { risicoklasse: 'onbekend', gebiedType: 'overig' };
}

export function classifyVervuildeGrondLocatie(
  loc: VervuildeGrondLocatie,
  afstandTraceM?: number
): BodemRisicoLocatie {
  const { risicoklasse, gebiedType } = classificeer(loc.bron, loc.status);
  return {
    ...loc,
    risicoklasse,
    gebiedType,
    afstandTraceM,
  };
}

export function classifyVervuildeGrondLocaties(
  locaties: VervuildeGrondLocatie[],
  afstanden?: Map<string, number>
): BodemRisicoLocatie[] {
  return locaties.map((loc) =>
    classifyVervuildeGrondLocatie(loc, afstanden?.get(loc.id))
  );
}

function hoogsteRisico(klassen: BodemRisicoklasse[]): BodemRisicoklasse {
  for (const k of RISICO_VOLGORDE) {
    if (klassen.includes(k)) return k;
  }
  return 'onbekend';
}

function aanbevelingVoorRisico(klasse: BodemRisicoklasse, telling: number): string {
  if (telling === 0) {
    return 'Geen geregistreerde bodemrisico\'s in onderzoeksgebied. Quick scan (fase A) volstaat; visuele inspectie bij ontgraving blijft verplicht.';
  }
  switch (klasse) {
    case 'zeer_hoog':
      return `${telling} locatie(s) met zeer hoog risico — verdiepend bodemonderzoek (fase B/C) en overleg met bevoegd gezag vóór start werkzaamheden verplicht.`;
    case 'hoog':
      return `${telling} locatie(s) met hoog risico — verdiepend bodemonderzoek (fase B) aanbevolen; saneringsplicht of maatregelen kunnen van toepassing zijn.`;
    case 'middel':
      return `${telling} locatie(s) met middel risico — aanvullend vooronderzoek en monstername op kritieke punten aanbevolen.`;
    case 'laag':
      return `${telling} locatie(s) met laag risico — quick scan volstaat; extra aandacht bij ontgraving.`;
    case 'beheer':
      return `${telling} beheers-/nazorglocatie(s) — werkzaamheden mogelijk onder voorwaarden; toets aan beheerplan/bevoegd gezag.`;
    case 'geen':
      return 'Geregistreerde locaties zonder verhoogd risico — standaard quick scan-procedure.';
    default:
      return `${telling} locatie(s) met onbekend risico — handmatige beoordeling en bronverificatie nodig.`;
  }
}

export function samenvattingBodemRisico(
  locaties: BodemRisicoLocatie[]
): BodemRisicoSamenvatting {
  const perKlasse: Record<BodemRisicoklasse, number> = {
    zeer_hoog: 0,
    hoog: 0,
    middel: 0,
    laag: 0,
    beheer: 0,
    geen: 0,
    onbekend: 0,
  };
  const perGebiedType: Partial<Record<BodemGebiedType, number>> = {};

  for (const loc of locaties) {
    perKlasse[loc.risicoklasse]++;
    perGebiedType[loc.gebiedType] = (perGebiedType[loc.gebiedType] ?? 0) + 1;
  }

  const hoogsteRisicoklasse = hoogsteRisico(
    RISICO_VOLGORDE.filter((k) => perKlasse[k] > 0)
  );

  return {
    totaalLocaties: locaties.length,
    hoogsteRisicoklasse,
    perKlasse,
    perGebiedType,
    aanbeveling: aanbevelingVoorRisico(hoogsteRisicoklasse, locaties.length),
  };
}
