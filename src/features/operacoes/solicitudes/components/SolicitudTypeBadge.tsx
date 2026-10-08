import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FilePlus, RefreshCw, MapPin, Wrench, Microscope, UserMinus, FileEdit, AlertTriangle, CalendarDays, ClipboardCheck, XCircle, PauseCircle, PlayCircle } from 'lucide-react';

interface Props {
  tipo: 'new_order' | 'replacement' | 'relocation' | 'technical_test' | 'field_trial' | 'offboarding' | 'scope_change' | 'incident' | 'order_extension' | 'order_termination' | 'order_postponement' | 'order_cancellation' | 'cancellation' | 'order_pause' | 'order_resume';
  className?: string;
}

export function SolicitudTypeBadge({ tipo, className }: Props) {
  const { t } = useTranslation();

  const config = {
    new_order: { label: t('solicitud_types.new_order', 'Novo Pedido'), color: 'bg-indigo-500/10 text-indigo-500', icon: FilePlus },
    replacement: { label: t('solicitud_types.replacement', 'Reemplazo'), color: 'bg-purple-500/10 text-purple-500', icon: RefreshCw },
    relocation: { label: t('solicitud_types.relocation', 'Reubicación'), color: 'bg-pink-500/10 text-pink-500', icon: MapPin },
    technical_test: { label: t('solicitud_types.technical_test', 'Prueba Técnica'), color: 'bg-cyan-500/10 text-cyan-500', icon: Wrench },
    field_trial: { label: t('solicitud_types.field_trial', 'Prueba en Obra'), color: 'bg-teal-500/10 text-teal-500', icon: Microscope },
    offboarding: { label: t('solicitud_types.offboarding', 'Baja'), color: 'bg-rose-500/10 text-rose-500', icon: UserMinus },
    scope_change: { label: t('solicitud_types.scope_change', 'Cambio Alcance'), color: 'bg-amber-500/10 text-amber-500', icon: FileEdit },
    incident: { label: t('solicitud_types.incident', 'Incidencia'), color: 'bg-red-500/10 text-red-500', icon: AlertTriangle },
    order_extension: { label: t('solicitud_types.order_extension', 'Prorrogação de Obra'), color: 'bg-emerald-500/10 text-emerald-500', icon: CalendarDays },
    order_termination: { label: t('solicitud_types.order_termination', 'Finalização de Obra'), color: 'bg-slate-500/10 text-slate-500', icon: ClipboardCheck },
    order_postponement: { label: t('solicitud_types.order_postponement', 'Adiamento de Início'), color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: CalendarDays },
    order_cancellation: { label: t('solicitud_types.order_cancellation', 'Cancelamento de Pedido'), color: 'bg-rose-500/10 text-rose-600 dark:text-rose-450', icon: XCircle },
    cancellation: { label: t('solicitud_types.cancellation', 'Cancelamento'), color: 'bg-rose-500/10 text-rose-600 dark:text-rose-450', icon: XCircle },
    order_pause: { label: t('solicitud_types.order_pause', 'Pausa de Pedido'), color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold', icon: PauseCircle },
    order_resume: { label: t('solicitud_types.order_resume', 'Retomada de Pedido'), color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold', icon: PlayCircle },
  };

  const { label, color, icon: Icon } = config[tipo] || config.new_order;

  return (
    <Badge variant="outline" className={cn('border-none font-medium', color, className)}>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
