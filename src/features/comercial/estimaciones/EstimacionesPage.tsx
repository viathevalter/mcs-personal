import { useState } from 'react';
import { useEstimaciones } from './hooks/useEstimaciones';
import { EstimacionKpiCards } from './components/EstimacionKpiCards';
import { EstimacionesTable } from './components/EstimacionesTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FilterX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';

export function EstimacionesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: 'all',
    solicitud_type: 'all',
    search: ''
  });

  const { data: estimaciones = [], isLoading } = useEstimaciones(filters);

  const clearFilters = () => {
    setFilters({ status: 'all', solicitud_type: 'all', search: '' });
  };

  return (
    <div className="flex flex-col space-y-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Presupuestos / Estimaciones</h1>
            <p className="text-muted-foreground">
              Gestão de propostas comerciais e orçamentos para clientes.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <EmpresaSelector />
            <Button onClick={() => navigate('/comercial/estimaciones/nova')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Estimación
            </Button>
          </div>
        </div>

        <EstimacionKpiCards estimaciones={estimaciones} />

        <div className="flex flex-col sm:flex-row gap-4 items-end bg-card p-4 rounded-md border">
          <div className="space-y-1.5 flex-1">
            <label className="text-sm font-medium text-muted-foreground">Busca</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou título..."
                className="pl-9"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-1.5 w-full sm:w-[200px]">
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Select 
              value={filters.status} 
              onValueChange={(val) => setFilters({ ...filters, status: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="approved">Aprovada</SelectItem>
                <SelectItem value="rejected">Rejeitada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 w-full sm:w-[200px]">
            <label className="text-sm font-medium text-muted-foreground">Tipo de Pedido</label>
            <Select 
              value={filters.solicitud_type} 
              onValueChange={(val) => setFilters({ ...filters, solicitud_type: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os Tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="new_order">Novo Pedido</SelectItem>
                <SelectItem value="replacement">Substituição</SelectItem>
                <SelectItem value="relocation">Realocação</SelectItem>
                <SelectItem value="scope_change">Mudança de Escopo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" className="px-3" onClick={clearFilters} title="Limpar Filtros">
            <FilterX className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <EstimacionesTable estimaciones={estimaciones} isLoading={isLoading} />
      </div>
  );
}
