import React, { useState, useEffect } from 'react';
import { documentTemplateService, type DocumentTemplate } from '../services/documentTemplateService';
import { documentGeneratorService, type GeneratedDocument } from '../services/documentGeneratorService';
import { pdfExportService } from '../services/pdfExportService';
import { buildWorkerDataMap, buildClientDataMap } from '../services/documentVariablesDictionary';
import { supabase } from '@/shared/supabase/client';
import {
    X, FileText, User, Building, Search, ArrowRight, CheckCircle2,
    Copy, ExternalLink, Send, Loader2, Sparkles, Download
} from 'lucide-react';
import { toast } from 'sonner';

interface GenerateDocumentWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDocumentGenerated?: () => void;
}

export const GenerateDocumentWizardModal: React.FC<GenerateDocumentWizardModalProps> = ({
    isOpen,
    onClose,
    onDocumentGenerated
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    // Step 1 State
    const [targetType, setTargetType] = useState<'client' | 'worker'>('worker');
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Step 2 State
    const [searchQuery, setSearchQuery] = useState('');
    const [targetOptions, setTargetOptions] = useState<any[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
    const [loadingTargets, setLoadingTargets] = useState(false);

    // Step 3 State
    const [docTitle, setDocTitle] = useState('');
    const [dataMap, setDataMap] = useState<Record<string, string>>({});
    const [generating, setGenerating] = useState(false);
    const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);

    useEffect(() => {
        if (isOpen) {
            resetWizard();
            loadTemplates('worker');
        }
    }, [isOpen]);

    const resetWizard = () => {
        setStep(1);
        setTargetType('worker');
        setSelectedTemplate(null);
        setSelectedTarget(null);
        setDocTitle('');
        setDataMap({});
        setGeneratedDoc(null);
        setSearchQuery('');
    };

    const loadTemplates = async (type: 'client' | 'worker') => {
        setLoadingTemplates(true);
        try {
            const list = await documentTemplateService.listTemplates(type);
            setTemplates(list);
            setSelectedTemplate(list[0] || null);
        } catch (e: any) {
            toast.error('Erro ao buscar modelos: ' + e?.message);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleTargetTypeChange = (type: 'client' | 'worker') => {
        setTargetType(type);
        setSelectedTemplate(null);
        setSelectedTarget(null);
        loadTemplates(type);
    };

    const loadTargetOptions = async (query = '') => {
        setLoadingTargets(true);
        try {
            if (targetType === 'worker') {
                const { data, error } = await supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('*')
                    .order('nome', { ascending: true })
                    .limit(1000);

                if (error) throw error;
                let filtered = data || [];
                if (query.trim()) {
                    const term = query.trim().toLowerCase();
                    filtered = filtered.filter((w: any) =>
                        (w.nome || '').toLowerCase().includes(term) ||
                        (w.cod_colab || '').toLowerCase().includes(term) ||
                        (w.nif || '').toLowerCase().includes(term) ||
                        (w.nie || '').toLowerCase().includes(term) ||
                        (w.funcion || '').toLowerCase().includes(term) ||
                        (w.email || '').toLowerCase().includes(term)
                    );
                }
                setTargetOptions(filtered);
            } else {
                const { data, error } = await supabase
                    .schema('core_common')
                    .from('clients')
                    .select('*')
                    .order('legal_name', { ascending: true })
                    .limit(1000);

                if (error) throw error;
                let filtered = data || [];
                if (query.trim()) {
                    const term = query.trim().toLowerCase();
                    filtered = filtered.filter((c: any) =>
                        (c.legal_name || '').toLowerCase().includes(term) ||
                        (c.trade_name || '').toLowerCase().includes(term) ||
                        (c.codigo || '').toLowerCase().includes(term) ||
                        (c.tax_id || '').toLowerCase().includes(term) ||
                        (c.city || '').toLowerCase().includes(term) ||
                        (c.email || '').toLowerCase().includes(term)
                    );
                }
                setTargetOptions(filtered);
            }
        } catch (e: any) {
            console.error('Error fetching targets:', e);
            toast.error('Erro ao buscar lista de entidades: ' + e?.message);
        } finally {
            setLoadingTargets(false);
        }
    };

    const handleGoToStep2 = () => {
        if (!selectedTemplate) {
            toast.error('Selecione um modelo de documento.');
            return;
        }
        setStep(2);
        loadTargetOptions();
    };

    const handleSelectTargetItem = (item: any) => {
        setSelectedTarget(item);
        const nameStr = targetType === 'worker'
            ? (item.display_name || item.nome || 'Trabalhador')
            : (item.legal_name || item.trade_name || 'Cliente');

        setDocTitle(`${selectedTemplate?.name || 'Documento'} - ${nameStr}`);

        const map = targetType === 'worker'
            ? buildWorkerDataMap(item)
            : buildClientDataMap(item);

        setDataMap(map);
        setStep(3);
    };

    const handleGenerateSubmit = async () => {
        if (!selectedTemplate || !selectedTarget) return;

        setGenerating(true);
        try {
            const doc = await documentGeneratorService.generateDocumentFromTemplate({
                templateUrl: selectedTemplate.file_url,
                templateId: selectedTemplate.id,
                title: docTitle,
                targetType,
                workerId: targetType === 'worker' ? selectedTarget.id : undefined,
                clientId: targetType === 'client' ? selectedTarget.id : undefined,
                dataMap
            });

            setGeneratedDoc(doc);
            toast.success('Documento gerado e link de assinatura criado!');
            if (onDocumentGenerated) onDocumentGenerated();
        } catch (err: any) {
            console.error('Error generating doc:', err);
            toast.error('Erro ao gerar documento: ' + (err?.message || err));
        } finally {
            setGenerating(false);
        }
    };

    if (!isOpen) return null;

    const publicSignatureLink = generatedDoc
        ? `${window.location.origin}/assinar/doc/${generatedDoc.public_token}`
        : '';

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Assistente de Geração de Documento Word (.docx)
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Preenchimento automático de variáveis e controle de assinatura por link público.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Wizard Stepper Header */}
                {!generatedDoc && (
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-around text-xs font-semibold text-slate-500">
                        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600 font-bold' : ''}`}>
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                            Modelo
                        </div>
                        <div className="h-px bg-slate-300 dark:bg-slate-700 w-12" />
                        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600 font-bold' : ''}`}>
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                            Entidade Alvo
                        </div>
                        <div className="h-px bg-slate-300 dark:bg-slate-700 w-12" />
                        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600 font-bold' : ''}`}>
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                            Gerar e Enviar
                        </div>
                    </div>
                )}

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* STEP 1: Select Type & Template */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    1. Selecione o Tipo de Documento *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleTargetTypeChange('worker')}
                                        className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${targetType === 'worker' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'}`}
                                    >
                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 rounded-xl">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">Para Trabalhador</h4>
                                            <p className="text-xs text-slate-500">Contratos, EPIs, Declarações</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleTargetTypeChange('client')}
                                        className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${targetType === 'client' ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-300 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'}`}
                                    >
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 rounded-xl">
                                            <Building size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">Para Cliente</h4>
                                            <p className="text-xs text-slate-500">Propostas, Contratos Comerciais</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    2. Escolha o Modelo Word (.docx) *
                                </label>

                                {loadingTemplates ? (
                                    <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                                        <Loader2 size={18} className="animate-spin text-blue-500" /> Carregando modelos...
                                    </div>
                                ) : templates.length === 0 ? (
                                    <div className="p-5 text-center text-slate-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs">
                                        Nenhum modelo cadastrado para este tipo. Por favor, cadastre um modelo Word primeiro no botão "Gerenciar Modelos".
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {templates.map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTemplate(t)}
                                                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${selectedTemplate?.id === t.id ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-300 shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-300'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText size={20} className="text-blue-500" />
                                                    <div>
                                                        <h5 className="font-bold text-xs">{t.name}</h5>
                                                        {t.description && <p className="text-[11px] text-slate-500">{t.description}</p>}
                                                    </div>
                                                </div>
                                                {selectedTemplate?.id === t.id && <CheckCircle2 size={18} className="text-blue-600" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-3">
                                <button
                                    onClick={handleGoToStep2}
                                    disabled={!selectedTemplate}
                                    className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    Avançar: Selecionar Entidade <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Select Target Record */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Selecione o {targetType === 'worker' ? 'Trabalhador' : 'Cliente'} Alvo
                                </h3>
                                <button onClick={() => setStep(1)} className="text-xs text-blue-600 underline">
                                    Voltar Passo 1
                                </button>
                            </div>

                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={`Buscar ${targetType === 'worker' ? 'Trabalhador por nome...' : 'Cliente por razão social...'}`}
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value);
                                        loadTargetOptions(e.target.value);
                                    }}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                />
                            </div>

                            {loadingTargets ? (
                                <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                                    <Loader2 size={18} className="animate-spin text-blue-500" /> Buscando registros...
                                </div>
                            ) : targetOptions.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-xs">
                                    Nenhum registro encontrado com este filtro.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                                    {targetOptions.map(item => {
                                        const isWorker = targetType === 'worker';
                                        const title = isWorker
                                            ? (item.nome || item.display_name || 'Trabalhador')
                                            : (item.legal_name || item.trade_name || 'Cliente');

                                        const code = isWorker ? item.cod_colab : item.codigo;
                                        const taxId = isWorker ? (item.nif || item.nie || item.dni) : item.tax_id;
                                        const subtitle = isWorker
                                            ? (item.funcion || item.email || '')
                                            : (item.trade_name && item.trade_name !== item.legal_name ? `Fantasia: ${item.trade_name}` : item.email || '');

                                        const location = isWorker ? item.location : (item.city ? `${item.city}${item.province ? `, ${item.province}` : ''}` : '');

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => handleSelectTargetItem(item)}
                                                className="group p-3 bg-white dark:bg-slate-950 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-xl cursor-pointer flex items-center justify-between transition-all"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${isWorker ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'}`}>
                                                        {isWorker ? <User size={18} /> : <Building size={18} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {code && (
                                                                <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                                                                    {code}
                                                                </span>
                                                            )}
                                                            <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[200px]">
                                                                {title}
                                                            </h5>
                                                        </div>
                                                        {subtitle && (
                                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                                {subtitle}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                            {taxId && <span>NIF/CIF: {taxId}</span>}
                                                            {location && <span>• {location}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ArrowRight size={16} className="text-blue-500 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Preview Data & Generate */}
                    {step === 3 && !generatedDoc && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Revisar Variáveis & Gerar Documento
                                </h3>
                                <button onClick={() => setStep(2)} className="text-xs text-blue-600 underline">
                                    Alterar Entidade Alvo
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                    Título do Documento Gerado *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={docTitle}
                                    onChange={e => setDocTitle(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                />
                            </div>

                            {/* Preview Auto-Filled Data */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                                    Valores Substituídos Automaticamente:
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-xs max-h-44 overflow-y-auto pr-1">
                                    {Object.entries(dataMap).map(([k, v]) => (
                                        <div key={k} className="p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 block font-bold">
                                                {`{{${k}}}`}
                                            </span>
                                            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate block">
                                                {v || '<Vazio>'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleGenerateSubmit}
                                    disabled={generating}
                                    className="px-6 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    Gerar Documento & Criar Link de Assinatura
                                </button>
                            </div>
                        </div>
                    )}

                    {/* RESULT SCREEN: SUCCESS & PUBLIC SIGNATURE LINK */}
                    {generatedDoc && (
                        <div className="space-y-6 text-center py-4">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 size={36} />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Documento Gerado com Sucesso!
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    O documento foi preenchido e está aguardando assinatura.
                                </p>
                            </div>

                            {/* Link Box */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-left">
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                                    Link Público de Assinatura (Enviar ao Cliente / Trabalhador):
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={publicSignatureLink}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-blue-600 dark:text-blue-400 select-all"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(publicSignatureLink);
                                            toast.success('Link copiado para a área de transferência!');
                                        }}
                                        className="px-4 py-2 font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5 flex-shrink-0"
                                    >
                                        <Copy size={16} /> Copiar
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                <button
                                    onClick={async () => {
                                        if (!generatedDoc) return;
                                        setDownloadingPdf(true);
                                        try {
                                            toast.info('Gerando PDF do documento...');
                                            await pdfExportService.downloadDocumentAsPdf(generatedDoc);
                                            toast.success('Download do PDF concluído!');
                                        } catch (err: any) {
                                            toast.error('Erro ao gerar PDF: ' + err?.message);
                                        } finally {
                                            setDownloadingPdf(false);
                                        }
                                    }}
                                    disabled={downloadingPdf}
                                    className="px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                                >
                                    {downloadingPdf ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : <Download size={16} className="text-red-500" />}
                                    Baixar PDF
                                </button>
                                <a
                                    href={publicSignatureLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-sm"
                                >
                                    <ExternalLink size={16} /> Abrir Tela de Assinatura
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
