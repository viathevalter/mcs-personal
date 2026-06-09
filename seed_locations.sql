-- Seed script para Países e Regiões base
-- Executar no SQL Editor do Supabase ou via migração

-- 0. Garantir que as restrições (constraints) de unicidade existam
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'countries_iso2_key') THEN
    ALTER TABLE core_common.countries ADD CONSTRAINT countries_iso2_key UNIQUE (iso2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regions_country_id_name_key') THEN
    ALTER TABLE core_common.regions ADD CONSTRAINT regions_country_id_name_key UNIQUE (country_id, name);
  END IF;
END $$;

-- 1. Inserir ou atualizar Países (Upsert por iso2)
INSERT INTO core_common.countries (iso2, iso3, name, phone_code, currency_code, status)
VALUES 
  ('ES', 'ESP', 'Espanha', '+34', 'EUR', 'active'),
  ('PT', 'PRT', 'Portugal', '+351', 'EUR', 'active'),
  ('IT', 'ITA', 'Itália', '+39', 'EUR', 'active'),
  ('FR', 'FRA', 'França', '+33', 'EUR', 'active'),
  ('BE', 'BEL', 'Bélgica', '+32', 'EUR', 'active'),
  ('BR', 'BRA', 'Brasil', '+55', 'BRL', 'active'),
  ('AR', 'ARG', 'Argentina', '+54', 'ARS', 'active'),
  ('CO', 'COL', 'Colômbia', '+57', 'COP', 'active'),
  ('PE', 'PER', 'Peru', '+51', 'PEN', 'active'),
  ('MX', 'MEX', 'México', '+52', 'MXN', 'active'),
  ('UY', 'URY', 'Uruguai', '+598', 'UYU', 'active'),
  ('PY', 'PRY', 'Paraguai', '+595', 'PYG', 'active'),
  ('CL', 'CHL', 'Chile', '+56', 'CLP', 'active')
ON CONFLICT (iso2) 
DO UPDATE SET 
  iso3 = EXCLUDED.iso3,
  name = EXCLUDED.name,
  phone_code = EXCLUDED.phone_code,
  currency_code = EXCLUDED.currency_code,
  status = EXCLUDED.status;

-- 2. Inserir ou atualizar Regiões (Upsert por country_id + name)
-- Usamos subqueries para garantir que pegamos o ID correto do país gerado
INSERT INTO core_common.regions (country_id, name, status)
VALUES
  -- Espanha
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Andalucía', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Aragón', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Asturias', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Baleares', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Canarias', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Cantabria', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Castilla-La Mancha', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Castilla y León', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Cataluña', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Comunidad Valenciana', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Extremadura', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Galicia', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Madrid', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Murcia', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'Navarra', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'País Vasco', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'ES'), 'La Rioja', 'active'),

  -- Portugal
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 'Lisboa', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 'Porto', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 'Braga', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 'Aveiro', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 'Setúbal', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 'Coimbra', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 'Faro', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 'Madeira', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'PT'), 'Açores', 'active'),

  -- Itália
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 'Lombardia', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 'Piemonte', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 'Veneto', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 'Emilia-Romagna', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 'Toscana', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 'Lazio', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 'Liguria', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 'Sicilia', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'IT'), 'Sardegna', 'active'),

  -- França
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Île-de-France', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Auvergne-Rhône-Alpes', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Provence-Alpes-Côte d''Azur', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Occitanie', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Nouvelle-Aquitaine', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Hauts-de-France', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Grand Est', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Bretagne', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Normandie', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'FR'), 'Pays de la Loire', 'active'),

  -- Bélgica
  ((SELECT id FROM core_common.countries WHERE iso2 = 'BE'), 'Flandres', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'BE'), 'Valônia', 'active'),
  ((SELECT id FROM core_common.countries WHERE iso2 = 'BE'), 'Bruxelas-Capital', 'active')
ON CONFLICT (country_id, name) 
DO UPDATE SET status = EXCLUDED.status;
