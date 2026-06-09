# AUDIT — InfraEngine (nachtrun 2026-06-09)

Baseline: commit `c6f58d1`, build groen, `tsc --noEmit` groen, working tree schoon.

## Stack (bevestigd)
Next.js 15 (App Router, turbopack-build), Drizzle + Neon/PostGIS, Clerk (optioneel, demo-fallback), Upstash QStash, MapLibre GL, proj4 (RD New ↔ WGS84), ExcelJS, docx, jsPDF, Anthropic/OpenAI SDK. **Data draait primair op in-memory demo-store** (`lib/db/demo-store.ts`) met seed-data uit `/demo`; Neon/PostGIS is optioneel pad (`lib/db/*`).

## Wat bestaat en werkt
- **Tracé-routing**: echt A*-pathfinding over wegen-graaf met kostenfactoren (KLIC/AVOI-afstand, bebouwing, water, privégrond) — `lib/services/trace-routing/road-graph.ts` (A*, edgeCost), `plan.ts` (graafopbouw, voorkeurs + 2 alternatieven). Handmatig tekenen/bewerken: `lib/trace-edit.ts`.
- **Conflictdetectie** (afstand, dekking, verboden zones, eigendom, bodemrisico): `lib/services/conflict-detection.ts` + UI in `trace-fase2-panel.tsx`.
- **HDD/bore-engineering basis**: traject, vereenvoudigde trekkracht, putafmetingen, bentonietvolume (`lib/bore/*`). Validatie via `npm run bore:validate`.
- **Berekeningen per discipline** (`lib/calc/*`): elektra LS/MS, gas HD/LD, water, algemeen — met `calc:validate`.
- **SVG-tekeningen**: tracé-plan, lengteprofiel, dwarsprofiel, kruisingsdetail, boorprofiel/-plan, station (`lib/drawings/*`), NLCS-lijnstijlen in `nlcs.ts`.
- **Calculatie** RAW-achtige posten + ExcelJS-export (`lib/calculatie/*`).
- **Planning**: activiteiten/milestones/Gantt (`lib/planning/*`, `planning-gantt-chart.tsx`).
- **Rapportages**: quick-scan-achtige onderzoeken (bodem, archeologie, ecologie, NGE, KLIC, Natura2000) als templates + AI-refinement (`demo/reports/*`, `lib/research/*`).
- **Connectors-registry** met demo/live-toggle per bron (PDOK, BRO, KLIC, waterschap, Mapillary) — `lib/connectors/*`.
- **Geo**: RD New (EPSG:28992) ↔ WGS84 via proj4 (`lib/geo.ts`).

## Half af
| Onderdeel | Status |
|---|---|
| Fasemodel | Alleen `VO/DO/UO/as_built` op tracé-niveau; geen Verkenning/WVB/Uitvoering, geen deliverables-status per fase |
| Afwegingsmatrix | Conflictdetectie bestaat; geen multicriteria-matrix met scores en advies |
| Uitgangspuntennotitie | AI-template, niet gestructureerd/deterministisch gegenereerd uit tracé-parameters |
| NLCS-titelblok | Lijnstijlen gedefinieerd; geen titelblok-rendering op tekeningen |
| Materiaallijst | Impliciet in calculatie; geen aparte BOM met haspels/snijverlies |
| Planning | Gantt zonder kritiek pad |
| Multi-tenant | FK-gebaseerd; demo-mode single-tenant |
| Kabeltrek | Alleen binnen HDD; geen tracé-brede trekberekening met bochten/SWP |

## Ontbreekt volledig
1. **Mudspanning/blow-out check** (Delftse vergelijking) — NEN 3650/3651
2. **Sterktecontrole buis** (ringstijfheid, axiaal, combinatie)
3. **Thermische berekening / ampacity IEC 60287**
4. **Zettingsindicatie** (veen/klei)
5. **DXF-export** (alleen SVG/PDF)
6. **Kabeltrekberekening over tracé** (trekkracht + SWP per bocht, trekrichting-advies)
7. **Kabeltrekplan, proefsleuvenplan, V&G-plan** als documenten
8. **Documentcodering** `[PROJECT]-[FASE]-[TYPE]-[VOLGNR]-[VERSIE]`
9. **Centrale normenconfig** (`lib/normen.ts`)
10. **Unit-test-framework** (alleen tsx-validatiescripts)

## Risico's / aannames
- `DATABASE_URL` in `.env.local` wijst mogelijk naar gedeelde Neon-instantie → **geen schema-migraties deze nacht**; nieuwe functionaliteit via demo-store/metadata-patroon (app-conventie).
- KLIC live vereist PKI-certificaat → demo-data blijft primair, gemarkeerd in UI.
