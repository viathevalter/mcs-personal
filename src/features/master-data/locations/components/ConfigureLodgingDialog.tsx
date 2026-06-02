import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Trash2, Plus, Building2 } from 'lucide-react';
import { useUpsertLodgingRate, useDeleteLodgingRate } from '@/features/comercial/estimaciones/hooks/useLodgingRates';
import type { LodgingRate } from '@/features/comercial/estimaciones/hooks/useLodgingRates';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: { id: string; name: string } | null;
  countryId: string | null;
  lodgingRates: LodgingRate[];
}

export function ConfigureLodgingDialog({ open, onOpenChange, region, countryId, lodgingRates }: Props) {
  const { mutateAsync: upsertRate, isPending: isSaving } = useUpsertLodgingRate();
  const { mutateAsync: deleteRate } = useDeleteLodgingRate();

  const [baseRateVal, setBaseRateVal] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rateVal, setRateVal] = useState('');

  // Find existing rates for this region
  const regRates = region ? lodgingRates.filter((r) => r.region_id === region.id) : [];
  const baseRate = regRates.find((r) => !r.start_date && !r.end_date);
  const seasonalRates = regRates.filter((r) => !!r.start_date && !!r.end_date);

  useEffect(() => {
    if (open) {
      setBaseRateVal(baseRate ? String(baseRate.rate_per_day) : '');
      setDesc('');
      setStartDate('');
      setEndDate('');
      setRateVal('');
    }
  }, [open, baseRate]);

  if (!region || !countryId) return null;

  const handleSaveBase = async () => {
    const amount = Number(baseRateVal);
    if (isNaN(amount) || amount < 0) {
      toast.error('Por favor, insira um valor válido de diária.');
      return;
    }

    try {
      await upsertRate({
        country_id: countryId,
        region_id: region.id,
        rate_per_day: amount
      });
      toast.success('Tarifa base da região atualizada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao atualizar tarifa base', { description: err.message });
    }
  };

  const handleAddSeasonal = async () => {
    if (!desc.trim()) {
      toast.error('Por favor, informe a descrição do período.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Por favor, informe a data de início e fim.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('A data de início não pode ser posterior à data de fim.');
      return;
    }
    const amount = Number(rateVal);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Por favor, insira um valor de diária válido maior que zero.');
      return;
    }

    try {
      await upsertRate({
        country_id: countryId,
        region_id: region.id,
        rate_per_day: amount,
        start_date: startDate,
        end_date: endDate,
        description: desc.trim()
      });
      toast.success('Tarifa sazonal adicionada com sucesso!');
      setDesc('');
      setStartDate('');
      setEndDate('');
      setRateVal('');
    } catch (err: any) {
      toast.error('Erro ao adicionar tarifa sazonal', { description: err.message });
    }
  };

  const handleDeleteSeasonal = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta tarifa sazonal?')) return;
    try {
      await deleteRate(id);
      toast.success('Tarifa sazonal excluída com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao excluir tarifa sazonal', { description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Configurar Alojamento - {region.name}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Gerencie o valor base da diária e adicione períodos de tarifas sazonais (ex: verão ou alta temporada).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tarifa Base */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tarifa Base da Região</h4>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="base-rate" className="text-xs font-semibold text-slate-650 dark:text-slate-350">Diária Base (€/dia)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-semibold">€</span>
                  <Input
                    id="base-rate"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 35.00"
                    value={baseRateVal}
                    onChange={(e) => setBaseRateVal(e.target.value)}
                    className="pl-7 h-9 text-sm bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>
              <Button onClick={handleSaveBase} disabled={isSaving} className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Salvar Base
              </Button>
            </div>
          </div>

          {/* Adicionar Período Sazonal */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Adicionar Período Sazonal (Alta Temporada)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="season-desc" className="text-xs font-semibold text-slate-650 dark:text-slate-350">Descrição</Label>
                <Input
                  id="season-desc"
                  placeholder="Ex: Alta Temporada Verão"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="season-rate" className="text-xs font-semibold text-slate-650 dark:text-slate-350">Diária Sazonal (€/dia)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-semibold">€</span>
                  <Input
                    id="season-rate"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 55.00"
                    value={rateVal}
                    onChange={(e) => setRateVal(e.target.value)}
                    className="pl-7 h-9 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="season-start" className="text-xs font-semibold text-slate-650 dark:text-slate-350">Data Início</Label>
                <Input
                  id="season-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="season-end" className="text-xs font-semibold text-slate-650 dark:text-slate-350">Data Fim</Label>
                <Input
                  id="season-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={handleAddSeasonal} disabled={isSaving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" />
                Adicionar Período
              </Button>
            </div>
          </div>

          {/* Listagem de Períodos Cadastrados */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Períodos Sazonais Ativos</h4>
            {seasonalRates.length === 0 ? (
              <p className="text-xs italic text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800">
                Nenhuma tarifa sazonal cadastrada para esta região.
              </p>
            ) : (
              <div className="rounded-md border border-slate-200 dark:border-slate-800 max-h-44 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                      <th className="p-2">Descrição</th>
                      <th className="p-2">Período</th>
                      <th className="p-2 w-24 text-right">Diária</th>
                      <th className="p-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonalRates.map((r) => {
                      const formatDate = (dStr: string | null) => {
                        if (!dStr) return '-';
                        const [y, m, d] = dStr.split('-');
                        return `${d}/${m}/${y}`;
                      };
                      return (
                        <tr key={r.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-2 font-medium text-slate-700 dark:text-slate-300">{r.description}</td>
                          <td className="p-2 text-slate-550 dark:text-slate-400 font-mono">
                            {formatDate(r.start_date)} até {formatDate(r.end_date)}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900 dark:text-white font-mono">
                            €{Number(r.rate_per_day).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleDeleteSeasonal(r.id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                              title="Excluir período"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
