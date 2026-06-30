import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClientViesHistory } from '../../hooks/useClientVies';
import { Calendar, Search, Shield, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import type { ClientViesCheckLog } from '../../types';

interface ClientViesHistoryDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientViesHistoryDialog({ clientId, open, onOpenChange }: ClientViesHistoryDialogProps) {
  const { data: history = [], isLoading } = useClientViesHistory(clientId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'error'>('all');

  const getStatusBadge = (log: ClientViesCheckLog) => {
    switch (log.status) {
      case 'valid':
        return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">Válido</Badge>;
      case 'invalid':
        return <Badge className="bg-rose-100 text-rose-800 border border-rose-200">Inválido</Badge>;
      case 'service_unavailable':
      case 'member_state_unavailable':
        return <Badge className="bg-amber-100 text-amber-800 border border-amber-200">Serviço Indisponível</Badge>;
      case 'timeout':
        return <Badge className="bg-amber-100 text-amber-800 border border-amber-200">Timeout</Badge>;
      default:
        return <Badge variant="secondary">Erro Técnico</Badge>;
    }
  };

  const filteredHistory = history.filter(log => {
    const matchesSearch = 
      (log.full_vat_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.returned_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'valid') return matchesSearch && log.status === 'valid';
    if (statusFilter === 'invalid') return matchesSearch && log.status === 'invalid';
    
    // errors
    const isErr = !['valid', 'invalid'].includes(log.status);
    return matchesSearch && isErr;
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] flex flex-col p-6 overflow-hidden rounded-2xl">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Histórico de Consultas VIES
          </DialogTitle>
          <DialogDescription>
            Logs de auditoria imutáveis correspondentes a todas as checagens intracomunitárias realizadas.
          </DialogDescription>
        </DialogHeader>

        {/* Barra de Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 py-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filtrar por número de IVA ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={statusFilter === 'all' ? 'bg-slate-800 hover:bg-slate-900' : ''}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === 'valid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('valid')}
              className={statusFilter === 'valid' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-600'}
            >
              Válidos
            </Button>
            <Button
              variant={statusFilter === 'invalid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('invalid')}
              className={statusFilter === 'invalid' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'text-slate-600'}
            >
              Inválidos
            </Button>
            <Button
              variant={statusFilter === 'error' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('error')}
              className={statusFilter === 'error' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-slate-600'}
            >
              Falhas
            </Button>
          </div>
        </div>

        {/* Tabela de Logs */}
        <ScrollArea className="flex-1 my-4 pr-3">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando histórico...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/50">
              Nenhum registro de consulta encontrado para os filtros aplicados.
            </div>
          ) : (
            <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data / Hora</th>
                    <th className="px-4 py-3">IVA Consultado</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Retorno VIES</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3">Mensagem / Erro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 font-mono">
                        {log.full_vat_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(log)}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate">
                        {log.status === 'valid' ? (
                          log.returned_name ? (
                            <div>
                              <p className="font-semibold text-slate-750">{log.returned_name}</p>
                              {log.returned_address && (
                                <p className="text-[10px] text-slate-400 truncate">{log.returned_address}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Omitido pelo país</span>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-500 whitespace-nowrap">
                        {log.trigger_source === 'manual' ? 'Manual' : 
                         log.trigger_source === 'client_registration' ? 'Registro' : 
                         log.trigger_source === 'client_update' ? 'Atualização' : log.trigger_source}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-slate-500 italic">
                        {log.error_message || <span className="text-slate-300">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="pt-4 border-t flex justify-end">
          <Button 
            onClick={() => onOpenChange(false)} 
            className="bg-slate-800 hover:bg-slate-900 text-white px-5 rounded-lg"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
