import { supabase } from '@/shared/supabase/client';

export interface UpdateItemParams {
  itemId: string;
  pedidoId: string;
  quantityRequested: number;
  plannedTotalHours?: number;
  sellRate?: number;
  baseCost?: number;
}

export interface AddItemParams {
  pedidoId: string;
  empresaId: string;
  jobFunctionId: string;
  jobFunctionNameSnapshot?: string;
  quantityRequested: number;
  plannedHoursPerDay?: number;
  plannedDaysPerWeek?: number;
  plannedTotalHours?: number;
  sellRateHourSnapshot?: number;
  baseCostHourSnapshot?: number;
  includesHousing?: boolean;
  includesTransport?: boolean;
  includesEpi?: boolean;
  ssRegime?: 'local' | 'destacado' | 'none';
}

export async function recalculatePedidoTotals(pedidoId: string): Promise<void> {
  const { data: items, error: itemsError } = await supabase
    .schema('core_comercial')
    .from('pedido_items')
    .select('*')
    .eq('pedido_id', pedidoId)
    .neq('status', 'cancelled');

  if (itemsError) throw itemsError;

  let totalCost = 0;
  let totalRevenue = 0;

  for (const it of items || []) {
    const hours = Number(it.planned_total_hours) || 0;
    const sellRate = Number(it.sell_rate_hour_snapshot || 0);
    const baseCost = Number(it.base_cost_hour_snapshot || 0);
    totalRevenue += hours * sellRate;
    totalCost += hours * baseCost;
  }

  const marginPercent = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  const { error: updatePedError } = await supabase
    .schema('core_comercial')
    .from('pedidos')
    .update({
      total_cost_snapshot: Number(totalCost.toFixed(2)),
      total_revenue_snapshot: Number(totalRevenue.toFixed(2)),
      margin_percent_snapshot: Number(marginPercent.toFixed(2)),
      updated_at: new Date().toISOString()
    })
    .eq('id', pedidoId);

  if (updatePedError) throw updatePedError;
}

export async function updatePedidoItemQuantity(params: UpdateItemParams): Promise<void> {
  const { itemId, pedidoId, quantityRequested, plannedTotalHours, sellRate, baseCost } = params;

  const { data: currentItem, error: fetchErr } = await supabase
    .schema('core_comercial')
    .from('pedido_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (fetchErr) throw fetchErr;

  const fulfilled = Number(currentItem.quantity_fulfilled || 0);
  const status = fulfilled >= quantityRequested && quantityRequested > 0 ? 'fulfilled' : 'pending';

  const updatePayload: any = {
    quantity_requested: quantityRequested,
    status,
    updated_at: new Date().toISOString()
  };

  if (plannedTotalHours !== undefined) {
    updatePayload.planned_total_hours = plannedTotalHours;
  } else if (currentItem.quantity_requested && Number(currentItem.quantity_requested) > 0) {
    const hoursPerWorker = Number(currentItem.planned_total_hours || 0) / Number(currentItem.quantity_requested);
    updatePayload.planned_total_hours = Number((hoursPerWorker * quantityRequested).toFixed(2));
  }

  if (sellRate !== undefined) {
    updatePayload.sell_rate_hour_snapshot = sellRate;
  }
  if (baseCost !== undefined) {
    updatePayload.base_cost_hour_snapshot = baseCost;
  }

  if (updatePayload.sell_rate_hour_snapshot !== undefined && updatePayload.base_cost_hour_snapshot !== undefined) {
    const s = Number(updatePayload.sell_rate_hour_snapshot);
    const b = Number(updatePayload.base_cost_hour_snapshot);
    updatePayload.margin_percent_snapshot = s > 0 ? Number((((s - b) / s) * 100).toFixed(2)) : 0;
  }

  const { error: updateErr } = await supabase
    .schema('core_comercial')
    .from('pedido_items')
    .update(updatePayload)
    .eq('id', itemId);

  if (updateErr) throw updateErr;

  await recalculatePedidoTotals(pedidoId);
}

export async function addPedidoItem(params: AddItemParams): Promise<void> {
  const {
    pedidoId,
    empresaId,
    jobFunctionId,
    jobFunctionNameSnapshot,
    quantityRequested,
    plannedHoursPerDay = 9,
    plannedDaysPerWeek = 5,
    plannedTotalHours,
    sellRateHourSnapshot = 28,
    baseCostHourSnapshot = 16,
    includesHousing = true,
    includesTransport = false,
    includesEpi = true,
    ssRegime = 'local'
  } = params;

  const margin = sellRateHourSnapshot > 0 
    ? Number((((sellRateHourSnapshot - baseCostHourSnapshot) / sellRateHourSnapshot) * 100).toFixed(2))
    : 0;

  // Calculo de horas padrao (ex: 58 dias úteis * 9h = 522h por trabalhador ou proporcional)
  const hoursPerWorker = 522;
  const totalHours = plannedTotalHours !== undefined 
    ? plannedTotalHours 
    : quantityRequested * hoursPerWorker;

  const insertPayload = {
    empresa_id: empresaId,
    pedido_id: pedidoId,
    job_function_id: jobFunctionId,
    job_function_name_snapshot: jobFunctionNameSnapshot || null,
    quantity_requested: quantityRequested,
    quantity_fulfilled: 0,
    planned_hours_per_day: plannedHoursPerDay,
    planned_days_per_week: plannedDaysPerWeek,
    planned_total_hours: Number(totalHours.toFixed(2)),
    sell_rate_hour_snapshot: sellRateHourSnapshot,
    base_cost_hour_snapshot: baseCostHourSnapshot,
    margin_percent_snapshot: margin,
    includes_housing: !!includesHousing,
    includes_transport: !!includesTransport,
    includes_epi: !!includesEpi,
    ss_regime: ssRegime,
    status: 'pending',
    risk_level_snapshot: 'medium',
    description_snapshot: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: insertErr } = await supabase
    .schema('core_comercial')
    .from('pedido_items')
    .insert(insertPayload);

  if (insertErr) throw insertErr;

  await recalculatePedidoTotals(pedidoId);
}

export async function deletePedidoItem(itemId: string, pedidoId: string): Promise<void> {
  const { error } = await supabase
    .schema('core_comercial')
    .from('pedido_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;

  await recalculatePedidoTotals(pedidoId);
}
