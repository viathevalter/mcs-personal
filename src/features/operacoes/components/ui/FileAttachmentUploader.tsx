import React, { useState } from 'react';
import { Paperclip, FileText, Image, FileSpreadsheet, FileCode, X, Download, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';

export interface TaskAttachment {
    id: string;
    name: string;
    url: string;
    size?: number;
    type?: string;
    created_at?: string;
}

interface FileAttachmentUploaderProps {
    attachments: TaskAttachment[];
    onChange: (attachments: TaskAttachment[]) => void;
    readOnly?: boolean;
}

export const FileAttachmentUploader: React.FC<FileAttachmentUploaderProps> = ({
    attachments,
    onChange,
    readOnly = false
}) => {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const newAttachments: TaskAttachment[] = [...attachments];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Generate safe filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
                const filePath = `task-attachments/${fileName}`;

                // Upload to Supabase Storage Bucket 'documents'
                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file);

                let fileUrl = '';
                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from('documents')
                        .getPublicUrl(filePath);
                    fileUrl = urlData.publicUrl;
                } else {
                    console.warn('Storage upload error, using Data URL fallback:', uploadError);
                    // Fallback to DataURL for immediate preview/offline support
                    fileUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                }

                newAttachments.push({
                    id: crypto.randomUUID(),
                    name: file.name,
                    url: fileUrl,
                    size: file.size,
                    type: file.type,
                    created_at: new Date().toISOString()
                });
            } catch (err) {
                console.error('Error uploading file:', err);
                toast.error(`Erro ao carregar o arquivo ${file.name}`);
            }
        }

        onChange(newAttachments);
        setUploading(false);
        e.target.value = ''; // Reset input
    };

    const handleRemove = (id: string) => {
        onChange(attachments.filter(a => a.id !== id));
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (fileName: string, type?: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext || '')) {
            return <Image size={18} className="text-purple-500 flex-shrink-0" />;
        }
        if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
            return <FileSpreadsheet size={18} className="text-emerald-500 flex-shrink-0" />;
        }
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
            return <FileText size={18} className="text-blue-500 flex-shrink-0" />;
        }
        return <FileCode size={18} className="text-slate-500 flex-shrink-0" />;
    };

    return (
        <div className="space-y-3 font-inter">
            <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                    <Paperclip size={14} /> Anexos e Documentos ({attachments.length})
                </label>

                {!readOnly && (
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span>{uploading ? 'Enviando...' : 'Anexar Arquivo'}</span>
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                            disabled={uploading}
                        />
                    </label>
                )}
            </div>

            {/* List of Attachments */}
            {attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att) => (
                        <div
                            key={att.id}
                            className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all group shadow-sm"
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {getFileIcon(att.name, att.type)}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={att.name}>
                                        {att.name}
                                    </p>
                                    {att.size && (
                                        <p className="text-[10px] text-slate-400">
                                            {formatFileSize(att.size)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 pl-2">
                                <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={att.name}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                                    title="Baixar / Visualizar arquivo"
                                >
                                    <Download size={14} />
                                </a>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(att.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                                        title="Remover anexo"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                    Nenhum arquivo anexado a esta tarefa.
                </div>
            )}
        </div>
    );
};
