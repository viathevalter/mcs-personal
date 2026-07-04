-- Create views in core_operacoes schema referencing core_common, core_comercial, and public schemas

CREATE OR REPLACE VIEW core_operacoes.client_sites AS
SELECT id,
    name
   FROM core_common.client_sites;

CREATE OR REPLACE VIEW core_operacoes.clients AS
SELECT id,
    trade_name,
    legal_name
   FROM core_common.clients;

CREATE OR REPLACE VIEW core_operacoes.departments AS
SELECT id,
    empresa_id,
    code,
    name,
    status,
    created_at,
    updated_at,
    created_by,
    updated_by
   FROM core_common.departments;

CREATE OR REPLACE VIEW core_operacoes.mcs_users AS
SELECT id,
    email,
    display_name
   FROM public.mcs_users;

CREATE OR REPLACE VIEW core_operacoes.pedidos AS
SELECT id,
    codigo,
    empresa_id
   FROM core_comercial.pedidos;

CREATE OR REPLACE VIEW core_operacoes.users AS
SELECT id,
    email,
    display_name
   FROM public.mcs_users;

CREATE OR REPLACE VIEW core_operacoes.workers AS
SELECT id,
    empresa_id,
    cod_colab,
    nome,
    email,
    movil,
    niss,
    nie,
    dni,
    pasaporte,
    created_at,
    nif,
    status_seguridad,
    status_trabajador,
    licencia_conducir,
    nacionalidade,
    fecha_nacimiento,
    nuss,
    foto,
    data_ingresso,
    data_baixa,
    data_alta_seguridad,
    data_baixa_seguridad,
    cliente,
    contratante,
    funcion
   FROM core_personal.workers;

-- Grant permissions on views
GRANT SELECT ON core_operacoes.client_sites TO authenticated;
GRANT SELECT ON core_operacoes.clients TO authenticated;
GRANT SELECT ON core_operacoes.departments TO authenticated;
GRANT SELECT ON core_operacoes.mcs_users TO authenticated;
GRANT SELECT ON core_operacoes.pedidos TO authenticated;
GRANT SELECT ON core_operacoes.users TO authenticated;
GRANT SELECT ON core_operacoes.workers TO authenticated;
