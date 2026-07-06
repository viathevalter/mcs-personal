import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FilePlus, RefreshCw, MapPin, Wrench, Microscope, UserMinus, FileEdit, AlertTriangle, CalendarDays, ClipboardCheck } from 'lucide-react';

interface Props {
  tipo: 'new_order' | 'replacement' | 'relocation' | 'technical_test' | 'field_trial' | 'offboarding' | 'scope_change' | 'incident' | 'order_extension' | 'order_termination';
  className?: string;
}

export function SolicitudTypeBadge({ tipo, className }: Props) {
  const config = {
    new_order: { label: 'Novo Pedido', color: 'bg-indigo-500/10 text-indigo-500', icon: FilePlus },
    replacement: { label: 'Reemplazo', color: 'bg-purple-500/10 text-purple-500', icon: RefreshCw },
    relocation: { label: 'Reubicación', color: 'bg-pink-500/10 text-pink-500', icon: MapPin },
    technical_test: { label: 'Prueba Técnica', color: 'bg-cyan-500/10 text-cyan-500', icon: Wrench },
    field_trial: { label: 'Prueba en Obra', color: 'bg-teal-500/10 text-teal-500', icon: Microscope },
    offboarding: { label: 'Baja', color: 'bg-rose-500/10 text-rose-500', icon: UserMinus },
    scope_change: { label: 'Cambio Alcance', color: 'bg-amber-500/10 text-amber-500', icon: FileEdit },
    incident: { label: 'Incidencia', color: 'bg-red-500/10 text-red-500', icon: AlertTriangle },
    order_extension: { label: 'Prorrogação de Obra', color: 'bg-emerald-500/10 text-emerald-500', icon: CalendarDays },
    order_termination: { label: 'Finalização de Obra', color: 'bg-slate-500/10 text-slate-500', icon: ClipboardCheck },
  };

  const { label, color, icon: Icon } = config[tipo] || config.new_order;

  return (
    <Badge variant="outline" className={cn('border-none font-medium', color, className)}>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
