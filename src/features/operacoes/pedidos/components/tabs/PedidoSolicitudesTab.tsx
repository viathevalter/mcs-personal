import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PedidoStatusBadge } from '../PedidoStatusBadge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import type { SolicitudOperativa } from '../../types';

interface Props {
  solicitudes: SolicitudOperativa[];
  isLoading: boolean;
}

export function PedidoSolicitudesTab({ solicitudes, isLoading }: Props) {
  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground mt-6">Carregando solicitudes...</div>;
  }

  if (!solicitudes || solicitudes.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhuma solicitação operacional vinculada a este pedido.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Solicitações Operacionais (GSO)</CardTitle>
        <CardDescription>
          Gerenciamento Global de Solicitações vinculadas a este pedido (alocações, substituições, logística, etc).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Código</th>
                <th className="px-4 py-3 text-left font-medium">Tipo / Título</th>
                <th className="px-4 py-3 text-left font-medium">Departamento</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Prioridade</th>
                <th className="px-4 py-3 text-right font-medium">Data Limite</th>
                <th className="px-4 py-3 text-center font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {solicitudes.map((sol) => (
                <tr key={sol.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {sol.codigo}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-200">{sol.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 capitalize">{sol.tipo.replace('_', ' ')}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">
                    {sol.department || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PedidoStatusBadge type="solicitud" status={sol.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${
                      sol.priority === 'urgent' ? 'text-red-600' :
                      sol.priority === 'high' ? 'text-amber-600' :
                      sol.priority === 'normal' ? 'text-blue-600' : 'text-slate-500'
                    }`}>
                      {sol.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {sol.due_date ? format(new Date(sol.due_date), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link 
                      to={`/operacoes/solicitudes/${sol.id}`}
                      className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Ver Solicitação Global"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
