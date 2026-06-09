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
