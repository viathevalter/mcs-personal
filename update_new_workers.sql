BEGIN;

-- GROUP 1: ELVIN AXEL POLO MANZANO (E1686)
UPDATE core_personal.workers SET empresa_id = 'dae64d51-2181-4510-b14f-e63d2f111a8e', status_trabajador = 'Ativo' WHERE cod_colab = 'E1686';
UPDATE public.colaboradores SET id_empresa = 7, contratante = 'WISEOWE' WHERE cod_colab = 'E1686';
INSERT INTO public.colaborador_por_pedido (cod_colab, codcliente, cliente_nombre, contratante, fechainiciopedido) 
VALUES ('E1686', 'C0587', 'INTUYMA', 'WISEOWE', CURRENT_DATE);

-- GROUP 2: DAVIDSON SOARES DE SOUZA (E2156), JAIR PLAZA AGUILAR (E1709), RICHARD ANTONIO GUERRA HERRERA (E1906)
UPDATE core_personal.workers SET empresa_id = 'a798620a-358a-4c6c-9db2-3a507c583cac', status_trabajador = 'Ativo' WHERE cod_colab IN ('E2156', 'E1709', 'E1906');
UPDATE public.colaboradores SET id_empresa = 3, contratante = 'TRIANGULO' WHERE cod_colab IN ('E2156', 'E1709', 'E1906');
INSERT INTO public.colaborador_por_pedido (cod_colab, codcliente, cliente_nombre, contratante, fechainiciopedido) VALUES 
('E2156', 'C0154', 'NORCAL SL', 'TRIANGULO', CURRENT_DATE),
('E1709', 'C0154', 'NORCAL SL', 'TRIANGULO', CURRENT_DATE),
('E1906', 'C0154', 'NORCAL SL', 'TRIANGULO', CURRENT_DATE);

-- GROUP 3: ROMER DAVID RODRIGUEZ GONZALEZ (E2051), FREDY GONZALES MAMANI (E2160), ALEJANDRO RIOS (E2159)
UPDATE core_personal.workers SET empresa_id = 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf', status_trabajador = 'Ativo' WHERE cod_colab IN ('E2051', 'E2160', 'E2159');
UPDATE public.colaboradores SET id_empresa = 5, contratante = 'ROSAS' WHERE cod_colab IN ('E2051', 'E2160', 'E2159');
INSERT INTO public.colaborador_por_pedido (cod_colab, codcliente, cliente_nombre, contratante, fechainiciopedido) VALUES 
('E2051', 'C0043', 'CAM IMPIANTI INDUSTRIALI SRL', 'ROSAS', CURRENT_DATE),
('E2160', 'C0043', 'CAM IMPIANTI INDUSTRIALI SRL', 'ROSAS', CURRENT_DATE),
('E2159', 'C0043', 'CAM IMPIANTI INDUSTRIALI SRL', 'ROSAS', CURRENT_DATE);

COMMIT;
