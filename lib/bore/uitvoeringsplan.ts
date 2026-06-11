import type { DemoTrace } from '@/demo/traces';
import type { BoreEngineeringResult, BoreSegmentResult } from './types';

/**
 * Uitvoeringsplan voor sleufloze kruisingen (HDD/persing): fasering, boorplan
 * per segment, mudmanagement, keuringen en V&G-koppeling — conform
 * NEN 3650/3651 en de uitvoeringseisen van de beheerders.
 */
export function buildBoorUitvoeringsplan(
  trace: DemoTrace,
  result: BoreEngineeringResult
): string {
  const segmenten = result.segmenten;
  if (segmenten.length === 0) {
    return `# Uitvoeringsplan boringen — ${trace.code}\n\nGeen sleufloze segmenten in dit tracé.`;
  }

  const segmentBlok = (s: BoreSegmentResult): string => {
    const t = s.boorplan.trajectory;
    const trekkracht = s.berekeningen.find((b) => b.type.includes('trek'));
    const mud = s.berekeningen.find((b) => b.type.includes('mud') || b.type.includes('spoel'));
    return `## Segment S${s.volgorde} — ${s.label}

**Boorplan:** ${s.boorplan.samenvatting}

| Parameter | Waarde |
|---|---|
| Boogtraject | ${t.booglengteM.toFixed(0)} m · R = ${t.boogstraalM.toFixed(0)} m |
| In-/uittredehoek | ${t.entryAngleDeg.toFixed(0)}° / ${t.exitAngleDeg.toFixed(0)}° |
| Maximale diepte | ${t.maxDiepteNap.toFixed(2)} m NAP |
| Startput | ${t.entryPutL.toFixed(1)} × ${t.entryPutB.toFixed(1)} × ${t.entryPutD.toFixed(1)} m |
| Eindput | ${t.exitPutL.toFixed(1)} × ${t.exitPutB.toFixed(1)} × ${t.exitPutD.toFixed(1)} m |
${trekkracht ? `| Maatgevende trekkracht | ${trekkracht.conclusie} |\n` : ''}${mud ? `| Mud/spoeldruk | ${mud.conclusie} |\n` : ''}
**Uitvoeringsvolgorde**

${s.boorplan.uitvoeringsvolgorde.map((stap, i) => `${i + 1}. ${stap}`).join('\n')}

**Risico's en beheersmaatregelen**

${s.boorplan.risicos.map((r, i) => `- Risico: ${r}\n  - Maatregel: ${s.boorplan.maatregelen[i] ?? s.boorplan.maatregelen[0] ?? 'zie V&G-plan'}`).join('\n')}

**Sonderingen:** ${s.boorplan.sonderingRefs.join(', ') || 'n.v.t.'}
`;
  };

  return `# Uitvoeringsplan boringen — ${trace.code}

**Tracé:** ${trace.naam}
**Norm/richtlijn:** NEN 3650/3651 · richtlijn boortechnieken (NSTT) · V&G-plan ontwerpfase

## 1. Algemene fasering

1. Werkvoorbereiding: KLIC-melding actualiseren, proefsleuven bij kruisende K&L, werkterrein inrichten conform booropstellingtekening
2. Aanleg start- en eindput inclusief bemaling waar nodig
3. Pilotboring volgens ontwerpprofiel (gestuurde registratie, terugkoppeling per boorstang)
4. Ruimen in passen tot ontwerpdiameter
5. Intrekken productleiding vanaf de pijpenbaan (trekkrachtbewaking, max. conform berekening)
6. Afwerken: putten aanvullen, terreinherstel, revisiemeting (as-built)

## 2. Mudmanagement

- Spoeldruk bewaken onder de maximaal toelaatbare mudspanning per berekening (blow-out-preventie, Luger & Hergarden)
- Retourspoeling recyclen; afvoer conform BRL SIKB en afspraken bevoegd gezag
- Bij mudverlies: direct stoppen, situatie beoordelen, maatregelen conform boorplan

## 3. Keuringen en bewaking

- Vooraf: goedgekeurd boorplan, geldige berekeningen (trekkracht, sterkte, mudspanning, zetting)
- Tijdens: registratie boorparameters per stang, trekkrachtbewaking bij intrekken
- Na afloop: revisiemeting en as-built-verwerking in het dossier

${segmenten.map(segmentBlok).join('\n')}

## V&G

Dit uitvoeringsplan hoort bij het V&G-plan ontwerpfase van het project; de daarin
benoemde risico's en maatregelen gelden onverkort op het boorterrein.
`;
}
