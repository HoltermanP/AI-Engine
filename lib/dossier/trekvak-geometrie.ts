/**
 * Trekvak-secties uit de werkelijke tracégeometrie: rechtstanden en bochten
 * worden afgeleid uit de richtingsveranderingen van de polyline, in plaats
 * van de vroegere aanname "90°/R6 bij elke wegnaamovergang".
 */

import type { TraceSectie } from '@/lib/calc/kabeltrek';

export interface SectieOpties {
  /** Richtingsverandering vanaf deze hoek telt als bocht (graden). */
  minHoekDeg?: number;
  /** Buigstraal die in het werk wordt aangehouden (m); min. kabelbuigradius. */
  bochtRadiusM?: number;
}

/**
 * Loop de polyline af en bouw de sectielijst in kabelvolgorde op:
 * recht → bocht (werkelijke hoek) → recht → … Knikken die elkaar binnen
 * 2 m opvolgen worden samengevoegd tot één bocht; knikken kleiner dan
 * `minHoekDeg` tellen als rechtstand.
 */
export function sectiesUitPolyline(
  line: [number, number, number?][],
  opties: SectieOpties = {},
): TraceSectie[] {
  const minHoek = opties.minHoekDeg ?? 15;
  const radius = opties.bochtRadiusM ?? 6;
  if (line.length < 2) return [];

  const secties: TraceSectie[] = [];
  let rechtLengte = 0;
  let openBochtHoek: number | null = null;
  let vorigeHeading: number | null = null;

  const emitBocht = () => {
    if (openBochtHoek !== null) {
      secties.push({
        type: 'bocht',
        hoekDeg: Math.round(Math.min(Math.abs(openBochtHoek), 180)),
        radiusM: radius,
      });
      openBochtHoek = null;
    }
  };
  const emitRecht = () => {
    if (rechtLengte > 0.5) {
      secties.push({ type: 'recht', lengteM: Math.round(rechtLengte * 10) / 10 });
    }
    rechtLengte = 0;
  };

  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const segLen = Math.hypot(bx - ax, by - ay);
    if (segLen < 0.01) continue;
    const heading = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;

    if (vorigeHeading !== null) {
      let delta = heading - vorigeHeading;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;

      if (Math.abs(delta) >= minHoek) {
        if (openBochtHoek !== null && rechtLengte <= 2) {
          // Knik direct na vorige knik: samenvoegen tot één bocht
          openBochtHoek += delta;
          rechtLengte = 0;
        } else {
          // Vorige bocht en de rechtstand erna afronden, nieuwe bocht openen
          emitBocht();
          emitRecht();
          openBochtHoek = delta;
        }
      }
    }

    rechtLengte += segLen;
    vorigeHeading = heading;
  }

  emitBocht();
  emitRecht();
  return secties;
}

/** Secties over meerdere tracélijnen (lijnen achter elkaar getrokken). */
export function sectiesUitTraceLines(
  traceLines: [number, number, number?][][],
  opties: SectieOpties = {},
): TraceSectie[] {
  return traceLines.flatMap((line) => sectiesUitPolyline(line, opties));
}
