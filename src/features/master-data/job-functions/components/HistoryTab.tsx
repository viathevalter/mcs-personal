
import { useAuditLogs } from '../hooks/useAuditLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, FilePlus, Edit3, Trash2, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HistoryTabProps {
  jobFunctionId: string;
}

export function HistoryTab({ jobFunctionId }: HistoryTabProps) {
  const { data: logs = [], isLoading } = useAuditLogs(jobFunctionId);

  if (isLoading) {
    return <Skeleton className="h-64 w-full mt-6" />;
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT': return <FilePlus className="h-4 w-4 text-emerald-500" />;
      case 'UPDATE': return <Edit3 className="h-4 w-4 text-blue-500" />;
      case 'DELETE': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'ARCHIVE': return <Archive className="h-4 w-4 text-amber-500" />;
      default: return <History className="h-4 w-4 text-slate-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'INSERT': return 'Criado';
      case 'UPDATE': return 'Atualizado';
      case 'DELETE': return 'Excluído';
      case 'ARCHIVE': return 'Arquivado';
      default: return action;
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium">Registro de Auditoria</h3>
        <p className="text-sm text-muted-foreground">
          Histórico de alterações e ciclo de vida desta função.
        </p>
      </div>

      <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-8 mt-8">
        {logs.length === 0 && (
          <div className="text-center p-8 border border-dashed rounded-md text-muted-foreground ml-[-1.5rem]">
            Nenhum registro de auditoria encontrado ainda.
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="relative">
            <div className="absolute -left-[35px] top-1 h-8 w-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
              {getActionIcon(log.action)}
            </div>
            
            <div className="bg-white border rounded-md p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{getActionLabel(log.action)}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{log.table_name}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(log.created_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              <p className="text-sm text-slate-600">
                Ação realizada por: <span className="font-medium">{log.changed_by}</span>
              </p>

              {/* Se houver trigger ativado que guarde JSON no log.new_data/old_data, poderiamos mostrar as mudancas aqui */}
              {log.action === 'UPDATE' && log.new_data && (
                <div className="mt-3 p-3 bg-slate-50 text-xs text-slate-600 rounded overflow-auto max-h-32 border">
                  <pre>{JSON.stringify(log.new_data, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
