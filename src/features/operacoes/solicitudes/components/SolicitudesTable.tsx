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
import { SolicitudStatusBadge } from './SolicitudStatusBadge';
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

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Cliente / Obra</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Data Criação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {solicitudes.map((solicitud) => (
            <TableRow 
              key={solicitud.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/operacoes/solicitudes/${solicitud.id}`)}
            >
              <TableCell className="font-medium">{solicitud.codigo}</TableCell>
              <TableCell>
                <SolicitudTypeBadge tipo={solicitud.tipo} />
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={solicitud.title}>
                {solicitud.title}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate max-w-[200px]" title={solicitud.pedido?.client?.legal_name}>
                    {solicitud.pedido?.client?.trade_name || solicitud.pedido?.client?.legal_name || 'N/A'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={solicitud.pedido?.client_site?.name}>
                    {solicitud.pedido?.client_site?.name || 'Local não definido'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <SolicitudStatusBadge status={solicitud.status} />
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
              <TableCell className="text-muted-foreground">
                {format(new Date(solicitud.created_at), 'dd/MM/yyyy')}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
