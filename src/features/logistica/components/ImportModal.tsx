import React, { useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2, ArrowRight, ArrowLeft, Building, Home, FileText, Layers } from 'lucide-react';
import { importLogisticsService, TARGET_FIELDS } from '../services/importLogisticsService';
import type { ImportResult, ParsedSpreadsheet } from '../services/importLogisticsService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [entityType, setEntityType] = useState<'provedores' | 'alojamentos' | 'contratos'>('provedores');
  const [file, setFile] = useState<File | null>(null);
  
  const [parsedData, setParsedData] = useState<ParsedSpreadsheet | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setParsedData(null);
    setSelectedSheet('');
    setColumnMapping({});
    setResult(null);
    setErrorMsg(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const parseFileWithSheet = async (selectedFile: File, sheetName?: string, currentEntity: 'provedores' | 'alojamentos' | 'contratos' = entityType) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const parsed = await importLogisticsService.parseSpreadsheet(selectedFile, sheetName, currentEntity);
      setParsedData(parsed);
      setSelectedSheet(parsed.selectedSheet);

      // Auto-mapear colunas inteligentes
      const autoMapped = importLogisticsService.autoMapColumns(currentEntity, parsed.headers);
      setColumnMapping(autoMapped);
    } catch (err: any) {
      console.error('Error parsing file:', err);
      setErrorMsg(err.message || 'Erro ao ler arquivo de planilha.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseFileWithSheet(selectedFile, undefined, entityType);
    }
  };

  const handleSheetChange = (newSheetName: string) => {
    if (file) {
      parseFileWithSheet(file, newSheetName, entityType);
    }
  };

  const handleEntityTypeChange = (type: 'provedores' | 'alojamentos' | 'contratos') => {
    setEntityType(type);
    if (file) {
      parseFileWithSheet(file, undefined, type);
    }
  };

  const handleMappingChange = (systemKey: string, spreadsheetHeader: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [systemKey]: spreadsheetHeader
    }));
  };

  const handleExecuteImport = async () => {
    if (!parsedData || !file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await importLogisticsService.executeMappedImport(
        entityType,
        parsedData.rows,
        columnMapping
      );
      setResult(res);
      setStep(3);
      if (res.provedoresImportados > 0 || res.alojamentosImportados > 0 || res.contratosImportados > 0) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Erro ao executar importação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const targetFields = TARGET_FIELDS[entityType] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Importação Personalizada de Planilha</h2>
              <p className="text-xs text-slate-500">Passo {step} de 3 — Mapeamento De/Para</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs font-semibold text-slate-500">
          <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">1</span>
            Tipo & Arquivo
          </span>
          <ArrowRight size={14} className="text-slate-300" />
          <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">2</span>
            Mapeamento De/Para
          </span>
          <ArrowRight size={14} className="text-slate-300" />
          <span className={`flex items-center gap-1.5 ${step === 3 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">3</span>
            Resultado
          </span>
        </div>

        {/* STEP 1: Seleção de Tipo e File Upload */}
        {step === 1 && (
          <div className="space-y-5 overflow-y-auto pr-1 flex-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">1. Selecione o que deseja importar:</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleEntityTypeChange('provedores')}
                  className={`p-4 rounded-xl border text-left flex flex-col items-center justify-center gap-2 transition-all ${
                    entityType === 'provedores'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Building size={24} />
                  <span className="text-xs">Proveedores</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEntityTypeChange('alojamentos')}
                  className={`p-4 rounded-xl border text-left flex flex-col items-center justify-center gap-2 transition-all ${
                    entityType === 'alojamentos'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Home size={24} />
                  <span className="text-xs">Alojamentos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEntityTypeChange('contratos')}
                  className={`p-4 rounded-xl border text-left flex flex-col items-center justify-center gap-2 transition-all ${
                    entityType === 'contratos'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileText size={24} />
                  <span className="text-xs">Contratos</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">2. Selecione a planilha (.csv ou .xlsx):</label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors rounded-xl p-6 text-center cursor-pointer relative bg-slate-50/50 dark:bg-slate-800/40">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="mx-auto mb-2 text-slate-400" size={32} />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {file ? file.name : 'Arraste ou clique para selecionar a planilha'}
                </p>
                {parsedData && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
                    ✓ {parsedData.rows.length} linhas e {parsedData.headers.length} colunas carregadas da aba "{selectedSheet}"!
                  </p>
                )}
              </div>
            </div>

            {parsedData && parsedData.sheetNames.length > 1 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1">
                <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Layers size={14} />
                  Selecione a Aba do Excel ({parsedData.sheetNames.length} abas disponíveis):
                </label>
                <select
                  value={selectedSheet}
                  onChange={e => handleSheetChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white"
                >
                  {parsedData.sheetNames.map(s => (
                    <option key={s} value={s}>Aba: "{s}"</option>
                  ))}
                </select>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Mapeamento de Colunas (De/Para) */}
        {step === 2 && parsedData && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              <span>Associe cada campo do sistema à coluna da sua planilha ({file?.name} &gt; Aba: "{selectedSheet}"):</span>
              {parsedData.sheetNames.length > 1 && (
                <select
                  value={selectedSheet}
                  onChange={e => handleSheetChange(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-slate-800 dark:text-white ml-2"
                >
                  {parsedData.sheetNames.map(s => (
                    <option key={s} value={s}>Aba: "{s}"</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Campo no Sistema ({entityType})</span>
                <span>Coluna na sua Planilha (Excel/CSV)</span>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {targetFields.map(field => (
                  <div key={field.key} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 block">ID: {field.key}</span>
                    </div>

                    <select
                      value={columnMapping[field.key] || ''}
                      onChange={e => handleMappingChange(field.key, e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                        columnMapping[field.key]
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-900/20 text-slate-900 dark:text-white font-medium'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500'
                      }`}
                    >
                      <option value="">--- Ignorar / Não Mapeado ---</option>
                      {parsedData.headers.map(header => (
                        <option key={header} value={header}>
                          Coluna: "{header}"
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Resultado da Importação */}
        {step === 3 && result && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 size={20} />
                Importação Concluída com Sucesso!
              </div>
              <ul className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1 pl-6 list-disc font-medium">
                {result.provedoresImportados > 0 && <li>{result.provedoresImportados} provedores cadastrados com sucesso.</li>}
                {result.alojamentosImportados > 0 && <li>{result.alojamentosImportados} alojamentos criados com estrutura de camas.</li>}
                {result.contratosImportados > 0 && <li>{result.contratosImportados} contratos gravados.</li>}
              </ul>
            </div>

            {result.erros.length > 0 && (
              <div className="max-h-40 overflow-y-auto p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-bold">Avisos durante a importação:</p>
                {result.erros.map((err, idx) => (
                  <p key={idx}>• {err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
            >
              {step === 3 ? 'Fechar' : 'Cancelar'}
            </button>

            {step === 1 && (
              <button
                type="button"
                disabled={!parsedData || isProcessing}
                onClick={() => setStep(2)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                Próximo: Mapear Colunas (De/Para)
                <ArrowRight size={16} />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessing && <Loader2 size={16} className="animate-spin" />}
                {isProcessing ? 'Importando...' : `Confirmar e Importar ${parsedData?.rows.length} Registros`}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
