import { useState } from 'react';
import { useSolicitudes } from './hooks/useSolicitudes';
import { SolicitudesTable } from './components/SolicitudesTable';
import { SolicitudKpiCards } from './components/SolicitudKpiCards';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router-dom';

export function SolicitudesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: solicitudes = [], isLoading, refetch } = useSolicitudes({ search });

  return (
    <Layout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Torre de Controle Operacional</h1>
            <p className="text-muted-foreground">
              Acompanhe solicitações, tarefas e bloqueios operacionais em tempo real.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => navigate('/operacoes/solicitudes/nova?tipo=replacement')}>
              Nova Operação
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <SolicitudKpiCards solicitudes={solicitudes} />

        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por código ou título..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-dashed">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>

        <SolicitudesTable solicitudes={solicitudes} isLoading={isLoading} />
      </div>
    </Layout>
  );
}
