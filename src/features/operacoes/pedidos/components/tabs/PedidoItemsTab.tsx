import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PedidoStatusBadge } from '../PedidoStatusBadge';
import { formatCurrency } from '@/shared/utils/currency';
import type { Pedido, PedidoItem, PedidoSummaryMetrics } from '../../types';
import { usePedidoFinanceAccess } from '../../hooks/usePedidoFinanceAccess';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Users, Home, UserCheck, UserMinus, ArrowUpRight } from 'lucide-react';
import { updatePedidoItemQuantity, addPedidoItem, deletePedidoItem } from '../../services/pedidoItemsService';

interface Props {
  items: PedidoItem[];
  pedido?: Pedido;
  summary?: PedidoSummaryMetrics;
}

export function PedidoItemsTab({ items, pedido, summary }: Props) {
  const { t } = useTranslation();
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
      toast.error(t('cockpit_pedidos.items_tab.toast_negative_qty'));
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

      toast.success(t('cockpit_pedidos.items_tab.toast_item_updated'));
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['logistica-data'] });
      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Erro ao atualizar item do pedido:', err);
      toast.error(t('cockpit_pedidos.items_tab.toast_item_update_err') + (err.message || ''));
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
      toast.error(t('cockpit_pedidos.items_tab.toast_select_role'));
      return;
    }
    if (addQuantity <= 0) {
      toast.error(t('cockpit_pedidos.items_tab.toast_qty_gt_zero'));
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

      toast.success(t('cockpit_pedidos.items_tab.toast_profile_added'));
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['logistica-data'] });
      setIsAddOpen(false);
    } catch (err: any) {
      console.error('Erro ao adicionar perfil ao pedido:', err);
      toast.error(t('cockpit_pedidos.items_tab.toast_profile_add_err') + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (item: PedidoItem) => {
    if (!pedido) return;
    if (item.quantity_fulfilled > 0) {
      toast.error(t('cockpit_pedidos.items_tab.toast_cannot_delete', { count: item.quantity_fulfilled }));
      return;
    }

    const profileName = item.job_function?.name || item.job_function_name_snapshot || '';
    if (!confirm(t('cockpit_pedidos.items_tab.confirm_delete', { name: profileName }))) {
      return;
    }

    try {
      await deletePedidoItem(item.id, pedido.id);
      toast.success(t('cockpit_pedidos.items_tab.toast_profile_deleted'));
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['logistica-data'] });
    } catch (err: any) {
      console.error('Erro ao remover item:', err);
      toast.error(t('cockpit_pedidos.items_tab.toast_profile_delete_err') + err.message);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            {t('cockpit_pedidos.items_tab.title')}
          </CardTitle>
          <CardDescription className="mt-1">
            {t('cockpit_pedidos.items_tab.desc')}
          </CardDescription>
        </div>
        {pedido && pedido.commercial_status !== 'cancelled' && (
          <Button 
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} /> {t('cockpit_pedidos.items_tab.add_profile_btn')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {(!items || items.length === 0) ? (
          <div className="py-10 text-center text-muted-foreground">
            {t('cockpit_pedidos.items_tab.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t('cockpit_pedidos.items_tab.col_function')}</th>
                  <th className="px-4 py-3 text-center font-medium">{t('cockpit_pedidos.items_tab.col_status')}</th>
                  <th className="px-4 py-3 text-center font-medium">{t('cockpit_pedidos.items_tab.col_qty')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('cockpit_pedidos.items_tab.col_hours')}</th>
                  {hasFinanceAccess && (
                    <>
                      <th className="px-4 py-3 text-right font-medium">{t('cockpit_pedidos.items_tab.col_base_rate')}</th>
                      <th className="px-4 py-3 text-right font-medium">{t('cockpit_pedidos.items_tab.col_sell_rate')}</th>
                      <th className="px-4 py-3 text-right font-medium">{t('cockpit_pedidos.items_tab.col_margin')}</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center font-medium">{t('cockpit_pedidos.items_tab.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.job_function?.name || item.job_function_name_snapshot || t('cockpit_pedidos.items_tab.no_function')}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        {item.includes_accommodation_snapshot && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">
                            {t('cockpit_pedidos.items_tab.housing_badge')}
                            {hasFinanceAccess && item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null
                              ? `: €${Number(item.custom_lodging_rate).toFixed(2)}${t('cockpit_pedidos.items_tab.per_day')}`
                              : ''}
                          </span>
                        )}
                        {item.includes_transport_snapshot && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">
                            {t('cockpit_pedidos.items_tab.transport_badge')}
                          </span>
                        )}
                        {item.includes_ppe_snapshot && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">
                            {t('cockpit_pedidos.items_tab.ppe_badge')}
                          </span>
                        )}
                        {item.ss_regime && item.ss_regime !== 'none' && (
                          <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                            {t('cockpit_pedidos.items_tab.ss_badge', {
                              regime: item.ss_regime === 'destacado' ? t('cockpit_pedidos.items_tab.ss_destacado') : t('cockpit_pedidos.items_tab.ss_local')
                            })}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const itemFnName = (item.job_function?.name || item.job_function_name_snapshot || '').toLowerCase();
                        const itemWorkers = (summary?.workers || []).filter(
                          w => w.pedido_item_id === item.id || (!w.pedido_item_id && itemFnName && w.funcao.toLowerCase() === itemFnName)
                        );
                        if (itemWorkers.length === 0) return null;
                        return (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                            {itemWorkers.map(w => (
                              <span
                                key={w.assignment_id}
                                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                                  w.movement_type === 'exited'
                                    ? 'bg-rose-50/50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800 line-through opacity-80'
                                    : w.movement_type === 'entering'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                }`}
                              >
                                {w.movement_type === 'exited' ? (
                                  <UserMinus className="h-3 w-3 shrink-0" />
                                ) : w.movement_type === 'entering' ? (
                                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                                ) : (
                                  <UserCheck className="h-3 w-3 shrink-0" />
                                )}
                                <strong className="font-mono text-[10px]">{w.cod_colab}</strong>
                                <span>{w.nome}</span>
                                {w.housing && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] bg-white/80 dark:bg-slate-900 px-1 rounded text-indigo-600 dark:text-indigo-400">
                                    <Home className="h-2.5 w-2.5" /> {w.housing.alojamento_codigo || w.housing.alojamento_nome}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
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
                      {item.planned_total_hours ? t('cockpit_pedidos.items_tab.total_hours_suffix', { hours: item.planned_total_hours }) : '-'}
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
                          title={t('cockpit_pedidos.items_tab.edit_tooltip')}
                        >
                          <Pencil size={15} className="mr-1" />
                          <span className="text-xs">{t('cockpit_pedidos.items_tab.edit_btn')}</span>
                        </Button>
                        {item.quantity_fulfilled === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item)}
                            className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title={t('cockpit_pedidos.items_tab.delete_tooltip')}
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
            <DialogTitle>{t('cockpit_pedidos.items_tab.edit_modal_title')}</DialogTitle>
            <DialogDescription>
              {t('cockpit_pedidos.items_tab.profile_label')} <strong className="text-slate-800 dark:text-slate-100">{selectedItem?.job_function?.name || selectedItem?.job_function_name_snapshot}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border text-sm flex items-center justify-between">
              <span className="text-muted-foreground">{t('cockpit_pedidos.items_tab.already_hired')}</span>
              <span className="font-bold text-emerald-600 text-base">{selectedItem?.quantity_fulfilled || 0}</span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-quantity">{t('cockpit_pedidos.items_tab.requested_qty_label')}</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="1"
                value={editQuantity}
                onChange={(e) => handleEditQuantityChange(parseInt(e.target.value) || 0)}
              />
              {selectedItem && editQuantity < selectedItem.quantity_fulfilled && (
                <p className="text-xs text-amber-600">
                  {t('cockpit_pedidos.items_tab.qty_warning', { newQty: editQuantity, hired: selectedItem.quantity_fulfilled })}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-hours">{t('cockpit_pedidos.items_tab.total_expected_hours')}</Label>
              <Input
                id="edit-hours"
                type="number"
                step="0.01"
                value={editTotalHours}
                onChange={(e) => setEditTotalHours(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[11px] text-muted-foreground">
                {t('cockpit_pedidos.items_tab.recalculated_hint')}
              </p>
            </div>

            {hasFinanceAccess && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-base-cost" className="text-xs">{t('cockpit_pedidos.items_tab.base_rate_label')}</Label>
                  <Input
                    id="edit-base-cost"
                    type="number"
                    step="0.5"
                    value={editBaseCost}
                    onChange={(e) => setEditBaseCost(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-sell-rate" className="text-xs">{t('cockpit_pedidos.items_tab.sell_rate_label')}</Label>
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
              {t('cockpit_pedidos.items_tab.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('cockpit_pedidos.items_tab.save_changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Novo Perfil */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('cockpit_pedidos.items_tab.add_modal_title')}</DialogTitle>
            <DialogDescription>
              {t('cockpit_pedidos.items_tab.add_modal_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid gap-2">
              <Label htmlFor="add-job-function">{t('cockpit_pedidos.items_tab.role_label')}</Label>
              <Select value={addJobFunctionId} onValueChange={setAddJobFunctionId}>
                <SelectTrigger id="add-job-function">
                  <SelectValue placeholder={t('cockpit_pedidos.items_tab.select_role_placeholder')} />
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
                <Label htmlFor="add-quantity">{t('cockpit_pedidos.items_tab.vacancies_qty')}</Label>
                <Input
                  id="add-quantity"
                  type="number"
                  min="1"
                  value={addQuantity}
                  onChange={(e) => handleAddQuantityChange(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-total-hours">{t('cockpit_pedidos.items_tab.total_expected_hours')}</Label>
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
                <Label htmlFor="add-hours-day" className="text-xs">{t('cockpit_pedidos.items_tab.hours_per_day')}</Label>
                <Input
                  id="add-hours-day"
                  type="number"
                  step="0.5"
                  value={addHoursPerDay}
                  onChange={(e) => setAddHoursPerDay(parseFloat(e.target.value) || 9)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-days-week" className="text-xs">{t('cockpit_pedidos.items_tab.days_per_week')}</Label>
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
                <Label htmlFor="add-base-cost" className="text-xs">{t('cockpit_pedidos.items_tab.base_rate_label')}</Label>
                <Input
                  id="add-base-cost"
                  type="number"
                  step="0.5"
                  value={addBaseCost}
                  onChange={(e) => setAddBaseCost(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-sell-rate" className="text-xs">{t('cockpit_pedidos.items_tab.sell_rate_label')}</Label>
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
              <Label className="text-xs">{t('cockpit_pedidos.items_tab.ss_regime_label')}</Label>
              <Select value={addSsRegime} onValueChange={(val: any) => setAddSsRegime(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">{t('cockpit_pedidos.items_tab.ss_local')}</SelectItem>
                  <SelectItem value="destacado">{t('cockpit_pedidos.items_tab.ss_destacado')}</SelectItem>
                  <SelectItem value="none">{t('cockpit_pedidos.items_tab.ss_none')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t">
              <Label className="text-xs mb-2 block">{t('cockpit_pedidos.items_tab.benefits_label')}</Label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addHousing}
                    onChange={(e) => setAddHousing(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>{t('cockpit_pedidos.items_tab.housing_badge')}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addEpi}
                    onChange={(e) => setAddEpi(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>{t('cockpit_pedidos.items_tab.ppe_badge')}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addTransport}
                    onChange={(e) => setAddTransport(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>{t('cockpit_pedidos.items_tab.transport_badge')}</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>
              {t('cockpit_pedidos.items_tab.cancel')}
            </Button>
            <Button onClick={handleSaveAdd} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('cockpit_pedidos.items_tab.add_to_order_btn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
