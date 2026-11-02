import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { MessageCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export function WhatsAppRedirectPage() {
  const [searchParams] = useSearchParams();
  const rawLeadId = searchParams.get('lead_id');
  const leadId = (rawLeadId && rawLeadId !== 'undefined' && rawLeadId !== 'null') ? rawLeadId : null;
  const destParam = searchParams.get('dest');
  const empresaParam = searchParams.get('empresa_id');

  const [isLoadingLead, setIsLoadingLead] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState(() => {
    if (destParam) {
      try {
        return decodeURIComponent(destParam);
      } catch {
        return destParam;
      }
    }
    return 'https://wa.me/34937374830';
  });
  const [targetStageId, setTargetStageId] = useState<string | null>(null);
  const [, setCurrentOrderIndex] = useState(0);
  const [isOptedOut, setIsOptedOut] = useState(false);

  // Informações de apresentação visual
  const [salespersonName, setSalespersonName] = useState('Consultor Comercial');
  const [companyName, setCompanyName] = useState('Atendimento Comercial');
  const [language, setLanguage] = useState<'fr' | 'es' | 'it'>('es');

  useEffect(() => {
    async function resolveContext() {
      // 1. URLs oficiais por comercial
      const waFatumataDefault = 'https://wa.me/33176210655?text=Bonjour%20Fatumata,%20je%20souhaite%20plus%20d%27informations%20sur%20vos%20services';
      const waLisethDefault = 'https://wa.me/34937371540?text=Hola%20Liseth,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios';
      const waAlbaDefault = 'https://wa.me/34937374830?text=Hola%20Alba,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios';
      const waAlexDefault = 'https://wa.me/34937374180?text=Hola%20Alex,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios';
      const waGiadaDefault = 'https://wa.me/393000000000?text=Ciao%20Giada,%20vorrei%20maggiori%20informazioni%20sui%20vostri%20servizi';

      let currentWaUrl = waAlbaDefault;
      let currentLang: 'fr' | 'es' | 'it' = 'es';
      let currentSalesperson = 'Alba';
      let currentCompany = 'Triángulo Servicios Industriales';
      let hasExplicitSeller = false;

      // 2. Análise Imediata do Destino Explícito (dest) se informado
      let explicitDest = '';
      if (destParam) {
        try {
          explicitDest = decodeURIComponent(destParam);
        } catch {
          explicitDest = destParam;
        }

        // Migração automática de links antigos (Omar -> Fatumata, Michelle -> Alba, Liseth antigo -> novo)
        explicitDest = explicitDest
          .replace(/351936447734/g, '33176210655')
          .replace(/34652519210/g, '34937371540')
          .replace(/Bonjour(%20|\s+)Omar/gi, 'Bonjour%20Fatumata')
          .replace(/Hola(%20|\s+)Mit?chelle/gi, 'Hola%20Alba');

        currentWaUrl = explicitDest;
        const lowerDest = explicitDest.toLowerCase();

        if (
          explicitDest.includes('34937371540') ||
          lowerDest.includes('liseth') ||
          lowerDest.includes('es.wiseowe')
        ) {
          currentLang = 'es';
          currentSalesperson = 'Liseth';
          currentCompany = 'Wiseowe Servicios Industriales';
          hasExplicitSeller = true;
        } else if (
          explicitDest.includes('33176210655') ||
          lowerDest.includes('fatumata') ||
          lowerDest.includes('omar') ||
          lowerDest.includes('wiseowe')
        ) {
          currentLang = 'fr';
          currentSalesperson = 'Fatumata';
          currentCompany = 'Wiseowe Industrie';
          if (!explicitDest.includes('33176210655')) {
            currentWaUrl = waFatumataDefault;
          }
          hasExplicitSeller = true;
        } else if (
          explicitDest.includes('34937374180') ||
          lowerDest.includes('luminous') ||
          lowerDest.includes('alex')
        ) {
          currentLang = 'es';
          currentSalesperson = 'Alex';
          currentCompany = 'Luminous Alley';
          hasExplicitSeller = true;
        } else if (
          explicitDest.includes('393000000000') ||
          explicitDest.includes('+39') ||
          lowerDest.includes('it.triangulolda') ||
          lowerDest.includes('giada')
        ) {
          currentLang = 'it';
          currentSalesperson = 'Giada';
          currentCompany = 'Triangolo Servizi Industriali';
          hasExplicitSeller = true;
        } else if (
          explicitDest.includes('34937374830') ||
          lowerDest.includes('triangulo') ||
          lowerDest.includes('alba') ||
          lowerDest.includes('michelle') ||
          lowerDest.includes('mitchelle')
        ) {
          currentLang = 'es';
          currentSalesperson = 'Alba';
          currentCompany = 'Triángulo Servicios Industriales';
          hasExplicitSeller = true;
        }
      }

      // 3. Análise Imediata da Empresa (empresa_id) se informada
      if (!hasExplicitSeller && empresaParam) {
        const emp = empresaParam.toLowerCase();
        if (emp === 'dae64d51-2181-4510-b14f-e63d2f111a8e') {
          // Wiseowe (default FR Fatumata, pode ser sobrescrito pelo lead abaixo se for ES Liseth)
          currentLang = 'fr';
          currentSalesperson = 'Fatumata';
          currentCompany = 'Wiseowe Industrie';
          if (!destParam) currentWaUrl = waFatumataDefault;
          hasExplicitSeller = true;
        } else if (emp === '847796c4-b253-4e53-9e6b-34a127ec7d85') {
          // Luminous (Alex)
          currentLang = 'es';
          currentSalesperson = 'Alex';
          currentCompany = 'Luminous Alley';
          if (!destParam) currentWaUrl = waAlexDefault;
          hasExplicitSeller = true;
        } else if (emp === 'a798620a-358a-4c6c-9db2-3a507c583cac') {
          // Triángulo (Alba)
          currentLang = 'es';
          currentSalesperson = 'Alba';
          currentCompany = 'Triángulo Servicios Industriales';
          if (!destParam) currentWaUrl = waAlbaDefault;
          hasExplicitSeller = true;
        }
      }

      // 4. Se houver leadId com formato UUID válido, buscar informações detalhadas no banco
      const isValidUUID = Boolean(leadId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId));

      try {
        if (isValidUUID && leadId) {
          const { data: lead, error: leadErr } = await supabase
            .schema('core_comercial')
            .from('leads')
            .select('empresa_id, stage_id, name, notes, assigned_to, tags, email, phone')
            .eq('id', leadId)
            .maybeSingle();

          if (!leadErr && lead) {
            const empId = (lead.empresa_id || '').toLowerCase();
            const isTriangulo = empId === 'a798620a-358a-4c6c-9db2-3a507c583cac';
            const isWiseowe = empId === 'dae64d51-2181-4510-b14f-e63d2f111a8e';
            const isLuminous = empId === '847796c4-b253-4e53-9e6b-34a127ec7d85';

            const leadTags = Array.isArray(lead.tags)
              ? lead.tags.join(' ').toLowerCase()
              : typeof lead.tags === 'string'
              ? lead.tags.toLowerCase()
              : '';
            const leadNotes = (lead.notes || '').toLowerCase();
            const leadEmail = (lead.email || '').toLowerCase();
            const leadPhone = (lead.phone || '').trim();

            const isItalyLead =
              leadTags.includes('itália') ||
              leadTags.includes('italia') ||
              leadTags.includes('italy') ||
              leadTags.includes('giada') ||
              leadEmail.endsWith('.it') ||
              leadPhone.startsWith('+39') ||
              leadPhone.startsWith('0039');

            const isSpainWiseoweLead =
              isWiseowe &&
              (leadTags.includes('liseth') ||
                leadTags.includes('espanha') ||
                leadTags.includes('españa') ||
                leadNotes.includes('liseth') ||
                leadEmail.endsWith('.es') ||
                leadPhone.startsWith('+34') ||
                leadPhone.startsWith('0034'));

            const isFranceLead =
              !isSpainWiseoweLead &&
              (leadTags.includes('frança') ||
                leadTags.includes('francia') ||
                leadTags.includes('france') ||
                leadTags.includes('fatumata') ||
                leadTags.includes('omar') ||
                leadEmail.endsWith('.fr') ||
                leadPhone.startsWith('+33') ||
                leadPhone.startsWith('0033') ||
                isWiseowe);

            // Verificar se o lead está descadastrado / opt-out
            const optedOut =
              lead.name?.includes('[DESCADASTRADO]') ||
              lead.notes?.includes('Opt-out') ||
              lead.notes?.includes('[DESCADASTRADO]');
            setIsOptedOut(Boolean(optedOut));

            // Configurar contexto de vendedor e idioma
            const GIADA_ID = '76f9a2f5-116a-456e-a7d9-9a6a0401ac65';
            const ALBA_ID = 'ca69863d-998b-4bad-865a-19720e7a1f67';
            const LISETH_ID = 'cdc74a13-e41a-4fa5-b51b-5a27b8f310fa';
            const FATUMATA_ID = '2a25dd76-8a1b-44ea-8ea9-47e9232beee2';
            const OMAR_ID = '346a9262-2edf-4a2e-80fc-aa5b43bf483a';
            const ALEX_ID = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7';

            const assignedUserId = lead.assigned_to;

            if (assignedUserId === LISETH_ID || isSpainWiseoweLead) {
              currentLang = 'es';
              currentSalesperson = 'Liseth';
              currentCompany = 'Wiseowe Servicios Industriales';
              if (!destParam || currentWaUrl === waFatumataDefault) currentWaUrl = waLisethDefault;
            } else if (!hasExplicitSeller) {
              if (assignedUserId === GIADA_ID || isItalyLead) {
                currentLang = 'it';
                currentSalesperson = 'Giada';
                currentCompany = 'Triangolo Servizi Industriali';
                if (!destParam) currentWaUrl = waGiadaDefault;
              } else if (assignedUserId === FATUMATA_ID || assignedUserId === OMAR_ID || isFranceLead) {
                currentLang = 'fr';
                currentSalesperson = 'Fatumata';
                currentCompany = 'Wiseowe Industrie';
                if (!destParam) currentWaUrl = waFatumataDefault;
              } else if (assignedUserId === ALEX_ID || isLuminous) {
                currentLang = 'es';
                currentSalesperson = 'Alex';
                currentCompany = 'Luminous Alley';
                if (!destParam) currentWaUrl = waAlexDefault;
              } else if (assignedUserId === ALBA_ID || isTriangulo) {
                currentLang = 'es';
                currentSalesperson = 'Alba';
                currentCompany = 'Triángulo Servicios Industriales';
                if (!destParam) currentWaUrl = waAlbaDefault;
              } else {
                currentLang = 'es';
                currentSalesperson = 'Alba';
                currentCompany = 'Triángulo Servicios Industriales';
                if (!destParam) currentWaUrl = waAlbaDefault;
              }
            }

            // Buscar order_index do estágio atual
            if (lead.stage_id) {
              const { data: curStage } = await supabase
                .schema('core_comercial')
                .from('kanban_stages')
                .select('order_index')
                .eq('id', lead.stage_id)
                .maybeSingle();
              if (curStage) {
                setCurrentOrderIndex(curStage.order_index);
              }
            }

            // Buscar o estágio de 'Contato Via WhatsApp' para esta empresa
            const targetEmpId = lead.empresa_id || empresaParam;
            if (targetEmpId) {
              const { data: targetStages } = await supabase
                .schema('core_comercial')
                .from('kanban_stages')
                .select('id, order_index')
                .eq('empresa_id', targetEmpId)
                .ilike('name', '%WhatsApp%')
                .limit(1);

              if (targetStages && targetStages.length > 0) {
                setTargetStageId(targetStages[0].id);
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro ao resolver contexto do WhatsApp no banco:', err);
      } finally {
        setResolvedUrl(currentWaUrl);
        setLanguage(currentLang);
        setSalespersonName(currentSalesperson);
        setCompanyName(currentCompany);
        setIsLoadingLead(false);
      }
    }

    resolveContext();
  }, [leadId, destParam, empresaParam]);

  // Executado APENAS quando o usuário humano clica no botão
  const handleOpenWhatsApp = async () => {
    setIsConnecting(true);

    try {
      // 1. Anti-Bot Real: Só move o card para a etapa 5 ('Contato Via WhatsApp')
      // quando um humano REAL clica no botão, e o lead não estiver descadastrado
      if (leadId && targetStageId && !isOptedOut) {
        await supabase
          .schema('core_comercial')
          .from('leads')
          .update({
            stage_id: targetStageId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', leadId);
      }
    } catch (e) {
      console.error('Falha ao registrar contato via WhatsApp:', e);
    } finally {
      // 2. Abrir o WhatsApp
      window.location.href = resolvedUrl;
    }
  };

  const copy = {
    fr: {
      title: `Contacter ${salespersonName} sur WhatsApp`,
      subtitle: `Discutez en direct avec votre conseillère commerciale chez ${companyName}.`,
      btn: 'Démarrer la conversation sur WhatsApp',
      connecting: 'Connexion à WhatsApp en cours...',
      security: 'Lien direct et sécurisé vérifié',
    },
    es: {
      title: `Contactar con ${salespersonName} por WhatsApp`,
      subtitle: `Chatee en directo con su asesor comercial de ${companyName}.`,
      btn: 'Iniciar conversación en WhatsApp',
      connecting: 'Conectando con WhatsApp...',
      security: 'Enlace directo y seguro verificado',
    },
    it: {
      title: `Contatta ${salespersonName} su WhatsApp`,
      subtitle: `Parla direttamente con la tua consulente commerciale di ${companyName}.`,
      btn: 'Avvia conversazione su WhatsApp',
      connecting: 'Connessione a WhatsApp...',
      security: 'Collegamento diretto e sicuro verificato',
    },
  }[language];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Barra de destaque superior */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-green-400" />

        {/* Ícone do WhatsApp */}
        <div className="h-20 w-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <MessageCircle className="h-10 w-10 fill-emerald-500/20 stroke-emerald-400" />
        </div>

        {/* Empresa & Título */}
        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 mb-3 tracking-wide uppercase">
          {companyName}
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
          {copy.title}
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          {copy.subtitle}
        </p>

        {/* Botão de Ação Humana - 100% Imune a Scanners de Antivírus */}
        <button
          onClick={handleOpenWhatsApp}
          disabled={isLoadingLead || isConnecting}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/30 transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed group cursor-pointer"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{copy.connecting}</span>
            </>
          ) : (
            <>
              <span>{copy.btn}</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>

        {/* Selo de Segurança */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500/70" />
          <span>{copy.security}</span>
        </div>
      </div>
    </div>
  );
}
