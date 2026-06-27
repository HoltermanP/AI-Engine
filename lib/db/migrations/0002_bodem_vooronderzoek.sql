-- Bodem-vooronderzoek (NEN 5725-assistent) — additieve tabellen + GiST-indexen.
-- Idempotent (CREATE ... IF NOT EXISTS): veilig opnieuw uit te voeren.
-- SRID 28992 wordt bij insert gezet via geomExpr. Kolommen blijven generiek 'geometry'
-- conform de bestaande tabellen (trace, conflict, belemmering).

CREATE TABLE IF NOT EXISTS bodem_locatie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES project(id),
  gebied_key text,
  locatiecode text NOT NULL,
  dossier text,
  status text NOT NULL,
  vervolg_wbb text,
  status_oordeel text,
  bron text NOT NULL DEFAULT 'bodemloket-wbb',
  geom geometry,
  fetched_at timestamp NOT NULL DEFAULT now(),
  _source text NOT NULL DEFAULT 'live'
);

CREATE TABLE IF NOT EXISTS bodem_signalering (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES project(id),
  trace_id uuid REFERENCES trace(id),
  type text NOT NULL,
  ernst text NOT NULL,
  automatiseerbaar boolean NOT NULL DEFAULT true,
  bron text NOT NULL,
  bron_datum timestamp,
  locatiecode text,
  afstand_m real,
  toelichting text,
  geom geometry,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bodem_rapport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES project(id),
  trace_id uuid REFERENCES trace(id),
  titel text NOT NULL,
  secties jsonb NOT NULL,
  markdown text NOT NULL,
  status text NOT NULL DEFAULT 'concept',
  created_at timestamp NOT NULL DEFAULT now()
);

-- Ruimtelijke indexen voor ST_Intersects/ST_DWithin tegen het tracé.
CREATE INDEX IF NOT EXISTS bodem_locatie_geom_gist ON bodem_locatie USING gist (geom);
CREATE INDEX IF NOT EXISTS bodem_signalering_geom_gist ON bodem_signalering USING gist (geom);
CREATE INDEX IF NOT EXISTS bodem_locatie_project_idx ON bodem_locatie (project_id);
CREATE INDEX IF NOT EXISTS bodem_locatie_gebied_idx ON bodem_locatie (gebied_key);
CREATE INDEX IF NOT EXISTS bodem_signalering_project_idx ON bodem_signalering (project_id);
