import { format } from 'date-fns';
import { es, fr, it, ptBR } from 'date-fns/locale';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  PhoneForwarded, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Ban, 
  User,
  Mail
} from 'lucide-react';
import type { LeadCallLog } from '../types/dialerTypes';
import { useComercialLanguage, type SupportedComercialLang } from '../utils/comercialI18n';

interface LeadCallHistoryTimelineProps {
  logs: LeadCallLog[];
  isLoading?: boolean;
  overrideLang?: SupportedComercialLang | null;
}

export function LeadCallHistoryTimeline({ logs, isLoading, overrideLang }: LeadCallHistoryTimelineProps) {
  const { tr, lang } = useComercialLanguage(overrideLang);

  const dateLocale = lang === 'fr' ? fr : lang === 'it' ? it : lang === 'es' ? es : ptBR;

  if (isLoading) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
        {tr(
          'Carregando histórico de ligações...',
          'Cargando historial de llamadas...',
          'Chargement de l’historique d’appels...',
          'Caricamento cronologia chiamate...'
        )}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="py-5 px-4 rounded-xl bg-muted/30 border border-border text-center space-y-1">
        <Phone className="w-5 h-5 text-muted-foreground/40 mx-auto" />
        <p className="text-xs font-medium text-foreground">
          {tr(
            'Nenhum histórico anterior de chamadas',
            'Sin historial previo de llamadas',
            'Aucun historique d’appel précédent',
            'Nessuna chiamata precedente registrata'
          )}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {tr(
            'Este será o primeiro contato registrado para este lead.',
            'Este será el primer contacto registrado para este cliente.',
            'Ce sera le premier contact enregistré pour ce prospect.',
            'Questo sarà il primo contatto registrato per questo cliente.'
          )}
        </p>
      </div>
    );
  }

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'answered_converted':
        return {
          label: tr('Orçamento Gerado', 'Presupuesto Generado', 'Devis Généré', 'Preventivo Generato'),
          icon: CheckCircle2,
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'answered_callback':
        return {
          label: tr('Retorno Agendado', 'Seguimiento Agendado', 'Rappel Planifié', 'Richiamo Pianificato'),
          icon: Calendar,
          color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
      case 'answered_interested':
        return {
          label: tr('Material Enviado', 'Material Enviado', 'Dossier Envoyé', 'Materiale Inviato'),
          icon: Mail,
          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'answered_rejected':
        return {
          label: tr('Sem Interesse / Recusa', 'Sin Interés / Rechazo', 'Sans Intérêt / Refus', 'Nessun Interesse / Rifiuto'),
          icon: Ban,
          color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        };
      case 'no_answer':
      case 'busy':
        return {
          label: tr('Não Atendeu / Ocupado', 'No Contestó / Ocupado', 'Pas de Réponse / Occupé', 'Non Risponde / Occupato'),
          icon: PhoneOff,
          color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'gatekeeper_blocked':
        return {
          label: tr('Recepção / Filtro', 'Recepción / Filtro', 'Standard / Filtre', 'Reception / Filtro'),
          icon: PhoneForwarded,
          color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
        };
      default:
        return {
          label: tr('Contato Efetuado', 'Contacto Realizado', 'Contact Effectué', 'Contatto Effettuato'),
          icon: PhoneCall,
          color: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  return (
    <div className="space-y-2.5">
      {logs.map((log) => {
        const badge = getOutcomeBadge(log.outcome);
        const IconComponent = badge.icon;
        const formattedDate = format(new Date(log.created_at), 'dd/MM/yyyy • HH:mm', { locale: dateLocale });

        return (
          <div 
            key={log.id} 
            className="p-3 rounded-xl bg-card border border-border space-y-2 text-xs hover:border-border transition-colors shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${badge.color}`}>
                <IconComponent className="w-3 h-3" />
                {badge.label}
              </span>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                {log.duration_seconds > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                    <Clock className="w-2.5 h-2.5" />
                    {Math.floor(log.duration_seconds / 60).toString().padStart(2, '0')}:
                    {(log.duration_seconds % 60).toString().padStart(2, '0')}
                  </span>
                )}
                <span>{formattedDate}</span>
              </div>
            </div>

            {log.notes && (
              <p className="text-foreground leading-relaxed bg-muted/40 p-2 rounded-lg border border-border font-sans text-[11px]">
                {log.notes}
              </p>
            )}

            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1 text-foreground font-medium">
                <User className="w-3 h-3 text-muted-foreground" />
                {log.user?.display_name || log.user?.email || tr('Operador', 'Comercial', 'Commercial', 'Commerciale')}
              </span>

              {log.scheduled_callback_at && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(log.scheduled_callback_at), 'dd/MM/yyyy HH:mm')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
