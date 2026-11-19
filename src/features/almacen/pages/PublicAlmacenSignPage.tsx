import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Eraser, FileText, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { downloadActaEntregaPdf } from '../utils/almacenEntregaPdf';
import type { PickingOrder } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const PublicAlmacenSignPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<PickingOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [signedByName, setSignedByName] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const loadOrder = async () => {
    if (!token) {
      setErrorMsg('Enlace inválido.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .schema('core_logistica')
        .rpc('get_almacen_order_by_token', { p_token: token });
      if (error) throw error;
      if (!data) {
        setErrorMsg('No se encontró ninguna orden de entrega para este enlace.');
      } else {
        setOrder(data as PickingOrder);
        setSignedByName(data.worker_nome || '');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al cargar la orden de entrega.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [token]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    const me = e as React.MouseEvent;
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !order || !canvasRef.current || !hasDrawn) return;
    setIsSubmitting(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const { error } = await supabase
        .schema('core_logistica')
        .rpc('sign_almacen_order_by_token', {
          p_token: token,
          p_signed_by_name: signedByName.trim() || order.worker_nome,
          p_signature_data_url: dataUrl,
        });
      if (error) throw error;
      await loadOrder();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar firma.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 text-sm">
        Cargando documento de entrega...
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="font-bold text-lg text-slate-900">Enlace no disponible</h2>
          <p className="text-sm text-slate-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
              {order.empresa_nome || 'MCS ALMACÉN'}
            </div>
            <h1 className="text-lg font-bold mt-0.5">Justificante de Entrega de EPIS y Dotación</h1>
          </div>
          <ShieldCheck className="h-8 w-8 text-emerald-400 flex-shrink-0" />
        </div>

        <div className="p-5 space-y-5">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block">Trabajador</span>
              <span className="font-bold text-slate-900">{order.worker_nome}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Orden / Pedido</span>
              <span className="font-mono font-bold text-slate-900">
                {order.order_number} {order.pedido_codigo ? `(${order.pedido_codigo})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Cliente</span>
              <span className="font-semibold text-slate-700">{order.client_nome || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Cargo / Perfil</span>
              <span className="font-semibold text-slate-700">{order.job_function_name || '-'}</span>
            </div>
          </div>

          {/* Items */}
          <div>
            <h2 className="text-xs font-bold uppercase text-slate-500 mb-2">
              Artículos Incluidos ({order.request_type})
            </h2>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {(order.items || []).map((it) => (
                <div key={it.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-slate-900">{it.item_name}</span>
                    {it.size_code && it.size_code !== 'UNICO' && (
                      <span className="ml-2 text-xs font-mono text-slate-500">({it.size_code})</span>
                    )}
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {it.quantity_requested}x
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Text */}
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Confirmo haber recibido los equipos de dotación y protección individual (EPIS) detallados arriba en buen estado de conservación. Me comprometo a utilizarlos exclusivamente en el entorno laboral designado, respetar las normas de seguridad establecidas y comunicar cualquier defecto o desgaste.
          </p>

          {order.signed_at ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <div>
                <h3 className="font-bold text-emerald-900">Recepción Confirmada y Firmada</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Firmado por <strong>{order.signed_by_name}</strong> el{' '}
                  {new Date(order.signed_at).toLocaleString('es-ES')}
                </p>
              </div>
              {order.signature_data_url && (
                <img
                  src={order.signature_data_url}
                  alt="Firma"
                  className="h-20 mx-auto border border-emerald-200 rounded-lg bg-white p-1"
                />
              )}
              <Button
                onClick={() => downloadActaEntregaPdf(order)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl"
              >
                <FileText className="h-4 w-4" />
                Descargar Acta Firmada (PDF)
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSignSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Nombre Completo (Confirmación)
                </label>
                <Input
                  required
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Firma Digital del Trabajador (dibuje abajo)
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    <Eraser className="h-3.5 w-3.5" /> Limpiar
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={180}
                  onMouseDown={startDraw}
                  onMouseMove={moveDraw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={moveDraw}
                  onTouchEnd={endDraw}
                  className="w-full h-40 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 touch-none cursor-crosshair"
                />
              </div>

              <Button
                type="submit"
                disabled={!hasDrawn || isSubmitting}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base"
              >
                {isSubmitting ? 'Guardando firma...' : 'Confirmar Recepción y Firmar'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
