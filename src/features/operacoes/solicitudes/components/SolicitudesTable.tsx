import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import type { SolicitudDetail } from '../types';
import { SolicitudTypeBadge } from './SolicitudTypeBadge';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  solicitudes: SolicitudDetail[];
  isLoading: boolean;
}

export function SolicitudesTable({ solicitudes, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando solicitações...</div>;
  }

  if (solicitudes.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Nenhuma solicitação encontrada.</div>;
  }

  const getDaysRemainingStr = (dateFim?: string, status?: string) => {
    if (!dateFim) {
      return {
        text: 'Sem Fim',
        color: 'text-slate-450 dark:text-slate-500 bg-slate-50 dark:bg-slate-800'
      };
    }
    
    const endDate = new Date(dateFim);
    endDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        text: status === 'Ativo' ? `Excedido há ${Math.abs(diffDays)} dia(s)` : `Finalizado`,
        color: status === 'Ativo' 
          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 font-bold'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
      };
    } else if (diffDays === 0) {
      return {
        text: 'Termina hoje',
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold animate-pulse'
      };
    } else if (diffDays <= 15) {
      return {
        text: `Faltam ${diffDays} dia(s)`,
        color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/45 font-bold'
      };
    } else if (diffDays <= 30) {
      return {
        text: `Faltam ${diffDays} dia(s)`,
        color: 'bg-amber-500/10 text-amber-650 dark:text-amber-450 border border-amber-500/10'
      };
    } else {
      return {
        text: `Faltam ${diffDays} dia(s)`,
        color: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400'
      };
    }
  };

  const getOperationalStatusBadge = (solicitud: SolicitudDetail) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const startDate = solicitud.pedido?.fecha_inicio_pedido ? new Date(solicitud.pedido.fecha_inicio_pedido) : null;
    
    if (solicitud.status === 'cancelled') {
      return {
        label: 'Cancelada',
        className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      };
    }
    
    if (solicitud.status === 'blocked') {
      return {
        label: 'Bloqueada',
        className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450 border border-rose-200 dark:border-rose-900/30 font-bold'
      };
    }
    
    if (solicitud.status === 'completed') {
      if (startDate && startDate > today) {
        return {
          label: 'Pronto / Agendado',
          className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 font-medium'
        };
      } else {
        return {
          label: 'Em Curso / Iniciado',
          className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/50 font-bold'
        };
      }
    }
    
    return {
      label: 'Mobilizando',
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 font-semibold'
    };
  };

  return (
    <div className="rounded-md border bg-card overflow-y-auto h-full max-h-full">
      <Table>
        <TableHeader className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Empresa Interna</TableHead>
            <TableHead>Cliente / Obra</TableHead>
            <TableHead>Data de Início</TableHead>
            <TableHead>Prazo da Obra</TableHead>
            <TableHead>Status Operacional</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {solicitudes.map((solicitud) => {
            const opStatus = getOperationalStatusBadge(solicitud);

            return (
              <TableRow 
                key={solicitud.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/operacoes/solicitudes/${solicitud.id}`)}
              >
                <TableCell className="font-medium text-blue-600 dark:text-blue-400">{solicitud.codigo}</TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1.5 align-left items-start">
                    {solicitud.pedido ? (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {solicitud.pedido.codigo}
                      </span>
                    ) : (
                      <span className="text-slate-450 dark:text-slate-500 text-xs">N/A</span>
                    )}
                    <SolicitudTypeBadge tipo={solicitud.tipo} />
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-slate-650 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {solicitud.empresa?.trade_name || solicitud.empresa?.nome || solicitud.empresa?.legal_name || 'N/A'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    {solicitud.tipo === 'relocation' ? (
                      <>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Destino:</span>
                        <span className="text-sm font-semibold truncate max-w-[200px]" title={solicitud.client?.legal_name}>
                          {solicitud.client?.trade_name || solicitud.client?.legal_name || 'N/A'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={solicitud.client_site?.name}>
                          {solicitud.client_site?.name || 'Local não definido'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold truncate max-w-[200px]" title={solicitud.client?.legal_name}>
                          {solicitud.client?.trade_name || solicitud.client?.legal_name || 'N/A'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={solicitud.client_site?.name}>
                          {solicitud.client_site?.name || 'Local não definido'}
                        </span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-slate-700 dark:text-slate-350 font-medium">
                  {solicitud.pedido?.fecha_inicio_pedido 
                    ? format(new Date(solicitud.pedido.fecha_inicio_pedido), 'dd/MM/yyyy') 
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  {solicitud.pedido?.fecha_fin_pedido ? (
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-350">
                        {format(new Date(solicitud.pedido.fecha_fin_pedido), 'dd/MM/yyyy')}
                      </span>
                      {(() => {
                        const remaining = getDaysRemainingStr(solicitud.pedido.fecha_fin_pedido, solicitud.pedido.status_pedido);
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold w-max border ${remaining.color}`}>
                            {remaining.text}
                          </span>
                        );
                      })()}
                    </div>
                  ) : (
                    <span className="text-slate-450 dark:text-slate-500 text-xs">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${opStatus.className}`}>
                    {opStatus.label}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    solicitud.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                    solicitud.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                    solicitud.priority === 'normal' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-slate-500/10 text-slate-500'
                  }`}>
                    {solicitud.priority.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/operacoes/solicitudes/${solicitud.id}`);
                  }}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
