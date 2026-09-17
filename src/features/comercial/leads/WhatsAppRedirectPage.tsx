import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { Loader2 } from 'lucide-react';

export function WhatsAppRedirectPage() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('lead_id');
  const destParam = searchParams.get('dest');

  useEffect(() => {
    async function trackAndRedirect() {
      // Fallback padrão seguro (Triângulo / Michelle)
      let whatsappUrl = 'https://wa.me/34937374830?text=Hola,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios';

      // 1. If explicit destination link is passed from email template, prioritize it 100%
      if (destParam) {
        try {
          whatsappUrl = decodeURIComponent(destParam);
        } catch {
          whatsappUrl = destParam;
        }
      }

      try {
        if (leadId) {
          // Fetch current lead data
          const { data: lead } = await supabase
            .schema('core_comercial')
            .from('leads')
            .select('empresa_id, stage_id, name, notes, assigned_to, tags, email, phone')
            .eq('id', leadId)
            .maybeSingle();

          if (lead) {
            // If no explicit destination was passed, resolve dynamic WhatsApp by salesperson / country / company
            if (!destParam) {
              const empId = (lead.empresa_id || '').toLowerCase();
              const isTriangulo = empId === 'a798620a-358a-4c6c-9db2-3a507c583cac';
              const isWiseowe = empId === 'dae64d51-2181-4510-b14f-e63d2f111a8e';
              const isLuminous = empId === '847796c4-b253-4e53-9e6b-34a127ec7d85';

              const leadTags = Array.isArray(lead.tags) ? lead.tags.join(' ').toLowerCase() : (typeof lead.tags === 'string' ? lead.tags.toLowerCase() : '');
              const leadEmail = (lead.email || '').toLowerCase();
              const leadPhone = (lead.phone || '').trim();

              const isItalyLead = leadTags.includes('itália') || leadTags.includes('italia') || leadTags.includes('italy') || leadTags.includes('giada') || leadEmail.endsWith('.it') || leadPhone.startsWith('+39') || leadPhone.startsWith('0039');
              const isFranceLead = leadTags.includes('frança') || leadTags.includes('francia') || leadTags.includes('france') || leadTags.includes('wiseowe') || leadEmail.endsWith('.fr') || leadPhone.startsWith('+33') || leadPhone.startsWith('0033') || isWiseowe;

              // IDs de vendedores
              const GIADA_ID = '76f9a2f5-116a-456e-a7d9-9a6a0401ac65';
              const MICHELLE_ID = 'dbc361a1-e4af-446a-8079-39c0caab00d2';
              const OMAR_ID = '346a9262-2edf-4a2e-80fc-aa5b43bf483a';
              const ALEX_ID = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7';

              const assignedUserId = lead.assigned_to;

              if (assignedUserId === GIADA_ID || isItalyLead) {
                // Giada / Itália
                whatsappUrl = 'https://wa.me/393000000000?text=Ciao%20Giada,%20vorrei%20maggiori%20informazioni%20sui%20vostri%20servizi';
              } else if (assignedUserId === OMAR_ID || isFranceLead || isWiseowe) {
                // Omar / França / Wiseowe
                whatsappUrl = 'https://wa.me/351936447734?text=Bonjour%20Omar,%20je%20souhaite%20plus%20d%27informations%20sur%20vos%20services';
              } else if (assignedUserId === ALEX_ID || isLuminous) {
                // Alex / Luminous
                whatsappUrl = 'https://wa.me/34937374180?text=Hola%20Alex,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios';
              } else {
                // Triângulo España / Michelle
                whatsappUrl = 'https://wa.me/34937374830?text=Hola%20Michelle,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios';
              }
            }

            // Detect bots / email scanners (Proofpoint, Defender, etc.)
            const userAgent = (navigator.userAgent || '').toLowerCase();
            const isBot = /bot|crawler|spider|scanner|preview|slurp|facebookexternalhit|curl|wget|headless/i.test(userAgent);

            // Check if lead is opted-out/descadastrado
            const isDescadastrado = 
              lead.name?.includes('[DESCADASTRADO]') || 
              lead.notes?.includes('Opt-out') ||
              lead.notes?.includes('[DESCADASTRADO]');

            // Check current stage order_index
            let currentOrderIndex = 0;
            if (lead.stage_id) {
              const { data: curStage } = await supabase
                .schema('core_comercial')
                .from('kanban_stages')
                .select('order_index')
                .eq('id', lead.stage_id)
                .maybeSingle();
              if (curStage) {
                currentOrderIndex = curStage.order_index;
              }
            }

            // Fetch the 'Contato Via WhatsApp' stage for this specific empresa
            const { data: targetStages } = await supabase
              .schema('core_comercial')
              .from('kanban_stages')
              .select('id, order_index')
              .eq('empresa_id', lead.empresa_id)
              .ilike('name', '%WhatsApp%')
              .limit(1);

            const targetStage = targetStages && targetStages.length > 0 ? targetStages[0] : null;

            // Only transition if not a bot, not opted-out, and current stage is lower than WhatsApp stage
            if (!isBot && !isDescadastrado && targetStage && currentOrderIndex < targetStage.order_index) {
              await supabase
                .schema('core_comercial')
                .from('leads')
                .update({
                  stage_id: targetStage.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', leadId);
            }
          }
        }
      } catch (err) {
        console.error('Failed to track WhatsApp click:', err);
      } finally {
        // Delay to ensure Supabase stage update commits before redirect
        setTimeout(() => {
          window.location.href = whatsappUrl;
        }, 350);
      }
    }

    trackAndRedirect();
  }, [leadId, destParam]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-yellow-500" />
        <div className="h-16 w-16 bg-[#061f3d] text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Redireccionando al WhatsApp...</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Por favor espere un momento mientras le comunicamos con nuestro asesor comercial.
        </p>
      </div>
    </div>
  );
}
