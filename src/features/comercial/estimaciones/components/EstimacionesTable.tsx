import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Estimacion } from '../types';
import { EstimacionStatusBadge } from './EstimacionStatusBadge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

interface Props {
  estimaciones: Estimacion[];
  isLoading: boolean;
}

export function EstimacionesTable({ estimaciones, isLoading }: Props) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const getSolicitudTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      new_order: 'Novo Pedido',
      replacement: 'Substituição',
      relocation: 'Realocação',
      technical_test: 'Prova Técnica',
      field_trial: 'Teste em Obra',
      offboarding: 'Baixa',
      scope_change: 'Mudança de Escopo',
      incident: 'Incidência'
    };
    return map[type] || type;
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando estimaciones...</div>;
  }

  if (estimaciones.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Nenhuma estimación encontrada com os filtros atuais.</div>;
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Cliente / Obra</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor Estimado</TableHead>
            <TableHead className="text-right">Margem</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimaciones.map((est) => (
            <TableRow key={est.id}>
              <TableCell className="font-medium">
                {est.codigo}
                <div className="text-xs text-muted-foreground font-normal mt-0.5">
                  Versão {est.current_version?.version_number || 1}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium text-slate-900">{est.client?.trade_name || est.client?.legal_name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{est.client_site?.name || 'Local não definido'}</div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{getSolicitudTypeLabel(est.estimation_type)}</span>
              </TableCell>
              <TableCell>
                <EstimacionStatusBadge status={est.status} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(est.current_version?.total_estimated_revenue || 0)}
              </TableCell>
              <TableCell className="text-right">
                <span className={`text-sm font-medium ${
                  (est.current_version?.estimated_margin_percent || 0) >= 20 ? 'text-emerald-600' :
                  (est.current_version?.estimated_margin_percent || 0) >= 10 ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {est.current_version?.estimated_margin_percent || 0}%
                </span>
              </TableCell>
              <TableCell>
                {est.current_version?.valid_until ? format(new Date(est.current_version.valid_until), 'dd/MM/yyyy') : '-'}
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate(`/comercial/estimaciones/${est.id}`)}
                >
                  Ver Detalhe
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
