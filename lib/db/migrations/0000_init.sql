-- PostGIS extensie (Neon: activeer via dashboard of deze migratie)
CREATE EXTENSION IF NOT EXISTS postgis;

-- GiST-indexen op geometrie-kolommen (na tabelcreatie via Drizzle push)
-- PostGIS conflictdetectie functies — fase 2 implementatie

CREATE OR REPLACE FUNCTION detect_kruisingen_net(p_trace_id uuid)
RETURNS void AS $$
BEGIN
  -- Fase 2: ST_Intersection tussen trace.geom en bestaand_net.geom
  RAISE NOTICE 'detect_kruisingen_net: implementatie in fase 2 voor trace %', p_trace_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION detect_conflict_afstand(p_trace_id uuid)
RETURNS void AS $$
BEGIN
  -- Buffer op basis van vrij_te_houden_afstand, ruimer bij nauwkeurigheid 'geschat'
  RAISE NOTICE 'detect_conflict_afstand: implementatie in fase 2 voor trace %', p_trace_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION detect_kruisingen_belemmering(p_trace_id uuid)
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'detect_kruisingen_belemmering: implementatie in fase 2 voor trace %', p_trace_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION detect_conflict_eigendom(p_trace_id uuid)
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'detect_conflict_eigendom: implementatie in fase 2 voor trace %', p_trace_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION toets_trace(p_trace_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM detect_kruisingen_net(p_trace_id);
  PERFORM detect_conflict_afstand(p_trace_id);
  PERFORM detect_kruisingen_belemmering(p_trace_id);
  PERFORM detect_conflict_eigendom(p_trace_id);
END;
$$ LANGUAGE plpgsql;
