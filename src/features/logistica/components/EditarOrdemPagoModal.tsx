import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit3, DollarSign, Calendar, Building, CreditCard, Users, Paperclip, FileUp, CheckCircle2, Trash2 } from 'lucide-react';
import type { PagoAlojamento } from '../services/financeLogisticsService';
import { financeLogisticsService } from '../services/financeLogisticsService';

interface EditarOrdemPagoModalProps {
  op: PagoAlojamento | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditarOrdemPagoModal: React.FC<EditarOrdemPagoModalProps> = ({
  op,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen || !op) return null;

  const [valor, setValor] = useState<number>(op.valor_previsto || 0);
  const [dataVencimento, setDataVencimento] = useState<string>(op.data_vencimento || '');
  const [competencia, setCompetencia] = useState<string>(op.periodo_competencia || '');
  const [provedorNome, setProvedorNome] = useState<string>(op.provedor_nome || '');
  const [formaPagamento, setFormaPagamento] = useState<string>(
    op.forma_pagamento || (op.observacoes?.toLowerCase().includes('tarjeta') ? 'Tarjeta de Empresa' : 'Transferencia Bancaria')
  );
  const [iban, setIban] = useState<string>(op.iban_cobranca || '');
  const [banco, setBanco] = useState<string>(op.banco || '');
  const [titular, setTitular] = useState<string>(op.titular || '');
  const [clienteCC, setClienteCC] = useState<string>(op.centro_custo_cliente || '');
  const [obraCC, setObraCC] = useState<string>(op.centro_custo_obra || '');
  const [observacoes, setObservacoes] = useState<string>(op.observacoes || '');
  const [anexoUrl, setAnexoUrl] = useState<string>(op.anexo_fatura_url || '');
  const [anexoNome, setAnexoNome] = useState<string>('');
  const [isUploadingAnexo, setIsUploadingAnexo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (op) {
      setValor(op.valor_previsto || 0);
      setDataVencimento(op.data_vencimento || '');
      setCompetencia(op.periodo_competencia || '');
      setProvedorNome(op.provedor_nome || '');
      setFormaPagamento(
        op.forma_pagamento || (op.observacoes?.toLowerCase().includes('tarjeta') ? 'Tarjeta de Empresa' : 'Transferencia Bancaria')
      );
      setIban(op.iban_cobranca || '');
      setBanco(op.banco || '');
      setTitular(op.titular || '');
      setClienteCC(op.centro_custo_cliente || '');
      setObraCC(op.centro_custo_obra || '');
      setObservacoes(op.observacoes || '');
      setAnexoUrl(op.anexo_fatura_url || '');
      setAnexoNome(op.anexo_fatura_url ? 'Factura / Comprobante adjunto' : '');
    }
  }, [op]);

  const handleUploadAnexo = async (eOrFile: React.ChangeEvent<HTMLInputElement> | File | any) => {
    const file: File | undefined =
      eOrFile instanceof File ? eOrFile : eOrFile?.target?.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAnexo(true);
      const uploaded = await financeLogisticsService.uploadAnexoLogistica(file);
      if (uploaded.url) {
        setAnexoUrl(uploaded.url);
        setAnexoNome(uploaded.name || file.name);
      }
    } catch (e: any) {
      console.error('Error al subir archivo:', e);
      alert(`Error en la carga del archivo: ${e?.message || 'Intente nuevamente'}`);
    } finally {
      setIsUploadingAnexo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (valor <= 0) {
      alert('Por favor, informe un importe válido mayor que cero.');
      return;
    }

    try {
      setIsSaving(true);
      const isCard = formaPagamento.toLowerCase().includes('tarjeta') || formaPagamento.toLowerCase().includes('reserva');
      await financeLogisticsService.atualizarOrdemPagamento(op.id, {
        valor,
        data_vencimento: dataVencimento,
        periodo_competencia: competencia,
        provedor_nome: provedorNome,
        forma_pagamento: formaPagamento,
        iban_cobranca: isCard ? '' : iban,
        banco: isCard ? '' : banco,
        titular,
        centro_custo_cliente: clienteCC,
        centro_custo_obra: obraCC,
        observacoes,
        anexo_url: anexoUrl
      });

      alert('¡Orden de Pago actualizada con éxito!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al actualizar OP:', err);
      alert(`Error al actualizar: ${err?.message || 'Compruebe la conexión'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Edit3 size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Modificar Orden de Pago
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {op.codigo_pago} • {op.alojamento_nome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          {/* Valor e Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <DollarSign size={13} className="text-emerald-500" />
                Importe Previsto (€) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={e => setValor(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar size={13} className="text-blue-500" />
                Fecha de Vencimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Competência e Provedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Periodo / Competencia (MM/AAAA)
              </label>
              <input
                type="text"
                placeholder="10/2026"
                value={competencia}
                onChange={e => setCompetencia(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building size={13} className="text-slate-400" />
                Proveedor / Propietario
              </label>
              <input
                type="text"
                value={provedorNome}
                onChange={e => setProvedorNome(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Dados Bancários / Método de Pago */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <CreditCard size={13} className="text-emerald-500" />
                Método de Pago y Datos Bancarios
              </span>
              <select
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="Transferencia Bancaria">🏦 Transferencia Bancaria</option>
                <option value="Tarjeta de Empresa">💳 Tarjeta de Empresa</option>
                <option value="Cartão de Reserva / Corporativo">💳 Tarjeta de Reserva / Corporativa</option>
              </select>
            </div>

            {formaPagamento.toLowerCase().includes('tarjeta') || formaPagamento.toLowerCase().includes('reserva') ? (
              <div className="space-y-2">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/70 rounded-xl flex items-center gap-2 text-purple-900 dark:text-purple-200 text-[11px]">
                  <CreditCard size={14} className="text-purple-600 flex-shrink-0" />
                  <span>
                    <strong>Pago con Tarjeta de Empresa:</strong> No requiere IBAN ni transferencia bancaria.
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                    Plataforma / Establecimiento (Opcional)
                  </label>
                  <input
                    type="text"
                    value={titular}
                    onChange={e => setTitular(e.target.value)}
                    placeholder="Ej: Airbnb / Booking / Hotel"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={iban}
                      onChange={e => setIban(e.target.value)}
                      placeholder="ESXX..."
                      className="w-full px-2.5 py-1.5 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={banco}
                      onChange={e => setBanco(e.target.value)}
                      placeholder="Santander, BBVA..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                    Titular de la Cuenta
                  </label>
                  <input
                    type="text"
                    value={titular}
                    onChange={e => setTitular(e.target.value)}
                    placeholder="Nombre del beneficiario"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </>
            )}
          </div>

          {/* Centros de Coste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Cliente / Centro de Coste
              </label>
              <input
                type="text"
                value={clienteCC}
                onChange={e => setClienteCC(e.target.value)}
                placeholder="Cliente imputado"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Obra
              </label>
              <input
                type="text"
                value={obraCC}
                onChange={e => setObraCC(e.target.value)}
                placeholder="Obra principal"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Conferência de Trabalhadores Alojados e Clientes Contratados */}
          {op.ocupantes && op.ocupantes.length > 0 && (
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Users size={13} className="text-emerald-600" />
                  Trabajadores Alojados en este Inmueble ({op.ocupantes.length})
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {Array.from(new Set(op.ocupantes.map(o => o.cliente_nome).filter(Boolean))).map(cli => (
                    <button
                      key={cli}
                      type="button"
                      onClick={() => setClienteCC(cli || '')}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-[10px] font-bold"
                      title="Click para imputar este cliente"
                    >
                      🏢 {cli} ({op.ocupantes!.filter(o => o.cliente_nome === cli).length})
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-emerald-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800">
                {op.ocupantes.map((oc, idx) => (
                  <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{oc.worker_nome}</span>
                      {oc.codigo_colab && (
                        <span className="ml-1.5 font-mono text-[10px] text-slate-400">[{oc.codigo_colab}]</span>
                      )}
                      <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        🏢 Cliente: {oc.cliente_nome || 'No informado'} {oc.obra_nome ? `• 🏗️ ${oc.obra_nome}` : ''}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold">
                      🛏️ {oc.cama_identificador || 'Habitación'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anexo / Fatura / Comprovante */}
          <div
            className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800"
            onDragOver={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={e => {
              e.preventDefault();
              e.stopPropagation();
              const droppedFile = e.dataTransfer?.files?.[0];
              if (droppedFile) handleUploadAnexo(droppedFile);
            }}
          >
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip size={13} className="text-blue-500" />
                Factura / Billete / Comprobante Adjunto
              </label>
              <span className="text-[10px] text-slate-400">PDF, JPG, PNG (máx. 15MB)</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={e => handleUploadAnexo(e)}
              accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
              className="hidden"
            />

            {anexoUrl ? (
              <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-800">
                <div className="flex items-center gap-2 truncate">
                  <div className="p-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg">
                    <CheckCircle2 size={15} />
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-xs">
                    {anexoNome || 'Archivo adjunto'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={anexoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-lg text-[10px] font-bold"
                  >
                    Visualizar
                  </a>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnexoUrl('');
                      setAnexoNome('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                    title="Quitar archivo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAnexo}
                className="w-full py-2.5 px-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors bg-white dark:bg-slate-900"
              >
                <FileUp size={15} className={isUploadingAnexo ? 'animate-bounce' : ''} />
                <span className="font-bold text-xs">
                  {isUploadingAnexo ? 'Subiendo archivo...' : 'Subir o arrastrar factura / comprobante'}
                </span>
              </button>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Observaciones / Justificación de Cambios
            </label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Detalles sobre este pago, ajustes realizados o aclaraciones para finanzas..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Footer Ações */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Save size={14} />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
