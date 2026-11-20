import React, { useEffect, useMemo, useState } from 'react';
import {
  PackageCheck,
  Search,
  RefreshCw,
  FileText,
  QrCode,
  Truck,
  CheckSquare,
  Square,
  ExternalLink,
  X,
  Copy,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { almacenService } from '../services/almacenService';
import type { CarrierStatus, DeliveryMethod, PickingItem, PickingOrder, PickingStatus } from '../types';
import { downloadActaEntregaPdf, downloadEtiquetaSeparacaoPdf } from '../utils/almacenEntregaPdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const STATUS_BADGE: Record<PickingStatus, string> = {
  PENDENTE: 'bg-amber-100 text-amber-800',
  EM_SEPARACAO: 'bg-blue-100 text-blue-800',
  CONFERIDO: 'bg-indigo-100 text-indigo-800',
  DESPACHADO: 'bg-emerald-100 text-emerald-800',
  ENTREGUE: 'bg-teal-100 text-teal-800',
  CANCELADO: 'bg-slate-200 text-slate-600',
};

export const OrdensSeparacaoPage: React.FC = () => {
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PickingStatus | 'TODOS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PickingOrder | null>(null);

  // Dispatch modal state
  const [dispatchModalOrder, setDispatchModalOrder] = useState<PickingOrder | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('NACEX');
  const [trackingCode, setTrackingCode] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await almacenService.getPickingOrders(statusFilter);
      setOrders(data);
      if (selectedOrder) {
        const refreshed = data.find((o) => o.id === selectedOrder.id) || null;
        setSelectedOrder(refreshed);
      } else if (data.length > 0) {
        setSelectedOrder(data[0]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar ordens de separação');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const q = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.worker_nome.toLowerCase().includes(q) ||
        (o.pedido_codigo || '').toLowerCase().includes(q) ||
        (o.client_nome || '').toLowerCase().includes(q) ||
        (o.tracking_code || '').toLowerCase().includes(q)
    );
  }, [orders, searchTerm]);

  const handleToggleItem = async (item: PickingItem) => {
    const nextChecked = !item.is_checked;
    const nextQty = nextChecked ? item.quantity_requested : 0;
    try {
      await almacenService.togglePickingItemCheck(item.id, nextChecked, nextQty);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === item.picking_order_id
            ? {
                ...o,
                items: (o.items || []).map((i) =>
                  i.id === item.id ? { ...i, is_checked: nextChecked, quantity_picked: nextQty } : i
                ),
              }
            : o
        )
      );
      setSelectedOrder((prev) =>
        prev && prev.id === item.picking_order_id
          ? {
              ...prev,
              items: (prev.items || []).map((i) =>
                i.id === item.id ? { ...i, is_checked: nextChecked, quantity_picked: nextQty } : i
              ),
            }
          : prev
      );
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao conferir item');
    }
  };

  const handleStatusChange = async (order: PickingOrder, nextStatus: PickingStatus) => {
    try {
      await almacenService.updatePickingStatus(order.id, nextStatus);
      toast.success(`Ordem ${order.order_number} atualizada para ${nextStatus}`);
      await loadOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar status');
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalOrder) return;
    setIsDispatching(true);
    try {
      await almacenService.dispatchPickingOrder({
        order: dispatchModalOrder,
        deliveryMethod,
        trackingCode: trackingCode.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
      });
      toast.success(`Ordem ${dispatchModalOrder.order_number} despachada e estoque atualizado!`);
      setDispatchModalOrder(null);
      setTrackingCode('');
      setDeliveryAddress('');
      await loadOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao despachar ordem');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PackageCheck className="text-emerald-600" />
            Órdenes de Separación & Despachos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Confira os itens separados, imprima etiquetas QR / atas de entrega e registre o despacho Nacex.
          </p>
        </div>
        <Button variant="outline" onClick={loadOrders} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar ordem, trabalhador, pedido ou Nacex..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['TODOS', 'PENDENTE', 'EM_SEPARACAO', 'CONFERIDO', 'DESPACHADO', 'ENTREGUE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[calc(100vh-260px)] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Carregando ordens...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Nenhuma ordem encontrada.</div>
          ) : (
            filteredOrders.map((o) => {
              const isSelected = selectedOrder?.id === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`w-full text-left p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {o.order_number}
                    </span>
                    <Badge className={`${STATUS_BADGE[o.status]} hover:${STATUS_BADGE[o.status]} text-[11px]`}>
                      {o.status}
                    </Badge>
                  </div>
                  <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 mt-1">
                    {o.worker_nome}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
                    <span>
                      {o.empresa_nome || '-'} • Ped. {o.pedido_codigo || '-'}
                    </span>
                    {o.tracking_code && (
                      <span className="font-mono text-emerald-600">{o.tracking_code}</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Detail */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col max-h-[calc(100vh-260px)] overflow-y-auto">
          {!selectedOrder ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Selecione uma ordem à esquerda.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold font-mono">{selectedOrder.order_number}</h2>
                    <Badge className={STATUS_BADGE[selectedOrder.status]}>{selectedOrder.status}</Badge>
                    <Badge variant="outline">{selectedOrder.request_type}</Badge>
                  </div>
                  <p className="text-sm font-medium mt-1">{selectedOrder.worker_nome}</p>
                  <p className="text-xs text-slate-500">
                    {selectedOrder.empresa_nome} → {selectedOrder.client_nome} • Pedido {selectedOrder.pedido_codigo || '-'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Camisa: <strong>{selectedOrder.camiseta_size || '-'}</strong> | Calça:{' '}
                    <strong>{selectedOrder.pantalones_size || '-'}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => downloadEtiquetaSeparacaoPdf(selectedOrder)}
                  >
                    <QrCode className="h-4 w-4" /> Etiqueta QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => downloadActaEntregaPdf(selectedOrder)}
                  >
                    <FileText className="h-4 w-4" /> Ata PDF
                  </Button>
                </div>
              </div>

              {/* Checklist */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">
                  Itens da Ordem de Separação (Clique para conferir)
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {(selectedOrder.items || []).map((item) => (
                    <button
                      key={item.id}
                      disabled={selectedOrder.status === 'DESPACHADO' || selectedOrder.status === 'ENTREGUE'}
                      onClick={() => handleToggleItem(item)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {item.is_checked ? (
                          <CheckSquare className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        )}
                        <div>
                          <div className={`text-sm font-medium ${item.is_checked ? 'line-through text-slate-400' : ''}`}>
                            {item.item_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Talla: <span className="font-mono">{item.size_code}</span>
                            {item.sku_code ? ` • SKU: ${item.sku_code}` : ''}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {item.quantity_requested}x
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rastreabilidade & Destino */}
              {(selectedOrder.tracking_code || selectedOrder.delivery_address || selectedOrder.status === 'DESPACHADO' || selectedOrder.status === 'ENTREGUE') && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        {selectedOrder.delivery_method || 'NACEX'}
                      </span>
                      {selectedOrder.tracking_code && (
                        <>
                          {' • '}
                          <span className="font-mono font-semibold">{selectedOrder.tracking_code}</span>
                        </>
                      )}
                      {selectedOrder.delivery_address && (
                        <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                          Destino: {selectedOrder.delivery_address}
                        </div>
                      )}
                    </div>
                    <a
                      href="https://www.nacex.es/irHome.do"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Rastrear Nacex <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {(selectedOrder.status === 'DESPACHADO' || selectedOrder.status === 'ENTREGUE') && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/50">
                      <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                        Rastreabilidade Transportadora:
                      </span>
                      <select
                        value={selectedOrder.carrier_status || 'EM_TRANSITO'}
                        onChange={async (e) => {
                          const next = e.target.value as CarrierStatus;
                          try {
                            await almacenService.updateCarrierStatus(selectedOrder.id, next);
                            toast.success(`Rastreabilidade atualizada: ${next}`);
                            await loadOrders();
                          } catch (err: any) {
                            toast.error(err?.message || 'Erro ao atualizar rastreio');
                          }
                        }}
                        className="h-7 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 px-2"
                      >
                        <option value="EM_TRANSITO">Em Trânsito</option>
                        <option value="DISPONIVEL_RETIRADA">Disponível na Agência (Aguardando Retirada)</option>
                        <option value="ENTREGUE">Entregue / Retirado</option>
                        <option value="INCIDENCIA">Incidência / Não Retirado</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Assinatura Digital do Trabalhador */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {selectedOrder.signed_at ? (
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Assinado digitalmente por {selectedOrder.signed_by_name} em{' '}
                    {new Date(selectedOrder.signed_at).toLocaleString('es-ES')}
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">Assinatura Digital Pendente:</span> envie o link para o trabalhador confirmar o recebimento.
                  </div>
                )}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      const url = `${window.location.origin}/public/almacen-firmar/${selectedOrder.signature_token}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Link de assinatura copiado!');
                    }}
                  >
                    <Copy className="h-3 w-3" /> Copiar Link
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={async () => {
                      try {
                        await almacenService.sendOrderSignLinkViaMcsChat(selectedOrder);
                        toast.success(`Mensagem enviada pelo canal oficial (${selectedOrder.empresa_nome || 'RH'}) no MCS-Chat!`);
                      } catch (err: any) {
                        toast.error(err?.message || 'Erro ao enviar pelo MCS-Chat');
                      }
                    }}
                  >
                    <Send className="h-3 w-3" /> Enviar MCS-Chat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 text-emerald-700 border-emerald-300"
                    onClick={() => {
                      const url = `${window.location.origin}/public/almacen-firmar/${selectedOrder.signature_token}`;
                      const msg = `Hola ${selectedOrder.worker_nome}, tu dotación/EPIs (${selectedOrder.order_number}) ha sido enviada. Por favor confirma y firma la recepción en este enlace: ${url}`;
                      const digits = (selectedOrder.worker_phone || '').replace(/[^0-9]/g, '');
                      window.open(
                        digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`,
                        '_blank'
                      );
                    }}
                  >
                    <Send className="h-3 w-3" /> wa.me
                  </Button>
                </div>
              </div>

              {/* Workflow Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                {selectedOrder.status === 'PENDENTE' && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange(selectedOrder, 'EM_SEPARACAO')}
                  >
                    Iniciar Separação
                  </Button>
                )}
                {(selectedOrder.status === 'PENDENTE' || selectedOrder.status === 'EM_SEPARACAO') && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange(selectedOrder, 'CONFERIDO')}
                  >
                    Marcar Conferido
                  </Button>
                )}
                {selectedOrder.status !== 'DESPACHADO' &&
                  selectedOrder.status !== 'ENTREGUE' &&
                  selectedOrder.status !== 'CANCELADO' && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={() => {
                        setDispatchModalOrder(selectedOrder);
                        setDeliveryMethod(selectedOrder.delivery_method || 'NACEX');
                        setDeliveryAddress(selectedOrder.delivery_address || '');
                      }}
                    >
                      <Truck className="h-4 w-4" />
                      Despachar & Baixar Estoque
                    </Button>
                  )}
                {selectedOrder.status === 'DESPACHADO' && (
                  <Button
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => handleStatusChange(selectedOrder, 'ENTREGUE')}
                  >
                    Confirmar Entrega Manual
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Modal */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Despachar {dispatchModalOrder.order_number}</h3>
              <button onClick={() => setDispatchModalOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Método de Entrega</label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
                >
                  <option value="NACEX">Transportadora Nacex</option>
                  <option value="RECOGIDA">Recogida em Armazém</option>
                  <option value="OBRA">Entrega direta em Obra</option>
                  <option value="ALOJAMIENTO">Entrega em Alojamento</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Código de Seguimento / Conhecimento (Nacex)
                </label>
                <Input
                  placeholder="Ex: 859/12383209"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Endereço / Agência Nacex de Destino
                </label>
                <Input
                  placeholder="Ex: Agencia Nacex Bilbao / Rua..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDispatchModalOrder(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isDispatching} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isDispatching ? 'Despachando...' : 'Confirmar Despacho'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
