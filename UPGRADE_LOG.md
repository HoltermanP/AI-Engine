# UPGRADE_LOG — nachtrun 2026-06-09

## Statusregels (per uur)
- 00:00 (start) — Audit afgerond, AUDIT.md + PLAN.md geschreven. Baseline: build groen, tsc groen. Volgende: vitest-setup + normenconfig + fasemodel.

## Keuzes & aannames
1. **Geen DB-schema-migraties**: `DATABASE_URL` kan naar een gedeelde Neon-instantie wijzen; de app draait primair op de in-memory demo-store. Nieuwe functionaliteit volgt dat bestaande patroon (pure engine-modules + server actions + demo-store). *Alternatief*: aparte Neon dev-branch aanmaken — vereist Neon API-toegang die niet beschikbaar/verifieerbaar is vannacht.
2. **Vitest** als testframework (standaard in Next.js-ecosysteem, snel, TS-native). *Alternatief*: Jest — zwaarder, traag met ESM. Bestaande tsx-validatiescripts blijven werken.
3. **DXF via `@tarikjabiri/dxf`** (TypeScript-native, geen Python-service nodig, past in de bestaande Node-stack). *Alternatief*: ezdxf via Python-microservice — extra runtime, niet passend bij Vercel-deploy.
4. Berekeningsformules gedocumenteerd in code-comments met normverwijzing; vereenvoudigingen expliciet gemarkeerd ("indicatief").

## BLOCKERS
(nog geen)

## Open / vervolgstappen
(wordt aan het eind ingevuld)
