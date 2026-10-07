import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PedidoStatusBadge } from '../PedidoStatusBadge';
import { formatCurrency } from '@/shared/utils/currency';
import type { Pedido, PedidoItem } from '../../types';
import { usePedidoFinanceAccess } from '../../hooks/usePedidoFinanceAccess';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { updatePedidoItemQuantity, addPedidoItem, deletePedidoItem } from '../../services/pedidoItemsService';

interface Props {
  items: PedidoItem[];
  pedido?: Pedido;
}

export function PedidoItemsTab({ items, pedido }: Props) {
  const { hasFinanceAccess } = usePedidoFinanceAccess();
  const queryClient = useQueryClient();

  // Dialog states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PedidoItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editTotalHours, setEditTotalHours] = useState<number>(0);
  const [editSellRate, setEditSellRate] = useState<number>(28);
  const [editBaseCost, setEditBaseCost] = useState<number>(16);

  // Add form state
  const [addJobFunctionId, setAddJobFunctionId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [addHoursPerDay, setAddHoursPerDay] = useState<number>(9);
  const [addDaysPerWeek, setAddDaysPerWeek] = useState<number>(5);
  const [addTotalHours, setAddTotalHours] = useState<number>(522);
  const [addSellRate, setAddSellRate] = useState<number>(28);
  const [addBaseCost, setAddBaseCost] = useState<number>(16);
  const [addHousing, setAddHousing] = useState<boolean>(true);
  const [addTransport, setAddTransport] = useState<boolean>(false);
  const [addEpi, setAddEpi] = useState<boolean>(true);
  const [addSsRegime, setAddSsRegime] = useState<'local' | 'destacado' | 'none'>('local');

  // Fetch available job functions
  const { data: jobFunctions = [] } = useQuery({
    queryKey: ['job_functions_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('job_functions')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const handleOpenEdit = (item: PedidoItem) => {
    setSelectedItem(item);
    setEditQuantity(item.quantity_requested);
    setEditTotalHours(Number(item.planned_total_hours) || 0);
    setEditSellRate(Number(item.sell_rate_hour_snapshot) || 28);
    setEditBaseCost(Number(item.base_cost_hour_snapshot) || 16);
    setIsEditOpen(true);
  };

  const handleEditQuantityChange = (newQty: number) => {
    setEditQuantity(newQty);
    if (selectedItem && selectedItem.quantity_requested > 0) {
      const currentHoursPerWorker = (Number(selectedItem.planned_total_hours) || 0) / selectedItem.quantity_requested;
      setEditTotalHours(Math.round(currentHoursPerWorker * newQty));
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedItem || !pedido) return;
    if (editQuantity < 0) {
      toast.error('A quantidade solicitada não pode ser negativa.');
      return;
    }

    setIsSaving(true);
    try {
      await updatePedidoItemQuantity({
        itemId: selectedItem.id,
        pedidoId: pedido.id,
        quantityRequested: editQuantity,
        plannedTotalHours: editTotalHours,
        sellRate: hasFinanceAccess ? editSellRate : undefined,
        baseCost: hasFinanceAccess ? editBaseCost : undefined,
      });

      toast.success('Quantidade e informações do item atualizadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['logistica-data'] });
      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Erro ao atualizar item do pedido:', err);
      toast.error('Erro ao atualizar item: ' + (err.message || 'Erro inesperado'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAdd = () => {
    setAddJobFunctionId('');
    setAddQuantity(1);
    setAddHoursPerDay(9);
    setAddDaysPerWeek(5);
    setAddTotalHours(522);
    setAddSellRate(28);
    setAddBaseCost(16);
    setAddHousing(true);
    setAddTransport(false);
    setAddEpi(true);
    setAddSsRegime('local');
    setIsAddOpen(true);
  };

  const handleAddQuantityChange = (qty: number) => {
    setAddQuantity(qty);
    setAddTotalHours(qty * 522);
  };

  const handleSaveAdd = async () => {
    if (!pedido) return;
    if (!addJobFunctionId) {
      toast.error('Selecione uma função/perfil para adicionar.');
      return;
    }
    if (addQuantity <= 0) {
      toast.error('A quantidade deve ser maior que zero.');
      return;
    }

    const selectedJob = jobFunctions.find(j => j.id === addJobFunctionId);

    setIsSaving(true);
    try {
      await addPedidoItem({
        pedidoId: pedido.id,
        empresaId: pedido.empresa_id,
        jobFunctionId: addJobFunctionId,
        jobFunctionNameSnapshot: selectedJob?.name,
        quantityRequested: addQuantity,
        plannedHoursPerDay: addHoursPerDay,
        plannedDaysPerWeek: addDaysPerWeek,
        plannedTotalHours: addTotalHours,
        sellRateHourSnapshot: addSellRate,
        baseCostHourSnapshot: addBaseCost,
        includesHousing: addHousing,
        includesTransport: addTransport,
        includesEpi: addEpi,
        ssRegime: addSsRegime,
      });

      toast.success('Novo perfil adicionado ao pedido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['logistica-data'] });
      setIsAddOpen(false);
    } catch (err: any) {
      console.error('Erro ao adicionar perfil ao pedido:', err);
      toast.error('Erro ao adicionar perfil: ' + (err.message || 'Erro inesperado'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (item: PedidoItem) => {
    if (!pedido) return;
    if (item.quantity_fulfilled > 0) {
      toast.error(`Não é possível excluir este perfil pois já existem ${item.quantity_fulfilled} trabalhadores contratados/alocados.`);
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o perfil "${item.job_function?.name || item.job_function_name_snapshot}" deste pedido?`)) {
      return;
    }

    try {
      await deletePedidoItem(item.id, pedido.id);
      toast.success('Perfil removido do pedido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['logistica-data'] });
    } catch (err: any) {
      console.error('Erro ao remover item:', err);
      toast.error('Erro ao remover perfil: ' + err.message);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Vagas e Perfis Solicitados
          </CardTitle>
          <CardDescription className="mt-1">
            Gerencie e ajuste as vagas contratadas, adicione novos perfis ou edite as quantidades do pedido.
          </CardDescription>
        </div>
        {pedido && pedido.commercial_status !== 'cancelled' && (
          <Button 
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} /> Adicionar Perfil / Vaga
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {(!items || items.length === 0) ? (
          <div className="py-10 text-center text-muted-foreground">
            Nenhum item ou perfil cadastrado neste pedido.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Função (Snapshot)</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Qtd (Preenchida/Solicitada)</th>
                  <th className="px-4 py-3 text-right font-medium">Horas Previstas</th>
                  {hasFinanceAccess && (
                    <>
                      <th className="px-4 py-3 text-right font-medium">Tarifa Base</th>
                      <th className="px-4 py-3 text-right font-medium">Tarifa Venda</th>
                      <th className="px-4 py-3 text-right font-medium">Margem</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.job_function?.name || item.job_function_name_snapshot || 'Sem Função'}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        {item.includes_accommodation_snapshot && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">
                            Alojamento{hasFinanceAccess && item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null ? `: €${Number(item.custom_lodging_rate).toFixed(2)}/dia` : ''}
                          </span>
                        )}
                        {item.includes_transport_snapshot && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">
                            Transporte
                          </span>
                        )}
                        {item.includes_ppe_snapshot && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">
                            EPI
                          </span>
                        )}
                        {item.ss_regime && item.ss_regime !== 'none' && (
                          <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                            Seg. Social: {item.ss_regime === 'destacado' ? 'Destacado' : 'Local'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PedidoStatusBadge type="item" status={item.item_status || 'pending'} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${item.quantity_fulfilled >= item.quantity_requested ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {item.quantity_fulfilled}
                      </span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.quantity_requested}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {item.planned_total_hours ? `${item.planned_total_hours}h totais` : '-'}
                    </td>
                    {hasFinanceAccess && (
                      <>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatCurrency(item.base_cost_hour_snapshot || 0)}/h
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-blue-600">
                          {formatCurrency(item.sell_rate_hour_snapshot || 0)}/h
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            (item.margin_percent_snapshot || 0) >= 20 ? 'bg-emerald-100 text-emerald-700' :
                            (item.margin_percent_snapshot || 0) >= 10 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.margin_percent_snapshot || 0}%
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          title="Alterar quantidade / vagas"
                        >
                          <Pencil size={15} className="mr-1" />
                          <span className="text-xs">Editar</span>
                        </Button>
                        {item.quantity_fulfilled === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item)}
                            className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Remover perfil"
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Modal Editar Quantidade */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Quantidade de Vagas</DialogTitle>
            <DialogDescription>
              Perfil: <strong className="text-slate-800 dark:text-slate-100">{selectedItem?.job_function?.name || selectedItem?.job_function_name_snapshot}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Trabalhadores já contratados:</span>
              <span className="font-bold text-emerald-600 text-base">{selectedItem?.quantity_fulfilled || 0}</span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-quantity">Quantidade Solicitada de Vagas</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="1"
                value={editQuantity}
                onChange={(e) => handleEditQuantityChange(parseInt(e.target.value) || 0)}
              />
              {selectedItem && editQuantity < selectedItem.quantity_fulfilled && (
                <p className="text-xs text-amber-600">
                  Atenção: A nova quantidade ({editQuantity}) é menor que os trabalhadores já contratados ({selectedItem.quantity_fulfilled}).
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-hours">Horas Previstas Totais</Label>
              <Input
                id="edit-hours"
                type="number"
                step="0.01"
                value={editTotalHours}
                onChange={(e) => setEditTotalHours(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[11px] text-muted-foreground">
                Recalculado proporcionalmente à quantidade de vagas.
              </p>
            </div>

            {hasFinanceAccess && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-base-cost" className="text-xs">Tarifa Base (€/h)</Label>
                  <Input
                    id="edit-base-cost"
                    type="number"
                    step="0.5"
                    value={editBaseCost}
                    onChange={(e) => setEditBaseCost(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-sell-rate" className="text-xs">Tarifa Venda (€/h)</Label>
                  <Input
                    id="edit-sell-rate"
                    type="number"
                    step="0.5"
                    value={editSellRate}
                    onChange={(e) => setEditSellRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Novo Perfil */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Perfil ao Pedido</DialogTitle>
            <DialogDescription>
              Inclua uma nova função ou especialidade com quantidade de vagas e condições contratuais.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid gap-2">
              <Label htmlFor="add-job-function">Função / Cargo</Label>
              <Select value={addJobFunctionId} onValueChange={setAddJobFunctionId}>
                <SelectTrigger id="add-job-function">
                  <SelectValue placeholder="Selecione o perfil profissional..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {jobFunctions.map((jf) => (
                    <SelectItem key={jf.id} value={jf.id}>
                      {jf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="add-quantity">Quantidade de Vagas</Label>
                <Input
                  id="add-quantity"
                  type="number"
                  min="1"
                  value={addQuantity}
                  onChange={(e) => handleAddQuantityChange(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-total-hours">Horas Totais Previstas</Label>
                <Input
                  id="add-total-hours"
                  type="number"
                  step="0.01"
                  value={addTotalHours}
                  onChange={(e) => setAddTotalHours(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="add-hours-day" className="text-xs">Horas / Dia</Label>
                <Input
                  id="add-hours-day"
                  type="number"
                  step="0.5"
                  value={addHoursPerDay}
                  onChange={(e) => setAddHoursPerDay(parseFloat(e.target.value) || 9)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-days-week" className="text-xs">Dias / Semana</Label>
                <Input
                  id="add-days-week"
                  type="number"
                  value={addDaysPerWeek}
                  onChange={(e) => setAddDaysPerWeek(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="add-base-cost" className="text-xs">Tarifa Base (€/h)</Label>
                <Input
                  id="add-base-cost"
                  type="number"
                  step="0.5"
                  value={addBaseCost}
                  onChange={(e) => setAddBaseCost(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-sell-rate" className="text-xs">Tarifa Venda (€/h)</Label>
                <Input
                  id="add-sell-rate"
                  type="number"
                  step="0.5"
                  value={addSellRate}
                  onChange={(e) => setAddSellRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs">Regime de Seguridade Social</Label>
              <Select value={addSsRegime} onValueChange={(val: any) => setAddSsRegime(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="destacado">Destacado</SelectItem>
                  <SelectItem value="none">Nenhum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t">
              <Label className="text-xs mb-2 block">Benefícios e Itens Inclusos</Label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addHousing}
                    onChange={(e) => setAddHousing(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Alojamento</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addEpi}
                    onChange={(e) => setAddEpi(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>EPI</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addTransport}
                    onChange={(e) => setAddTransport(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Transporte</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAdd} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Adicionar ao Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
