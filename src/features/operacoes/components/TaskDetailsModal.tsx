import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Briefcase, CheckCircle, Clock, AlertTriangle, Layers, Edit, Save, ArrowRight, Paperclip, Play } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';
import { ContextCard } from './ContextCard';
import { RichTextRenderer, RichTextEditor } from './ui/RichTextEditor';
import { FileAttachmentUploader, TaskAttachment } from './ui/FileAttachmentUploader';
import type { IncidenciaTarefaExpandida } from '../services/types';
import { updateTarefa } from '../services/incidencias';
import { toast } from 'sonner';

interface TaskDetailsModalProps {
    task: IncidenciaTarefaExpandida | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange?: (task: IncidenciaTarefaExpandida) => Promise<void>;
    onAssignMe?: (id: string) => Promise<void>;
    onTaskUpdated?: () => Promise<void>;
    currentUserId?: string;
    currentUserEmail?: string;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
    task,
    isOpen,
    onClose,
    onStatusChange,
    onAssignMe,
    onTaskUpdated,
    currentUserEmail
}) => {
    if (!isOpen || !task) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        titulo: task.titulo || '',
        descricao: task.descricao || task.evidencia || '',
        scheduled_for: task.scheduled_for ? task.scheduled_for.split('T')[0] : '',
        prazo: task.prazo ? task.prazo.split('T')[0] : '',
        attachments: (task.attachments || []) as TaskAttachment[]
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setEditForm({
                titulo: task.titulo || '',
                descricao: task.descricao || task.evidencia || '',
                scheduled_for: task.scheduled_for ? task.scheduled_for.split('T')[0] : '',
                prazo: task.prazo ? task.prazo.split('T')[0] : '',
                attachments: (task.attachments || []) as TaskAttachment[]
            });
            setIsEditing(false);
        }
    }, [task]);

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            // Encode description and attachments inside evidence field if needed for database backward compatibility
            const payloadEvidence = JSON.stringify({
                description: editForm.descricao,
                attachments: editForm.attachments
            });

            await updateTarefa(task.id, {
                titulo: editForm.titulo,
                prazo: editForm.prazo || undefined,
                scheduled_for: editForm.scheduled_for || undefined,
                evidencia: payloadEvidence
            } as any);

            toast.success("Tarefa atualizada com sucesso!");
            setIsEditing(false);
            if (onTaskUpdated) await onTaskUpdated();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao salvar alterações na tarefa.");
        } finally {
            setSaving(false);
        }
    };

    const handleAttachmentsUpdate = async (newAttachments: TaskAttachment[]) => {
        setEditForm(prev => ({ ...prev, attachments: newAttachments }));
        // If not in full edit mode, save attachments immediately
        if (!isEditing) {
            try {
                const payloadEvidence = JSON.stringify({
                    description: editForm.descricao,
                    attachments: newAttachments
                });
                await updateTarefa(task.id, { evidencia: payloadEvidence } as any);
                toast.success("Anexos salvos com sucesso!");
                if (onTaskUpdated) await onTaskUpdated();
            } catch (err) {
                console.error(err);
                toast.error("Erro ao salvar anexo.");
            }
        }
    };

    const isMine = task.responsavel_email === currentUserEmail;
    const isLate = task.prazo && new Date(task.prazo) < new Date() && task.status !== 'Concluida';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in font-inter">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
                                #{task.id.substring(0, 8)}
                            </span>
                            <StatusBadge status={task.status} type="status" />
                            {task.incidencia_impacto && (
                                <StatusBadge status={task.incidencia_impacto} type="impact" />
                            )}
                            {isLate && (
                                <span className="text-xs bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                                    <AlertTriangle size={12} /> Atrasada
                                </span>
                            )}
                        </div>

                        {isEditing ? (
                            <input
                                type="text"
                                className="w-full text-xl font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                                value={editForm.titulo}
                                onChange={e => setEditForm({ ...editForm, titulo: e.target.value })}
                            />
                        ) : (
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {task.titulo}
                            </h2>
                        )}

                        {task.incidencia_titulo && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                                <Layers size={13} className="text-blue-500" />
                                Incidência Pai: <span className="text-slate-700 dark:text-slate-300 font-semibold">{task.incidencia_titulo}</span>
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                                title="Editar Tarefa"
                            >
                                <Edit size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Context Card */}
                    {task.context && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                                Contexto Vinculado (Origem)
                            </label>
                            <ContextCard context={task.context} />
                        </div>
                    )}

                    {/* Metadata Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                        <div>
                            <span className="text-slate-400 block font-medium">Departamento</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                                <Briefcase size={12} className="text-blue-500" /> {task.departamento || 'Geral'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block font-medium">Responsável</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5 truncate">
                                <User size={12} className="text-emerald-500" /> {task.responsavel_email || 'Não atribuído'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block font-medium">Agendado Para</span>
                            {isEditing ? (
                                <input
                                    type="date"
                                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-100 mt-0.5"
                                    value={editForm.scheduled_for}
                                    onChange={e => setEditForm({ ...editForm, scheduled_for: e.target.value })}
                                />
                            ) : (
                                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                                    <Calendar size={12} className="text-amber-500" />
                                    {task.scheduled_for ? new Date(task.scheduled_for).toLocaleDateString() : 'A qualquer momento'}
                                </span>
                            )}
                        </div>
                        <div>
                            <span className="text-slate-400 block font-medium">Prazo Limite (SLA)</span>
                            {isEditing ? (
                                <input
                                    type="date"
                                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-100 mt-0.5"
                                    value={editForm.prazo}
                                    onChange={e => setEditForm({ ...editForm, prazo: e.target.value })}
                                />
                            ) : (
                                <span className={`font-bold flex items-center gap-1 mt-0.5 ${isLate ? 'text-rose-600 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                                    <Clock size={12} className={isLate ? 'text-rose-500' : 'text-blue-500'} />
                                    {task.prazo ? new Date(task.prazo).toLocaleDateString() : 'Sem prazo'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Detailed Description & Instructions */}
                    <div>
                        {isEditing ? (
                            <RichTextEditor
                                label="Descrição Detalhada / Instruções de Execução"
                                value={editForm.descricao}
                                onChange={val => setEditForm({ ...editForm, descricao: val })}
                                placeholder="Digite aqui todos os detalhes, passos e observações importantes..."
                                minHeight="220px"
                            />
                        ) : (
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                    Descrição Detalhada / Instruções
                                </label>
                                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[140px] text-sm text-slate-800 dark:text-slate-200 shadow-sm leading-relaxed">
                                    {editForm.descricao ? (
                                        <RichTextRenderer content={editForm.descricao} />
                                    ) : (
                                        <p className="text-slate-400 italic">Nenhuma instrução adicional informada.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* File Attachment Uploader & Gallery */}
                    <div className="pt-2">
                        <FileAttachmentUploader
                            attachments={editForm.attachments}
                            onChange={handleAttachmentsUpdate}
                            readOnly={false}
                        />
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                        {!isMine && onAssignMe && (
                            <button
                                onClick={() => onAssignMe(task.id)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700"
                            >
                                <User size={14} /> Assumir Tarefa
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors"
                        >
                            Fechar
                        </button>

                        {onStatusChange && task.status !== 'Concluida' && (
                            <button
                                onClick={() => onStatusChange(task)}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                            >
                                {task.status === 'Pendente' ? (
                                    <>
                                        <Play size={14} /> Iniciar Tarefa
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={14} /> Concluir Tarefa
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
