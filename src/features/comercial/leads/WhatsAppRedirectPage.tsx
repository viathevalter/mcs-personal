import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { Loader2 } from 'lucide-react';

export function WhatsAppRedirectPage() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('lead_id');

  useEffect(() => {
    async function trackAndRedirect() {
      // Default WhatsApp Link for salesperson Alex (+34 937 37 41 80)
      const whatsappUrl = 'https://wa.me/34937374180?text=Hola%20Alex,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios';

      try {
        if (leadId) {
          // Fetch current lead data
          const { data: lead } = await supabase
            .schema('core_comercial')
            .from('leads')
            .select('empresa_id, stage_id')
            .eq('id', leadId)
            .maybeSingle();

          if (lead && lead.empresa_id) {
            // Fetch the 'Contato Via WhatsApp' stage for this specific empresa
            const { data: targetStages } = await supabase
              .schema('core_comercial')
              .from('kanban_stages')
              .select('id, order_index')
              .eq('empresa_id', lead.empresa_id)
              .ilike('name', '%WhatsApp%')
              .limit(1);

            const targetStage = targetStages && targetStages.length > 0 ? targetStages[0] : null;

            if (targetStage) {
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
        // Small delay to ensure Supabase connection is fully committed
        setTimeout(() => {
          window.location.href = whatsappUrl;
        }, 500);
      }
    }

    trackAndRedirect();
  }, [leadId]);

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
