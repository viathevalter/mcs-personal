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
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLodgingRates } from '@/features/comercial/estimaciones/hooks/useLodgingRates';
import { ConfigureLodgingDialog } from '../components/ConfigureLodgingDialog';

export function RegionsPage() {
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configuringRegion, setConfiguringRegion] = useState<{ id: string; name: string } | null>(null);

  const { data: regions, isLoading: isLoadingRegions, error: regionsError } = useRegions(selectedCountryId || undefined);
  const { data: lodgingRates = [], isLoading: isLoadingRates } = useLodgingRates();

  const isLoading = isLoadingRegions || isLoadingRates;
  const error = regionsError;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Regiões e Estados</h2>
          <p className="text-muted-foreground">
            Gestão de regiões do sistema. Configure tarifas de alojamento padrão e sazonais para cada localidade.
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
              <TableHead>Alojamento Base</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-36">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span>Carregando dados...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-red-500">
                  Erro ao carregar regiões.
                </TableCell>
              </TableRow>
            ) : !selectedCountryId ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Selecione um país no filtro acima para visualizar suas regiões e cadastrar tarifas.
                </TableCell>
              </TableRow>
            ) : regions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhuma região encontrada para este país.
                </TableCell>
              </TableRow>
            ) : (
              regions?.map((region) => {
                const regRates = lodgingRates.filter((r) => r.region_id === region.id);
                const baseRate = regRates.find((r) => !r.start_date && !r.end_date);

                return (
                  <TableRow key={region.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <TableCell className="font-semibold text-slate-900 dark:text-white">{region.name}</TableCell>
                    <TableCell className="font-mono text-xs">{region.code || '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-850 dark:text-slate-200 font-medium">
                      {baseRate ? `€${Number(baseRate.rate_per_day).toFixed(2)}/dia` : (
                        <span className="text-slate-400 italic font-normal">Não configurado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={region.status === 'active' ? 'default' : 'secondary'}>
                        {region.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setConfiguringRegion({ id: region.id, name: region.name });
                          setDialogOpen(true);
                        }}
                        className="h-8 border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-xs font-semibold gap-1 text-slate-700 dark:text-slate-300"
                      >
                        <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Alojamento
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ConfigureLodgingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        region={configuringRegion}
        countryId={selectedCountryId}
        lodgingRates={lodgingRates}
      />
    </div>
  );
}
