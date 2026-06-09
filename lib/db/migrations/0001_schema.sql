-- Volledig schema (PostGIS vereist)

CREATE TABLE IF NOT EXISTS organisatie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  naam TEXT NOT NULL,
  clerk_org_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gebruiker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  organisatie_id UUID REFERENCES organisatie(id),
  naam TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'gebruiker',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  organisatie_id UUID NOT NULL REFERENCES organisatie(id),
  naam TEXT NOT NULL,
  omschrijving TEXT,
  status TEXT NOT NULL DEFAULT 'actief',
  gebied TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  project_id UUID NOT NULL REFERENCES project(id),
  code TEXT NOT NULL,
  naam TEXT NOT NULL,
  discipline TEXT NOT NULL,
  net_type TEXT,
  fase TEXT NOT NULL DEFAULT 'VO',
  vereiste_dekking REAL NOT NULL DEFAULT 0.6,
  geom GEOMETRY,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trace_segment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES trace(id),
  volgorde INTEGER NOT NULL,
  legtechniek TEXT NOT NULL,
  lengte_m REAL,
  geom GEOMETRY
);

CREATE TABLE IF NOT EXISTS databron (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID REFERENCES trace(id),
  bron TEXT NOT NULL,
  leverancier TEXT,
  versie TEXT,
  opgehaald_op TIMESTAMP DEFAULT NOW(),
  kwaliteit TEXT,
  _source TEXT NOT NULL DEFAULT 'demo'
);

CREATE TABLE IF NOT EXISTS bestaand_net (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  trace_id UUID REFERENCES trace(id),
  thema TEXT NOT NULL,
  beheerder TEXT NOT NULL,
  spanning_of_diameter TEXT,
  materiaal TEXT,
  nauwkeurigheid TEXT NOT NULL,
  diepte REAL,
  vrij_te_houden_afstand REAL,
  geom GEOMETRY,
  _source TEXT NOT NULL DEFAULT 'demo'
);

CREATE TABLE IF NOT EXISTS maaiveld (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES trace(id),
  chainage REAL NOT NULL,
  hoogte_nap REAL NOT NULL,
  geom GEOMETRY,
  _source TEXT NOT NULL DEFAULT 'demo'
);

CREATE TABLE IF NOT EXISTS sondering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID REFERENCES trace(id),
  qc REAL,
  grondsoort TEXT,
  diepte REAL,
  geom GEOMETRY,
  _source TEXT NOT NULL DEFAULT 'demo'
);

CREATE TABLE IF NOT EXISTS bodemlaag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sondering_id UUID NOT NULL REFERENCES sondering(id),
  van_m REAL NOT NULL,
  tot_m REAL NOT NULL,
  grondsoort TEXT NOT NULL,
  qc REAL
);

CREATE TABLE IF NOT EXISTS grondwater (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID REFERENCES trace(id),
  stand_nap REAL NOT NULL,
  meetdatum TEXT,
  geom GEOMETRY,
  _source TEXT NOT NULL DEFAULT 'demo'
);

CREATE TABLE IF NOT EXISTS perceel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID REFERENCES trace(id),
  perceelnummer TEXT NOT NULL,
  oppervlakte REAL,
  geom GEOMETRY,
  _source TEXT NOT NULL DEFAULT 'demo'
);

CREATE TABLE IF NOT EXISTS eigenaar_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perceel_id UUID NOT NULL REFERENCES perceel(id),
  type TEXT NOT NULL,
  zakelijk_recht TEXT
);

CREATE TABLE IF NOT EXISTS belemmering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID REFERENCES trace(id),
  categorie TEXT NOT NULL,
  beheerder TEXT,
  kruising_regime TEXT,
  eis_dekking REAL,
  geom GEOMETRY,
  _source TEXT NOT NULL DEFAULT 'demo'
);

CREATE TABLE IF NOT EXISTS kruising (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES trace(id),
  object_type TEXT NOT NULL,
  object_id TEXT,
  regime TEXT,
  geom GEOMETRY
);

CREATE TABLE IF NOT EXISTS conflict (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES trace(id),
  type TEXT NOT NULL,
  ernst TEXT NOT NULL,
  norm TEXT,
  waarde_gemeten REAL,
  waarde_eis REAL,
  toelichting TEXT,
  geom GEOMETRY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS berekening (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES trace(id),
  discipline TEXT NOT NULL,
  type TEXT NOT NULL,
  invoer JSONB,
  resultaat JSONB,
  norm_referentie TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tekening (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES trace(id),
  type TEXT NOT NULL,
  blob_url TEXT,
  formaat TEXT DEFAULT 'svg',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onderzoek (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES trace(id),
  type TEXT NOT NULL,
  discipline TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  rapport_blob TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aanvraag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES trace(id),
  type TEXT NOT NULL,
  ontvanger TEXT,
  status TEXT NOT NULL DEFAULT 'concept',
  document_blob TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id),
  trace_id UUID REFERENCES trace(id),
  naam TEXT NOT NULL,
  type TEXT NOT NULL,
  blob_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Nieuwe kolommen op bestaande installaties
ALTER TABLE organisatie ADD COLUMN IF NOT EXISTS legacy_id TEXT;
ALTER TABLE project ADD COLUMN IF NOT EXISTS legacy_id TEXT;
ALTER TABLE project ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE trace ADD COLUMN IF NOT EXISTS legacy_id TEXT;
ALTER TABLE trace ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE bestaand_net ADD COLUMN IF NOT EXISTS legacy_id TEXT;

CREATE INDEX IF NOT EXISTS idx_trace_project ON trace(project_id);
CREATE INDEX IF NOT EXISTS idx_trace_legacy ON trace(legacy_id);
CREATE INDEX IF NOT EXISTS idx_project_legacy ON project(legacy_id);
