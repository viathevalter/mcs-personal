import React, { useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { importLogisticsService } from '../services/importLogisticsService';
import type { ImportResult } from '../services/importLogisticsService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setErrorMsg(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await importLogisticsService.processFile(file);
      setResult(res);
      if (res.provedoresImportados > 0 || res.alojamentosImportados > 0 || res.contratosImportados > 0) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Erro ao processar o arquivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Importar Planilha (CSV / Excel)</h2>
              <p className="text-xs text-slate-500">Provedores, Alojamentos e Contratos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors rounded-xl p-6 text-center cursor-pointer relative bg-slate-50/50 dark:bg-slate-800/40">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="mx-auto mb-2 text-slate-400" size={32} />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {file ? file.name : 'Arraste uma planilha ou clique para selecionar'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Suporta arquivos .csv, .xlsx de Provedores ou Alojamentos</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!file || isProcessing}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing && <Loader2 size={16} className="animate-spin" />}
                {isProcessing ? 'Importando...' : 'Iniciar Importação'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle2 size={18} />
                Importação Concluída com Sucesso!
              </div>
              <ul className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1 pl-6 list-disc">
                {result.provedoresImportados > 0 && <li>{result.provedoresImportados} provedores cadastrados.</li>}
                {result.alojamentosImportados > 0 && <li>{result.alojamentosImportados} alojamentos criados com camas.</li>}
                {result.contratosImportados > 0 && <li>{result.contratosImportados} contratos de locação vinculados.</li>}
              </ul>
            </div>

            {result.erros.length > 0 && (
              <div className="max-h-32 overflow-y-auto p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-semibold">Avisos / Detalhes:</p>
                {result.erros.map((err, idx) => (
                  <p key={idx}>• {err}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
