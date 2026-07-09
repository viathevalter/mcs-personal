import { useState, useMemo, useEffect } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useClientSites } from '../../../client-sites/hooks/useClientSites';
import { useJobFunctions } from '../../../job-functions/hooks/useJobFunctions';
import { useWorkersForHolerites } from '../../../../holerites/hooks/useWorkersForHolerites';
import {
  useClientTariffs,
  useClientWorkerTariffs,
  useMutateClientTariffs,
} from '../../hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Building2,
  MapPin,
  Users,
  Wallet,
  Plus,
  Trash2,
  Search,
  Check,
} from 'lucide-react';

interface ClientTariffsTabProps {
  clientId: string;
}

export function ClientTariffsTab({ clientId }: ClientTariffsTabProps) {
  const { selectedEmpresaId } = useEmpresa();

  // Queries
  const { data: clientSites = [], isLoading: loadingSites } = useClientSites();
  const { data: jobFunctions = [], isLoading: loadingFunctions } = useJobFunctions();
  const { data: workersList = [], isLoading: loadingWorkers } = useWorkersForHolerites(selectedEmpresaId || undefined);
  const { data: activeTariffs = [], isLoading: loadingTariffs, refetch: refetchTariffs } = useClientTariffs(clientId);
  const { data: workerExceptions = [], isLoading: loadingExceptions, refetch: refetchExceptions } = useClientWorkerTariffs(clientId);

  // Mutations
  const { saveTariff, deleteTariff, saveWorkerTariff, deleteWorkerTariff, isSavingTariff } = useMutateClientTariffs(clientId);

  // States
  const [selectedSiteId, setSelectedSiteId] = useState<string>('global'); // 'global' = Sem Obra / General
  const [searchAvailable, setSearchAvailable] = useState('');
  
  // Worker exception dialog state
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [workerSiteId, setWorkerSiteId] = useState('global');
  const [workerRate, setWorkerRate] = useState('');

  // Local state for selected tariffs to allow editing before saving
  const [selectedTariffs, setSelectedTariffs] = useState<{ job_function_id: string; valor_tarifa: number }[]>([]);

  // Filter sites for this client
  const sites = useMemo(() => {
    return clientSites.filter(s => s.client_id === clientId && s.status === 'active');
  }, [clientSites, clientId]);

  // Load selected tariffs when activeTariffs or selectedSiteId changes
  useEffect(() => {
    if (activeTariffs) {
      const siteIdFilter = selectedSiteId === 'global' ? null : selectedSiteId;
      const filtered = activeTariffs
        .filter(t => t.client_site_id === siteIdFilter)
        .map(t => ({
          job_function_id: t.job_function_id,
          valor_tarifa: Number(t.valor_tarifa)
        }));
      setSelectedTariffs(filtered);
    }
  }, [activeTariffs, selectedSiteId]);

  // Map Selected Tariffs to Map for easy lookup
  const selectedTariffsMap = useMemo(() => {
    return new Map(selectedTariffs.map(t => [t.job_function_id, t.valor_tarifa]));
  }, [selectedTariffs]);

  // Filter available functions (not currently in selectedTariffs)
  const availableFunctions = useMemo(() => {
    return jobFunctions
      .filter(jf => !selectedTariffsMap.has(jf.id))
      .filter(jf => jf.name.toLowerCase().includes(searchAvailable.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [jobFunctions, selectedTariffsMap, searchAvailable]);

  // Handle adding function to selected list
  const handleAddFunction = (jfId: string) => {
    setSelectedTariffs(prev => [
      ...prev,
      { job_function_id: jfId, valor_tarifa: 20.00 } // Default fallback rate
    ]);
  };

  // Handle rate change
  const handleRateChange = (jfId: string, val: string) => {
    const numeric = parseFloat(val) || 0;
    setSelectedTariffs(prev =>
      prev.map(t => (t.job_function_id === jfId ? { ...t, valor_tarifa: numeric } : t))
    );
  };

  // Handle removing function
  const handleRemoveFunction = async (jfId: string) => {
    const siteIdFilter = selectedSiteId === 'global' ? null : selectedSiteId;
    
    // If it exists in activeTariffs, call delete API
    const existsInDb = activeTariffs.some(
      t => t.job_function_id === jfId && t.client_site_id === siteIdFilter
    );

    if (existsInDb) {
      try {
        await deleteTariff({ clientSiteId: siteIdFilter, jobFunctionId: jfId });
        toast.success('Função removida com sucesso!');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao remover função');
        return;
      }
    }

    // Update local state
    setSelectedTariffs(prev => prev.filter(t => t.job_function_id !== jfId));
  };

  // Save all tariffs for this site
  const handleSaveTariffs = async () => {
    if (!selectedEmpresaId) return;
    const siteIdFilter = selectedSiteId === 'global' ? null : selectedSiteId;

    try {
      const promises = selectedTariffs.map(t =>
        saveTariff({
          clientSiteId: siteIdFilter,
          jobFunctionId: t.job_function_id,
          valor_tarifa: t.valor_tarifa
        })
      );
      await Promise.all(promises);
      toast.success('Tarifas salvas com sucesso!');
      refetchTariffs();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar tarifas');
    }
  };

  // Save worker exception
  const handleSaveWorkerException = async () => {
    if (!selectedWorkerId) {
      toast.error('Selecione um trabalhador');
      return;
    }
    if (!workerRate || isNaN(parseFloat(workerRate))) {
      toast.error('Informe um valor de tarifa válido');
      return;
    }

    const siteIdFilter = workerSiteId === 'global' ? null : workerSiteId;

    try {
      await saveWorkerTariff({
        clientSiteId: siteIdFilter,
        workerId: selectedWorkerId,
        valor_tarifa: parseFloat(workerRate)
      });
      toast.success('Exceção cadastrada com sucesso!');
      setIsWorkerDialogOpen(false);
      setSelectedWorkerId('');
      setWorkerRate('');
      setWorkerSiteId('global');
      refetchExceptions();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar exceção');
    }
  };

  // Delete worker exception
  const handleDeleteWorkerException = async (id: string) => {
    try {
      await deleteWorkerTariff(id);
      toast.success('Exceção removida com sucesso!');
      refetchExceptions();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover exceção');
    }
  };

  const isLoading = loadingSites || loadingFunctions || loadingTariffs || loadingExceptions;

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dados da tabela de preços...</div>;
  }

  return (
    <div className="space-y-8">
      
      {/* SEÇÃO 1: Tarifas de Funções (Estrutura de Duas Colunas) */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-6 shadow-sm dark:bg-slate-950 dark:border-slate-900">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Wallet className="h-5 w-5 text-orange-500" />
              Tabela de Tarifas por Função
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Defina os valores das horas cobrados do cliente para cada perfil profissional.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Label htmlFor="tariff_site_select" className="text-xs font-semibold uppercase text-slate-500 shrink-0">Obra / Local:</Label>
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger id="tariff_site_select" className="w-full md:w-[280px] bg-slate-50 border-slate-200 focus:ring-orange-500">
                <SelectValue placeholder="Selecione o local..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Dados Gerais (Sem Obra)</SelectItem>
                {sites.map(s => (
                  <SelectItem key={s.id} value={s.id}>Obra: {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          
          {/* Coluna Esquerda: Funções Disponíveis */}
          <div className="border rounded-xl p-5 bg-slate-50/40 dark:bg-slate-900/10 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Funções Disponíveis</h3>
              <Badge variant="outline" className="font-mono text-xs">{availableFunctions.length} restantes</Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Pesquisar função profissional..."
                value={searchAvailable}
                onChange={e => setSearchAvailable(e.target.value)}
                className="pl-9 bg-white focus-visible:ring-orange-500"
              />
            </div>

            <div className="h-[380px] overflow-y-auto pr-1 space-y-3">
              {availableFunctions.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground pt-12">Nenhuma função encontrada.</div>
              ) : (
                availableFunctions.map(jf => (
                  <Card key={jf.id} className="border border-slate-100 hover:border-orange-500/30 hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-3 flex justify-between items-center gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{jf.name}</div>
                        <div className="text-xs text-slate-400">Código: {jf.cod_func || 'N/A'}</div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20"
                        onClick={() => handleAddFunction(jf.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Coluna Direita: Funções Selecionadas com Inputs */}
          <div className="border border-orange-500/20 rounded-xl p-5 bg-white dark:bg-slate-950 space-y-4 relative">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wider">Funções Selecionadas</h3>
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400">{selectedTariffs.length} ativas</Badge>
            </div>

            <div className="h-[432px] overflow-y-auto pr-1 space-y-3">
              {selectedTariffs.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground pt-16">
                  Nenhuma função configurada para este local.<br/>
                  Clique no botão (+) ao lado das funções para começar.
                </div>
              ) : (
                selectedTariffs.map(t => {
                  const jf = jobFunctions.find(j => j.id === t.job_function_id);
                  return (
                    <div key={t.job_function_id} className="flex items-center justify-between border rounded-lg p-3 bg-slate-50/50 hover:bg-slate-50 transition-all dark:bg-slate-900/30">
                      <div className="space-y-0.5 shrink-0 max-w-[240px] md:max-w-[320px]">
                        <div className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{jf?.name || 'Função Desconhecida'}</div>
                        <div className="text-xs text-slate-400 font-mono font-semibold">Cód: {jf?.cod_func || 'N/A'}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center border rounded bg-white pl-2 w-28 focus-within:ring-1 focus-within:ring-orange-500">
                          <span className="text-xs font-semibold text-slate-400">€</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.50"
                            value={t.valor_tarifa}
                            onChange={e => handleRateChange(t.job_function_id, e.target.value)}
                            className="border-0 shadow-none h-8 pl-1 pr-2 text-right focus-visible:ring-0 text-sm font-semibold"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
                          onClick={() => handleRemoveFunction(t.job_function_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedTariffs.length > 0 && (
              <div className="pt-3 border-t flex justify-end">
                <Button
                  onClick={handleSaveTariffs}
                  disabled={isSavingTariff}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs px-4 gap-1.5 shadow-md shadow-orange-500/10"
                >
                  <Check className="h-3.5 w-3.5" />
                  Salvar Tarifas da Obra
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* SEÇÃO 2: Exceções por Trabalhador (Worker Exceptions) */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-6 shadow-sm dark:bg-slate-950 dark:border-slate-900">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Users className="h-5 w-5 text-orange-500" />
              Exceções de Tarifa por Trabalhador
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure tarifas de faturamento customizadas para trabalhadores individuais que diferem do valor padrão da função.
            </p>
          </div>

          <Button
            onClick={() => setIsWorkerDialogOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-1.5 text-xs px-3 shadow-md shadow-orange-500/10"
          >
            <Plus className="h-4 w-4" />
            Nova Exceção
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500">Trabalhador</th>
                <th className="px-4 py-3 font-medium text-slate-500">Função</th>
                <th className="px-4 py-3 font-medium text-slate-500">Local / Obra</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Tarifa Customizada</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingExceptions ? (
                <tr><td colSpan={5} className="p-4 text-center text-slate-400">Carregando exceções...</td></tr>
              ) : workerExceptions.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400 text-xs">Nenhuma exceção de tarifa cadastrada para este cliente.</td></tr>
              ) : (
                workerExceptions.map(exc => (
                  <tr key={exc.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {exc.worker?.nome || 'Trabalhador Não Informado'}
                      <span className="block text-xs text-slate-400 font-mono">Código: {exc.worker?.cod_colab || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{exc.worker?.funcion || 'Não Informada'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {exc.site ? (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-400" />{exc.site.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Todos os locais (Global)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600">
                      € {Number(exc.valor_tarifa).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
                        onClick={() => handleDeleteWorkerException(exc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIÁLOGO: Adicionar Exceção por Trabalhador */}
      <Dialog open={isWorkerDialogOpen} onOpenChange={setIsWorkerDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Exceção de Trabalhador
            </DialogTitle>
            <DialogDescription>
              Defina um valor de faturamento específico por hora para um trabalhador neste cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="dialog_worker_select">Selecione o Trabalhador</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger id="dialog_worker_select" className="bg-slate-50">
                  <SelectValue placeholder="Selecione o trabalhador..." />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {loadingWorkers ? (
                    <SelectItem value="loading" disabled>Carregando trabalhadores...</SelectItem>
                  ) : (
                    workersList.map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.nome} ({w.funcion || 'Sem Função'})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog_site_select">Obra / Local de Operação</Label>
              <Select value={workerSiteId} onValueChange={setWorkerSiteId}>
                <SelectTrigger id="dialog_site_select" className="bg-slate-50">
                  <SelectValue placeholder="Selecione o local..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Todos os locais (Global)</SelectItem>
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id}>Obra: {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog_rate_value">Valor da Tarifa de Faturamento (€/h)</Label>
              <div className="flex items-center border rounded bg-slate-50 pl-3 focus-within:ring-1 focus-within:ring-orange-500">
                <span className="text-sm font-semibold text-slate-400">€</span>
                <Input
                  id="dialog_rate_value"
                  type="number"
                  min="0"
                  step="0.50"
                  placeholder="Ex: 35.00"
                  value={workerRate}
                  onChange={e => setWorkerRate(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 font-semibold"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsWorkerDialogOpen(false)}
              className="text-xs px-4"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveWorkerException}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs px-4"
            >
              Adicionar Exceção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
