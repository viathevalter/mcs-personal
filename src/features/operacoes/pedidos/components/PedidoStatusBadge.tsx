interface Props {
  type: 'commercial' | 'operational' | 'item' | 'solicitud' | 'task';
  status: string;
}

export function PedidoStatusBadge({ type, status }: Props) {
  let color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  let label = status;

  if (type === 'commercial') {
    switch (status) {
      case 'draft': color = 'bg-slate-100 text-slate-700'; label = 'Rascunho'; break;
      case 'active': color = 'bg-emerald-100 text-emerald-700'; label = 'Ativo'; break;
      case 'suspended': color = 'bg-amber-100 text-amber-700'; label = 'Suspenso'; break;
      case 'cancelled': color = 'bg-red-100 text-red-700'; label = 'Cancelado'; break;
      case 'completed': color = 'bg-blue-100 text-blue-700'; label = 'Finalizado'; break;
    }
  } else if (type === 'operational') {
    switch (status) {
      case 'pending_operations': color = 'bg-amber-100 text-amber-700'; label = 'Pendente'; break;
      case 'partially_fulfilled': color = 'bg-blue-100 text-blue-700'; label = 'Parcial'; break;
      case 'fulfilled': color = 'bg-emerald-100 text-emerald-700'; label = 'Atendido'; break;
    }
  } else if (type === 'item') {
    switch (status) {
      case 'pending_fulfillment': color = 'bg-amber-100 text-amber-700'; label = 'Pendente'; break;
      case 'partially_fulfilled': color = 'bg-blue-100 text-blue-700'; label = 'Parcial'; break;
      case 'fulfilled': color = 'bg-emerald-100 text-emerald-700'; label = 'Atendido'; break;
      case 'cancelled': color = 'bg-red-100 text-red-700'; label = 'Cancelado'; break;
    }
  } else if (type === 'solicitud' || type === 'task') {
    switch (status) {
      case 'pending': color = 'bg-slate-100 text-slate-700'; label = 'Pendente'; break;
      case 'in_progress': color = 'bg-blue-100 text-blue-700'; label = 'Em Progresso'; break;
      case 'blocked': color = 'bg-red-100 text-red-700'; label = 'Bloqueada'; break;
      case 'completed': color = 'bg-emerald-100 text-emerald-700'; label = 'Concluída'; break;
      case 'cancelled': color = 'bg-slate-200 text-slate-500'; label = 'Cancelada'; break;
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}
