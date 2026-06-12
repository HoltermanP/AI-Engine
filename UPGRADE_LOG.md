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

- +2:00 — UI-integratie: fase-stepper + deliverables-overzicht op projectpagina, afwegingsmatrix in auto-trace-panel, WVB-documentenpanel (uitgangspunten/proefsleuven/V&G/kabeltrekplan → PDF/Word) in de dossier-fase, export-API (DXF + materiaallijst-Excel). Vergunningenplanning (Omgevingswet-termijnen) en gefaseerde HDD-trekkracht (ASTM F1962) toegevoegd. Twee pre-existing lint-blockers gefixt.
- Eindsprint — Build groen (exit 0), 117 vitest-tests groen, alle 6 validatiescripts groen. Slotcommit gezet.

## EINDSTAND

### Wat is klaar
1. **Procesmodel**: 6 projectfasen (Verkenning → VO → DO → UO → WVB → Uitvoering/As-built) met deliverables-registry, statuslogica en fase-stepper + deliverables-dashboard op de projectpagina.
2. **Tracé-ontwerp**: afwegingsmatrix (7 gewogen criteria, advies met motivatie) in de UI bij ≥2 route-alternatieven; deterministische uitgangspuntennotitie met normen per discipline en parallelafstandentabel (NEN 7171-1).
3. **Boorengineering**: mudspanning/blow-out per punt (Luger & Hergarden cavity-expansie, NEN 3650-1), sterktecontrole buis (buckling + unity check), zettingstrog boven boring, gefaseerde intrekkracht (ASTM F1962 met opdrijving in mud) — alle in de bore-engine geïntegreerd met normvermelding.
4. **Berekeningen**: kabeltrek (capstan + SWP, beide richtingen, richtingsadvies + tussentrekput-locatie), thermisch IEC 60287 (gevalideerd referentiegeval 441 A), sleufzetting (CR-methode veen/klei).
5. **Tekeningen**: DXF-export (tracé + lengteprofiel) met NLCS 5.0-laagnamen en IMKL-kleuren; NLCS-titelblok op alle SVG-tekeningen met doc-code; DWG-conversie-koppelvlak (env `DWG_CONVERTER_URL`).
6. **Calculatie**: materiaallijst (haspels, snijverlies, moffen, mantelbuizen, bedding, afdekking) met Excel-export; calculatieniveaus per fase (±30/±15/±5%).
7. **Planning**: echt kritiek pad (CPM backward-pass) i.p.v. naïeve keten; vergunningafleiding met wettelijke Omgevingswet-termijnen en kritieke vergunningendoorlooptijd.
8. **Uitvoeringsdocumenten**: kabeltrekplan (trekvakken, haspel/lier-opstelplaatsen, rollenplan, communicatieplan), proefsleuvenplan (CROW 500: kruisingen + parallelligging + boorpunten, samenvoeging < 25 m), V&G-plan ontwerpfase (risico's uit quick scans) — allemaal genereerbaar vanuit het documenten-panel met PDF/Word-download.
9. **Fundament**: centrale normenconfig (lib/normen.ts), documentcodering [PROJECT]-[FASE]-[TYPE]-[VOLGNR]-[VERSIE], vitest-suite (117 tests), export-API.

### BLOCKERS
1. **UI-agent sessielimiet**: de tweede UI-agent viel halverwege uit; ontbrekende onderdelen (export-route, documenten-panel, panel-integratie) zijn handmatig afgemaakt. Geen openstaand gevolg.
2. **Build-lint**: `next build` bleek pre-existing lint-errors te bevatten die door cache-invalidatie zichtbaar werden (lib/db/store.ts `useDatabase`-naamgeving, prefer-const in gpkg-geometry). Gefixt (hernoemd naar `databaseActief`).
3. **Geen DB-migraties uitgevoerd** (bewust): deliverable-statussen worden afgeleid uit tracé-fasen i.p.v. geregistreerd. Zie vervolgstappen.

### Aanbevolen vervolgstappen
1. **Statusregistratie deliverables** in de database (tabel `deliverable_status`) + handmatige status-overrides in de UI; de afleiding in lib/process/deliverable-status.ts is daarvoor voorbereid.
2. **Berekeningen koppelen aan fase + versionering** via het bestaande `berekening`-patroon (invoer/resultaat/normReferentie zit al in de modules; alleen opslag + UI-historie ontbreekt).
3. **Vergunningenplanning in de Gantt**: deriveVergunningen → planningactiviteiten met termijnen als duur (engine + tests staan klaar in lib/planning/vergunningen.ts).
4. **Kabeltrekplan-trekvakken uit werkelijke geometrie**: bochten worden nu vereenvoudigd afgeleid (90°/R6 tussen wegsegmenten); beter: hoeken uit de tracé-polyline berekenen.
5. **Lengteprofiel-DXF aansluiten op maaiveld-data** (AHN) en dwarsprofielen in DXF.
6. **Thermische berekening in de UI** ontsluiten (module + tests bestaan; nog geen paneel).
7. **GEF-upload** voor sonderingen (parser ontbreekt; BRO-demo-CPT's werken al in het boorprofiel).
8. **Echte multi-tenant row-scoping** zodra Clerk-organisaties actief worden gebruikt.

## Nachtrun 2026-06-11/12 — Netontwerp-tekentool (elektra LS/MS) + boortekening-fix

### Gebouwd
1. **Boortekeningen gerepareerd** (gemeld door gebruiker): boorprofiel had een V-vorm tot −6,9 m NAP (Bézier naar het midden zonder horizontaal deel) en het boorplan tekende diepte als zijwaartse boog in bovenaanzicht. Nu: echte HDD-profielgeometrie (insteektangent → boog R → horizontaal op ontwerpdiepte → boog → uittredetangent) in `lib/drawings/bore-profile.ts` (`boreProfilePoints`, hergebruikt door de DXF-export), ontwerpdiepte uit vereiste dekking + methode-marge (`maxDiepteNap` in lib/bore/formulas.ts), booglengte uit werkelijke hoeken i.p.v. 2×90°, BorePlan draagt nu lengteM/maaiveld/grondwater/dekking (geen regex-parsing meer), dubbele "Schaal"-tekst weg.
2. **Netontwerp-werkruimte** `/project/[id]/netontwerp` met 6 stappen volgens Liander-proces: belastingen & uitgangspunten → tracé schetsen → kabelberekening → stations & netopbouw → stationsontwerp → werktekening & uitvoering. Stap-navigatie met afgeleide statussen (lib/netontwerp/stappen.ts), deep-link `?stap=`.
3. **Domeinlaag** lib/netontwerp/: types (Netontwerp, NetontwerpAsset met punt/chainage/chainagebereik-binding, Aansluiting, KabelKeuze, StationOntwerp), kabel-catalogus (16 LS/MS-specs, parse.ts-compatibele labels, `vindKabelAdvies` op spanningsval+belastbaarheid), chainage-wiskunde (punt↔metrering, snapping), belastingen (gelijktijdigheid per afnemertype, max stranglengte uit omgekeerde spanningsvalformule), stations-advies (belasting-gewogen k-means + N-1 + snap op MS-tracé), moffen-advies (haspellengte + eindmoffen + overgangsmof GPLK↔XLPE; mantelbuizen uit kruisingen), station-ontwerp (RMU-velden, trafokeuze, NH-zekeringen per LS-groep).
4. **Kaart**: TraceMap-extensie (assets-source + 3 lagen + plaatsmodus + asset-klik, alles optioneel), lib/map/netontwerp-assets.ts (chainage→RD→WGS84), assetpalet, klik-plaatsing (station vrij punt, mof snapt op tracé), asset-selectie + verwijderen via kaartklik, aansluitingen als belastingpunten op de kaart.
5. **Nieuwe strengen**: `maakNieuwTraceAction` + demo-store `addDemoTrace` — netarchitect kan nieuwe LS/MS-tracés aanmaken en schetsen; ze doen mee in de volledige bestaande keten.
6. **Tekeningen**: eenlijnschema (MS-rail/lastscheiders/trafoveld/trafo/LS-rail/groepen, IEC 60617-stijl symbolen), stationsplattegrond (datagedreven binnenmaten), werktekening UO (mofsymbolen + chainagelabels + mantelbuizen + stations op BGT-achtergrond). DrawingType + structuur-eisen + doc-prefixen uitgebreid (TK-EEN/TK-SPL/TK-WRK).
7. **Export**: DXF-variant `werktekening` (NLCS-lagen KR-NIEUW WERK-MOFFEN/-MANTELBUIS/-STATION), materiaallijst gebruikt werkelijke mofaantallen uit het netontwerp (heuristiek blijft fallback), stationspost 07.03.x in de projectcalculatie.
8. **parseNetType** herkent nu 3x1x###/1x###-secties (repareert ook bestaande KLIC-labels als "10kV XLPE 1x240").
9. **calc/stations.ts**: echte inputs (totaalKVA/aantal/trafoKVA/N-1) met demo-fallback.
10. **Tests**: 160 totaal (was 136) — chainage round-trip, belastingen, kabeladvies, stationsclustering, boorprofielgeometrie, tekeningen, end-to-end ontwerpflow (lib/actions/netontwerp.test.ts). Browser-smoke (Playwright + Chrome) op stap 1/3/4 + nieuwe streng: geen consolefouten.

### Let op
- `npm run build` tijdens een draaiende dev-server sloopt `.next` → dev-server herstarten na een build.

### Open
- Asset-verslepen (drag) op de kaart; nu verwijderen + opnieuw plaatsen.
- MS-ringstructuur (meerdere stations in één ring doorverbinden) is nog niet gemodelleerd; eenlijnschema gaat uit van ring-in/ring-uit per station.
- Netontwerp-deliverables koppelen aan dossier/doc-codes.

### Nachtrun-vervolg (batch 3, afgerond 06:36)
- **Asset-drag op de kaart**: stations vrij verslepen, moffen blijven op hun tracé gesnapt (re-snap naar chainage); zelfde interactiepatroon als de bestaande vertex-drag (TraceMap `onAssetVerplaats`, alleen actief buiten de teken-stap).
- **Dossier-koppeling**: stationsontwerp-tekeningen (eenlijn + plattegrond) en werktekeningen worden bij generatie geregistreerd in het projectdossier (`saveTekeningenToDossier`).
- **IEC 60287 in de UI** (batch 2): vol thermisch model als extra berekening bij elke MS-kabelkeuze; MS-ringvolgorde langs het tracé in stap 4.
- Browser-regressie volledige flow stap 3→6 (kabel kiezen → stations overnemen → eenlijn/plattegrond → moffen → werktekening): geen consolefouten.
