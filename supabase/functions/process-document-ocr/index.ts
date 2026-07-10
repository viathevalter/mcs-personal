import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Função utilitária para converter ArrayBuffer em Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunk_size = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunk_size) {
    const chunk = bytes.subarray(i, i + chunk_size);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("Chave GEMINI_API_KEY não configurada nas variáveis de ambiente da Edge Function.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    let file_path = "";
    let bucket_id = "";
    let mime_type = "application/pdf";
    let document_type = "";
    let worker_id = null;
    let client_id = null;
    let year: number | null = null;
    let month: number | null = null;

    // Detectar se é um Webhook do Storage (tabela objects) ou chamada HTTP direta
    if (body.record && body.record.bucket_id) {
      // Storage Webhook
      file_path = body.record.name;
      bucket_id = body.record.bucket_id;
      mime_type = body.record.metadata?.mimetype || "application/pdf";
      
      const pathParts = file_path.split('/');
      if (pathParts.length >= 3) {
        client_id = pathParts[0];
        worker_id = pathParts[1];
      }
    } else {
      // Chamada HTTP Direta
      file_path = body.file_path;
      document_type = body.document_type || "";
      bucket_id = body.bucket_id || (document_type ? "worker-incoming-docs" : "extracao-horas");
      mime_type = body.mime_type || "application/pdf";
      worker_id = body.worker_id;
      client_id = body.client_id;
    }

    if (!file_path) {
      return new Response(
        JSON.stringify({ error: "O parâmetro file_path é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Iniciando OCR para o arquivo: ${file_path} no bucket: ${bucket_id} (tipo: ${document_type || 'timesheet'})`);
    
    // 1. Baixar o arquivo do storage
    const { data: fileBlob, error: downloadErr } = await supabase.storage
      .from(bucket_id)
      .download(file_path);

    if (downloadErr || !fileBlob) {
      throw new Error(`Falha ao baixar arquivo para OCR (${file_path}): ${downloadErr?.message}`);
    }

    const fileBuffer = await fileBlob.arrayBuffer();
    const base64Data = arrayBufferToBase64(fileBuffer);

    // 2. Definir o prompt adequado para o tipo de documento ou fluxo
    let systemInstruction = "";
    let jsonSchema: any = {};
    const isWorkerDoc = !!document_type && document_type !== "timesheet";

    if (isWorkerDoc) {
      if (document_type === "identity") {
        systemInstruction = `Você é um leitor de documentos oficial. Analise a imagem fornecida (Passaporte, DNI ou NIE) de forma precisa e extraia os dados exatamente como estão escritos.
Retorne um objeto JSON contendo:
- nome_completo: nome completo do titular
- numero_documento: o número do documento de identidade (passaporte, DNI ou NIE)
- data_nascimento: data de nascimento formatada como YYYY-MM-DD
- data_validade: data de validade do documento formatada como YYYY-MM-DD
- nacionalidade: país de nacionalidade do titular
- tipo_identificacao: 'passaporte', 'dni' ou 'nie' com base no documento visualizado.`;

        jsonSchema = {
          type: "OBJECT",
          properties: {
            nome_completo: { type: "STRING" },
            numero_documento: { type: "STRING" },
            data_nascimento: { type: "STRING" },
            data_validade: { type: "STRING" },
            nacionalidade: { type: "STRING" },
            tipo_identificacao: { type: "STRING" }
          },
          required: ["nome_completo", "numero_documento"]
        };
      } else if (document_type === "nif") {
        systemInstruction = `Você é um assistente especializado em documentos fiscais de Portugal. Identifique o número de NIF (Número de Identificação Fiscal) presente no documento.
Retorne um objeto JSON contendo:
- nif: apenas os 9 dígitos numéricos do NIF, sem espaços.`;

        jsonSchema = {
          type: "OBJECT",
          properties: {
            nif: { type: "STRING" }
          },
          required: ["nif"]
        };
      } else if (document_type === "niss") {
        systemInstruction = `Você é um assistente especializado em Segurança Social de Portugal. Identifique o número de NISS (Número de Identificação da Segurança Social) no documento.
Retorne um objeto JSON contendo:
- niss: apenas os 11 dígitos numéricos do NISS, sem espaços.`;

        jsonSchema = {
          type: "OBJECT",
          properties: {
            niss: { type: "STRING" }
          },
          required: ["niss"]
        };
      } else if (document_type === "license") {
        systemInstruction = `Você é um leitor de licenças de condução (carteira de motorista). Identifique o número da carta de condução e sua validade.
Retorne um objeto JSON contendo:
- licencia_conducir: número do documento de habilitação/licença
- data_validade: data de validade formatada como YYYY-MM-DD.`;

        jsonSchema = {
          type: "OBJECT",
          properties: {
            licencia_conducir: { type: "STRING" },
            data_validade: { type: "STRING" }
          },
          required: ["licencia_conducir"]
        };
      } else {
        throw new Error(`Tipo de documento inválido para processamento OCR: ${document_type}`);
      }
    } else {
      // Horas Trabalhadas (timesheet)
      systemInstruction = `Você é um especialista em OCR de folhas de ponto (timesheets) de trabalhadores de empresas parceiras (LUMINOUS, STOCCO, TRIANGULO, WISEOWE).
Sua tarefa é analisar o documento (imagem ou PDF) e extrair os lançamentos diários de horas em formato JSON.

Cada folha de ponto pode ter um layout diferente (por exemplo, semanas organizadas horizontal ou verticalmente, ou tabelas corridas com 31 dias). Localize a tabela de dias e horários trabalhados.

Regras de Extração e Conversão:
1. Identifique o nome do trabalhador no topo da folha ('Trabalhador' ou 'Empleado').
2. Identifique o período ou mês/ano de faturamento ('Mes/Ano' ou 'Periodo').
3. Para cada dia do mês (1 a 31), localize as colunas correspondentes a:
   - Dia do mês ('Dia' ou 'Día').
   - Dia da semana ('Dia da semana' ou 'Día de la semana' ou abreviações).
   - Horário de início da jornada ('Inicio de jornada', 'Entrada', 'Inicio', 'De', etc.).
   - Horário de fim da jornada ('Fim de jornada', 'Salida', 'Fim', 'A', etc.).
   - Total de horas diárias trabalhado ('Horas trabajadas', 'Total de horas', 'Total', etc.).
   - Obra ou local de trabalho ('Obra', 'Proyecto', 'Centro de Coste', etc.), se houver escrito na linha do dia.

Formatação dos Valores no JSON:
- 'inicio' e 'fim': devem ser strings formatadas como 'HH:MM' (ex: '08:00', '17:30'). Se o dia estiver em branco (fim de semana não trabalhado, folga, falta), retorne null para ambos.
- 'total_horas': deve ser um número decimal (ex: 8.5 para 8h30m, 8.0 para 8h, ou 0 se não trabalhou). Caso o total esteja escrito em formato decimal ou HH:MM, converta-o para decimal puro.
- 'obra': se houver algum nome ou código de obra anotado na linha daquele dia, extraia exatamente o que está escrito. Caso contrário, retorne null.

Retorne um objeto JSON exatamente conforme o schema solicitado.`;

      jsonSchema = {
        type: "OBJECT",
        properties: {
          worker_name: { type: "STRING" },
          period: { type: "STRING" },
          days: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                day: { type: "INTEGER" },
                weekday: { type: "STRING" },
                inicio: { type: "STRING" },
                fim: { type: "STRING" },
                obra: { type: "STRING" },
                total_horas: { type: "NUMBER" }
              },
              required: ["day"]
            }
          },
          confidence_score: { type: "INTEGER" }
        },
        required: ["confidence_score", "days"]
      };
    }

    console.log(`Enviando solicitação OCR para o Gemini 1.5 Flash...`);

    // 3. Chamar a API do Google Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`;

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          parts: [
            { text: isWorkerDoc ? "Extraia os dados do documento." : "Extraia as informações do documento anexado conforme as instruções do sistema." },
            {
              inlineData: {
                mimeType: mime_type,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema,
        temperature: 0.1,
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    };

    let response: Response | null = null;
    const retries = 1; // Apenas 1 tentativa para evitar exceder o limite de 150s do Deno
    let delay = 2000; // Início com 2 segundos

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

        response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(geminiPayload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          break; // Sucesso! Sai do loop.
        }

        const isTransientError = response.status === 503 || response.status === 429 || response.status === 500;
        if (isTransientError && attempt < retries) {
          let waitTime = delay;

          if (response.status === 429) {
            let parsedWaitTime = 0;
            try {
              const clone = response.clone();
              const errJson = await clone.json();
              const details = errJson?.error?.details;
              if (Array.isArray(details)) {
                const retryInfo = details.find((d: any) => d["@type"]?.includes("RetryInfo"));
                if (retryInfo && retryInfo.retryDelay) {
                  const seconds = parseFloat(retryInfo.retryDelay);
                  if (!isNaN(seconds) && seconds <= 5) {
                    parsedWaitTime = (seconds * 1000) + 1500 + Math.floor(Math.random() * 1000);
                  }
                }
              }
            } catch (parseErr) {
              console.warn("Falha ao analisar retryDelay da resposta do Gemini:", parseErr);
            }

            if (parsedWaitTime > 0 && attempt < retries) {
              waitTime = parsedWaitTime;
              console.log(`[429 Quota] Gemini sugeriu retry curto. Aguardando ${waitTime}ms...`);
            } else {
              const errText = await response.text();
              throw new Error(`Erro na chamada da API do Gemini: 429 - Limite de cota excedido ou tempo de espera muito longo. Detalhes: ${errText}`);
            }
          }

          if (waitTime === delay) {
            const jitter = Math.floor(Math.random() * 600) - 300; // -300ms a +300ms
            waitTime = Math.max(200, delay + jitter);
          }

          console.warn(`Tentativa ${attempt} falhou com status ${response.status}. Retentando em ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          if (response.status !== 429) {
            delay *= 2; // Backoff exponencial (apenas se não for 429, pois 429 usa o tempo sugerido)
          }
          continue; // Pula para a próxima iteração
        }

        const errText = await response.text();
        throw new Error(`Erro na chamada da API do Gemini: ${response.status} - ${errText}`);
      } catch (err: any) {
        // Se for um erro lançado por nós indicando erro na chamada HTTP, não retente no catch
        if (err.message && err.message.startsWith("Erro na chamada da API")) {
          throw err;
        }

        if (err.name === 'AbortError') {
          err = new Error("Tempo limite de resposta do Gemini excedido (Timeout de 60s).");
        }

        if (attempt === retries) {
          throw err; // Lança o erro se for a última tentativa
        }
        const jitter = Math.floor(Math.random() * 600) - 300; // -300ms a +300ms
        const backoffDelay = Math.max(200, delay + jitter);
        console.warn(`Tentativa ${attempt} falhou devido a erro de rede: ${err.message}. Retentando em ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        delay *= 2;
      }
    }

    if (!response || !response.ok) {
      throw new Error("Não foi possível obter resposta da API do Gemini após as tentativas.");
    }

    const resJson = await response.json();
    const extractedText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedText) {
      throw new Error("A API do Gemini retornou uma resposta vazia ou em formato inesperado.");
    }

    const extractedData = JSON.parse(extractedText);
    console.log("OCR realizado com sucesso:", extractedData);

    // Funções utilitárias para formatar e calcular horas
    function formatTime(t: string | null | undefined): string | null {
      if (!t) return null;
      const cleaned = t.trim();
      const parts = cleaned.split(':');
      if (parts.length >= 2) {
        const hr = parts[0].padStart(2, '0');
        const min = parts[1].padStart(2, '0');
        return `${hr}:${min}:00`;
      }
      return null;
    }

    function calculateDuration(start: string, end: string): number {
      if (!start || !end) return 0;
      
      const parseTimeToMinutes = (t: string): number | null => {
        const cleaned = t.trim().replace(':', '.');
        const parts = cleaned.split('.');
        if (parts.length === 1) {
          const hr = parseFloat(parts[0]);
          if (!isNaN(hr)) return hr * 60;
        } else if (parts.length === 2) {
          const hr = parseInt(parts[0], 10);
          const min = parseInt(parts[1], 10);
          if (!isNaN(hr) && !isNaN(min)) {
            return hr * 60 + min;
          }
        }
        return null;
      };

      const startMin = parseTimeToMinutes(start);
      const endMin = parseTimeToMinutes(end);
      
      if (startMin === null || endMin === null) return 0;
      
      let diffMin = endMin - startMin;
      if (diffMin < 0) {
        diffMin += 24 * 60;
      }
      
      return Math.round((diffMin / 60) * 100) / 100;
    }

    year = body.year;
    month = body.month;
    if (!year || !month) {
      try {
        const filename = file_path.split('/').pop() || "";
        const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
        const parts = nameWithoutExt.split('_');
        if (parts.length >= 3) {
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      } catch (e) {
        console.error("Erro ao analisar data do nome do arquivo:", e);
      }
    }

    // Se for folha de horas e tivermos os dados necessários, salvamos os lançamentos diários como rascunho no banco
    if (!isWorkerDoc && worker_id && client_id && year && month) {
      try {
        console.log(`[DB Sync] Iniciando gravação de rascunhos para worker_id=${worker_id}, client_id=${client_id}, periodo=${month}/${year}...`);

        let workerFuncId = null;
        let workerFunction = body.worker_function;

        if (!workerFunction && worker_id) {
          const { data: workerData } = await supabase
            .schema('core_personal')
            .from('workers')
            .select('cod_colab')
            .eq('id', worker_id)
            .maybeSingle();

          if (workerData?.cod_colab) {
            const { data: collabData } = await supabase
              .schema('public')
              .from('colaboradores')
              .select('funcion')
              .eq('cod_colab', workerData.cod_colab)
              .maybeSingle();

            if (collabData?.funcion) {
              workerFunction = collabData.funcion;
            }
          }
        }

        if (workerFunction) {
          const { data: funcData } = await supabase
            .schema('core_comercial')
            .from('job_functions')
            .select('id')
            .eq('name', workerFunction)
            .limit(1)
            .maybeSingle();
          if (funcData) {
            workerFuncId = funcData.id;
          }
        }

        let clientSites = [];
        const { data: sites } = await supabase
          .schema('core_common')
          .from('client_sites')
          .select('id, name')
          .eq('client_id', client_id)
          .neq('status', 'archived');
        clientSites = sites || [];

        if (clientSites.length === 0 && worker_id) {
          const { data: contractInfo } = await supabase
            .schema('core_personal')
            .from('contracts')
            .select('empresa_id')
            .eq('worker_id', worker_id)
            .limit(1)
            .maybeSingle();
          
          if (contractInfo?.empresa_id) {
            const { data: defaultSite } = await supabase
              .schema('core_common')
              .from('client_sites')
              .insert({
                empresa_id: contractInfo.empresa_id,
                client_id: client_id,
                name: 'Taller',
                status: 'active'
              })
              .select('id, name')
              .maybeSingle();
            if (defaultSite) {
              clientSites = [defaultSite];
            }
          }
        }

        const mockTarifaFaturada = workerFunction?.toLowerCase().includes('soldador') ? 25.50 : (workerFunction?.toLowerCase().includes('tubero') ? 28.00 : 20.00);

        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const numDays = new Date(year, month, 0).getDate();
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${numDays}`;

        console.log(`[DB Sync] Limpando rascunhos antigos entre ${startDateStr} e ${endDateStr}...`);
        const { error: deleteError } = await supabase
          .schema('core_finance')
          .from('horas_trabalhadas')
          .delete()
          .eq('worker_id', worker_id)
          .eq('client_id', client_id)
          .gte('data_trabalho', startDateStr)
          .lte('data_trabalho', endDateStr);

        if (deleteError) {
          console.error("[DB Sync] Erro ao deletar registros de horas:", deleteError);
        }

        const rowsToInsert = [];
        if (Array.isArray(extractedData.days)) {
          for (const day of extractedData.days) {
            const rawTotalHoras = day.total_horas;
            const isExplicitlyZero = rawTotalHoras === 0;
            
            const duration = calculateDuration(day.inicio || "", day.fim || "");
            const finalTotalHoras = isExplicitlyZero ? 0 : (rawTotalHoras !== undefined && rawTotalHoras !== null ? rawTotalHoras : duration);

            if (finalTotalHoras === 0) {
              day.inicio = null;
              day.fim = null;
              day.total_horas = 0;
            }

            if (finalTotalHoras > 0) {
              const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
              
              let matchedObraId = null;
              if (day.obra) {
                const matched = clientSites.find((s: any) => 
                  s.name.toLowerCase().includes(day.obra.toLowerCase()) || 
                  day.obra.toLowerCase().includes(s.name.toLowerCase())
                );
                if (matched) matchedObraId = matched.id;
              }
              if (!matchedObraId && clientSites.length === 1) {
                matchedObraId = clientSites[0].id;
              }

              rowsToInsert.push({
                worker_id: worker_id,
                client_id: client_id,
                data_trabalho: dayStr,
                hora_inicio: formatTime(day.inicio),
                hora_fim: formatTime(day.fim),
                horas_totais: finalTotalHoras,
                status: 'pending_review',
                funcao_id: workerFuncId,
                obra_id: matchedObraId,
                tarifa_faturada: mockTarifaFaturada,
                extraction_confidence: extractedData.confidence_score || null
              });
            }
          }
        }

        if (rowsToInsert.length > 0) {
          console.log(`[DB Sync] Inserindo ${rowsToInsert.length} lançamentos diários...`);
          const { error: insertError } = await supabase
            .schema('core_finance')
            .from('horas_trabalhadas')
            .insert(rowsToInsert);

          if (insertError) {
            console.error("[DB Sync] Erro ao inserir rascunhos de horas:", insertError);
          } else {
            console.log("[DB Sync] Lançamentos gravados com sucesso.");
          }
        }

        // Atualizar o status da folha de horas para 'processado'
        console.log(`[DB Sync] Atualizando status de worker_hours para 'processado'...`);
        const { error: updateStatusError } = await supabase
          .schema('core_personal')
          .from('worker_hours')
          .update({ status: 'processado', updated_at: new Date().toISOString() })
          .eq('worker_id', worker_id)
          .eq('period_year', year)
          .eq('period_month', month)
          .eq('status', 'enviado');

        if (updateStatusError) {
          console.error("[DB Sync] Erro ao atualizar status de worker_hours:", updateStatusError);
        } else {
          console.log("[DB Sync] Status de worker_hours atualizado com sucesso.");
        }
      } catch (dbErr) {
        console.error("[DB Sync] Falha geral ao gravar rascunhos de horas no banco:", dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro no processamento OCR:", error);
    
    if (worker_id && year && month) {
      try {
        console.log(`[DB Sync] Reseting status to 'pendente' for worker ${worker_id} due to OCR failure...`);
        const { error: resetErr } = await supabase
          .schema('core_personal')
          .from('worker_hours')
          .update({ 
            status: 'pendente', 
            observacoes: `Falha na leitura automática por IA: ${error.message || error}`,
            updated_at: new Date().toISOString() 
          })
          .eq('worker_id', worker_id)
          .eq('period_year', year)
          .eq('period_month', month)
          .eq('status', 'enviado');
          
        if (resetErr) {
          console.error("[DB Sync] Erro ao resetar status para 'pendente':", resetErr);
        }
      } catch (dbResetErr) {
        console.error("[DB Sync] Falha geral ao resetar status:", dbResetErr);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
