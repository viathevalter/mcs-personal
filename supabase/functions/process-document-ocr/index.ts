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
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
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

    // Parse payload
    const { file_path, mime_type, document_type } = await req.json();

    if (!file_path || !mime_type || !document_type) {
      return new Response(
        JSON.stringify({ error: "Parâmetros file_path, mime_type e document_type são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Baixando arquivo do storage: ${file_path}`);
    
    // 1. Baixar o arquivo do bucket 'worker-incoming-docs'
    const { data: fileBlob, error: downloadErr } = await supabase.storage
      .from("worker-incoming-docs")
      .download(file_path);

    if (downloadErr || !fileBlob) {
      throw new Error(`Falha ao baixar arquivo para OCR (${file_path}): ${downloadErr?.message}`);
    }

    const fileBuffer = await fileBlob.arrayBuffer();
    const base64Data = arrayBufferToBase64(fileBuffer);

    // 2. Definir o prompt adequado para o tipo de documento
    let systemInstruction = "";
    let jsonSchema = {};

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

    console.log(`Enviando solicitação OCR para o Gemini (tipo: ${document_type})...`);

    // 3. Chamar a API do Google Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`;




    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: systemInstruction },
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
        responseSchema: jsonSchema
      }
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro na chamada da API do Gemini: ${response.status} - ${errText}`);
    }

    const resJson = await response.json();
    const extractedText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedText) {
      throw new Error("A API do Gemini retornou uma resposta vazia ou em formato inesperado.");
    }

    console.log("OCR realizado com sucesso:", extractedText);

    return new Response(
      JSON.stringify({
        success: true,
        data: JSON.parse(extractedText)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro no processamento OCR:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
