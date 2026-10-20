import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  Building2,
  Globe2,
  Calendar,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/features/financeiro/lib/utils';
import type { DrillDownPayload } from '../types';

interface DrillDownDrawerProps {
  payload: DrillDownPayload | null;
  onClose: () => void;
}

export const DrillDownDrawer: React.FC<DrillDownDrawerProps> = ({ payload, onClose }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = useMemo(() => {
    if (!payload) return [];
    if (!searchTerm.trim()) return payload.records;
    const q = searchTerm.trim().toLowerCase();
    return payload.records.filter(
      (r) =>
        (r.titulo || '').toLowerCase().includes(q) ||
        (r.codigo || '').toLowerCase().includes(q) ||
        (r.subtitulo || '').toLowerCase().includes(q) ||
        (r.empresa || '').toLowerCase().includes(q) ||
        (r.cliente || '').toLowerCase().includes(q) ||
        (r.vendedor || '').toLowerCase().includes(q) ||
        (r.pais || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q)
    );
  }, [payload, searchTerm]);

  const totals = useMemo(() => {
    let valor = 0;
    let horas = 0;
    let quantidade = 0;
    filteredRecords.forEach((r) => {
      valor += Number(r.valor || 0);
      horas += Number(r.horas || 0);
      quantidade += Number(r.quantidade || 0);
    });
    return { valor, horas, quantidade };
  }, [filteredRecords]);

  if (!payload) return null;

  const handleExportExcel = () => {
    const rows = filteredRecords.map((r) => ({
      Código: r.codigo || r.id,
      Registro: r.titulo,
      Detalhe: r.subtitulo || '',
      Empresa: r.empresa || '',
      País: r.pais || '',
      'Comercial / Responsável': r.vendedor || '',
      Cliente: r.cliente || '',
      Status: r.status || '',
      Data: r.data || '',
      Quantidade: r.quantidade ?? '',
      Horas: r.horas ?? '',
      'Valor (€)': r.valor ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria_BI');
    const safeTitle = payload.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 35);
    XLSX.writeFile(wb, `Conferencia_BI_${safeTitle}.xlsx`);
  };

  const categoryColors = {
    comercial: 'from-amber-500/20 to-yellow-500/5 border-amber-500/40 text-amber-400',
    financeiro: 'from-blue-500/20 to-cyan-500/5 border-blue-500/40 text-blue-400',
    faturamento: 'from-emerald-500/20 to-teal-500/5 border-emerald-500/40 text-emerald-400',
    operacional: 'from-purple-500/20 to-indigo-500/5 border-purple-500/40 text-purple-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-slate-900 border-l border-slate-800 h-full flex flex-col text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header de Conferência Auditável */}
        <div className={`p-6 border-b border-slate-800 bg-gradient-to-r ${categoryColors[payload.category]}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gaveta de Conferência & Auditoria Diretoria</span>
              </div>
              <h2 className="text-xl font-bold text-white">{payload.title}</h2>
              <p className="text-sm text-slate-300 mt-0.5">{payload.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              title="Fechar conferência"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Resumo de Auditoria */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Registros Auditados</span>
              <span className="text-lg font-extrabold text-white">{filteredRecords.length}</span>
            </div>
            {totals.valor > 0 && (
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Soma Valor (€)</span>
                <span className="text-lg font-extrabold text-emerald-400">{formatCurrency(totals.valor)}</span>
              </div>
            )}
            {totals.horas > 0 && (
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Soma Horas</span>
                <span className="text-lg font-extrabold text-sky-400">{totals.horas.toFixed(1)}h</span>
              </div>
            )}
            {totals.quantidade > 0 && (
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Qtd. Perfis / Trab.</span>
                <span className="text-lg font-extrabold text-amber-400">{totals.quantidade}</span>
              </div>
            )}
          </div>
        </div>

        {/* Barra de Pesquisa e Exportação */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center gap-3 bg-slate-900/90">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Conferir por cliente, código, trabalhador, país, vendedor ou empresa..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel ({filteredRecords.length})
          </button>
        </div>

        {/* Lista de Registros */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {rec.codigo && (
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {rec.codigo}
                    </span>
                  )}
                  <span className="font-bold text-sm text-white truncate">{rec.titulo}</span>
                  {rec.status && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                      {rec.status}
                    </span>
                  )}
                </div>
                {rec.subtitulo && <p className="text-xs text-slate-400">{rec.subtitulo}</p>}
                <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-400 pt-1">
                  {rec.empresa && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {rec.empresa}
                    </span>
                  )}
                  {rec.pais && (
                    <span className="inline-flex items-center gap-1">
                      <Globe2 className="w-3 h-3 text-slate-500" />
                      {rec.pais}
                    </span>
                  )}
                  {rec.vendedor && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {rec.vendedor}
                    </span>
                  )}
                  {rec.data && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {rec.data}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                <div className="text-right">
                  {rec.valor !== undefined && rec.valor > 0 && (
                    <div className="text-sm font-extrabold text-emerald-400">{formatCurrency(rec.valor)}</div>
                  )}
                  {rec.horas !== undefined && rec.horas > 0 && (
                    <div className="text-xs font-bold text-sky-400">{rec.horas.toFixed(1)} horas</div>
                  )}
                  {rec.quantidade !== undefined && rec.quantidade > 0 && (
                    <div className="text-xs font-semibold text-amber-400">{rec.quantidade} unid/perfis</div>
                  )}
                </div>

                {rec.link && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(rec.link!);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Abrir registro original para auditoria"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredRecords.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              Nenhum registro encontrado para os filtros aplicados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
