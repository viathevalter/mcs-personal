import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Loader2, Building2, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLodgingRates } from '@/features/comercial/estimaciones/hooks/useLodgingRates';
import { ConfigureLodgingDialog } from '../components/ConfigureLodgingDialog';

export function RegionsPage() {
  const { t } = useTranslation();
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configuringRegion, setConfiguringRegion] = useState<{ id: string; name: string } | null>(null);

  const { data: regions, isLoading: isLoadingRegions, error: regionsError } = useRegions(selectedCountryId || undefined);
  const { data: lodgingRates = [], isLoading: isLoadingRates } = useLodgingRates();

  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'code' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'name' | 'code') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedRegions = regions ? [...regions].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a[sortField] || '').toString().toLowerCase().trim();
    const bVal = (b[sortField] || '').toString().toLowerCase().trim();
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  }) : [];

  const isLoading = isLoadingRegions || isLoadingRates;
  const error = regionsError;

  return (
    <div className="space-y-6 w-full px-8 py-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('masterData.locations.regionsTitle', { defaultValue: 'Regiões e Estados' })}</h2>
          <p className="text-muted-foreground mt-1">
            {t('masterData.locations.regionsSubtitle', { defaultValue: 'Gestão de regiões do sistema. Configure tarifas de alojamento padrão e sazonais para cada localidade.' })}
          </p>
        </div>
        
        <div className="w-64">
          <CountrySelector 
            value={selectedCountryId} 
            onChange={setSelectedCountryId} 
          />
        </div>
      </div>

      <div className="border rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
          <Table className="relative">
            <TableHeader className="bg-slate-50 dark:bg-slate-800 border-b sticky top-0 z-10 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)]">
              <TableRow>
                <TableHead className="cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.fields.name', { defaultValue: 'Nome' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'name' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.locations.codeOptional', { defaultValue: 'Código (Opcional)' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'code' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </TableHead>
                <TableHead>{t('masterData.locations.baseLodging', { defaultValue: 'Alojamento Base' })}</TableHead>
                <TableHead>{t('masterData.fields.status', { defaultValue: 'Status' })}</TableHead>
                <TableHead className="text-right w-36">{t('masterData.fields.actions', { defaultValue: 'Ações' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span>{t('common.loading', { defaultValue: 'Carregando dados...' })}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-red-500">
                    {t('masterData.locations.errorRegions', { defaultValue: 'Erro ao carregar regiões.' })}
                  </TableCell>
                </TableRow>
              ) : !selectedCountryId ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t('masterData.locations.selectCountryPrompt', { defaultValue: 'Selecione um país no filtro acima para visualizar suas regiões e cadastrar tarifas.' })}
                  </TableCell>
                </TableRow>
              ) : sortedRegions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t('masterData.locations.noRegions', { defaultValue: 'Nenhuma região encontrada para este país.' })}
                  </TableCell>
                </TableRow>
              ) : (
                sortedRegions.map((region) => {
                  const regRates = lodgingRates.filter((r) => r.region_id === region.id);
                  const baseRate = regRates.find((r) => !r.start_date && !r.end_date);

                  return (
                    <TableRow 
                      key={region.id} 
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 active:bg-slate-100 dark:active:bg-slate-800"
                      onClick={() => {
                        setConfiguringRegion({ id: region.id, name: region.name });
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{region.name}</TableCell>
                      <TableCell className="font-mono text-xs">{region.code || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-200 font-medium">
                        {baseRate ? `€${Number(baseRate.rate_per_day).toFixed(2)}${t('masterData.locations.perDay', { defaultValue: '/dia' })}` : (
                          <span className="text-slate-400 italic font-normal">{t('masterData.locations.notConfigured', { defaultValue: 'Não configurado' })}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {region.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{t('masterData.status.active_masc', { defaultValue: 'Ativo' })}</Badge>}
                        {region.status === 'inactive' && <Badge variant="secondary">{t('masterData.status.inactive_masc', { defaultValue: 'Inativo' })}</Badge>}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                          {t('masterData.locations.lodgingButton', { defaultValue: 'Alojamento' })}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
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
