-- 1) EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR

SELECT 
    w.nome AS "Nome do Trabalhador", 
    w.status_trabajador AS "Status Sistema",
    core_personal.fn_get_active_client_for_worker(w.cod_colab) AS "Cliente Atribuído",
    COALESCE(w.nie, w.pasaporte, w.cod_colab) AS "Documento / Cód"
FROM core_personal.workers w
WHERE w.status_trabajador ILIKE '%TIVO%' 
  AND w.status_trabajador NOT ILIKE '%INAT%'
  
  -- === ALTERE O NOME DO CLIENTE ABAIXO ===
  AND core_personal.fn_get_active_client_for_worker(w.cod_colab) ILIKE '%HGL%'
  
ORDER BY w.nome;
