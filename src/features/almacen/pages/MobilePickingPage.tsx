import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  PackageCheck,
  Search,
  Truck,
  ArrowLeft,
  Send,
  Copy,
  RefreshCw,
  X,
  CheckSquare,
  Square,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { almacenService } from '../services/almacenService';
import type { DeliveryMethod, PickingItem, PickingOrder, PickingStatus } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const MobilePickingPage: React.FC = () => {
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PickingStatus | 'TODOS'>('PENDENTE');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOrder, setActiveOrder] = useState<PickingOrder | null>(null);

  // QR Scanner
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Dispatch modal
  const [showDispatch, setShowDispatch] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('NACEX');
  const [trackingCode, setTrackingCode] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await almacenService.getPickingOrders('TODOS');
      setOrders(data);
      if (activeOrder) {
        const refreshed = data.find((o) => o.id === activeOrder.id) || null;
        setActiveOrder(refreshed);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar ordens');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Start / Stop QR Scanner
  useEffect(() => {
    if (!showScanner) return;
    let cancelled = false;
    const regionId = 'almacen-qr-reader';

    const startScanner = async () => {
      try {
        const html5Qr = new Html5Qrcode(regionId);
        scannerRef.current = html5Qr;
        await html5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            handleQrDecoded(decodedText);
          },
          () => {
            // ignore scan frame errors
          }
        );
      } catch (err: any) {
        toast.error('Não foi possível abrir a câmera. Verifique as permissões do navegador.');
        setShowScanner(false);
      }
    };

    const timer = setTimeout(startScanner, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [showScanner]);

  const handleQrDecoded = (rawText: string) => {
    let targetOrderNumber = '';
    let targetId = '';
    let targetToken = '';

    try {
      const parsed = JSON.parse(rawText);
      if (parsed.order) targetOrderNumber = String(parsed.order);
      if (parsed.id) targetId = String(parsed.id);
    } catch {
      if (rawText.includes('/public/almacen-firmar/')) {
        targetToken = rawText.split('/public/almacen-firmar/')[1]?.trim() || '';
      } else {
        targetOrderNumber = rawText.trim();
      }
    }

    const found = orders.find(
      (o) =>
        (targetId && o.id === targetId) ||
        (targetOrderNumber && o.order_number.toUpperCase() === targetOrderNumber.toUpperCase()) ||
        (targetToken && o.signature_token === targetToken)
    );

    if (found) {
      setShowScanner(false);
      setActiveOrder(found);
      toast.success(`Ordem ${found.order_number} aberta!`);
    } else {
      toast.warning(`Ordem não encontrada para o QR: ${rawText.substring(0, 40)}`);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'TODOS' && o.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          o.order_number.toLowerCase().includes(q) ||
          o.worker_nome.toLowerCase().includes(q) ||
          (o.pedido_codigo || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  const handleToggleItem = async (item: PickingItem) => {
    if (!activeOrder) return;
    if (activeOrder.status === 'DESPACHADO' || activeOrder.status === 'ENTREGUE') return;

    const nextChecked = !item.is_checked;
    const nextQty = nextChecked ? item.quantity_requested : 0;
    try {
      await almacenService.togglePickingItemCheck(item.id, nextChecked, nextQty);
      const updatedItems = (activeOrder.items || []).map((i) =>
        i.id === item.id ? { ...i, is_checked: nextChecked, quantity_picked: nextQty } : i
      );
      setActiveOrder({ ...activeOrder, items: updatedItems });
      setOrders((prev) =>
        prev.map((o) => (o.id === activeOrder.id ? { ...o, items: updatedItems } : o))
      );

      if (activeOrder.status === 'PENDENTE' && nextChecked) {
        await almacenService.updatePickingStatus(activeOrder.id, 'EM_SEPARACAO');
        setActiveOrder((prev) => (prev ? { ...prev, status: 'EM_SEPARACAO' } : prev));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao marcar item');
    }
  };

  const handleConfirmConferido = async () => {
    if (!activeOrder) return;
    try {
      await almacenService.updatePickingStatus(activeOrder.id, 'CONFERIDO');
      toast.success('Conferência concluída! Pronto para despacho.');
      await loadOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao concluir conferência');
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setIsDispatching(true);
    try {
      await almacenService.dispatchPickingOrder({
        order: activeOrder,
        deliveryMethod,
        trackingCode: trackingCode.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
      });
      toast.success(`Pacote ${activeOrder.order_number} despachado e estoque baixado!`);
      setShowDispatch(false);
      await loadOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao despachar');
    } finally {
      setIsDispatching(false);
    }
  };

  const getSignUrl = (order: PickingOrder) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/public/almacen-firmar/${order.signature_token}`;
  };

  const sendWhatsAppSignLink = (order: PickingOrder) => {
    const url = getSignUrl(order);
    const msg = `Hola ${order.worker_nome}, tu dotación/EPIs (${order.order_number}) ha sido enviada. Por favor confirma y firma la recepción en este enlace: ${url}`;
    const phoneDigits = (order.worker_phone || '').replace(/[^0-9]/g, '');
    const waUrl = phoneDigits
      ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Active Order Detail View (Mobile-first)
  if (activeOrder) {
    const items = activeOrder.items || [];
    const checkedCount = items.filter((i) => i.is_checked).length;
    const progressPct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
    const isFinished = activeOrder.status === 'DESPACHADO' || activeOrder.status === 'ENTREGUE';

    return (
      <div className="max-w-lg mx-auto space-y-4 pb-20">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => setActiveOrder(null)} className="gap-1.5 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> Fila
          </Button>
          <span className="font-mono font-bold text-sm">{activeOrder.order_number}</span>
          <Badge className="bg-emerald-100 text-emerald-800">{activeOrder.status}</Badge>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="font-bold text-base">{activeOrder.worker_nome}</div>
          <div className="text-xs text-slate-500">
            {activeOrder.empresa_nome || '-'} • {activeOrder.client_nome || '-'}
          </div>
          <div className="flex gap-2 text-xs pt-1">
            <Badge variant="outline">Camisa: {activeOrder.camiseta_size || '-'}</Badge>
            <Badge variant="outline">Calça: {activeOrder.pantalones_size || '-'}</Badge>
            <Badge variant="outline">{activeOrder.request_type}</Badge>
          </div>
          {activeOrder.delivery_address && (
            <div className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{activeOrder.delivery_address}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span>Conferência de Itens</span>
            <span className="text-emerald-600">
              {checkedCount} / {items.length} ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Big Touch Checklist */}
        <div className="space-y-2.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={isFinished}
              onClick={() => handleToggleItem(item)}
              className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between gap-3 transition-all active:scale-[0.99] ${
                item.is_checked
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {item.is_checked ? (
                  <CheckSquare className="h-7 w-7 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Square className="h-7 w-7 text-slate-300 flex-shrink-0" />
                )}
                <div>
                  <div className={`font-bold text-base ${item.is_checked ? 'line-through text-slate-400' : ''}`}>
                    {item.item_name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Talla: {item.size_code} {item.sku_code ? `• ${item.sku_code}` : ''}
                  </div>
                </div>
              </div>
              <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                {item.quantity_requested}x
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Actions */}
        {!isFinished ? (
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            {activeOrder.status !== 'CONFERIDO' && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleConfirmConferido}
                className="h-12 rounded-2xl text-sm font-bold gap-2"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Marcar como Conferido
              </Button>
            )}
            <Button
              size="lg"
              onClick={() => {
                setDeliveryMethod(activeOrder.delivery_method || 'NACEX');
                setDeliveryAddress(activeOrder.delivery_address || '');
                setTrackingCode(activeOrder.tracking_code || '');
                setShowDispatch(true);
              }}
              className="h-14 rounded-2xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Truck className="h-5 w-5" />
              Fechar Pacote & Despachar
            </Button>
          </div>
        ) : (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 space-y-3">
            <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {activeOrder.signed_at ? 'Recebimento Assinado pelo Trabalhador!' : 'Pacote Despachado!'}
            </div>
            {activeOrder.tracking_code && (
              <div className="text-xs font-mono">
                {activeOrder.delivery_method}: {activeOrder.tracking_code}
              </div>
            )}
            {!activeOrder.signed_at && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl"
                  onClick={async () => {
                    const msg = almacenService.buildOrderSignMessage(activeOrder);
                    await almacenService.openWorkerInMcsChat({
                      workerId: activeOrder.worker_id,
                      workerName: activeOrder.worker_nome,
                      workerPhone: activeOrder.worker_phone,
                      prefillMessage: msg,
                    });
                    toast.success('MCS-Chat aberto e mensagem copiada para você revisar e enviar!');
                  }}
                >
                  <Send className="h-4 w-4" /> Abrir MCS-Chat
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-xl"
                  onClick={() => {
                    navigator.clipboard.writeText(getSignUrl(activeOrder));
                    toast.success('Link de assinatura copiado!');
                  }}
                >
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Dispatch Modal */}
        {showDispatch && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Despachar {activeOrder.order_number}</h3>
                <button onClick={() => setShowDispatch(false)} className="text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleDispatchSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Método</label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                    className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
                  >
                    <option value="NACEX">Nacex</option>
                    <option value="RECOGIDA">Recogida em Armazém</option>
                    <option value="OBRA">Entrega em Obra</option>
                    <option value="ALOJAMIENTO">Entrega em Alojamento</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Código Seguimento (Nacex)</label>
                  <Input
                    placeholder="Ex: 859/12383209"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Endereço Destino</label>
                  <Input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isDispatching}
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isDispatching ? 'Despachando...' : 'Confirmar Despacho & Baixar Estoque'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Queue View (Mobile-first)
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-16">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-600" />
            Picking Móvil (Armazém)
          </h1>
          <p className="text-xs text-slate-500">Leia o QR Code da etiqueta ou toque na ordem para separar.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders} disabled={isLoading} className="rounded-xl">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Big Scan QR Button */}
      <Button
        onClick={() => setShowScanner(true)}
        className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-base gap-2.5 shadow-lg"
      >
        <Camera className="h-6 w-6" />
        Ler QR Code da Etiqueta (Câmera)
      </Button>

      {/* Search & Status Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar ordem SEP-..., trabalhador ou pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['PENDENTE', 'EM_SEPARACAO', 'CONFERIDO', 'DESPACHADO', 'TODOS'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Carregando ordens...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Nenhuma ordem nesta fila.</div>
        ) : (
          filteredOrders.map((o) => {
            const totalItems = (o.items || []).length;
            const checkedItems = (o.items || []).filter((i) => i.is_checked).length;
            return (
              <button
                key={o.id}
                onClick={() => setActiveOrder(o)}
                className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-emerald-400 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    {o.order_number}
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    {o.status}
                  </Badge>
                </div>
                <div className="font-bold text-base mt-1">{o.worker_nome}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {o.empresa_nome || '-'} • {o.client_nome || '-'}
                </div>
                <div className="flex items-center justify-between text-xs mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold">
                    Cam: {o.camiseta_size || '-'} | Cal: {o.pantalones_size || '-'}
                  </span>
                  <span className="font-mono text-emerald-600 font-bold">
                    {checkedItems}/{totalItems} itens
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Camera QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-600" />
                Aponte para o QR Code
              </h3>
              <button onClick={() => setShowScanner(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div id="almacen-qr-reader" className="w-full rounded-xl overflow-hidden bg-black min-h-[260px]" />
            <Button variant="outline" className="w-full" onClick={() => setShowScanner(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
