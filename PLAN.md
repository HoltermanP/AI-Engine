# PLAN — nachtrun upgrade (prioriteit bij tijdgebrek: 2 → 3 → 4 → 6 → 5 → 7 → 9 → 8)

## P0 — Fundament
- [ ] Vitest-setup + eerste tests draaien (`npm test`)
- [ ] `lib/normen.ts`: centrale normenconfig (norm + versie + omschrijving), gebruikt in alle nieuwe modules
- [ ] Documentcodering-helper `[PROJECT]-[FASE]-[TYPE]-[VOLGNR]-[VERSIE]` (`lib/dossier/doc-code.ts`)
- [ ] Baseline-commit

## P1 — Kernproces
- [ ] **Fasemodel uitbreiden**: 6 projectfasen (verkenning, VO, DO, UO, werkvoorbereiding, uitvoering/as-built) met deliverables-registry per fase + status (concept/in_review/definitief) — `lib/process/fasen.ts`
- [ ] Fase-stepper UI op projectniveau met deliverable-status per fase
- [ ] **Afwegingsmatrix (MCA)**: lengte, #boringen, #kruisingen, bodemrisico, vergunningen, kosten-indicatie, omgevingshinder → scores + gewogen advies — `lib/services/afwegingsmatrix.ts` + tests + UI in auto-trace-panel
- [ ] **Uitgangspuntennotitie**: deterministisch gegenereerd uit tracé-parameters (normen, dekking, parallelafstanden, kruisingsmethoden) — `lib/dossier/uitgangspunten.ts` + UI/download

## P2 — Berekeningen (hart van de upgrade)
- [ ] **HDD-uitbreiding** (`lib/bore/`): mudspanning/blow-out (Delftse vergelijking: min. mudbruk vs. max. grenswaarde per punt), sterktecontrole buis (ringstijfheid/buckling + axiale spanning + combinatie), zettingsindicatie — met unit tests tegen handberekening
- [ ] **Trekkracht HDD verbeteren**: faseweise berekening (intrekken in boorgat met opdrijving/mud) cf. NEN 3650-benadering
- [ ] **Kabeltrekberekening** (`lib/calc/kabeltrek.ts`): trekkracht per sectie + zijwaartse druk (SWP) in bochten, toelaatbare waarden per kabeltype, advies trekrichting — met tests
- [ ] **Thermische berekening IEC 60287** (`lib/calc/thermisch.ts`): ampacity uit bodemwarmteweerstand, legpatroon, bundeling — met tests tegen referentiewaarde
- [ ] **Zettingsberekening** (indicatief, Koppejan-achtig voor veen/klei) — `lib/calc/zetting.ts` + tests
- [ ] Berekeningen gekoppeld aan fase + opslag via bestaand `berekening`-patroon

## P2 — Calculatie & materiaallijst
- [ ] **Materiaallijst (BOM)** (`lib/calculatie/materiaal.ts`): kabel/buis per haspel incl. snijverlies, moffen, mantelbuizen, zand, lint, afdekplaten — Excel-export
- [ ] Calculatie-niveau per fase: raming ±30% (VO), budget ±15% (DO), inschrijfbegroting (UO)

## P2 — Tekeningen
- [ ] **DXF-export** via `@tarikjabiri/dxf` (`lib/drawings/dxf.ts`): tracé-plan + lengteprofiel + dwarsprofiel met NLCS-laagnamen — gevalideerd met tests (entiteiten/lagen aanwezig)
- [ ] **NLCS-titelblok** op SVG-tekeningen (projectnaam, tekeningnummer/doc-code, schaal, status, versie, datum, getekend/gecontroleerd)
- [ ] DWG-conversie als configureerbare integratie-interface (alleen interface, geen licentie-afhankelijke conversie)

## P3 — Planning
- [ ] Kritiek pad (CPM) in planning-engine + markering in Gantt
- [ ] Vergunningenplanning met wettelijke termijnen (Omgevingswet: reguliere 8 wkn / uitgebreide 26 wkn)

## P3 — Uitvoeringsdocumenten
- [ ] **Kabeltrekplan** per trekvak: treklengte, richting, haspel/lier-opstelplaats, berekend vs. toelaatbaar, rollenplan — gegenereerd document (PDF-tauglijke markdown/dossier-patroon)
- [ ] **Proefsleuvenplan**: voorgestelde locaties op basis van KLIC-dichtheid + kruisingen (CROW 500) — kaartlaag + tabel + document
- [ ] **V&G-plan ontwerpfase**: template gevuld met projectrisico's uit quick scans

## P3 — Rapportage & polish
- [ ] Documentcodes door alle gegenereerde documenten heen
- [ ] Normversie-vermelding in alle norm-gebaseerde output (uit `lib/normen.ts`)
- [ ] UI-polish: deliverable-dashboard per project, statuskleuren consistent
- [ ] README + .env.example actueel

## Eindsprint (laatste 30 min)
- [ ] Build groen + alle tests groen
- [ ] UPGRADE_LOG.md compleet (klaar / blockers / vervolgstappen)
- [ ] `chore: nachtrun afgerond` commit
