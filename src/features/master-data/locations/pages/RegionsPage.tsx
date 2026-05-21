import { useState } from 'react';
import { useRegions } from '../hooks/useLocations';
import { CountrySelector } from '../components/LocationSelectors';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export function RegionsPage() {
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  
  // Se nenhum país selecionado, passamos undefined para listar tudo ou não? 
  // O hook useRegions com countryId undefined não roda (enabled: false), então usamos useAllRegions se quisermos tudo, ou só rodamos com ID.
  // Vamos buscar por todos ou pelo selecionado.
  const { data: regions, isLoading, error } = useRegions(selectedCountryId || undefined);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Regiões e Estados</h2>
          <p className="text-muted-foreground">
            Gestão de regiões do sistema. Apenas usuários super administradores podem criar ou editar registros nesta tabela.
          </p>
        </div>
        
        <div className="w-64">
          <CountrySelector 
            value={selectedCountryId} 
            onChange={setSelectedCountryId} 
          />
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código (Opcional)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span>Carregando regiões...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-red-500">
                  Erro ao carregar regiões.
                </TableCell>
              </TableRow>
            ) : !selectedCountryId ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Selecione um país no filtro acima para visualizar suas regiões.
                </TableCell>
              </TableRow>
            ) : regions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhuma região encontrada para este país.
                </TableCell>
              </TableRow>
            ) : (
              regions?.map((region) => (
                <TableRow key={region.id}>
                  <TableCell className="font-medium">{region.name}</TableCell>
                  <TableCell>{region.code || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={region.status === 'active' ? 'default' : 'secondary'}>
                      {region.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
