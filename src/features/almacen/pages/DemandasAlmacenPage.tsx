import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Search,
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  RefreshCw,
  Ruler,
  ShieldAlert,
  FileText,
  QrCode,
  Building2,
  User,
  Briefcase,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { almacenService } from '../services/almacenService';
import type { DemandaPedidoAlmacen, DemandaWorkerAlmacen, AlmacenStockItem } from '../types';
import { STANDARD_SIZES } from '../types';
import { downloadActaEntregaPdf, downloadEtiquetaSeparacaoPdf } from '../utils/almacenEntregaPdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const DemandasAlmacenPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<DemandaPedidoAlmacen[]>([]);
  const [stock, setStock] = useState<AlmacenStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendentes' | 'atendidos'>('pendentes');
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  const [busyWorkerId, setBusyWorkerId] = useState<string | null>(null);
  const [isBatchCreating, setIsBatchCreating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [demandasData, stockData] = await Promise.all([
        almacenService.getDemandasPedidos(),
        almacenService.getStock(),
      ]);
      setPedidos(demandasData);
      setStock(stockData);
      if (!selectedPedidoId && demandasData.length > 0) {
        setSelectedPedidoId(demandasData[0].pedido_id);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar demandas do armazém');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter((p) => {
      if (filterStatus === 'pendentes' && p.pending_count === 0) return false;
      if (filterStatus === 'atendidos' && p.pending_count > 0) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesPedido =
          p.codigo.toLowerCase().includes(q) ||
          p.client_nome.toLowerCase().includes(q) ||
          p.empresa_nome.toLowerCase().includes(q) ||
          (p.site_nome || '').toLowerCase().includes(q);
        const matchesWorker = p.workers.some((w) => w.nome.toLowerCase().includes(q));
        return matchesPedido || matchesWorker;
      }
      return true;
    });
  }, [pedidos, filterStatus, searchTerm]);

  const selectedPedido = useMemo(
    () => pedidos.find((p) => p.pedido_id === selectedPedidoId) || filteredPedidos[0] || null,
    [pedidos, filteredPedidos, selectedPedidoId]
  );

  const kpis = useMemo(() => {
    const pedidosPendentes = pedidos.filter((p) => p.pending_count > 0).length;
    const workersPendentes = pedidos.reduce((acc, p) => acc + p.pending_count, 0);
    const semMedidas = pedidos.reduce(
      (acc, p) =>
        acc +
        p.workers.filter((w) => !w.existing_order && (!w.camiseta || !w.pantalones)).length,
      0
    );
    const lowStock = stock.filter((s) => s.quantity_on_hand <= s.min_stock).length;
    return { pedidosPendentes, workersPendentes, semMedidas, lowStock };
  }, [pedidos, stock]);

  const handleSizeChange = async (
    worker: DemandaWorkerAlmacen,
    field: 'camiseta' | 'pantalones',
    value: string
  ) => {
    const newCam = field === 'camiseta' ? value : worker.camiseta || '';
    const newPan = field === 'pantalones' ? value : worker.pantalones || '';
    try {
      await almacenService.updateWorkerSizes(worker.worker_id, newCam, newPan);
      setPedidos((prev) =>
        prev.map((p) => ({
          ...p,
          workers: p.workers.map((w) =>
            w.worker_id === worker.worker_id
              ? { ...w, camiseta: newCam || null, pantalones: newPan || null }
              : w
          ),
        }))
      );
      toast.success(`Medida atualizada para ${worker.nome}`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar medida');
    }
  };

  const handleCreateOrder = async (pedido: DemandaPedidoAlmacen, worker: DemandaWorkerAlmacen) => {
    if (!worker.camiseta || !worker.pantalones) {
      toast.warning('Selecione os tamanhos de Camisa e Calça antes de gerar a ordem.');
      return;
    }
    setBusyWorkerId(worker.worker_id);
    try {
      await almacenService.createPickingOrder({
        pedido_id: pedido.pedido_id,
        pedido_codigo: pedido.codigo,
        empresa_id: pedido.empresa_id,
        empresa_nome: pedido.empresa_nome,
        client_id: pedido.client_id,
        client_nome: pedido.client_nome,
        worker,
        request_type: 'ASIGNACION',
        expected_start_date: pedido.expected_start_date,
      });
      toast.success(`Ordem de separação gerada para ${worker.nome}`);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar ordem de separação');
    } finally {
      setBusyWorkerId(null);
    }
  };

  const handleCreateBatch = async (pedido: DemandaPedidoAlmacen) => {
    const eligible = pedido.workers.filter(
      (w) => !w.existing_order && w.camiseta && w.pantalones
    );
    if (eligible.length === 0) {
      toast.warning('Nenhum trabalhador pendente com medidas completas neste pedido.');
      return;
    }
    setIsBatchCreating(true);
    try {
      for (const w of eligible) {
        await almacenService.createPickingOrder({
          pedido_id: pedido.pedido_id,
          pedido_codigo: pedido.codigo,
          empresa_id: pedido.empresa_id,
          empresa_nome: pedido.empresa_nome,
          client_id: pedido.client_id,
          client_nome: pedido.client_nome,
          worker: w,
          request_type: 'ASIGNACION',
          expected_start_date: pedido.expected_start_date,
        });
      }
      toast.success(`${eligible.length} ordem(ns) de separação gerada(s)!`);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar ordens em lote');
    } finally {
      setIsBatchCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="text-emerald-600" />
            Demandas de Dotação & EPIs por Pedido
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selecione um pedido para conferir medidas, EPIs obrigatórios do cargo e gerar ordens de separação.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase">Pedidos com Pendência</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpis.pedidosPendentes}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase">Trabalhadores Pendentes</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{kpis.workersPendentes}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
            <Ruler className="h-3.5 w-3.5 text-amber-500" /> Sem Medidas (Cam/Calça)
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{kpis.semMedidas}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Alertas Estoque Mínimo
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{kpis.lowStock}</div>
        </div>
      </div>

      {/* Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pedidos List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col max-h-[calc(100vh-290px)]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar pedido, cliente ou trabalhador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-1.5">
              {(['pendentes', 'todos', 'atendidos'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                    filterStatus === st
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Carregando pedidos...</div>
            ) : filteredPedidos.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">Nenhum pedido encontrado.</div>
            ) : (
              filteredPedidos.map((p) => {
                const isSelected = selectedPedido?.pedido_id === p.pedido_id;
                return (
                  <button
                    key={p.pedido_id}
                    onClick={() => setSelectedPedidoId(p.pedido_id)}
                    className={`w-full text-left p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{p.codigo}</span>
                      {p.pending_count > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          {p.pending_count} pendente{p.pending_count > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Atendido
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1 truncate">
                      {p.client_nome}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {p.empresa_nome}
                      </span>
                      <span>{p.total_workers} trab.</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Workers of Selected Pedido */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col max-h-[calc(100vh-290px)]">
          {!selectedPedido ? (
            <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-sm">
              Selecione um pedido à esquerda para visualizar os trabalhadores e EPIs.
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Pedido {selectedPedido.codigo}
                    </h2>
                    <Badge variant="outline">{selectedPedido.empresa_nome}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cliente: {selectedPedido.client_nome}
                    {selectedPedido.site_cidade ? ` • ${selectedPedido.site_cidade}` : ''}
                    {selectedPedido.expected_start_date ? ` • Início: ${selectedPedido.expected_start_date}` : ''}
                  </p>
                </div>

                {selectedPedido.pending_count > 0 && (
                  <Button
                    onClick={() => handleCreateBatch(selectedPedido)}
                    disabled={isBatchCreating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <PackagePlus className="h-4 w-4" />
                    {isBatchCreating ? 'Gerando...' : 'Gerar Ordens Pendentes'}
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selectedPedido.workers.map((w) => {
                  const hasSizes = Boolean(w.camiseta && w.pantalones);
                  return (
                    <div
                      key={w.worker_id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/40 dark:bg-slate-950/30"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {w.nome}
                            </span>
                            {w.cod_colab && (
                              <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">
                                {w.cod_colab}
                              </span>
                            )}
                            {w.has_recent_dispatch && (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1 text-[11px]">
                                <Clock className="h-3 w-3" /> Recebeu kit &lt; 6 meses
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {w.job_function_name || 'Função não definida'}
                            </span>
                            {w.identificacion && <span>Doc: {w.identificacion}</span>}
                          </div>
                        </div>

                        {/* Sizes + Action */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">Camisa:</span>
                            <select
                              value={w.camiseta || ''}
                              disabled={Boolean(w.existing_order)}
                              onChange={(e) => handleSizeChange(w, 'camiseta', e.target.value)}
                              className={`h-8 text-xs rounded-md border px-2 bg-white dark:bg-slate-900 ${
                                !w.camiseta ? 'border-amber-400' : 'border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <option value="">--</option>
                              {STANDARD_SIZES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">Calça:</span>
                            <select
                              value={w.pantalones || ''}
                              disabled={Boolean(w.existing_order)}
                              onChange={(e) => handleSizeChange(w, 'pantalones', e.target.value)}
                              className={`h-8 text-xs rounded-md border px-2 bg-white dark:bg-slate-900 ${
                                !w.pantalones ? 'border-amber-400' : 'border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <option value="">--</option>
                              {STANDARD_SIZES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          {w.existing_order ? (
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {w.existing_order.order_number} ({w.existing_order.status})
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Baixar Ata de Entrega (PDF)"
                                onClick={() => downloadActaEntregaPdf(w.existing_order!)}
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Etiqueta QR Separação"
                                onClick={() => downloadEtiquetaSeparacaoPdf(w.existing_order!)}
                              >
                                <QrCode className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              disabled={!hasSizes || busyWorkerId === w.worker_id}
                              onClick={() => handleCreateOrder(selectedPedido, w)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                              {busyWorkerId === w.worker_id ? 'Gerando...' : 'Gerar Ordem'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Required EPIs preview */}
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        {w.required_epis.length === 0 ? (
                          <div className="text-xs text-amber-600 flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Nenhum EPI obrigatório configurado para a função "{w.job_function_name || 'N/A'}" no Registro Geral.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {w.required_epis.map((epi) => {
                              const sz = epi.has_sizes
                                ? epi.size_category === 'camisa'
                                  ? w.camiseta || '?'
                                  : epi.size_category === 'pantalon'
                                  ? w.pantalones || '?'
                                  : 'UNICO'
                                : null;
                              return (
                                <span
                                  key={epi.epi_id}
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                >
                                  <span className="font-bold text-emerald-600">{epi.quantity}x</span>
                                  <span>{epi.epi_name}</span>
                                  {sz && <span className="text-slate-400 font-mono">({sz})</span>}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
