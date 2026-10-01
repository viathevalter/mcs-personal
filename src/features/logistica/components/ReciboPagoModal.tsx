import React from 'react';
import {
  X,
  Printer,
  ExternalLink,
  CheckCircle2,
  Building,
  Home,
  CreditCard,
  Calendar,
  FileCheck,
  Download
} from 'lucide-react';
import type { PagoAlojamento } from '../services/financeLogisticsService';

interface ReciboPagoModalProps {
  op: PagoAlojamento | null;
  onClose: () => void;
}

export const ReciboPagoModal: React.FC<ReciboPagoModalProps> = ({ op, onClose }) => {
  if (!op) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Ficha de Liquidación / Recibo de Pago
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {op.codigo_pago}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Printer size={14} />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo do Recibo (Área Imprimível) */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto text-xs print:p-8 print:text-black">
          {/* Cabeçalho da Empresa */}
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <span className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                MCS GROUP • GESTIÓN LOGÍSTICA & FINANZAS
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                COMPROBANTE DE ORDEN DE PAGO
              </h1>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Departamento de Logística y Alojamientos
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-black text-slate-900 dark:text-white block">
                {op.codigo_pago}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 size={11} />
                {op.status_pago === 'Pago' ? 'LIQUIDADO / PAGADO' : op.status_pago.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Destaque do Valor e Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Importe Pagado</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                € {Number(op.valor_previsto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Competencia</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {op.periodo_competencia || '09/2026'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Concepto: {op.tipo_pago}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha de Pago / Liquidación</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {op.data_pagamento || op.data_vencimento || 'Liquidado'}
              </span>
              {op.pago_por && (
                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                  Por: {op.pago_por}
                </span>
              )}
            </div>
          </div>

          {/* Dados do Alojamento e Beneficiário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Imóvel */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Home size={14} className="text-blue-500" />
                Inmueble Vinculado
              </span>
              <div>
                <span className="text-slate-400 text-[10px] block">Alojamiento:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block">
                  {op.alojamento_nome}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  Código: {op.alojamento_codigo || '-'} {op.contrato_id ? `• Contrato: ${op.contrato_id}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Imputación / Centro de Coste:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  {op.centro_custo_cliente || 'Centro de Coste General'}
                </span>
                <span className="text-slate-500 text-[10px] block">
                  {op.centro_custo_obra || 'Obra Principal'}
                </span>
              </div>
            </div>

            {/* Provedor / Bancário */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <CreditCard size={14} className="text-emerald-500" />
                Beneficiario & Datos Bancarios
              </span>
              <div>
                <span className="text-slate-400 text-[10px] block">Propietario / Proveedor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block">
                  {op.provedor_nome}
                </span>
                {op.titular && op.titular !== op.provedor_nome && (
                  <span className="text-[10px] text-slate-500 block">Titular: {op.titular}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Cuenta / IBAN:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block text-xs tracking-wider">
                  {op.iban_cobranca || 'IBAN no especificado'}
                </span>
                {op.banco && (
                  <span className="text-[10px] text-slate-500 block">Banco: {op.banco}</span>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          {op.observacoes && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Detalles / Observaciones
              </span>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line text-xs font-mono">
                {op.observacoes}
              </p>
            </div>
          )}

          {/* Link Comprovante Bancário de Transferência */}
          {op.comprovante_url && (
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <Download size={15} />
                </div>
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                    Comprobante Bancario de Transferencia
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Archivo adjuntado y validado por el departamento financiero
                  </span>
                </div>
              </div>
              <a
                href={op.comprovante_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs text-xs"
              >
                <ExternalLink size={13} />
                Ver Comprobante
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-between items-center print:hidden">
          <span className="text-[10px] text-slate-400">
            MCS Sistema Integrado • Logística & Finanzas
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
