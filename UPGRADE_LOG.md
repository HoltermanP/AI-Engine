# UPGRADE_LOG — nachtrun 2026-06-09

## Statusregels (per uur)
- 00:00 (start) — Audit afgerond, AUDIT.md + PLAN.md geschreven. Baseline: build groen, tsc groen. Volgende: vitest-setup + normenconfig + fasemodel.
- +1:00 — P0 + P1-engines klaar (fasemodel, afwegingsmatrix, uitgangspuntennotitie). Drie parallelle bouwlijnen afgerond: HDD-uitbreiding (mud/blow-out, sterkte, zetting), kabeltrek + thermisch IEC 60287 + sleufzetting, DXF-export + NLCS-titelblok. Materiaallijst, CPM-kritiek-pad, proefsleuvenplan, V&G-plan, kabeltrekplan gebouwd. 114 tests groen. Volgende: UI-integratie (fase-stepper + documenten-panel).

## Keuzes & aannames
1. **Geen DB-schema-migraties**: `DATABASE_URL` kan naar een gedeelde Neon-instantie wijzen; de app draait primair op de in-memory demo-store. Nieuwe functionaliteit volgt dat bestaande patroon (pure engine-modules + server actions + demo-store). *Alternatief*: aparte Neon dev-branch aanmaken — vereist Neon API-toegang die niet beschikbaar/verifieerbaar is vannacht.
2. **Vitest** als testframework (standaard in Next.js-ecosysteem, snel, TS-native). *Alternatief*: Jest — zwaarder, traag met ESM. Bestaande tsx-validatiescripts blijven werken.
3. **DXF via `@tarikjabiri/dxf`** (TypeScript-native, geen Python-service nodig, past in de bestaande Node-stack). *Alternatief*: ezdxf via Python-microservice — extra runtime, niet passend bij Vercel-deploy.
4. Berekeningsformules gedocumenteerd in code-comments met normverwijzing; vereenvoudigingen expliciet gemarkeerd ("indicatief").
5. **HDD blow-out**: volledige Luger & Hergarden (1988) cavity-expansieformule ("Delftse vergelijking", NEN 3650-1) i.p.v. simpele f-factor; partiële factor 1,5 op p_max; grondparameters karakteristiek per grondsoort (zand φ=32,5°, klei φ=22,5°/c=10 kPa, veen φ=15°/c=5 kPa); punten met dekking < 1,0 m (in-/uittredezone) niet getoetst; circulatieverlies 10 kPa + 0,05 kPa/m (ingenieursaanname).
6. **Sterkte buis**: getoetst als PE100 SDR11 (E-kort 1100 MPa); buckling Timoshenko `p_cr = 2E/(1−ν²)·(1/(SDR−1))³` (geverifieerd: SDR11 → 2,62 MPa), SF ≥ 2,0; unity check trek+buiging ≤ 1,0 bij σ_toel 12 MPa kortdurend.
7. **Zetting boring**: volumeverlies-methode Peck/O'Reilly & New (V_loss 1–3% per grondsoort); sleufzetting: CR-methode (NL-praktijkwaarden vgl. NEN 9997-1: veen CR=0,20, klei 0,075). Beide indicatief — geen vervanging van geotechnisch advies.
8. **Kabeltrek**: capstanvergelijking, horizontaal tracé aangenomen (geen hellingen); SWP-grens default 3 kN/m (MS); max trekkracht 50 N/mm² × Cu-doorsnede aan trekkous of fabrikantopgave.
9. **Thermisch IEC 60287**: W_d = 0 voor ≤ 20 kV, λ1=λ2=0 (single-point bonding), driehoek op uniforme diepte, geen bodemuitdroging gemodelleerd. Referentiegeval 10 kV 3×1×240 Al² XLPE driehoek ρ=1,0 → 441 A, in test vastgelegd.
10. **DXF**: nieuw tracé krijgt laag `KR-NIEUW WERK-K_OS-MS`; lengteprofiel verticaal 10×; titelblok als extra strook onder bestaande A3-layout; DWG-conversie alleen als koppelvlak (env `DWG_CONVERTER_URL`).
11. **Proefsleuven**: zorgvuldigheidszone 1,5 m + liggingsonzekerheidsbuffer; locaties < 25 m samengevoegd; in-/uittredepunten boringen altijd vrijgraven (CROW 500).
12. **Materiaallijst**: snijverlies 5% + 5 m per uiteinde; haspels MS 1000 m / LS 500 m; mantelbuis ≥ 1,5× productdiameter; zandbed 0,2 m³/m.
13. **Deliverable-status**: afgeleid uit tracé-fase (eerdere fasen definitief, huidige concept) totdat echte statusregistratie in de database bestaat.

## BLOCKERS
(nog geen)

## Open / vervolgstappen
(wordt aan het eind ingevuld)
