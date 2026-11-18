import React, { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Search,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Plus,
  Minus,
  History,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { almacenService } from '../services/almacenService';
import type { AlmacenEmpresa, AlmacenStockItem, AlmacenStockMovement, MovementType } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const EstoqueAlmacenPage: React.FC = () => {
  const [stock, setStock] = useState<AlmacenStockItem[]>([]);
  const [empresas, setEmpresas] = useState<AlmacenEmpresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState<string>('ALL'); // ALL | SHARED | <uuid>
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Adjustment modal
  const [adjustItem, setAdjustItem] = useState<AlmacenStockItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<MovementType>('ENTRADA_COMPRA');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isSavingAdjust, setIsSavingAdjust] = useState(false);

  // History modal
  const [historyItem, setHistoryItem] = useState<AlmacenStockItem | null>(null);
  const [movements, setMovements] = useState<AlmacenStockMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stockData, empData] = await Promise.all([
        almacenService.getStock(),
        almacenService.getEmpresas(),
      ]);
      setStock(stockData);
      setEmpresas(empData);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar estoque');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      const createdCount = await almacenService.initializeStandardStock();
      if (createdCount === 0) {
        toast.info('Grade padrão já está completa!');
      } else {
        toast.success(`${createdCount} variações de estoque inicializadas!`);
        await loadData();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao inicializar grade');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleOpenHistory = async (item: AlmacenStockItem) => {
    setHistoryItem(item);
    setLoadingHistory(true);
    try {
      const data = await almacenService.getStockMovements(item.id);
      setMovements(data);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar histórico');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem || adjustDelta === 0) return;
    setIsSavingAdjust(true);
    try {
      await almacenService.adjustStock({
        stockId: adjustItem.id,
        quantityDelta: adjustDelta,
        movementType: adjustType,
        notes: adjustNotes.trim() || undefined,
      });
      toast.success('Estoque atualizado!');
      setAdjustItem(null);
      setAdjustNotes('');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao ajustar estoque');
    } finally {
      setIsSavingAdjust(false);
    }
  };

  const handleMinStockUpdate = async (item: AlmacenStockItem, newMin: number) => {
    try {
      await almacenService.upsertStockConfig({
        id: item.id,
        epi_id: item.epi_id,
        empresa_id: item.empresa_id,
        size_code: item.size_code,
        sku_code: item.sku_code,
        min_stock: Math.max(0, newMin),
        location_bin: item.location_bin,
        unit_cost: item.unit_cost,
      });
      setStock((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, min_stock: Math.max(0, newMin) } : s))
      );
      toast.success('Estoque mínimo atualizado');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar mínimo');
    }
  };

  const filteredStock = useMemo(() => {
    return stock.filter((s) => {
      if (onlyLowStock && s.quantity_on_hand > s.min_stock) return false;
      if (empresaFilter === 'SHARED' && s.empresa_id !== null) return false;
      if (empresaFilter !== 'ALL' && empresaFilter !== 'SHARED' && s.empresa_id !== empresaFilter)
        return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          (s.epi?.name || '').toLowerCase().includes(q) ||
          (s.sku_code || '').toLowerCase().includes(q) ||
          s.size_code.toLowerCase().includes(q) ||
          (s.empresa?.nome || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stock, onlyLowStock, empresaFilter, searchTerm]);

  const kpis = useMemo(() => {
    const totalSkus = stock.length;
    const totalUnits = stock.reduce((acc, s) => acc + s.quantity_on_hand, 0);
    const lowCount = stock.filter((s) => s.quantity_on_hand <= s.min_stock).length;
    const totalValue = stock.reduce(
      (acc, s) => acc + s.quantity_on_hand * Number(s.unit_cost || s.epi?.default_cost || 0),
      0
    );
    return { totalSkus, totalUnits, lowCount, totalValue };
  }, [stock]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="text-emerald-600" />
            Stock, Variaciones & Stock Mínimo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Controle de estoque único (EPIs padrão) e uniformes padronizados por empresa e tamanho.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleInitialize}
            disabled={isInitializing}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            {isInitializing ? 'Inicializando...' : 'Inicializar Grade Padrão'}
          </Button>
          <Button variant="outline" onClick={loadData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase">SKUs / Variações</div>
          <div className="text-2xl font-bold mt-1">{kpis.totalSkus}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase">Unidades em Armazém</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{kpis.totalUnits}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Abaixo do Mínimo
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{kpis.lowCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase">Valor Estimado</div>
          <div className="text-2xl font-bold mt-1">€ {kpis.totalValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar EPI, SKU ou tamanho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={empresaFilter}
            onChange={(e) => setEmpresaFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
          >
            <option value="ALL">Todas as Origens</option>
            <option value="SHARED">EPIs Padrão (Compartilhado)</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                Uniformes: {emp.nome}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
            onlyLowStock
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Somente Estoque Mínimo ({kpis.lowCount})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-340px)]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500">SKU</th>
                <th className="px-4 py-3 font-medium text-slate-500">Artigo / EPI</th>
                <th className="px-4 py-3 font-medium text-slate-500">Empresa / Tipo</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-center">Talla</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Saldo</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Mínimo</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Carregando estoque...
                  </td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhum item de estoque encontrado. Clique em "Inicializar Grade Padrão" para gerar os SKUs.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => {
                  const isLow = item.quantity_on_hand <= item.min_stock;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku_code || '-'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.epi?.name || 'EPI'}
                      </td>
                      <td className="px-4 py-3">
                        {item.empresa ? (
                          <Badge variant="outline">{item.empresa.nome}</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                            Padrão / Único
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">{item.size_code}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-bold ${
                            isLow ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {item.quantity_on_hand}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          defaultValue={item.min_stock}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val !== item.min_stock) {
                              handleMinStockUpdate(item, val);
                            }
                          }}
                          className="w-16 text-right text-xs border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Entrada de Estoque"
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustDelta(10);
                              setAdjustType('ENTRADA_COMPRA');
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Saída / Ajuste"
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustDelta(-1);
                              setAdjustType('AJUSTE_INVENTARIO');
                            }}
                          >
                            <Minus className="h-3.5 w-3.5 text-rose-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Histórico Kardex"
                            onClick={() => handleOpenHistory(item)}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                Movimentar: {adjustItem.epi?.name} ({adjustItem.size_code})
              </h3>
              <button onClick={() => setAdjustItem(null)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Tipo de Movimentação</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as MovementType)}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
                >
                  <option value="ENTRADA_COMPRA">Entrada de Compra / Fatura</option>
                  <option value="DEVOLUCAO">Devolução de Trabalhador</option>
                  <option value="AJUSTE_INVENTARIO">Ajuste de Inventário</option>
                  <option value="SAIDA_REPOSICION">Saída Avulsa (Reposição)</option>
                  <option value="SAIDA_DETERIORO">Baixa por Deterioro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Quantidade (+ entrada, - saída)
                </label>
                <Input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Observações / Nº Fatura</label>
                <Input
                  placeholder="Ex: Factura fornecedor #1234"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAdjustItem(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingAdjust} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isSavingAdjust ? 'Salvando...' : 'Confirmar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                Kardex: {historyItem.epi?.name} ({historyItem.size_code})
              </h3>
              <button onClick={() => setHistoryItem(null)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {loadingHistory ? (
                <div className="p-6 text-center text-sm text-slate-400">Carregando histórico...</div>
              ) : movements.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">Sem movimentações registradas.</div>
              ) : (
                movements.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold">{m.movement_type}</div>
                      <div className="text-slate-500">{m.notes || '-'}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(m.created_at).toLocaleString('es-ES')}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold ${
                          m.quantity_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.quantity_delta >= 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {m.previous_qty} → {m.new_qty}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
