BEGIN;
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0094', 
    'GONZALO ARIEL NAVARRO', 
    '+34 640860470', 
    '12176457795', 
    '326398414', 
    'AAF976893', 
    'SOLDADOR TIG (GTAW)', 
    'LUMINOUS', 
    'BACHILLER, SA', 
    'Inactivo', 
    'Baja', 
    '2026-03-03'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0094'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0092', 
    'WAYNER IBARBO VERGARA', 
    '+34 613780745', 
    '12173757775', 
    '323169481', 
    'AT988426', 
    'CALDERERO DE FABRICACIÓN', 
    'LUMINOUS', 
    'BACHILLER, SA', 
    'Inactivo', 
    'Baja', 
    '2026-03-10'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0092'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E1586', 
    'WILSON CHUQUIVIGUEL BRICEÑO', 
    '+51 986 341 983', 
    NULL, 
    NULL, 
    '120289518', 
    'CALDERERO DE FABRICACIÓN', 
    'LUMINOUS', 
    'BACHILLER, SA', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-10'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1586'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0095', 
    'LUIS CARLOS PEREZ GONZALEZ', 
    '+57 3182488241', 
    '12176565967', 
    '326546413', 
    'BD982113', 
    'INSPECTOR DE CALIDAD SOLDADURA (QA/QC)', 
    'LUMINOUS', 
    'BACHILLER, SA', 
    'Inactivo', 
    'Baja', 
    '2026-03-06'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0095'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0099', 
    'LUIS FERNANDO TOVAR LLAMOZA', 
    '+34 600385601', 
    NULL, 
    '325265224', 
    'AS553748', 
    'CALDERERO DE FABRICACIÓN', 
    'LUMINOUS', 
    'BACHILLER, SA', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-03'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0099'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E0299', 
    'ROBINSON DE FEX DIAZ', 
    '57 310 271 5669', 
    '12179177070', 
    '330256769', 
    'AT214523', 
    'ELECTRICISTA', 
    'STOCCO', 
    'ENTRERRIOS AUTOMATIZACION S.A', 
    'Inactivo', 
    'Baja', 
    '2026-03-15'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0299'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E0066', 
    'LUIS ALBERTO RAMIREZ PINEDO', 
    '+34 612 23 17 29', 
    NULL, 
    '337377715', 
    '124194671', 
    'MONTADOR (ARMADOR)', 
    'WISEOWE', 
    'GRUPO MICESA', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-17'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0066'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1457', 
    'ARNULFO SANCHEZ RUEDA', 
    '57 310 213 0583', 
    NULL, 
    NULL, 
    'BG003645', 
    'MONTADOR (ARMADOR) / SOLDADOR (3P)', 
    'STOCCO', 
    'METALMANT S.L', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1457'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E1714', 
    'NELSON ROBERTO HENAO BEDOYA', 
    '+57 310 462 2071', 
    NULL, 
    NULL, 
    'BE474832', 
    'SOLDADOR TIG (GTAW)', 
    'WISEOWE', 
    'MATEU INOXWELDING SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-07'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1714'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1194', 
    'FABIAN ANDRES BERNAL MONTENEGRO', 
    '34 667 695 972', 
    '12179025238', 
    '330064282', 
    'BE117627', 
    'MONTADOR (ARMADOR) / SOLDADOR (3P)', 
    'STOCCO', 
    'METALMANT S.L', 
    'Inactivo', 
    'Baja', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1194'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1507', 
    'HERNAN ALONSO CONTRERAS MARROQUIN', 
    '57 320 3011053', 
    NULL, 
    NULL, 
    'AS552560', 
    'MONTADOR (ARMADOR) / SOLDADOR (3P)', 
    'STOCCO', 
    'METALMANT S.L', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1507'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1207', 
    'LUIS ENRIQUE GARRIDO CASTRO', 
    '+34 672 83 21 43', 
    NULL, 
    NULL, 
    '194208547', 
    'MONTADOR (ARMADOR) / SOLDADOR (3P)', 
    'STOCCO', 
    'METALMANT S.L', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1207'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E0128', 
    'ALEJANDRO JOSE BORJA MANGA', 
    '+34 647527268', 
    '12178087970', 
    '328308862', 
    'BE511135', 
    'SOLDADOR TIG (GTAW)', 
    'STOCCO', 
    'INOXIDABLES DE MEDINA S.L', 
    'Inactivo', 
    'Baja', 
    '2026-03-17'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0128'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1268', 
    'ERIK CHARLY GOMEZ RIOS', 
    '51 916 944 611', 
    NULL, 
    NULL, 
    '124959884', 
    'SOLDADOR TIG (GTAW)', 
    'STOCCO', 
    'INOXIDABLES DE MEDINA S.L', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-17'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1268'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1502', 
    'GRAVIEL ISIDRO DIAZ OROPEZA', 
    '+34 614 625 972', 
    NULL, 
    NULL, 
    '176533263', 
    'SOLDADOR TIG (GTAW)', 
    'STOCCO', 
    'INOXIDABLES DE MEDINA S.L', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-17'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1502'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0491', 
    'CARLOS MARIO JARAMILLO LOPEZ', 
    '+34 641 35 73 88', 
    NULL, 
    '331602245', 
    'AV385391', 
    'MONTADOR (ARMADOR)', 
    'LUMINOUS', 
    'PMA ESTRUCTURAS 318 SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-06'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0491'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid, 
    'E1939', 
    'WILLIAM NORBERTO MELO MELO', 
    '+34 633 60 01 46', 
    '12181820012', 
    '33456465', 
    'BF462864', 
    'CERRAJERO', 
    'TRIANGULO', 
    'EICPERMAN', 
    'Inactivo', 
    'Baja', 
    '2026-03-10'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1939'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E0232', 
    'EDWIN ALEXANDER DIAZ PITRE', 
    '+34 661 112 615', 
    '12179725003', 
    '331296845', 
    'AT800138', 
    'ELECTRICISTA', 
    'WISEOWE', 
    'BECK & POLLITZER IBERICA SLU', 
    'Inactivo', 
    'Baja', 
    '2026-03-11'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0232'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E0613', 
    'DIDIER JOSE CHOLES MIRANDA', 
    '+57 316 690 6875', 
    '12182029339', 
    '332535398', 
    'BF490621', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Baja', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0613'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0505', 
    'MARIO ALEXANDER PEÑALOZA GARCIA', 
    '+34 656 78 76 53', 
    '12176904334', 
    '326894195', 
    'AZ475234', 
    'MONTADOR (ARMADOR) / SOLDADOR (3P)', 
    'LUMINOUS', 
    'COMESA SL', 
    'Inactivo', 
    'Baja', 
    '2026-03-14'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0505'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E1117', 
    'ERIK RUBEN RAMIREZ SIMANCAS', 
    '+57 301 17 46 508', 
    '12179964579', 
    '331659352', 
    'AU419727', 
    'SOLDADOR TIG (GTAW)', 
    'LUMINOUS', 
    'MEN MONTAJES INDUSTRIALES', 
    'Inactivo', 
    'Baja', 
    '2026-03-06'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1117'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E0634', 
    'RAFAEL CALDERON CAVIEDES', 
    '+57 310 811 9936', 
    '12181726974', 
    '333014685', 
    'BG267967', 
    'SOLDADOR TIG (GTAW)', 
    'STOCCO', 
    'DURO FELGUERA ENERGY STORAGE', 
    'Inactivo', 
    'Baja', 
    '2026-03-03'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0634'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0423', 
    'NASSER MOHAMAD MERES LUNA', 
    '+34 696 32 52 24', 
    '12180291009', 
    '331104202', 
    '123446084', 
    'TUBERO', 
    'LUMINOUS', 
    'MEN MONTAJES INDUSTRIALES', 
    'Inactivo', 
    'Baja', 
    '2026-03-15'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0423'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0254', 
    'ALIRIO ORTIZ MOLINA', 
    '+34 642 60 05 16', 
    '12177520975', 
    '327472006', 
    'BE28620', 
    'MECÁNICO INDUSTRIAL', 
    'LUMINOUS', 
    'BACHILLER, SA', 
    'Inactivo', 
    'Baja', 
    '2026-03-10'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0254'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E0383', 
    'ARLEMAR RAFAEL CAMPOS WOLFF', 
    '+34 645 28 71 62', 
    '12178154462', 
    '328809365', 
    '172294076', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Baja', 
    '2026-03-17'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0383'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E2094', 
    'BYRON YESID SUAREZ CUADRADO', 
    '+34 613 84 69 93', 
    '12182162759', 
    '334874181', 
    'BF203713', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Baja', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E2094'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid, 
    'E1816', 
    'RAFAEL ALEJANDRO HERRERA URBANO', 
    '+34 672 82 18 48', 
    '12182473225', 
    '334932939', 
    'BE913789', 
    'MECÁNICO MONTADOR', 
    'TRIANGULO', 
    'MONTRA', 
    'Inactivo', 
    'Baja', 
    '2026-03-23'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1816'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E2059', 
    'PAVEL FERNANDO GARCIA ZAPATA', 
    '+57 323 2321915', 
    NULL, 
    '330810260', 
    'BF743771', 
    'CALDERERO DE FABRICACIÓN', 
    'LUMINOUS', 
    'BACHILLER, SA', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-03'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E2059'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid, 
    'E0565', 
    'ALVARO FIGUEROA ARANGO', 
    '+34 603 19 05 74', 
    NULL, 
    '332512517', 
    'BF806838', 
    'CERRAJERO', 
    'TRIANGULO', 
    'EICPERMAN', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-10'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0565'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid, 
    'E2106', 
    'JUAN CARLOS TORRES LEON', 
    '+51 932 296 860', 
    NULL, 
    NULL, 
    '124767425', 
    'CERRAJERO', 
    'TRIANGULO', 
    'EICPERMAN', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-10'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E2106'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E1843', 
    'JUAN ALBEIRO MONSALVE MARIN', 
    '+34 605 08 08 05', 
    NULL, 
    NULL, 
    'BF895966', 
    'ELECTRICISTA', 
    'WISEOWE', 
    'BECK & POLLITZER IBERICA SLU', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-12'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1843'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E1849', 
    'MIGUEL ANGEL GARCIA CASTRO', 
    '+34 607 73 25 38', 
    NULL, 
    NULL, 
    'BF679853', 
    'ELECTRICISTA', 
    'WISEOWE', 
    'BECK & POLLITZER IBERICA SLU', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-11'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1849'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E1842', 
    'BLAKIS ANTONIO BARBOZA TRUJILLO', 
    '+57 320 522 2198', 
    NULL, 
    '339914572', 
    'BD964686', 
    'ELECTRICISTA', 
    'WISEOWE', 
    'BECK & POLLITZER IBERICA SLU', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-14'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1842'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E2103', 
    'BOLIVAR GABRIEL ALDANA RAMIREZ', 
    '+57 323 4683786', 
    NULL, 
    NULL, 
    'BE190764', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-17'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E2103'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E1731', 
    'CARLOS ANDRES PULIDO CHAVEZ', 
    '+34 617 747 889', 
    NULL, 
    NULL, 
    'BE316400', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-17'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1731'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E0639', 
    'JULIO CESAR ANTEQUERA ALMARALES', 
    '+34 643 464 131', 
    NULL, 
    NULL, 
    'BC071402', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-17'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0639'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E1680', 
    'JORGE LEONARDO MACHUCA GARCIA', 
    '+34 663 044 738', 
    '12174411152', 
    '332820092', 
    'BG215264', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Baja', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1680'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E2101', 
    'JOSE JONATHAN CANO SALAZAR', 
    '+34 624 93 04 29', 
    NULL, 
    '336482833', 
    'AY143348', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E2101'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E1563', 
    'NICOLAS MIGUEL PEDRAZA MENDOZA', 
    '+34 614544983', 
    NULL, 
    NULL, 
    'AS484348', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1563'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E2097', 
    'VICTOR JAVIER RIERA FLORES', 
    '+34 614 88 34 49', 
    NULL, 
    NULL, 
    '173594065', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E2097'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E2064', 
    'YORVY RAFAEL MARTINEZ ROMERO', 
    '+34 631 16 01 28', 
    NULL, 
    NULL, 
    '194343305', 
    'MECÁNICO INDUSTRIAL', 
    'WISEOWE', 
    'CORDOBA SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E2064'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid, 
    'E1406', 
    'ANDRES FELIPE LOPEZ FONTALVO', 
    '+34 617 85 62 99', 
    NULL, 
    NULL, 
    'BC345878', 
    'MECÁNICO MONTADOR', 
    'TRIANGULO', 
    'MONTRA', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-23'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1406'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid, 
    'E0083', 
    'DAVID RICARDO SANCHEZ ZAPATA', 
    '+34 633 47 61 05', 
    NULL, 
    NULL, 
    '124650623', 
    'MECÁNICO MONTADOR', 
    'TRIANGULO', 
    'MONTRA', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-23'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0083'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid, 
    'E0560', 
    'JORGE REINALDO GOMEZ ROJAS', 
    '+34 602 60 19 40', 
    NULL, 
    NULL, 
    'BF338970', 
    'MECÁNICO MONTADOR', 
    'TRIANGULO', 
    'MONTRA', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-23'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0560'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E1747', 
    'JAVIER DE JESUS SALAS MARTINEZ', 
    '+34 624 686 538', 
    NULL, 
    '336350503', 
    'AX751742', 
    'MONTADOR (ARMADOR)', 
    'WISEOWE', 
    'GRUPO FERRERAS', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-05'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1747'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E1471', 
    'DANILO PINEDA RIVAS', 
    '+507 6701 0197', 
    NULL, 
    '332806960', 
    'PA0882805', 
    'SOLDADOR TIG (GTAW)', 
    'LUMINOUS', 
    'BACHILLER, SA', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-03'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1471'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E2128', 
    'RANDYS MIGUEL NIEBLES HURTADO', 
    '+57 300 3140087', 
    NULL, 
    '336206941', 
    'BG467207', 
    'SOLDADOR TIG (GTAW)', 
    'LUMINOUS', 
    'MEN MONTAJES INDUSTRIALES', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-13'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E2128'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0048', 
    'REINERD SALAZAR FAJARDO', 
    '+34 662 64 13 01', 
    NULL, 
    '332807630', 
    'BF854945', 
    'SOLDADOR TIG (GTAW)', 
    'LUMINOUS', 
    'MOINTER SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-10'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0048'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1873', 
    'LUIS CARLOS CASTELLAR VILLARREAL', 
    '+57 321 770 6088', 
    NULL, 
    NULL, 
    'BD792126', 
    'SOLDADOR TIG (GTAW)', 
    'STOCCO', 
    'DURO FELGUERA ENERGY STORAGE', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-13'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1873'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E0238', 
    'ISRAEL BENAVIDES PRECIADO', 
    '573102607769', 
    NULL, 
    NULL, 
    'BA377442', 
    'SOLDADOR TIG (GTAW)', 
    'WISEOWE', 
    'ELYTT ENERGY SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-16'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0238'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E1969', 
    'JOSE GUILLERMO PENA BARRERA', 
    '+57 310 4735053', 
    NULL, 
    NULL, 
    'AT601373', 
    'SOLDADOR TIG (GTAW)', 
    'LUMINOUS', 
    'BACHILLER, SA', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-03'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1969'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1669', 
    'JORGE HERNANDO AGUIRRE VELANDIA', 
    '+34 677 134 485', 
    NULL, 
    '332820092', 
    'BF223217', 
    'SOLDADOR TIG (GTAW)', 
    'STOCCO', 
    'DURO FELGUERA ENERGY STORAGE', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-13'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1669'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1529', 
    'JOHN HAROLD PERENGUEZ CUARAN', 
    '+34 655 22 44 16', 
    NULL, 
    NULL, 
    'BE202557', 
    'SOLDADOR TIG (GTAW)', 
    'STOCCO', 
    'METALMANT S.L', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1529'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1532', 
    'JORGE EDUARDO VARGAS CASTAÑEDA', 
    '+34 600 38 84 32', 
    NULL, 
    NULL, 
    'BC584849', 
    'SOLDADOR TIG (GTAW)', 
    'STOCCO', 
    'METALMANT S.L', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1532'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid, 
    'E0310', 
    'SANTOS PAULO ARCAYA NORIEGA', 
    '+34 614 74 43 58', 
    NULL, 
    NULL, 
    '123856495', 
    'TUBERO', 
    'LUMINOUS', 
    'MEN MONTAJES INDUSTRIALES', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-13'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E0310'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid, 
    'E1585', 
    'WILMER FERNANDO ROJAS RAMIREZ', 
    '57 321 3121347', 
    NULL, 
    NULL, 
    'AV774901', 
    'TUBERO', 
    'STOCCO', 
    'METALMANT S.L', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-09'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1585'
);
INSERT INTO core_personal.workers (
    empresa_id, cod_colab, nome, movil, niss, nif, pasaporte, 
    funcion, contratante, cliente, status_trabajador, status_seguridad, data_baixa
)
SELECT 
    'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid, 
    'E1926', 
    'WILMER ANDRES AREVALO MARIN', 
    '+57 321 222 5092', 
    NULL, 
    '333725379', 
    'BH135499', 
    'TUBERO', 
    'WISEOWE', 
    'MATEU INOXWELDING SL', 
    'Inactivo', 
    'Em Regularização', 
    '2026-03-15'
WHERE NOT EXISTS (
    SELECT 1 FROM core_personal.workers WHERE cod_colab = 'E1926'
);
COMMIT;
