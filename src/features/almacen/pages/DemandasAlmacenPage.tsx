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
  MapPin,
  Home,
  Calendar,
  Truck,
  Phone,
  Copy,
  MessageCircle,
  ArrowUpDown,
  Repeat,
} from 'lucide-react';
import { toast } from 'sonner';
import { almacenService } from '../services/almacenService';
import type {
  AlmacenStockItem,
  DeliveryMethod,
  DemandaPedidoAlmacen,
  DemandaWorkerAlmacen,
} from '../types';
import { STANDARD_SIZES } from '../types';
import { downloadActaEntregaPdf, downloadEtiquetaSeparacaoPdf } from '../utils/almacenEntregaPdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type AddressTargetMode = 'OBRA' | 'ALOJAMENTO' | 'NACEX_CUSTOM';
type PedidoSortBy = 'pendentes' | 'inicio_asc' | 'codigo' | 'cliente';

function getDaysBadgeInfo(dateStr?: string | null): { label: string; className: string } | null {
  if (!dateStr) return null;
  const clean = String(dateStr).split('T')[0];
  const target = new Date(`${clean}T00:00:00`);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: 'Inicia Hoje', className: 'bg-rose-100 text-rose-800 border-rose-200' };
  }
  if (diffDays > 0) {
    return {
      label: `Faltam ${diffDays} dia${diffDays > 1 ? 's' : ''}`,
      className:
        diffDays <= 3
          ? 'bg-rose-100 text-rose-800 border-rose-200'
          : diffDays <= 7
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }
  return {
    label: `Em curso (${Math.abs(diffDays)}d)`,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  };
}

export const DemandasAlmacenPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<DemandaPedidoAlmacen[]>([]);
  const [stock, setStock] = useState<AlmacenStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendentes' | 'atendidos'>('pendentes');
  const [sortBy, setSortBy] = useState<PedidoSortBy>('pendentes');
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  const [busyWorkerId, setBusyWorkerId] = useState<string | null>(null);
  const [isBatchCreating, setIsBatchCreating] = useState(false);

  // Delivery destination state for the selected pedido
  const [addressMode, setAddressMode] = useState<AddressTargetMode>('OBRA');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('NACEX');
  const [customDeliveryAddress, setCustomDeliveryAddress] = useState('');

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
    const list = pedidos.filter((p) => {
      if (filterStatus === 'pendentes' && p.pending_count === 0) return false;
      if (filterStatus === 'atendidos' && p.pending_count > 0) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesPedido =
          p.codigo.toLowerCase().includes(q) ||
          p.client_nome.toLowerCase().includes(q) ||
          p.empresa_nome.toLowerCase().includes(q) ||
          (p.site_nome || '').toLowerCase().includes(q) ||
          (p.site_cidade || '').toLowerCase().includes(q);
        const matchesWorker = p.workers.some(
          (w) =>
            w.nome.toLowerCase().includes(q) ||
            (w.alojamento_nome || '').toLowerCase().includes(q) ||
            (w.movil || '').toLowerCase().includes(q)
        );
        return matchesPedido || matchesWorker;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'pendentes') {
        if (b.pending_count !== a.pending_count) return b.pending_count - a.pending_count;
      }
      if (sortBy === 'inicio_asc') {
        const da = a.expected_start_date ? new Date(a.expected_start_date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.expected_start_date ? new Date(b.expected_start_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
      }
      if (sortBy === 'codigo') {
        return a.codigo.localeCompare(b.codigo);
      }
      if (sortBy === 'cliente') {
        return a.client_nome.localeCompare(b.client_nome);
      }
      return b.pending_count - a.pending_count;
    });
  }, [pedidos, filterStatus, searchTerm, sortBy]);

  const selectedPedido = useMemo(
    () => pedidos.find((p) => p.pedido_id === selectedPedidoId) || filteredPedidos[0] || null,
    [pedidos, filteredPedidos, selectedPedidoId]
  );

  const siteFullAddress = useMemo(() => {
    if (!selectedPedido) return '';
    return [
      selectedPedido.site_address,
      selectedPedido.site_postal_code,
      selectedPedido.site_cidade,
    ]
      .filter(Boolean)
      .join(', ');
  }, [selectedPedido]);

  // Reset address preview when switching pedido
  useEffect(() => {
    if (!selectedPedido) return;
    if (siteFullAddress) {
      setAddressMode('OBRA');
      setCustomDeliveryAddress(siteFullAddress);
      setDeliveryMethod('NACEX');
    } else {
      const firstAloj = selectedPedido.workers.find((w) => w.alojamento_endereco)?.alojamento_endereco;
      if (firstAloj) {
        setAddressMode('ALOJAMENTO');
        setCustomDeliveryAddress(firstAloj);
        setDeliveryMethod('NACEX');
      } else {
        setAddressMode('NACEX_CUSTOM');
        setCustomDeliveryAddress('');
        setDeliveryMethod('NACEX');
      }
    }
  }, [selectedPedido?.pedido_id]);

  const handleSelectAddressMode = (mode: AddressTargetMode) => {
    setAddressMode(mode);
    if (mode === 'OBRA') {
      setCustomDeliveryAddress(siteFullAddress || selectedPedido?.site_nome || '');
    } else if (mode === 'ALOJAMENTO') {
      const firstAloj = selectedPedido?.workers.find((w) => w.alojamento_endereco);
      setCustomDeliveryAddress(
        firstAloj?.alojamento_endereco || firstAloj?.alojamento_nome || 'Alojamento individual do trabalhador'
      );
    } else {
      setCustomDeliveryAddress('');
      setDeliveryMethod('NACEX');
    }
  };

  const resolveWorkerDeliveryAddress = (worker: DemandaWorkerAlmacen): string | null => {
    if (addressMode === 'ALOJAMENTO') {
      if (worker.alojamento_endereco) {
        return `${worker.alojamento_nome ? worker.alojamento_nome + ' — ' : ''}${worker.alojamento_endereco}`;
      }
      if (worker.alojamento_nome) return worker.alojamento_nome;
    }
    return customDeliveryAddress.trim() || siteFullAddress || null;
  };

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
    const targetAddress = resolveWorkerDeliveryAddress(worker);
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
        delivery_method: deliveryMethod,
        delivery_address: targetAddress,
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
          delivery_method: deliveryMethod,
          delivery_address: resolveWorkerDeliveryAddress(w),
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

  const formatDate = (d?: string | null) => {
    if (!d) return 'A definir';
    const clean = String(d).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return clean;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            Demandas de Dotação & EPIs por Pedido
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Confira alocação de alojamento, endereço da obra, medidas e gere ordens de separação com destino apontado.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={isLoading} className="gap-2 rounded-xl">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pedidos Pendentes</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpis.pedidosPendentes}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <ClipboardList className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Trabalhadores Pendentes</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{kpis.workersPendentes}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
            <User className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sem Medidas</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{kpis.semMedidas}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <Ruler className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estoque Mínimo</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{kpis.lowStock}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pedidos List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col max-h-[calc(100vh-280px)] overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar pedido, cliente, obra ou alojamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex gap-1.5 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl">
              {(['pendentes', 'todos', 'atendidos'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    filterStatus === st
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" /> Ordenar:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as PedidoSortBy)}
                className="flex-1 h-7 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2"
              >
                <option value="pendentes">Mais Pendentes</option>
                <option value="inicio_asc">Início Mais Próximo</option>
                <option value="codigo">Código do Pedido</option>
                <option value="cliente">Nome do Cliente</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Carregando pedidos...</div>
            ) : filteredPedidos.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">Nenhum pedido encontrado.</div>
            ) : (
              filteredPedidos.map((p) => {
                const isSelected = selectedPedido?.pedido_id === p.pedido_id;
                const daysInfo = getDaysBadgeInfo(p.expected_start_date);
                const hasReplacements = p.workers.some((w) => w.is_replacement && !w.existing_order);
                return (
                  <button
                    key={p.pedido_id}
                    onClick={() => setSelectedPedidoId(p.pedido_id)}
                    className={`w-full text-left p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-600'
                        : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                          {p.codigo}
                        </span>
                        {hasReplacements && (
                          <span title="Possui Reemplazos Pendentes" className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">
                            Reemplazo
                          </span>
                        )}
                      </div>
                      {p.pending_count > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-semibold text-[11px] rounded-full">
                          {p.pending_count} pendente{p.pending_count > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px] rounded-full">
                          Atendido
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1 truncate">
                      {p.client_nome}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 gap-2">
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 flex-shrink-0" /> {p.empresa_nome}
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0 font-medium text-slate-700 dark:text-slate-300">
                        <Calendar className="h-3 w-3 text-emerald-600" /> {formatDate(p.expected_start_date)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                        {p.site_cidade || p.site_nome || '-'}
                      </span>
                      {daysInfo && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${daysInfo.className}`}>
                          {daysInfo.label}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Pedido Detail + Workers */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col max-h-[calc(100vh-280px)] overflow-hidden">
          {!selectedPedido ? (
            <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-sm">
              Selecione um pedido à esquerda para visualizar os trabalhadores, alojamento e endereço de entrega.
            </div>
          ) : (
            <>
              {/* Premium Pedido Header & Delivery Address Selector */}
              <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-50/90 to-white dark:from-slate-950/60 dark:to-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {selectedPedido.codigo}
                      </h2>
                      <Badge className="bg-slate-900 text-white dark:bg-slate-700 rounded-md">
                        {selectedPedido.empresa_nome}
                      </Badge>
                      <Badge variant="outline" className="gap-1.5 text-xs font-bold border-emerald-300 bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        Início: {formatDate(selectedPedido.expected_start_date)}
                      </Badge>
                      {(() => {
                        const dInfo = getDaysBadgeInfo(selectedPedido.expected_start_date);
                        return dInfo ? (
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${dInfo.className}`}>
                            {dInfo.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
                      {selectedPedido.client_nome}
                    </p>
                  </div>

                  {selectedPedido.pending_count > 0 && (
                    <Button
                      onClick={() => handleCreateBatch(selectedPedido)}
                      disabled={isBatchCreating}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl shadow-sm shadow-emerald-600/20"
                    >
                      <PackagePlus className="h-4 w-4" />
                      {isBatchCreating ? 'Gerando...' : `Gerar ${selectedPedido.pending_count} Pendente(s)`}
                    </Button>
                  )}
                </div>

                {/* Site Address + Delivery Target Selector */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {/* Obra Info Card */}
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-3.5 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      Direção / Endereço da Obra
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {selectedPedido.site_nome || 'Obra / Centro de Trabalho'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {siteFullAddress || 'Endereço não cadastrado na obra'}
                    </div>
                    {(selectedPedido.site_contact_name || selectedPedido.site_contact_phone) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>
                          {selectedPedido.site_contact_name} {selectedPedido.site_contact_phone ? `• ${selectedPedido.site_contact_phone}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Delivery Destination Picker Card */}
                  <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5" />
                        Apontar Endereço para Entrega do Pacote
                      </span>
                      <select
                        value={deliveryMethod}
                        onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                        className="h-6 text-[11px] font-semibold rounded-md border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 px-2"
                      >
                        <option value="NACEX">Nacex</option>
                        <option value="ALOJAMIENTO">Alojamento</option>
                        <option value="OBRA">Obra</option>
                        <option value="RECOGIDA">Recogida</option>
                      </select>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectAddressMode('OBRA')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                          addressMode === 'OBRA'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        📍 Obra
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectAddressMode('ALOJAMENTO')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                          addressMode === 'ALOJAMENTO'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        🏠 Alojamento
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectAddressMode('NACEX_CUSTOM')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                          addressMode === 'NACEX_CUSTOM'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        📦 Agência Nacex / Outro
                      </button>
                    </div>

                    <Input
                      value={customDeliveryAddress}
                      onChange={(e) => setCustomDeliveryAddress(e.target.value)}
                      placeholder={
                        addressMode === 'ALOJAMENTO'
                          ? 'Usa o endereço do alojamento de cada trabalhador (ou edite aqui)...'
                          : 'Digite o endereço da Agência Nacex, Obra ou ponto de retirada...'
                      }
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Workers List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                {selectedPedido.workers.map((w) => {
                  const hasSizes = Boolean(w.camiseta && w.pantalones);
                  return (
                    <div
                      key={w.worker_id}
                      className="border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-white dark:bg-slate-950/40 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {w.nome}
                            </span>
                            {w.cod_colab && (
                              <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                                {w.cod_colab}
                              </span>
                            )}
                            {w.is_replacement && (
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 gap-1 text-[11px]">
                                <Repeat className="h-3 w-3" />
                                Reemplazo {w.replacement_code ? `(${w.replacement_code})` : ''}
                              </Badge>
                            )}
                            {w.has_recent_dispatch && (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1 text-[11px]">
                                <Clock className="h-3 w-3" /> Kit recente (&lt;6m)
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                              {w.job_function_name || 'Função não definida'}
                            </span>
                            {w.identificacion && <span>Doc: {w.identificacion}</span>}
                            {w.movil && (
                              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                                <Phone className="h-3 w-3 text-emerald-600" />
                                <span>{w.movil}</span>
                                <button
                                  type="button"
                                  title="Copiar telefone para MCS Chat"
                                  onClick={() => {
                                    navigator.clipboard.writeText(w.movil!);
                                    toast.success(`Telefone de ${w.nome} copiado!`);
                                  }}
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white ml-0.5"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                <a
                                  href={`https://wa.me/${w.movil.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Abrir WhatsApp / Chat"
                                  className="text-emerald-600 hover:text-emerald-700"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              </span>
                            )}
                          </div>

                          {/* Alojamento Local Badge */}
                          <div className="pt-0.5">
                            {w.alojamento_tipo === 'alojamento' ? (
                              <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900">
                                <Home className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="font-semibold">{w.alojamento_nome}</span>
                                {w.alojamento_endereco && (
                                  <span className="text-blue-600/80 dark:text-blue-400/80">
                                    — {w.alojamento_endereco}
                                  </span>
                                )}
                              </div>
                            ) : w.alojamento_tipo === 'propio' || w.alojamento_tipo === 'cliente' ? (
                              <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <Home className="h-3.5 w-3.5" />
                                <span>{w.alojamento_nome}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/60">
                                <Home className="h-3.5 w-3.5" />
                                <span>Pendente de Alojamento</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sizes + Action */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[11px] font-semibold text-slate-500">Camisa:</span>
                            <select
                              value={w.camiseta || ''}
                              disabled={Boolean(w.existing_order)}
                              onChange={(e) => handleSizeChange(w, 'camiseta', e.target.value)}
                              className={`h-7 text-xs font-bold rounded-md border px-1.5 bg-white dark:bg-slate-950 ${
                                !w.camiseta ? 'border-amber-400 text-amber-600' : 'border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <option value="">--</option>
                              {STANDARD_SIZES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[11px] font-semibold text-slate-500">Calça:</span>
                            <select
                              value={w.pantalones || ''}
                              disabled={Boolean(w.existing_order)}
                              onChange={(e) => handleSizeChange(w, 'pantalones', e.target.value)}
                              className={`h-7 text-xs font-bold rounded-md border px-1.5 bg-white dark:bg-slate-950 ${
                                !w.pantalones ? 'border-amber-400 text-amber-600' : 'border-slate-300 dark:border-slate-700'
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
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1 py-1 px-2.5 rounded-lg">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {w.existing_order.order_number} ({w.existing_order.status})
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Baixar Ata de Entrega (PDF)"
                                className="rounded-lg"
                                onClick={() => downloadActaEntregaPdf(w.existing_order!)}
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Etiqueta QR Separação"
                                className="rounded-lg"
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
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl"
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                              {busyWorkerId === w.worker_id ? 'Gerando...' : 'Gerar Ordem'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Required EPIs preview */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
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
                                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300"
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
