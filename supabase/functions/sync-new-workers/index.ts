import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Interface para logs e responses consistentes
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  // Configuração de CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    // Definimos as chaves de acesso no Deno Env (Configurar no painel do Supabase)
    const devUrl = Deno.env.get("MASTER_DEV_URL");
    const devKey = Deno.env.get("MASTER_DEV_SERVICE_ROLE_KEY");

    const prodUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("MASTER_PROD_URL");
    const prodKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MASTER_PROD_SERVICE_ROLE_KEY");

    if (!devUrl || !devKey || !prodUrl || !prodKey) {
      throw new Error("Missing database connectivity ENVs. Check MASTER_DEV_URL and service keys.");
    }

    const devClient = createClient(devUrl, devKey);
    const prodClient = createClient(prodUrl, prodKey, {
      db: { schema: "public" },
      auth: { persistSession: false },
    });
    
    // Obter o ID padrao da empresa PROD (ou pode ser dinâmico no futuro)
    const defaultEmpresaId = "dae64d51-2181-4510-b14f-e63d2f111a8e";

    console.log("Iniciando rotina de Sincronismo de Novos Trabalhadores (DEV -> PROD)");

    // 1. Buscamos TODOS colaboradores de DEV recentes (que tenham entrado há pouco tempo ou todos se preferir).
    // Usaremos uma query cruzada puxando contratados tambem
    const { data: colsDev, error: errDevRows } = await devClient
      .from('colaboradores')
      .select(`
        cod_colab, nombre, email, movil, niss, nie, dni, pasaporte, nif,
        status_seguridad, status_trabajador, licencia_conducir,
        nacionalidade, fecha_nacimiento, nuss, foto, contratante, funcion,
        fecha_alta, fecha_baja, fecha_inicio,
        contratados ( cod_servico, tipo_servico, camisa, pantalone, id_funcion, sp_created, sp_modified )
      `)
      // .gte('created_at', formatDaysAgo(2)) <- para filtar temporalmente, ou iterar limit para batch. 
      .order('id', { ascending: false })
      .limit(200);

    if (errDevRows) throw errDevRows;
    if (!colsDev || colsDev.length === 0) return new Response(JSON.stringify({ success: true, message: "No workers found to sync." }), { headers: corsHeaders(), status: 200 });

    let upsertedCount = 0;
    
    // 2. Transpor os dados para as tabelas de PROD 
    // Em PROD temos core_personal.workers e public.contratados
    for (const d of colsDev) {
      if (!d.cod_colab) continue;

      // Parsing do status JSON do powerapps
      let flatStatusTrabajador = d.status_trabajador;
      if (typeof d.status_trabajador === 'string' && d.status_trabajador.startsWith('{')) {
        try {
          const st = JSON.parse(d.status_trabajador);
          flatStatusTrabajador = st.Value ?? null;
        } catch (_e) {}
      }
      
      const contratadoRef = d.contratados && d.contratados.length > 0 ? d.contratados[0] : null;

      const workerPayload = {
        empresa_id: defaultEmpresaId,
        cod_colab: d.cod_colab,
        nome: d.nombre,
        email: d.email,
        movil: d.movil,
        niss: d.niss,
        nie: d.nie,
        dni: d.dni,
        pasaporte: d.pasaporte,
        nif: d.nif,
        status_seguridad: d.status_seguridad,
        status_trabajador: flatStatusTrabajador,
        licencia_conducir: d.licencia_conducir,
        nacionalidade: d.nacionalidade,
        fecha_nacimiento: d.fecha_nacimiento,
        nuss: d.nuss,
        foto: d.foto,
        data_ingresso: d.fecha_inicio || null,
        data_baixa: d.fecha_baja || null,
        contratante: d.contratante,
        funcion: d.funcion,
        camiseta: contratadoRef?.camisa || null,
        pantalones: contratadoRef?.pantalone || null,
      };

      // Injeta no core_personal.workers de forma UPSERT
      const { error: errWorker } = await prodClient.from('workers').upsert(workerPayload, { onConflict: 'empresa_id,cod_colab' }).schema('core_personal');
      
      if (errWorker) {
        console.error(`Erro inserindo worker ${d.cod_colab}:`, errWorker);
        continue; // pular para o próximo se falhar
      }

      // Se tiver associação de Pedido (Alocação), Injeta no public.contratados
      if (contratadoRef && contratadoRef.cod_servico) {
        const contratadoPayload = {
          cod_colab: d.cod_colab,
          cod_servico: contratadoRef.cod_servico,
          tipo_servico: contratadoRef.tipo_servico,
          id_funcion: contratadoRef.id_funcion,
          sp_created: contratadoRef.sp_created || new Date().toISOString(),
          sp_modified: contratadoRef.sp_modified || new Date().toISOString()
        };

        const { error: errAloc } = await prodClient.from('contratados').upsert(contratadoPayload, { onConflict: 'cod_colab' });
        if (errAloc) console.error(`Erro inserindo contratados alocacao ${d.cod_colab}:`, errAloc);
      }

      upsertedCount++;
    }

    console.log(`Rotina completada. Registros processados e atualizados: ${upsertedCount}`);

    return new Response(JSON.stringify({
      success: true,
      processed: upsertedCount,
      message: "Sync concluído com sucesso."
    }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Ops, falha na sincronia:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
