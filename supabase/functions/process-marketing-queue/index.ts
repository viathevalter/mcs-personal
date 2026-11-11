import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function stripHtmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    let reqBody: any = {};
    if (req.method === "POST") {
      try {
        reqBody = await req.json();
      } catch {
        // empty body ok
      }
    }
    const requestedCampaignId = reqBody?.campaign_id || null;
    const requestedEmpresaId = reqBody?.empresa_id || null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'core_comercial' },
    });

    console.log("Iniciando processamento da fila de e-mail marketing...");

    // 1. Ativar campanhas agendadas cujo horário já chegou
    const { data: dueScheduled } = await supabase
      .from("marketing_campaigns")
      .select("id, title")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (dueScheduled && dueScheduled.length > 0) {
      for (const sc of dueScheduled) {
        await supabase
          .from("marketing_campaigns")
          .update({ status: "sending", updated_at: new Date().toISOString() })
          .eq("id", sc.id);
        console.log(`Campanha agendada ativada para 'sending': ${sc.title}`);
      }
    }

    // 2. Buscar todas as campanhas em status 'sending' (respeitando filtros se fornecidos)
    let campQuery = supabase
      .from("marketing_campaigns")
      .select("id, title, scheduled_at, created_at, empresa_id")
      .eq("status", "sending");

    if (requestedCampaignId) {
      campQuery = campQuery.eq("id", requestedCampaignId);
    } else if (requestedEmpresaId) {
      campQuery = campQuery.eq("empresa_id", requestedEmpresaId);
    }

    const { data: currentSendingCampaigns, error: errSending } = await campQuery
      .order("created_at", { ascending: true });

    if (errSending) throw errSending;

    // 3. Checar e-mails pendentes para cada campanha ativa
    const campaignsToProcess: Array<{ id: string; title: string; empresa_id: string; pending: number }> = [];

    if (currentSendingCampaigns && currentSendingCampaigns.length > 0) {
      for (const camp of currentSendingCampaigns) {
        const { count, error: errCount } = await supabase
          .from("marketing_campaign_queue")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", camp.id)
          .eq("status", "pending");

        if (!errCount && count && count > 0) {
          campaignsToProcess.push({ ...camp, pending: count });
        } else if (!errCount && count === 0) {
          // Campanha sem pendências: marca como concluída imediatamente
          await supabase
            .from("marketing_campaigns")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", camp.id);
          console.log(`Campanha ${camp.title} finalizada como 'completed' (fila zerada).`);
        }
      }
    }

    if (campaignsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhuma campanha ativa com e-mails pendentes no momento." }),
        { headers: corsHeaders(), status: 200 }
      );
    }

    // 4. Fair-share: dividir a capacidade de envio entre as campanhas ativas para evitar starvation
    const numActive = campaignsToProcess.length;
    let limitPerCampaign = 25;
    if (numActive === 2) {
      limitPerCampaign = 15; // 15 cada = 30 no lote
    } else if (numActive >= 3) {
      limitPerCampaign = 10; // 10 cada (até 3-4 campanhas) = 30-40 no lote
    }

    const queueItems: any[] = [];

    for (const camp of campaignsToProcess.slice(0, 4)) {
      const { data: items, error: errItems } = await supabase
        .from("marketing_campaign_queue")
        .select(`
          id,
          campaign_id,
          lead_id,
          marketing_campaigns (
            id,
            empresa_id,
            title,
            template_id,
            assigned_to,
            sender_email,
            reply_to_email,
            marketing_templates (
              id,
              title,
              subject,
              html_content
            )
          ),
          leads:lead_id (
            id,
            name,
            email,
            company_name,
            phone,
            tags,
            assigned_to,
            country_id
          )
        `)
        .eq("status", "pending")
        .eq("campaign_id", camp.id)
        .order("created_at", { ascending: true })
        .limit(limitPerCampaign);

      if (!errItems && items && items.length > 0) {
        queueItems.push(...items);
      }
    }

    if (queueItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum item pendente encontrado para envio." }),
        { headers: corsHeaders(), status: 200 }
      );
    }

    console.log(`Processando ${queueItems.length} e-mails da fila com cadência suave...`);

    // Cache simples de empresas e usuários para evitar queries repetidas no lote
    const companyCache = new Map<string, any>();
    const userCache = new Map<string, any>();
    const sentDomainsInBatch = new Set<string>();

    for (const item of queueItems) {
      const campaign = item.marketing_campaigns;
      const template = campaign?.marketing_templates;
      const lead = item.leads;

      if (!lead || !template || !campaign) {
        await supabase
          .from("marketing_campaign_queue")
          .update({
            status: "failed",
            error_message: "Dados incompletos (Lead, Template ou Campanha ausente).",
          })
          .eq("id", item.id);
        continue;
      }

      // Buscar dados da empresa explicitamente do schema core_common (com cache)
      let company = companyCache.get(campaign.empresa_id);
      if (!company) {
        const { data: compData } = await supabase
          .schema("core_common")
          .from("empresas")
          .select("trade_name, proposal_sender_email, proposal_sender_email_es, proposal_sender_email_fr, marketing_sender_email, marketing_sender_email_es, marketing_sender_email_fr")
          .eq("id", campaign.empresa_id)
          .maybeSingle();
        company = compData || {};
        companyCache.set(campaign.empresa_id, company);
      }

      const assignedUserId = campaign.assigned_to || lead.assigned_to || null;
      let assignedUser: any = null;
      if (assignedUserId) {
        assignedUser = userCache.get(assignedUserId);
        if (!assignedUser) {
          const { data: usrData } = await supabase
            .schema("public")
            .from("mcs_users")
            .select("id, display_name, email, commercial_email, marketing_sender_email, commercial_country")
            .eq("id", assignedUserId)
            .maybeSingle();
          assignedUser = usrData || {};
          userCache.set(assignedUserId, assignedUser);
        }
      }

      // Determinar contexto da empresa e país do lead/comercial
      const companyTrade = (company?.trade_name || "").toUpperCase();
      const isTriangulo = companyTrade.includes("TRIANGULO") || companyTrade.includes("TRIÂNGULO") || campaign.empresa_id === 'a798620a-358a-4c6c-9db2-3a507c583cac';
      const isWiseowe = companyTrade.includes("WISEOWE") || campaign.empresa_id === 'dae64d51-2181-4510-b14f-e63d2f111a8e';
      const isLuminous = companyTrade.includes("LUMINOUS") || campaign.empresa_id === '847796c4-b253-4e53-9e6b-34a127ec7d85';
      const isGenio = companyTrade.includes("GENIO") || companyTrade.includes("GÉNIO") || campaign.empresa_id === '4a507974-f922-409f-83c0-9ef8cbf982cb';

      const leadTags = Array.isArray(lead.tags) ? lead.tags.join(' ').toLowerCase() : (typeof lead.tags === 'string' ? lead.tags.toLowerCase() : '');
      const leadEmail = (lead.email || '').toLowerCase();
      const leadPhone = (lead.phone || '').trim();
      const campTitleLower = (campaign.title || '').toLowerCase();

      // IDs de vendedores comerciais
      const GIADA_ID = '76f9a2f5-116a-456e-a7d9-9a6a0401ac65';
      const MICHELLE_ID = 'dbc361a1-e4af-446a-8079-39c0caab00d2';
      const ALBA_ID = 'ca69863d-998b-4bad-865a-19720e7a1f67';
      const ALBA_LEGACY_ID = '2fdac13f-fb57-4ca9-a731-1acba5bb2bd7';
      const OMAR_ID = '346a9262-2edf-4a2e-80fc-aa5b43bf483a';
      const FATUMATA_ID = '2a25dd76-8a1b-44ea-8ea9-47e9232beee2';
      const LISETH_ID = 'cdc74a13-e41a-4fa5-b51b-5a27b8f310fa';
      const ALEX_ID = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7';
      const AYSLAN_ID = '9cba947d-432d-4622-89f0-18c5750581d9';

      const isItalyLead = leadTags.includes('itália') || leadTags.includes('italia') || leadTags.includes('italy') || leadTags.includes('giada') || leadEmail.endsWith('.it') || leadPhone.startsWith('+39') || leadPhone.startsWith('0039');
      const tplTitleLower = (template.title || '').toLowerCase();
      const tplSubjectLower = (template.subject || '').toLowerCase();
      const tplHtmlLower = (template.html_content || '').toLowerCase();

      const isExplicitFatumataTemplate =
        tplTitleLower.includes('fatumata') ||
        tplTitleLower.includes('frança') ||
        tplTitleLower.includes('france') ||
        tplTitleLower === 'mkt01 - wise' ||
        tplTitleLower === 'mkt02 - wise' ||
        tplHtmlLower.includes('whatsapp_url_fatumata') ||
        tplHtmlLower.includes('whatsapp_url_omar') ||
        tplSubjectLower.includes('soudeurs') ||
        tplSubjectLower.includes('besoin de personnel');

      const isExplicitLisethTemplate =
        tplTitleLower.includes('liseth') ||
        tplTitleLower.includes('espanha') ||
        tplTitleLower.includes('españa') ||
        tplHtmlLower.includes('whatsapp_url_liseth');

      const isExplicitGiadaTemplate =
        tplTitleLower.includes('giada') ||
        tplTitleLower.includes('itália') ||
        tplTitleLower.includes('italia') ||
        tplHtmlLower.includes('whatsapp_url_giada');

      const isItalyWiseowe =
        !isExplicitFatumataTemplate &&
        !isExplicitLisethTemplate &&
        (isExplicitGiadaTemplate ||
          assignedUserId === GIADA_ID ||
          assignedUser?.commercial_country === 'IT' ||
          (campaign.sender_email || '').toLowerCase().includes('it.wiseowe.com') ||
          isItalyLead ||
          campTitleLower.includes('giada') ||
          campTitleLower.includes('italia') ||
          campTitleLower.includes('itália'));

      const isSpainWiseowe =
        !isExplicitFatumataTemplate &&
        !isItalyWiseowe &&
        (isExplicitLisethTemplate ||
          assignedUserId === LISETH_ID ||
          assignedUser?.commercial_country === 'ES' ||
          (campaign.sender_email || '').toLowerCase().includes('es.wiseowe.com') ||
          leadTags.includes('liseth') ||
          leadTags.includes('espanha') ||
          leadTags.includes('españa') ||
          campTitleLower.includes('liseth') ||
          campTitleLower.includes('españa') ||
          campTitleLower.includes('espanha'));
      const isFranceLead =
        isExplicitFatumataTemplate ||
        (!isSpainWiseowe &&
          !isItalyWiseowe &&
          (assignedUserId === FATUMATA_ID ||
            assignedUserId === OMAR_ID ||
            assignedUser?.commercial_country === 'FR' ||
            leadTags.includes('frança') ||
            leadTags.includes('francia') ||
            leadTags.includes('france') ||
            leadEmail.endsWith('.fr') ||
            leadPhone.startsWith('+33') ||
            leadPhone.startsWith('0033') ||
            isWiseowe));

      // URLs explícitas por vendedor
      const waOmarUrl = `https://wa.me/33176210655?text=${encodeURIComponent("Bonjour Fatumata, je souhaite plus d'informations sur vos services")}`;
      const waLisethUrl = `https://wa.me/34937371540?text=${encodeURIComponent("Hola Liseth, quisiera más información sobre sus servicios")}`;
      const waMichelleUrl = `https://wa.me/34937374830?text=${encodeURIComponent("Hola Alba, quisiera más información sobre sus servicios")}`;
      const waGiadaUrl = `https://wa.me/393933060003?text=${encodeURIComponent("Ciao Giada, vorrei maggiori informazioni sui vostri servizi")}`;
      const waAlexUrl = `https://wa.me/34937374180?text=${encodeURIComponent("Hola Alex, quisiera más información sobre sus servicios")}`;
      const waAyslanUrl = `https://wa.me/351913417249?text=${encodeURIComponent("Hola Ayslan, quisiera más información sobre sus servicios")}`;

      // Resolução inteligente do WhatsApp padrão (Hierarquia: Vendedor Atribuído -> País/Mercado -> Empresa)
      let defaultWaUrl = waMichelleUrl;
      let effectiveAssignedTo: string | null = campaign.assigned_to || lead.assigned_to || null;

      if (assignedUserId === GIADA_ID) {
        defaultWaUrl = waGiadaUrl;
        effectiveAssignedTo = GIADA_ID;
      } else if (assignedUserId === AYSLAN_ID) {
        defaultWaUrl = waAyslanUrl;
        effectiveAssignedTo = AYSLAN_ID;
      } else if (assignedUserId === LISETH_ID || (isWiseowe && isSpainWiseowe)) {
        defaultWaUrl = waLisethUrl;
        effectiveAssignedTo = LISETH_ID;
      } else if (assignedUserId === FATUMATA_ID || assignedUserId === OMAR_ID) {
        defaultWaUrl = waOmarUrl;
        effectiveAssignedTo = FATUMATA_ID;
      } else if (assignedUserId === ALBA_ID || assignedUserId === ALBA_LEGACY_ID || assignedUserId === MICHELLE_ID) {
        defaultWaUrl = waMichelleUrl;
        effectiveAssignedTo = ALBA_ID;
      } else if (assignedUserId === ALEX_ID) {
        defaultWaUrl = waAlexUrl;
        effectiveAssignedTo = ALEX_ID;
      } else if (isGenio) {
        defaultWaUrl = waAyslanUrl;
        effectiveAssignedTo = AYSLAN_ID;
      } else if (isItalyLead) {
        defaultWaUrl = waGiadaUrl;
        effectiveAssignedTo = GIADA_ID;
      } else if (isFranceLead) {
        defaultWaUrl = waOmarUrl;
        effectiveAssignedTo = FATUMATA_ID;
      } else if (isTriangulo) {
        defaultWaUrl = waMichelleUrl;
        effectiveAssignedTo = ALBA_ID;
      } else if (isLuminous) {
        defaultWaUrl = waAlexUrl;
        effectiveAssignedTo = ALEX_ID;
      }

      // Substituição de placeholders dinâmicos
      const rawHtml = template.html_content;
      const rawSubject = template.subject;

      const targetLeadId = item.lead_id || lead.id;
      const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://mcs.gestaologinpro.com";
      const unsubscribeLink = `${appUrl}/public/coleta-dados/${targetLeadId}?opt_out=1`;
      const formatVars = (text: string) => {
        let res = text
          .replace(/\{\{\s*name\s*\}\}/g, lead.name || "")
          .replace(/\{\{\s*company_name\s*\}\}/g, lead.company_name || "")
          .replace(/\{\{\s*email\s*\}\}/g, lead.email || "")
          .replace(/\{\{\s*phone\s*\}\}/g, lead.phone || "")
          .replace(/\{\{\s*lead_id\s*\}\}/g, targetLeadId || "")
          .replace(/\{\{\s*lead\.id\s*\}\}/g, targetLeadId || "")
          .replace(/\{\{\s*id\s*\}\}/g, targetLeadId || "")
          .replace(/\{\{\s*empresa_id\s*\}\}/g, campaign.empresa_id || "")
          .replace(/\{\{\s*empresa\.id\s*\}\}/g, campaign.empresa_id || "")
          .replace(/\{\{\s*form_url\s*\}\}/g, `${appUrl}/public/coleta-dados/${targetLeadId}?empresa_id=${campaign.empresa_id}`)
          .replace(/\{\{\s*presupuesto_url\s*\}\}/g, `${appUrl}/public/solicitar-presupuesto?lead_id=${targetLeadId}&empresa_id=${campaign.empresa_id}`)
          .replace(/\{\{\s*opt_out_url\s*\}\}/g, unsubscribeLink)
          .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, unsubscribeLink)
          .replace(/\{\{\{\s*RESEND_UNSUBSCRIBE_URL\s*\}\}\}/gi, unsubscribeLink)
          .replace(/\{\{\s*RESEND_UNSUBSCRIBE_URL\s*\}\}/gi, unsubscribeLink)
          .replace(/\*\|UNSUB\|\*/gi, unsubscribeLink)
          .replace(/\*\|UNSUBSCRIBE\|\*/gi, unsubscribeLink)
          .replace(/%UNSUBSCRIBE_URL%/gi, unsubscribeLink)
          // Sanitizar caminhos de imagens relativos, domínios gratuitos bloqueados (iili.io) e Base64 pesados
          .replace(/(src=["'])assets\/images\//gi, `$1${appUrl}/assets/images/`)
          .replace(/https:\/\/iili\.io\/nwMkkSn\.png/gi, `${appUrl}/assets/images/luminous-mkt06-logo.png`)
          .replace(/https:\/\/iili\.io\/nhyf4R9\.png/gi, `${appUrl}/assets/images/luminous-mkt05-logo.png`)
          .replace(/src=["']data:image\/[a-zA-Z]+;base64,[^"']{500,}["']/gi, `src="${appUrl}/assets/images/wiseowe-logo.png"`)
          // Variáveis explícitas por vendedor (link direto oficial wa.me para máxima entregabilidade sem redirecionamento cruzado de domínio)
          .replace(/\{\{\s*whatsapp_url_fatumata\s*\}\}/g, waOmarUrl)
          .replace(/\{\{\s*whatsapp_url_omar\s*\}\}/g, waOmarUrl)
          .replace(/\{\{\s*whatsapp_url_liseth\s*\}\}/g, waLisethUrl)
          .replace(/\{\{\s*whatsapp_url_alba\s*\}\}/g, waMichelleUrl)
          .replace(/\{\{\s*whatsapp_url_michelle\s*\}\}/g, waMichelleUrl)
          .replace(/\{\{\s*whatsapp_url_giada\s*\}\}/g, waGiadaUrl)
          .replace(/\{\{\s*whatsapp_url_alex\s*\}\}/g, waAlexUrl)
          .replace(/\{\{\s*whatsapp_url_ayslan\s*\}\}/g, waAyslanUrl)
          // Variável genérica inteligente (respeita template/vendedor atribuído, país do lead e empresa)
          .replace(/\{\{\s*whatsapp_url\s*\}\}/g, defaultWaUrl);

        return res;
      };

      const rawFormattedHtml = formatVars(rawHtml);
      const emailSubject = formatVars(rawSubject);
      const plainTextBody = stripHtmlToText(rawFormattedHtml);

      // Corpo HTML limpo (sem pixel 1x1 oculto de domínio externo para evitar classificação de spam/phishing)
      const htmlBody = rawFormattedHtml;
      
      // Resolução inteligente do Remetente (Subdomínio Resend) e Reply-To (Outlook M365) por Comercial, Empresa e País
      let validSenderEmail =
        campaign.sender_email ||
        assignedUser?.marketing_sender_email ||
        company?.marketing_sender_email ||
        company?.proposal_sender_email ||
        "comercial1@mail.luminousalley.com";
      let senderName = company?.trade_name || "Comercial";
      let validReplyTo =
        campaign.reply_to_email ||
        assignedUser?.commercial_email ||
        company?.proposal_sender_email ||
        "comercial1@luminousalley.com";

      if (companyTrade.includes("TRIANGULO") || companyTrade.includes("TRIÂNGULO") || isTriangulo) {
        if (isItalyLead) {
          validSenderEmail = "commerciale@it.triangulolda.com";
          senderName = "Triangolo Servizi Industriali";
          validReplyTo = "commerciale@triangulolda.com";
        } else {
          validSenderEmail = (campaign.sender_email || assignedUser?.marketing_sender_email || company?.marketing_sender_email_es || "comercial4@es.triangulolda.com").replace(/^comercial2@/i, "comercial4@");
          senderName = "Triángulo Servicios Industriales";
          validReplyTo = (campaign.reply_to_email || assignedUser?.commercial_email || company?.proposal_sender_email_es || "comercial4@triangulolda.com").replace(/^comercial2@/i, "comercial4@");
        }
      } else if (companyTrade.includes("WISEOWE") || isWiseowe) {
        if (isItalyWiseowe) {
          // Giada - Wiseowe Itália (comercial4@it.wiseowe.com e Reply-To comercial4@wiseowe.com)
          validSenderEmail = "comercial4@it.wiseowe.com";
          senderName = "Wiseowe Servizi Industriali";
          validReplyTo = "comercial4@wiseowe.com";
        } else if (isSpainWiseowe) {
          // Liseth - Wiseowe Espanha (SEMPRE comercial2@es.wiseowe.com e Reply-To comercial2@wiseowe.com)
          validSenderEmail = "comercial2@es.wiseowe.com";
          senderName = "Wiseowe Servicios Industriales";
          validReplyTo = "comercial2@wiseowe.com";
        } else {
          // Fatumata - Wiseowe França (SEMPRE comercial3@fr.wiseowe.com e Reply-To comercial3@wiseowe.com)
          validSenderEmail = "comercial3@fr.wiseowe.com";
          senderName = "Wiseowe Industrie";
          validReplyTo = "comercial3@wiseowe.com";
        }
      } else if (companyTrade.includes("LUMINOUS") || isLuminous) {
        validSenderEmail = campaign.sender_email || assignedUser?.marketing_sender_email || company?.marketing_sender_email_es || "comercial1@mail.luminousalley.com";
        senderName = "Alex - Luminous Alley";
        validReplyTo = campaign.reply_to_email || assignedUser?.commercial_email || company?.proposal_sender_email_es || "comercial1@luminousalley.com";
      } else if (isGenio || assignedUserId === AYSLAN_ID) {
        validSenderEmail = campaign.sender_email || assignedUser?.marketing_sender_email || company?.marketing_sender_email || "comercial5@es.geniomontagens.com";
        senderName = "Génio Montagens Industriales";
        validReplyTo = campaign.reply_to_email || assignedUser?.commercial_email || company?.proposal_sender_email || "comercial5@geniomontagens.com";
      } else {
        const lowerSender = validSenderEmail.toLowerCase();
        if (
          !lowerSender.includes("triangulolda.com") &&
          !lowerSender.includes("wiseowe.com") &&
          !lowerSender.includes("luminousalley.com") &&
          !lowerSender.includes("geniomontagens.com") &&
          !lowerSender.includes("gestaologinpro.com") &&
          !lowerSender.includes("universatv.com") &&
          !lowerSender.includes("mastercorp")
        ) {
          validSenderEmail = "alex@mail.gestaologinpro.com";
        }
        validReplyTo = validReplyTo || validSenderEmail;
      }

      const fromHeader = `${senderName} <${validSenderEmail}>`;

      try {
        if (!resendApiKey) {
          // Modo Simulação (caso não haja API Key configurada em Dev)
          console.log(`[SIMULAÇÃO] Enviando e-mail de campanha:
            De: ${fromHeader}
            Para: ${lead.email}
            Assunto: ${emailSubject}
          `);
          
          await supabase
            .from("marketing_campaign_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", item.id);
            
          // Atualizar o estágio do lead para 'E-mail Enviado' se ele estiver no estágio padrão
          await updateLeadStageToSent(supabase, targetLeadId, lead.email, campaign.empresa_id, effectiveAssignedTo);

        } else {
          // 1. Verificar se o lead está em quarentena (Bounce ou E-mail Inválido)
          const leadTagsArr = Array.isArray(lead.tags) ? lead.tags : [];
          if (leadTagsArr.includes("Bounce") || leadTagsArr.includes("E-mail Inválido")) {
            console.log(`[PULANDO] Lead ${lead.email} está em quarentena (Bounce/Inválido).`);
            await supabase
              .from("marketing_campaign_queue")
              .update({
                status: "failed",
                error_message: "E-mail em quarentena de entrega (Bounce prévio ou Inválido)",
              })
              .eq("id", item.id);
            continue;
          }

          // 2. Higienização e descolamento de sintaxe de e-mail inteligente
          let cleanLeadEmail = (lead.email || "")
            .toLowerCase()
            .trim()
            .replace(/^mailto:/i, "")
            .replace(/^[<"'\(\[\{]+|[>"'\)\]\}\.,;:]+$/g, "");

          // Desgrudar extensões coladas
          const tlds = ["com.es", "nom.es", "org.es", "gob.es", "edu.es", "com", "es", "pt", "it", "fr", "net", "org", "eu", "cat", "gal", "eus", "info", "biz", "co", "io"];
          if (cleanLeadEmail.includes("@")) {
            const [u, d] = cleanLeadEmail.split("@");
            if (u && d) {
              let cleanD = d;
              for (const tld of tlds) {
                const escaped = tld.replace(".", "\\.");
                const regex = new RegExp(`^(.+\\.${escaped})[a-z]{3,}$`, "i");
                if (regex.test(cleanD)) {
                  const match = cleanD.match(regex);
                  if (match) {
                    cleanD = match[1];
                    break;
                  }
                }
              }
              cleanLeadEmail = `${u}@${cleanD}`;
            }
          }

          const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
          if (!emailRegex.test(cleanLeadEmail) || /\.(png|jpg|jpeg|avif|webp|svg|gif|bmp|ico|pdf)$/i.test(cleanLeadEmail)) {
            console.warn(`[INVÁLIDO] E-mail com sintaxe incorreta descartado: ${lead.email}`);
            await supabase
              .from("marketing_campaign_queue")
              .update({
                status: "failed",
                error_message: "Formato de e-mail inválido",
              })
              .eq("id", item.id);
            continue;
          }

          // 3. Blindagem Anti-Spam de Domínios Proibidos / Provedores Pessoais Franceses (Orange/Wanadoo/Free/SFR/Fake)
          const emailDomain = cleanLeadEmail.split("@")[1] || "";
          const blockedFakeOrFrenchIspDomains = new Set([
            "exemple.com", "exemple.fr", "example.com", "domaine.fr", "domaine.com",
            "votredomaine.fr", "monsite.fr", "test.com", "test.fr", "email.com",
            "sentry.io", "wixpress.com", "orange.fr", "wanadoo.fr", "free.fr",
            "sfr.fr", "laposte.net", "bbox.fr", "neuf.fr", "aliceadsl.fr",
            "club-internet.fr", "numericable.fr", "noos.fr", "voila.fr", "cegetel.net"
          ]);
          const frenchPersonalWebmails = new Set([
            "gmail.com", "hotmail.fr", "hotmail.com", "outlook.fr", "outlook.com",
            "yahoo.fr", "yahoo.com", "live.fr", "live.com", "icloud.com", "msn.com", "aol.com"
          ]);

          if (blockedFakeOrFrenchIspDomains.has(emailDomain) || (isFranceLead && frenchPersonalWebmails.has(emailDomain))) {
            console.warn(`[PROTEÇÃO ANTI-SPAM] Domínio pessoal/bloqueado descartado na fila: ${cleanLeadEmail}`);
            await supabase
              .from("marketing_campaign_queue")
              .update({
                status: "failed",
                error_message: `Proteção Anti-Spam: Domínio não corporativo bloqueado (${emailDomain})`,
              })
              .eq("id", item.id);
            continue;
          }

          // 4. Trava de 1 E-mail por Domínio Corporativo no Lote + Cooldown Anti-Repetição (21 dias)
          // Domínios internos da empresa ficam liberados da trava de mesmo domínio e do cooldown de 21 dias para permitir testes da diretoria/equipe
          const internalWhitelistedDomains = new Set(["gestaologinpro.com", "luminousalley.com", "wiseowe.com", "triangulolda.com", "geniomontagens.com"]);
          const isInternalTestDomain = internalWhitelistedDomains.has(emailDomain);
          const genericWebmailsEs = new Set(["gmail.com", "hotmail.com", "outlook.com", "yahoo.es", "yahoo.com", "hotmail.es", "outlook.es", "live.com", "icloud.com"]);
          const isCorporateDomain = emailDomain && !isInternalTestDomain && !genericWebmailsEs.has(emailDomain) && !frenchPersonalWebmails.has(emailDomain);

          if (isCorporateDomain && sentDomainsInBatch.has(emailDomain)) {
            console.warn(`[DEDUPLICAÇÃO DOMÍNIO] Empresa ${emailDomain} já recebeu e-mail neste lote. Pulando ${cleanLeadEmail}.`);
            await supabase
              .from("marketing_campaign_queue")
              .update({
                status: "failed",
                error_message: `Proteção Anti-Spam: Outro contato do mesmo domínio (${emailDomain}) já recebeu envio`,
              })
              .eq("id", item.id);
            continue;
          }

          if (targetLeadId && !isInternalTestDomain) {
            const cooldownDate = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
            const { count: recentSentCount } = await supabase
              .from("marketing_campaign_queue")
              .select("*", { count: "exact", head: true })
              .eq("lead_id", targetLeadId)
              .eq("status", "sent")
              .gte("sent_at", cooldownDate);

            if (recentSentCount && recentSentCount > 0) {
              console.warn(`[COOLDOWN 21 DIAS] Lead ${cleanLeadEmail} já recebeu campanha nos últimos 21 dias. Bloqueando reenvio.`);
              await supabase
                .from("marketing_campaign_queue")
                .update({
                  status: "failed",
                  error_message: "Proteção Anti-Spam: Lead já recebeu e-mail nos últimos 21 dias (Bloqueio de repetição)",
                })
                .eq("id", item.id);
              continue;
            }
          }

          if (isCorporateDomain) {
            sentDomainsInBatch.add(emailDomain);
          }

          const emailPayload = {
            from: fromHeader,
            to: [cleanLeadEmail],
            reply_to: validReplyTo,
            subject: emailSubject,
            html: htmlBody,
            text: plainTextBody,
            headers: {
              "Reply-To": validReplyTo,
            },
            tags: [
              { name: "campaign_id", value: campaign.id },
              { name: "lead_id", value: item.lead_id || lead?.id },
            ],
          };

          // Envio real via API do Resend com retry e fallback de subdomínio
          let res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify(emailPayload),
          });

          // Fallback inteligente: caso es.wiseowe.com ou it.wiseowe.com ainda esteja aguardando propagação de DNS no Resend (403/422),
          // dispara imediatamente usando o subdomínio verificado da Wiseowe (fr.wiseowe.com) mantendo o Reply-To e nome da marca!
          if ((res.status === 403 || res.status === 422) && (validSenderEmail.includes("@es.wiseowe.com") || validSenderEmail.includes("@it.wiseowe.com"))) {
            const fallbackLocal = validSenderEmail.includes("@it.wiseowe.com") ? "comercial4" : "comercial3";
            console.warn(`[DNS Fallback] Subdomínio ${validSenderEmail} em propagação DNS. Utilizando fallback verificado ${fallbackLocal}@fr.wiseowe.com (Reply-To ${validReplyTo}) para ${lead.email}...`);
            const fallbackPayload = {
              ...emailPayload,
              from: `${senderName} <${fallbackLocal}@fr.wiseowe.com>`,
            };
            res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify(fallbackPayload),
            });
          } else if ((res.status === 403 || res.status === 422) && validSenderEmail.includes("geniomontagens.com")) {
            console.warn(`[DNS Fallback] Domínio geniomontagens.com não verificado no Resend. Utilizando fallback verificado alex@mail.gestaologinpro.com (mantendo Reply-To ${validReplyTo}) para ${lead.email}...`);
            const fallbackPayload = {
              ...emailPayload,
              from: `${senderName} <alex@mail.gestaologinpro.com>`,
            };
            res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify(fallbackPayload),
            });
          }

          // Se bater rate limit (429), pausa 1.5s e tenta novamente
          if (res.status === 429) {
            console.warn(`[429 Rate Limit] Pausando 1.5s para ${lead.email}...`);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify(emailPayload),
            });
          }

          const resData = await res.json();

          if (!res.ok) {
            // Se ainda for 429 após retry, não marca como falha definitiva: mantém pending para o próximo ciclo
            if (res.status === 429) {
              console.warn(`Item ${item.id} retido em pending devido a rate limit do Resend.`);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            throw new Error(`Erro na API do Resend: ${JSON.stringify(resData)}`);
          }

          console.log(`E-mail enviado para ${lead.email} via Resend. ID: ${resData.id}`);

          await supabase
            .from("marketing_campaign_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              resend_email_id: resData.id,
            })
            .eq("id", item.id);

          await updateLeadStageToSent(supabase, targetLeadId, lead.email, campaign.empresa_id, effectiveAssignedTo);

          // Delay de cadência controlado (~1350ms) entre cada disparo para evitar Greylisting/Transient Bounces
          await new Promise((resolve) => setTimeout(resolve, 1350));
        }
      } catch (err: any) {
        console.error(`Falha ao processar item da fila ${item.id}:`, err.message);
        // Se for erro de rate limit na exceção, mantém pending
        if (err.message && err.message.includes("429")) {
          console.warn(`Item ${item.id} mantido em pending.`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        await supabase
          .from("marketing_campaign_queue")
          .update({
            status: "failed",
            error_message: err.message,
          })
          .eq("id", item.id);
      }
    }

    // 5. Verificar se as campanhas processadas zeraram suas filas para marcar como 'completed'
    const processedCampaignIds = [...new Set(queueItems.map((it: any) => it.campaign_id))];
    for (const cId of processedCampaignIds) {
      const { count, error: countErr } = await supabase
        .from("marketing_campaign_queue")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", cId)
        .eq("status", "pending");

      if (!countErr && count === 0) {
        await supabase
          .from("marketing_campaigns")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", cId);
        console.log(`Campanha ${cId} foi marcada como 'completed' com sucesso!`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `${queueItems.length} itens processados.` }),
      { headers: corsHeaders(), status: 200 }
    );

  } catch (err: any) {
    console.error("Erro geral na Edge Function process-marketing-queue:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: corsHeaders(), status: 500 }
    );
  }
});

// Helper para mover o lead para a coluna 'E-mail Enviado' da empresa da campanha
async function updateLeadStageToSent(supabase: any, leadId: string | null, leadEmail: string, empresaId: string, effectiveAssignedTo?: string | null) {
  try {
    // 1. Buscar o lead prioritariamente pelo ID exato da fila (evita colisão de e-mail entre empresas)
    let currentLead: any = null;
    if (leadId) {
      const { data } = await supabase
        .from("leads")
        .select("id, empresa_id, stage_id, assigned_to")
        .eq("id", leadId)
        .maybeSingle();
      currentLead = data;
    }
    if (!currentLead && leadEmail) {
      const { data } = await supabase
        .from("leads")
        .select("id, empresa_id, stage_id, assigned_to")
        .eq("email", leadEmail)
        .eq("empresa_id", empresaId)
        .maybeSingle();
      currentLead = data;
    }

    if (!currentLead) return;

    // 2. Verificar estágio atual
    let currentOrderIndex = 0;
    if (currentLead.stage_id) {
      const { data: curStage } = await supabase
        .from("kanban_stages")
        .select("order_index")
        .eq("id", currentLead.stage_id)
        .maybeSingle();
      if (curStage) currentOrderIndex = curStage.order_index;
    }

    const TRIANGULO_ID = "a798620a-358a-4c6c-9db2-3a507c583cac";
    const WISEOWE_ID = "dae64d51-2181-4510-b14f-e63d2f111a8e";

    // NUNCA roubar empresa_id de outra empresa se o lead já pertence a uma empresa!
    const targetEmpresaId = currentLead.empresa_id || empresaId;

    const shouldUpdateOwner = Boolean(effectiveAssignedTo && targetEmpresaId === empresaId);

    // Buscar estágio 'E-mail Enviado' prioritariamente pelo NOME para targetEmpresaId
    let stageId: string | null = null;
    let targetStageOrderIndex = 2;
    if (targetEmpresaId) {
      const { data: namedStage } = await supabase
        .from("kanban_stages")
        .select("id, order_index")
        .eq("empresa_id", targetEmpresaId)
        .or("name.ilike.%enviado%,name_es.ilike.%enviado%")
        .limit(1)
        .maybeSingle();

      if (namedStage) {
        stageId = namedStage.id;
        targetStageOrderIndex = namedStage.order_index || 2;
      }
    }

    if (!stageId && targetEmpresaId) {
      const { data: fallbackStage } = await supabase
        .from("kanban_stages")
        .select("id, order_index")
        .eq("empresa_id", targetEmpresaId)
        .eq("order_index", 2)
        .limit(1)
        .maybeSingle();
      if (fallbackStage) {
        stageId = fallbackStage.id;
        targetStageOrderIndex = fallbackStage.order_index || 2;
      }
    }

    // Regra de avanço seguro: NUNCA regredir lead que já avançou (currentOrderIndex >= targetStageOrderIndex)
    if (currentOrderIndex >= targetStageOrderIndex) {
      const ownerPayload: any = {};
      if (targetEmpresaId && targetEmpresaId !== currentLead.empresa_id) {
        ownerPayload.empresa_id = targetEmpresaId;
      }
      if (shouldUpdateOwner && effectiveAssignedTo !== currentLead.assigned_to) {
        ownerPayload.assigned_to = effectiveAssignedTo;
      }
      if (Object.keys(ownerPayload).length > 0) {
        ownerPayload.updated_at = new Date().toISOString();
        await supabase
          .from("leads")
          .update(ownerPayload)
          .eq("id", currentLead.id);
      }
      return;
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (targetEmpresaId) {
      updatePayload.empresa_id = targetEmpresaId;
    }
    if (shouldUpdateOwner && effectiveAssignedTo) {
      updatePayload.assigned_to = effectiveAssignedTo;
    }
    if (stageId) {
      updatePayload.stage_id = stageId;
    }

    await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", currentLead.id);
  } catch (e: any) {
    console.error("Erro ao atualizar estágio do lead:", e);
  }
}
