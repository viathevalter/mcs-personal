import { useTranslation } from 'react-i18next';

interface Props {
  type: 'commercial' | 'operational' | 'item' | 'solicitud' | 'task';
  status: string;
}

export function PedidoStatusBadge({ type, status }: Props) {
  const { t } = useTranslation();
  let color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  let label = status;

  if (type === 'commercial') {
    switch (status) {
      case 'draft': color = 'bg-slate-100 text-slate-700'; label = t('cockpit_pedidos.status.commercial.draft'); break;
      case 'active': color = 'bg-emerald-100 text-emerald-700'; label = t('cockpit_pedidos.status.commercial.active'); break;
      case 'suspended': color = 'bg-amber-100 text-amber-700'; label = t('cockpit_pedidos.status.commercial.suspended'); break;
      case 'cancelled': color = 'bg-red-100 text-red-700'; label = t('cockpit_pedidos.status.commercial.cancelled'); break;
      case 'completed': color = 'bg-blue-100 text-blue-700'; label = t('cockpit_pedidos.status.commercial.completed'); break;
      case 'paused': color = 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-semibold'; label = t('cockpit_pedidos.status.commercial.paused'); break;
    }
  } else if (type === 'operational') {
    switch (status) {
      case 'pending_operations': color = 'bg-amber-100 text-amber-700'; label = t('cockpit_pedidos.status.operational.pending_operations'); break;
      case 'partially_fulfilled': color = 'bg-blue-100 text-blue-700'; label = t('cockpit_pedidos.status.operational.partially_fulfilled'); break;
      case 'fulfilled': color = 'bg-emerald-100 text-emerald-700'; label = t('cockpit_pedidos.status.operational.fulfilled'); break;
      case 'completed': color = 'bg-blue-100 text-blue-700'; label = t('cockpit_pedidos.status.operational.completed'); break;
      case 'cancelled': color = 'bg-red-100 text-red-700'; label = t('cockpit_pedidos.status.operational.cancelled'); break;
      case 'paused': color = 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-semibold'; label = t('cockpit_pedidos.status.operational.paused'); break;
    }
  } else if (type === 'item') {
    switch (status) {
      case 'pending_fulfillment': color = 'bg-amber-100 text-amber-700'; label = t('cockpit_pedidos.status.item.pending_fulfillment'); break;
      case 'partially_fulfilled': color = 'bg-blue-100 text-blue-700'; label = t('cockpit_pedidos.status.item.partially_fulfilled'); break;
      case 'fulfilled': color = 'bg-emerald-100 text-emerald-700'; label = t('cockpit_pedidos.status.item.fulfilled'); break;
      case 'cancelled': color = 'bg-red-100 text-red-700'; label = t('cockpit_pedidos.status.item.cancelled'); break;
    }
  } else if (type === 'solicitud' || type === 'task') {
    switch (status) {
      case 'pending': color = 'bg-slate-100 text-slate-700'; label = t('cockpit_pedidos.status.task.pending'); break;
      case 'in_progress': color = 'bg-blue-100 text-blue-700'; label = t('cockpit_pedidos.status.task.in_progress'); break;
      case 'blocked': color = 'bg-red-100 text-red-700'; label = t('cockpit_pedidos.status.task.blocked'); break;
      case 'completed': color = 'bg-emerald-100 text-emerald-700'; label = t('cockpit_pedidos.status.task.completed'); break;
      case 'cancelled': color = 'bg-slate-200 text-slate-500'; label = t('cockpit_pedidos.status.task.cancelled'); break;
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}
