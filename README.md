# InfraEngine

Ontwerp- en procesondersteuningstool voor ondergrondse infrastructuur (kabels & leidingen).

## Fase 3 & 4 — Engineering, tekeningen & omgevingsproces

- **Berekeningen** per discipline (NEN 7171, 3650/3651, 1010, Hazen-Williams, etc.)
- **SVG-tekeningen**: tracé, lengteprofiel, dwarsprofiel, kruisingsdetail, station
- **Onderzoeken**: archeologie, bodem, NGE/CE, ecologie, K&L-inventarisatie
- **Aanvragen & vergunningchecklist** met conceptdocumenten
- **AI-assistentie** (OpenAI live of lokaal sjabloon)
- **React Flow** procesoverzicht per tracé
- **Dossier** met downloadbare documenten

## Fase 2 — GIS & toetsing

- **Gegevens verzamelen**: knop op trace-pagina roept alle connectors aan (QStash async indien geconfigureerd)
- **Toets tracé**: conflictdetectie (afstand, dekking, kruisingen) op kaart + lijst
- **Live PDOK/BRO**: zet `PDOK_FORCE_DEMO=false` en/of `BRO_FORCE_DEMO=false` in `.env.local`

## Fase 1 — Skelet & connector-kern

De app draait **volledig zonder credentials**. Alle databronnen leveren realistische voorbeelddata; live bronnen worden gemarkeerd met een `LIVE`-badge.

### Starten

```bash
npm install
cp .env.example .env.local   # vul DATABASE_URL in
npm run db:migrate           # schema + demo-seed naar Neon/PostGIS
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → dashboard met voorbeeldproject in Noordoostpolder.

### Optionele configuratie

Kopieer `.env.example` naar `.env.local` en vul naar wens aan:

| Variabele | Doel |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL + PostGIS |
| `CLERK_*` | Authenticatie |
| `OPENAI_API_KEY` | AI-assistentie (live) |
| `PDOK_FORCE_DEMO=false` | PDOK live (fase 2) |
| `BRO_FORCE_DEMO=false` | BRO live (fase 2) |

### Architectuur

- `/lib/connectors` — connector-abstractie met registry
- `/demo` — reproduceerbare voorbeelddatasets (seed 42)
- `/lib/db` — Drizzle schema + PostGIS migraties

### Voorbeeldproject

**Netverzwaring Noordoostpolder Oost** — 6 tracés (1 per discipline) met KLIC-netten, sonderingen en percelen.

## Roadmap

- **Fase 2**: GIS data verzamelen + toetsing (PDOK/BRO live, conflictdetectie)
- **Fase 3**: Engineering berekeningen + SVG-tekeningen
- **Fase 4**: Omgevingsproces, AI, React Flow dossier
