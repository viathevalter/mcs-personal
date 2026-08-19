import React, { useState } from 'react';
import { DOCUMENT_VARIABLES } from '../services/documentVariablesDictionary';
import { X, Copy, Check, FileText, User, Building, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentVariablesCheatSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DocumentVariablesCheatSheetModal: React.FC<DocumentVariablesCheatSheetModalProps> = ({ isOpen, onClose }) => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState<'all' | 'trabalhador' | 'cliente' | 'empresa' | 'geral'>('all');

    if (!isOpen) return null;

    const handleCopy = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        toast.success(`Variável ${key} copiada!`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const filtered = filterCategory === 'all'
        ? DOCUMENT_VARIABLES
        : DOCUMENT_VARIABLES.filter(v => v.category === filterCategory);

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Gabarito de Variáveis para Modelos Word (.docx)
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Copie as variáveis abaixo e cole diretamente no seu documento Word para preenchimento automático.
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

                {/* Filter Tabs */}
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto">
                    <button
                        onClick={() => setFilterCategory('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterCategory === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                    >
                        Todas as Variáveis ({DOCUMENT_VARIABLES.length})
                    </button>
                    <button
                        onClick={() => setFilterCategory('trabalhador')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${filterCategory === 'trabalhador' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                    >
                        <User size={14} /> Trabalhador ({DOCUMENT_VARIABLES.filter(v => v.category === 'trabalhador').length})
                    </button>
                    <button
                        onClick={() => setFilterCategory('cliente')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${filterCategory === 'cliente' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                    >
                        <Building size={14} /> Cliente ({DOCUMENT_VARIABLES.filter(v => v.category === 'cliente').length})
                    </button>
                    <button
                        onClick={() => setFilterCategory('empresa')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${filterCategory === 'empresa' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                    >
                        Empresa / Emitente ({DOCUMENT_VARIABLES.filter(v => v.category === 'empresa').length})
                    </button>
                    <button
                        onClick={() => setFilterCategory('geral')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${filterCategory === 'geral' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                    >
                        <Calendar size={14} /> Sistema / Datas ({DOCUMENT_VARIABLES.filter(v => v.category === 'geral').length})
                    </button>
                </div>

                {/* Content Table */}
                <div className="p-6 overflow-y-auto flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filtered.map((item) => (
                            <div
                                key={item.key}
                                onClick={() => handleCopy(item.key)}
                                className="group p-3.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3"
                            >
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                            {item.key}
                                        </code>
                                    </div>
                                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {item.label}
                                    </p>
                                    <p className="text-[11px] text-slate-400 italic">
                                        Ex: {item.example}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="p-2 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 rounded-lg transition-colors flex-shrink-0"
                                >
                                    {copiedKey === item.key ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs text-slate-500">
                    <span>💡 Clique em qualquer caixa para copiar a variável automaticamente.</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                    >
                        Fechar Gabarito
                    </button>
                </div>
            </div>
        </div>
    );
};
