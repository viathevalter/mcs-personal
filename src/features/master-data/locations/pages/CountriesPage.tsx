import { useState } from 'react';
import { useCountries } from '../hooks/useLocations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Pencil, Check, X } from 'lucide-react';
import { useLodgingRates, useMutateLodgingRate } from '@/features/comercial/estimaciones/hooks/useLodgingRates';
import { useCountryTaxParameters, useMutateCountryTaxParameters } from '@/features/comercial/estimaciones/hooks/useCountryTaxParameters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatCurrency } from '@/shared/utils/currency';

export function CountriesPage() {
  const { data: countries, isLoading: isLoadingCountries, error: countriesError } = useCountries();
  const { data: lodgingRates = [], isLoading: isLoadingLodging } = useLodgingRates();
  const { data: taxParams = [], isLoading: isLoadingTaxes } = useCountryTaxParameters();

  const { mutateAsync: saveLodgingRate } = useMutateLodgingRate();
  const { mutateAsync: saveTaxParams } = useMutateCountryTaxParameters();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLodgingRate, setEditLodgingRate] = useState<number>(0);
  const [editSsEmployer, setEditSsEmployer] = useState<number>(23);
  const [editSsEmployee, setEditSsEmployee] = useState<number>(11);
  const [editSsUseTotal, setEditSsUseTotal] = useState<boolean>(true);
  const [editDestacadoBase, setEditDestacadoBase] = useState<number>(920);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (country: any) => {
    const currentLodging = lodgingRates.find((r: any) => r.country_id === country.id);
    const currentTax = taxParams.find((t: any) => t.country_id === country.id);

    setEditingId(country.id);
    setEditLodgingRate(currentLodging ? Number(currentLodging.rate_per_day) : 0);
    setEditSsEmployer(currentTax ? Number(currentTax.ss_employer_rate) : 23);
    setEditSsEmployee(currentTax ? Number(currentTax.ss_employee_rate) : 11);
    setEditSsUseTotal(currentTax ? !!currentTax.ss_use_total : true);
    setEditDestacadoBase(currentTax ? Number(currentTax.destacado_base_salary) : 920);
  };

  const handleSave = async (countryId: string) => {
    setIsSaving(true);
    try {
      await saveLodgingRate({ country_id: countryId, rate_per_day: editLodgingRate });
      await saveTaxParams({
        country_id: countryId,
        ss_employer_rate: editSsEmployer,
        ss_employee_rate: editSsEmployee,
        ss_use_total: editSsUseTotal,
        destacado_base_salary: editDestacadoBase
      });
      setEditingId(null);
      toast.success('Parâmetros do país salvos com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar parâmetros', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingCountries || isLoadingLodging || isLoadingTaxes;
  const error = countriesError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Países e Regras Fiscais</h2>
        <p className="text-muted-foreground">
          Gestão de países do sistema, diárias padrão de alojamento e parâmetros de Seguridade Social (impostos locais e destacados).
        </p>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-16">ISO2</TableHead>
              <TableHead className="w-16">Moeda</TableHead>
              <TableHead className="w-40">Alojamento Padrão</TableHead>
              <TableHead>Seguridade Social (Parâmetros)</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span>Carregando dados dos países...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-red-500">
                  Erro ao carregar dados.
                </TableCell>
              </TableRow>
            ) : countries?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhum país encontrado.
                </TableCell>
              </TableRow>
            ) : (
              countries?.map((country) => {
                const isEditing = editingId === country.id;
                const lodging = lodgingRates.find((r: any) => r.country_id === country.id);
                const tax = taxParams.find((t: any) => t.country_id === country.id);

                return (
                  <TableRow key={country.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <TableCell className="font-semibold text-slate-900 dark:text-white">{country.name}</TableCell>
                    <TableCell className="font-mono text-xs">{country.iso2}</TableCell>
                    <TableCell className="font-mono text-xs">{country.currency_code || '-'}</TableCell>
                    
                    {/* Coluna Alojamento */}
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editLodgingRate}
                            onChange={(e) => setEditLodgingRate(Number(e.target.value))}
                            className="w-24 font-mono h-8 text-xs bg-white dark:bg-slate-950"
                          />
                          <span className="text-xs text-slate-500">/dia</span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs">
                          {formatCurrency(lodging?.rate_per_day || 0)}/dia
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Coluna Seguridade Social */}
                    <TableCell>
                      {isEditing ? (
                        <div className="flex flex-wrap gap-4 items-end bg-slate-50 dark:bg-slate-950 p-2 rounded-md border border-slate-200 dark:border-slate-800">
                          <div className="flex flex-col gap-1 text-[10px]">
                            <span className="font-bold text-slate-500 dark:text-slate-400">Patronal (%)</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={editSsEmployer}
                              onChange={(e) => setEditSsEmployer(Number(e.target.value))}
                              className="w-16 font-mono h-7 text-xs p-1"
                            />
                          </div>
                          
                          <div className="flex flex-col gap-1 text-[10px]">
                            <span className="font-bold text-slate-500 dark:text-slate-400">Trabalhador (%)</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={editSsEmployee}
                              onChange={(e) => setEditSsEmployee(Number(e.target.value))}
                              className="w-16 font-mono h-7 text-xs p-1"
                            />
                          </div>

                          <div className="flex flex-col gap-1 text-[10px]">
                            <span className="font-bold text-slate-500 dark:text-slate-400">Base Destacado (€)</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={editDestacadoBase}
                              onChange={(e) => setEditDestacadoBase(Number(e.target.value))}
                              className="w-20 font-mono h-7 text-xs p-1"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 h-7">
                            <Checkbox
                              id={`use-total-${country.id}`}
                              checked={editSsUseTotal}
                              onCheckedChange={(c) => setEditSsUseTotal(!!c)}
                              className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
                            />
                            <label htmlFor={`use-total-${country.id}`} className="text-[10px] text-slate-650 dark:text-slate-350 cursor-pointer font-medium select-none">
                              Usar Total ({editSsEmployer + editSsEmployee}%)
                            </label>
                          </div>
                        </div>
                      ) : tax ? (
                        <div className="text-xs space-y-0.5 text-slate-650 dark:text-slate-350">
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              Imposto Aplicado: {tax.ss_use_total ? (Number(tax.ss_employer_rate) + Number(tax.ss_employee_rate)) : tax.ss_employer_rate}%
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5">
                              (Patronal: {tax.ss_employer_rate}% | Trab: {tax.ss_employee_rate}%)
                            </span>
                          </div>
                          <div>
                            <span>Salário Mínimo de Destino: </span>
                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatCurrency(tax.destacado_base_salary)}/mês</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-450 italic">Sem parâmetros definidos</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={country.status === 'active' ? 'default' : 'secondary'}>
                        {country.status}
                      </Badge>
                    </TableCell>

                    {/* Coluna Ações */}
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="icon"
                            variant="default"
                            onClick={() => handleSave(country.id)}
                            disabled={isSaving}
                            className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                            disabled={isSaving}
                            className="h-8 w-8 border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(country)}
                          className="h-8 border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 gap-1 text-slate-700 dark:text-slate-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Configurar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
