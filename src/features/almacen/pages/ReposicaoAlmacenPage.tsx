import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshCcw,
  Search,
  Plus,
  History,
  User,
  Building2,
  Briefcase,
  Phone,
  Copy,
  MessageCircle,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  QrCode,
  Truck,
  X,
  PackagePlus,
  Sparkles,
  Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { almacenService } from '../services/almacenService';
import type {
  AlmacenDeliveryPoint,
  AlmacenEpi,
  DeliveryMethod,
  PickingOrder,
  RequestType,
  WorkerReplenishmentRow,
} from '../types';
import { STANDARD_SIZES } from '../types';
import { downloadActaEntregaPdf, downloadEtiquetaSeparacaoPdf } from '../utils/almacenEntregaPdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type FilterTab = 'todos' | '90d' | '180d' | 'sem_envio' | 'com_historico';

interface SelectedCustomItem {
  epi: AlmacenEpi;
  quantity: number;
  size_code: string;
}

export const ReposicaoAlmacenPage: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerReplenishmentRow[]>([]);
  const [epis, setEpis] = useState<AlmacenEpi[]>([]);
  const [deliveryPoints, setDeliveryPoints] = useState<AlmacenDeliveryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('todos');

  // History Gallery Modal
  const [historyWorker, setHistoryWorker] = useState<WorkerReplenishmentRow | null>(null);

  // Manual Dotação / Reposição Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalWorkerSearch, setModalWorkerSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<WorkerReplenishmentRow | null>(null);
  const [camisaSize, setCamisaSize] = useState('');
  const [calcaSize, setCalcaSize] = useState('');
  const [requestType, setRequestType] = useState<RequestType>('REPOSICION');
  const [selectedItems, setSelectedItems] = useState<SelectedCustomItem[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('NACEX');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedPointId, setSelectedPointId] = useState('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [workersData, episData, pointsData] = await Promise.all([
        almacenService.getWorkersReplenishmentOverview(),
        almacenService.getEpis(),
        almacenService.getDeliveryPoints().catch(() => []),
      ]);
      setWorkers(workersData);
      setEpis(episData.filter((e) => e.status === 'active'));
      setDeliveryPoints(pointsData);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar histórico de reposição');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = useMemo(() => {
    const total = workers.length;
    const comHistorico = workers.filter((w) => w.total_orders > 0).length;
    const plus90 = workers.filter((w) => w.days_since_last !== null && w.days_since_last >= 90).length;
    const semEnvio = workers.filter((w) => w.total_orders === 0).length;
    return { total, comHistorico, plus90, semEnvio };
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      if (filterTab === '90d' && (w.days_since_last === null || w.days_since_last < 90)) return false;
      if (filterTab === '180d' && (w.days_since_last === null || w.days_since_last < 180)) return false;
      if (filterTab === 'sem_envio' && w.total_orders > 0) return false;
      if (filterTab === 'com_historico' && w.total_orders === 0) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          w.nome.toLowerCase().includes(q) ||
          (w.cod_colab || '').toLowerCase().includes(q) ||
          (w.empresa_nome || '').toLowerCase().includes(q) ||
          (w.client_nome || '').toLowerCase().includes(q) ||
          (w.pedido_codigo || '').toLowerCase().includes(q) ||
          (w.movil || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [workers, filterTab, searchTerm]);

  const modalWorkerSuggestions = useMemo(() => {
    const norm = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (!modalWorkerSearch.trim()) return workers.slice(0, 12);
    const q = norm(modalWorkerSearch.trim());
    return workers
      .filter(
        (w) =>
          norm(w.nome).includes(q) ||
          norm(w.cod_colab || '').includes(q) ||
          norm(w.identificacion || '').includes(q) ||
          norm(w.empresa_nome || '').includes(q)
      )
      .slice(0, 20);
  }, [workers, modalWorkerSearch]);

  const openModalForWorker = (worker: WorkerReplenishmentRow | null) => {
    setSelectedWorker(worker);
    setModalWorkerSearch('');
    setRequestType('REPOSICION');
    setObservations('');
    setSelectedPointId('');
    setDeliveryMethod('NACEX');
    setSelectedItems([]);
    if (worker) {
      setCamisaSize(worker.camiseta || 'L');
      setCalcaSize(worker.pantalones || 'L');
      setDeliveryAddress(worker.alojamento_endereco || worker.site_address || '');
    } else {
      setCamisaSize('L');
      setCalcaSize('L');
      setDeliveryAddress('');
    }
    setShowCreateModal(true);
  };

  const resolveSizeForEpi = (epi: AlmacenEpi, cam: string, cal: string) => {
    if (!epi.has_sizes) return 'UNICO';
    if (epi.size_category === 'camisa') return (cam || 'L').toUpperCase();
    if (epi.size_category === 'pantalon') return (cal || 'L').toUpperCase();
    return 'UNICO';
  };

  // Sync sizes in selectedItems when Camisa/Calça changes
  useEffect(() => {
    setSelectedItems((prev) =>
      prev.map((item) => ({
        ...item,
        size_code: resolveSizeForEpi(item.epi, camisaSize, calcaSize),
      }))
    );
  }, [camisaSize, calcaSize]);

  const handleLoadJobKit = async () => {
    if (!selectedWorker?.job_function_id) {
      toast.info('Trabalhador sem função vinculada; selecione os itens manualmente abaixo.');
      return;
    }
    try {
      const reqEpis = await almacenService.getJobFunctionRequiredEpis(selectedWorker.job_function_id);
      if (reqEpis.length === 0) {
        toast.info('Nenhum EPI obrigatório configurado para esta função.');
        return;
      }
      const mapped: SelectedCustomItem[] = [];
      for (const re of reqEpis) {
        const epiObj = epis.find((e) => e.id === re.epi_id);
        if (!epiObj) continue;
        mapped.push({
          epi: epiObj,
          quantity: re.quantity,
          size_code: resolveSizeForEpi(epiObj, camisaSize, calcaSize),
        });
      }
      setSelectedItems(mapped);
      toast.success(`Kit de ${mapped.length} itens carregado!`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar kit do cargo');
    }
  };

  const toggleEpiSelection = (epi: AlmacenEpi) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.epi.id === epi.id);
      if (exists) return prev.filter((i) => i.epi.id !== epi.id);
      return [
        ...prev,
        {
          epi,
          quantity: 1,
          size_code: resolveSizeForEpi(epi, camisaSize, calcaSize),
        },
      ];
    });
  };

  const updateItemQty = (epiId: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.epi.id === epiId ? { ...i, quantity: Math.max(1, qty) } : i))
    );
  };

  const handleSubmitManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) {
      toast.warning('Selecione um trabalhador.');
      return;
    }
    if (selectedItems.length === 0) {
      toast.warning('Selecione pelo menos 1 item para enviar.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Atualizar medidas no cadastro se foram alteradas
      if (camisaSize !== (selectedWorker.camiseta || '') || calcaSize !== (selectedWorker.pantalones || '')) {
        await almacenService.updateWorkerSizes(selectedWorker.worker_id, camisaSize, calcaSize);
      }

      await almacenService.createPickingOrder({
        pedido_id: selectedWorker.pedido_id,
        pedido_codigo: selectedWorker.pedido_codigo,
        empresa_id: selectedWorker.empresa_id,
        empresa_nome: selectedWorker.empresa_nome,
        client_id: selectedWorker.client_id,
        client_nome: selectedWorker.client_nome,
        worker: {
          worker_id: selectedWorker.worker_id,
          cod_colab: selectedWorker.cod_colab,
          nome: selectedWorker.nome,
          identificacion: selectedWorker.identificacion,
          movil: selectedWorker.movil,
          camiseta: camisaSize || null,
          pantalones: calcaSize || null,
          job_function_id: selectedWorker.job_function_id,
          job_function_name: selectedWorker.job_function_name,
          required_epis: [],
          has_recent_dispatch: false,
          alojamento_tipo: selectedWorker.alojamento_nome ? 'alojamento' : 'pendente',
          alojamento_nome: selectedWorker.alojamento_nome,
          alojamento_endereco: selectedWorker.alojamento_endereco,
          alojamento_cidade: null,
          is_replacement: false,
        },
        request_type: requestType,
        delivery_method: deliveryMethod,
        delivery_point_id: selectedPointId || null,
        delivery_address: deliveryAddress.trim() || null,
        observations: observations.trim() || null,
        custom_items: selectedItems.map((si) => ({
          epi_id: si.epi.id,
          item_name: si.epi.name,
          size_code: si.size_code,
          quantity: si.quantity,
          unit_cost: Number(si.epi.default_cost || 0),
          is_branded: si.epi.is_branded,
        })),
      });

      toast.success(`Ordem de ${requestType} criada para ${selectedWorker.nome}!`);
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar ordem de reposição');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDaysBadge = (days: number | null) => {
    if (days === null) {
      return (
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
          Sem registro de envio
        </span>
      );
    }
    if (days >= 180) {
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
          Há {days} dias (Vencido &gt;6m)
        </span>
      );
    }
    if (days >= 90) {
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          Há {days} dias (&gt;3 meses)
        </span>
      );
    }
    return (
      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
        Há {days} dia{days !== 1 ? 's' : ''}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600">
              <RefreshCcw className="h-5 w-5" />
            </div>
            Demandas por Reposição & Histórico de Dotações
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhe há quanto tempo cada trabalhador recebeu EPIs, consulte a galeria de despachos e inclua envios manuais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading} className="gap-2 rounded-xl">
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => openModalForWorker(null)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl shadow-sm shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            Incluir Dotação / Reposição
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Trabalhadores Ativos</div>
          <div className="text-2xl font-bold mt-1">{kpis.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Com Histórico de Envio</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{kpis.comHistorico}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">+90 Dias Sem Reposição</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{kpis.plus90}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Sem Envio Registrado</div>
          <div className="text-2xl font-bold text-slate-600 mt-1">{kpis.semEnvio}</div>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar trabalhador, código, empresa, pedido ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-xl bg-white dark:bg-slate-900"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'com_historico', label: 'Com Histórico' },
            { id: '90d', label: '+90 Dias' },
            { id: '180d', label: '+180 Dias' },
            { id: 'sem_envio', label: 'Sem Envio' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as FilterTab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                filterTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workers Gallery / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-slate-400">Carregando trabalhadores...</div>
        ) : filteredWorkers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400">Nenhum trabalhador encontrado.</div>
        ) : (
          filteredWorkers.slice(0, 120).map((w) => (
            <div
              key={w.worker_id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {w.nome}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {w.cod_colab && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                          {w.cod_colab}
                        </span>
                      )}
                      {w.empresa_nome && (
                        <Badge variant="outline" className="text-[10px]">
                          {w.empresa_nome}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {formatDaysBadge(w.days_since_last)}
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{w.job_function_name || 'Função não informada'}</span>
                  </div>
                  {(w.client_nome || w.pedido_codigo) && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {w.client_nome || '-'} {w.pedido_codigo ? `(${w.pedido_codigo})` : ''}
                      </span>
                    </div>
                  )}
                  {w.movil && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{w.movil}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(w.movil!);
                          toast.success('Telefone copiado!');
                        }}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <a
                        href={`https://wa.me/${w.movil.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] pt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                    Camisa: {w.camiseta || '--'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                    Calça: {w.pantalones || '--'}
                  </span>
                </div>

                {w.last_order && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="font-mono text-emerald-700 dark:text-emerald-400">
                        Último: {w.last_order.order_number}
                      </span>
                      <span>{w.last_order.status}</span>
                    </div>
                    <div className="text-slate-500 flex items-center justify-between">
                      <span>
                        {new Date(w.last_dispatch_at || w.last_order.created_at).toLocaleDateString('es-ES')}
                      </span>
                      {w.last_order.tracking_code && (
                        <span className="font-mono">Nacex: {w.last_order.tracking_code}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHistoryWorker(w)}
                  className="flex-1 gap-1.5 rounded-xl text-xs"
                >
                  <History className="h-3.5 w-3.5" />
                  Histórico ({w.total_orders})
                </Button>
                <Button
                  size="sm"
                  onClick={() => openModalForWorker(w)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl text-xs"
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Reposição
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Galeria / Histórico de Despachos do Trabalhador */}
      {historyWorker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-600" />
                  Histórico de Dotações — {historyWorker.nome}
                </h3>
                <p className="text-xs text-slate-500">
                  {historyWorker.empresa_nome || '-'} • Camisa: {historyWorker.camiseta || '--'} • Calça:{' '}
                  {historyWorker.pantalones || '--'}
                </p>
              </div>
              <button onClick={() => setHistoryWorker(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {historyWorker.history.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  Nenhum despacho registrado no sistema para este trabalhador.
                </div>
              ) : (
                historyWorker.history.map((po: PickingOrder) => (
                  <div
                    key={po.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/40"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{po.order_number}</span>
                        <Badge variant="outline">{po.request_type}</Badge>
                        <Badge className="bg-emerald-100 text-emerald-800">{po.status}</Badge>
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(po.dispatched_at || po.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(po.items || []).map((it) => (
                        <span
                          key={it.id}
                          className="text-[11px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          <strong>{it.quantity_requested}x</strong> {it.item_name} ({it.size_code})
                        </span>
                      ))}
                    </div>

                    {(po.tracking_code || po.delivery_address) && (
                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <Truck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{po.delivery_method || 'NACEX'}</span>
                        {po.tracking_code && <span className="font-mono font-semibold">{po.tracking_code}</span>}
                        {po.delivery_address && <span>• {po.delivery_address}</span>}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => downloadEtiquetaSeparacaoPdf(po)}>
                        <QrCode className="h-3.5 w-3.5" /> Etiqueta QR
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => downloadActaEntregaPdf(po)}>
                        <FileText className="h-3.5 w-3.5" /> Ata PDF
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between">
              <Button variant="outline" onClick={() => setHistoryWorker(null)}>
                Fechar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={() => {
                  const target = historyWorker;
                  setHistoryWorker(null);
                  openModalForWorker(target);
                }}
              >
                <PackagePlus className="h-4 w-4" />
                Nova Reposição para {historyWorker.nome.split(' ')[0]}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Incluir Dotação / Reposição Manual */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-emerald-600" />
                Incluir Dotação / Reposição Manual
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualOrder} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 1. Seleção do Trabalhador */}
              {!selectedWorker ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500 block">
                    1. Buscar Trabalhador
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Digite nome, código ou DNI/NIE..."
                      value={modalWorkerSearch}
                      onChange={(e) => setModalWorkerSearch(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {modalWorkerSuggestions.map((w) => (
                      <button
                        type="button"
                        key={w.worker_id}
                        onClick={() => {
                          setSelectedWorker(w);
                          setCamisaSize(w.camiseta || 'L');
                          setCalcaSize(w.pantalones || 'L');
                          setDeliveryAddress(w.alojamento_endereco || w.site_address || '');
                        }}
                        className="w-full text-left p-3 hover:bg-emerald-50/50 dark:hover:bg-slate-800 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-sm">{w.nome}</div>
                          <div className="text-xs text-slate-500">
                            {w.cod_colab || '-'} • {w.empresa_nome || '-'} • {w.job_function_name || '-'}
                          </div>
                        </div>
                        <span className="text-xs text-emerald-600 font-semibold">Selecionar</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Trabalhador Selecionado */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-sm flex items-center gap-2">
                        <User className="h-4 w-4 text-emerald-600" />
                        {selectedWorker.nome}
                        {selectedWorker.cod_colab && (
                          <span className="text-xs font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded">
                            {selectedWorker.cod_colab}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {selectedWorker.empresa_nome || 'Empresa N/A'} • {selectedWorker.client_nome || 'Sem pedido ativo'} •{' '}
                        {selectedWorker.job_function_name || 'Função N/A'}
                      </div>
                      {selectedWorker.last_dispatch_at && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Último envio em {new Date(selectedWorker.last_dispatch_at).toLocaleDateString('es-ES')} (há{' '}
                          {selectedWorker.days_since_last} dias)
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedWorker(null)}
                      className="text-xs"
                    >
                      Trocar
                    </Button>
                  </div>

                  {/* 2. Tipo & Medidas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Tipo de Solicitação</label>
                      <select
                        value={requestType}
                        onChange={(e) => setRequestType(e.target.value as RequestType)}
                        className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
                      >
                        <option value="REPOSICION">REPOSICIÓN (Renovação)</option>
                        <option value="DETERIORO">DETERIORO (Troca por dano)</option>
                        <option value="ASIGNACION">ASIGNACIÓN (Kit inicial)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Tamanho Camisa</label>
                      <select
                        value={camisaSize}
                        onChange={(e) => setCamisaSize(e.target.value)}
                        className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
                      >
                        {STANDARD_SIZES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Tamanho Calça</label>
                      <select
                        value={calcaSize}
                        onChange={(e) => setCalcaSize(e.target.value)}
                        className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
                      >
                        {STANDARD_SIZES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 3. Seleção de Itens */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-slate-500">
                        Itens a Enviar ({selectedItems.length} selecionado{selectedItems.length !== 1 ? 's' : ''})
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleLoadJobKit}
                        className="h-7 text-xs gap-1"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        Carregar Kit do Cargo
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                      {epis.map((epi) => {
                        const selected = selectedItems.find((i) => i.epi.id === epi.id);
                        const sz = resolveSizeForEpi(epi, camisaSize, calcaSize);
                        return (
                          <div
                            key={epi.id}
                            className={`p-2 rounded-xl border text-xs transition-all ${
                              selected
                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleEpiSelection(epi)}
                              className="w-full text-left font-semibold flex items-center justify-between gap-1"
                            >
                              <span className="truncate">{epi.name}</span>
                              {selected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />}
                            </button>
                            {selected && (
                              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-emerald-200/60">
                                <span className="font-mono text-[10px] text-slate-500">{sz}</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={selected.quantity}
                                  onChange={(e) => updateItemQty(epi.id, parseInt(e.target.value, 10) || 1)}
                                  className="w-12 h-6 text-center text-xs border border-emerald-300 rounded bg-white dark:bg-slate-900"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Entrega / Nacex */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-slate-500">Destino de Entrega</label>
                      <div className="flex gap-1.5">
                        {selectedWorker.alojamento_endereco && (
                          <button
                            type="button"
                            onClick={() => setDeliveryAddress(selectedWorker.alojamento_endereco!)}
                            className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold flex items-center gap-1"
                          >
                            <Home className="h-3 w-3" /> Usar Alojamento
                          </button>
                        )}
                        {selectedWorker.site_address && (
                          <button
                            type="button"
                            onClick={() => setDeliveryAddress(selectedWorker.site_address!)}
                            className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold"
                          >
                            Usar Obra
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={deliveryMethod}
                        onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                        className="h-9 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2"
                      >
                        <option value="NACEX">Nacex</option>
                        <option value="ALOJAMIENTO">Alojamento</option>
                        <option value="OBRA">Obra</option>
                        <option value="RECOGIDA">Recogida Armazém</option>
                      </select>

                      <select
                        value={selectedPointId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedPointId(id);
                          const found = deliveryPoints.find((dp) => dp.id === id);
                          if (found) {
                            setDeliveryAddress(
                              [found.name, found.address_line, found.postal_code, found.city]
                                .filter(Boolean)
                                .join(' - ')
                            );
                          }
                        }}
                        className="sm:col-span-2 h-9 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2"
                      >
                        <option value="">Selecionar Agência Nacex salva (opcional)...</option>
                        {deliveryPoints.map((dp) => (
                          <option key={dp.id} value={dp.id}>
                            {dp.name} {dp.city ? `- ${dp.city}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      placeholder="Endereço de entrega (Obra, Alojamento ou Agência Nacex)..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                    <Input
                      placeholder="Observações (opcional)..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedWorker || selectedItems.length === 0 || isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmitting ? 'Gerando Ordem...' : 'Gerar Ordem de Separação'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
