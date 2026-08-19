import React, { useState, useEffect } from 'react';
import { documentTemplateService, type DocumentTemplate } from '../services/documentTemplateService';
import { X, Upload, Trash2, FileText, Loader2, CheckCircle2, User, Building } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentTemplateManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTemplateCreated?: () => void;
    onOpenCheatSheet?: () => void;
}

export const DocumentTemplateManagerModal: React.FC<DocumentTemplateManagerModalProps> = ({
    isOpen,
    onClose,
    onTemplateCreated,
    onOpenCheatSheet
}) => {
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [targetType, setTargetType] = useState<'client' | 'worker'>('worker');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const list = await documentTemplateService.listTemplates();
            setTemplates(list);
        } catch (e: any) {
            toast.error('Erro ao carregar modelos: ' + (e?.message || e));
        } finally {
            setLoading(false);
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Informe o nome do modelo.');
            return;
        }
        if (!selectedFile) {
            toast.error('Selecione um arquivo .docx modelo.');
            return;
        }

        setUploading(true);
        try {
            const publicUrl = await documentTemplateService.uploadTemplateFile(selectedFile);
            await documentTemplateService.createTemplate({
                name,
                target_type: targetType,
                description,
                file_url: publicUrl
            });

            toast.success('Modelo cadastrado com sucesso!');
            setName('');
            setDescription('');
            setSelectedFile(null);
            await loadTemplates();
            if (onTemplateCreated) onTemplateCreated();
        } catch (err: any) {
            console.error('Error creating template:', err);
            toast.error('Erro ao salvar modelo: ' + (err?.message || err));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir este modelo?')) return;
        try {
            await documentTemplateService.deleteTemplate(id);
            toast.success('Modelo excluído.');
            await loadTemplates();
        } catch (err: any) {
            toast.error('Erro ao excluir: ' + (err?.message || err));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Upload size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Cadastrar Novo Modelo de Documento (.docx)
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Faça upload de modelos em Word com variáveis para Clientes ou Trabalhadores.
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

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Form Section */}
                    <form onSubmit={handleUploadSubmit} className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText size={18} className="text-blue-500" /> Upload de Arquivo Word
                            </h3>
                            {onOpenCheatSheet && (
                                <button
                                    type="button"
                                    onClick={onOpenCheatSheet}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                                >
                                    Ver Gabarito de Variáveis
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                    Nome do Modelo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Contrato de Trabalho Indefinido"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                    Destinado A (Entidade Alvo) *
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTargetType('worker')}
                                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${targetType === 'worker' ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <User size={16} /> Trabalhador
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetType('client')}
                                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${targetType === 'client' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <Building size={16} /> Cliente
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                Descrição Resumida (Opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Modelo padrão de contrato com cláusula de EPI"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                Arquivo Word Modelo (.docx) *
                            </label>
                            <input
                                type="file"
                                accept=".docx"
                                required
                                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={uploading}
                                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                Cadastrar Modelo Word
                            </button>
                        </div>
                    </form>

                    {/* Existing Templates Table */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Modelos Cadastrados no Sistema
                        </h3>

                        {loading ? (
                            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                                <Loader2 size={20} className="animate-spin text-blue-500" /> Carregando modelos...
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                Nenhum modelo .docx cadastrado ainda. Preencha o formulário acima para cadastrar o primeiro!
                            </div>
                        ) : (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase">
                                        <tr>
                                            <th className="p-3">Nome do Modelo</th>
                                            <th className="p-3">Destinado A</th>
                                            <th className="p-3">Descrição</th>
                                            <th className="p-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {templates.map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="p-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <FileText size={16} className="text-blue-500 flex-shrink-0" />
                                                    {t.name}
                                                </td>
                                                <td className="p-3">
                                                    {t.target_type === 'worker' ? (
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                            Trabalhador
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                            Cliente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                                    {t.description || '-'}
                                                </td>
                                                <td className="p-3 text-right space-x-2">
                                                    <a
                                                        href={t.file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 rounded-lg"
                                                    >
                                                        Baixar Modelo
                                                    </a>
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
