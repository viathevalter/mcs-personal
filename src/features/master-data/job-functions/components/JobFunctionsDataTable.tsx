import { useState } from 'react';
import type { JobFunction } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface JobFunctionsDataTableProps {
  data: JobFunction[];
  onArchive: (id: string) => void;
}

export function JobFunctionsDataTable({ data, onArchive }: JobFunctionsDataTableProps) {
  const navigate = useNavigate();

  // Paginação local simples para esta fase
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const paginatedData = data.slice(page * pageSize, (page + 1) * pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Ativa</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativa</Badge>;
      case 'archived':
        return <Badge variant="destructive">Arquivada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRiskBadge = (risk?: string | null) => {
    switch (risk) {
      case 'low': return <Badge variant="outline" className="text-green-600 border-green-200">Baixo</Badge>;
      case 'medium': return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Médio</Badge>;
      case 'high': return <Badge variant="outline" className="text-orange-600 border-orange-200">Alto</Badge>;
      case 'critical': return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Crítico</Badge>;
      default: return <span className="text-muted-foreground text-sm">-</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Risco</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma função encontrada.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.code}</TableCell>
                  <TableCell>
                    <div>{job.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {job.description}
                    </div>
                  </TableCell>
                  <TableCell>{getRiskBadge(job.risk_level)}</TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    {job.updated_at ? format(new Date(job.updated_at), 'dd/MM/yyyy HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate(`/master-data/job-functions/${job.id}`)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {job.status !== 'archived' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Deseja arquivar esta função? Ela deixará de aparecer em novos pedidos.')) {
                            if(job.id) onArchive(job.id);
                          }
                        }}
                        title="Arquivar"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data.length > pageSize && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Anterior
          </Button>
          <div className="text-sm text-muted-foreground">
            Página {page + 1} de {Math.ceil(data.length / pageSize)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(Math.ceil(data.length / pageSize) - 1, p + 1))}
            disabled={page >= Math.ceil(data.length / pageSize) - 1}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
