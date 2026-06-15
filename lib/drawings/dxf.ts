/**
 * DXF-export voor tracétekeningen en lengteprofielen.
 *
 * Gebruikt `@tarikjabiri/dxf` (DxfWriter). Tekening-eenheden = meters:
 * - Tracé: RD-coördinaten (EPSG:28992), 1 drawing unit = 1 m.
 * - Lengteprofiel: x = kettingmaat (m), y = hoogte NAP (m) × verticale schaalfactor.
 *
 * De inputtypes zijn bewust klein en zelfstandig (geen React/MapLibre-types),
 * zodat de export ook server-side of in scripts bruikbaar is.
 */

import {
  DxfWriter,
  LineTypes,
  TrueColor,
  Units,
  point2d,
  point3d,
  type LWPolylineVertex,
} from '@tarikjabiri/dxf';
import { IMKL_COLORS } from '@/lib/discipline-colors';
import { bematingGeometrie, type Bemating } from '@/lib/map/bemating';
import { NLCS_KLEUR } from './nlcs';

/** RD-coördinaat (EPSG:28992) in meters: [x, y]. */
export type RdPunt = [number, number];

/** KLIC/IMKL-thema's voor bestaand net. */
export type DxfKlicThema = 'gas' | 'water' | 'elektra' | 'telecom' | 'riool' | 'overig';

/**
 * NLCS 5.0 laagnaamconventie — patroon `[discipline]-[status]-[objectcode]`.
 *
 * Disciplinecodes: KR = kabels & leidingen, OB = omgeving/bestaande topografie.
 * Status: `NIEUW WERK` (ontwerp) of `BESTAAND` (bestaande situatie).
 * Kleuren per IMKL-thema conform IMKL/PMKL Handreiking visualisatie 2.0
 * (zie lib/discipline-colors.ts); contextkleuren uit lib/drawings/nlcs.ts.
 */
export const DXF_LAGEN = {
  /** Nieuw MS-tracé (ontwerp-centerline) */
  traceNieuw: { naam: 'KR-NIEUW WERK-K_OS-MS', kleur: IMKL_COLORS.middenspanning },
  /** Kruisingen met bestaand net (markering + label) */
  kruising: { naam: 'KR-NIEUW WERK-KRUISING', kleur: NLCS_KLEUR.snede },
  /** Annotaties (teksten, chainagelabels) */
  annotatie: { naam: 'KR-NIEUW WERK-ANNOTATIE', kleur: NLCS_KLEUR.maattekst },
  /** Bestaand net per KLIC/IMKL-thema */
  bestaandGas: { naam: 'KR-BESTAAND-K_GAS', kleur: IMKL_COLORS.gasLageDruk },
  bestaandWater: { naam: 'KR-BESTAAND-K_WATER', kleur: IMKL_COLORS.water },
  bestaandElektra: { naam: 'KR-BESTAAND-K_ELEKTRA', kleur: IMKL_COLORS.laagspanning },
  bestaandTelecom: { naam: 'KR-BESTAAND-K_TELECOM', kleur: IMKL_COLORS.datatransport },
  bestaandRiool: { naam: 'KR-BESTAAND-K_RIOOL', kleur: IMKL_COLORS.rioolVrijverfall },
  bestaandOverig: { naam: 'KR-BESTAAND-K_OVERIG', kleur: IMKL_COLORS.overig },
  /** Wegen-context (bestaande topografie) */
  wegen: { naam: 'OB-BESTAAND-WEGEN', kleur: NLCS_KLEUR.verharding },
  /** Lengteprofiel: maaiveldlijn (bestaande situatie) */
  lpMaaiveld: { naam: 'OB-BESTAAND-MAAIVELD', kleur: NLCS_KLEUR.maaiveld },
  /** Lengteprofiel: kabel/leiding-as (ontwerp) */
  lpLeidingAs: { naam: 'KR-NIEUW WERK-LENGTEPROFIEL', kleur: IMKL_COLORS.middenspanning },
  /** Werktekening: moffen op het nieuwe tracé */
  moffen: { naam: 'KR-NIEUW WERK-MOFFEN', kleur: '#E67E22' },
  /** Werktekening: mantelbuizen (kruisingen) */
  mantelbuizen: { naam: 'KR-NIEUW WERK-MANTELBUIS', kleur: '#0E7490' },
  /** Werktekening: stations (trafostation/verdeelkast) */
  stations: { naam: 'KR-NIEUW WERK-STATION', kleur: '#7C3AED' },
} as const;

/** Laag voor bestaand net per KLIC-thema. */
const BESTAAND_LAAG_PER_THEMA: Record<DxfKlicThema, { naam: string; kleur: string }> = {
  gas: DXF_LAGEN.bestaandGas,
  water: DXF_LAGEN.bestaandWater,
  elektra: DXF_LAGEN.bestaandElektra,
  telecom: DXF_LAGEN.bestaandTelecom,
  riool: DXF_LAGEN.bestaandRiool,
  overig: DXF_LAGEN.bestaandOverig,
};

/** Bestaande kabel/leiding uit KLIC-data. */
export interface DxfBestaandNetLijn {
  thema: DxfKlicThema;
  /** Hartlijn in RD-coördinaten. */
  coordinaten: RdPunt[];
  /** Optionele aanduiding (beheerder / diameter / spanning). */
  label?: string;
}

/** Kruising van het nieuwe tracé met bestaand net of infrastructuur. */
export interface DxfKruising {
  positie: RdPunt;
  label?: string;
}

/** Wegcontour of wegas als context. */
export interface DxfWegLijn {
  coordinaten: RdPunt[];
  naam?: string;
}

/** Invoer voor de tracé-DXF. */
export interface TraceDxfInput {
  /** Tracénaam/-code voor annotatie. */
  naam?: string;
  /** Centerline van het ontwerptracé in RD-coördinaten (meters). */
  centerline: RdPunt[];
  /** Bestaand net (KLIC) per thema. */
  bestaandNet?: DxfBestaandNetLijn[];
  /** Kruisingen met bestaand net. */
  kruisingen?: DxfKruising[];
  /** Wegen als omgevingscontext. */
  wegen?: DxfWegLijn[];
  /** Bematingen (lineair + hoek) op de annotatielaag. */
  bematingen?: Bemating[];
  /** Teksthoogte in meters (default 2.5 — leesbaar op 1:500/1:1000). */
  tekstHoogteM?: number;
}

/** Maakt LWPolyline-vertices van RD-puntenlijst. */
function naarVertices(coordinaten: RdPunt[]): LWPolylineVertex[] {
  return coordinaten.map(([x, y]) => ({ point: point2d(x, y) }));
}

/** Voegt een laag toe met NLCS-naam en IMKL-truecolor. */
function voegLaagToe(writer: DxfWriter, laag: { naam: string; kleur: string }): void {
  const dxfLaag = writer.addLayer(laag.naam, 7, LineTypes.Continuous);
  dxfLaag.trueColor = TrueColor.fromHex(laag.kleur);
}

/**
 * Genereert een tracé-DXF (situatie) met NLCS-lagen:
 * ontwerp-centerline, bestaand net per KLIC-thema, kruisingen en wegen-context.
 * Coördinaten in RD (EPSG:28992); 1 drawing unit = 1 meter.
 *
 * @returns DXF-bestand als string (writer.stringify()).
 */
export function generateTraceDxf(input: TraceDxfInput): string {
  const writer = new DxfWriter();
  writer.setUnits(Units.Meters);

  const tekstHoogte = input.tekstHoogteM ?? 2.5;

  voegLaagToe(writer, DXF_LAGEN.traceNieuw);
  voegLaagToe(writer, DXF_LAGEN.kruising);
  voegLaagToe(writer, DXF_LAGEN.annotatie);
  voegLaagToe(writer, DXF_LAGEN.wegen);
  const gebruikteThemas = new Set<DxfKlicThema>(
    (input.bestaandNet ?? []).map((n) => n.thema)
  );
  for (const thema of gebruikteThemas) {
    voegLaagToe(writer, BESTAAND_LAAG_PER_THEMA[thema]);
  }

  // Wegen-context (eerst, zodat deze "onder" de leidingen ligt)
  for (const weg of input.wegen ?? []) {
    if (weg.coordinaten.length < 2) continue;
    writer.addLWPolyline(naarVertices(weg.coordinaten), {
      layerName: DXF_LAGEN.wegen.naam,
    });
    if (weg.naam) {
      const [x, y] = weg.coordinaten[0];
      writer.addText(point3d(x, y), tekstHoogte * 0.8, weg.naam, {
        layerName: DXF_LAGEN.wegen.naam,
      });
    }
  }

  // Bestaand net per KLIC-thema
  for (const net of input.bestaandNet ?? []) {
    if (net.coordinaten.length < 2) continue;
    const laag = BESTAAND_LAAG_PER_THEMA[net.thema];
    writer.addLWPolyline(naarVertices(net.coordinaten), { layerName: laag.naam });
    if (net.label) {
      const [x, y] = net.coordinaten[Math.floor(net.coordinaten.length / 2)];
      writer.addText(point3d(x, y), tekstHoogte * 0.8, net.label, {
        layerName: laag.naam,
      });
    }
  }

  // Ontwerptracé (centerline)
  if (input.centerline.length >= 2) {
    writer.addLWPolyline(naarVertices(input.centerline), {
      layerName: DXF_LAGEN.traceNieuw.naam,
    });
  }
  if (input.naam && input.centerline.length > 0) {
    const [x, y] = input.centerline[0];
    writer.addText(point3d(x, y + tekstHoogte * 1.5), tekstHoogte, input.naam, {
      layerName: DXF_LAGEN.annotatie.naam,
    });
  }

  // Kruisingen: cirkelmarkering + label
  for (const kruising of input.kruisingen ?? []) {
    const [x, y] = kruising.positie;
    writer.addCircle(point3d(x, y), tekstHoogte, {
      layerName: DXF_LAGEN.kruising.naam,
    });
    if (kruising.label) {
      writer.addText(point3d(x + tekstHoogte * 1.4, y), tekstHoogte * 0.8, kruising.label, {
        layerName: DXF_LAGEN.kruising.naam,
      });
    }
  }

  // Bemating: maatlijnen + maathulplijnen + boog + label op de annotatielaag
  for (const bemating of input.bematingen ?? []) {
    const geo = bematingGeometrie(bemating);
    const laag = DXF_LAGEN.annotatie.naam;
    if (geo.type === 'lineair') {
      writer.addLWPolyline(naarVertices([geo.maatlijn[0], geo.maatlijn[1]]), { layerName: laag });
      writer.addLWPolyline(naarVertices([geo.extensie1[0], geo.extensie1[1]]), { layerName: laag });
      writer.addLWPolyline(naarVertices([geo.extensie2[0], geo.extensie2[1]]), { layerName: laag });
      writer.addText(point3d(geo.tekstPos[0], geo.tekstPos[1]), tekstHoogte * 0.8, geo.label, {
        layerName: laag,
      });
    } else {
      writer.addLWPolyline(naarVertices(geo.boog), { layerName: laag });
      writer.addText(point3d(geo.tekstPos[0], geo.tekstPos[1]), tekstHoogte * 0.8, geo.label, {
        layerName: laag,
      });
    }
  }

  return writer.stringify();
}

/** Profielpunt: [kettingmaat in m, hoogte in m NAP]. */
export type ProfielPunt = [number, number];

/** Invoer voor het lengteprofiel-DXF. */
export interface LengteprofielDxfInput {
  /** Tracénaam/-code voor annotatie. */
  naam?: string;
  /** Maaiveldlijn: [chainage, hoogte NAP][] */
  maaiveld: ProfielPunt[];
  /** Kabel/leiding-as (ontwerpdiepte): [chainage, hoogte NAP][] */
  leidingAs: ProfielPunt[];
  /**
   * Verticale schaalfactor (overhoogte). Default 10× — gebruikelijk voor
   * lengteprofielen van ondergrondse infra.
   */
  verticaleSchaal?: number;
  /** Interval (m) voor chainagelabels. Default 100. */
  labelIntervalM?: number;
  /** Teksthoogte in meters (horizontale eenheden). Default 2. */
  tekstHoogteM?: number;
}

/**
 * Genereert een lengteprofiel-DXF: maaiveldlijn en kabel/leiding-as als
 * polylines (y = hoogte NAP × verticale schaalfactor, default 10×) met
 * chainagelabels per 100 m op een aparte annotatielaag.
 *
 * @returns DXF-bestand als string (writer.stringify()).
 */
export function generateLengthProfileDxf(input: LengteprofielDxfInput): string {
  const writer = new DxfWriter();
  writer.setUnits(Units.Meters);

  const vScale = input.verticaleSchaal ?? 10;
  const labelInterval = input.labelIntervalM ?? 100;
  const tekstHoogte = input.tekstHoogteM ?? 2;

  voegLaagToe(writer, DXF_LAGEN.lpMaaiveld);
  voegLaagToe(writer, DXF_LAGEN.lpLeidingAs);
  voegLaagToe(writer, DXF_LAGEN.annotatie);

  const naarProfielVertices = (punten: ProfielPunt[]): LWPolylineVertex[] =>
    punten.map(([chainage, z]) => ({ point: point2d(chainage, z * vScale) }));

  if (input.maaiveld.length >= 2) {
    writer.addLWPolyline(naarProfielVertices(input.maaiveld), {
      layerName: DXF_LAGEN.lpMaaiveld.naam,
    });
  }
  if (input.leidingAs.length >= 2) {
    writer.addLWPolyline(naarProfielVertices(input.leidingAs), {
      layerName: DXF_LAGEN.lpLeidingAs.naam,
    });
  }

  // Chainagelabels per labelinterval, onder het laagste profielpunt
  const allePunten = [...input.maaiveld, ...input.leidingAs];
  if (allePunten.length > 0) {
    const maxChainage = Math.max(...allePunten.map(([c]) => c));
    const minZ = Math.min(...allePunten.map(([, z]) => z));
    const labelY = minZ * vScale - tekstHoogte * 3;
    for (let c = 0; c <= maxChainage; c += labelInterval) {
      writer.addText(point3d(c, labelY), tekstHoogte, `${c} m`, {
        layerName: DXF_LAGEN.annotatie.naam,
      });
    }
  }

  if (input.naam) {
    const maxZ = allePunten.length ? Math.max(...allePunten.map(([, z]) => z)) : 0;
    writer.addText(
      point3d(0, maxZ * vScale + tekstHoogte * 3),
      tekstHoogte * 1.25,
      `Lengteprofiel ${input.naam} (vert. ${vScale}×)`,
      { layerName: DXF_LAGEN.annotatie.naam }
    );
  }

  return writer.stringify();
}

/* ───────────────────────── Dwarsprofiel (AVOI) ───────────────────────── */

export interface DwarsprofielDxfSlot {
  label: string;
  /** Horizontale afstand t.o.v. wegas (m, + = noord/links) */
  offsetM: number;
  /** Hoogte leiding-as in m NAP */
  diepteNap: number;
}

export interface DwarsprofielDxfInput {
  naam?: string;
  /** Breedte van het getekende profiel (m) */
  profielBreedteM: number;
  /** Maaiveldhoogte in m NAP (default 0) */
  maaiveldNap?: number;
  /** AVOI-ordening: kabels/leidingen met offset en diepte */
  slots: DwarsprofielDxfSlot[];
  /** Verticale schaalfactor (default 5×) */
  verticaleSchaal?: number;
  tekstHoogteM?: number;
}

/**
 * Dwarsprofiel-DXF conform AVOI-ordening: maaiveldlijn, wegas en per
 * kabel/leiding een cirkelsymbool met label op (offset, diepte × v-schaal).
 */
export function generateCrossSectionDxf(input: DwarsprofielDxfInput): string {
  const writer = new DxfWriter();
  writer.setUnits(Units.Meters);

  const vScale = input.verticaleSchaal ?? 5;
  const tekst = input.tekstHoogteM ?? 0.6;
  const maaiveld = (input.maaiveldNap ?? 0) * vScale;
  const halfBreedte = input.profielBreedteM / 2;

  voegLaagToe(writer, DXF_LAGEN.lpMaaiveld);
  voegLaagToe(writer, DXF_LAGEN.traceNieuw);
  voegLaagToe(writer, DXF_LAGEN.kruising);
  voegLaagToe(writer, DXF_LAGEN.annotatie);

  // Maaiveldlijn en wegas
  writer.addLWPolyline(
    [
      { point: point2d(-halfBreedte, maaiveld) },
      { point: point2d(halfBreedte, maaiveld) },
    ],
    { layerName: DXF_LAGEN.lpMaaiveld.naam }
  );
  writer.addLWPolyline(
    [
      { point: point2d(0, maaiveld + tekst * 2) },
      { point: point2d(0, maaiveld - 2 * vScale) },
    ],
    { layerName: DXF_LAGEN.kruising.naam }
  );
  writer.addText(point3d(0, maaiveld + tekst * 3), tekst, 'Wegas', {
    layerName: DXF_LAGEN.annotatie.naam,
  });

  for (const slot of input.slots) {
    const y = slot.diepteNap * vScale;
    writer.addCircle(point3d(slot.offsetM, y), 0.2 * vScale, {
      layerName: DXF_LAGEN.traceNieuw.naam,
    });
    writer.addText(
      point3d(slot.offsetM + 0.4, y - tekst / 2),
      tekst,
      `${slot.label} (${slot.offsetM >= 0 ? '+' : ''}${slot.offsetM.toFixed(1)} m, ${slot.diepteNap.toFixed(2)} NAP)`,
      { layerName: DXF_LAGEN.annotatie.naam }
    );
  }

  if (input.naam) {
    writer.addText(
      point3d(-halfBreedte, maaiveld + tekst * 5),
      tekst * 1.25,
      `Dwarsprofiel ${input.naam} (vert. ${vScale}×)`,
      { layerName: DXF_LAGEN.annotatie.naam }
    );
  }

  return writer.stringify();
}

/* ───────────────────────── Kruisingsdetail ───────────────────────── */

export interface KruisingDetailDxfInput {
  naam?: string;
  /** Dekking nieuwe leiding (m onder maaiveld) */
  dekkingM: number;
  /** Buitendiameter nieuwe leiding (mm, default 160) */
  diameterMm?: number;
  /** Diepte bestaande (gekruiste) leiding (m onder maaiveld, default 1.0) */
  bestaandeDiepteM?: number;
  /** Uitvoeringsmethode, bijv. "Nanodrill" — als annotatie */
  methodeLabel?: string;
  tekstHoogteM?: number;
}

/**
 * Kruisingsdetail-DXF: maaiveld, nieuwe leiding (met mantelbuis), bestaande
 * leiding en dekkingmaatvoering — schaal 1:1 in meters.
 */
export function generateCrossingDetailDxf(input: KruisingDetailDxfInput): string {
  const writer = new DxfWriter();
  writer.setUnits(Units.Meters);

  const tekst = input.tekstHoogteM ?? 0.12;
  const d = (input.diameterMm ?? 160) / 1000;
  const dekking = input.dekkingM;
  const bestaandDiep = input.bestaandeDiepteM ?? 1.0;
  const breed = 4;

  voegLaagToe(writer, DXF_LAGEN.lpMaaiveld);
  voegLaagToe(writer, DXF_LAGEN.traceNieuw);
  voegLaagToe(writer, DXF_LAGEN.bestaandOverig);
  voegLaagToe(writer, DXF_LAGEN.annotatie);

  // Maaiveld
  writer.addLWPolyline(
    [{ point: point2d(-breed / 2, 0) }, { point: point2d(breed / 2, 0) }],
    { layerName: DXF_LAGEN.lpMaaiveld.naam }
  );
  writer.addText(point3d(-breed / 2, tekst * 1.5), tekst, 'Maaiveld', {
    layerName: DXF_LAGEN.annotatie.naam,
  });

  // Nieuwe leiding + mantelbuis
  const yNieuw = -(dekking + d / 2);
  writer.addCircle(point3d(0, yNieuw), d / 2, { layerName: DXF_LAGEN.traceNieuw.naam });
  writer.addCircle(point3d(0, yNieuw), d / 2 + 0.05, { layerName: DXF_LAGEN.traceNieuw.naam });
  writer.addText(point3d(0.3, yNieuw), tekst, `Nieuwe leiding Ø${input.diameterMm ?? 160} mm in mantelbuis`, {
    layerName: DXF_LAGEN.annotatie.naam,
  });

  // Bestaande leiding (gekruist, haaks — symbool)
  writer.addCircle(point3d(-1, -bestaandDiep), 0.08, {
    layerName: DXF_LAGEN.bestaandOverig.naam,
  });
  writer.addText(point3d(-0.85, -bestaandDiep), tekst, 'Bestaande leiding', {
    layerName: DXF_LAGEN.annotatie.naam,
  });

  // Dekking-maatvoering
  writer.addLWPolyline(
    [{ point: point2d(0.9, 0) }, { point: point2d(0.9, yNieuw + d / 2) }],
    { layerName: DXF_LAGEN.annotatie.naam }
  );
  writer.addText(point3d(1.0, yNieuw / 2), tekst, `Dekking ${dekking.toFixed(2)} m`, {
    layerName: DXF_LAGEN.annotatie.naam,
  });

  if (input.naam || input.methodeLabel) {
    writer.addText(
      point3d(-breed / 2, tekst * 4),
      tekst * 1.25,
      `Kruisingsdetail ${input.naam ?? ''}${input.methodeLabel ? ` — ${input.methodeLabel}` : ''}`,
      { layerName: DXF_LAGEN.annotatie.naam }
    );
  }

  return writer.stringify();
}

/* ───────────────────────── Boorplan & boorprofiel ───────────────────────── */

export interface BoorplanDxfInput {
  naam?: string;
  /** Boorsegment-centerline in RD */
  centerline: RdPunt[];
  /** Startput: afmetingen (m) */
  entryPut: { l: number; b: number };
  /** Eindput: afmetingen (m) */
  exitPut: { l: number; b: number };
  tekstHoogteM?: number;
}

/** Boorplan-DXF (situatie): boorlijn met start- en eindput als contouren. */
export function generateBorePlanDxf(input: BoorplanDxfInput): string {
  const writer = new DxfWriter();
  writer.setUnits(Units.Meters);
  const tekst = input.tekstHoogteM ?? 2.5;

  voegLaagToe(writer, DXF_LAGEN.traceNieuw);
  voegLaagToe(writer, DXF_LAGEN.kruising);
  voegLaagToe(writer, DXF_LAGEN.annotatie);

  if (input.centerline.length >= 2) {
    writer.addLWPolyline(naarVertices(input.centerline), {
      layerName: DXF_LAGEN.traceNieuw.naam,
    });
  }

  const put = (punt: RdPunt, maat: { l: number; b: number }, label: string) => {
    const [x, y] = punt;
    writer.addLWPolyline(
      [
        { point: point2d(x - maat.l / 2, y - maat.b / 2) },
        { point: point2d(x + maat.l / 2, y - maat.b / 2) },
        { point: point2d(x + maat.l / 2, y + maat.b / 2) },
        { point: point2d(x - maat.l / 2, y + maat.b / 2) },
        { point: point2d(x - maat.l / 2, y - maat.b / 2) },
      ],
      { layerName: DXF_LAGEN.kruising.naam }
    );
    writer.addText(point3d(x, y + maat.b / 2 + tekst), tekst * 0.8, `${label} ${maat.l.toFixed(1)}×${maat.b.toFixed(1)} m`, {
      layerName: DXF_LAGEN.annotatie.naam,
    });
  };

  if (input.centerline.length >= 2) {
    put(input.centerline[0], input.entryPut, 'Startput');
    put(input.centerline[input.centerline.length - 1], input.exitPut, 'Eindput');
  }

  if (input.naam && input.centerline.length > 0) {
    const [x, y] = input.centerline[0];
    writer.addText(point3d(x, y - tekst * 3), tekst, `Boorplan ${input.naam}`, {
      layerName: DXF_LAGEN.annotatie.naam,
    });
  }

  return writer.stringify();
}

/* ───────────────────────── Werktekening (UO) ───────────────────────── */

export interface WerktekeningDxfInput {
  naam?: string;
  /** Ontwerptracé-centerlines in RD */
  centerlines: RdPunt[][];
  /** Moffen: positie in RD + korte code (M/EM/OM) + chainage (m) */
  moffen: { x: number; y: number; code: string; chainageM: number }[];
  /** Mantelbuizen: lijnstuk in RD + diameterlabel */
  mantelbuizen: { coordinaten: RdPunt[]; label: string }[];
  /** Stations: positie in RD + naam */
  stations: { x: number; y: number; naam: string }[];
  tekstHoogteM?: number;
}

/** Werktekening-DXF: tracé + moffen + mantelbuizen + stations op NLCS-lagen. */
export function generateWerktekeningDxf(input: WerktekeningDxfInput): string {
  const writer = new DxfWriter();
  writer.setUnits(Units.Meters);
  const tekst = input.tekstHoogteM ?? 2;

  voegLaagToe(writer, DXF_LAGEN.traceNieuw);
  voegLaagToe(writer, DXF_LAGEN.moffen);
  voegLaagToe(writer, DXF_LAGEN.mantelbuizen);
  voegLaagToe(writer, DXF_LAGEN.stations);
  voegLaagToe(writer, DXF_LAGEN.annotatie);

  for (const lijn of input.centerlines) {
    if (lijn.length >= 2) {
      writer.addLWPolyline(naarVertices(lijn), { layerName: DXF_LAGEN.traceNieuw.naam });
    }
  }

  for (const mof of input.moffen) {
    writer.addCircle(point3d(mof.x, mof.y), tekst * 0.6, {
      layerName: DXF_LAGEN.moffen.naam,
    });
    writer.addText(
      point3d(mof.x + tekst, mof.y + tekst * 0.5),
      tekst * 0.7,
      `${mof.code} ${(mof.chainageM / 1000).toFixed(3)}k`,
      { layerName: DXF_LAGEN.annotatie.naam },
    );
  }

  for (const mb of input.mantelbuizen) {
    if (mb.coordinaten.length >= 2) {
      writer.addLWPolyline(naarVertices(mb.coordinaten), {
        layerName: DXF_LAGEN.mantelbuizen.naam,
      });
      const [mx, my] = mb.coordinaten[Math.floor(mb.coordinaten.length / 2)];
      writer.addText(point3d(mx, my + tekst), tekst * 0.7, mb.label, {
        layerName: DXF_LAGEN.annotatie.naam,
      });
    }
  }

  for (const st of input.stations) {
    const h = tekst * 1.2;
    writer.addLWPolyline(
      [
        { point: point2d(st.x - h, st.y - h) },
        { point: point2d(st.x + h, st.y - h) },
        { point: point2d(st.x + h, st.y + h) },
        { point: point2d(st.x - h, st.y + h) },
        { point: point2d(st.x - h, st.y - h) },
      ],
      { layerName: DXF_LAGEN.stations.naam },
    );
    writer.addText(point3d(st.x, st.y - h - tekst), tekst * 0.8, st.naam, {
      layerName: DXF_LAGEN.annotatie.naam,
    });
  }

  if (input.naam && input.centerlines[0]?.length) {
    const [x, y] = input.centerlines[0][0];
    writer.addText(point3d(x, y + tekst * 3), tekst * 1.2, `Werktekening ${input.naam}`, {
      layerName: DXF_LAGEN.annotatie.naam,
    });
  }

  return writer.stringify();
}

export interface BoorprofielDxfInput {
  naam?: string;
  /** Maaiveldlijn: [chainage, m NAP][] */
  maaiveld: ProfielPunt[];
  /** Boorlijn (ontwerp): [chainage, m NAP][] */
  boorlijn: ProfielPunt[];
  /** Grondwaterstand in m NAP (optioneel) */
  grondwaterNap?: number;
  verticaleSchaal?: number;
  tekstHoogteM?: number;
}

/** Boorprofiel-DXF: maaiveld, boorlijn en grondwaterstand met overhoogte. */
export function generateBoreProfileDxf(input: BoorprofielDxfInput): string {
  const writer = new DxfWriter();
  writer.setUnits(Units.Meters);

  const vScale = input.verticaleSchaal ?? 10;
  const tekst = input.tekstHoogteM ?? 2;

  voegLaagToe(writer, DXF_LAGEN.lpMaaiveld);
  voegLaagToe(writer, DXF_LAGEN.lpLeidingAs);
  voegLaagToe(writer, DXF_LAGEN.bestaandWater);
  voegLaagToe(writer, DXF_LAGEN.annotatie);

  const profiel = (punten: ProfielPunt[]): LWPolylineVertex[] =>
    punten.map(([c, z]) => ({ point: point2d(c, z * vScale) }));

  if (input.maaiveld.length >= 2) {
    writer.addLWPolyline(profiel(input.maaiveld), { layerName: DXF_LAGEN.lpMaaiveld.naam });
  }
  if (input.boorlijn.length >= 2) {
    writer.addLWPolyline(profiel(input.boorlijn), { layerName: DXF_LAGEN.lpLeidingAs.naam });
  }

  const maxChainage = Math.max(...[...input.maaiveld, ...input.boorlijn].map(([c]) => c), 0);
  if (input.grondwaterNap !== undefined && maxChainage > 0) {
    writer.addLWPolyline(
      [
        { point: point2d(0, input.grondwaterNap * vScale) },
        { point: point2d(maxChainage, input.grondwaterNap * vScale) },
      ],
      { layerName: DXF_LAGEN.bestaandWater.naam }
    );
    writer.addText(
      point3d(0, input.grondwaterNap * vScale + tekst),
      tekst * 0.8,
      `Grondwater ${input.grondwaterNap.toFixed(2)} m NAP`,
      { layerName: DXF_LAGEN.annotatie.naam }
    );
  }

  if (input.naam) {
    const maxZ = Math.max(...[...input.maaiveld, ...input.boorlijn].map(([, z]) => z), 0);
    writer.addText(
      point3d(0, maxZ * vScale + tekst * 3),
      tekst * 1.25,
      `Boorprofiel ${input.naam} (vert. ${vScale}×)`,
      { layerName: DXF_LAGEN.annotatie.naam }
    );
  }

  return writer.stringify();
}
