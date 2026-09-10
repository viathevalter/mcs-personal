import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  FileSpreadsheet, 
  Download, 
  Loader2, 
  Globe, 
  CheckSquare, 
  Square,
  Sparkles
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import type { JobFunction } from '../types';
import { useAllJobFunctionRates } from '../hooks/useJobFunctionRates';
import { useCountries } from '@/features/master-data/locations/hooks/useLocations';

interface ExportJobFunctionRatesDialogProps {
  jobFunctions: JobFunction[];
  trigger?: React.ReactNode;
}

export function ExportJobFunctionRatesDialog({ 
  jobFunctions, 
  trigger 
}: ExportJobFunctionRatesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: allRates = [], isLoading: isLoadingRates } = useAllJobFunctionRates();
  const { data: countries = [], isLoading: isLoadingCountries } = useCountries();

  // Dialog state
  const [onlyActive, setOnlyActive] = useState(true);
  const [includeBaseCost, setIncludeBaseCost] = useState(true);
  const [includeCountries, setIncludeCountries] = useState(true);
  const [prefillWithGlobal, setPrefillWithGlobal] = useState(true);
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);

  // Default select active countries when loaded
  useEffect(() => {
    if (countries.length > 0 && selectedCountryIds.length === 0) {
      const defaultIds = countries
        .filter(c => c.status === 'active')
        .map(c => c.id);
      setSelectedCountryIds(defaultIds);
    }
  }, [countries]);

  // Filtered job functions based on status choice
  const filteredFunctions = useMemo(() => {
    if (onlyActive) {
      return jobFunctions.filter(jf => jf.status === 'active');
    }
    return jobFunctions.filter(jf => jf.status !== 'archived');
  }, [jobFunctions, onlyActive]);

  // Available countries sorted
  const activeCountries = useMemo(() => {
    return [...countries]
      .filter(c => c.status !== 'archived')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);

  const handleToggleCountry = (countryId: string) => {
    setSelectedCountryIds(prev =>
      prev.includes(countryId)
        ? prev.filter(id => id !== countryId)
        : [...prev, countryId]
    );
  };

  const handleSelectAllCountries = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedCountryIds(activeCountries.map(c => c.id));
    } else {
      setSelectedCountryIds([]);
    }
  };

  const getRiskLabel = (risk?: string | null) => {
    switch (risk) {
      case 'low': return 'Baixo';
      case 'medium': return 'Médio';
      case 'high': return 'Alto';
      case 'critical': return 'Crítico';
      default: return '-';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'inactive': return 'Inativa';
      case 'archived': return 'Arquivada';
      default: return status || '-';
    }
  };

  const handleExport = async () => {
    if (filteredFunctions.length === 0) {
      toast.warning('Nenhum perfil disponível para exportação com os filtros atuais.');
      return;
    }

    setIsExporting(true);
    try {
      // Selected country objects
      const targetCountries = activeCountries.filter(c => selectedCountryIds.includes(c.id));

      // Build export rows
      const rows = filteredFunctions.map(jf => {
        // Global rate has country_id = null
        const globalRate = allRates.find(
          r => r.job_function_id === jf.id && (!r.country_id || r.country_id === null)
        );

        const globalSellRate = globalRate?.recommended_sell_rate_hour != null 
          ? Number(globalRate.recommended_sell_rate_hour) 
          : null;

        const globalBaseCost = globalRate?.base_cost_hour != null 
          ? Number(globalRate.base_cost_hour) 
          : null;

        const row: Record<string, any> = {
          'Código': jf.code,
          'Nome do Perfil': jf.name,
          'Risco': getRiskLabel(jf.risk_level),
          'Status': getStatusLabel(jf.status),
        };

        if (includeBaseCost) {
          row['Custo Base Global (€/h)'] = globalBaseCost !== null ? globalBaseCost : '';
        }

        row['Tarifa Global Vigente (€/h)'] = globalSellRate !== null ? globalSellRate : '';

        // Add dynamic country columns
        if (includeCountries) {
          targetCountries.forEach(country => {
            const countryRate = allRates.find(
              r => r.job_function_id === jf.id && r.country_id === country.id
            );

            let val: number | string = '';
            if (countryRate?.recommended_sell_rate_hour != null) {
              val = Number(countryRate.recommended_sell_rate_hour);
            } else if (prefillWithGlobal && globalSellRate !== null) {
              val = globalSellRate;
            }

            const colName = `Tarifa ${country.name} (€/h)`;
            row[colName] = val;
          });
        }

        return row;
      });

      // Generate worksheet
      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Calculate auto column widths
      const colKeys = Object.keys(rows[0] || {});
      const colWidths = colKeys.map(key => {
        let maxLen = key.length;
        rows.forEach(r => {
          const val = r[key];
          if (val !== undefined && val !== null) {
            const strLen = String(val).length;
            if (strLen > maxLen) maxLen = strLen;
          }
        });
        return { wch: Math.max(maxLen + 3, 12) };
      });
      worksheet['!cols'] = colWidths;

      // Generate workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tarifas Perfis');

      // Export file
      const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
      const filename = `Tarifas_Perfis_Profissionais_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success('Planilha de tarifas exportada com sucesso!');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Erro ao exportar tarifas:', error);
      toast.error(error.message || 'Erro ao gerar a planilha Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar Tarifas</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Exportar Tarifas dos Perfis</DialogTitle>
              <DialogDescription>
                Exporte o catálogo para Excel (.xlsx) com a tarifa vigente global e colunas por país.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Summary Box */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border text-sm">
            <span className="text-muted-foreground">Total de perfis selecionados para exportação:</span>
            <Badge variant="secondary" className="font-semibold text-sm">
              {filteredFunctions.length} {filteredFunctions.length === 1 ? 'perfil' : 'perfis'}
            </Badge>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Filtro de Perfis
            </Label>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-950">
              <div className="space-y-0.5">
                <Label htmlFor="only-active" className="text-sm font-medium cursor-pointer">
                  Apenas Perfis Ativos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Desmarque para incluir também perfis inativos na planilha.
                </p>
              </div>
              <Switch
                id="only-active"
                checked={onlyActive}
                onCheckedChange={setOnlyActive}
              />
            </div>
          </div>

          {/* Country Columns Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                Colunas de Tarifas por País
              </Label>
              {includeCountries && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-slate-900"
                    onClick={() => handleSelectAllCountries(true)}
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-slate-900"
                    onClick={() => handleSelectAllCountries(false)}
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3 p-3.5 rounded-lg border bg-slate-50/70 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-countries" className="text-sm font-medium cursor-pointer">
                    Adicionar colunas separadas por país
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cria colunas para cada país (Espanha, Portugal, França, Itália, etc.)
                  </p>
                </div>
                <Switch
                  id="include-countries"
                  checked={includeCountries}
                  onCheckedChange={setIncludeCountries}
                />
              </div>

              {includeCountries && (
                <>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-start gap-2.5 p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded border border-blue-100 dark:border-blue-900/40">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="prefill-global" className="text-xs font-semibold text-blue-900 dark:text-blue-300 cursor-pointer">
                            Pré-preencher países com a Tarifa Global
                          </Label>
                          <Switch
                            id="prefill-global"
                            checked={prefillWithGlobal}
                            onCheckedChange={setPrefillWithGlobal}
                          />
                        </div>
                        <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                          Recomendado: Inicia cada país com o valor global atual como referência. Assim você só altera na planilha os países com tarifas diferenciadas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Label className="text-xs text-muted-foreground">
                      Selecione os países a incluir no Excel ({selectedCountryIds.length} selecionados):
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border rounded bg-white dark:bg-slate-950">
                      {activeCountries.map(country => {
                        const isChecked = selectedCountryIds.includes(country.id);
                        return (
                          <label
                            key={country.id}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors select-none ${
                              isChecked 
                                ? 'bg-emerald-50 text-emerald-900 font-medium dark:bg-emerald-950/40 dark:text-emerald-300' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => handleToggleCountry(country.id)}
                            />
                            <span className="truncate">{country.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Colunas Adicionais
            </Label>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-950">
              <div className="space-y-0.5">
                <Label htmlFor="include-base-cost" className="text-sm font-medium cursor-pointer">
                  Incluir Custo Base Global (€/h)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Adiciona a coluna de custo base para cálculo de margem.
                </p>
              </div>
              <Switch
                id="include-base-cost"
                checked={includeBaseCost}
                onCheckedChange={setIncludeBaseCost}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isLoadingRates || isLoadingCountries}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Exportando...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Exportar Planilha Excel</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
